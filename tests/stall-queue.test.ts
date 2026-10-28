import { beforeEach, describe, expect, it, vi } from "vitest";
import { memory } from "./fakes/async-storage";

// The offline queue: what's sent, what's kept, and nothing lost.

const post = vi.fn();
vi.mock("@/lib/api", () => ({
  api: { post: (...a: unknown[]) => post(...a), get: vi.fn(), del: vi.fn() },
  ApiError: class extends Error {},
}));

const { stallStore } = await import("@/lib/stall-queue");
const sale = (id: string, soldAt = new Date().toISOString()) => ({
  id,
  stallId: null,
  lines: [{ productId: "p1", name: "Cat", type: "sticker" as const, options: [], qty: 1, unitPricePaise: 1000, lineTotalPaise: 1000 }],
  subtotalPaise: 1000,
  discountPaise: 0,
  totalPaise: 1000,
  payment: "cash" as const,
  note: "",
  soldAt,
});

beforeEach(() => {
  memory.clear();
  post.mockReset();
});

describe("stall queue", () => {
  it("keeps sales when there's no signal", async () => {
    await stallStore.add(sale("s-aaaaaaaa"));
    post.mockRejectedValueOnce(new Error("offline"));
    await expect(stallStore.sync()).rejects.toThrow("offline");
    expect(await stallStore.queue()).toHaveLength(1);
  });

  it("removes sent sales, keeps retryable ones, and sets aside refused ones", async () => {
    await stallStore.add(sale("s-sent-0001"));
    await stallStore.add(sale("s-retry-001"));
    await stallStore.add(sale("s-refused-1"));
    post.mockResolvedValueOnce({
      results: [
        { id: "s-sent-0001", ok: true, created: true },
        { id: "s-retry-001", ok: false, error: "Couldn't save", retry: true },
        { id: "s-refused-1", ok: false, error: "The sale time is in the future.", retry: false },
      ],
    });
    expect(await stallStore.sync()).toEqual({ sent: 1, left: 1 });
    expect((await stallStore.queue()).map((s) => s.id)).toEqual(["s-retry-001"]);
    expect((await stallStore.rejected())[0]).toMatchObject({ id: "s-refused-1", error: "The sale time is in the future." });
    expect((await stallStore.synced()).map((s) => s.id)).toEqual(["s-sent-0001"]);
  });

  it("doesn't drop a sale rung up while a sync is in flight", async () => {
    await stallStore.add(sale("s-first-001"));
    let release!: (v: unknown) => void;
    post.mockReturnValueOnce(new Promise((r) => (release = r)));
    const syncing = stallStore.sync();
    const adding = stallStore.add(sale("s-second-01"));
    release({ results: [{ id: "s-first-001", ok: true, created: true }] });
    await Promise.all([syncing, adding]);
    expect((await stallStore.queue()).map((s) => s.id)).toEqual(["s-second-01"]);
  });

  it("sends at most 200 at a time", async () => {
    for (let i = 0; i < 205; i++) await stallStore.add(sale(`s-bulk-${String(i).padStart(4, "0")}`));
    post.mockImplementationOnce(async (_path: string, body: { sales: { id: string }[] }) => ({ results: body.sales.map((s) => ({ id: s.id, ok: true, created: true })) }));
    expect(await stallStore.sync()).toEqual({ sent: 200, left: 5 });
    expect(post.mock.calls[0][1].sales).toHaveLength(200);
  });
});
