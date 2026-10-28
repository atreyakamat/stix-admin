import { describe, expect, it } from "vitest";
import { cleanShopUrl } from "@/lib/config";
import { codeLink, istField, nextStatus, rupeesField } from "@/lib/format";
import { optionId, toSlug } from "@/lib/slug";
import { newSaleId, priceStallCart, saleLines, tally, type StallCartLine } from "@/lib/stall";
import type { Offer } from "@/shared/types";

const fourPlusOne: Offer = {
  id: "o1",
  kind: "bxgy",
  name: "Buy 4 get 1",
  description: "",
  productType: "sticker",
  buy: 4,
  free: 1,
  pricePaise: null,
  percent: null,
  startsAt: null,
  endsAt: null,
  banner: "",
  active: true,
  sortOrder: 0,
};
const sticker = (qty: number): StallCartLine => ({ key: "s", productId: "p1", name: "Cat", type: "sticker", options: [], unitPricePaise: 1000, qty });

describe("stall pricing (matches the shop's stall screen)", () => {
  it("applies buy 4 get 1 and a typed discount", () => {
    const p = priceStallCart([sticker(5)], [fourPlusOne], { applyOffers: true, extraDiscountPaise: 500 });
    expect(p).toEqual({ subtotalPaise: 5000, discountPaise: 1500, totalPaise: 3500, offerDiscountPaise: 1000 });
  });
  it("skips offers when switched off and never goes below zero", () => {
    expect(priceStallCart([sticker(5)], [fourPlusOne], { applyOffers: false, extraDiscountPaise: 0 }).totalPaise).toBe(5000);
    expect(priceStallCart([sticker(1)], [], { applyOffers: true, extraDiscountPaise: 99_999 }).totalPaise).toBe(0);
  });
  it("doesn't count one-off items for offers", () => {
    const oneOff: StallCartLine = { key: "x", productId: "", name: "Custom cut", type: "other", options: [], unitPricePaise: 1000, qty: 5 };
    expect(priceStallCart([oneOff], [{ ...fourPlusOne, productType: null }], { applyOffers: true, extraDiscountPaise: 0 }).discountPaise).toBe(0);
  });
  it("makes sale lines whose totals pass the shop's checks", () => {
    const lines = saleLines([sticker(3)]);
    expect(lines[0].lineTotalPaise).toBe(3000);
    expect(newSaleId()).toMatch(/^[a-zA-Z0-9-]{8,64}$/);
    expect(tally([{ payment: "cash", totalPaise: 100 }, { payment: "upi", totalPaise: 250 }])).toEqual({ cash: 100, upi: 250, total: 350, count: 2 });
  });
});

describe("helpers", () => {
  it("cleans the shop address", () => {
    expect(cleanShopUrl("shop.stixnvibes.com/")).toBe("https://shop.stixnvibes.com");
    expect(cleanShopUrl("https://deploy-preview-9--shopofstix.netlify.app")).toBe("https://deploy-preview-9--shopofstix.netlify.app");
    expect(cleanShopUrl("http://evil.example")).toBeNull();
    expect(cleanShopUrl("http://192.168.1.20:3000")).toBe("http://192.168.1.20:3000");
    expect(cleanShopUrl("")).toBeNull();
  });
  it("turns typed dates into the shop's India-time format", () => {
    expect(istField("2026-11-01")).toBe("2026-11-01T00:00");
    expect(istField("2026-11-15", true)).toBe("2026-11-15T23:59");
    expect(istField("2026-11-01 18:30")).toBe("2026-11-01T18:30");
    expect(istField("")).toBe("");
  });
  it("makes slugs and option ids the shop accepts", () => {
    expect(toSlug("Lofi Cat #2")).toBe("lofi-cat-2");
    expect(optionId("A3", ["a3"])).toBe("a3-2");
    expect(optionId("!!!", [])).toMatch(/^[a-z0-9-]{1,40}$/);
  });
  it("suggests the next order step", () => {
    expect(nextStatus({ status: "new", fulfilment: "delivery" })?.to).toBe("confirmed");
    expect(nextStatus({ status: "paid", fulfilment: "pickup" })?.to).toBe("done");
    expect(nextStatus({ status: "paid", fulfilment: "delivery" })?.to).toBe("shipped");
    expect(nextStatus({ status: "cancelled", fulfilment: "delivery" })).toBeNull();
  });
  it("formats money fields and code links", () => {
    expect(rupeesField(14950)).toBe("149.50");
    expect(rupeesField(null)).toBe("");
    expect(codeLink("https://shop.stixnvibes.com", { code: "WORDSUP10", source: "" })).toBe("https://shop.stixnvibes.com/?src=qr-wordsup10&code=WORDSUP10");
  });
});
