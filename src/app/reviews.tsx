import { Image } from "expo-image";
import { useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { api } from "@/lib/api";
import { instagram, whatsapp } from "@/lib/contact";
import { when } from "@/lib/format";
import { confirm, useApi, useChange } from "@/lib/queries";
import type { AdminReview, ReviewsRes, ReviewStatus } from "@/lib/responses";
import { Button, Card, Chip, Empty, ErrorView, Field, Loading, Row, Screen, Segmented, T } from "@/ui/kit";
import { c, radius, space } from "@/ui/theme";

const TABS: { value: ReviewStatus; label: string }[] = [
  { value: "pending", label: "Waiting" },
  { value: "published", label: "Live" },
  { value: "hidden", label: "Hidden" },
];
const MAX = 1000;

function Stars({ n }: { n: number }) {
  return (
    <Text accessibilityLabel={`${n} out of 5`} style={{ color: c.lemon, letterSpacing: 1, fontSize: 16 }}>
      {"★".repeat(n)}
      <Text style={{ color: c.line }}>{"★".repeat(5 - n)}</Text>
    </Text>
  );
}

function ReviewCard({ r }: { r: AdminReview }) {
  const [reply, setReply] = useState(r.reply);
  const change = useChange((body: { status?: ReviewStatus; reply?: string }) => api.patch(`reviews/${r.id}`, body), ["reviews"]);
  const remove = useChange(() => api.del(`reviews/${r.id}`), ["reviews"]);
  const busy = change.isPending || remove.isPending;
  const replyChanged = reply.trim() !== r.reply;

  return (
    <Card style={{ gap: space.m }}>
      <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Stars n={r.rating} />
          <T.Body>
            {r.name}
            {r.instagram ? <T.Mute>{` · @${r.instagram}`}</T.Mute> : null}
          </T.Body>
          <T.Mute>
            {r.productName} · {when(r.createdAt)}
          </T.Mute>
        </View>
        {r.orderNumber ? <Chip label="Verified" tone={c.lemon} /> : null}
      </Row>
      {r.text ? <T.Body>{r.text}</T.Body> : null}
      {r.photoUrls.length > 0 && (
        <Row style={{ gap: space.s, flexWrap: "wrap" }}>
          {r.photoUrls.map((u, i) => (
            <Pressable key={u} accessibilityRole="imagebutton" accessibilityLabel={`Open photo ${i + 1}`} onPress={() => Linking.openURL(u)}>
              <Image source={u} style={{ width: 96, height: 96, borderRadius: radius.s, backgroundColor: c.surface2 }} contentFit="cover" />
            </Pressable>
          ))}
        </Row>
      )}
      <Field label="Your public reply" hint="Shows under the review on the shop." value={reply} onChangeText={setReply} maxLength={MAX} multiline />
      <Row style={{ gap: space.s, flexWrap: "wrap" }}>
        {r.status !== "published" && (
          <Button small icon="check" label={replyChanged ? "Publish with reply" : "Publish"} busy={change.isPending} disabled={busy} onPress={() => change.mutate({ status: "published", ...(replyChanged ? { reply } : {}) })} />
        )}
        {replyChanged && <Button small kind="ghost" label="Save reply" disabled={busy} onPress={() => change.mutate({ reply })} />}
        {r.status !== "hidden" && <Button small kind="ghost" icon="eye-off" label="Hide" disabled={busy} onPress={() => change.mutate({ status: "hidden" })} />}
      </Row>
      <Row style={{ gap: space.s, flexWrap: "wrap" }}>
        {r.customerPhone ? <Button small kind="ghost" icon="message-circle" label="WhatsApp" onPress={() => whatsapp(r.customerPhone!, `Hi ${r.name}, thanks for your review of ${r.productName}!`)} /> : null}
        {r.instagram ? <Button small kind="ghost" icon="instagram" label="DM" onPress={() => instagram(r.instagram)} /> : null}
        <Button
          small
          kind="danger"
          icon="trash-2"
          label="Delete"
          disabled={busy}
          onPress={() => confirm("Delete this review?", "It goes for good. Hide it instead if you might want it back.", "Delete", () => remove.mutate(undefined))}
        />
      </Row>
    </Card>
  );
}

export default function Reviews() {
  const [status, setStatus] = useState<ReviewStatus>("pending");
  const q = useApi<ReviewsRes>(`reviews?status=${status}`);
  const counts = q.data?.counts;
  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Segmented value={status} options={TABS.map((t) => ({ ...t, label: counts ? `${t.label} (${counts[t.value]})` : t.label }))} onChange={setStatus} />
      {q.data?.average != null && <T.Mute style={{ marginTop: space.s }}>{`Live average ${q.data.average} ★ from ${q.data.counts.published}`}</T.Mute>}
      <View style={{ gap: space.m, marginTop: space.l }}>
        {q.isPending ? (
          <Loading />
        ) : q.isError ? (
          <ErrorView error={q.error} onRetry={q.refetch} />
        ) : q.data.reviews.length ? (
          q.data.reviews.map((r) => <ReviewCard key={`${r.id}-${r.updatedAt}`} r={r} />)
        ) : (
          <Empty text={status === "pending" ? "Nothing waiting. New reviews land here for you to publish." : "None here."} icon="star" />
        )}
      </View>
    </Screen>
  );
}
