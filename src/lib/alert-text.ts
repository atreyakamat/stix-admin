import { inr } from "./format";
import type { AlertsRes } from "./responses";

export type AlertNote = { title: string; body: string; url: string };

const list = (names: string[]) => (names.length <= 2 ? names.join(" and ") : `${names.slice(0, 2).join(", ")} and ${names.length - 2} more`);

/** One notification per kind of news, so three new orders ping once. */
export function alertNotes(a: Pick<AlertsRes, "orders" | "custom" | "reviews">): AlertNote[] {
  const out: AlertNote[] = [];
  if (a.orders.length === 1) {
    const o = a.orders[0];
    out.push({ title: `New order · ${inr(o.totalPaise)}`, body: `${o.customerName} · ${o.number}`, url: `/order/${o.number}` });
  } else if (a.orders.length > 1) {
    const total = a.orders.reduce((n, o) => n + o.totalPaise, 0);
    out.push({ title: `${a.orders.length} new orders · ${inr(total)}`, body: list(a.orders.map((o) => o.customerName)), url: "/orders" });
  }
  if (a.custom.length) {
    out.push({
      title: a.custom.length === 1 ? "New custom request" : `${a.custom.length} new custom requests`,
      body: list(a.custom.map((r) => r.customerName)),
      url: a.custom.length === 1 ? `/custom/${a.custom[0].number}` : "/custom",
    });
  }
  if (a.reviews.length) {
    const r = a.reviews[0];
    out.push({
      title: a.reviews.length === 1 ? `New ${r.rating}★ review to check` : `${a.reviews.length} new reviews to check`,
      body: a.reviews.length === 1 ? `${r.name} on ${r.productName}` : list(a.reviews.map((x) => x.name)),
      url: "/reviews",
    });
  }
  return out;
}
