import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useMemo, useState } from "react";
import { Alert, FlatList, Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { confirm } from "@/lib/queries";
import { inr, istToday, time } from "@/lib/format";
import { newSaleId, priceStallCart, saleLines, tally, type PendingSale, type StallCartLine } from "@/lib/stall";
import { useStallMode, type StallProduct } from "@/lib/stall-queue";
import { rupeesToPaise } from "@/shared/money";
import { defaultSelections, resolveOptions, type Selections } from "@/shared/pricing";
import { PRODUCT_TYPES, type Payment } from "@/shared/types";
import { Button, Card, Chip, Empty, Field, Gap, Icon, Loading, Notice, Row, Segmented, T, Toggle, s } from "@/ui/kit";
import { c, radius, space } from "@/ui/theme";

// Stall mode: sell at a pop-up from the phone, signal or not. Sales queue on
// the phone and sync on their own; the till count covers both.

export default function StallMode() {
  const m = useStallMode();
  const [cart, setCart] = useState<StallCartLine[]>([]);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [picking, setPicking] = useState<StallProduct | null>(null);
  const [applyOffers, setApplyOffers] = useState(true);
  const [extra, setExtra] = useState("");
  const [oneOff, setOneOff] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const products = useMemo(() => m.data?.products ?? [], [m.data]);
  const today = istToday();
  const todays = useMemo(
    () => [...m.synced.map((x) => ({ ...x, queued: false })), ...m.queue.map((x) => ({ ...x, queued: true }))].filter((x) => istToday(new Date(x.soldAt)) === today && (!m.stallId || x.stallId === m.stallId)).sort((a, b) => b.soldAt.localeCompare(a.soldAt)),
    [m.synced, m.queue, m.stallId, today],
  );
  const till = tally(todays);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => (!type || p.type === type) && (!q || p.name.toLowerCase().includes(q)));
  }, [products, query, type]);
  const types = PRODUCT_TYPES.filter((t) => products.some((p) => p.type === t.id));

  const extraPaise = (() => {
    const p = rupeesToPaise(extra);
    return p && !Number.isNaN(p) ? p : 0;
  })();
  const price = priceStallCart(cart, m.data?.offers ?? [], { applyOffers, extraDiscountPaise: extraPaise });
  const items = cart.reduce((n, l) => n + l.qty, 0);

  function addLine(p: StallProduct, selections: Selections) {
    const r = resolveOptions(p, selections);
    if (!r) return;
    const key = `${p.id}|${JSON.stringify(r.selections)}`;
    const unit = Math.max(0, p.pricePaise + r.deltaPaise);
    Haptics.selectionAsync().catch(() => undefined);
    setCart((cur) => {
      const i = cur.findIndex((l) => l.key === key);
      if (i >= 0) return cur.map((l, j) => (j === i ? { ...l, qty: l.qty + 1 } : l));
      return [...cur, { key, productId: p.id, name: p.name, type: p.type, options: r.labels, unitPricePaise: unit, qty: 1 }];
    });
  }
  const tap = (p: StallProduct) => (p.options.some((g) => g.values.length > 1) ? setPicking(p) : addLine(p, defaultSelections(p)));
  const setQty = (key: string, qty: number) => setCart((cur) => (qty <= 0 ? cur.filter((l) => l.key !== key) : cur.map((l) => (l.key === key ? { ...l, qty } : l))));

  async function pay(payment: Payment) {
    if (!cart.length) return;
    const sale: PendingSale = {
      id: newSaleId(),
      stallId: m.stallId,
      lines: saleLines(cart),
      subtotalPaise: price.subtotalPaise,
      discountPaise: price.discountPaise,
      totalPaise: price.totalPaise,
      payment,
      note: "",
      soldAt: new Date().toISOString(),
    };
    await m.addSale(sale);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    setCart([]);
    setExtra("");
    setCartOpen(false);
  }

  function removeSale(x: PendingSale & { queued: boolean }) {
    confirm("Remove this sale?", `${inr(x.totalPaise)} at ${time(x.soldAt)}. Its items go back in stock.`, "Remove", async () => {
      try {
        if (x.queued) await m.dropQueued(x.id);
        else await m.voidSynced(x.id);
      } catch (e) {
        Alert.alert("Couldn't remove it", (e as Error).message);
      }
    });
  }

  if (!m.loaded) return <Loading />;

  if (!m.data) {
    return (
      <SafeAreaView style={[s.screen, s.pad, { justifyContent: "center", gap: space.l }]} edges={["top"]}>
        <T.Display>Stall mode</T.Display>
        <T.Body>Open this once with signal before the stall. It saves your products and offers on the phone, then works with no signal at all.</T.Body>
        {m.error ? <Notice text={m.error} tone="error" /> : null}
        <Button label={m.online ? "Get products" : "Waiting for signal…"} onPress={m.sync} busy={m.syncing} disabled={!m.online} icon="download" />
      </SafeAreaView>
    );
  }

  const stallName = m.data.stalls.find((x) => x.id === m.stallId)?.name;

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <View style={{ paddingHorizontal: space.l, paddingTop: space.m, gap: space.m }}>
        <Row style={{ justifyContent: "space-between" }}>
          <T.Display style={{ fontSize: 28 }}>Stall</T.Display>
          <Row>
            <Chip label={m.online ? (m.syncing ? "Syncing…" : "Online") : "Offline"} tone={m.online ? c.lemon : c.amber} onPress={m.online ? m.sync : undefined} />
            {m.queue.length > 0 ? <Chip label={`${m.queue.length} to send`} tone={c.amber} /> : null}
          </Row>
        </Row>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.s }}>
          <Chip label="No stall" on={!m.stallId} onPress={() => m.setStallId(null)} />
          {m.data.stalls.map((st) => (
            <Chip key={st.id} label={`${st.name}${st.date === today ? " (today)" : ""}`} on={m.stallId === st.id} onPress={() => m.setStallId(st.id)} />
          ))}
        </ScrollView>
        <Card style={{ paddingVertical: space.m }}>
          <Row style={{ justifyContent: "space-between" }}>
            <View>
              <T.Mute>Today{stallName ? ` · ${stallName}` : ""}</T.Mute>
              <T.H2>{inr(till.total)}</T.H2>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <T.Mute>Cash {inr(till.cash)}</T.Mute>
              <T.Mute>UPI {inr(till.upi)}</T.Mute>
              <T.Mute>{till.count} sales</T.Mute>
            </View>
          </Row>
        </Card>
        {m.error ? <Notice text={`Sync: ${m.error}`} tone="error" /> : null}
        {m.rejected.length > 0 ? (
          <Pressable
            onPress={() =>
              Alert.alert(
                `${m.rejected.length} sale${m.rejected.length === 1 ? "" : "s"} refused`,
                m.rejected.map((x) => `${inr(x.totalPaise)} at ${time(x.soldAt)}: ${x.error}`).join("\n\n") + "\n\nAdd them again by hand if they were real.",
                [{ text: "Keep" }, { text: "Clear list", style: "destructive", onPress: m.clearRejected }],
              )
            }
          >
            <Notice text={`${m.rejected.length} sale(s) were refused by the shop. Tap to see why.`} tone="error" />
          </Pressable>
        ) : null}
        <Field label="Find" placeholder="Search products" value={query} onChangeText={setQuery} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.s }}>
          <Chip label="All" on={!type} onPress={() => setType("")} />
          {types.map((t) => (
            <Chip key={t.id} label={t.label} on={type === t.id} onPress={() => setType(t.id)} />
          ))}
          <Chip label="+ One-off item" onPress={() => setOneOff(true)} />
        </ScrollView>
      </View>

      <FlatList
        data={shown}
        numColumns={3}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: space.l, gap: space.s, paddingBottom: 220 }}
        columnWrapperStyle={{ gap: space.s }}
        ListEmptyComponent={<Empty text="No products match." />}
        ListFooterComponent={
          todays.length ? (
            <View style={{ marginTop: space.xl, gap: space.s }}>
              <T.H2>Today&apos;s sales</T.H2>
              {todays.slice(0, 40).map((x) => (
                <Pressable key={x.id} onLongPress={() => removeSale(x)} style={[s.card, { paddingVertical: space.m }]}>
                  <Row style={{ justifyContent: "space-between" }}>
                    <T.Body>
                      {time(x.soldAt)} · {x.payment.toUpperCase()} {x.queued ? "· not sent yet" : ""}
                    </T.Body>
                    <T.Num>{inr(x.totalPaise)}</T.Num>
                  </Row>
                  <T.Mute numberOfLines={1}>{x.lines.map((l) => `${l.qty}× ${l.name}`).join(", ")}</T.Mute>
                </Pressable>
              ))}
              <T.Mute style={{ fontSize: 12 }}>Long-press a sale to remove it.</T.Mute>
            </View>
          ) : undefined
        }
        renderItem={({ item: p }) => {
          const inCart = cart.filter((l) => l.productId === p.id).reduce((n, l) => n + l.qty, 0);
          return (
            <Pressable onPress={() => tap(p)} style={({ pressed }) => [{ flex: 1 / 3, backgroundColor: c.surface, borderRadius: radius.s, borderWidth: 1, borderColor: inCart ? c.lemon : c.line, overflow: "hidden" }, pressed && { opacity: 0.7 }]}>
              {p.image ? <Image source={p.image} style={{ aspectRatio: 1, backgroundColor: c.surface2 }} contentFit="cover" cachePolicy="disk" /> : <View style={{ aspectRatio: 1, backgroundColor: c.surface2, alignItems: "center", justifyContent: "center" }}><Icon name="image" color={c.mute} /></View>}
              <View style={{ padding: 6 }}>
                <T.Body numberOfLines={1} style={{ fontSize: 13 }}>
                  {p.name}
                </T.Body>
                <T.Mute style={{ fontSize: 12 }}>
                  {inr(p.pricePaise)}
                  {p.stock !== null ? ` · ${p.stock} left` : ""}
                </T.Mute>
              </View>
              {inCart ? (
                <View style={{ position: "absolute", top: 6, right: 6, backgroundColor: c.lemon, borderRadius: 12, minWidth: 24, height: 24, alignItems: "center", justifyContent: "center" }}>
                  <T.Body style={{ color: c.ink, fontWeight: "800", fontSize: 13 }}>{inCart}</T.Body>
                </View>
              ) : null}
            </Pressable>
          );
        }}
      />

      {cart.length > 0 && (
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: space.l, backgroundColor: c.ink, borderTopWidth: 1, borderTopColor: c.line, gap: space.s }}>
          <Pressable onPress={() => setCartOpen(true)}>
            <Row style={{ justifyContent: "space-between" }}>
              <T.Body>
                {items} item{items === 1 ? "" : "s"} · view cart
              </T.Body>
              <T.H2>
                {inr(price.totalPaise)}
                {price.discountPaise > 0 ? <T.Mute> (−{inr(price.discountPaise)})</T.Mute> : null}
              </T.H2>
            </Row>
          </Pressable>
          <Row>
            <Button label="Cash" icon="dollar-sign" onPress={() => pay("cash")} style={{ flex: 1 }} />
            <Button label="UPI" icon="smartphone" onPress={() => pay("upi")} style={{ flex: 1 }} />
          </Row>
        </View>
      )}

      <Modal visible={cartOpen} animationType="slide" onRequestClose={() => setCartOpen(false)}>
        <SafeAreaView style={s.screen}>
          <ScrollView contentContainerStyle={{ padding: space.l, gap: space.m, paddingBottom: 48 }}>
            <Row style={{ justifyContent: "space-between" }}>
              <T.Display style={{ fontSize: 28 }}>Cart</T.Display>
              <Button small kind="ghost" label="Close" onPress={() => setCartOpen(false)} />
            </Row>
            {cart.map((l) => (
              <Card key={l.key} style={{ gap: space.s }}>
                <Row style={{ justifyContent: "space-between" }}>
                  <View style={{ flex: 1 }}>
                    <T.Body>{l.name}</T.Body>
                    {l.options.length ? <T.Mute>{l.options.join(" · ")}</T.Mute> : null}
                    <T.Mute>{inr(l.unitPricePaise)} each</T.Mute>
                  </View>
                  <T.Num>{inr(l.unitPricePaise * l.qty)}</T.Num>
                </Row>
                <Row>
                  <Button small kind="secondary" label="−" onPress={() => setQty(l.key, l.qty - 1)} />
                  <T.H2 style={{ minWidth: 32, textAlign: "center" }}>{l.qty}</T.H2>
                  <Button small kind="secondary" label="+" onPress={() => setQty(l.key, l.qty + 1)} />
                  <View style={{ flex: 1 }} />
                  <Button small kind="danger" label="Remove" onPress={() => setQty(l.key, 0)} />
                </Row>
              </Card>
            ))}
            <Toggle label="Apply shop offers" hint={price.offerDiscountPaise > 0 ? `Saves ${inr(price.offerDiscountPaise)}` : "Buy 4 get 1 and the rest"} value={applyOffers} onChange={setApplyOffers} />
            <Field label="Extra discount (₹)" value={extra} onChangeText={setExtra} keyboardType="decimal-pad" placeholder="0" />
            <Card style={{ gap: 4 }}>
              <Row style={{ justifyContent: "space-between" }}>
                <T.Mute>Subtotal</T.Mute>
                <T.Num>{inr(price.subtotalPaise)}</T.Num>
              </Row>
              <Row style={{ justifyContent: "space-between" }}>
                <T.Mute>Discount</T.Mute>
                <T.Num>−{inr(price.discountPaise)}</T.Num>
              </Row>
              <Row style={{ justifyContent: "space-between" }}>
                <T.H2>Total</T.H2>
                <T.H2 style={{ color: c.lemon }}>{inr(price.totalPaise)}</T.H2>
              </Row>
            </Card>
            <Row>
              <Button label="Paid cash" icon="dollar-sign" onPress={() => pay("cash")} style={{ flex: 1 }} />
              <Button label="Paid UPI" icon="smartphone" onPress={() => pay("upi")} style={{ flex: 1 }} />
            </Row>
            <Button label="Clear cart" kind="danger" onPress={() => (setCart([]), setCartOpen(false))} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <OptionPicker product={picking} onClose={() => setPicking(null)} onPick={(p, sel) => (addLine(p, sel), setPicking(null))} />
      <OneOffItem visible={oneOff} onClose={() => setOneOff(false)} onAdd={(name, paise) => setCart((cur) => [...cur, { key: `other-${Date.now()}`, productId: "", name, type: "other", options: [], unitPricePaise: paise, qty: 1 }])} />
    </SafeAreaView>
  );
}

function OptionPicker({ product, onClose, onPick }: { product: StallProduct | null; onClose: () => void; onPick: (p: StallProduct, sel: Selections) => void }) {
  const [sel, setSel] = useState<Selections>({});
  const p = product;
  const r = p ? resolveOptions(p, sel) : null;
  return (
    <Modal visible={!!p} transparent animationType="fade" onRequestClose={onClose} onShow={() => {
        if (p) setSel(defaultSelections(p));
      }}>
      <Pressable style={{ flex: 1, backgroundColor: "#000a", justifyContent: "flex-end" }} onPress={onClose}>
        <Pressable style={{ backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: space.xl, gap: space.l }} onPress={() => undefined}>
          {p ? (
            <>
              <T.H2>{p.name}</T.H2>
              {p.options.map((g) => (
                <View key={g.id} style={{ gap: space.s }}>
                  <T.Mute>{g.name}</T.Mute>
                  <Segmented
                    value={sel[g.id] ?? g.values[0]?.id ?? ""}
                    options={g.values.map((v) => ({ value: v.id, label: v.priceDeltaPaise ? `${v.label} (${v.priceDeltaPaise > 0 ? "+" : "−"}${inr(Math.abs(v.priceDeltaPaise))})` : v.label }))}
                    onChange={(v) => setSel((cur) => ({ ...cur, [g.id]: v }))}
                  />
                </View>
              ))}
              <Gap h={space.s} />
              <Button label={`Add · ${inr(Math.max(0, p.pricePaise + (r?.deltaPaise ?? 0)))}`} icon="plus" onPress={() => onPick(p, sel)} />
            </>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function OneOffItem({ visible, onClose, onAdd }: { visible: boolean; onClose: () => void; onAdd: (name: string, paise: number) => void }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const paise = rupeesToPaise(amount);
  const ok = name.trim() !== "" && paise !== null && !Number.isNaN(paise) && paise > 0;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "#000a", justifyContent: "flex-end" }} onPress={onClose}>
        <Pressable style={{ backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: space.xl, gap: space.l }} onPress={() => undefined}>
          <T.H2>One-off item</T.H2>
          <T.Mute>For something not in the shop, like a custom cut. It isn&apos;t counted for offers.</T.Mute>
          <Field label="What" value={name} onChangeText={setName} placeholder="Custom cut sticker" />
          <Field label="Price (₹)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
          <Button
            label="Add to cart"
            disabled={!ok}
            onPress={() => {
              onAdd(name.trim().slice(0, 120), paise!);
              setName("");
              setAmount("");
              onClose();
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
