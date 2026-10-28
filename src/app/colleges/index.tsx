import { router, useNavigation } from "expo-router";
import { useLayoutEffect } from "react";
import { View } from "react-native";
import { useApi } from "@/lib/queries";
import type { CollegesRes } from "@/lib/responses";
import { Button, Empty, ErrorView, ListRow, Loading, Screen } from "@/ui/kit";
import { space } from "@/ui/theme";

export default function Colleges() {
  const q = useApi<CollegesRes>("colleges");
  const nav = useNavigation();
  useLayoutEffect(() => {
    nav.setOptions({ headerRight: () => <Button small kind="ghost" icon="plus" label="New" onPress={() => router.push({ pathname: "/colleges/[id]", params: { id: "new" } })} /> });
  }, [nav]);
  if (q.isPending) return <Loading />;
  if (q.isError) return <ErrorView error={q.error} onRetry={q.refetch} />;
  return (
    <Screen padded={false} refreshing={q.isRefetching} onRefresh={q.refetch}>
      {q.data.colleges.length ? (
        q.data.colleges.map((x) => (
          <ListRow
            key={x.id}
            title={`${x.name}${x.active ? "" : " (hidden)"}`}
            sub={[`/c/${x.slug}`, x.area, x.couponCode ? `code ${x.couponCode}` : "", `${x.productIds.length} picks`].filter(Boolean).join(" · ")}
            icon="book-open"
            onPress={() => router.push({ pathname: "/colleges/[id]", params: { id: x.id } })}
          />
        ))
      ) : (
        <View style={{ padding: space.l }}>
          <Empty text="No college pages yet. Make one before a college stall and print its QR." />
        </View>
      )}
    </Screen>
  );
}
