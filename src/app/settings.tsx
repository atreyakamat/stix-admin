import { useState } from "react";
import { View } from "react-native";
import { api } from "@/lib/api";
import { rupeesField } from "@/lib/format";
import { useApi, useChange } from "@/lib/queries";
import type { SettingsRes } from "@/lib/responses";
import { Button, ErrorView, Field, Gap, Loading, Screen, Section, Toggle } from "@/ui/kit";
import { space } from "@/ui/theme";

type Form = {
  storeOpen: boolean;
  announcement: string;
  instagramHandle: string;
  orderNote: string;
  deliveryNote: string;
  bulkNote: string;
  freeShippingAbove: string;
  upiId: string;
  upiName: string;
  whatsappNumber: string;
  mrpMarkupPercent: string;
};

export default function SettingsScreen() {
  const q = useApi<SettingsRes>("settings");
  if (q.isPending) return <Loading />;
  if (q.isError) return <ErrorView error={q.error} onRetry={q.refetch} />;
  return <SettingsForm settings={q.data.settings} />;
}

function SettingsForm({ settings: s }: { settings: SettingsRes["settings"] }) {
  const [f, setF] = useState<Form>(() => ({
        storeOpen: s.storeOpen,
        announcement: s.announcement,
        instagramHandle: s.instagramHandle,
        orderNote: s.orderNote,
        deliveryNote: s.deliveryNote,
        bulkNote: s.bulkNote,
        freeShippingAbove: rupeesField(s.freeShippingAbovePaise),
        upiId: s.upiId,
        upiName: s.upiName,
        whatsappNumber: s.whatsappNumber,
        mrpMarkupPercent: s.mrpMarkupPercent == null ? "" : String(s.mrpMarkupPercent),
  }));
  const save = useChange((form: Form) => api.put("settings", form), ["settings"]);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((cur) => ({ ...cur, [k]: v }));
  return (
    <Screen>
      <Toggle label="Take online orders" hint="Off swaps the cart for 'message us' buttons" value={f.storeOpen} onChange={(v) => set("storeOpen", v)} />
      <Section title="Shop">
        <View style={{ gap: space.l }}>
          <Field label="Announcement bar" value={f.announcement} onChangeText={(v) => set("announcement", v)} placeholder="Next stall: WordsUp, Sunday" />
          <Field label="Instagram username" value={f.instagramHandle} onChangeText={(v) => set("instagramHandle", v)} autoCapitalize="none" />
          <Field label="WhatsApp number" value={f.whatsappNumber} onChangeText={(v) => set("whatsappNumber", v)} keyboardType="phone-pad" hint="For payment screenshots. Blank hides the button." />
        </View>
      </Section>
      <Section title="Payments">
        <View style={{ gap: space.l }}>
          <Field label="UPI ID" value={f.upiId} onChangeText={(v) => set("upiId", v)} autoCapitalize="none" placeholder="name@okicici" hint="Blank hides the UPI QR on order pages" />
          <Field label="Name in UPI apps" value={f.upiName} onChangeText={(v) => set("upiName", v)} />
          <Field label="Free shipping above (₹)" value={f.freeShippingAbove} onChangeText={(v) => set("freeShippingAbove", v)} keyboardType="decimal-pad" hint="Blank = never free" />
          <Field label="MRP markup (%)" value={f.mrpMarkupPercent} onChangeText={(v) => set("mrpMarkupPercent", v)} keyboardType="number-pad" hint="Struck-through MRP = price + this %. Blank = off." />
        </View>
      </Section>
      <Section title="Notes shown to customers">
        <View style={{ gap: space.l }}>
          <Field label="Order note" value={f.orderNote} onChangeText={(v) => set("orderNote", v)} multiline />
          <Field label="Delivery note" value={f.deliveryNote} onChangeText={(v) => set("deliveryNote", v)} multiline />
          <Field label="Bulk order note" value={f.bulkNote} onChangeText={(v) => set("bulkNote", v)} multiline />
        </View>
      </Section>
      <Gap h={space.xl} />
      <Button label="Save settings" icon="save" busy={save.isPending} onPress={() => save.mutate(f)} />
    </Screen>
  );
}
