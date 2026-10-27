import * as Clipboard from "expo-clipboard";
import { Linking, Share } from "react-native";
import { formatPhone, telNumber } from "@/shared/phone";
import type { Order } from "@/shared/types";
import { inr } from "./format";
import { toast } from "./queries";

// Reaching a customer: call, WhatsApp, Instagram DM, or copy what to paste.

export const call = (phone: string) => Linking.openURL(`tel:+${telNumber(phone)}`);
export const whatsapp = (phone: string, text = "") => Linking.openURL(`https://wa.me/${telNumber(phone)}${text ? `?text=${encodeURIComponent(text)}` : ""}`);
export const instagram = (handle: string) => Linking.openURL(`https://ig.me/m/${handle.replace(/^@/, "")}`);

export async function copy(text: string, what = "Copied") {
  await Clipboard.setStringAsync(text);
  toast(what);
}

export const addressText = (a: Order["address"]) => [a.line, a.city, `${a.state} ${a.pincode}`.trim()].filter(Boolean).join(", ");

/** The block to write on a parcel. */
export function parcelLabel(o: Order) {
  return [o.customerName, addressText(o.address), o.customerPhone ? `Ph ${formatPhone(o.customerPhone)}` : ""].filter(Boolean).join("\n");
}

export const shareText = (message: string) => Share.share({ message });

/** A short order summary to paste into a DM. */
export function orderSummary(o: Order, link: string) {
  const lines = o.lines.map((l) => `• ${l.qty} × ${l.name}${l.options.length ? ` (${l.options.join(", ")})` : ""}`).join("\n");
  return `Hi ${o.customerName.split(" ")[0] || "there"}! Your Stix N Vibes order ${o.number}:\n${lines}\nTotal ${inr(o.totalPaise)}\n${link}`;
}
