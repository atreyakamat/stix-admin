import { Tabs } from "expo-router/js-tabs";
import type { ColorValue } from "react-native";
import { useApi } from "@/lib/queries";
import { Icon, type IconName } from "@/ui/kit";
import { c, font } from "@/ui/theme";

const tab = (title: string, icon: IconName) => ({
  title,
  tabBarIcon: ({ color }: { color: ColorValue }) => <Icon name={icon} color={String(color)} size={22} />,
});

export default function TabsLayout() {
  // New orders badge on the Orders tab, refreshed every minute.
  const { data } = useApi<{ orders: unknown[] }>("orders?status=new", { refetchInterval: 60_000 });
  const newOrders = data?.orders.length ?? 0;
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: c.ink },
        headerTintColor: c.paper,
        headerTitleStyle: { fontFamily: font.bold },
        headerShadowVisible: false,
        tabBarStyle: { backgroundColor: c.ink, borderTopColor: c.line, height: 64, paddingBottom: 8, paddingTop: 6 },
        tabBarActiveTintColor: c.lemon,
        tabBarInactiveTintColor: c.mute,
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
        sceneStyle: { backgroundColor: c.ink },
      }}
    >
      <Tabs.Screen name="index" options={{ ...tab("Home", "home"), headerShown: false }} />
      <Tabs.Screen name="orders" options={{ ...tab("Orders", "shopping-bag"), tabBarBadge: newOrders > 0 ? newOrders : undefined, tabBarBadgeStyle: { backgroundColor: c.amber, color: c.ink } }} />
      <Tabs.Screen name="stall" options={{ ...tab("Stall", "zap"), headerShown: false }} />
      <Tabs.Screen name="products" options={tab("Products", "package")} />
      <Tabs.Screen name="more" options={tab("More", "grid")} />
    </Tabs>
  );
}
