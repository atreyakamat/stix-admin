import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { ImagesEditor } from "@/components/images-editor";
import { ProductPicker } from "@/components/product-picker";
import { api } from "@/lib/api";
import { confirm, useApi, useChange } from "@/lib/queries";
import type { CollectionRes } from "@/lib/responses";
import { toSlug } from "@/lib/slug";
import { Button, ErrorView, Field, Gap, Loading, Screen, Section, T, Toggle } from "@/ui/kit";
import { space } from "@/ui/theme";

type Form = { name: string; slug: string; description: string; image: string; active: boolean; featured: boolean; sortOrder: string; productIds: string[] };
const blank: Form = { name: "", slug: "", description: "", image: "", active: true, featured: false, sortOrder: "0", productIds: [] };

export default function CollectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";
  const q = useApi<CollectionRes>(isNew ? null : `collections/${id}`);
  if (!isNew && q.isPending) return <Loading />;
  if (!isNew && q.isError) return <ErrorView error={q.error} onRetry={q.refetch} />;
  return <CollectionForm key={id} id={id} data={isNew ? null : q.data!} />;
}

function CollectionForm({ id, data }: { id: string; data: CollectionRes | null }) {
  const isNew = !data;
  const [f, setF] = useState<Form>(() => {
    if (!data) return blank;
    const x = data.collection;
    return { name: x.name, slug: x.slug, description: x.description, image: x.image, active: x.active, featured: x.featured, sortOrder: String(x.sortOrder), productIds: data.productIds };
  });
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const save = useChange((form: Form) => (isNew ? api.post("collections", form) : api.put(`collections/${id}`, form)), ["collections", "products"], {
    onDone: (r) => isNew && r.id && router.replace({ pathname: "/collections/[id]", params: { id: r.id } }),
  });
  const remove = useChange(() => api.del(`collections/${id}`), ["collections", "products"], { onDone: () => router.back() });
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((cur) => ({ ...cur, [k]: v }));
  return (
    <Screen>
      <Stack.Screen options={{ title: isNew ? "New collection" : f.name }} />
      <View style={{ gap: space.l }}>
        <Field label="Name" value={f.name} onChangeText={(v) => setF((cur) => ({ ...cur, name: v, slug: slugTouched ? cur.slug : toSlug(v) }))} placeholder="Lofi vibes" />
        <Field label="Link name" value={f.slug} onChangeText={(v) => (setSlugTouched(true), set("slug", v))} autoCapitalize="none" hint={`/collections/${f.slug || "…"}`} />
        <Field label="Description" value={f.description} onChangeText={(v) => set("description", v)} multiline />
        <View style={{ gap: space.s }}>
          <T.Mute>Cover (blank = first product&apos;s photo)</T.Mute>
          <ImagesEditor images={f.image ? [f.image] : []} onChange={(v) => set("image", v[0] ?? "")} max={1} />
        </View>
        <Toggle label="Shown in the shop" value={f.active} onChange={(v) => set("active", v)} />
        <Toggle label="Featured on home" value={f.featured} onChange={(v) => set("featured", v)} />
        <Field label="Sort order" value={f.sortOrder} onChangeText={(v) => set("sortOrder", v)} keyboardType="numbers-and-punctuation" />
      </View>
      <Section title="Products in it">
        <ProductPicker value={f.productIds} onChange={(v) => set("productIds", v)} />
      </Section>
      <Gap h={space.xl} />
      <Button label="Save collection" icon="save" busy={save.isPending} onPress={() => save.mutate(f)} />
      {!isNew && (
        <>
          <Gap h={space.m} />
          <Button label="Delete collection" kind="danger" icon="trash-2" busy={remove.isPending} onPress={() => confirm("Delete this collection?", "Its products stay.", "Delete", () => remove.mutate(undefined))} />
        </>
      )}
    </Screen>
  );
}
