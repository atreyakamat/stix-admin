import { formatINR } from "@/shared/money";
import { typeLabel, type Coupon, type CustomStatus, type Offer, type Order, type OrderStatus } from "@/shared/types";
import { c } from "@/ui/theme";

export { formatINR as inr };

const IST = "Asia/Kolkata";
const dayFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: IST });
const dayYearFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: IST });
const timeFmt = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: IST });
const weekdayFmt = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/** "27 Oct, 5:12 pm" (India time). */
export const when = (iso: string) => `${dayFmt.format(new Date(iso))}, ${timeFmt.format(new Date(iso))}`;
export const day = (iso: string) => dayYearFmt.format(new Date(iso));
export const time = (iso: string) => timeFmt.format(new Date(iso));
/** A YYYY-MM-DD date as "Sun, 2 Nov". */
export const ymd = (d: string) => weekdayFmt.format(new Date(`${d}T00:00:00Z`));

/** Today in India, YYYY-MM-DD. */
export const istToday = (now = new Date()) => new Date(now.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10);

export const STATUS_LABEL: Record<OrderStatus, string> = {
  new: "New",
  confirmed: "Confirmed",
  paid: "Paid",
  shipped: "Shipped",
  done: "Done",
  cancelled: "Cancelled",
};
export const STATUS_COLOR: Record<OrderStatus, string> = {
  new: c.amber,
  confirmed: c.sky,
  paid: c.lemon,
  shipped: "#a9d6ff",
  done: "#cfcfc7",
  cancelled: c.coralSoft,
};

/** The usual next step for an order, for a one-tap button. */
export function nextStatus(o: Pick<Order, "status" | "fulfilment">): { to: OrderStatus; label: string } | null {
  switch (o.status) {
    case "new":
      return { to: "confirmed", label: "Confirm" };
    case "confirmed":
      return { to: "paid", label: "Mark paid" };
    case "paid":
      return o.fulfilment === "pickup" ? { to: "done", label: "Handed over" } : { to: "shipped", label: "Mark shipped" };
    case "shipped":
      return { to: "done", label: "Delivered" };
    default:
      return null;
  }
}

export const CUSTOM_LABEL: Record<CustomStatus, string> = { new: "New", quoted: "Quoted", won: "Won", lost: "Lost" };

export const pct = (n: number, of: number) => (of > 0 ? `${((n / of) * 100).toFixed(n / of < 0.1 ? 1 : 0)}%` : "–");

/** Paise as a plain rupee amount for a text field ("149.50"), "" for null. */
export const rupeesField = (paise: number | null | undefined) => (paise == null ? "" : (paise / 100).toFixed(paise % 100 === 0 ? 0 : 2));

/** "Repeat" from the second order, "Regular" from the fourth. */
export const customerTag = (orders: number) => (orders >= 4 ? "Regular" : orders >= 2 ? "Repeat" : "New");

/**
 * A date (and optional time) typed on the phone, as the shop's
 * "YYYY-MM-DDTHH:mm" India-time format. A bare date means the start of the
 * day, or its last minute when it's an end date.
 */
export function istField(v: string, end = false): string {
  const s = v.trim().replace(" ", "T");
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T${end ? "23:59" : "00:00"}`;
  return s;
}

export function offerSummary(o: Offer) {
  const what = o.productType ? typeLabel(o.productType).toLowerCase() : "anything";
  if (o.kind === "bxgy") return `Buy ${o.buy} ${what}, get ${o.free} free`;
  if (o.kind === "volume") return `${formatINR(o.pricePaise ?? 0)} each from ${o.buy} ${what}`;
  return `${o.percent}% off ${what}`;
}

/** The link a stall QR opens, same as the shop's qrLink(). */
export const codeLink = (shopUrl: string, c: Pick<Coupon, "code" | "source">) => `${shopUrl}/?${new URLSearchParams({ src: c.source || `qr-${c.code.toLowerCase()}`, code: c.code })}`;
