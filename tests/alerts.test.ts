import { describe, expect, it } from "vitest";
import { alertNotes } from "@/lib/alert-text";

const order = (n: number, name: string, totalPaise: number) => ({ number: `SNV-AAAA0${n}`, customerName: name, totalPaise, createdAt: "" });

describe("order alerts", () => {
  it("says nothing when nothing came in", () => {
    expect(alertNotes({ orders: [], custom: [], reviews: [] })).toEqual([]);
  });

  it("opens the order for one, the list for several", () => {
    expect(alertNotes({ orders: [order(1, "Riya", 24900)], custom: [], reviews: [] })).toEqual([{ title: "New order · ₹249", body: "Riya · SNV-AAAA01", url: "/order/SNV-AAAA01" }]);
    const [many] = alertNotes({ orders: [order(1, "Riya", 10000), order(2, "Kunal", 5000), order(3, "Asha", 5000)], custom: [], reviews: [] });
    expect(many).toEqual({ title: "3 new orders · ₹200", body: "Riya, Kunal and 1 more", url: "/orders" });
  });

  it("pings once each for custom requests and reviews", () => {
    const notes = alertNotes({
      orders: [],
      custom: [{ number: "CUS-ABC123", customerName: "Neel", createdAt: "" }],
      reviews: [
        { id: "a", name: "Asha", rating: 5, productName: "Lo-fi 04", createdAt: "" },
        { id: "b", name: "Dev", rating: 4, productName: "Lo-fi 02", createdAt: "" },
      ],
    });
    expect(notes.map((n) => n.url)).toEqual(["/custom/CUS-ABC123", "/reviews"]);
    expect(notes[1]).toMatchObject({ title: "2 new reviews to check", body: "Asha and Dev" });
  });
});
