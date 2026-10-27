import { Image } from "expo-image";
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useApi } from "@/lib/queries";
import type { ProductsRes } from "@/lib/responses";
import { Field, Icon, Loading, T } from "@/ui/kit";
import { c, space } from "@/ui/theme";

/** Search and tick products. Picked ones stay at the top. */
export function ProductPicker({ value, onChange, max }: { value: string[]; onChange: (ids: string[]) => void; max?: number }) {
  const q = useApi<ProductsRes>("products");
  const [query, setQuery] = useState("");
  const list = useMemo(() => {
    const t = query.trim().toLowerCase();
    const all = q.data?.products ?? [];
    const picked = value.map((id) => all.find((p) => p.id === id)).filter((p) => !!p);
    const rest = all.filter((p) => !value.includes(p.id) && (!t || p.name.toLowerCase().includes(t))).slice(0, t ? 40 : 15);
    return [...picked, ...rest];
  }, [q.data, query, value]);
  if (q.isPending) return <Loading />;
  return (
    <View style={{ gap: space.s }}>
      <Field label={`Products (${value.length}${max ? ` of ${max}` : ""})`} placeholder="Search to add" value={query} onChangeText={setQuery} />
      {list.map((p) => {
        const on = value.includes(p.id);
        return (
          <Pressable
            key={p.id}
            onPress={() => onChange(on ? value.filter((x) => x !== p.id) : max && value.length >= max ? value : [...value, p.id])}
            style={{ flexDirection: "row", alignItems: "center", gap: space.m, paddingVertical: 6 }}
          >
            <Icon name={on ? "check-square" : "square"} color={on ? c.lemon : c.mute} />
            {p.images[0] ? <Image source={p.images[0]} style={{ width: 36, height: 36, borderRadius: 6 }} /> : null}
            <T.Body style={{ flex: 1 }} numberOfLines={1}>
              {p.name}
            </T.Body>
          </Pressable>
        );
      })}
    </View>
  );
}
