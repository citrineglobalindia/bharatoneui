import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ShoppingBag, Loader2, RefreshCw, Plus, Trash2, Save, X, Upload, Package,
  Search, Download, Boxes, IndianRupee, TrendingUp, Truck, Layers, LayoutGrid,
  Warehouse, CreditCard, FileText, ArrowUp, ArrowDown, AlertTriangle, ChevronRight,
  Wallet, ClipboardList, CheckCircle2, Tag, Tags, Pencil, Eye, EyeOff, Check,
  Printer, UserPlus, Circle, UserCheck, Bike,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

type Cat = { id: string; parent_id: string | null; name: string; sort_order: number; active: boolean; icon: string | null };
type TagT = { id: string; name: string; color: string; active: boolean; sort_order: number };
type Product = {
  id: string; category_id: string | null; name: string; brand: string | null; sku: string | null; hsn: string | null;
  description: string | null; image_paths: string[]; mrp: number; offer_price: number | null; selling_price: number;
  gst_rate: number; retailer_margin: number; distributor_commission: number; bharatone_commission: number;
  stock_qty: number; low_stock_at: number; is_exclusive: boolean; featured: boolean; active: boolean; tags: string[];
};
type OrderRow = {
  id: string; order_no: string; created_at: string; placed_at: string | null; delivered_at: string | null;
  status: string; payment_status: string; retailer_name: string | null; jsko_id: string | null;
  subtotal: number; gst_amount: number; shipping_fee: number; total: number; items: number;
  retailer_margin_total: number; distributor_commission_total: number; bharatone_commission_total: number;
  commission_settled: boolean; courier: string | null; tracking_no: string | null;
  razorpay_order_id: string | null; razorpay_payment_id: string | null;
  order_for: string | null; assigned_staff: string | null; assigned_agent: string | null;
  assigned_staff_name: string | null; assigned_agent_name: string | null;
  ship_name: string | null; ship_phone: string | null; ship_line: string | null;
  ship_city: string | null; ship_state: string | null; ship_pincode: string | null;
};
type Movement = { id: string; product_id: string; product_name: string; change: number; reason: string; balance_after: number; created_at: string; by_name: string | null };
type OrderDetail = { order: any; retailer_name: string | null; jsko_id: string | null; assigned_staff_name?: string | null; assigned_agent_name?: string | null; items: any[] };
type OrderEvent = { status: string | null; note: string | null; actor_name: string | null; created_at: string };
type StaffT = { id: string; name: string; role: string };
type AgentT = { id: string; name: string; phone: string | null; area: string | null; active: boolean };

const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const imgUrl = (p?: string) => p ? supabase.storage.from("estore").getPublicUrl(p).data.publicUrl : "";
const STATUSES = ["placed", "confirmed", "packed", "shipped", "delivered", "cancelled"];
const tone: Record<string, string> = {
  pending_payment: "bg-amber-100 text-amber-700", placed: "bg-sky-100 text-sky-700", confirmed: "bg-indigo-100 text-indigo-700",
  packed: "bg-violet-100 text-violet-700", shipped: "bg-blue-100 text-blue-700", delivered: "bg-emerald-100 text-emerald-700", cancelled: "bg-rose-100 text-rose-700",
  paid: "bg-emerald-100 text-emerald-700", pending: "bg-amber-100 text-amber-700", failed: "bg-rose-100 text-rose-700",
};
const SELLER = { name: "BharatOne Services and Affiliates Private Limited", brand: "BharatOne E-Store" };

// framer variants
const pageV = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 } };
const listV = { animate: { transition: { staggerChildren: 0.04 } } };
const itemV = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

const TABS = [
  ["overview", "Overview", LayoutGrid],
  ["products", "Products", Package],
  ["categories", "Categories", Layers],
  ["tags", "Tags", Tags],
  ["inventory", "Inventory", Warehouse],
  ["orders", "Orders", ClipboardList],
  ["invoices", "Invoices", FileText],
  ["payments", "Payments", CreditCard],
] as const;
type TabKey = typeof TABS[number][0];

export function EstoreAdmin() {
  const [tab, setTab] = useState<TabKey>("overview");
  return (
    <div className="space-y-5">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-extrabold"><ShoppingBag className="h-5 w-5 text-admin" /> E-Store</h2>
        <p className="text-sm text-muted-foreground">Catalog, stock, orders, invoices and payments — one command centre.</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {TABS.map(([k, l, Icon]) => (
          <button key={k} onClick={() => setTab(k)} className={`relative inline-flex items-center gap-1.5 rounded-full px-4 h-9 text-xs font-semibold transition ${tab === k ? "text-white" : "border border-border bg-card hover:bg-muted"}`}>
            {tab === k && <motion.span layoutId="estore-tab" className="absolute inset-0 rounded-full bg-india-green" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
            <span className="relative flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" /> {l}</span>
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={tab} variants={pageV} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.2 }}>
          {tab === "overview" ? <Overview go={setTab} />
            : tab === "products" ? <Products />
            : tab === "categories" ? <Categories />
            : tab === "tags" ? <TagsManager />
            : tab === "inventory" ? <Inventory />
            : tab === "orders" ? <Orders />
            : tab === "invoices" ? <Invoices />
            : <Payments />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ================================================================ OVERVIEW
function Overview({ go }: { go: (t: TabKey) => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    try {
      await ensureStaffSession();
      const [p, o] = await Promise.all([
        supabase.from("estore_products").select("*").order("created_at", { ascending: false }),
        (supabase as any).rpc("estore_admin_orders", { _limit: 1000 }),
      ]);
      setProducts((p.data as Product[]) ?? []);
      setOrders((o.data as OrderRow[]) ?? []);
    } catch (e: any) { toast.error("Could not load", { description: e.message }); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const paid = orders.filter((o) => o.payment_status === "paid");
  const today = new Date().toDateString();
  const stats = {
    products: products.length,
    lowStock: products.filter((p) => p.active && p.stock_qty <= p.low_stock_at).length,
    stockValue: products.reduce((a, p) => a + p.stock_qty * (p.offer_price || p.selling_price), 0),
    ordersToday: orders.filter((o) => new Date(o.created_at).toDateString() === today).length,
    orders: orders.length,
    revenue: paid.reduce((a, o) => a + Number(o.total || 0), 0),
    pending: orders.filter((o) => o.payment_status !== "paid").length,
    payouts: paid.reduce((a, o) => a + Number(o.retailer_margin_total || 0) + Number(o.distributor_commission_total || 0), 0),
    margin: paid.reduce((a, o) => a + Number(o.bharatone_commission_total || 0), 0),
    toShip: orders.filter((o) => ["placed", "confirmed", "packed"].includes(o.status)).length,
  };

  if (loading) return <div className="py-16 text-center text-muted-foreground"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>;

  const cards = [
    { icon: <IndianRupee className="h-4 w-4" />, label: "Revenue (paid)", value: inr(stats.revenue), tint: "from-emerald-500/15 to-emerald-500/5", sub: `${paid.length} paid orders` },
    { icon: <ShoppingBag className="h-4 w-4" />, label: "BharatOne margin", value: inr(stats.margin), tint: "from-saffron/15 to-saffron/5" },
    { icon: <Wallet className="h-4 w-4" />, label: "Payouts (R+D)", value: inr(stats.payouts), tint: "from-indigo-500/15 to-indigo-500/5" },
    { icon: <Boxes className="h-4 w-4" />, label: "Stock value", value: inr(stats.stockValue), tint: "from-sky-500/15 to-sky-500/5", sub: `${stats.products} products` },
    { icon: <ClipboardList className="h-4 w-4" />, label: "Orders today", value: String(stats.ordersToday), tint: "from-violet-500/15 to-violet-500/5", sub: `${stats.orders} all time` },
    { icon: <Truck className="h-4 w-4" />, label: "Awaiting shipment", value: String(stats.toShip), tint: "from-blue-500/15 to-blue-500/5" },
    { icon: <CreditCard className="h-4 w-4" />, label: "Payments pending", value: String(stats.pending), tint: "from-amber-500/15 to-amber-500/5" },
    { icon: <AlertTriangle className="h-4 w-4" />, label: "Low / out of stock", value: String(stats.lowStock), tint: "from-rose-500/15 to-rose-500/5", action: () => go("inventory") },
  ];

  const recent = orders.slice(0, 6);
  const lows = products.filter((p) => p.active && p.stock_qty <= p.low_stock_at).slice(0, 6);

  return (
    <div className="space-y-5">
      <motion.div variants={listV} initial="initial" animate="animate" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <motion.button key={c.label} variants={itemV} onClick={c.action} whileHover={{ y: -3 }}
            className={`rounded-2xl border border-border bg-gradient-to-br ${c.tint} p-4 text-left shadow-soft ${c.action ? "cursor-pointer" : "cursor-default"}`}>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{c.icon} {c.label}</p>
            <p className="mt-1 text-2xl font-extrabold">{c.value}</p>
            {c.sub && <p className="text-xs text-muted-foreground">{c.sub}</p>}
          </motion.button>
        ))}
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="mb-2 flex items-center justify-between"><p className="flex items-center gap-1.5 text-sm font-bold"><ClipboardList className="h-4 w-4 text-india-green" /> Recent orders</p><button onClick={() => go("orders")} className="text-xs font-semibold text-india-green hover:underline">View all</button></div>
          {recent.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No orders yet.</p> : (
            <div className="divide-y divide-border">
              {recent.map((o) => (
                <div key={o.id} className="flex items-center justify-between py-2">
                  <div><p className="text-sm font-semibold">{o.order_no}</p><p className="text-[11px] text-muted-foreground">{o.retailer_name ?? "—"} · {new Date(o.created_at).toLocaleDateString("en-IN")}</p></div>
                  <div className="text-right"><p className="text-sm font-bold">{inr(o.total)}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${tone[o.status] ?? "bg-muted"}`}>{o.status.replace(/_/g, " ")}</span></div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="mb-2 flex items-center justify-between"><p className="flex items-center gap-1.5 text-sm font-bold"><AlertTriangle className="h-4 w-4 text-amber-600" /> Low stock alerts</p><button onClick={() => go("inventory")} className="text-xs font-semibold text-india-green hover:underline">Manage</button></div>
          {lows.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">All products well stocked.</p> : (
            <div className="divide-y divide-border">
              {lows.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2"><div className="h-8 w-8 overflow-hidden rounded-lg bg-muted/40">{p.image_paths?.[0] ? <img src={imgUrl(p.image_paths[0])} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-muted-foreground"><Package className="h-4 w-4" /></div>}</div><p className="text-sm font-semibold">{p.name}</p></div>
                  <span className={`text-sm font-bold ${p.stock_qty <= 0 ? "text-rose-600" : "text-amber-600"}`}>{p.stock_qty <= 0 ? "Out" : `${p.stock_qty} left`}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ================================================================ PRODUCTS
const blankProduct = (): Product => ({
  id: "", category_id: null, name: "", brand: "", sku: "", hsn: "", description: "", image_paths: [],
  mrp: 0, offer_price: null, selling_price: 0, gst_rate: 0, retailer_margin: 0, distributor_commission: 0,
  bharatone_commission: 0, stock_qty: 0, low_stock_at: 5, is_exclusive: false, featured: false, active: true, tags: [],
});

function Products() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [tagCatalog, setTagCatalog] = useState<TagT[]>([]);
  const [rows, setRows] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [form, setForm] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function load() {
    setLoading(true);
    const [c, p, t] = await Promise.all([
      supabase.from("estore_categories").select("*").order("sort_order"),
      supabase.from("estore_products").select("*").order("created_at", { ascending: false }),
      supabase.from("estore_tags").select("*").eq("active", true).order("sort_order"),
    ]);
    setCats((c.data as Cat[]) ?? []);
    setRows((p.data as Product[]) ?? []);
    setTagCatalog((t.data as TagT[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const subCats = useMemo(() => cats.filter((c) => c.parent_id), [cats]);
  const catName = (id: string | null) => {
    const c = cats.find((x) => x.id === id); if (!c) return "—";
    const parent = cats.find((x) => x.id === c.parent_id);
    return parent ? `${parent.name} › ${c.name}` : c.name;
  };
  const filtered = rows.filter((r) => !q.trim() || `${r.name} ${r.brand ?? ""} ${r.sku ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()));

  const save = async () => {
    if (!form) return;
    if (!form.name.trim()) return toast.error("Product name is required");
    if (!(form.selling_price > 0)) return toast.error("Selling price must be greater than 0");
    setSaving(true);
    try {
      await ensureStaffSession();
      const payload = { ...form } as any;
      delete payload.id;
      payload.mrp = Number(form.mrp) || 0;
      payload.offer_price = form.offer_price ? Number(form.offer_price) : null;
      payload.selling_price = Number(form.selling_price) || 0;
      payload.gst_rate = Number(form.gst_rate) || 0;
      payload.retailer_margin = Number(form.retailer_margin) || 0;
      payload.distributor_commission = Number(form.distributor_commission) || 0;
      payload.bharatone_commission = Number(form.bharatone_commission) || 0;
      payload.stock_qty = Number(form.stock_qty) || 0;
      payload.low_stock_at = Number(form.low_stock_at) || 0;
      payload.tags = Array.isArray(form.tags) ? form.tags : [];
      payload.updated_at = new Date().toISOString();
      let error;
      if (form.id) ({ error } = await supabase.from("estore_products").update(payload).eq("id", form.id));
      else ({ error } = await supabase.from("estore_products").insert(payload));
      if (error) throw error;
      toast.success(form.id ? "Product updated" : "Product added");
      setForm(null); load();
    } catch (e: any) { toast.error("Could not save", { description: e.message }); }
    finally { setSaving(false); }
  };

  const del = async (p: Product) => {
    if (!confirm(`Delete "${p.name}"?`)) return;
    await ensureStaffSession();
    const { error } = await supabase.from("estore_products").delete().eq("id", p.id);
    if (error) return toast.error("Could not delete", { description: error.message });
    toast.success("Deleted"); load();
  };

  const uploadImg = async (file: File) => {
    if (!form) return;
    setUploading(true);
    try {
      await ensureStaffSession();
      const path = `products/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
      const { error } = await supabase.storage.from("estore").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      setForm({ ...form, image_paths: [...form.image_paths, path] });
      toast.success("Image uploaded");
    } catch (e: any) { toast.error("Upload failed", { description: e.message }); }
    finally { setUploading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative"><Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" className="h-8 w-56 rounded-lg border border-border bg-background pl-8 pr-2 text-xs outline-none" /></div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={load}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button>
          <Button size="sm" onClick={() => setForm(blankProduct())} className="bg-india-green text-white"><Plus className="h-4 w-4" /> Add product</Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr><th className="px-3 py-2">Product</th><th className="px-3 py-2">Category</th><th className="px-3 py-2">MRP / Selling</th><th className="px-3 py-2">Margins (R/D/Co)</th><th className="px-3 py-2">Stock</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
              : filtered.length === 0 ? <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">No products yet.</td></tr>
              : filtered.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-muted/40">{p.image_paths?.[0] ? <img src={imgUrl(p.image_paths[0])} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-muted-foreground"><Package className="h-4 w-4" /></div>}</div>
                      <div><p className="font-semibold">{p.name}</p><p className="text-[11px] text-muted-foreground">{p.brand} {p.sku ? `· ${p.sku}` : ""}</p></div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs">{catName(p.category_id)}</td>
                  <td className="px-3 py-2"><span className="text-xs text-muted-foreground line-through">{inr(p.mrp)}</span> <b>{inr(p.offer_price || p.selling_price)}</b></td>
                  <td className="px-3 py-2 text-xs">{inr(p.retailer_margin)} / {inr(p.distributor_commission)} / {inr(p.bharatone_commission)}</td>
                  <td className="px-3 py-2"><span className={p.stock_qty <= p.low_stock_at ? "font-bold text-amber-600" : "font-semibold"}>{p.stock_qty}</span></td>
                  <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${p.active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{p.active ? "Active" : "Hidden"}</span>{p.is_exclusive && <span className="ml-1 rounded-full bg-saffron/20 px-2 py-0.5 text-[10px] font-bold text-saffron">Excl</span>}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap"><button onClick={() => setForm(p)} className="mr-3 text-xs font-semibold text-india-green hover:underline">Edit</button><button onClick={() => del(p)} className="text-rose-600"><Trash2 className="h-4 w-4" /></button></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {form && (
          <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setForm(null)}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-5 shadow-elev" onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 16 }} transition={{ type: "spring", stiffness: 320, damping: 28 }}>
              <div className="mb-3 flex items-center justify-between"><p className="text-sm font-bold">{form.id ? "Edit product" : "Add product"}</p><button onClick={() => setForm(null)}><X className="h-5 w-5" /></button></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <L label="Product name *" span2><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="in" /></L>
                <L label="Brand"><input value={form.brand ?? ""} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="in" /></L>
                <L label="Category"><select value={form.category_id ?? ""} onChange={(e) => setForm({ ...form, category_id: e.target.value || null })} className="in"><option value="">— select —</option>{subCats.map((c) => { const parent = cats.find((x) => x.id === c.parent_id); return <option key={c.id} value={c.id}>{parent?.name} › {c.name}</option>; })}</select></L>
                <L label="SKU"><input value={form.sku ?? ""} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="in" /></L>
                <L label="HSN"><input value={form.hsn ?? ""} onChange={(e) => setForm({ ...form, hsn: e.target.value })} className="in" /></L>
                <L label="Description" span2><textarea rows={2} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} className="in" /></L>

                <div className="sm:col-span-2 mt-1 rounded-xl bg-muted/40 p-3">
                  <p className="mb-2 text-xs font-bold text-muted-foreground">Pricing</p>
                  <div className="grid gap-2 sm:grid-cols-4">
                    <L label="MRP (₹)"><input type="number" value={form.mrp} onChange={(e) => setForm({ ...form, mrp: +e.target.value })} className="in" /></L>
                    <L label="Offer price (₹)"><input type="number" value={form.offer_price ?? ""} onChange={(e) => setForm({ ...form, offer_price: e.target.value === "" ? null : +e.target.value })} className="in" /></L>
                    <L label="Selling price (₹) *"><input type="number" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: +e.target.value })} className="in" /></L>
                    <L label="GST %"><input type="number" value={form.gst_rate} onChange={(e) => setForm({ ...form, gst_rate: +e.target.value })} className="in" /></L>
                  </div>
                </div>

                <div className="sm:col-span-2 rounded-xl bg-muted/40 p-3">
                  <p className="mb-2 text-xs font-bold text-muted-foreground">Earnings per unit (credited on delivery)</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <L label="Retailer margin (₹)"><input type="number" value={form.retailer_margin} onChange={(e) => setForm({ ...form, retailer_margin: +e.target.value })} className="in" /></L>
                    <L label="Distributor commission (₹)"><input type="number" value={form.distributor_commission} onChange={(e) => setForm({ ...form, distributor_commission: +e.target.value })} className="in" /></L>
                    <L label="BharatOne commission (₹)"><input type="number" value={form.bharatone_commission} onChange={(e) => setForm({ ...form, bharatone_commission: +e.target.value })} className="in" /></L>
                  </div>
                </div>

                <div className="sm:col-span-2 rounded-xl bg-muted/40 p-3">
                  <p className="mb-2 text-xs font-bold text-muted-foreground">Inventory</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <L label="Stock quantity"><input type="number" value={form.stock_qty} onChange={(e) => setForm({ ...form, stock_qty: +e.target.value })} className="in" /></L>
                    <L label="Low-stock alert at"><input type="number" value={form.low_stock_at} onChange={(e) => setForm({ ...form, low_stock_at: +e.target.value })} className="in" /></L>
                  </div>
                </div>

                <div className="sm:col-span-2 rounded-xl bg-muted/40 p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-muted-foreground"><Tag className="h-3.5 w-3.5" /> Tags</p>
                  {tagCatalog.length === 0 ? <p className="text-[11px] text-muted-foreground">No tags yet — create some in the Tags tab.</p> : (
                    <div className="flex flex-wrap gap-1.5">
                      {tagCatalog.map((t) => {
                        const on = form.tags?.includes(t.name);
                        return (
                          <button key={t.id} type="button"
                            onClick={() => setForm({ ...form, tags: on ? form.tags.filter((x) => x !== t.name) : [...(form.tags ?? []), t.name] })}
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 h-7 text-[11px] font-semibold transition ${on ? "text-white" : "border border-border bg-background hover:bg-muted"}`}
                            style={on ? { background: t.color } : undefined}>
                            {on && <Check className="h-3 w-3" />} {t.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">Images</p>
                  <div className="flex flex-wrap gap-2">
                    {form.image_paths.map((ip, i) => (
                      <div key={i} className="relative h-16 w-16 overflow-hidden rounded-lg border border-border">
                        <img src={imgUrl(ip)} className="h-full w-full object-cover" />
                        <button onClick={() => setForm({ ...form, image_paths: form.image_paths.filter((_, j) => j !== i) })} className="absolute right-0 top-0 bg-rose-600 p-0.5 text-white"><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                    <label className="grid h-16 w-16 cursor-pointer place-items-center rounded-lg border border-dashed border-border hover:bg-muted">
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 text-muted-foreground" />}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImg(e.target.files[0])} />
                    </label>
                  </div>
                </div>

                <div className="sm:col-span-2 flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-4 w-4" /> Active</label>
                  <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="h-4 w-4" /> Featured</label>
                  <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.is_exclusive} onChange={(e) => setForm({ ...form, is_exclusive: e.target.checked })} className="h-4 w-4" /> BharatOne Exclusive</label>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setForm(null)}>Cancel</Button>
                <Button size="sm" onClick={save} disabled={saving} className="bg-india-green text-white">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`.in{height:2.25rem;width:100%;border-radius:.5rem;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:0 .6rem;font-size:.8rem;outline:none}`}</style>
    </div>
  );
}
function L({ label, children, span2 }: { label: string; children: React.ReactNode; span2?: boolean }) {
  return <label className={`block ${span2 ? "sm:col-span-2" : ""}`}><span className="mb-1 block text-[11px] font-semibold text-muted-foreground">{label}</span>{children}</label>;
}

// ================================================================ CATEGORIES (advanced)
function Categories() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState(""); const [icon, setIcon] = useState(""); const [parent, setParent] = useState("");
  const [edit, setEdit] = useState<{ id: string; name: string; icon: string } | null>(null);
  const [subInput, setSubInput] = useState<Record<string, string>>({});

  async function load() { setLoading(true); const { data } = await supabase.from("estore_categories").select("*").order("sort_order"); setCats((data as Cat[]) ?? []); setLoading(false); }
  useEffect(() => { load(); }, []);
  const tops = cats.filter((c) => !c.parent_id).sort((a, b) => a.sort_order - b.sort_order);

  const add = async () => {
    if (!name.trim()) return toast.error("Enter a name");
    await ensureStaffSession();
    const sibs = cats.filter((c) => (c.parent_id ?? null) === (parent || null));
    const { error } = await supabase.from("estore_categories").insert({ name: name.trim(), icon: icon.trim() || null, parent_id: parent || null, sort_order: sibs.length + 1, active: true });
    if (error) return toast.error("Could not add", { description: error.message });
    setName(""); setIcon(""); toast.success("Category added"); load();
  };
  const saveEdit = async () => {
    if (!edit || !edit.name.trim()) return toast.error("Enter a name");
    await ensureStaffSession();
    const { error } = await supabase.from("estore_categories").update({ name: edit.name.trim(), icon: edit.icon.trim() || null }).eq("id", edit.id);
    if (error) return toast.error(error.message);
    setEdit(null); toast.success("Saved"); load();
  };
  const toggleActive = async (c: Cat) => { await ensureStaffSession(); await supabase.from("estore_categories").update({ active: !c.active }).eq("id", c.id); load(); };
  const move = async (c: Cat, dir: -1 | 1) => {
    const idx = tops.findIndex((x) => x.id === c.id); const swap = tops[idx + dir];
    if (!swap) return;
    await ensureStaffSession();
    await supabase.from("estore_categories").update({ sort_order: swap.sort_order }).eq("id", c.id);
    await supabase.from("estore_categories").update({ sort_order: c.sort_order }).eq("id", swap.id);
    load();
  };
  const addSub = async (parentId: string) => {
    const val = (subInput[parentId] || "").trim(); if (!val) return;
    await ensureStaffSession();
    const sibs = cats.filter((c) => c.parent_id === parentId);
    const { error } = await supabase.from("estore_categories").insert({ name: val, parent_id: parentId, sort_order: sibs.length + 1, active: true });
    if (error) return toast.error(error.message);
    setSubInput((s) => ({ ...s, [parentId]: "" })); load();
  };
  const del = async (c: Cat) => { if (!confirm(`Delete "${c.name}"${!c.parent_id ? " and its subcategories" : ""}?`)) return; await ensureStaffSession(); const { error } = await supabase.from("estore_categories").delete().eq("id", c.id); if (error) return toast.error(error.message); toast.success("Deleted"); load(); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-border bg-card p-4 shadow-soft">
        <label className="w-20"><span className="mb-1 block text-xs font-semibold text-muted-foreground">Icon</span><input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="🛍️" maxLength={2} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-center text-base" /></label>
        <label className="flex-1"><span className="mb-1 block text-xs font-semibold text-muted-foreground">Category name</span><input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label>
        <label><span className="mb-1 block text-xs font-semibold text-muted-foreground">Parent (for subcategory)</span><select value={parent} onChange={(e) => setParent(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-sm"><option value="">— top level —</option>{tops.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <Button size="sm" onClick={add} className="bg-india-green text-white"><Plus className="h-4 w-4" /> Add</Button>
      </div>

      {loading ? <SkeletonGrid /> : (
        <motion.div variants={listV} initial="initial" animate="animate" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tops.map((t, i) => (
            <motion.div key={t.id} variants={itemV} layout className={`rounded-2xl border border-border bg-card p-4 shadow-soft ${!t.active ? "opacity-60" : ""}`}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="flex min-w-0 items-center gap-1.5 font-bold"><span className="text-lg">{t.icon || "📦"}</span> <span className="truncate">{t.name}</span></p>
                <div className="flex shrink-0 items-center gap-1 text-muted-foreground">
                  <button title="Move up" disabled={i === 0} onClick={() => move(t, -1)} className="rounded p-1 hover:bg-muted disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                  <button title="Move down" disabled={i === tops.length - 1} onClick={() => move(t, 1)} className="rounded p-1 hover:bg-muted disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                  <button title={t.active ? "Hide" : "Show"} onClick={() => toggleActive(t)} className="rounded p-1 hover:bg-muted">{t.active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</button>
                  <button title="Edit" onClick={() => setEdit({ id: t.id, name: t.name, icon: t.icon || "" })} className="rounded p-1 hover:bg-muted"><Pencil className="h-3.5 w-3.5" /></button>
                  <button title="Delete" onClick={() => del(t)} className="rounded p-1 text-rose-600 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {cats.filter((c) => c.parent_id === t.id).map((s) => (
                  <span key={s.id} className="group inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px]">{s.name}<button onClick={() => del(s)} className="text-rose-500 opacity-0 group-hover:opacity-100"><X className="h-3 w-3" /></button></span>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-1">
                <input value={subInput[t.id] || ""} onChange={(e) => setSubInput((s) => ({ ...s, [t.id]: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addSub(t.id)} placeholder="Add subcategory…" className="h-7 flex-1 rounded-lg border border-border bg-background px-2 text-[11px] outline-none" />
                <button onClick={() => addSub(t.id)} className="grid h-7 w-7 place-items-center rounded-lg bg-india-green text-white"><Plus className="h-3.5 w-3.5" /></button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      <AnimatePresence>
        {edit && (
          <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setEdit(null)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="w-full max-w-sm rounded-2xl bg-card p-5 shadow-elev" onClick={(e) => e.stopPropagation()} initial={{ scale: 0.95, y: 16, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, y: 16, opacity: 0 }}>
              <p className="mb-3 text-sm font-bold">Edit category</p>
              <div className="flex gap-2">
                <input value={edit.icon} onChange={(e) => setEdit({ ...edit, icon: e.target.value })} placeholder="🛍️" maxLength={2} className="h-9 w-14 rounded-lg border border-border bg-background text-center text-base" />
                <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} onKeyDown={(e) => e.key === "Enter" && saveEdit()} className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-sm" />
              </div>
              <div className="mt-4 flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => setEdit(null)}>Cancel</Button><Button size="sm" onClick={saveEdit} className="bg-india-green text-white"><Save className="h-4 w-4" /> Save</Button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ================================================================ TAGS
function TagsManager() {
  const [tags, setTags] = useState<TagT[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState(""); const [color, setColor] = useState("#1F7A3D");
  const [edit, setEdit] = useState<TagT | null>(null);
  const PALETTE = ["#1F7A3D", "#2563eb", "#f59e0b", "#e11d48", "#7c3aed", "#EA580C", "#0891b2", "#65a30d"];

  async function load() {
    setLoading(true);
    const [t, p] = await Promise.all([
      supabase.from("estore_tags").select("*").order("sort_order"),
      supabase.from("estore_products").select("tags"),
    ]);
    setTags((t.data as TagT[]) ?? []);
    const c: Record<string, number> = {};
    ((p.data as { tags: string[] }[]) ?? []).forEach((row) => (row.tags ?? []).forEach((tag) => { c[tag] = (c[tag] || 0) + 1; }));
    setCounts(c);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!name.trim()) return toast.error("Enter a tag name");
    await ensureStaffSession();
    const { error } = await supabase.from("estore_tags").insert({ name: name.trim(), color, sort_order: tags.length + 1, active: true });
    if (error) return toast.error(error.message.includes("duplicate") ? "Tag already exists" : "Could not add", { description: error.message });
    setName(""); toast.success("Tag created"); load();
  };
  const saveEdit = async () => {
    if (!edit || !edit.name.trim()) return;
    await ensureStaffSession();
    const { error } = await supabase.from("estore_tags").update({ name: edit.name.trim(), color: edit.color, active: edit.active }).eq("id", edit.id);
    if (error) return toast.error(error.message);
    setEdit(null); toast.success("Saved"); load();
  };
  const toggleActive = async (t: TagT) => { await ensureStaffSession(); await supabase.from("estore_tags").update({ active: !t.active }).eq("id", t.id); load(); };
  const del = async (t: TagT) => { if (!confirm(`Delete tag "${t.name}"?`)) return; await ensureStaffSession(); const { error } = await supabase.from("estore_tags").delete().eq("id", t.id); if (error) return toast.error(error.message); toast.success("Deleted"); load(); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
        <label className="flex-1"><span className="mb-1 block text-xs font-semibold text-muted-foreground">Tag name</span><input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="e.g. Bestseller" className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label>
        <div><span className="mb-1 block text-xs font-semibold text-muted-foreground">Colour</span>
          <div className="flex items-center gap-1">
            {PALETTE.map((c) => <button key={c} onClick={() => setColor(c)} className={`h-7 w-7 rounded-full ring-2 ring-offset-1 ${color === c ? "ring-foreground" : "ring-transparent"}`} style={{ background: c }} />)}
          </div>
        </div>
        <Button size="sm" onClick={add} className="bg-india-green text-white"><Plus className="h-4 w-4" /> Create tag</Button>
      </div>

      {loading ? <SkeletonGrid /> : tags.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">No tags yet. Create your first above.</div>
      ) : (
        <motion.div variants={listV} initial="initial" animate="animate" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tags.map((t) => (
            <motion.div key={t.id} variants={itemV} layout className={`flex items-center justify-between rounded-2xl border border-border bg-card p-3 shadow-soft ${!t.active ? "opacity-60" : ""}`}>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-white" style={{ background: t.color }}><Tag className="h-3 w-3" /> {t.name}</span>
                <span className="text-[11px] text-muted-foreground">{counts[t.name] || 0} product{(counts[t.name] || 0) !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <button title={t.active ? "Hide" : "Show"} onClick={() => toggleActive(t)} className="rounded p-1 hover:bg-muted">{t.active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</button>
                <button title="Edit" onClick={() => setEdit(t)} className="rounded p-1 hover:bg-muted"><Pencil className="h-3.5 w-3.5" /></button>
                <button title="Delete" onClick={() => del(t)} className="rounded p-1 text-rose-600 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      <AnimatePresence>
        {edit && (
          <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setEdit(null)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="w-full max-w-sm rounded-2xl bg-card p-5 shadow-elev" onClick={(e) => e.stopPropagation()} initial={{ scale: 0.95, y: 16, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, y: 16, opacity: 0 }}>
              <p className="mb-3 text-sm font-bold">Edit tag</p>
              <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" />
              <div className="mt-3 flex items-center gap-1">{PALETTE.map((c) => <button key={c} onClick={() => setEdit({ ...edit, color: c })} className={`h-7 w-7 rounded-full ring-2 ring-offset-1 ${edit.color === c ? "ring-foreground" : "ring-transparent"}`} style={{ background: c }} />)}</div>
              <label className="mt-3 flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} className="h-4 w-4" /> Active</label>
              <div className="mt-4 flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => setEdit(null)}>Cancel</Button><Button size="sm" onClick={saveEdit} className="bg-india-green text-white"><Save className="h-4 w-4" /> Save</Button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
function SkeletonGrid() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl border border-border bg-muted/40" />)}
    </div>
  );
}

// ================================================================ INVENTORY
function Inventory() {
  const [rows, setRows] = useState<Product[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [ledger, setLedger] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(""); const [filter, setFilter] = useState<"all" | "low" | "out">("all");
  const [adjust, setAdjust] = useState<{ p: Product; delta: number; reason: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      await ensureStaffSession();
      const [p, c, l] = await Promise.all([
        supabase.from("estore_products").select("*").order("stock_qty", { ascending: true }),
        supabase.from("estore_categories").select("*").order("sort_order"),
        (supabase as any).rpc("estore_stock_ledger", { _limit: 60 }),
      ]);
      setRows((p.data as Product[]) ?? []);
      setCats((c.data as Cat[]) ?? []);
      setLedger((l.data as Movement[]) ?? []);
    } catch (e: any) { toast.error("Could not load", { description: e.message }); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const catName = (id: string | null) => { const c = cats.find((x) => x.id === id); if (!c) return "—"; const parent = cats.find((x) => x.id === c.parent_id); return parent ? `${parent.name} › ${c.name}` : c.name; };
  const filtered = rows.filter((r) => {
    if (filter === "low" && !(r.stock_qty > 0 && r.stock_qty <= r.low_stock_at)) return false;
    if (filter === "out" && r.stock_qty > 0) return false;
    if (q.trim() && !`${r.name} ${r.sku ?? ""}`.toLowerCase().includes(q.trim().toLowerCase())) return false;
    return true;
  });
  const totalUnits = rows.reduce((a, r) => a + r.stock_qty, 0);
  const stockValue = rows.reduce((a, r) => a + r.stock_qty * (r.offer_price || r.selling_price), 0);
  const lowCount = rows.filter((r) => r.stock_qty > 0 && r.stock_qty <= r.low_stock_at).length;
  const outCount = rows.filter((r) => r.stock_qty <= 0).length;

  const doAdjust = async () => {
    if (!adjust || !adjust.delta) return toast.error("Enter a non-zero change");
    setBusy(true);
    try {
      await ensureStaffSession();
      const { error } = await (supabase as any).rpc("estore_adjust_stock", { _product: adjust.p.id, _change: adjust.delta, _reason: adjust.reason || "manual adjustment" });
      if (error) throw error;
      toast.success(`Stock ${adjust.delta > 0 ? "added" : "reduced"} · ${adjust.p.name}`);
      setAdjust(null); load();
    } catch (e: any) { toast.error("Could not adjust", { description: e.message }); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <motion.div variants={listV} initial="initial" animate="animate" className="grid gap-3 sm:grid-cols-4">
        {[
          { icon: <Boxes className="h-4 w-4" />, label: "Total units", value: totalUnits.toLocaleString("en-IN") },
          { icon: <IndianRupee className="h-4 w-4" />, label: "Stock value", value: inr(stockValue) },
          { icon: <AlertTriangle className="h-4 w-4 text-amber-600" />, label: "Low stock", value: String(lowCount) },
          { icon: <X className="h-4 w-4 text-rose-600" />, label: "Out of stock", value: String(outCount) },
        ].map((s) => (
          <motion.div key={s.label} variants={itemV} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{s.icon} {s.label}</p>
            <p className="mt-1 text-2xl font-extrabold">{s.value}</p>
          </motion.div>
        ))}
      </motion.div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {(["all", "low", "out"] as const).map((k) => (
            <button key={k} onClick={() => setFilter(k)} className={`rounded-full px-3 h-8 text-xs font-semibold capitalize ${filter === k ? "bg-india-green text-white" : "border border-border bg-card hover:bg-muted"}`}>{k === "all" ? "All" : k === "low" ? "Low stock" : "Out of stock"}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative"><Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="h-8 w-48 rounded-lg border border-border bg-background pl-8 pr-2 text-xs outline-none" /></div>
          <Button size="sm" variant="outline" onClick={load}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-3 py-2">Product</th><th className="px-3 py-2">Category</th><th className="px-3 py-2 text-center">Stock</th><th className="px-3 py-2 text-right">Value</th><th className="px-3 py-2 text-right">Adjust</th></tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={5} className="px-3 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
                : filtered.length === 0 ? <tr><td colSpan={5} className="px-3 py-10 text-center text-muted-foreground">No products.</td></tr>
                : filtered.map((p) => {
                  const out = p.stock_qty <= 0, low = p.stock_qty > 0 && p.stock_qty <= p.low_stock_at;
                  return (
                    <tr key={p.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-3 py-2"><div className="flex items-center gap-2"><div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-muted/40">{p.image_paths?.[0] ? <img src={imgUrl(p.image_paths[0])} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-muted-foreground"><Package className="h-4 w-4" /></div>}</div><div><p className="font-semibold">{p.name}</p><p className="text-[11px] text-muted-foreground">{p.sku || "—"} · alert ≤ {p.low_stock_at}</p></div></div></td>
                      <td className="px-3 py-2 text-xs">{catName(p.category_id)}</td>
                      <td className="px-3 py-2 text-center"><span className={`inline-block min-w-[2.5rem] rounded-full px-2 py-0.5 text-sm font-bold ${out ? "bg-rose-100 text-rose-700" : low ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{p.stock_qty}</span></td>
                      <td className="px-3 py-2 text-right text-xs">{inr(p.stock_qty * (p.offer_price || p.selling_price))}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex gap-1">
                          <button onClick={() => setAdjust({ p, delta: 10, reason: "restock" })} className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 px-2 h-7 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50"><ArrowUp className="h-3 w-3" /> Add</button>
                          <button onClick={() => setAdjust({ p, delta: -1, reason: "correction" })} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 h-7 text-[11px] font-semibold hover:bg-muted"><ArrowDown className="h-3 w-3" /> Reduce</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-bold"><ClipboardList className="h-4 w-4 text-india-green" /> Stock movements</p>
          <div className="max-h-[28rem] space-y-2 overflow-y-auto">
            {ledger.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No movements yet.</p>
              : ledger.map((m) => (
                <div key={m.id} className="flex items-start justify-between gap-2 rounded-xl border border-border p-2">
                  <div><p className="text-xs font-semibold">{m.product_name}</p><p className="text-[10px] text-muted-foreground">{m.reason} · {new Date(m.created_at).toLocaleString("en-IN")}</p></div>
                  <div className="text-right"><span className={`text-sm font-bold ${m.change >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{m.change >= 0 ? "+" : ""}{m.change}</span><p className="text-[10px] text-muted-foreground">→ {m.balance_after}</p></div>
                </div>
              ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {adjust && (
          <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setAdjust(null)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="w-full max-w-sm rounded-2xl bg-card p-5 shadow-elev" onClick={(e) => e.stopPropagation()} initial={{ scale: 0.95, y: 16, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, y: 16, opacity: 0 }} transition={{ type: "spring", stiffness: 320, damping: 28 }}>
              <p className="text-sm font-bold">Adjust stock — {adjust.p.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Current: <b>{adjust.p.stock_qty}</b> → New: <b>{adjust.p.stock_qty + adjust.delta}</b></p>
              <div className="mt-3 flex items-center gap-2">
                <button onClick={() => setAdjust({ ...adjust, delta: adjust.delta - 1 })} className="grid h-9 w-9 place-items-center rounded-lg border border-border hover:bg-muted"><ArrowDown className="h-4 w-4" /></button>
                <input type="number" value={adjust.delta} onChange={(e) => setAdjust({ ...adjust, delta: +e.target.value })} className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-center text-sm font-bold" />
                <button onClick={() => setAdjust({ ...adjust, delta: adjust.delta + 1 })} className="grid h-9 w-9 place-items-center rounded-lg border border-border hover:bg-muted"><ArrowUp className="h-4 w-4" /></button>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">Positive adds stock, negative reduces it.</p>
              <input value={adjust.reason} onChange={(e) => setAdjust({ ...adjust, reason: e.target.value })} placeholder="Reason (e.g. restock, damage, correction)" className="mt-3 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" />
              <div className="mt-4 flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => setAdjust(null)}>Cancel</Button>
                <Button size="sm" onClick={doAdjust} disabled={busy} className="bg-india-green text-white">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Apply</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ================================================================ ORDERS
function Orders() {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(""); const [st, setSt] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [events, setEvents] = useState<OrderEvent[]>([]);
  const [staff, setStaff] = useState<StaffT[]>([]);
  const [agents, setAgents] = useState<AgentT[]>([]);
  const [invoice, setInvoice] = useState<OrderDetail | null>(null);
  const [agentsOpen, setAgentsOpen] = useState(false);

  async function load() { setLoading(true); try { await ensureStaffSession(); const { data, error } = await (supabase as any).rpc("estore_admin_orders", { _limit: 1000 }); if (error) throw error; setRows((data as OrderRow[]) ?? []); } catch (e: any) { toast.error("Could not load orders", { description: e.message }); } finally { setLoading(false); } }
  async function loadRefs() {
    try {
      await ensureStaffSession();
      const [s, a] = await Promise.all([
        (supabase as any).rpc("estore_staff_list"),
        supabase.from("estore_delivery_agents").select("*").order("name"),
      ]);
      setStaff((s.data as StaffT[]) ?? []);
      setAgents((a.data as AgentT[]) ?? []);
    } catch { /* ignore */ }
  }
  useEffect(() => { load(); loadRefs(); }, []);

  const loadEvents = async (orderId: string) => {
    try { const { data } = await (supabase as any).rpc("estore_order_events", { _order: orderId }); setEvents((data as OrderEvent[]) ?? []); }
    catch { setEvents([]); }
  };
  const openDetail = async (o: { id: string; order_no?: string; retailer_name?: string | null; jsko_id?: string | null }) => {
    setDetailLoading(true); setEvents([]); setDetail({ order: { id: o.id, order_no: o.order_no }, retailer_name: o.retailer_name ?? null, jsko_id: o.jsko_id ?? null, items: [] });
    try {
      await ensureStaffSession();
      const [{ data, error }] = await Promise.all([(supabase as any).rpc("estore_order_detail", { _order: o.id }), loadEvents(o.id)]);
      if (error) throw error;
      setDetail(data as OrderDetail);
    } catch (e: any) { toast.error("Could not load order", { description: e.message }); setDetail(null); }
    finally { setDetailLoading(false); }
  };

  const setStatus = async (o: { id: string }, status: string, cur?: OrderRow) => {
    let courier = cur?.courier ?? null, tracking = cur?.tracking_no ?? null;
    if (status === "shipped") {
      courier = prompt("Courier name:", courier || "") || courier;
      tracking = prompt("Tracking number:", tracking || "") || tracking;
    }
    if (status === "cancelled" && !confirm("Cancel this order? Stock will be restored.")) return;
    setBusy(o.id);
    const { error } = await (supabase as any).rpc("estore_set_order_status", { _order: o.id, _status: status, _courier: courier, _tracking: tracking });
    setBusy(null);
    if (error) return toast.error("Could not update", { description: error.message });
    toast.success(`Order ${status}${status === "delivered" ? " — margins credited" : ""}`);
    load();
    if (detail) openDetail({ id: o.id });
  };

  const assign = async (orderId: string, staffId: string | null, agentId: string | null) => {
    setBusy(orderId);
    const { error } = await (supabase as any).rpc("estore_assign_order", { _order: orderId, _staff: staffId, _agent: agentId, _note: "Order assignment updated" });
    setBusy(null);
    if (error) return toast.error("Could not assign", { description: error.message });
    toast.success("Assignment saved");
    load(); if (detail) openDetail({ id: orderId });
  };

  const filtered = rows.filter((r) => {
    if (st !== "all" && r.status !== st) return false;
    const s = q.trim().toLowerCase();
    if (s && !`${r.order_no} ${r.retailer_name ?? ""} ${r.jsko_id ?? ""} ${r.ship_phone ?? ""} ${r.tracking_no ?? ""}`.toLowerCase().includes(s)) return false;
    return true;
  });
  const paid = rows.filter((r) => r.payment_status === "paid");
  const sum = (l: OrderRow[], f: (r: OrderRow) => number) => l.reduce((a, r) => a + Number(f(r) || 0), 0);

  const exportCsv = () => {
    if (!filtered.length) return toast.error("Nothing to export");
    const head = ["Order", "Date", "JSKO ID", "Retailer", "Ship To", "Phone", "City", "Pincode", "Items", "Total", "Payment", "Status", "Courier", "Tracking", "Retailer Margin", "Distributor", "BharatOne", "Settled"];
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const body = filtered.map((r) => [r.order_no, new Date(r.created_at).toLocaleString("en-IN"), r.jsko_id, r.retailer_name, r.ship_name, r.ship_phone, r.ship_city, r.ship_pincode, r.items, r.total, r.payment_status, r.status, r.courier, r.tracking_no, r.retailer_margin_total, r.distributor_commission_total, r.bharatone_commission_total, r.commission_settled ? "Yes" : "No"]);
    const csv = [head.map(esc).join(","), ...body.map((x) => x.map(esc).join(","))].join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `estore_orders_${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <motion.div variants={listV} initial="initial" animate="animate" className="grid gap-3 sm:grid-cols-4">
        {[
          { icon: <TrendingUp className="h-4 w-4" />, label: "Orders", value: String(rows.length), sub: `${paid.length} paid` },
          { icon: <IndianRupee className="h-4 w-4" />, label: "Sales (paid)", value: inr(sum(paid, (r) => r.total)) },
          { icon: <Boxes className="h-4 w-4" />, label: "Payouts (R+D)", value: inr(sum(paid, (r) => r.retailer_margin_total + r.distributor_commission_total)) },
          { icon: <ShoppingBag className="h-4 w-4" />, label: "BharatOne margin", value: inr(sum(paid, (r) => r.bharatone_commission_total)) },
        ].map((s) => (
          <motion.div key={s.label} variants={itemV} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{s.icon} {s.label}</p>
            <p className="mt-1 text-2xl font-extrabold">{s.value}</p>{s.sub && <p className="text-xs text-muted-foreground">{s.sub}</p>}
          </motion.div>
        ))}
      </motion.div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {["all", "pending_payment", "placed", "confirmed", "packed", "shipped", "delivered", "cancelled"].map((k) => (
            <button key={k} onClick={() => setSt(k)} className={`rounded-full px-3 h-8 text-xs font-semibold capitalize ${st === k ? "bg-india-green text-white" : "border border-border bg-card hover:bg-muted"}`}>{k.replace(/_/g, " ")}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative"><Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Order, retailer, tracking…" className="h-8 w-52 rounded-lg border border-border bg-background pl-8 pr-2 text-xs outline-none" /></div>
          <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-8 text-xs font-semibold hover:bg-muted"><Download className="h-3.5 w-3.5" /> Export</button>
          <Button size="sm" variant="outline" onClick={load}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr><th className="px-3 py-2">Order</th><th className="px-3 py-2">Retailer</th><th className="px-3 py-2">Ship to</th><th className="px-3 py-2">Total</th><th className="px-3 py-2">Payment</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Open</th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
              : filtered.length === 0 ? <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">No orders.</td></tr>
              : filtered.map((o) => (
                <tr key={o.id} className="cursor-pointer border-t border-border hover:bg-muted/30" onClick={() => openDetail(o)}>
                  <td className="px-3 py-2"><p className="font-semibold">{o.order_no}</p><p className="text-[11px] text-muted-foreground">{new Date(o.created_at).toLocaleDateString("en-IN")} · {o.items} item(s)</p></td>
                  <td className="px-3 py-2"><p className="text-sm">{o.retailer_name ?? "—"}</p><p className="text-[11px] font-mono text-muted-foreground">{o.jsko_id}</p></td>
                  <td className="px-3 py-2 text-xs">{o.ship_name}<div className="text-muted-foreground">{o.ship_city} {o.ship_pincode} · {o.ship_phone}</div>{o.tracking_no && <div className="text-[11px]">{o.courier}: {o.tracking_no}</div>}</td>
                  <td className="px-3 py-2 font-semibold">{inr(o.total)}<div className="text-[10px] text-muted-foreground">R {inr(o.retailer_margin_total)} · Co {inr(o.bharatone_commission_total)}</div></td>
                  <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${tone[o.payment_status] ?? "bg-muted"}`}>{o.payment_status}</span></td>
                  <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${tone[o.status] ?? "bg-muted"}`}>{o.status.replace(/_/g, " ")}</span>{o.commission_settled && <div className="mt-0.5 text-[10px] font-semibold text-emerald-600">settled</div>}</td>
                  <td className="px-3 py-2 text-right"><ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" /></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {detail && (
          <OrderDrawer detail={detail} loading={detailLoading} busy={busy} events={events} staff={staff} agents={agents}
            onClose={() => setDetail(null)}
            onStatus={(status) => setStatus({ id: detail.order.id }, status, rows.find((r) => r.id === detail.order.id))}
            onAssign={(s, a) => assign(detail.order.id, s, a)}
            onManageAgents={() => setAgentsOpen(true)}
            onInvoice={() => setInvoice(detail)} />
        )}
      </AnimatePresence>
      <AnimatePresence>{invoice && <InvoiceModal detail={invoice} onClose={() => setInvoice(null)} />}</AnimatePresence>
      <AnimatePresence>{agentsOpen && <AgentsModal onClose={() => setAgentsOpen(false)} onChanged={loadRefs} />}</AnimatePresence>
    </div>
  );
}

function OrderDrawer({ detail, loading, busy, events, staff, agents, onClose, onStatus, onAssign, onManageAgents, onInvoice }: {
  detail: OrderDetail; loading: boolean; busy: string | null; events: OrderEvent[]; staff: StaffT[]; agents: AgentT[];
  onClose: () => void; onStatus: (s: string) => void; onAssign: (staffId: string | null, agentId: string | null) => void; onManageAgents: () => void; onInvoice: () => void;
}) {
  const o = detail.order || {};
  const nextStatuses = STATUSES.filter((s) => s !== o.status);
  const isPaid = o.payment_status === "paid";
  const closed = o.status === "delivered" || o.status === "cancelled";
  const [selStaff, setSelStaff] = useState<string>(o.assigned_staff || "");
  const [selAgent, setSelAgent] = useState<string>(o.assigned_agent || "");
  useEffect(() => { setSelStaff(o.assigned_staff || ""); setSelAgent(o.assigned_agent || ""); }, [o.id, o.assigned_staff, o.assigned_agent]);
  const dirty = selStaff !== (o.assigned_staff || "") || selAgent !== (o.assigned_agent || "");

  return (
    <motion.div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="flex h-full w-full max-w-lg flex-col bg-card shadow-elev" onClick={(e) => e.stopPropagation()}
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 320, damping: 34 }}>
        <div className="flex items-center justify-between border-b border-border p-4">
          <div><p className="text-sm font-bold">{o.order_no}</p><p className="text-[11px] text-muted-foreground">{o.created_at ? new Date(o.created_at).toLocaleString("en-IN") : ""}{o.order_for ? ` · for ${o.order_for}` : ""}</p></div>
          <div className="flex items-center gap-2">
            <button onClick={onInvoice} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-8 text-xs font-semibold hover:bg-muted"><FileText className="h-3.5 w-3.5" /> Invoice</button>
            <button onClick={onClose}><X className="h-5 w-5" /></button>
          </div>
        </div>

        {loading ? <div className="grid flex-1 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : (
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            <div className="flex flex-wrap gap-2">
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${tone[o.status] ?? "bg-muted"}`}>{String(o.status || "").replace(/_/g, " ")}</span>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${tone[o.payment_status] ?? "bg-muted"}`}>Payment: {o.payment_status}</span>
              {o.commission_settled && <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700">Margins settled</span>}
            </div>

            {/* Assignment */}
            <Section title="Assignment">
              <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">Processing staff</label>
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 shrink-0 text-india-green" />
                <select value={selStaff} onChange={(e) => setSelStaff(e.target.value)} className="h-9 flex-1 rounded-lg border border-border bg-background px-2 text-sm">
                  <option value="">— unassigned —</option>
                  {staff.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.role}</option>)}
                </select>
              </div>
              <label className="mb-1 mt-3 block text-[11px] font-semibold text-muted-foreground">Delivery agent</label>
              <div className="flex items-center gap-2">
                <Bike className="h-4 w-4 shrink-0 text-india-green" />
                <select value={selAgent} onChange={(e) => setSelAgent(e.target.value)} className="h-9 flex-1 rounded-lg border border-border bg-background px-2 text-sm">
                  <option value="">— unassigned —</option>
                  {agents.filter((a) => a.active || a.id === selAgent).map((a) => <option key={a.id} value={a.id}>{a.name}{a.area ? ` · ${a.area}` : ""}</option>)}
                </select>
                <button onClick={onManageAgents} title="Manage agents" className="grid h-9 w-9 place-items-center rounded-lg border border-border hover:bg-muted"><UserPlus className="h-4 w-4" /></button>
              </div>
              <button disabled={!dirty || !!busy} onClick={() => onAssign(selStaff || null, selAgent || null)} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-india-green px-3 h-9 text-xs font-bold text-white disabled:opacity-40">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save assignment
              </button>
            </Section>

            {/* Tracking timeline */}
            <Section title="Tracking timeline">
              {events.length === 0 ? <p className="text-xs text-muted-foreground">No updates yet.</p> : (
                <ol className="relative ml-1 space-y-3 border-l border-border pl-4">
                  {events.map((e, i) => (
                    <li key={i} className="relative">
                      <span className={`absolute -left-[21px] top-0.5 grid h-3.5 w-3.5 place-items-center rounded-full ${i === events.length - 1 ? "bg-india-green" : "bg-muted-foreground/40"}`}><Circle className="h-1.5 w-1.5 fill-white text-white" /></span>
                      <p className="text-sm font-semibold capitalize">{e.status ? e.status.replace(/_/g, " ") : e.note}</p>
                      {e.status && e.note && <p className="text-[11px] text-muted-foreground">{e.note}</p>}
                      <p className="text-[10px] text-muted-foreground">{new Date(e.created_at).toLocaleString("en-IN")}{e.actor_name ? ` · ${e.actor_name}` : ""}</p>
                    </li>
                  ))}
                </ol>
              )}
            </Section>

            <Section title="Customer">
              <p className="text-sm font-semibold">{detail.retailer_name ?? "—"} {detail.jsko_id ? <span className="font-mono text-xs text-muted-foreground">· {detail.jsko_id}</span> : null}</p>
              <p className="text-sm">{o.ship_name} · {o.ship_phone}{o.contact_email ? ` · ${o.contact_email}` : ""}</p>
              <p className="text-xs text-muted-foreground">{[o.ship_line, o.ship_landmark, o.ship_city, o.ship_state, o.ship_pincode].filter(Boolean).join(", ")}</p>
            </Section>

            <Section title={`Items (${detail.items?.length ?? 0})`}>
              <div className="space-y-2">
                {(detail.items ?? []).map((it: any) => (
                  <div key={it.id} className="flex items-center gap-3 rounded-xl border border-border p-2">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted/40">{it.image_path ? <img src={imgUrl(it.image_path)} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-muted-foreground"><Package className="h-5 w-5" /></div>}</div>
                    <div className="flex-1"><p className="text-sm font-semibold">{it.name}</p><p className="text-[11px] text-muted-foreground">{inr(it.unit_price)} × {it.qty} · GST {it.gst_rate}%</p></div>
                    <p className="text-sm font-bold">{inr(it.line_total)}</p>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Payment summary">
              <Row k="Subtotal" v={inr(o.subtotal)} />
              <Row k="GST" v={inr(o.gst_amount)} />
              <Row k="Shipping" v={inr(o.shipping_fee)} />
              <Row k="Total" v={inr(o.total)} bold />
              {o.razorpay_payment_id && <p className="mt-1 text-[11px] text-muted-foreground">Razorpay payment: <span className="font-mono">{o.razorpay_payment_id}</span></p>}
              {o.razorpay_order_id && <p className="text-[11px] text-muted-foreground">Razorpay order: <span className="font-mono">{o.razorpay_order_id}</span></p>}
            </Section>

            <Section title="Earnings">
              <Row k="Retailer margin" v={inr(o.retailer_margin_total)} />
              <Row k="Distributor commission" v={inr(o.distributor_commission_total)} />
              <Row k="BharatOne commission" v={inr(o.bharatone_commission_total)} />
            </Section>

            {(o.courier || o.tracking_no) && (
              <Section title="Shipment"><p className="text-sm">{o.courier} · <span className="font-mono">{o.tracking_no}</span></p></Section>
            )}
          </div>
        )}

        {!loading && (
          <div className="border-t border-border p-4">
            {closed ? <p className="text-center text-xs text-muted-foreground">Order {o.status}. No further actions.</p>
              : !isPaid ? <p className="text-center text-xs text-amber-600">Awaiting payment — actions unlock once paid.</p>
              : (
                <div className="flex flex-wrap gap-2">
                  {nextStatuses.map((s) => (
                    <button key={s} disabled={!!busy} onClick={() => onStatus(s)}
                      className={`inline-flex items-center gap-1 rounded-lg px-3 h-9 text-xs font-bold capitalize disabled:opacity-50 ${s === "cancelled" ? "border border-rose-300 text-rose-600 hover:bg-rose-50" : s === "delivered" ? "bg-emerald-600 text-white" : "bg-india-green text-white"}`}>
                      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : s === "delivered" ? <CheckCircle2 className="h-3.5 w-3.5" /> : s === "shipped" ? <Truck className="h-3.5 w-3.5" /> : null} {s}
                    </button>
                  ))}
                </div>
              )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// in-app invoice modal (visible, printable)
function InvoiceModal({ detail, onClose }: { detail: OrderDetail; onClose: () => void }) {
  const o = detail.order || {};
  const items = detail.items ?? [];
  const gstOf = (it: any) => Number(it.line_total || 0) * Number(it.gst_rate || 0) / 100;
  return (
    <motion.div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-elev" onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.96, y: 16, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.96, y: 16, opacity: 0 }}>
        <div className="flex items-center justify-between border-b border-border bg-card p-3">
          <p className="text-sm font-bold">Tax Invoice · {o.order_no}</p>
          <div className="flex items-center gap-2">
            <button onClick={() => printInvoice(detail)} className="inline-flex items-center gap-1.5 rounded-lg bg-india-green px-3 h-8 text-xs font-bold text-white"><Printer className="h-3.5 w-3.5" /> Print / Save PDF</button>
            <button onClick={onClose}><X className="h-5 w-5" /></button>
          </div>
        </div>
        <div className="overflow-y-auto p-5 text-[#111]">
          <div className="flex items-start justify-between border-b-2 border-india-green pb-3">
            <div><p className="text-lg font-extrabold text-india-green">{SELLER.brand}</p><p className="text-[11px] text-muted-foreground">{SELLER.name}</p></div>
            <div className="text-right"><p className="text-base font-extrabold">TAX INVOICE</p><p className="text-[11px] text-muted-foreground">{o.order_no}</p><p className="text-[11px] text-muted-foreground">{o.created_at ? new Date(o.created_at).toLocaleDateString("en-IN") : ""}</p></div>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border p-3 text-sm"><p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">Bill / Ship to</p><p className="font-semibold">{o.ship_name}</p><p>{o.ship_phone}</p><p className="text-xs text-muted-foreground">{[o.ship_line, o.ship_landmark, o.ship_city, o.ship_state, o.ship_pincode].filter(Boolean).join(", ")}</p></div>
            <div className="rounded-xl border border-border p-3 text-sm"><p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">Order</p><p>Retailer: <b>{detail.retailer_name || "—"}</b></p><p>JSKO: {detail.jsko_id || "—"}</p><p>Payment: <b className="capitalize">{o.payment_status}</b></p></div>
          </div>
          <table className="mt-4 w-full border-collapse text-sm">
            <thead><tr className="bg-muted/50 text-left text-[11px] uppercase text-muted-foreground"><th className="p-2">Item</th><th className="p-2 text-center">Qty</th><th className="p-2 text-right">Rate</th><th className="p-2 text-right">Taxable</th><th className="p-2 text-center">GST</th><th className="p-2 text-right">Amount</th></tr></thead>
            <tbody>
              {items.map((it: any) => (
                <tr key={it.id} className="border-b border-border"><td className="p-2">{it.name}</td><td className="p-2 text-center">{it.qty}</td><td className="p-2 text-right">{inr(it.unit_price)}</td><td className="p-2 text-right">{inr(it.line_total)}</td><td className="p-2 text-center">{it.gst_rate}%</td><td className="p-2 text-right">{inr(Number(it.line_total) + gstOf(it))}</td></tr>
              ))}
            </tbody>
          </table>
          <div className="ml-auto mt-4 w-64 text-sm">
            <div className="flex justify-between py-0.5"><span>Subtotal</span><span>{inr(o.subtotal)}</span></div>
            <div className="flex justify-between py-0.5"><span>GST</span><span>{inr(o.gst_amount)}</span></div>
            <div className="flex justify-between py-0.5"><span>Shipping</span><span>{inr(o.shipping_fee)}</span></div>
            <div className="mt-1 flex justify-between border-t-2 border-india-green pt-2 text-base font-extrabold"><span>Grand Total</span><span>{inr(o.total)}</span></div>
          </div>
          <p className="mt-6 text-center text-[11px] text-muted-foreground">Computer-generated invoice from {SELLER.brand}. Thank you for your business.</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// delivery agents manager
function AgentsModal({ onClose, onChanged }: { onClose: () => void; onChanged: () => void }) {
  const [rows, setRows] = useState<AgentT[]>([]);
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState({ name: "", phone: "", area: "" });
  async function load() { setLoading(true); const { data } = await supabase.from("estore_delivery_agents").select("*").order("name"); setRows((data as AgentT[]) ?? []); setLoading(false); }
  useEffect(() => { load(); }, []);
  const add = async () => {
    if (!f.name.trim()) return toast.error("Enter agent name");
    await ensureStaffSession();
    const { error } = await supabase.from("estore_delivery_agents").insert({ name: f.name.trim(), phone: f.phone.trim() || null, area: f.area.trim() || null, active: true });
    if (error) return toast.error(error.message);
    setF({ name: "", phone: "", area: "" }); toast.success("Agent added"); load(); onChanged();
  };
  const toggle = async (a: AgentT) => { await ensureStaffSession(); await supabase.from("estore_delivery_agents").update({ active: !a.active }).eq("id", a.id); load(); onChanged(); };
  const del = async (a: AgentT) => { if (!confirm(`Delete "${a.name}"?`)) return; await ensureStaffSession(); const { error } = await supabase.from("estore_delivery_agents").delete().eq("id", a.id); if (error) return toast.error(error.message); load(); onChanged(); };
  return (
    <motion.div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="w-full max-w-md rounded-2xl bg-card p-5 shadow-elev" onClick={(e) => e.stopPropagation()} initial={{ scale: 0.96, y: 16, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.96, y: 16, opacity: 0 }}>
        <div className="mb-3 flex items-center justify-between"><p className="flex items-center gap-1.5 text-sm font-bold"><Bike className="h-4 w-4 text-india-green" /> Delivery agents</p><button onClick={onClose}><X className="h-5 w-5" /></button></div>
        <div className="grid grid-cols-3 gap-2">
          <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Name *" className="h-9 rounded-lg border border-border bg-background px-2 text-sm" />
          <input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="Phone" className="h-9 rounded-lg border border-border bg-background px-2 text-sm" />
          <input value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} placeholder="Area" className="h-9 rounded-lg border border-border bg-background px-2 text-sm" />
        </div>
        <Button size="sm" onClick={add} className="mt-2 w-full bg-india-green text-white"><Plus className="h-4 w-4" /> Add agent</Button>
        <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
          {loading ? <div className="py-6 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
            : rows.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No agents yet.</p>
            : rows.map((a) => (
              <div key={a.id} className={`flex items-center justify-between rounded-xl border border-border p-2 ${!a.active ? "opacity-60" : ""}`}>
                <div><p className="text-sm font-semibold">{a.name}</p><p className="text-[11px] text-muted-foreground">{[a.phone, a.area].filter(Boolean).join(" · ") || "—"}</p></div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <button onClick={() => toggle(a)} className="rounded p-1 hover:bg-muted">{a.active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</button>
                  <button onClick={() => del(a)} className="rounded p-1 text-rose-600 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// Invoices tab — searchable list of paid orders, opens the in-app invoice
function Invoices() {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [invoice, setInvoice] = useState<OrderDetail | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  async function load() { setLoading(true); try { await ensureStaffSession(); const { data, error } = await (supabase as any).rpc("estore_admin_orders", { _limit: 2000 }); if (error) throw error; setRows(((data as OrderRow[]) ?? []).filter((r) => r.payment_status === "paid")); } catch (e: any) { toast.error("Could not load", { description: e.message }); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  const open = async (o: OrderRow) => {
    setOpening(o.id);
    try { await ensureStaffSession(); const { data, error } = await (supabase as any).rpc("estore_order_detail", { _order: o.id }); if (error) throw error; setInvoice(data as OrderDetail); }
    catch (e: any) { toast.error("Could not open invoice", { description: e.message }); }
    finally { setOpening(null); }
  };
  const filtered = rows.filter((r) => !q.trim() || `${r.order_no} ${r.retailer_name ?? ""} ${r.ship_name ?? ""} ${r.jsko_id ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{filtered.length} invoice{filtered.length !== 1 ? "s" : ""} (paid orders)</p>
        <div className="flex items-center gap-2">
          <div className="relative"><Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Order, retailer…" className="h-8 w-52 rounded-lg border border-border bg-background pl-8 pr-2 text-xs outline-none" /></div>
          <Button size="sm" variant="outline" onClick={load}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr><th className="px-3 py-2">Invoice</th><th className="px-3 py-2">Retailer</th><th className="px-3 py-2">Bill to</th><th className="px-3 py-2">Total</th><th className="px-3 py-2">Date</th><th className="px-3 py-2 text-right">Invoice</th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="px-3 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
              : filtered.length === 0 ? <tr><td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">No paid orders yet.</td></tr>
              : filtered.map((o) => (
                <tr key={o.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-3 py-2 font-semibold">{o.order_no}</td>
                  <td className="px-3 py-2"><p className="text-sm">{o.retailer_name ?? "—"}</p><p className="text-[11px] font-mono text-muted-foreground">{o.jsko_id}</p></td>
                  <td className="px-3 py-2 text-xs">{o.ship_name}<div className="text-muted-foreground">{o.ship_city} {o.ship_pincode}</div></td>
                  <td className="px-3 py-2 font-bold">{inr(o.total)}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("en-IN")}</td>
                  <td className="px-3 py-2 text-right"><button onClick={() => open(o)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-8 text-xs font-semibold hover:bg-muted">{opening === o.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />} View</button></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <AnimatePresence>{invoice && <InvoiceModal detail={invoice} onClose={() => setInvoice(null)} />}</AnimatePresence>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-xl border border-border p-3"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</p>{children}</div>;
}
function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return <div className={`flex justify-between text-sm ${bold ? "font-extrabold" : "text-muted-foreground"}`}><span>{k}</span><span>{v}</span></div>;
}

// printable GST invoice (opens a new window)
function printInvoice(detail: OrderDetail) {
  const o = detail.order || {};
  const items = detail.items ?? [];
  const esc = (s: any) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
  const money = (n: any) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
  const rows = items.map((it: any) => {
    const taxable = Number(it.line_total || 0);
    const gst = taxable * Number(it.gst_rate || 0) / 100;
    return `<tr><td>${esc(it.name)}</td><td class="c">${it.qty}</td><td class="r">${money(it.unit_price)}</td><td class="r">${money(taxable)}</td><td class="c">${it.gst_rate || 0}%</td><td class="r">${money(gst)}</td><td class="r">${money(taxable + gst)}</td></tr>`;
  }).join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${esc(o.order_no)}</title>
  <style>
    *{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;box-sizing:border-box}
    body{margin:0;padding:32px;color:#111}
    .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1F7A3D;padding-bottom:16px}
    .brand{font-size:22px;font-weight:800;color:#1F7A3D}
    .muted{color:#666;font-size:12px}
    h1{font-size:18px;margin:0}
    .grid{display:flex;gap:24px;margin:20px 0}
    .box{flex:1;border:1px solid #e5e5e5;border-radius:10px;padding:12px}
    .box p{margin:2px 0;font-size:13px}
    .lbl{font-size:11px;text-transform:uppercase;color:#888;font-weight:700;margin-bottom:4px}
    table{width:100%;border-collapse:collapse;margin-top:8px;font-size:13px}
    th,td{padding:8px;border-bottom:1px solid #eee;text-align:left}
    th{background:#f5f7f5;font-size:11px;text-transform:uppercase;color:#555}
    .r{text-align:right}.c{text-align:center}
    .tot{margin-top:16px;margin-left:auto;width:280px;font-size:13px}
    .tot div{display:flex;justify-content:space-between;padding:4px 0}
    .grand{border-top:2px solid #1F7A3D;font-weight:800;font-size:15px;padding-top:8px!important}
    .foot{margin-top:32px;font-size:11px;color:#888;text-align:center}
    @media print{body{padding:0}.noprint{display:none}}
    .noprint{margin-bottom:16px}
    .btn{background:#1F7A3D;color:#fff;border:0;border-radius:8px;padding:10px 18px;font-weight:700;cursor:pointer}
  </style></head><body>
  <div class="noprint"><button class="btn" onclick="window.print()">Print / Save PDF</button></div>
  <div class="head">
    <div><div class="brand">${esc(SELLER.brand)}</div><div class="muted">${esc(SELLER.name)}</div></div>
    <div style="text-align:right"><h1>TAX INVOICE</h1><div class="muted">${esc(o.order_no)}</div><div class="muted">${o.created_at ? new Date(o.created_at).toLocaleDateString("en-IN") : ""}</div></div>
  </div>
  <div class="grid">
    <div class="box"><div class="lbl">Bill / Ship to</div><p><b>${esc(o.ship_name)}</b></p><p>${esc(o.ship_phone)}</p><p class="muted">${esc([o.ship_line, o.ship_landmark, o.ship_city, o.ship_state, o.ship_pincode].filter(Boolean).join(", "))}</p></div>
    <div class="box"><div class="lbl">Order details</div><p>Retailer: <b>${esc(detail.retailer_name || "—")}</b></p><p>JSKO ID: ${esc(detail.jsko_id || "—")}</p><p>Payment: <b>${esc(o.payment_status)}</b></p>${o.razorpay_payment_id ? `<p class="muted">Ref: ${esc(o.razorpay_payment_id)}</p>` : ""}</div>
  </div>
  <table><thead><tr><th>Item</th><th class="c">Qty</th><th class="r">Rate</th><th class="r">Taxable</th><th class="c">GST</th><th class="r">GST Amt</th><th class="r">Amount</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="tot">
    <div><span>Subtotal</span><span>${money(o.subtotal)}</span></div>
    <div><span>GST</span><span>${money(o.gst_amount)}</span></div>
    <div><span>Shipping</span><span>${money(o.shipping_fee)}</span></div>
    <div class="grand"><span>Grand Total</span><span>${money(o.total)}</span></div>
  </div>
  <div class="foot">This is a computer-generated invoice from ${esc(SELLER.brand)}. Thank you for your business.</div>
  </body></html>`;
  const w = window.open("", "_blank", "width=820,height=900");
  if (!w) { toast.error("Allow pop-ups to view the invoice"); return; }
  w.document.write(html); w.document.close();
}

// ================================================================ PAYMENTS
function Payments() {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(""); const [st, setSt] = useState("all");
  async function load() { setLoading(true); try { await ensureStaffSession(); const { data, error } = await (supabase as any).rpc("estore_admin_orders", { _limit: 1000 }); if (error) throw error; setRows((data as OrderRow[]) ?? []); } catch (e: any) { toast.error("Could not load", { description: e.message }); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);

  const paid = rows.filter((r) => r.payment_status === "paid");
  const pending = rows.filter((r) => r.payment_status === "pending_payment" || r.payment_status === "pending");
  const failed = rows.filter((r) => r.payment_status === "failed");
  const collected = paid.reduce((a, r) => a + Number(r.total || 0), 0);

  const filtered = rows.filter((r) => {
    if (st !== "all" && r.payment_status !== st) return false;
    const s = q.trim().toLowerCase();
    if (s && !`${r.order_no} ${r.retailer_name ?? ""} ${r.razorpay_payment_id ?? ""} ${r.razorpay_order_id ?? ""}`.toLowerCase().includes(s)) return false;
    return true;
  });

  const exportCsv = () => {
    if (!filtered.length) return toast.error("Nothing to export");
    const head = ["Order", "Date", "Retailer", "Amount", "Payment Status", "Razorpay Order", "Razorpay Payment"];
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const body = filtered.map((r) => [r.order_no, new Date(r.created_at).toLocaleString("en-IN"), r.retailer_name, r.total, r.payment_status, r.razorpay_order_id, r.razorpay_payment_id]);
    const csv = [head.map(esc).join(","), ...body.map((x) => x.map(esc).join(","))].join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `estore_payments_${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <motion.div variants={listV} initial="initial" animate="animate" className="grid gap-3 sm:grid-cols-4">
        {[
          { icon: <IndianRupee className="h-4 w-4 text-emerald-600" />, label: "Collected", value: inr(collected), sub: `${paid.length} payments` },
          { icon: <CreditCard className="h-4 w-4 text-amber-600" />, label: "Pending", value: String(pending.length), sub: inr(pending.reduce((a, r) => a + Number(r.total || 0), 0)) },
          { icon: <X className="h-4 w-4 text-rose-600" />, label: "Failed", value: String(failed.length) },
          { icon: <TrendingUp className="h-4 w-4" />, label: "Success rate", value: rows.length ? Math.round((paid.length / rows.length) * 100) + "%" : "—" },
        ].map((s) => (
          <motion.div key={s.label} variants={itemV} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{s.icon} {s.label}</p>
            <p className="mt-1 text-2xl font-extrabold">{s.value}</p>{s.sub && <p className="text-xs text-muted-foreground">{s.sub}</p>}
          </motion.div>
        ))}
      </motion.div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {["all", "paid", "pending_payment", "failed"].map((k) => (
            <button key={k} onClick={() => setSt(k)} className={`rounded-full px-3 h-8 text-xs font-semibold capitalize ${st === k ? "bg-india-green text-white" : "border border-border bg-card hover:bg-muted"}`}>{k.replace(/_/g, " ")}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative"><Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Order, retailer, txn id…" className="h-8 w-52 rounded-lg border border-border bg-background pl-8 pr-2 text-xs outline-none" /></div>
          <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-8 text-xs font-semibold hover:bg-muted"><Download className="h-3.5 w-3.5" /> Export</button>
          <Button size="sm" variant="outline" onClick={load}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr><th className="px-3 py-2">Order</th><th className="px-3 py-2">Retailer</th><th className="px-3 py-2">Amount</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Razorpay Txn</th><th className="px-3 py-2">Date</th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="px-3 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
              : filtered.length === 0 ? <tr><td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">No payments.</td></tr>
              : filtered.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-3 py-2 font-semibold">{r.order_no}</td>
                  <td className="px-3 py-2"><p className="text-sm">{r.retailer_name ?? "—"}</p><p className="text-[11px] font-mono text-muted-foreground">{r.jsko_id}</p></td>
                  <td className="px-3 py-2 font-bold">{inr(r.total)}</td>
                  <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${tone[r.payment_status] ?? "bg-muted"}`}>{r.payment_status.replace(/_/g, " ")}</span></td>
                  <td className="px-3 py-2 text-[11px] font-mono text-muted-foreground">{r.razorpay_payment_id || "—"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("en-IN")}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
