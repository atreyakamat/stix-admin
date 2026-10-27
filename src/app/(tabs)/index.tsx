import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { OrderRow } from "@/components/order-row";
import { useAuth } from "@/lib/auth";
import { inr, pct, ymd } from "@/lib/format";
import { useApi } from "@/lib/queries";
import type { Dashboard } from "@/lib/responses";
import { Bars, Card, Chip, Empty, ErrorView, Gap, Loading, Meter, Notice, Row, Screen, Section, Segmented, Stat, T } from "@/ui/kit";
import { c, space } from "@/ui/theme";

const PERIODS = [
  { value: 1, label: "Today" },
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

export default function Home() {
  const { session } = useAuth();
  const [days, setDays] = useState(7);
  const q = useApi<Dashboard>(`dashboard?days=${days}`);
  if (q.isPending) return <Loading />;
  if (q.isError) return <ErrorView error={q.error} onRetry={q.refetch} />;
  const d = q.data;
  const st = d.stats;

  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch} edges={["top"]}>
      <Row style={{ justifyContent: "space-between" }}>
        <T.Display>Dashboard</T.Display>
        {session?.mode === "demo" ? <Chip label="Demo data" tone={c.amber} /> : null}
      </Row>
      <Gap h={space.m} />
      <Segmented value={days} options={PERIODS} onChange={setDays} />

      {d.warnings.length > 0 && (
        <View style={{ gap: space.s, marginTop: space.l }}>
          {d.warnings.map((w) => (
            <Notice key={w} text={w} />
          ))}
        </View>
      )}

      {d.goal && (
        <Card style={{ marginTop: space.l, gap: space.s }} onPress={() => router.push("/costs")}>
          <Row style={{ justifyContent: "space-between" }}>
            <T.Mute>Profit goal</T.Mute>
            <T.Mute>{d.goal.daysLeft} days left</T.Mute>
          </Row>
          <T.Display style={{ fontSize: 30, color: c.lemon }}>
            {inr(d.goal.profitPaise)} <T.Mute>of {inr(d.goal.goalPaise)}</T.Mute>
          </T.Display>
          <Meter value={d.goal.progress} />
          <T.Mute>
            Online {inr(d.goal.online.revenuePaise - d.goal.online.costPaise)} · Stalls {inr(d.goal.stalls.revenuePaise - d.goal.stalls.costPaise - d.goal.stallCostsPaise)} ·{" "}
            {d.goal.perWeekPaise > 0 ? `${inr(d.goal.perWeekPaise)}/week to go` : "On track"}
          </T.Mute>
          {d.goal.missing.length > 0 ? <T.Mute style={{ color: c.amber }}>No unit cost for {d.goal.missing.join(", ")}, so profit reads high.</T.Mute> : null}
        </Card>
      )}

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s, marginTop: space.l }}>
        <Stat label="Order value" value={inr(st.orderValuePaise)} hint={`${st.orders} orders`} accent />
        <Stat label="Sales" value={inr(st.salesPaise)} hint={`${st.sales} confirmed`} />
        <Stat label="Visits" value={st.visits} hint={`${pct(st.orders, st.visits)} ordered`} />
        <Stat label="Added to cart" value={st.addToCart} hint={`${st.views} product views`} />
      </View>

      {st.daily.length > 1 && (
        <Card style={{ marginTop: space.l, gap: space.s }} onPress={() => router.push("/analytics")}>
          <Row style={{ justifyContent: "space-between" }}>
            <T.Body>Visits per day</T.Body>
            <T.Mute>Analytics ›</T.Mute>
          </Row>
          <Bars values={st.daily.map((x) => x.visits)} highlight={(i) => st.daily[i].orders > 0} />
          <T.Mute style={{ fontSize: 12 }}>Yellow: at least one order that day.</T.Mute>
        </Card>
      )}

      {d.nextStall && (
        <Card style={{ marginTop: space.l }} onPress={() => router.push({ pathname: "/stalls/[id]", params: { id: d.nextStall!.id } })}>
          <T.Mute>Next stall</T.Mute>
          <T.H2>{d.nextStall.name}</T.H2>
          <T.Mute>
            {ymd(d.nextStall.date)}
            {d.nextStall.venue ? ` · ${d.nextStall.venue}` : ""}
          </T.Mute>
        </Card>
      )}

      <Section title={d.newOrders > 0 ? `Latest orders (${d.newOrders} new)` : "Latest orders"} action={<Chip label="All" onPress={() => router.push("/orders")} />}>
        {d.latestOrders.length ? (
          <View style={{ borderRadius: 16, overflow: "hidden" }}>
            {d.latestOrders.map((o) => (
              <OrderRow key={o.number} o={o} />
            ))}
          </View>
        ) : (
          <Empty text="No orders yet." />
        )}
      </Section>

      {(st.topOrdered.length > 0 || st.topViewed.length > 0) && (
        <Section title="Best sellers">
          <Card style={{ gap: space.s }}>
            {st.topOrdered.slice(0, 5).map((t) => (
              <Row key={t.productId} style={{ justifyContent: "space-between" }}>
                <T.Body numberOfLines={1} style={{ flex: 1 }}>
                  {d.productNames[t.productId] ?? "Deleted product"}
                </T.Body>
                <T.Mute>{t.qty} sold</T.Mute>
              </Row>
            ))}
            {st.topOrdered.length === 0 ? <T.Mute>No orders in this period yet.</T.Mute> : null}
          </Card>
        </Section>
      )}
    </Screen>
  );
}
