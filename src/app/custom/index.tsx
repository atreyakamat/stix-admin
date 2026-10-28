import { router } from "expo-router";
import { View } from "react-native";
import { CUSTOM_LABEL, when } from "@/lib/format";
import { useApi } from "@/lib/queries";
import type { CustomListRes } from "@/lib/responses";
import { Chip, Empty, ErrorView, ListRow, Loading, Screen } from "@/ui/kit";
import { c, space } from "@/ui/theme";

const TONE = { new: c.amber, quoted: c.sky, won: c.lemon, lost: c.coralSoft } as const;

export default function CustomRequests() {
  const q = useApi<CustomListRes>("custom");
  if (q.isPending) return <Loading />;
  if (q.isError) return <ErrorView error={q.error} onRetry={q.refetch} />;
  return (
    <Screen padded={false} refreshing={q.isRefetching} onRefresh={q.refetch}>
      {q.data.requests.length ? (
        q.data.requests.map((r) => (
          <ListRow
            key={r.number}
            title={`${r.customerName} · ${r.qty} × ${r.kind}`}
            sub={`${r.number} · ${r.files.length} file${r.files.length === 1 ? "" : "s"} · ${when(r.createdAt)}`}
            right={<Chip label={CUSTOM_LABEL[r.status]} tone={TONE[r.status]} />}
            onPress={() => router.push({ pathname: "/custom/[number]", params: { number: r.number } })}
          />
        ))
      ) : (
        <View style={{ padding: space.l }}>
          <Empty text="No custom requests yet. They come from the shop's Custom page." />
        </View>
      )}
    </Screen>
  );
}
