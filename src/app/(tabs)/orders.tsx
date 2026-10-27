import { useState } from "react";
import { FlatList, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { OrderRow } from "@/components/order-row";
import { STATUS_LABEL } from "@/lib/format";
import { useApi } from "@/lib/queries";
import type { OrdersRes } from "@/lib/responses";
import { ORDER_STATUSES, type OrderStatus } from "@/shared/types";
import { Empty, ErrorView, Field, Loading, Segmented, s } from "@/ui/kit";
import { c, space } from "@/ui/theme";

export default function Orders() {
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const query = useApi<OrdersRes>(`orders?status=${status}&q=${encodeURIComponent(search)}`);

  return (
    <SafeAreaView style={s.screen} edges={[]}>
      <View style={{ padding: space.l, gap: space.m }}>
        <Field
          label="Search"
          placeholder="Order number, name or phone"
          value={q}
          onChangeText={setQ}
          onSubmitEditing={() => setSearch(q.trim())}
          onEndEditing={() => setSearch(q.trim())}
          returnKeyType="search"
          autoCapitalize="none"
        />
        <Segmented value={status} options={[{ value: "" as const, label: "All" }, ...ORDER_STATUSES.map((x) => ({ value: x, label: STATUS_LABEL[x] }))]} onChange={setStatus} />
      </View>
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <ErrorView error={query.error} onRetry={query.refetch} />
      ) : (
        <FlatList
          data={query.data.orders}
          keyExtractor={(o) => o.number}
          renderItem={({ item }) => <OrderRow o={item} />}
          refreshing={query.isRefetching}
          onRefresh={query.refetch}
          ListEmptyComponent={<View style={{ padding: space.l }}><Empty text={search || status ? "No orders match." : "No orders yet."} /></View>}
          contentContainerStyle={{ paddingBottom: 48 }}
          style={{ backgroundColor: c.ink }}
        />
      )}
    </SafeAreaView>
  );
}
