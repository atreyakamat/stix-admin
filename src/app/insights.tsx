import { router } from "expo-router";
import { View } from "react-native";
import { inr, pct, ymd } from "@/lib/format";
import { useApi } from "@/lib/queries";
import type { InsightsRes } from "@/lib/responses";
import { Card, Empty, ErrorView, ListRow, Loading, Screen, Section, Stat, T } from "@/ui/kit";
import { c, space } from "@/ui/theme";

const perHour = (paise: number | null) => (paise === null ? "–" : `${inr(paise)}/h`);
const hrs = (h: number) => `${h} h`;

export default function InsightsScreen() {
  const q = useApi<InsightsRes>("insights");
  if (q.isPending) return <Loading />;
  if (q.isError) return <ErrorView error={q.error} onRetry={q.refetch} />;
  const { stalls, venues, restock, repeat } = q.data;
  const timed = stalls.filter((s) => s.profitPerHourPaise !== null);

  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Section title="Best stalls">
        <T.Mute style={{ fontSize: 12 }}>Profit per hour of selling, first sale to last. Fees, other costs and what the goods cost are taken off.</T.Mute>
        {venues.length > 1 && (
          <Card style={{ gap: space.s }}>
            <T.Body>By place</T.Body>
            {venues.slice(0, 8).map((v, i) => (
              <View key={v.key} style={{ flexDirection: "row", justifyContent: "space-between", gap: space.s }}>
                <T.Body numberOfLines={1} style={{ flex: 1, color: i === 0 ? c.lemon : c.paper }}>
                  {v.venue}
                </T.Body>
                <T.Num style={{ fontSize: 14 }}>{perHour(v.avgPerHourPaise)}</T.Num>
                <T.Mute style={{ minWidth: 92, textAlign: "right" }}>{`${v.stalls} × ${inr(v.avgProfitPaise)}`}</T.Mute>
              </View>
            ))}
          </Card>
        )}
        {timed.length ? (
          <Card style={{ padding: 0 }}>
            {stalls.slice(0, 15).map((s) => (
              <ListRow
                key={s.id}
                title={s.name}
                sub={`${ymd(s.date)}${s.venue ? ` · ${s.venue}` : ""} · ${s.sales} sales${s.hours ? ` in ${hrs(s.hours)}` : ""} · profit ${inr(s.profitPaise)}`}
                right={perHour(s.profitPerHourPaise)}
                onPress={() => router.push({ pathname: "/stalls/[id]", params: { id: s.id } })}
              />
            ))}
          </Card>
        ) : (
          <Empty text="Ring up sales in stall mode and your stalls get ranked here." icon="map-pin" />
        )}
      </Section>

      <Section title={`Restock (${restock.length})`}>
        <T.Mute style={{ fontSize: 12 }}>{"Low on stock, or running out within 2 weeks at the last 30 days' pace. \"Make\" gets you about a month."}</T.Mute>
        {restock.length ? (
          <Card style={{ padding: 0 }}>
            {restock.map((p) => (
              <ListRow
                key={p.id}
                title={p.name}
                sub={`${p.stock === 0 ? "Sold out" : `${p.stock} left`}${p.daysLeft !== null ? ` · about ${p.daysLeft} days` : ""} · ${p.perWeek}/week`}
                right={p.suggest ? `Make ${p.suggest}` : undefined}
                onPress={() => router.push({ pathname: "/product/[id]", params: { id: p.id } })}
              />
            ))}
          </Card>
        ) : (
          <Empty text="Nothing to restock. Only products with a stock count are checked." icon="check-circle" />
        )}
      </Section>

      <Section title="Repeat buyers">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s }}>
          <Stat label="Came back" value={pct(repeat.repeat, repeat.customers)} hint={`${repeat.repeat} of ${repeat.customers} online buyers`} accent />
          <Stat label="Their share" value={repeat.customers ? `${Math.round(repeat.repeatShare * 100)}%` : "–"} hint="of online takings" />
          <Stat label="Second order" value={repeat.medianDaysToSecond === null ? "–" : `${repeat.medianDaysToSecond} days`} hint="usual gap after the first" />
        </View>
        {repeat.top.length > 0 && (
          <Card style={{ padding: 0 }}>
            {repeat.top.map((x) => (
              <ListRow
                key={x.phone}
                title={x.name || x.phone}
                sub={`${x.orders} orders · ${inr(x.spentPaise)}`}
                onPress={() => router.push({ pathname: "/customers/[phone]", params: { phone: x.phone } })}
              />
            ))}
          </Card>
        )}
        <T.Mute style={{ fontSize: 12 }}>{"Online orders only. Stall sales don't record who bought."}</T.Mute>
      </Section>
    </Screen>
  );
}
