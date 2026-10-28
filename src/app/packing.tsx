import { router } from "expo-router";
import { View } from "react-native";
import { StatusChip } from "@/components/order-row";
import { api } from "@/lib/api";
import { addressText, copy, parcelLabel } from "@/lib/contact";
import { inr, when } from "@/lib/format";
import { useApi, useChange } from "@/lib/queries";
import type { PackingRes } from "@/lib/responses";
import type { Order } from "@/shared/types";
import { Button, Card, Empty, ErrorView, Loading, Row, Screen, Section, T } from "@/ui/kit";
import { space } from "@/ui/theme";

function Slip({ o, children }: { o: Order; children?: React.ReactNode }) {
  return (
    <Card style={{ gap: space.s }} onPress={() => router.push({ pathname: "/order/[number]", params: { number: o.number } })}>
      <Row style={{ justifyContent: "space-between" }}>
        <T.H2>{o.customerName || o.number}</T.H2>
        <StatusChip status={o.status} />
      </Row>
      <T.Mute>
        {o.number} · {inr(o.totalPaise)} · {when(o.createdAt)}
      </T.Mute>
      <T.Body>{o.lines.map((l) => `${l.qty} × ${l.name}${l.options.length ? ` (${l.options.join(", ")})` : ""}`).join("\n")}</T.Body>
      <T.Mute selectable>{addressText(o.address)}</T.Mute>
      {o.trackingNumber ? <T.Mute>India Post: {o.trackingNumber}</T.Mute> : null}
      {children}
    </Card>
  );
}

export default function Packing() {
  const q = useApi<PackingRes>("packing");
  const ship = useChange((o: Order) => api.post(`orders/${o.number}/ship`, { trackingNumber: o.trackingNumber, markShipped: true }), ["packing", "orders"]);
  if (q.isPending) return <Loading />;
  if (q.isError) return <ErrorView error={q.error} onRetry={q.refetch} />;
  const { toPack, waiting, shipped } = q.data;
  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      <T.Mute>Delivery orders only. Stall pickups don&apos;t need packing.</T.Mute>
      <Section title={`To pack (${toPack.length})`}>
        {toPack.length ? (
          toPack.map((o) => (
            <Slip key={o.number} o={o}>
              <Row style={{ flexWrap: "wrap" }}>
                <Button small kind="secondary" icon="copy" label="Copy label" onPress={() => copy(parcelLabel(o), "Label copied")} />
                {o.trackingNumber ? (
                  <Button small icon="truck" label="Mark shipped" busy={ship.isPending} onPress={() => ship.mutate(o)} />
                ) : (
                  <Button small icon="edit-2" label="Add India Post number" onPress={() => router.push({ pathname: "/order/[number]", params: { number: o.number } })} />
                )}
              </Row>
            </Slip>
          ))
        ) : (
          <Empty text="Nothing to pack. Paid delivery orders land here." icon="check-circle" />
        )}
      </Section>
      <Section title={`Waiting on payment (${waiting.length})`}>
        {waiting.length ? waiting.map((o) => <Slip key={o.number} o={o} />) : <Empty text="No confirmed orders waiting." />}
      </Section>
      <Section title="Recently shipped">
        <View style={{ gap: space.s }}>{shipped.length ? shipped.map((o) => <Slip key={o.number} o={o} />) : <Empty text="Nothing shipped yet." />}</View>
      </Section>
    </Screen>
  );
}
