import { Image } from "expo-image";
import { useState } from "react";
import { Alert, FlatList, Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/lib/api";
import { addPhotos } from "@/lib/photos";
import { confirm, useApi, useChange } from "@/lib/queries";
import type { GalleryRes } from "@/lib/responses";
import type { GalleryItem } from "@/shared/types";
import { Button, Chip, Empty, ErrorView, Field, Gap, Icon, Loading, Row, T, Toggle, s } from "@/ui/kit";
import { c, space } from "@/ui/theme";

type Meta = { caption: string; stallId: string; collegeId: string; tags: string; takenOn: string; visible: boolean; sortOrder: string };
const blank: Meta = { caption: "", stallId: "", collegeId: "", tags: "", takenOn: "", visible: true, sortOrder: "0" };
const metaOf = (g: GalleryItem): Meta => ({ caption: g.caption, stallId: g.stallId ?? "", collegeId: g.collegeId ?? "", tags: g.tags.join(", "), takenOn: g.takenOn ?? "", visible: g.visible, sortOrder: String(g.sortOrder) });

export default function Gallery() {
  const q = useApi<GalleryRes>("gallery");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<string[] | null>(null);
  const [editing, setEditing] = useState<GalleryItem | null>(null);
  const [meta, setMeta] = useState<Meta>(blank);

  const add = useChange((v: { images: string[] } & Meta) => api.post("gallery", v), ["gallery"], { onDone: () => setPending(null) });
  const save = useChange((v: { id: string; image: string } & Meta) => api.put(`gallery/${v.id}`, v), ["gallery"], { onDone: () => setEditing(null) });
  const remove = useChange((id: string) => api.del(`gallery/${id}`), ["gallery"], { onDone: () => setEditing(null) });

  if (q.isPending) return <Loading />;
  if (q.isError) return <ErrorView error={q.error} onRetry={q.refetch} />;
  const { items, stalls, colleges } = q.data;
  const open = pending !== null || editing !== null;

  return (
    <SafeAreaView style={s.screen} edges={[]}>
      <View style={{ padding: space.l, gap: space.s }}>
        <Button
          label={busy ? "Uploading…" : "Add photos"}
          icon="upload"
          busy={busy}
          onPress={() =>
            addPhotos(
              (urls) => {
                setMeta(blank);
                setPending(urls);
              },
              { multiple: true, onBusy: setBusy },
            )
          }
        />
        <T.Mute>
          {items.length} photos · {items.filter((g) => !g.visible).length} hidden · tap one to edit
        </T.Mute>
      </View>
      <FlatList
        data={items}
        numColumns={3}
        keyExtractor={(g) => g.id}
        refreshing={q.isRefetching}
        onRefresh={q.refetch}
        contentContainerStyle={{ paddingHorizontal: space.l, gap: 4, paddingBottom: 48 }}
        columnWrapperStyle={{ gap: 4 }}
        ListEmptyComponent={<Empty text="No photos yet. Stall photos sell the next stall." icon="image" />}
        renderItem={({ item: g }) => (
          <Pressable
            style={{ flex: 1 / 3 }}
            onPress={() => {
              setMeta(metaOf(g));
              setEditing(g);
            }}
          >
            <Image source={g.image} style={{ aspectRatio: 1, borderRadius: 6, backgroundColor: c.surface2, opacity: g.visible ? 1 : 0.4 }} contentFit="cover" />
            {!g.visible ? (
              <View style={{ position: "absolute", top: 4, left: 4 }}>
                <Icon name="eye-off" size={16} />
              </View>
            ) : null}
          </Pressable>
        )}
      />
      <Modal visible={open} animationType="slide" onRequestClose={() => (setPending(null), setEditing(null))}>
        <SafeAreaView style={s.screen}>
          <ScrollView contentContainerStyle={{ padding: space.l, gap: space.l, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
            <Row style={{ justifyContent: "space-between" }}>
              <T.H2>{editing ? "Edit photo" : `${pending?.length ?? 0} new photo${pending?.length === 1 ? "" : "s"}`}</T.H2>
              <Button small kind="ghost" label="Close" onPress={() => (setPending(null), setEditing(null))} />
            </Row>
            <ScrollView horizontal contentContainerStyle={{ gap: space.s }}>
              {(editing ? [editing.image] : (pending ?? [])).map((u) => (
                <Image key={u} source={u} style={{ width: 120, height: 120, borderRadius: 8 }} contentFit="cover" />
              ))}
            </ScrollView>
            <Field label="Caption" value={meta.caption} onChangeText={(v) => setMeta((m) => ({ ...m, caption: v }))} />
            <View style={{ gap: space.s }}>
              <T.Mute>Stall</T.Mute>
              <ScrollView horizontal contentContainerStyle={{ gap: space.s }}>
                <Chip label="None" on={!meta.stallId} onPress={() => setMeta((m) => ({ ...m, stallId: "" }))} />
                {stalls.map((x) => (
                  <Chip key={x.id} label={x.name} on={meta.stallId === x.id} onPress={() => setMeta((m) => ({ ...m, stallId: x.id, takenOn: m.takenOn || x.date }))} />
                ))}
              </ScrollView>
            </View>
            {colleges.length ? (
              <View style={{ gap: space.s }}>
                <T.Mute>College</T.Mute>
                <ScrollView horizontal contentContainerStyle={{ gap: space.s }}>
                  <Chip label="None" on={!meta.collegeId} onPress={() => setMeta((m) => ({ ...m, collegeId: "" }))} />
                  {colleges.map((x) => (
                    <Chip key={x.id} label={x.name} on={meta.collegeId === x.id} onPress={() => setMeta((m) => ({ ...m, collegeId: x.id }))} />
                  ))}
                </ScrollView>
              </View>
            ) : null}
            <Field label="Tags" value={meta.tags} onChangeText={(v) => setMeta((m) => ({ ...m, tags: v }))} autoCapitalize="none" placeholder="stall, crowd, cricut" />
            <Field label="Taken on" value={meta.takenOn} onChangeText={(v) => setMeta((m) => ({ ...m, takenOn: v }))} placeholder="2026-10-26" keyboardType="numbers-and-punctuation" />
            <Field label="Sort order" value={meta.sortOrder} onChangeText={(v) => setMeta((m) => ({ ...m, sortOrder: v }))} keyboardType="numbers-and-punctuation" />
            <Toggle label="Show in the shop's library" value={meta.visible} onChange={(v) => setMeta((m) => ({ ...m, visible: v }))} />
            <Gap h={space.s} />
            {editing ? (
              <>
                <Button label="Save" icon="save" busy={save.isPending} onPress={() => save.mutate({ id: editing.id, image: editing.image, ...meta })} />
                <Button label="Delete photo" kind="danger" icon="trash-2" busy={remove.isPending} onPress={() => confirm("Delete this photo?", "It leaves the library.", "Delete", () => remove.mutate(editing.id))} />
              </>
            ) : (
              <Button
                label="Add to library"
                icon="check"
                busy={add.isPending}
                onPress={() => (pending?.length ? add.mutate({ images: pending, ...meta }) : Alert.alert("No photos", "Pick some photos first."))}
              />
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
