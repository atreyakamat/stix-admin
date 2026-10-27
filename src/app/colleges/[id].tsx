import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { ImagesEditor } from "@/components/images-editor";
import { ProductPicker } from "@/components/product-picker";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { copy } from "@/lib/contact";
import { confirm, useApi, useChange } from "@/lib/queries";
import type { CollegeRes, CouponsRes } from "@/lib/responses";
import { toSlug } from "@/lib/slug";
import type { College } from "@/shared/types";
import { Button, Chip, ErrorView, Field, Gap, Loading, Screen, Section, T, Toggle } from "@/ui/kit";
import { space } from "@/ui/theme";

type Form = { name: string; slug: string; area: string; description: string; image: string; couponCode: string; productIds: string[]; active: boolean; sortOrder: number };
const toForm = (x?: College): Form => ({
  name: x?.name ?? "",
  slug: x?.slug ?? "",
  area: x?.area ?? "",
  description: x?.description ?? "",
  image: x?.image ?? "",
  couponCode: x?.couponCode ?? "",
  productIds: x?.productIds ?? [],
  active: x?.active ?? true,
  sortOrder: x?.sortOrder ?? 0,
});

export default function CollegeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";
  const q = useApi<CollegeRes>(isNew ? null : `colleges/${id}`);
  if (!isNew && q.isPending) return <Loading />;
  if (!isNew && q.isError) return <ErrorView error={q.error} onRetry={q.refetch} />;
  return <CollegeForm key={id} id={id} college={isNew ? undefined : q.data!.college} />;
}

function CollegeForm({ id, college }: { id: string; college?: College }) {
  const isNew = !college;
  const { session } = useAuth();
  const codes = useApi<CouponsRes>("coupons");
  const [f, setF] = useState<Form>(() => toForm(college));
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const save = useChange((form: Form) => (isNew ? api.post("colleges", form) : api.put(`colleges/${id}`, form)), ["colleges"], {
    onDone: (r) => isNew && r.id && router.replace({ pathname: "/colleges/[id]", params: { id: r.id } }),
  });
  const remove = useChange(() => api.del(`colleges/${id}`), ["colleges"], { onDone: () => router.back() });
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((cur) => ({ ...cur, [k]: v }));
  return (
    <Screen>
      <Stack.Screen options={{ title: isNew ? "New college page" : f.name }} />
      <View style={{ gap: space.l }}>
        <Field label="College" value={f.name} onChangeText={(v) => setF((cur) => ({ ...cur, name: v, slug: slugTouched ? cur.slug : toSlug(v) }))} placeholder="St. Xavier's College" />
        <Field label="Link name" value={f.slug} onChangeText={(v) => (setSlugTouched(true), set("slug", v))} autoCapitalize="none" hint={`/c/${f.slug || "…"}`} />
        <Field label="Area" value={f.area} onChangeText={(v) => set("area", v)} placeholder="Mapusa" />
        <Field label="Intro" value={f.description} onChangeText={(v) => set("description", v)} multiline />
        <View style={{ gap: space.s }}>
          <T.Mute>Photo</T.Mute>
          <ImagesEditor images={f.image ? [f.image] : []} onChange={(v) => set("image", v[0] ?? "")} max={1} />
        </View>
        <Toggle label="Page is live" value={f.active} onChange={(v) => set("active", v)} />
      </View>
      <Section title="Code on this page">
        <ScrollView horizontal contentContainerStyle={{ gap: space.s }}>
          <Chip label="None" on={!f.couponCode} onPress={() => set("couponCode", "")} />
          {(codes.data?.coupons ?? []).map((x) => (
            <Chip key={x.code} label={x.code} on={f.couponCode === x.code} onPress={() => set("couponCode", x.code)} />
          ))}
        </ScrollView>
      </Section>
      <Section title="Picks for this college">
        <ProductPicker value={f.productIds} onChange={(v) => set("productIds", v)} max={24} />
      </Section>
      <Gap h={space.xl} />
      <Button label="Save page" icon="save" busy={save.isPending} onPress={() => save.mutate(f)} />
      {!isNew && (
        <>
          <Gap h={space.m} />
          <Button label="Copy page link" kind="secondary" icon="link" onPress={() => copy(`${session?.shopUrl}/c/${f.slug}?src=college-${f.slug}`, "Link copied")} />
          <Gap h={space.m} />
          <Button label="Delete page" kind="danger" icon="trash-2" busy={remove.isPending} onPress={() => confirm("Delete this college page?", f.name, "Delete", () => remove.mutate(undefined))} />
        </>
      )}
    </Screen>
  );
}
