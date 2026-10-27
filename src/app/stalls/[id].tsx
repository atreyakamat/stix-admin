import { router, Stack, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { api } from "@/lib/api";
import { inr, time, when, ymd } from "@/lib/format";
import { confirm, useApi, useChange } from "@/lib/queries";
import type { StallRes } from "@/lib/responses";
import { typeLabel } from "@/shared/types";
import { Button, Card, Empty, ErrorView, Loading, Row, Screen, Section, T } from "@/ui/kit";
import { c, space } from "@/ui/theme";

export default function StallScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useApi<StallRes>(`stalls/${id}`);
  const voidSale = useChange((saleId: string) => api.del(`stall-sales/${saleId}`), ["stalls", "products", "stall-mode"]);
  if (q.isPending) return <Loading />;
  if (q.isError) return <ErrorView error={q.error} onRetry={q.refetch} />;
  const { report: r, sales, top, productNames } = q.data;
  const st = r.stall;
  const rows = [
    { label: "Sales", value: r.revenuePaise, hint: `${r.sales} sales, ${r.units} items · cash ${inr(r.cashPaise)} · UPI ${inr(r.upiPaise)}` },
    { label: "Stock cost", value: -r.costPaise, hint: r.missing.length ? `No cost set for ${r.missing.map(typeLabel).join(", ")}` : "From your unit costs" },
    { label: "Stall fee", value: -st.feePaise, hint: "" },
    { label: "Other costs", value: -st.otherCostsPaise, hint: "" },
  ];
  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: st.name, headerRight: () => <Button small kind="ghost" icon="edit-2" label="Edit" onPress={() => router.push({ pathname: "/stalls/edit", params: { id: st.id } })} /> }} />
      <T.Display style={{ fontSize: 28 }}>{st.name}</T.Display>
      <T.Mute>
        {ymd(st.date)}
        {st.venue ? ` · ${st.venue}` : ""}
        {st.public ? " · listed on college pages" : ""}
      </T.Mute>
      <Card style={{ marginTop: space.l, gap: space.m }}>
        {rows.map((x) => (
          <View key={x.label}>
            <Row style={{ justifyContent: "space-between" }}>
              <T.Body>{x.label}</T.Body>
              <T.Num>{x.value < 0 ? `−${inr(-x.value)}` : inr(x.value)}</T.Num>
            </Row>
            {x.hint ? <T.Mute style={{ fontSize: 12, color: x.label === "Stock cost" && r.missing.length ? c.amber : c.mute }}>{x.hint}</T.Mute> : null}
          </View>
        ))}
        <Row style={{ justifyContent: "space-between", borderTopWidth: 1, borderTopColor: c.line, paddingTop: space.m }}>
          <T.H2>Profit</T.H2>
          <T.H2 style={{ color: r.profitPaise >= 0 ? c.lemon : c.coralSoft }}>{inr(r.profitPaise)}</T.H2>
        </Row>
      </Card>
      {st.notes ? (
        <Card style={{ marginTop: space.m }}>
          <T.Mute>Notes</T.Mute>
          <T.Body>{st.notes}</T.Body>
        </Card>
      ) : null}

      <Section title="Best sellers">
        {top.length ? (
          <Card style={{ gap: space.s }}>
            {top.map((t) => (
              <Row key={t.productId} style={{ justifyContent: "space-between" }}>
                <T.Body style={{ flex: 1 }} numberOfLines={1}>
                  {productNames[t.productId] ?? "Deleted product"}
                </T.Body>
                <T.Mute>{t.qty} sold</T.Mute>
              </Row>
            ))}
          </Card>
        ) : (
          <Empty text="No sales at this stall yet. Pick it in stall mode to tag sales." />
        )}
      </Section>

      <Section title={`Sales (${sales.length})`}>
        {sales.map((x) => (
          <Card key={x.id} style={{ gap: 4 }}>
            <Row style={{ justifyContent: "space-between" }}>
              <T.Body>
                {time(x.soldAt)} · {x.payment.toUpperCase()}
              </T.Body>
              <T.Num>{inr(x.totalPaise)}</T.Num>
            </Row>
            <T.Mute>{x.lines.map((l) => `${l.qty}× ${l.name}${l.options.length ? ` (${l.options.join(", ")})` : ""}`).join(", ")}</T.Mute>
            {x.discountPaise ? <T.Mute>Discount {inr(x.discountPaise)}</T.Mute> : null}
            <Button small kind="ghost" label="Void" icon="x-circle" onPress={() => confirm("Void this sale?", `${inr(x.totalPaise)} on ${when(x.soldAt)}. Its items go back in stock.`, "Void", () => voidSale.mutate(x.id))} style={{ alignSelf: "flex-start" }} />
          </Card>
        ))}
      </Section>
    </Screen>
  );
}
