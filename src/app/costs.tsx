import { useMemo, useState } from "react";
import { View } from "react-native";
import { api } from "@/lib/api";
import { rupeesField } from "@/lib/format";
import { useApi, useChange } from "@/lib/queries";
import type { SettingsRes } from "@/lib/responses";
import { PRODUCT_TYPES, typeLabel } from "@/shared/types";
import { Button, Card, ErrorView, Field, Gap, Loading, Row, Screen, Section, T } from "@/ui/kit";
import { c, space } from "@/ui/theme";

type CostRow = { key: string; label: string; indent: boolean };

export default function Costs() {
  const q = useApi<SettingsRes>("settings");
  if (q.isPending) return <Loading />;
  if (q.isError) return <ErrorView error={q.error} onRetry={q.refetch} />;
  return <CostsForm data={q.data} />;
}

function CostsForm({ data }: { data: SettingsRes }) {
  // Every type, its option choices, and any cost key already saved, so a save never drops one.
  const rows = useMemo<CostRow[]>(() => {
    const { settings, costChoices } = data;
    const out: CostRow[] = [];
    for (const t of PRODUCT_TYPES) {
      out.push({ key: t.id, label: t.label, indent: false });
      for (const ch of costChoices[t.id] ?? []) out.push({ key: ch.key, label: ch.label, indent: true });
    }
    for (const k of Object.keys(settings.unitCosts)) if (!out.some((r) => r.key === k)) out.push({ key: k, label: `${typeLabel(k.split(":")[0])}: ${k.split(":")[1] ?? ""}`, indent: true });
    return out;
  }, [data]);
  const s = data.settings;
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(rows.map((r) => [r.key, s.unitCosts[r.key] === undefined ? "" : rupeesField(s.unitCosts[r.key])])));
  const [goal, setGoal] = useState({ goal: rupeesField(s.goalPaise), goalStart: s.goalStart, goalBy: s.goalBy });

  const save = useChange(() => api.put("costs", { costs: rows.map((r) => ({ key: r.key, value: values?.[r.key] ?? "" })), ...goal }), ["settings", "stalls", "analytics"]);

  return (
    <Screen>
      <T.Mute>What one unit costs you to make. Profit on the dashboard and per stall uses these. A product&apos;s own cost wins over these.</T.Mute>
      <Section title="Unit costs (₹)">
        <Card style={{ gap: space.s }}>
          {rows.map((r) => (
            <Row key={r.key} style={{ justifyContent: "space-between", paddingLeft: r.indent ? space.l : 0 }}>
              <T.Body style={{ flex: 1, color: r.indent ? c.mute : c.paper }} numberOfLines={1}>
                {r.label}
              </T.Body>
              <View style={{ width: 110 }}>
                <Field label="" value={values[r.key] ?? ""} onChangeText={(v) => setValues((cur) => ({ ...cur, [r.key]: v }))} keyboardType="decimal-pad" placeholder="–" style={{ paddingVertical: 8, textAlign: "right" }} />
              </View>
            </Row>
          ))}
        </Card>
      </Section>
      <Section title="Profit goal">
        <Field label="Goal (₹ profit)" value={goal.goal} onChangeText={(v) => setGoal((g) => ({ ...g, goal: v }))} keyboardType="number-pad" placeholder="300000" hint="Blank hides the goal card" />
        <Row>
          <View style={{ flex: 1 }}>
            <Field label="Counting from" value={goal.goalStart} onChangeText={(v) => setGoal((g) => ({ ...g, goalStart: v }))} placeholder="2026-10-01" keyboardType="numbers-and-punctuation" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Reach it by" value={goal.goalBy} onChangeText={(v) => setGoal((g) => ({ ...g, goalBy: v }))} placeholder="2026-12-31" keyboardType="numbers-and-punctuation" />
          </View>
        </Row>
      </Section>
      <Gap h={space.xl} />
      <Button label="Save costs and goal" icon="save" busy={save.isPending} onPress={() => save.mutate(undefined)} />
    </Screen>
  );
}
