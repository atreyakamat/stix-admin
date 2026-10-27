import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { api } from "@/lib/api";
import { istToday, rupeesField } from "@/lib/format";
import { confirm, useApi, useChange } from "@/lib/queries";
import type { StallRes, StallsRes } from "@/lib/responses";
import { Button, Chip, ErrorView, Field, Gap, Loading, Row, Screen, Section, T, Toggle } from "@/ui/kit";
import type { Stall } from "@/shared/types";
import { space } from "@/ui/theme";

type Form = { name: string; date: string; venue: string; collegeId: string; fee: string; otherCosts: string; notes: string; public: boolean };

export default function EditStall() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const one = useApi<StallRes>(id ? `stalls/${id}` : null);
  if (id && one.isPending) return <Loading />;
  if (id && one.isError) return <ErrorView error={one.error} onRetry={one.refetch} />;
  return <StallForm key={id ?? "new"} id={id} stall={id ? one.data!.report.stall : undefined} />;
}

function StallForm({ id, stall: st }: { id?: string; stall?: Stall }) {
  const list = useApi<StallsRes>("stalls");
  const [f, setF] = useState<Form>(() =>
    st
      ? { name: st.name, date: st.date, venue: st.venue, collegeId: st.collegeId ?? "", fee: rupeesField(st.feePaise), otherCosts: rupeesField(st.otherCostsPaise), notes: st.notes, public: st.public }
      : { name: "", date: istToday(), venue: "", collegeId: "", fee: "", otherCosts: "", notes: "", public: true },
  );
  const save = useChange((form: Form) => (id ? api.put(`stalls/${id}`, form) : api.post("stalls", form)), ["stalls", "stall-mode"], {
    onDone: (r) => (id ? router.back() : router.replace({ pathname: "/stalls/[id]", params: { id: r.id! } })),
  });
  const remove = useChange(() => api.del(`stalls/${id}`), ["stalls", "stall-mode"], { onDone: () => router.dismissTo("/stalls") });
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((cur) => ({ ...cur, [k]: v }));
  return (
    <Screen>
      <Stack.Screen options={{ title: id ? "Edit stall" : "New stall" }} />
      <View style={{ gap: space.l }}>
        <Field label="Name" value={f.name} onChangeText={(v) => set("name", v)} placeholder="WordsUp fest" />
        <Field label="Date" value={f.date} onChangeText={(v) => set("date", v)} placeholder="2026-11-02" hint="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />
        <Field label="Venue" value={f.venue} onChangeText={(v) => set("venue", v)} placeholder="St. Xavier's, Mapusa" />
        <Row>
          <View style={{ flex: 1 }}>
            <Field label="Stall fee (₹)" value={f.fee} onChangeText={(v) => set("fee", v)} keyboardType="decimal-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Other costs (₹)" value={f.otherCosts} onChangeText={(v) => set("otherCosts", v)} keyboardType="decimal-pad" hint="Travel, table, food" />
          </View>
        </Row>
        <Field label="Notes" value={f.notes} onChangeText={(v) => set("notes", v)} multiline />
        <Toggle label="List on college pages" hint="Shows as an upcoming stall" value={f.public} onChange={(v) => set("public", v)} />
      </View>
      {list.data?.colleges.length ? (
        <Section title="College">
          <Row style={{ flexWrap: "wrap" }}>
            <Chip label="None" on={!f.collegeId} onPress={() => set("collegeId", "")} />
            {list.data.colleges.map((col) => (
              <Chip key={col.id} label={col.name} on={f.collegeId === col.id} onPress={() => set("collegeId", col.id)} />
            ))}
          </Row>
        </Section>
      ) : null}
      <Gap h={space.xl} />
      <Button label="Save stall" icon="save" busy={save.isPending} onPress={() => save.mutate(f)} />
      {id ? (
        <>
          <Gap h={space.m} />
          <Button label="Delete stall" kind="danger" busy={remove.isPending} onPress={() => confirm("Delete this stall?", "Its sales stay, without a stall.", "Delete", () => remove.mutate(undefined))} />
        </>
      ) : null}
      <Gap h={space.s} />
      <T.Mute style={{ fontSize: 12 }}>Profit = sales − stock cost − fee − other costs.</T.Mute>
    </Screen>
  );
}
