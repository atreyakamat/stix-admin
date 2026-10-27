// Copied from atreyakamat/stixnvibes-nv src/lib/shipping.ts (a62a018). Don't edit here:
// change it in the shop, then run scripts/sync-shared.sh.
// India Post shipping: every parcel goes by Speed Post or registered post,
// with a consignment number like EE123456789IN.

/** Letters and digits, 6 to 30 of them, after removing spaces and dashes. */
export const TRACKING_RE = /^[A-Z0-9]{6,30}$/;

export const cleanTracking = (v: string) => v.toUpperCase().replace(/[\s-]/g, "");

/** India Post's tracking page. It has no link format that fills the number in, so customers paste it. */
export const INDIA_POST_TRACKING_URL = "https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx";
