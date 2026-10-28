import Constants from "expo-constants";

// Where the shop lives. The login screen can point the app at another
// address (a Netlify preview, which runs on demo data) for testing.

export const DEFAULT_SHOP_URL: string = (Constants.expoConfig?.extra?.shopUrl as string | undefined) ?? "https://shop.stixnvibes.com";

/** "shop.example.com/" or "http://x" → "https://shop.example.com", or null if it isn't a web address. */
export function cleanShopUrl(input: string): string | null {
  const s = input.trim().replace(/\/+$/, "");
  if (!s) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    const local = u.hostname === "localhost" || /^(10|127|192\.168)\./.test(u.hostname);
    if (u.protocol !== "https:" && !local) return null;
    return u.origin;
  } catch {
    return null;
  }
}
