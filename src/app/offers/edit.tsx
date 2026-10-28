import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { api } from "@/lib/api";
import { istField, rupeesField } from "@/lib/format";
import { useApi, useChange } from "@/lib/queries";
import type { OffersRes } from "@/lib/responses";
import { isoToIstInput } from "@/shared/money";
import { PRODUCT_TYPES, type Offer, type OfferKind } from "@/shared/types";
import { Button, ErrorView, Field, Gap, Loading, Row, Screen, Segmented, T, Toggle } from "@/ui/kit";
import { space } from "@/ui/theme";

const KINDS: { value: OfferKind; label: string }[] = [
  { value: "bxgy", label: "Buy X get Y" },
  { value: "volume", label: "Bulk price" },
  { value: "percent", label: "% off" },
];

function toForm(o?: Offer) {
  return {
    id: o?.id ?? "",
    kind: o?.kind ?? ("bxgy" as OfferKind),
    name: o?.name ?? "",
    description: o?.description ?? "",
    productType: o?.productType ?? "",
    buy: String(o?.buy ?? 4),
    free: String(o?.free ?? 1),
    percent: o?.percent == null ? "" : String(o.percent),
    price: rupeesField(o?.pricePaise),
    sortOrder: String(o?.sortOrder ?? 0),
    banner: o?.banner ?? "",
    startsAt: isoToIstInput(o?.startsAt ?? null).replace("T", " "),
    endsAt: isoToIstInput(o?.endsAt ?? null).replace("T", " "),
    active: o?.active ?? true,
  };
}
type Form = ReturnType<typeof toForm>;

export default function EditOffer() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const q = useApi<OffersRes>("offers");
  const save = useChange((f: Form) => api.post("offers", { ...f, startsAt: istField(f.startsAt), endsAt: istField(f.endsAt, true) }), ["offers", "stall-mode"], { onDone: () => router.back() });
  const existing = id ? q.data?.offers.find((o) => o.id === id) : undefined;
  const [f, setF] = useState<Form | null>(id ? null : toForm());
  if (id && !f && existing) setF(toForm(existing));
  if (id && q.isPending) return <Loading />;
  if (q.isError) return <ErrorView error={q.error} onRetry={q.refetch} />;
  if (!f) return <ErrorView error={new Error("This offer is gone.")} />;
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((cur) => ({ ...cur!, [k]: v }));

  return (
    <Screen>
      <Stack.Screen options={{ title: id ? "Edit offer" : "New offer" }} />
      <View style={{ gap: space.l }}>
        <Segmented value={f.kind} options={KINDS} onChange={(v) => set("kind", v)} />
        <Field label="Name" value={f.name} onChangeText={(v) => set("name", v)} placeholder="Buy 4 get 1 free" />
        <Field label="Description" value={f.description} onChangeText={(v) => set("description", v)} placeholder="Shown in the cart" />
        <View style={{ gap: space.s }}>
          <T.Mute>Applies to</T.Mute>
          <Segmented value={f.productType} options={[{ value: "", label: "Everything" }, ...PRODUCT_TYPES.map((t) => ({ value: t.id as string, label: t.label }))]} onChange={(v) => set("productType", v)} />
        </View>
        {f.kind === "bxgy" && (
          <Row>
            <View style={{ flex: 1 }}>
              <Field label="Buy" value={f.buy} onChangeText={(v) => set("buy", v)} keyboardType="number-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Get free" value={f.free} onChangeText={(v) => set("free", v)} keyboardType="number-pad" />
            </View>
          </Row>
        )}
        {f.kind === "volume" && (
          <Row>
            <View style={{ flex: 1 }}>
              <Field label="From (items)" value={f.buy} onChangeText={(v) => set("buy", v)} keyboardType="number-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Each drops to (₹)" value={f.price} onChangeText={(v) => set("price", v)} keyboardType="decimal-pad" />
            </View>
          </Row>
        )}
        {f.kind === "percent" && (
          <>
            <Field label="% off" value={f.percent} onChangeText={(v) => set("percent", v)} keyboardType="number-pad" placeholder="15" />
            <Field label="Banner" value={f.banner} onChangeText={(v) => set("banner", v)} placeholder="Diwali sale: 15% off everything" hint="Shown across the top of the shop while it runs" />
          </>
        )}
        <Row>
          <View style={{ flex: 1 }}>
            <Field label="Starts" value={f.startsAt} onChangeText={(v) => set("startsAt", v)} placeholder="2026-11-01" hint="Blank = now" keyboardType="numbers-and-punctuation" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Ends" value={f.endsAt} onChangeText={(v) => set("endsAt", v)} placeholder="2026-11-15" hint="Blank = no end" keyboardType="numbers-and-punctuation" />
          </View>
        </Row>
        <Field label="Sort order" value={f.sortOrder} onChangeText={(v) => set("sortOrder", v)} keyboardType="numbers-and-punctuation" />
        <Toggle label="On" value={f.active} onChange={(v) => set("active", v)} />
      </View>
      <View style={{ gap: space.m, marginTop: space.xl }}>
        <T.Mute style={{ fontSize: 12 }}>Dates are India time. A date alone starts at midnight and ends at 11:59 pm.</T.Mute>
      </View>
      <Gap />
      <Button label="Save offer" icon="save" busy={save.isPending} onPress={() => save.mutate(f)} />
    </Screen>
  );
}
