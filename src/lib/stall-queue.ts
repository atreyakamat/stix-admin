import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNetworkState } from "expo-network";
import type { Offer, OptionGroup, ProductType } from "@/shared/types";
import { api, ApiError } from "./api";
import { MAX_SALES_PER_SYNC, type PendingSale } from "./stall";

// Stall mode works with no signal. What it needs to sell (products, offers,
// stalls) is saved on the phone whenever it's online, and every sale goes
// into a queue that is sent when the signal comes back. Sales carry an id
// made on the phone, so sending one twice still stores it once.

export type StallProduct = {
  id: string;
  name: string;
  type: ProductType;
  image: string | null;
  pricePaise: number;
  options: OptionGroup[];
  stock: number | null;
  hidden: boolean;
};
export type StallData = {
  products: StallProduct[];
  offers: Offer[];
  stalls: { id: string; name: string; date: string }[];
  today: string;
  fetchedAt: string;
};
/** A sale the server refused for good (a bad clock, say). Kept so nothing is lost silently. */
export type RejectedSale = PendingSale & { error: string };

const KEYS = {
  data: "snv.stall.data",
  queue: "snv.stall.queue",
  rejected: "snv.stall.rejected",
  synced: "snv.stall.synced",
  stallId: "snv.stall.stallId",
};

async function read<T>(key: string, fallback: T): Promise<T> {
  try {
    const v = await AsyncStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
const write = (key: string, value: unknown) => AsyncStorage.setItem(key, JSON.stringify(value));

// One writer at a time, so a sale rung up mid-sync is never dropped.
let chain: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const next = chain.then(fn, fn);
  chain = next.catch(() => undefined);
  return next;
}

export const stallStore = {
  data: () => read<StallData | null>(KEYS.data, null),
  queue: () => read<PendingSale[]>(KEYS.queue, []),
  rejected: () => read<RejectedSale[]>(KEYS.rejected, []),
  /** Sales already on the server, kept for today's till count. */
  synced: () => read<PendingSale[]>(KEYS.synced, []),
  stallId: () => read<string | null>(KEYS.stallId, null),
  setStallId: (id: string | null) => write(KEYS.stallId, id),

  async refreshData(): Promise<StallData> {
    const data = await api.get<StallData>("stall-mode");
    await write(KEYS.data, data);
    return data;
  },

  add: (sale: PendingSale) =>
    serial(async () => {
      const q = await stallStore.queue();
      await write(KEYS.queue, [...q, sale]);
    }),

  /** Removes a queued sale that never reached the server (rung up by mistake). */
  dropQueued: (id: string) =>
    serial(async () => {
      await write(KEYS.queue, (await stallStore.queue()).filter((s) => s.id !== id));
    }),

  clearRejected: () => write(KEYS.rejected, []),

  /** Sends the queue. Returns how many were stored and what's left. */
  sync: () =>
    serial(async () => {
      const queue = await stallStore.queue();
      if (!queue.length) return { sent: 0, left: 0 };
      const batch = queue.slice(0, MAX_SALES_PER_SYNC);
      const { results } = await api.post<{ results: ({ id: string; ok: true; created: boolean } | { id: string; ok: false; error: string; retry: boolean })[] }>(
        "stall-sales",
        { sales: batch },
      );
      const done = new Set<string>();
      const rejected: RejectedSale[] = [];
      for (const r of results) {
        if (r.ok) done.add(r.id);
        else if (!r.retry) {
          done.add(r.id);
          const sale = batch.find((s) => s.id === r.id);
          if (sale) rejected.push({ ...sale, error: r.error });
        }
      }
      const left = (await stallStore.queue()).filter((s) => !done.has(s.id));
      await write(KEYS.queue, left);
      if (rejected.length) await write(KEYS.rejected, [...(await stallStore.rejected()), ...rejected]);
      // Keep two days of synced sales for the till count.
      const cutoff = Date.now() - 2 * 86_400_000;
      const synced = [...(await stallStore.synced()), ...batch.filter((s) => done.has(s.id) && !rejected.some((x) => x.id === s.id))].filter(
        (s) => Date.parse(s.soldAt) > cutoff,
      );
      await write(KEYS.synced, synced);
      return { sent: done.size - rejected.length, left: left.length };
    }),

  /** Forgets a synced sale after it was voided on the server. */
  forgetSynced: (id: string) =>
    serial(async () => {
      await write(KEYS.synced, (await stallStore.synced()).filter((s) => s.id !== id));
    }),
};

/**
 * Stall mode state for a screen: the saved catalogue, the queue, and a sync
 * that runs on its own whenever the phone is online.
 */
export function useStallMode() {
  const net = useNetworkState();
  const online = net.isConnected === true && net.isInternetReachable !== false;
  const [data, setData] = useState<StallData | null>(null);
  const [queue, setQueue] = useState<PendingSale[]>([]);
  const [synced, setSynced] = useState<PendingSale[]>([]);
  const [rejected, setRejected] = useState<RejectedSale[]>([]);
  const [stallId, setStallIdState] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const busy = useRef(false);

  const reload = useCallback(async () => {
    const [d, q, s, r, id] = await Promise.all([stallStore.data(), stallStore.queue(), stallStore.synced(), stallStore.rejected(), stallStore.stallId()]);
    setData(d);
    setQueue(q);
    setSynced(s);
    setRejected(r);
    setStallIdState(id);
    setLoaded(true);
  }, []);

  const sync = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setSyncing(true);
    try {
      await stallStore.sync();
      setError(null);
      try {
        setData(await stallStore.refreshData());
      } catch {
        // Catalogue refresh can wait; the sales went through.
      }
    } catch (e) {
      setError(e instanceof ApiError && e.offline ? null : (e as Error).message);
    } finally {
      busy.current = false;
      setSyncing(false);
      await reload();
    }
  }, [reload]);

  useEffect(() => {
    // Reads the phone's storage (an outside system); state is set after the read.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  // Sync when the signal comes back, and every 30 s while there's something to send.
  useEffect(() => {
    if (!online) return;
    // Talks to the shop when the network comes back: the effect's whole job.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    sync();
    const t = setInterval(() => {
      stallStore.queue().then((q) => {
        if (q.length) sync();
      });
    }, 30_000);
    return () => clearInterval(t);
  }, [online, sync]);

  return {
    online,
    loaded,
    data,
    queue,
    synced,
    rejected,
    stallId,
    syncing,
    error,
    sync,
    async addSale(sale: PendingSale) {
      await stallStore.add(sale);
      await reload();
      if (online) sync();
    },
    async dropQueued(id: string) {
      await stallStore.dropQueued(id);
      await reload();
    },
    async voidSynced(id: string) {
      await api.del(`stall-sales/${encodeURIComponent(id)}`);
      await stallStore.forgetSynced(id);
      await reload();
    },
    async clearRejected() {
      await stallStore.clearRejected();
      await reload();
    },
    async setStallId(id: string | null) {
      await stallStore.setStallId(id);
      setStallIdState(id);
    },
  };
}
