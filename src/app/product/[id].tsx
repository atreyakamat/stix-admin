import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { ImagesEditor } from "@/components/images-editor";
import { api } from "@/lib/api";
import { rupeesField } from "@/lib/format";
import { confirm, useApi, useChange } from "@/lib/queries";
import type { ProductRes, ProductsRes } from "@/lib/responses";
import { optionId, toSlug } from "@/lib/slug";
import { PRODUCT_STATUSES, PRODUCT_TYPES, type CustomField, type Product, type ProductStatus, type ProductType } from "@/shared/types";
import { Button, Card, Chip, ErrorView, Field, Gap, Loading, Notice, Row, Screen, Section, Segmented, T, Toggle } from "@/ui/kit";
import { c, space } from "@/ui/theme";

type OptionForm = { id: string; name: string; values: { id: string; label: string; delta: string }[] };
type Form = {
  name: string;
  slug: string;
  type: ProductType;
  collectionIds: string[];
  description: string;
  details: string;
  tags: string;
  images: string[];
  status: ProductStatus;
  featured: boolean;
  soldOut: boolean;
  badge: string;
  sortOrder: string;
  price: string;
  compareAt: string;
  minQty: string;
  options: OptionForm[];
  customFields: CustomField[];
  stock: string;
  lowStockAt: string;
  cost: string;
};

const STATUS_LABEL: Record<ProductStatus, string> = { live: "Live", upcoming: "Coming soon", hidden: "Hidden" };

function toForm(p: Product | null): Form {
  return {
    name: p?.name ?? "",
    slug: p?.slug ?? "",
    type: p?.type ?? "sticker",
    collectionIds: p?.collectionIds ?? [],
    description: p?.description ?? "",
    details: p?.details ?? "",
    tags: p?.tags.join(", ") ?? "",
    images: p?.images ?? [],
    status: p?.status ?? "live",
    featured: p?.featured ?? false,
    soldOut: p?.soldOut ?? false,
    badge: p?.badge ?? "",
    sortOrder: String(p?.sortOrder ?? 0),
    price: rupeesField(p?.pricePaise),
    compareAt: rupeesField(p?.compareAtPaise),
    minQty: String(p?.minQty ?? 1),
    options: (p?.options ?? []).map((g) => ({ id: g.id, name: g.name, values: g.values.map((v) => ({ id: v.id, label: v.label, delta: v.priceDeltaPaise ? (v.priceDeltaPaise < 0 ? "-" : "") + rupeesField(Math.abs(v.priceDeltaPaise)) : "" })) })),
    customFields: p?.customFields ?? [],
    stock: p?.stock == null ? "" : String(p.stock),
    lowStockAt: String(p?.lowStockAt ?? 5),
    cost: rupeesField(p?.costPaise),
  };
}

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";
  const one = useApi<ProductRes>(isNew ? null : `products/${id}`);
  if (!isNew && one.isPending) return <Loading />;
  if (!isNew && one.isError) return <ErrorView error={one.error} onRetry={one.refetch} />;
  return <ProductForm key={id} id={id} data={isNew ? null : one.data!} />;
}

function ProductForm({ id, data }: { id: string; data: ProductRes | null }) {
  const isNew = !data;
  const all = useApi<ProductsRes>(isNew ? "products" : null);
  const [f, setF] = useState<Form>(() => toForm(data?.product ?? null));
  const [slugTouched, setSlugTouched] = useState(!isNew);

  const save = useChange((form: Form) => (isNew ? api.post("products", form) : api.put(`products/${id}`, form)), ["products", "stall-mode", "analytics"], {
    onDone: (r) => {
      if (isNew && r.id) router.replace({ pathname: "/product/[id]", params: { id: r.id } });
    },
  });
  const remove = useChange(() => api.del(`products/${id}`), ["products"], { onDone: () => router.back() });

  const collections = data?.collections ?? all.data?.collections ?? [];
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((cur) => ({ ...cur, [k]: v }));
  const setOption = (i: number, g: OptionForm | null) => set("options", g ? f.options.map((x, j) => (j === i ? g : x)) : f.options.filter((_, j) => j !== i));

  return (
    <Screen>
      <Stack.Screen options={{ title: isNew ? "New product" : f.name || "Product" }} />
      <ImagesEditor images={f.images} onChange={(v) => set("images", v)} />
      <Gap />
      <View style={{ gap: space.l }}>
        <Field
          label="Name"
          value={f.name}
          onChangeText={(v) => setF((cur) => ({ ...cur, name: v, slug: slugTouched ? cur.slug : toSlug(v) }))}
        />
        <Field label="Link name" value={f.slug} onChangeText={(v) => (setSlugTouched(true), set("slug", v))} autoCapitalize="none" hint={`shop.stixnvibes.com/shop/${f.slug || "…"}`} />
        <View style={{ gap: space.s }}>
          <T.Mute>Type</T.Mute>
          <Segmented value={f.type} options={PRODUCT_TYPES.map((t) => ({ value: t.id as ProductType, label: t.one }))} onChange={(v) => set("type", v)} />
        </View>
        <View style={{ gap: space.s }}>
          <T.Mute>Status</T.Mute>
          <Segmented value={f.status} options={PRODUCT_STATUSES.map((x) => ({ value: x, label: STATUS_LABEL[x] }))} onChange={(v) => set("status", v)} />
        </View>
        <Row>
          <View style={{ flex: 1 }}>
            <Field label="Price (₹)" value={f.price} onChangeText={(v) => set("price", v)} keyboardType="decimal-pad" hint="Blank = Ask on Instagram" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Was (₹)" value={f.compareAt} onChangeText={(v) => set("compareAt", v)} keyboardType="decimal-pad" hint="Struck-through price" />
          </View>
        </Row>
        <Row>
          <View style={{ flex: 1 }}>
            <Field label="Stock" value={f.stock} onChangeText={(v) => set("stock", v)} keyboardType="number-pad" hint="Blank = made to order" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Low stock at" value={f.lowStockAt} onChangeText={(v) => set("lowStockAt", v)} keyboardType="number-pad" />
          </View>
        </Row>
        <Row>
          <View style={{ flex: 1 }}>
            <Field label="Cost to make (₹)" value={f.cost} onChangeText={(v) => set("cost", v)} keyboardType="decimal-pad" hint="Blank = use unit costs" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Minimum order" value={f.minQty} onChangeText={(v) => set("minQty", v)} keyboardType="number-pad" />
          </View>
        </Row>
        <Toggle label="Sold out" value={f.soldOut} onChange={(v) => set("soldOut", v)} />
        <Toggle label="Featured on home" value={f.featured} onChange={(v) => set("featured", v)} />
        <Row>
          <View style={{ flex: 1 }}>
            <Field label="Badge" value={f.badge} onChangeText={(v) => set("badge", v)} placeholder="New, Bestseller" maxLength={24} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Sort order" value={f.sortOrder} onChangeText={(v) => set("sortOrder", v)} keyboardType="numbers-and-punctuation" hint="Lower shows first" />
          </View>
        </Row>
        <Field label="Description" value={f.description} onChangeText={(v) => set("description", v)} multiline />
        <Field label="Details" value={f.details} onChangeText={(v) => set("details", v)} multiline hint="Material, size and care" />
        <Field label="Tags" value={f.tags} onChangeText={(v) => set("tags", v)} placeholder="anime, lofi, cats" autoCapitalize="none" hint="Comma separated" />
      </View>

      {collections.length > 0 && (
        <Section title="Collections">
          <Row style={{ flexWrap: "wrap" }}>
            {collections.map((col) => {
              const on = f.collectionIds.includes(col.id);
              return <Chip key={col.id} label={col.name} on={on} onPress={() => set("collectionIds", on ? f.collectionIds.filter((x) => x !== col.id) : [...f.collectionIds, col.id])} />;
            })}
          </Row>
        </Section>
      )}

      <Section title="Options" action={<Chip label="+ Option" onPress={() => set("options", [...f.options, { id: optionId("option", f.options.map((g) => g.id)), name: "", values: [{ id: "a", label: "", delta: "" }] }])} />}>
        {f.options.length === 0 ? <T.Mute>No choices. Add one for sizes, finishes or frames.</T.Mute> : null}
        {f.options.map((g, i) => (
          <Card key={g.id} style={{ gap: space.m }}>
            <Row>
              <View style={{ flex: 1 }}>
                <Field label="Option" value={g.name} onChangeText={(v) => setOption(i, { ...g, name: v })} placeholder="Size" />
              </View>
              <Button small kind="danger" label="Remove" onPress={() => setOption(i, null)} />
            </Row>
            {g.values.map((v, j) => (
              <Row key={v.id}>
                <View style={{ flex: 2 }}>
                  <Field label={j === 0 ? "Choice (first is default)" : "Choice"} value={v.label} onChangeText={(x) => setOption(i, { ...g, values: g.values.map((y, k) => (k === j ? { ...y, label: x, id: y.label ? y.id : optionId(x, g.values.filter((_, m) => m !== k).map((z) => z.id)) } : y)) })} />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="+ ₹" value={v.delta} onChangeText={(x) => setOption(i, { ...g, values: g.values.map((y, k) => (k === j ? { ...y, delta: x } : y)) })} keyboardType="numbers-and-punctuation" placeholder="0" />
                </View>
                {g.values.length > 1 ? <Button small kind="ghost" label="" icon="x" onPress={() => setOption(i, { ...g, values: g.values.filter((_, k) => k !== j) })} /> : null}
              </Row>
            ))}
            <Chip label="+ Choice" onPress={() => setOption(i, { ...g, values: [...g.values, { id: optionId(`choice-${g.values.length + 1}`, g.values.map((x) => x.id)), label: "", delta: "" }] })} />
          </Card>
        ))}
      </Section>

      {f.customFields.length > 0 && (
        <Section title="Customer fills in">
          <Card style={{ gap: 4 }}>
            {f.customFields.map((cf) => (
              <T.Body key={cf.id}>
                {cf.label} <T.Mute>({cf.kind}{cf.required ? ", required" : ""})</T.Mute>
              </T.Body>
            ))}
            <T.Mute style={{ fontSize: 12 }}>Edit these fields in the web admin. They&apos;re kept as they are here.</T.Mute>
          </Card>
        </Section>
      )}

      <Gap h={space.xl} />
      {save.error ? <Notice text={(save.error as Error).message} tone="error" /> : null}
      <Gap h={space.s} />
      <Button
        label={isNew ? "Add product" : "Save"}
        icon="save"
        busy={save.isPending}
        onPress={() => save.mutate(f)}
      />
      {!isNew && (
        <>
          <Gap h={space.m} />
          <Button label="Delete product" kind="danger" icon="trash-2" busy={remove.isPending} onPress={() => confirm("Delete this product?", "Past orders keep their copy. This can't be undone.", "Delete", () => remove.mutate(undefined))} />
        </>
      )}
      <Gap h={space.s} />
      <T.Mute style={{ fontSize: 12, color: c.mute }}>Changes show in the shop within a minute.</T.Mute>
    </Screen>
  );
}
