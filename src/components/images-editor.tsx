import { Image } from "expo-image";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { addPhotos } from "@/lib/photos";
import { Icon, T } from "@/ui/kit";
import { c, radius, space } from "@/ui/theme";

/** A row of photos: add from camera or gallery, tap to make first, ✕ to remove. */
export function ImagesEditor({ images, onChange, max = 12 }: { images: string[]; onChange: (v: string[]) => void; max?: number }) {
  const [busy, setBusy] = useState(false);
  return (
    <View style={{ gap: space.s }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.s }}>
        {images.map((src, i) => (
          <Pressable key={src + i} onPress={() => onChange([src, ...images.filter((_, j) => j !== i)])} style={{ width: 96 }}>
            <Image source={src} style={{ width: 96, height: 96, borderRadius: radius.s, borderWidth: i === 0 ? 2 : 0, borderColor: c.lemon, backgroundColor: c.surface2 }} contentFit="cover" />
            <Pressable onPress={() => onChange(images.filter((_, j) => j !== i))} hitSlop={8} style={{ position: "absolute", top: 4, right: 4, backgroundColor: "#000c", borderRadius: 12, padding: 3 }}>
              <Icon name="x" size={14} />
            </Pressable>
          </Pressable>
        ))}
        {images.length < max ? (
          <Pressable
            onPress={() => addPhotos((urls) => onChange([...images, ...urls].slice(0, max)), { multiple: true, onBusy: setBusy })}
            style={{ width: 96, height: 96, borderRadius: radius.s, borderWidth: 1, borderStyle: "dashed", borderColor: c.mute, alignItems: "center", justifyContent: "center" }}
          >
            {busy ? <ActivityIndicator color={c.lemon} /> : <Icon name="camera" color={c.mute} />}
          </Pressable>
        ) : null}
      </ScrollView>
      {images.length > 1 ? <T.Mute style={{ fontSize: 12 }}>The yellow one is the cover. Tap a photo to make it the cover.</T.Mute> : null}
    </View>
  );
}
