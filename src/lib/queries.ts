import { QueryClient, useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { Alert, Platform, ToastAndroid } from "react-native";
import { api, ApiError, type Done } from "./api";

// Data for screens. Reads are cached and refreshed on focus and pull to
// refresh; every change refreshes what it touched.

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (n, err) => !(err instanceof ApiError && (err.status === 401 || err.status === 404)) && n < 2,
    },
  },
});

/** GET /api/app/admin/<path>, cached under the path. */
export function useApi<T>(path: string | null, opts: { refetchInterval?: number } = {}) {
  return useQuery<T>({
    queryKey: ["api", ...(path ?? "").split("?")[0].split("/"), path],
    queryFn: () => api.get<T>(path!),
    enabled: !!path,
    refetchInterval: opts.refetchInterval,
  });
}

export function toast(message: string) {
  if (Platform.OS === "android") ToastAndroid.show(message, ToastAndroid.SHORT);
}

/**
 * A change: runs it, toasts the server's message, refreshes the listed
 * areas (first path part, like "orders"), and alerts on errors.
 */
export function useChange<V>(fn: (v: V) => Promise<Done | unknown>, refresh: string[] = [], opts: { onDone?: (r: Done, v: V) => void; quiet?: boolean } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async (r, v) => {
      const done = (r ?? { ok: true }) as Done;
      if (!opts.quiet && done.message) toast(done.message);
      await Promise.all([...refresh, "dashboard"].map((k) => qc.invalidateQueries({ queryKey: ["api", k] as QueryKey })));
      opts.onDone?.(done, v);
    },
    onError: (err) => Alert.alert("Couldn't save", (err as Error).message),
  });
}

/** Asks before something that can't be undone. */
export function confirm(title: string, message: string, action: string, run: () => void) {
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: action, style: "destructive", onPress: run },
  ]);
}
