import { Stack, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { OrderRow } from "@/components/order-row";
import { addressText, call, copy, whatsapp } from "@/lib/contact";
import { customerTag, day, inr } from "@/lib/format";
import { useApi } from "@/lib/queries";
import type { CustomerRes } from "@/lib/responses";
import { formatPhone } from "@/shared/phone";
import { Card, Chip, ErrorView, Loading, Row, Screen, Section, Stat, T } from "@/ui/kit";
import { space } from "@/ui/theme";

export default function CustomerScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const q = useApi<CustomerRes>(`customers/${phone}`);
  if (q.isPending) return <Loading />;
  if (q.isError) return <ErrorView error={q.error} onRetry={q.refetch} />;
  const { customer: x, orders } = q.data;
  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: x.name || formatPhone(x.phone) }} />
      <T.Display style={{ fontSize: 28 }}>{x.name || "No name"}</T.Display>
      <T.Body selectable>{formatPhone(x.phone)}</T.Body>
      <Row style={{ flexWrap: "wrap", marginTop: space.m }}>
        <Chip label="Call" onPress={() => call(x.phone)} />
        <Chip label="WhatsApp" onPress={() => whatsapp(x.phone)} />
        <Chip label="Copy number" onPress={() => copy(x.phone)} />
      </Row>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s, marginTop: space.l }}>
        <Stat label="Orders" value={x.orders} hint={customerTag(x.orders)} />
        <Stat label="Spent" value={inr(x.spentPaise)} accent />
        <Stat label="Average order" value={inr(Math.round(x.spentPaise / Math.max(1, x.orders)))} />
        <Stat label="Customer since" value={day(x.firstAt)} />
      </View>
      {x.address ? (
        <Card style={{ marginTop: space.l }}>
          <T.Mute>Latest address</T.Mute>
          <T.Body selectable>{addressText(x.address)}</T.Body>
        </Card>
      ) : null}
      <Section title="Orders">
        <View style={{ borderRadius: 16, overflow: "hidden" }}>
          {orders.map((o) => (
            <OrderRow key={o.number} o={o} />
          ))}
        </View>
      </Section>
    </Screen>
  );
}
