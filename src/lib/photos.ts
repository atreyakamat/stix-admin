import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";
import { api } from "./api";

// Picks photos from the gallery or camera and uploads them to the shop.
// Photos are squeezed to JPEG on the phone first, so uploads stay well
// under the shop's 5 MB limit on stall wifi.

const OPTS: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.8, exif: false };

export async function pickPhotos(opts: { camera?: boolean; multiple?: boolean } = {}): Promise<ImagePicker.ImagePickerAsset[]> {
  const perm = opts.camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert("No access", opts.camera ? "Allow camera access in Android settings to take photos." : "Allow photo access in Android settings to add photos.");
    return [];
  }
  const res = opts.camera
    ? await ImagePicker.launchCameraAsync(OPTS)
    : await ImagePicker.launchImageLibraryAsync({ ...OPTS, allowsMultipleSelection: !!opts.multiple, selectionLimit: opts.multiple ? 30 : 1 });
  return res.canceled ? [] : res.assets;
}

/** Uploads one by one and returns the URLs that made it, with any errors. */
export async function uploadAll(assets: ImagePicker.ImagePickerAsset[], onProgress?: (done: number) => void) {
  const urls: string[] = [];
  const errors: string[] = [];
  for (const [i, a] of assets.entries()) {
    try {
      urls.push(await api.uploadImage({ uri: a.uri, mimeType: a.mimeType === "image/png" || a.mimeType === "image/webp" ? a.mimeType : "image/jpeg", fileName: a.fileName }));
    } catch (e) {
      errors.push((e as Error).message);
    }
    onProgress?.(i + 1);
  }
  return { urls, errors };
}

/** Asks gallery or camera, uploads, and hands back the URLs. */
export function addPhotos(onUrls: (urls: string[]) => void, opts: { multiple?: boolean; onBusy?: (busy: boolean) => void } = {}) {
  const go = async (camera: boolean) => {
    const assets = await pickPhotos({ camera, multiple: opts.multiple });
    if (!assets.length) return;
    opts.onBusy?.(true);
    try {
      const { urls, errors } = await uploadAll(assets);
      if (urls.length) onUrls(urls);
      if (errors.length) Alert.alert(`${errors.length} photo${errors.length === 1 ? "" : "s"} didn't upload`, errors[0]);
    } finally {
      opts.onBusy?.(false);
    }
  };
  Alert.alert("Add photo", undefined, [
    { text: "Cancel", style: "cancel" },
    { text: "Camera", onPress: () => go(true) },
    { text: "Gallery", onPress: () => go(false) },
  ]);
}
