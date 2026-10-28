import { router } from "expo-router";
import { useState } from "react";
import { FlatList, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { customerTag, day, inr } from "@/lib/format";
import { useApi } from "@/lib/queries";
import type { CustomersRes } from "@/lib/responses";
import { formatPhone } from "@/shared/phone";
import { Empty, ErrorView, Field, ListRow, Loading, Segmented, T, s } from "@/ui/kit";
import { space } from "@/ui/theme";

export default function Customers() {
  const [sort, setSort] = useState<"recent" | "spent" | "orders">("recent");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const query = useApi<CustomersRes>(`customers?sort=${sort}&q=${encodeURIComponent(search)}`);
  return (
    <SafeAreaView style={s.screen} edges={[]}>
      <View style={{ padding: space.l, gap: space.m }}>
        <Field label="Search" placeholder="Name or phone" value={q} onChangeText={setQ} onSubmitEditing={() => setSearch(q.trim())} onEndEditing={() => setSearch(q.trim())} returnKeyType="search" />
        <Segmented
          value={sort}
          options={[
            { value: "recent", label: "Latest order" },
            { value: "spent", label: "Top spenders" },
            { value: "orders", label: "Most orders" },
          ]}
          onChange={setSort}
        />
        {query.data ? (
          <T.Mute>
            {query.data.total} customers · {query.data.repeat} came back ({query.data.total ? Math.round((query.data.repeat / query.data.total) * 100) : 0}%)
          </T.Mute>
        ) : null}
      </View>
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <ErrorView error={query.error} onRetry={query.refetch} />
      ) : (
        <FlatList
          data={query.data.customers}
          keyExtractor={(x) => x.phone}
          refreshing={query.isRefetching}
          onRefresh={query.refetch}
          contentContainerStyle={{ paddingBottom: 48 }}
          ListEmptyComponent={
            <View style={{ padding: space.l }}>
              <Empty text="No customers yet. They appear once someone orders with a phone number." />
            </View>
          }
          renderItem={({ item: x }) => (
            <ListRow
              title={`${x.name || formatPhone(x.phone)} · ${inr(x.spentPaise)}`}
              sub={`${customerTag(x.orders)} · ${x.orders} order${x.orders === 1 ? "" : "s"} · last ${day(x.lastAt)}`}
              onPress={() => router.push({ pathname: "/customers/[phone]", params: { phone: x.phone } })}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}
