import { router, useNavigation } from "expo-router";
import { useLayoutEffect } from "react";
import { View } from "react-native";
import { useApi } from "@/lib/queries";
import type { CollectionsRes } from "@/lib/responses";
import { Button, Empty, ErrorView, ListRow, Loading, Screen } from "@/ui/kit";
import { space } from "@/ui/theme";

export default function Collections() {
  const q = useApi<CollectionsRes>("collections");
  const nav = useNavigation();
  useLayoutEffect(() => {
    nav.setOptions({ headerRight: () => <Button small kind="ghost" icon="plus" label="New" onPress={() => router.push({ pathname: "/collections/[id]", params: { id: "new" } })} /> });
  }, [nav]);
  if (q.isPending) return <Loading />;
  if (q.isError) return <ErrorView error={q.error} onRetry={q.refetch} />;
  return (
    <Screen padded={false} refreshing={q.isRefetching} onRefresh={q.refetch}>
      {q.data.collections.length ? (
        q.data.collections.map((x) => (
          <ListRow
            key={x.id}
            title={`${x.name}${x.active ? "" : " (hidden)"}`}
            sub={[`/collections/${x.slug}`, x.featured ? "Featured" : ""].filter(Boolean).join(" · ")}
            icon="layers"
            onPress={() => router.push({ pathname: "/collections/[id]", params: { id: x.id } })}
          />
        ))
      ) : (
        <View style={{ padding: space.l }}>
          <Empty text="No collections yet. Group products by vibe: anime, lofi, cars." />
        </View>
      )}
    </Screen>
  );
}
