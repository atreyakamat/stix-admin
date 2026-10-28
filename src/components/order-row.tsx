import { router } from "expo-router";
import { View } from "react-native";
import { inr, STATUS_COLOR, STATUS_LABEL, when } from "@/lib/format";
import type { Order } from "@/shared/types";
import { Chip, ListRow } from "@/ui/kit";

export function StatusChip({ status }: { status: Order["status"] }) {
  return <Chip label={STATUS_LABEL[status]} tone={STATUS_COLOR[status]} />;
}

export function OrderRow({ o }: { o: Order }) {
  const items = o.lines.reduce((n, l) => n + l.qty, 0);
  return (
    <ListRow
      title={`${o.customerName || "No name"} · ${inr(o.totalPaise)}`}
      sub={`${o.number} · ${items} item${items === 1 ? "" : "s"} · ${o.fulfilment === "pickup" ? "Pickup" : "Delivery"} · ${when(o.createdAt)}`}
      right={
        <View>
          <StatusChip status={o.status} />
        </View>
      }
      onPress={() => router.push({ pathname: "/order/[number]", params: { number: o.number } })}
    />
  );
}
