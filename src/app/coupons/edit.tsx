import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { api } from "@/lib/api";
import { istField, rupeesField } from "@/lib/format";
import { useApi, useChange } from "@/lib/queries";
import type { CouponsRes } from "@/lib/responses";
import { isoToIstInput } from "@/shared/money";
import type { Coupon } from "@/shared/types";
import { Button, ErrorView, Field, Gap, Loading, Row, Screen, Segmented, Toggle } from "@/ui/kit";
import { space } from "@/ui/theme";

function toForm(c?: Coupon) {
  return {
    code: c?.code ?? "",
    isNew: c ? "0" : "1",
    description: c?.description ?? "",
    kind: (c?.amountPaise ? "amount" : "percent") as "percent" | "amount",
    value: c ? (c.percent ? String(c.percent) : rupeesField(c.amountPaise)) : "",
    minOrder: c?.minOrderPaise ? rupeesField(c.minOrderPaise) : "",
    maxUses: c?.maxUses ? String(c.maxUses) : "",
    source: c?.source ?? "",
    startsAt: isoToIstInput(c?.startsAt ?? null).replace("T", " "),
    endsAt: isoToIstInput(c?.endsAt ?? null).replace("T", " "),
    active: c?.active ?? true,
  };
}
type Form = ReturnType<typeof toForm>;

export default function EditCoupon() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const q = useApi<CouponsRes>("coupons");
  const save = useChange((f: Form) => api.post("coupons", { ...f, startsAt: istField(f.startsAt), endsAt: istField(f.endsAt, true) }), ["coupons"], { onDone: () => router.back() });
  const existing = code ? q.data?.coupons.find((c) => c.code === code) : undefined;
  const [f, setF] = useState<Form | null>(code ? null : toForm());
  if (code && !f && existing) setF(toForm(existing));
  if (code && q.isPending) return <Loading />;
  if (q.isError) return <ErrorView error={q.error} onRetry={q.refetch} />;
  if (!f) return <ErrorView error={new Error("This code is gone.")} />;
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((cur) => ({ ...cur!, [k]: v }));
  return (
    <Screen>
      <Stack.Screen options={{ title: code ? code : "New code" }} />
      <View style={{ gap: space.l }}>
        {!code && <Field label="Code" value={f.code} onChangeText={(v) => set("code", v.toUpperCase())} autoCapitalize="characters" placeholder="WORDSUP10" hint="3 to 20 letters, numbers or dashes" />}
        <Field label="Note" value={f.description} onChangeText={(v) => set("description", v)} placeholder="10% off for WordsUp visitors" />
        <Segmented
          value={f.kind}
          options={[
            { value: "percent", label: "% off" },
            { value: "amount", label: "₹ off" },
          ]}
          onChange={(v) => set("kind", v)}
        />
        <Row>
          <View style={{ flex: 1 }}>
            <Field label={f.kind === "percent" ? "% off" : "₹ off"} value={f.value} onChangeText={(v) => set("value", v)} keyboardType="decimal-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Min order (₹)" value={f.minOrder} onChangeText={(v) => set("minOrder", v)} keyboardType="decimal-pad" />
          </View>
        </Row>
        <Row>
          <View style={{ flex: 1 }}>
            <Field label="Max uses" value={f.maxUses} onChangeText={(v) => set("maxUses", v)} keyboardType="number-pad" hint="Blank = no limit" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Source" value={f.source} onChangeText={(v) => set("source", v)} autoCapitalize="none" placeholder="stall-wordsup" hint="For analytics" />
          </View>
        </Row>
        <Row>
          <View style={{ flex: 1 }}>
            <Field label="Starts" value={f.startsAt} onChangeText={(v) => set("startsAt", v)} placeholder="2026-11-01" keyboardType="numbers-and-punctuation" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Ends" value={f.endsAt} onChangeText={(v) => set("endsAt", v)} placeholder="2026-11-15" keyboardType="numbers-and-punctuation" />
          </View>
        </Row>
        <Toggle label="On" value={f.active} onChange={(v) => set("active", v)} />
      </View>
      <Gap h={space.xl} />
      <Button label="Save code" icon="save" busy={save.isPending} onPress={() => save.mutate(f)} />
    </Screen>
  );
}
