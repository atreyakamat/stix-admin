import { router, useNavigation } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useLayoutEffect } from "react";
import { Alert, View } from "react-native";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { copy, shareText } from "@/lib/contact";
import { codeLink, day, inr } from "@/lib/format";
import { confirm, useApi, useChange } from "@/lib/queries";
import type { CouponsRes } from "@/lib/responses";
import { Button, Empty, ErrorView, ListRow, Loading, Screen, T } from "@/ui/kit";
import { space } from "@/ui/theme";

export default function Coupons() {
  const { session } = useAuth();
  const q = useApi<CouponsRes>("coupons");
  const remove = useChange((code: string) => api.del(`coupons/${code}`), ["coupons"]);
  const nav = useNavigation();
  useLayoutEffect(() => {
    nav.setOptions({ headerRight: () => <Button small kind="ghost" icon="plus" label="New" onPress={() => router.push("/coupons/edit")} /> });
  }, [nav]);
  if (q.isPending) return <Loading />;
  if (q.isError) return <ErrorView error={q.error} onRetry={q.refetch} />;

  function actions(c: CouponsRes["coupons"][number]) {
    const link = codeLink(q.data!.shopUrl, c);
    Alert.alert(c.code, c.description || undefined, [
      { text: "Edit", onPress: () => router.push({ pathname: "/coupons/edit", params: { code: c.code } }) },
      { text: "Copy link", onPress: () => copy(link, "Link copied") },
      { text: "Share", onPress: () => shareText(`Use code ${c.code} at Stix N Vibes: ${link}`) },
      { text: "Print QR card (web)", onPress: () => WebBrowser.openBrowserAsync(`${session!.baseUrl}/admin/coupons/card?code=${encodeURIComponent(c.code)}`) },
      { text: "Delete", style: "destructive", onPress: () => confirm(`Delete ${c.code}?`, "Orders that used it keep it.", "Delete", () => remove.mutate(c.code)) },
    ]);
  }

  return (
    <Screen padded={false} refreshing={q.isRefetching} onRefresh={q.refetch}>
      <View style={{ padding: space.l }}>
        <T.Mute>Codes customers type at checkout, or get from a stall QR.</T.Mute>
      </View>
      {q.data.coupons.length ? (
        q.data.coupons.map((c) => (
          <ListRow
            key={c.code}
            title={`${c.code}${c.active ? "" : " (off)"}`}
            sub={[
              c.percent ? `${c.percent}% off` : `${inr(c.amountPaise ?? 0)} off`,
              c.minOrderPaise ? `min ${inr(c.minOrderPaise)}` : "",
              `${c.uses}${c.maxUses ? `/${c.maxUses}` : ""} used`,
              c.source,
              c.endsAt ? `until ${day(c.endsAt)}` : "",
            ]
              .filter(Boolean)
              .join(" · ")}
            icon="tag"
            onPress={() => actions(c)}
          />
        ))
      ) : (
        <View style={{ padding: space.l }}>
          <Empty text="No codes yet." />
        </View>
      )}
    </Screen>
  );
}
