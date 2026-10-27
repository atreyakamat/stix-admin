import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth";
import { cleanShopUrl, DEFAULT_SHOP_URL } from "@/lib/config";
import { Button, Field, Gap, Notice, T, s } from "@/ui/kit";
import { c, space } from "@/ui/theme";

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shop, setShop] = useState(DEFAULT_SHOP_URL);
  const [showShop, setShowShop] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const baseUrl = cleanShopUrl(shop);
    if (!baseUrl) return setError("The shop address should look like shop.stixnvibes.com.");
    if (!email.trim() || !password) return setError("Enter your email and password.");
    setBusy(true);
    setError(null);
    try {
      await signIn(baseUrl, email.trim(), password);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={s.screen} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: space.xl, flexGrow: 1, justifyContent: "center" }} keyboardShouldPersistTaps="handled">
          <View style={{ alignSelf: "flex-start", backgroundColor: c.lemon, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, transform: [{ rotate: "-3deg" }] }}>
            <T.Body style={{ color: c.ink, fontWeight: "800", letterSpacing: 1 }}>STIX N VIBES</T.Body>
          </View>
          <Gap h={space.l} />
          <T.Display style={{ fontSize: 44 }}>Admin</T.Display>
          <T.Mute>Orders, stalls, stock and money, in your pocket.</T.Mute>
          <Gap h={space.xxl} />
          <View style={{ gap: space.l }}>
            <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="username" />
            <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" textContentType="password" onSubmitEditing={submit} returnKeyType="go" />
            {showShop ? (
              <Field label="Shop address" value={shop} onChangeText={setShop} autoCapitalize="none" keyboardType="url" hint="A Netlify preview address works too. Previews run on demo data." />
            ) : null}
            {error ? <Notice text={error} tone="error" /> : null}
            <Button label="Log in" onPress={submit} busy={busy} icon="log-in" />
            <Button label={showShop ? "Use the live shop" : "Use another shop address"} kind="ghost" small onPress={() => (showShop ? (setShop(DEFAULT_SHOP_URL), setShowShop(false)) : setShowShop(true))} />
          </View>
          <Gap h={space.xl} />
          <T.Mute style={{ fontSize: 12 }}>Same login as the web admin. You stay logged in on this phone for 30 days.</T.Mute>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
