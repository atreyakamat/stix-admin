import { Image } from "expo-image";
import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, ScrollView } from "react-native";
import { api } from "@/lib/api";
import { call, instagram, whatsapp } from "@/lib/contact";
import { CUSTOM_LABEL, when } from "@/lib/format";
import { useApi, useChange } from "@/lib/queries";
import type { CustomRes } from "@/lib/responses";
import { formatPhone } from "@/shared/phone";
import { CUSTOM_STATUSES, type CustomStatus } from "@/shared/types";
import { Button, Card, Chip, ErrorView, Field, Gap, Loading, Row, Screen, Section, Segmented, T } from "@/ui/kit";
import { c, radius, space } from "@/ui/theme";

export default function CustomRequestScreen() {
  const { number } = useLocalSearchParams<{ number: string }>();
  const q = useApi<CustomRes>(`custom/${number}`);
  if (q.isPending) return <Loading />;
  if (q.isError) return <ErrorView error={q.error} onRetry={q.refetch} />;
  return <CustomRequestView key={q.data.request.updatedAt} data={q.data} refreshing={q.isRefetching} onRefresh={q.refetch} />;
}

function CustomRequestView({ data, refreshing, onRefresh }: { data: CustomRes; refreshing: boolean; onRefresh: () => void }) {
  const { request: r, files } = data;
  const [status, setStatus] = useState<CustomStatus>(r.status);
  const [note, setNote] = useState(r.adminNote);
  const save = useChange(() => api.patch(`custom/${r.number}`, { status, adminNote: note }), ["custom"]);
  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <Stack.Screen options={{ title: r.number }} />
      <T.Display style={{ fontSize: 28 }}>{r.customerName}</T.Display>
      <T.Mute>
        {r.qty} × {r.kind}
        {r.size ? ` · ${r.size}` : ""} · {when(r.createdAt)}
        {r.source ? ` · from ${r.source}` : ""}
      </T.Mute>
      <Row style={{ flexWrap: "wrap", marginTop: space.m }}>
        {r.customerPhone ? <Chip label="Call" onPress={() => call(r.customerPhone)} /> : null}
        {r.customerPhone ? <Chip label="WhatsApp" onPress={() => whatsapp(r.customerPhone, `Hi ${r.customerName.split(" ")[0]}! About your custom request ${r.number}:`)} /> : null}
        {r.instagram ? <Chip label="Instagram DM" onPress={() => instagram(r.instagram)} /> : null}
      </Row>
      {r.customerPhone ? <T.Mute style={{ marginTop: space.s }}>{formatPhone(r.customerPhone)}</T.Mute> : null}
      {r.note ? (
        <Card style={{ marginTop: space.l }}>
          <T.Mute>Their note</T.Mute>
          <T.Body selectable>{r.note}</T.Body>
        </Card>
      ) : null}
      <Section title={`Designs (${files.length})`}>
        <ScrollView horizontal contentContainerStyle={{ gap: space.s }}>
          {files.map((u) => (
            <Pressable key={u} onPress={() => Linking.openURL(u)}>
              <Image source={u} style={{ width: 140, height: 140, borderRadius: radius.s, backgroundColor: c.surface2 }} contentFit="cover" />
            </Pressable>
          ))}
        </ScrollView>
        <T.Mute style={{ fontSize: 12 }}>Tap to open full size. For a Cricut sheet, use Cricut sheets on the web.</T.Mute>
      </Section>
      <Section title="Status">
        <Segmented value={status} options={CUSTOM_STATUSES.map((x) => ({ value: x, label: CUSTOM_LABEL[x] }))} onChange={setStatus} />
        <Field label="Note to self" value={note} onChangeText={setNote} multiline placeholder="Quoted ₹300 for 20, waiting" />
        <Gap h={space.s} />
        <Button label="Save" icon="save" busy={save.isPending} onPress={() => save.mutate(undefined)} />
      </Section>
    </Screen>
  );
}
