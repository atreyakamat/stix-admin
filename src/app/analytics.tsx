import { useState } from "react";
import { View } from "react-native";
import { inr, pct } from "@/lib/format";
import { useApi } from "@/lib/queries";
import type { Analytics } from "@/lib/responses";
import { typeLabel } from "@/shared/types";
import { Bars, Card, Empty, ErrorView, Loading, Meter, Row, Screen, Section, Segmented, Stat, T } from "@/ui/kit";
import { c, space } from "@/ui/theme";

const PERIODS = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
  { value: 365, label: "1 year" },
];

function Table({ rows }: { rows: { label: string; cells: string[] }[] }) {
  return (
    <Card style={{ gap: space.s }}>
      {rows.map((r, i) => (
        <Row key={r.label + i} style={{ justifyContent: "space-between" }}>
          <T.Body numberOfLines={1} style={{ flex: 1 }}>
            {r.label}
          </T.Body>
          {r.cells.map((x, j) => (
            <T.Num key={j} style={{ minWidth: 64, textAlign: "right", color: j === 0 ? c.paper : c.mute, fontSize: 14 }}>
              {x}
            </T.Num>
          ))}
        </Row>
      ))}
    </Card>
  );
}

export default function AnalyticsScreen() {
  const [days, setDays] = useState(30);
  const q = useApi<Analytics>(`analytics?days=${days}`);
  if (q.isPending) return <Loading />;
  if (q.isError) return <ErrorView error={q.error} onRetry={q.refetch} />;
  const { stats: s, lowStock, productNames, stalls } = q.data;
  const name = (id: string) => productNames[id] ?? "Deleted product";

  const funnel = [
    { label: "Visits", n: s.visits },
    { label: "Product views", n: s.views },
    { label: "Added to cart", n: s.addToCart },
    { label: "Opened checkout", n: s.checkouts },
    { label: "Placed an order", n: s.orders },
    { label: "Confirmed", n: s.sales },
    { label: "Paid", n: s.paid },
  ];
  const top = Math.max(1, ...funnel.map((f) => f.n));

  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Segmented value={days} options={PERIODS} onChange={setDays} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s, marginTop: space.l }}>
        <Stat label="Online sales" value={inr(s.salesPaise)} hint={`${s.sales} confirmed orders`} accent />
        <Stat label="Stall sales" value={inr(stalls.total)} hint={`${stalls.count} sales · profit ${inr(stalls.profitPaise)}`} accent />
        <Stat label="Average order" value={s.sales ? inr(Math.round(s.salesPaise / s.sales)) : "–"} />
        <Stat label="Visit to order" value={pct(s.orders, s.visits)} hint={`${s.orders} from ${s.visits} visits`} />
        <Stat label="Waiting on you" value={inr(s.orderValuePaise - s.salesPaise)} hint={`${s.orders - s.sales} not confirmed`} />
        <Stat label="Stall cash / UPI" value={`${pct(stalls.cash, stalls.total)} cash`} hint={`${inr(stalls.cash)} / ${inr(stalls.upi)}`} />
      </View>

      <Section title="Funnel">
        <Card style={{ gap: space.m }}>
          {funnel.map((f, i) => (
            <View key={f.label} style={{ gap: 4 }}>
              <Row style={{ justifyContent: "space-between" }}>
                <T.Body>{f.label}</T.Body>
                <T.Mute>
                  {f.n}
                  {i > 0 ? ` · ${pct(f.n, funnel[i - 1].n)}` : ""}
                </T.Mute>
              </Row>
              <Meter value={f.n / top} />
            </View>
          ))}
        </Card>
      </Section>

      {s.daily.length > 1 && (
        <Section title="Sales per day">
          <Card style={{ gap: space.s }}>
            <Bars values={s.daily.map((d) => d.salesPaise)} highlight={() => true} />
            <T.Mute style={{ fontSize: 12 }}>
              {s.daily[0].day} to {s.daily[s.daily.length - 1].day} · best day {inr(Math.max(...s.daily.map((d) => d.salesPaise)))}
            </T.Mute>
          </Card>
          <Card style={{ gap: space.s }}>
            <T.Body>Visits per day</T.Body>
            <Bars values={s.daily.map((d) => d.visits)} highlight={(i) => s.daily[i].orders > 0} />
          </Card>
        </Section>
      )}

      <Section title="By product type">
        {s.byType.length ? <Table rows={s.byType.map((t) => ({ label: typeLabel(t.type), cells: [inr(t.paise), `${t.qty} sold`] }))} /> : <Empty text="No sales in this period." />}
      </Section>

      <Section title="Where buyers come from">
        {s.bySource.length ? (
          <Table rows={s.bySource.map((x) => ({ label: x.source || "Direct", cells: [x.salesPaise != null ? inr(x.salesPaise) : "–", `${x.visits ?? "–"} visits`, `${x.orders ?? 0} orders`] }))} />
        ) : (
          <Empty text="No source data yet. Stall QR codes add ?src=." />
        )}
      </Section>

      <Section title="Codes">
        {s.byCoupon.length ? <Table rows={s.byCoupon.map((x) => ({ label: x.code, cells: [inr(x.salesPaise), `${x.orders} orders`, `−${inr(x.discountPaise)}`] }))} /> : <Empty text="No codes used in this period." />}
      </Section>

      <Section title="Most viewed">
        {s.topViewed.length ? <Table rows={s.topViewed.map((t) => ({ label: name(t.productId), cells: [`${t.count}`] }))} /> : <Empty text="No views yet." />}
      </Section>

      <Section title="Best sellers online">
        {s.topOrdered.length ? <Table rows={s.topOrdered.map((t) => ({ label: name(t.productId), cells: [`${t.qty} sold`] }))} /> : <Empty text="No orders yet." />}
      </Section>

      <Section title="Best sellers at stalls">
        {stalls.topProducts.length ? <Table rows={stalls.topProducts.map((t) => ({ label: name(t.productId), cells: [`${t.qty} sold`] }))} /> : <Empty text="No stall sales in this period." />}
      </Section>

      <Section title={`Low stock (${lowStock.length})`}>
        {lowStock.length ? <Table rows={lowStock.map((p) => ({ label: p.name, cells: [p.stock === 0 ? "Sold out" : `${p.stock} left`] }))} /> : <Empty text="Nothing running low." icon="check-circle" />}
      </Section>
    </Screen>
  );
}
