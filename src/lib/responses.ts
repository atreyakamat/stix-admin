import type { BlogPost, College, Collection, Coupon, CustomRequest, GalleryItem, Offer, Order, Product, Settings, Stall, StallSale, Stats } from "@/shared/types";

// Shapes of the shop's /api/app/admin responses (see docs/ADMIN_APP_API.md
// in stixnvibes-nv). Money is in paise.

export type Takings = { revenuePaise: number; costPaise: number; units: number; missing: string[] };
export type GoalReport = {
  online: Takings;
  stalls: Takings;
  stallCostsPaise: number;
  profitPaise: number;
  goalPaise: number;
  progress: number;
  daysLeft: number;
  perWeekPaise: number;
  missing: string[];
};
export type StallReport = Takings & { stall: Stall; sales: number; cashPaise: number; upiPaise: number; profitPaise: number };
export type Customer = {
  phone: string;
  name: string;
  orders: number;
  spentPaise: number;
  paidOrders: number;
  firstAt: string;
  lastAt: string;
  address: Order["address"] | null;
  pickups: number;
};
type Names = Record<string, string>;
type Ref = { id: string; name: string };

export type Dashboard = {
  days: number;
  stats: Stats;
  goal: GoalReport | null;
  goalStart: string;
  goalBy: string;
  warnings: string[];
  latestOrders: Order[];
  newOrders: number;
  nextStall: Stall | null;
  productNames: Names;
};
export type Analytics = {
  days: number;
  stats: Stats;
  lowStock: { id: string; name: string; stock: number; lowStockAt: number; image: string | null }[];
  productNames: Names;
  stalls: { cash: number; upi: number; total: number; count: number; profitPaise: number; topProducts: { productId: string; qty: number }[] };
};
export type OrdersRes = { orders: Order[] };
export type OrderRes = { order: Order; orderUrl: string; customerOrders: number };
export type PackingRes = { toPack: Order[]; waiting: Order[]; shipped: Order[] };
export type CustomersRes = { customers: Customer[]; total: number; repeat: number };
export type CustomerRes = { customer: Customer; orders: Order[] };
export type ProductsRes = { products: Product[]; collections: Collection[] };
export type ProductRes = { product: Product; collections: Collection[] };
export type CollectionsRes = { collections: Collection[] };
export type CollectionRes = { collection: Collection; productIds: string[] };
export type OffersRes = { offers: Offer[] };
export type CouponsRes = { coupons: (Coupon & { uses: number })[]; shopUrl: string };
export type CustomListRes = { requests: CustomRequest[] };
export type CustomRes = { request: CustomRequest; files: string[] };
export type SettingsRes = { settings: Settings; costChoices: Record<string, { key: string; label: string }[]> };
export type StallsRes = { upcoming: StallReport[]; past: StallReport[]; totals: { revenuePaise: number; profitPaise: number }; colleges: Ref[] };
export type StallRes = { report: StallReport; sales: StallSale[]; top: { productId: string; qty: number }[]; productNames: Names };
export type BlogRes = { posts: BlogPost[] };
export type PostRes = { post: BlogPost };
export type GalleryRes = { items: GalleryItem[]; stalls: (Ref & { date: string })[]; colleges: Ref[] };
export type CollegesRes = { colleges: College[] };
export type CollegeRes = { college: College };
