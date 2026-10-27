import Constants from "expo-constants";
import { router, type Href } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { View } from "react-native";
import { useAuth } from "@/lib/auth";
import { confirm } from "@/lib/queries";
import { Gap, ListRow, Screen, Section, T, type IconName } from "@/ui/kit";
import { space } from "@/ui/theme";

type Item = { title: string; sub: string; icon: IconName; href?: Href; web?: string };

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: "Selling",
    items: [
      { title: "Packing", sub: "Paid orders to pack, India Post numbers", icon: "box", href: "/packing" },
      { title: "Stalls and profit", sub: "Every pop-up, its takings and costs", icon: "map-pin", href: "/stalls" },
      { title: "Customers", sub: "Who buys, how often, how much", icon: "users", href: "/customers" },
      { title: "Custom requests", sub: "Own-design orders", icon: "edit-3", href: "/custom" },
    ],
  },
  {
    title: "Numbers",
    items: [
      { title: "Analytics", sub: "Visits, funnel, sources, codes, stock", icon: "bar-chart-2", href: "/analytics" },
      { title: "Costs and goal", sub: "Unit costs and the profit goal", icon: "target", href: "/costs" },
    ],
  },
  {
    title: "Promotions",
    items: [
      { title: "Offers", sub: "Buy X get Y, bulk prices, % off", icon: "percent", href: "/offers" },
      { title: "Codes", sub: "Coupon codes and stall QR codes", icon: "tag", href: "/coupons" },
    ],
  },
  {
    title: "Shop content",
    items: [
      { title: "Collections", sub: "Groups of products", icon: "layers", href: "/collections" },
      { title: "Blog", sub: "Posts and drafts", icon: "file-text", href: "/blog" },
      { title: "Photo library", sub: "Stall and event photos", icon: "image", href: "/gallery" },
      { title: "College pages", sub: "/c/ pages with codes and picks", icon: "book-open", href: "/colleges" },
      { title: "Cricut sheets", sub: "Opens the sheet maker on the web (big screen)", icon: "scissors", web: "/admin/sheets" },
    ],
  },
  {
    title: "Shop",
    items: [
      { title: "Settings", sub: "Orders on/off, Instagram, UPI, shipping", icon: "settings", href: "/settings" },
      { title: "Open web admin", sub: "Everything, in the browser", icon: "external-link", web: "/admin" },
    ],
  },
];

export default function More() {
  const { session, signOut } = useAuth();
  return (
    <Screen padded={false}>
      {GROUPS.map((g) => (
        <View key={g.title} style={{ marginTop: space.l }}>
          <T.Mute style={{ paddingHorizontal: space.l, marginBottom: space.s }}>{g.title.toUpperCase()}</T.Mute>
          {g.items.map((it) => (
            <ListRow
              key={it.title}
              title={it.title}
              sub={it.sub}
              icon={it.icon}
              onPress={() => (it.href ? router.push(it.href) : WebBrowser.openBrowserAsync(`${session!.baseUrl}${it.web}`))}
            />
          ))}
        </View>
      ))}
      <View style={{ padding: space.l }}>
        <Section title="Account">
          <T.Mute>
            {session?.email} · {session?.baseUrl.replace(/^https?:\/\//, "")}
            {session?.mode === "demo" ? " · demo data" : ""}
          </T.Mute>
          <ListRow title="Log out" icon="log-out" onPress={() => confirm("Log out?", "Sales waiting to sync stay on the phone.", "Log out", signOut)} />
        </Section>
        <Gap />
        <T.Mute style={{ fontSize: 12 }}>SNV Admin {Constants.expoConfig?.version}</T.Mute>
      </View>
    </Screen>
  );
}
