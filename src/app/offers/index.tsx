import { router, useNavigation } from "expo-router";
import { useLayoutEffect } from "react";
import { View } from "react-native";
import { api } from "@/lib/api";
import { day, offerSummary } from "@/lib/format";
import { confirm, useApi, useChange } from "@/lib/queries";
import type { OffersRes } from "@/lib/responses";
import { Button, Empty, ErrorView, ListRow, Loading, Screen, T } from "@/ui/kit";
import { space } from "@/ui/theme";

export default function Offers() {
  const q = useApi<OffersRes>("offers");
  const remove = useChange((id: string) => api.del(`offers/${id}`), ["offers", "stall-mode"]);
  const nav = useNavigation();
  useLayoutEffect(() => {
    nav.setOptions({ headerRight: () => <Button small kind="ghost" icon="plus" label="New" onPress={() => router.push("/offers/edit")} /> });
  }, [nav]);
  if (q.isPending) return <Loading />;
  if (q.isError) return <ErrorView error={q.error} onRetry={q.refetch} />;
  return (
    <Screen padded={false} refreshing={q.isRefetching} onRefresh={q.refetch}>
      <View style={{ padding: space.l }}>
        <T.Mute>Offers apply to online carts and, when switched on, in stall mode.</T.Mute>
      </View>
      {q.data.offers.length ? (
        q.data.offers.map((o) => (
          <ListRow
            key={o.id}
            title={`${o.name}${o.active ? "" : " (off)"}`}
            sub={[offerSummary(o), o.startsAt ? `from ${day(o.startsAt)}` : "", o.endsAt ? `until ${day(o.endsAt)}` : ""].filter(Boolean).join(" · ")}
            icon={o.active ? "check-circle" : "circle"}
            onPress={() => router.push({ pathname: "/offers/edit", params: { id: o.id } })}
            right={<Button small kind="ghost" label="" icon="trash-2" onPress={() => confirm("Delete this offer?", o.name, "Delete", () => remove.mutate(o.id))} />}
          />
        ))
      ) : (
        <View style={{ padding: space.l }}>
          <Empty text="No offers yet." />
        </View>
      )}
    </Screen>
  );
}
