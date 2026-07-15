import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ShoppingBag, ShoppingCart, Search, Loader2, RefreshCw, Plus, Minus, Trash2,
  Package, Truck, CheckCircle2, IndianRupee, Tag, X, ChevronRight, Wallet,
} from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { supabase } from "@/integrations/supabase/client";
import { payEstoreOrder } from "@/lib/razorpay";

export const Route = createFileRoute("/estore")({
  head: () => ({ meta: [{ title: "E-Store — BharatOne" }] }),
  component: EstorePage,
});

type Cat = { id: string; parent_id: string | null; name: string; sort_order: number };
type Product = {
  id: string; category_id: string | null; name: string; brand: string | null; description: string | null;
  image_paths: string[]; mrp: number; offer_price: number | null; selling_price: number;
  gst_rate: number; retailer_margin: number; stock_qty: number; low_stock_at: number;
  is_exclusive: boolean; featured: boolean;
};
type Order = {
  id: string; order_no: string; status: string; payment_status: string; total: number;
  courier: string | null; tracking_no: string | null; created_at: string;
  retailer_margin_total: number; commission_settled: boolean;
};
type CartLine = { product: Product; qty: number };

const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const imgUrl = (p?: string) => p ? supabase.storage.from("estore").getPublicUrl(p).data.publicUrl : "";
const priceOf = (p: Product) => (p.offer_price && p.offer_price > 0 ? p.offer_price : p.selling_price);
const CAT_ICON: Record<string, string> = {
  "Electronics & Gadgets": "📱", "Home Appliances": "🧺", "Mobile Accessories": "🎧", "Fashion": "👕",
  "Beauty & Personal Care": "💄", "Grocery & FMCG": "🛒", "Healthcare & Wellness": "🩺", "Agriculture": "🌾",
  "Automobile": "🏍️", "Home & Kitchen": "🍳", "Stationery & Office": "✏️", "Toys & Baby Care": "🧸",
  "Books & Education": "📚", "Sports & Fitness": "🏏", "Pet Care": "🐾", "BharatOne Exclusive": "⭐",
};
const catIcon = (n: string) => CAT_ICON[n] ?? "🛍️";
const STAGES = ["placed", "confirmed", "packed", "shipped", "delivered"];
const stageTone: Record<string, string> = {
  pending_payment: "bg-amber-100 text-amber-700", placed: "bg-sky-100 text-sky-700",
  confirmed: "bg-indigo-100 text-indigo-700", packed: "bg-violet-100 text-violet-700",
  shipped: "bg-blue-100 text-blue-700", delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
};

function EstorePage() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"shop" | "orders">("shop");
  const [topCat, setTopCat] = useState<string | null>(null);
  const [subCat, setSubCat] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  // shipping
  const [ship, setShip] = useState({ name: "", phone: "", line: "", city: "", state: "", pincode: "", landmark: "" });

  async function load() {
    setLoading(true);
    try {
      const [c, p, o] = await Promise.all([
        supabase.from("estore_categories").select("id,parent_id,name,sort_order").eq("active", true).order("sort_order"),
        supabase.from("estore_products").select("*").eq("active", true).order("featured", { ascending: false }).order("created_at", { ascending: false }),
        (supabase as any).rpc("estore_my_orders", { _limit: 50 }),
      ]);
      setCats((c.data as Cat[]) ?? []);
      setProducts((p.data as Product[]) ?? []);
      setOrders((o.data as Order[]) ?? []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const topCats = useMemo(() => cats.filter((c) => !c.parent_id), [cats]);
  const subCats = useMemo(() => (topCat ? cats.filter((c) => c.parent_id === topCat) : []), [cats, topCat]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return products.filter((p) => {
      if (subCat) { if (p.category_id !== subCat) return false; }
      else if (topCat) { const subIds = cats.filter((c) => c.parent_id === topCat).map((c) => c.id); if (!subIds.includes(p.category_id ?? "")) return false; }
      if (s && !`${p.name} ${p.brand ?? ""} ${p.description ?? ""}`.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [products, topCat, subCat, q, cats]);

  const addToCart = (p: Product) => {
    setCart((c) => {
      const ex = c.find((l) => l.product.id === p.id);
      if (ex) {
        if (ex.qty >= p.stock_qty) { toast.error("No more stock"); return c; }
        return c.map((l) => l.product.id === p.id ? { ...l, qty: l.qty + 1 } : l);
      }
      return [...c, { product: p, qty: 1 }];
    });
    toast.success("Added to cart");
  };
  const setQty = (id: string, qty: number) => setCart((c) => c.flatMap((l) => l.product.id === id ? (qty <= 0 ? [] : [{ ...l, qty: Math.min(qty, l.product.stock_qty) }]) : [l]));

  const cartCount = cart.reduce((a, l) => a + l.qty, 0);
  const subtotal = cart.reduce((a, l) => a + priceOf(l.product) * l.qty, 0);
  const gstTotal = cart.reduce((a, l) => a + priceOf(l.product) * l.qty * l.product.gst_rate / 100, 0);
  const marginTotal = cart.reduce((a, l) => a + l.product.retailer_margin * l.qty, 0);
  const grandTotal = subtotal + gstTotal;

  const checkout = async () => {
    if (cart.length === 0) return toast.error("Your cart is empty");
    if (!ship.name.trim() || !/^\d{10}$/.test(ship.phone) || !ship.line.trim() || !/^\d{6}$/.test(ship.pincode))
      return toast.error("Fill name, 10-digit phone, address and 6-digit pincode");
    setCheckingOut(true);
    try {
      const { data, error } = await (supabase as any).rpc("estore_place_order", {
        _items: cart.map((l) => ({ product_id: l.product.id, qty: l.qty })),
        _ship: ship, _shipping_fee: 0,
      });
      if (error) throw error;
      const orderId = (data as any).order_id;
      const { data: au } = await supabase.auth.getUser();
      const r = await payEstoreOrder({ orderId, name: ship.name, contact: ship.phone, email: au.user?.email });
      if (r.status === "paid") {
        toast.success("Order placed!", { description: "Payment successful. Track it under My Orders." });
        setCart([]); setCartOpen(false); setTab("orders"); load();
      } else if (r.status === "not_configured") {
        toast.error("Payments not set up", { description: "Ask an administrator to configure Razorpay." });
      } else if (r.status === "dismissed") {
        toast("Payment cancelled", { description: "Your order is held as unpaid; complete payment from My Orders." });
        setTab("orders"); load();
      } else {
        toast.error("Payment failed", { description: r.message });
        load();
      }
    } catch (e: any) {
      const m = String(e.message || e);
      toast.error("Could not place order", { description: m.includes("OUT_OF_STOCK") ? "An item just went out of stock." : m });
    } finally { setCheckingOut(false); }
  };

  const payAgain = async (o: Order) => {
    const { data: au } = await supabase.auth.getUser();
    const r = await payEstoreOrder({ orderId: o.id, email: au.user?.email });
    if (r.status === "paid") { toast.success("Payment successful"); load(); }
    else if (r.status !== "dismissed") toast.error("Payment failed", { description: r.message });
  };

  return (
    <RetailerShell>
      <div className="space-y-5">
        <PageHeader
          icon={<ShoppingBag className="h-5 w-5" />}
          title="E-Store"
          subtitle="Order products at retailer pricing — pay securely and earn your margin on delivery"
          actions={
            <div className="flex items-center gap-2">
              <button onClick={() => setCartOpen(true)} className="relative inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-10 text-sm font-semibold hover:bg-muted">
                <ShoppingCart className="h-4 w-4" /> Cart
                {cartCount > 0 && <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-saffron px-1 text-[11px] font-bold text-white">{cartCount}</span>}
              </button>
              <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-10 text-sm font-semibold hover:bg-muted"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button>
            </div>
          }
        />

        <div className="flex gap-1.5">
          {(["shop", "orders"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-full px-4 h-9 text-xs font-semibold capitalize transition ${tab === t ? "bg-india-green text-white" : "border border-border bg-card hover:bg-muted"}`}>
              {t === "shop" ? "Shop" : `My Orders (${orders.length})`}
            </button>
          ))}
        </div>

        {tab === "shop" && (
          <>
            {/* Hero banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[oklch(0.62_0.16_45)] via-[oklch(0.58_0.15_60)] to-[oklch(0.55_0.13_150)] p-6 text-white shadow-elev sm:p-8">
              <div className="relative z-10 max-w-xl">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur">🎉 BharatOne E-Store</span>
                <h2 className="mt-3 font-display text-2xl font-extrabold leading-tight sm:text-3xl">Everything for your shop — at retailer prices.</h2>
                <p className="mt-1 text-sm text-white/85">Order from 100+ categories, pay securely with Razorpay, and earn your margin on every delivery.</p>
                <div className="relative mt-4 max-w-md">
                  <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-muted-foreground" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search for products, brands and more…" className="h-12 w-full rounded-xl border border-white/40 bg-white pl-11 pr-4 text-sm text-foreground shadow-soft outline-none placeholder:text-muted-foreground" />
                </div>
              </div>
              <ShoppingBag className="pointer-events-none absolute -right-6 -bottom-8 h-48 w-48 text-white/10" />
            </div>

            {/* Category tiles (only when nothing selected) */}
            {!topCat && !q.trim() && (
              <div>
                <p className="mb-2 text-sm font-bold">Shop by category</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                  {topCats.map((c) => (
                    <button key={c.id} onClick={() => { setTopCat(c.id); setSubCat(null); }}
                      className="group flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-3 text-center shadow-soft transition hover:-translate-y-0.5 hover:border-india-green/40 hover:shadow-elev">
                      <span className="grid h-11 w-11 place-items-center rounded-full bg-muted text-2xl transition group-hover:bg-india-green/10">{catIcon(c.name)}</span>
                      <span className="line-clamp-2 text-[11px] font-semibold leading-tight">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Selected category → breadcrumb + subcategory chips */}
            {topCat && (
              <div className="rounded-2xl border border-border bg-card p-3 shadow-soft">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <button onClick={() => { setTopCat(null); setSubCat(null); }} className="text-muted-foreground hover:text-foreground">All</button>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <span className="flex items-center gap-1">{catIcon(topCats.find((c) => c.id === topCat)?.name ?? "")} {topCats.find((c) => c.id === topCat)?.name}</span>
                </div>
                {subCats.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={() => setSubCat(null)} className={`rounded-full px-3 h-7 text-[11px] font-semibold ${!subCat ? "bg-india-green text-white" : "border border-border bg-background hover:bg-muted"}`}>All</button>
                    {subCats.map((c) => (
                      <button key={c.id} onClick={() => setSubCat(c.id)} className={`rounded-full px-3 h-7 text-[11px] font-semibold ${subCat === c.id ? "bg-india-green text-white" : "border border-border bg-background hover:bg-muted"}`}>{c.name}</button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Product grid */}
            {loading ? (
              <div className="py-16 text-center text-muted-foreground"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>
            ) : shown.length === 0 ? (
              <div className="grid place-items-center rounded-3xl border border-dashed border-border bg-card/50 py-20 text-center">
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-muted"><Package className="h-8 w-8 text-muted-foreground" /></div>
                <p className="mt-3 text-base font-bold">No products here yet</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">New products are added regularly. Try another category or check back soon.</p>
                {(topCat || subCat || q) && <button onClick={() => { setTopCat(null); setSubCat(null); setQ(""); }} className="mt-4 rounded-lg bg-india-green px-4 h-9 text-xs font-semibold text-white">Browse all categories</button>}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {shown.map((p) => {
                  const price = priceOf(p);
                  const off = p.mrp > price ? Math.round((1 - price / p.mrp) * 100) : 0;
                  const out = p.stock_qty <= 0;
                  return (
                    <div key={p.id} className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
                      <div className="relative aspect-square bg-muted/40">
                        {p.image_paths?.[0]
                          ? <img src={imgUrl(p.image_paths[0])} alt={p.name} className="h-full w-full object-cover" />
                          : <div className="grid h-full place-items-center text-muted-foreground"><Package className="h-10 w-10" /></div>}
                        {p.is_exclusive && <span className="absolute left-2 top-2 rounded-full bg-saffron px-2 py-0.5 text-[10px] font-bold text-white">Exclusive</span>}
                        {off > 0 && <span className="absolute right-2 top-2 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">{off}% OFF</span>}
                      </div>
                      <div className="flex flex-1 flex-col p-3">
                        {p.brand && <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{p.brand}</p>}
                        <p className="line-clamp-2 text-sm font-semibold">{p.name}</p>
                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="text-base font-extrabold">{inr(price)}</span>
                          {p.mrp > price && <span className="text-xs text-muted-foreground line-through">{inr(p.mrp)}</span>}
                        </div>
                        {p.retailer_margin > 0 && <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600"><Tag className="h-3 w-3" /> You earn {inr(p.retailer_margin)}/unit</p>}
                        <div className="mt-auto pt-2">
                          {out ? (
                            <button disabled className="w-full rounded-lg bg-muted px-3 h-9 text-xs font-semibold text-muted-foreground">Out of stock</button>
                          ) : (
                            <button onClick={() => addToCart(p)} className="w-full rounded-lg bg-india-green px-3 h-9 text-xs font-semibold text-white hover:bg-india-green/90">Add to cart</button>
                          )}
                          {!out && p.stock_qty <= p.low_stock_at && <p className="mt-1 text-center text-[10px] font-semibold text-amber-600">Only {p.stock_qty} left</p>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === "orders" && (
          <div className="space-y-3">
            {loading ? <div className="py-12 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>
              : orders.length === 0 ? <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">No orders yet.</div>
              : orders.map((o) => (
                <div key={o.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold">{o.order_no} · {inr(o.total)}</p>
                      <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("en-IN")}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${stageTone[o.status] ?? "bg-muted"}`}>{o.status.replace(/_/g, " ")}</span>
                  </div>
                  {o.status === "pending_payment" && (
                    <button onClick={() => payAgain(o)} className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-saffron-gradient px-3 h-9 text-xs font-bold text-white"><Wallet className="h-3.5 w-3.5" /> Complete payment</button>
                  )}
                  {["placed", "confirmed", "packed", "shipped", "delivered"].includes(o.status) && (
                    <div className="mt-3 flex items-center gap-1">
                      {STAGES.map((s, i) => {
                        const reached = STAGES.indexOf(o.status) >= i;
                        return (
                          <div key={s} className="flex flex-1 items-center gap-1">
                            <div className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] ${reached ? "bg-india-green text-white" : "bg-muted text-muted-foreground"}`}>
                              {s === "delivered" ? <CheckCircle2 className="h-3.5 w-3.5" /> : s === "shipped" ? <Truck className="h-3.5 w-3.5" /> : i + 1}
                            </div>
                            {i < STAGES.length - 1 && <div className={`h-0.5 flex-1 ${STAGES.indexOf(o.status) > i ? "bg-india-green" : "bg-muted"}`} />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {o.tracking_no && <p className="mt-2 text-xs text-muted-foreground">Courier: <b>{o.courier}</b> · Tracking: <b>{o.tracking_no}</b></p>}
                  {o.commission_settled && o.retailer_margin_total > 0 && <p className="mt-1 text-xs font-semibold text-emerald-600">Margin {inr(o.retailer_margin_total)} credited to your wallet</p>}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setCartOpen(false)}>
          <div className="flex h-full w-full max-w-md flex-col bg-card shadow-elev" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border p-4">
              <p className="flex items-center gap-2 font-bold"><ShoppingCart className="h-5 w-5" /> Your Cart ({cartCount})</p>
              <button onClick={() => setCartOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {cart.length === 0 ? <p className="py-12 text-center text-sm text-muted-foreground">Your cart is empty.</p> : (
                <div className="space-y-3">
                  {cart.map((l) => (
                    <div key={l.product.id} className="flex gap-3 rounded-xl border border-border p-2">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted/40">
                        {l.product.image_paths?.[0] ? <img src={imgUrl(l.product.image_paths[0])} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-muted-foreground"><Package className="h-6 w-6" /></div>}
                      </div>
                      <div className="flex-1">
                        <p className="line-clamp-1 text-sm font-semibold">{l.product.name}</p>
                        <p className="text-sm font-bold">{inr(priceOf(l.product))}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <button onClick={() => setQty(l.product.id, l.qty - 1)} className="grid h-7 w-7 place-items-center rounded-lg border border-border hover:bg-muted"><Minus className="h-3.5 w-3.5" /></button>
                          <span className="w-6 text-center text-sm font-semibold">{l.qty}</span>
                          <button onClick={() => setQty(l.product.id, l.qty + 1)} className="grid h-7 w-7 place-items-center rounded-lg border border-border hover:bg-muted"><Plus className="h-3.5 w-3.5" /></button>
                          <button onClick={() => setQty(l.product.id, 0)} className="ml-auto text-rose-600"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="rounded-xl border border-border p-3">
                    <p className="mb-2 text-xs font-bold text-muted-foreground">Delivery address</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input value={ship.name} onChange={(e) => setShip({ ...ship, name: e.target.value })} placeholder="Full name *" className="h-9 rounded-lg border border-border bg-background px-3 text-sm" />
                      <input value={ship.phone} onChange={(e) => setShip({ ...ship, phone: e.target.value.replace(/\D/g, "") })} maxLength={10} placeholder="Phone *" className="h-9 rounded-lg border border-border bg-background px-3 text-sm" />
                      <input value={ship.line} onChange={(e) => setShip({ ...ship, line: e.target.value })} placeholder="Address *" className="sm:col-span-2 h-9 rounded-lg border border-border bg-background px-3 text-sm" />
                      <input value={ship.city} onChange={(e) => setShip({ ...ship, city: e.target.value })} placeholder="City" className="h-9 rounded-lg border border-border bg-background px-3 text-sm" />
                      <input value={ship.state} onChange={(e) => setShip({ ...ship, state: e.target.value })} placeholder="State" className="h-9 rounded-lg border border-border bg-background px-3 text-sm" />
                      <input value={ship.pincode} onChange={(e) => setShip({ ...ship, pincode: e.target.value.replace(/\D/g, "") })} maxLength={6} placeholder="Pincode *" className="h-9 rounded-lg border border-border bg-background px-3 text-sm" />
                      <input value={ship.landmark} onChange={(e) => setShip({ ...ship, landmark: e.target.value })} placeholder="Landmark" className="h-9 rounded-lg border border-border bg-background px-3 text-sm" />
                    </div>
                  </div>
                </div>
              )}
            </div>
            {cart.length > 0 && (
              <div className="border-t border-border p-4">
                <div className="mb-2 space-y-1 text-sm">
                  <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{inr(subtotal)}</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>GST</span><span>{inr(gstTotal)}</span></div>
                  <div className="flex justify-between text-base font-extrabold"><span>Total</span><span>{inr(grandTotal)}</span></div>
                  {marginTotal > 0 && <div className="flex justify-between text-xs font-semibold text-emerald-600"><span>You'll earn on delivery</span><span>{inr(marginTotal)}</span></div>}
                </div>
                <button onClick={checkout} disabled={checkingOut} className="w-full rounded-lg bg-saffron-gradient px-4 h-11 text-sm font-bold text-white shadow-elev disabled:opacity-50">
                  {checkingOut ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : `Pay ${inr(grandTotal)} with Razorpay`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </RetailerShell>
  );
}
