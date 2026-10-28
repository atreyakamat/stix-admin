# SNV Admin

The Stix N Vibes admin app for Android. It runs the shop from your phone: orders, packing and India Post tracking, an offline stall till, stalls and profit, costs and the money goal, analytics and insights (best stalls per hour, restock, repeat buyers), products, offers and codes, custom requests, blog, gallery, college pages and settings.

It talks to the shop at `shop.stixnvibes.com` through the admin app API (`/api/app/admin/*`, see `docs/ADMIN_APP_API.md` in the shop repo). Sign in with an admin email and the admin password. The app keeps a 30 day token in the phone's secure storage, never the password.

Built with Expo SDK 58, React Native 0.88, expo-router and TanStack Query.

## Get the APK

Every push to `main` or an `admin-app-*` branch builds an APK on GitHub Actions for free (no EAS):

1. Open **Actions → Android APK** and pick the latest green run.
2. Download the `snv-admin-apk` artifact, unzip it and install the `.apk` on your phone (allow installs from your browser or file manager).

### Signing it with your own key (do this once)

Without a key the APK is signed with the debug key. That's fine for trying it, but Android won't let a release-signed build update it later, so set this up before you rely on the app.

```bash
keytool -genkeypair -v -keystore snv-admin.keystore -alias snvadmin \
  -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 snv-admin.keystore > keystore.b64   # macOS: base64 -i snv-admin.keystore
```

Add these as repository secrets (**Settings → Secrets and variables → Actions**):

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | contents of `keystore.b64` |
| `ANDROID_KEYSTORE_PASSWORD` | the store password |
| `ANDROID_KEY_ALIAS` | `snvadmin` |
| `ANDROID_KEY_PASSWORD` | the key password |

Keep the keystore file and passwords somewhere safe. If you lose them you can't ship updates to installed copies. Never commit the keystore.

Bump `android.versionCode` in `app.json` for each release you install over an older one.

## Develop

```bash
npm ci
npm start            # Expo dev server; open in a development build or emulator
npm run check        # lint + typecheck + tests
```

Add packages with `npx expo install <pkg>` so they match SDK 58.

### Pointing at a preview or the demo

The login screen has a "Shop address" field. Leave it empty for the live shop, or paste a Netlify preview URL (`https://deploy-preview-…--….netlify.app`). Previews without Supabase run in demo mode: sign in with `demo@stixnvibes.com` / `demo-admin`.

## How it's laid out

```
src/app/          screens (expo-router). (tabs)/ = Home, Orders, Stall, Products, More
src/lib/api.ts    token, fetch wrapper, errors (status 0 = offline)
src/lib/queries.ts  React Query hooks: useApi(path), useChange(fn, refreshKeys)
src/lib/stall*.ts offline stall till: pricing, queue in AsyncStorage, sync
src/ui/           theme + small component kit
src/shared/       copies of the shop's pricing, money, phone, shipping and types
tests/            vitest unit tests for the logic and the offline queue
```

### Stall mode offline

The Stall tab caches products and offers. Sales ring up with no signal and wait in a queue on the phone. They sync when the phone is back online (and every 30 seconds while the tab is open). Each sale has its own id, so a retry never counts a sale twice. Sales the server refuses are kept and shown so nothing is lost silently.

### Shared code

`src/shared/` is copied from the shop repo (atreyakamat/stixnvibes-nv) so prices and totals match the website to the rupee. After changing those files in the shop, re-copy them:

```bash
./scripts/sync-shared.sh ../stixnvibes-nv
```

## Not in the app (on purpose)

- **Cricut sheet maker**: needs a big screen and print layout. "More → Cricut sheets" opens it in the browser.
- **Payments setup and secrets**: stay on the server. The app never holds API keys.
