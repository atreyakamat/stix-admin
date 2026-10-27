import { router, useNavigation } from "expo-router";
import { useLayoutEffect } from "react";
import { View } from "react-native";
import { day } from "@/lib/format";
import { useApi } from "@/lib/queries";
import type { BlogRes } from "@/lib/responses";
import { Button, Empty, ErrorView, ListRow, Loading, Screen } from "@/ui/kit";
import { space } from "@/ui/theme";

export default function Blog() {
  const q = useApi<BlogRes>("blog");
  const nav = useNavigation();
  useLayoutEffect(() => {
    nav.setOptions({ headerRight: () => <Button small kind="ghost" icon="plus" label="New" onPress={() => router.push({ pathname: "/blog/[id]", params: { id: "new" } })} /> });
  }, [nav]);
  if (q.isPending) return <Loading />;
  if (q.isError) return <ErrorView error={q.error} onRetry={q.refetch} />;
  return (
    <Screen padded={false} refreshing={q.isRefetching} onRefresh={q.refetch}>
      {q.data.posts.length ? (
        q.data.posts.map((p) => (
          <ListRow
            key={p.id}
            title={p.title}
            sub={p.status === "published" ? `Live${p.publishedAt ? ` since ${day(p.publishedAt)}` : ""}` : "Draft"}
            icon={p.status === "published" ? "globe" : "edit-3"}
            onPress={() => router.push({ pathname: "/blog/[id]", params: { id: p.id } })}
          />
        ))
      ) : (
        <View style={{ padding: space.l }}>
          <Empty text="No posts yet. Stall recaps make great first posts." />
        </View>
      )}
    </Screen>
  );
}
