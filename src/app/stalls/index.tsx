import { router, useNavigation } from "expo-router";
import { useLayoutEffect } from "react";
import { View } from "react-native";
import { inr, ymd } from "@/lib/format";
import { useApi } from "@/lib/queries";
import type { StallReport, StallsRes } from "@/lib/responses";
import { Button, Empty, ErrorView, ListRow, Loading, Screen, Section, Stat, T } from "@/ui/kit";
import { c, space } from "@/ui/theme";

function StallRow({ r }: { r: StallReport }) {
  return (
    <ListRow
      title={r.stall.name}
      sub={`${ymd(r.stall.date)}${r.stall.venue ? ` · ${r.stall.venue}` : ""}${r.sales ? ` · ${r.sales} sales, ${inr(r.revenuePaise)}` : ""}`}
      right={r.sales || r.stall.feePaise ? <T.Num style={{ color: r.profitPaise >= 0 ? c.lemon : c.coralSoft }}>{inr(r.profitPaise)}</T.Num> : undefined}
      onPress={() => router.push({ pathname: "/stalls/[id]", params: { id: r.stall.id } })}
    />
  );
}

export default function Stalls() {
  const q = useApi<StallsRes>("stalls");
  const nav = useNavigation();
  useLayoutEffect(() => {
    nav.setOptions({ headerRight: () => <Button small kind="ghost" icon="plus" label="New" onPress={() => router.push("/stalls/edit")} /> });
  }, [nav]);
  if (q.isPending) return <Loading />;
  if (q.isError) return <ErrorView error={q.error} onRetry={q.refetch} />;
  const { upcoming, past, totals } = q.data;
  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      <View style={{ flexDirection: "row", gap: space.s }}>
        <Stat label="Stall takings" value={inr(totals.revenuePaise)} hint={`${past.length} stalls so far`} />
        <Stat label="Stall profit" value={inr(totals.profitPaise)} hint="After stock, fees and costs" accent />
      </View>
      <Section title="Coming up">
        {upcoming.length ? (
          <View style={{ borderRadius: 16, overflow: "hidden" }}>
            {upcoming.map((r) => (
              <StallRow key={r.stall.id} r={r} />
            ))}
          </View>
        ) : (
          <Empty text="No stalls booked. Add one so stall mode can tag its sales." icon="calendar" />
        )}
      </Section>
      <Section title="Past">
        {past.length ? (
          <View style={{ borderRadius: 16, overflow: "hidden" }}>
            {past.map((r) => (
              <StallRow key={r.stall.id} r={r} />
            ))}
          </View>
        ) : (
          <Empty text="No past stalls yet." />
        )}
      </Section>
    </Screen>
  );
}
