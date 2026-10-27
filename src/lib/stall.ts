import { randomUUID } from "expo-crypto";
import { totals, type PricedLine } from "@/shared/pricing";
import type { Offer, ProductType, StallSale, StallSaleLine } from "@/shared/types";

// Stall mode on the phone. Prices the cart exactly as the shop's stall
// screen does (src/lib/stall.ts in stixnvibes-nv), so a sale synced from
// the app passes the server's checks.

export const MAX_SALES_PER_SYNC = 200;

/** One thing in the stall cart. productId "" = a one-off item typed in. */
export type StallCartLine = {
  key: string;
  productId: string;
  name: string;
  type: ProductType | "other";
  options: string[];
  unitPricePaise: number;
  qty: number;
};

/** A sale made on the phone, before the server stores it. */
export type PendingSale = Omit<StallSale, "createdAt">;

/**
 * The shop's offers (buy 4 get 1 and the rest) when applyOffers is on, then
 * a discount typed at the stall. One-off items aren't counted for offers.
 */
export function priceStallCart(lines: StallCartLine[], offers: Offer[], opts: { applyOffers: boolean; extraDiscountPaise: number }) {
  const priced: PricedLine[] = lines.filter((l) => l.type !== "other").map((l) => ({ type: l.type as ProductType, unitPricePaise: l.unitPricePaise, qty: l.qty }));
  const subtotalPaise = lines.reduce((n, l) => n + l.unitPricePaise * l.qty, 0);
  const offerDiscount = opts.applyOffers ? totals(priced, offers).discountPaise : 0;
  const discountPaise = Math.min(subtotalPaise, offerDiscount + Math.max(0, Math.round(opts.extraDiscountPaise)));
  return { subtotalPaise, discountPaise, totalPaise: subtotalPaise - discountPaise, offerDiscountPaise: offerDiscount };
}

export function saleLines(lines: StallCartLine[]): StallSaleLine[] {
  return lines.map((l) => ({
    productId: l.productId,
    name: l.name,
    type: l.type,
    options: l.options,
    qty: l.qty,
    unitPricePaise: l.unitPricePaise,
    lineTotalPaise: l.unitPricePaise * l.qty,
  }));
}

/** A random id for a new sale. The server stores each id once. */
export const newSaleId = () => `s-${randomUUID()}`;

/** Sales total per payment kind. */
export function tally(sales: Pick<StallSale, "payment" | "totalPaise">[]) {
  const cash = sales.filter((x) => x.payment === "cash").reduce((n, x) => n + x.totalPaise, 0);
  const upi = sales.filter((x) => x.payment === "upi").reduce((n, x) => n + x.totalPaise, 0);
  return { cash, upi, total: cash + upi, count: sales.length };
}
