import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { DarkTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@/lib/auth";
import { queryClient } from "@/lib/queries";
import { c, font } from "@/ui/theme";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: c.ink, card: c.ink, text: c.paper, border: c.line, primary: c.lemon },
};

function Routes() {
  const { ready, session } = useAuth();
  const [fontsLoaded] = useFonts({
    [font.display]: require("../../assets/fonts/BricolageGrotesque_800ExtraBold.ttf"),
    [font.bold]: require("../../assets/fonts/BricolageGrotesque_700Bold.ttf"),
  });
  const loaded = ready && fontsLoaded;

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => undefined);
  }, [loaded]);
  if (!loaded) return null;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: c.ink },
        headerTintColor: c.paper,
        headerTitleStyle: { fontFamily: font.bold },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: c.ink },
      }}
    >
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="order/[number]" options={{ title: "Order" }} />
        <Stack.Screen name="packing" options={{ title: "Packing" }} />
        <Stack.Screen name="analytics" options={{ title: "Analytics" }} />
        <Stack.Screen name="insights" options={{ title: "Insights" }} />
        <Stack.Screen name="customers/index" options={{ title: "Customers" }} />
        <Stack.Screen name="customers/[phone]" options={{ title: "Customer" }} />
        <Stack.Screen name="stalls/index" options={{ title: "Stalls" }} />
        <Stack.Screen name="stalls/[id]" options={{ title: "Stall" }} />
        <Stack.Screen name="stalls/edit" options={{ title: "Stall details", presentation: "modal" }} />
        <Stack.Screen name="product/[id]" options={{ title: "Product" }} />
        <Stack.Screen name="costs" options={{ title: "Costs and goal" }} />
        <Stack.Screen name="offers/index" options={{ title: "Offers" }} />
        <Stack.Screen name="offers/edit" options={{ title: "Offer", presentation: "modal" }} />
        <Stack.Screen name="coupons/index" options={{ title: "Codes" }} />
        <Stack.Screen name="coupons/edit" options={{ title: "Code", presentation: "modal" }} />
        <Stack.Screen name="custom/index" options={{ title: "Custom requests" }} />
        <Stack.Screen name="custom/[number]" options={{ title: "Custom request" }} />
        <Stack.Screen name="blog/index" options={{ title: "Blog" }} />
        <Stack.Screen name="blog/[id]" options={{ title: "Post" }} />
        <Stack.Screen name="gallery" options={{ title: "Photo library" }} />
        <Stack.Screen name="colleges/index" options={{ title: "College pages" }} />
        <Stack.Screen name="colleges/[id]" options={{ title: "College" }} />
        <Stack.Screen name="collections/index" options={{ title: "Collections" }} />
        <Stack.Screen name="collections/[id]" options={{ title: "Collection" }} />
        <Stack.Screen name="settings" options={{ title: "Shop settings" }} />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: c.ink }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ThemeProvider value={theme}>
              <StatusBar style="light" />
              <Routes />
            </ThemeProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
