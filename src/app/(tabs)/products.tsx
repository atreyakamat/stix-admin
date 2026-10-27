import { Image } from "expo-image";
import { router, useNavigation } from "expo-router";
import { useLayoutEffect, useMemo, useState } from "react";
import { Alert, FlatList, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/lib/api";
import { inr } from "@/lib/format";
import { useApi, useChange } from "@/lib/queries";
import type { ProductsRes } from "@/lib/responses";
import { PRODUCT_TYPES, type Product } from "@/shared/types";
import { Button, Empty, ErrorView, Field, Icon, ListRow, Loading, Row, Segmented, T, s } from "@/ui/kit";
import { c, space } from "@/ui/theme";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "live", label: "Live" },
  { value: "hidden", label: "Hidden" },
  { value: "upcoming", label: "Coming soon" },
  { value: "low", label: "Low stock" },
] as const;
type Filter = (typeof FILTERS)[number]["value"];

export default function Products() {
  const q = useApi<ProductsRes>("products");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [type, setType] = useState("");
  const nav = useNavigation();
  useLayoutEffect(() => {
    nav.setOptions({ headerRight: () => <Button small kind="ghost" icon="plus" label="New" onPress={() => router.push({ pathname: "/product/[id]", params: { id: "new" } })} /> });
  }, [nav]);

  const quick = useChange((v: { id: string; op: string; stock?: number | null }) => api.post(`products/${v.id}/quick`, v), ["products"]);

  const list = useMemo(() => {
    const t = query.trim().toLowerCase();
    return (q.data?.products ?? []).filter(
      (p) =>
        (!t || p.name.toLowerCase().includes(t) || p.tags.some((x) => x.toLowerCase().includes(t))) &&
        (!type || p.type === type) &&
        (filter === "all" || (filter === "low" ? p.stock !== null && p.stock <= p.lowStockAt : p.status === filter)),
    );
  }, [q.data, query, filter, type]);

  if (q.isPending) return <Loading />;
  if (q.isError) return <ErrorView error={q.error} onRetry={q.refetch} />;

  function actions(p: Product) {
    Alert.alert(p.name, undefined, [
      { text: p.status === "live" ? "Hide from shop" : "Make live", onPress: () => quick.mutate({ id: p.id, op: p.status === "live" ? "hidden" : "live" }) },
      { text: p.soldOut ? "Back in stock" : "Mark sold out", onPress: () => quick.mutate({ id: p.id, op: "soldOut" }) },
      { text: p.featured ? "Unfeature" : "Feature on home", onPress: () => quick.mutate({ id: p.id, op: "featured" }) },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  return (
    <SafeAreaView style={s.screen} edges={[]}>
      <View style={{ padding: space.l, gap: space.m }}>
        <Field label="Search" placeholder="Name or tag" value={query} onChangeText={setQuery} />
        <Segmented value={filter} options={[...FILTERS]} onChange={setFilter} />
        <Segmented value={type} options={[{ value: "", label: "All types" }, ...PRODUCT_TYPES.map((t) => ({ value: t.id as string, label: t.label }))]} onChange={setType} />
        <T.Mute>
          {list.length} of {q.data.products.length} · tap to edit, ⋮ for quick changes
        </T.Mute>
      </View>
      <FlatList
        data={list}
        keyExtractor={(p) => p.id}
        refreshing={q.isRefetching}
        onRefresh={q.refetch}
        contentContainerStyle={{ paddingBottom: 48 }}
        ListEmptyComponent={
          <View style={{ padding: space.l }}>
            <Empty text="No products match." />
          </View>
        }
        renderItem={({ item: p }) => (
          <View>
            <ListRow
              left={p.images[0] ? <Image source={p.images[0]} style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: c.surface2 }} contentFit="cover" /> : <Icon name="image" color={c.mute} />}
              title={p.name}
              sub={[
                p.pricePaise === null ? "No price" : inr(p.pricePaise),
                p.status !== "live" ? (p.status === "hidden" ? "Hidden" : "Coming soon") : "",
                p.soldOut ? "Sold out" : "",
                p.stock !== null ? `${p.stock} in stock${p.stock <= p.lowStockAt ? " (low)" : ""}` : "",
                p.featured ? "Featured" : "",
              ]
                .filter(Boolean)
                .join(" · ")}
              right={<View style={{ width: 40 }} />}
              onPress={() => router.push({ pathname: "/product/[id]", params: { id: p.id } })}
            />
            <Row style={{ position: "absolute", right: 44, top: 0, bottom: 0 }}>
              <Button small kind="ghost" label="" icon="more-vertical" onPress={() => actions(p)} />
            </Row>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
