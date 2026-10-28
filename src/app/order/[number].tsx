import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Linking, View } from "react-native";
import { StatusChip } from "@/components/order-row";
import { addressText, call, copy, instagram, orderSummary, parcelLabel, shareText, whatsapp } from "@/lib/contact";
import { inr, nextStatus, STATUS_LABEL, when } from "@/lib/format";
import { api } from "@/lib/api";
import { useApi, useChange } from "@/lib/queries";
import type { OrderRes } from "@/lib/responses";
import { formatPhone } from "@/shared/phone";
import { cleanTracking, INDIA_POST_TRACKING_URL, TRACKING_RE } from "@/shared/shipping";
import { ORDER_STATUSES, type OrderStatus } from "@/shared/types";
import { Button, Card, Chip, ErrorView, Field, Gap, ListRow, Loading, Row, Screen, Section, Segmented, T } from "@/ui/kit";
import { c, space } from "@/ui/theme";

export default function OrderScreen() {
  const { number } = useLocalSearchParams<{ number: string }>();
  const q = useApi<OrderRes>(`orders/${number}`);
  if (q.isPending) return <Loading />;
  if (q.isError) return <ErrorView error={q.error} onRetry={q.refetch} />;
  // Re-mounts when the order changes, so the note and tracking fields start from what's saved.
  return <OrderView key={q.data.order.updatedAt} data={q.data} refreshing={q.isRefetching} onRefresh={q.refetch} />;
}

function OrderView({ data, refreshing, onRefresh }: { data: OrderRes; refreshing: boolean; onRefresh: () => void }) {
  const { order: o, orderUrl, customerOrders } = data;
  const number = o.number;
  const [note, setNote] = useState(o.adminNote);
  const [tracking, setTracking] = useState(o.trackingNumber);

  const refresh = ["orders", "packing", "customers", "products", "analytics"];
  const setStatus = useChange((status: OrderStatus) => api.patch(`orders/${number}`, { status }), refresh);
  const saveNote = useChange(() => api.patch(`orders/${number}`, { adminNote: note }), refresh);
  const ship = useChange((markShipped: boolean) => api.post(`orders/${number}/ship`, { trackingNumber: tracking, markShipped }), refresh);

  const next = nextStatus(o);
  const trackingClean = cleanTracking(tracking);
  const trackingBad = trackingClean !== "" && !TRACKING_RE.test(trackingClean);

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <Stack.Screen options={{ title: o.number }} />
      <Row style={{ justifyContent: "space-between" }}>
        <T.Display style={{ fontSize: 30 }}>{inr(o.totalPaise)}</T.Display>
        <StatusChip status={o.status} />
      </Row>
      <T.Mute>
        {when(o.createdAt)} · {o.fulfilment === "pickup" ? "Stall pickup" : "Delivery"}
        {o.source ? ` · from ${o.source}` : ""}
        {o.couponCode ? ` · code ${o.couponCode}` : ""}
      </T.Mute>

      {next && (
        <>
          <Gap />
          <Button label={next.label} icon="check" onPress={() => setStatus.mutate(next.to)} busy={setStatus.isPending} />
        </>
      )}

      <Section title="Customer">
        <Card style={{ gap: space.s }}>
          <T.H2>{o.customerName || "No name"}</T.H2>
          {o.customerPhone ? (
            <T.Body selectable>
              {formatPhone(o.customerPhone)} · {customerOrders} order{customerOrders === 1 ? "" : "s"}
            </T.Body>
          ) : null}
          {o.instagram ? <T.Body selectable>@{o.instagram}</T.Body> : null}
          {o.fulfilment === "delivery" && o.address.line ? <T.Body selectable>{addressText(o.address)}</T.Body> : null}
          {o.customerNote ? <T.Mute>“{o.customerNote}”</T.Mute> : null}
          <Row style={{ flexWrap: "wrap", marginTop: space.s }}>
            {o.customerPhone ? <Chip label="Call" onPress={() => call(o.customerPhone)} /> : null}
            {o.customerPhone ? <Chip label="WhatsApp" onPress={() => whatsapp(o.customerPhone, orderSummary(o, orderUrl))} /> : null}
            {o.instagram ? <Chip label="Instagram DM" onPress={() => instagram(o.instagram)} /> : null}
            {o.customerPhone ? <Chip label="Their orders" onPress={() => router.push({ pathname: "/customers/[phone]", params: { phone: o.customerPhone } })} /> : null}
          </Row>
        </Card>
      </Section>

      <Section title={`Items (${o.lines.reduce((n, l) => n + l.qty, 0)})`}>
        <View style={{ borderRadius: 16, overflow: "hidden" }}>
          {o.lines.map((l, i) => (
            <View key={i} style={{ backgroundColor: c.surface, padding: space.l, borderBottomWidth: 1, borderBottomColor: c.line, gap: 4 }}>
              <Row>
                {l.image ? <Image source={l.image} style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: c.surface2 }} contentFit="cover" /> : null}
                <View style={{ flex: 1 }}>
                  <T.Body>
                    {l.qty} × {l.name}
                  </T.Body>
                  {l.options.length ? <T.Mute>{l.options.join(" · ")}</T.Mute> : null}
                </View>
                <T.Num>{inr(l.lineTotalPaise)}</T.Num>
              </Row>
              {l.custom.map((f) =>
                f.kind === "image" || f.kind === "link" ? (
                  <Chip key={f.label} label={`${f.label}: open`} onPress={() => Linking.openURL(f.value)} />
                ) : (
                  <T.Mute key={f.label}>
                    {f.label}: {f.value}
                  </T.Mute>
                ),
              )}
            </View>
          ))}
        </View>
        <Card style={{ gap: 4 }}>
          <Row style={{ justifyContent: "space-between" }}>
            <T.Mute>Subtotal</T.Mute>
            <T.Num>{inr(o.subtotalPaise)}</T.Num>
          </Row>
          {o.offers.map((a) => (
            <Row key={a.offerId} style={{ justifyContent: "space-between" }}>
              <T.Mute>{a.name}</T.Mute>
              <T.Num style={{ color: c.lemon }}>−{inr(a.discountPaise)}</T.Num>
            </Row>
          ))}
          <Row style={{ justifyContent: "space-between" }}>
            <T.Body>Total</T.Body>
            <T.Num style={{ fontWeight: "700" }}>{inr(o.totalPaise)}</T.Num>
          </Row>
        </Card>
      </Section>

      {o.fulfilment === "delivery" && (
        <Section title="India Post">
          <Card style={{ gap: space.m }}>
            <Field label="Tracking number" value={tracking} onChangeText={setTracking} autoCapitalize="characters" placeholder="EE123456789IN" error={trackingBad ? "Letters and digits, like EE123456789IN." : undefined} />
            <Row style={{ flexWrap: "wrap" }}>
              <Button small label="Save" kind="secondary" onPress={() => ship.mutate(false)} busy={ship.isPending} disabled={trackingBad} />
              {o.status === "paid" ? <Button small label="Save and mark shipped" icon="truck" onPress={() => ship.mutate(true)} busy={ship.isPending} disabled={trackingBad || !trackingClean} /> : null}
              <Button small label="Copy parcel label" kind="ghost" icon="copy" onPress={() => copy(parcelLabel(o), "Label copied")} />
              {o.trackingNumber ? <Button small label="Track" kind="ghost" icon="external-link" onPress={() => (copy(o.trackingNumber, "Number copied"), Linking.openURL(INDIA_POST_TRACKING_URL))} /> : null}
            </Row>
          </Card>
        </Section>
      )}

      <Section title="Status">
        <Segmented value={o.status} options={ORDER_STATUSES.map((x) => ({ value: x, label: STATUS_LABEL[x] }))} onChange={(x) => x !== o.status && setStatus.mutate(x)} />
        <T.Mute style={{ fontSize: 12 }}>Confirming takes items off stock. Cancelling puts them back.</T.Mute>
      </Section>

      <Section title="Note to self">
        <Field label="Only you see this" value={note} onChangeText={setNote} multiline />
        <Button label="Save note" kind="secondary" onPress={() => saveNote.mutate(undefined)} busy={saveNote.isPending} disabled={note === o.adminNote} />
      </Section>

      <Section title="Customer's order page">
        <ListRow title="Copy link" sub={orderUrl} icon="link" onPress={() => copy(orderUrl, "Link copied")} />
        <ListRow title="Share order summary" icon="share-2" onPress={() => shareText(orderSummary(o, orderUrl))} />
      </Section>
    </Screen>
  );
}
