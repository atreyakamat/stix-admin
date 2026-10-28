import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests for the app's pure logic and the offline stall queue. Native
// modules are swapped for small fakes in tests/fakes.
const fake = (name: string) => fileURLToPath(new URL(`./tests/fakes/${name}.ts`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "expo-crypto": fake("expo-crypto"),
      "expo-constants": fake("expo-constants"),
      "expo-secure-store": fake("expo-secure-store"),
      "expo-network": fake("expo-network"),
      "@react-native-async-storage/async-storage": fake("async-storage"),
    },
  },
  test: { include: ["tests/**/*.test.ts"], environment: "node" },
});
