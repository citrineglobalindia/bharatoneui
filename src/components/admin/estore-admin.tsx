import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ShoppingBag, Loader2, RefreshCw, Plus, Trash2, Save, X, Upload, Package,
  Search, Download, Boxes, IndianRupee, TrendingUp, Truck, Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

type Cat = { id: string; parent_id: string | null; name: string; sort_order: number; active: boolean };
type Product = {
  id: string; category_id: string | null; name: string; brand: string | null; sku: string | null; hsn: string | null;
  description: string | null; image_paths: string[]; mrp: number; offer_price: number | null; selling_price: number;
  gst_rate: number; retailer_margin: number; distributor_commission: number; bharatone_commission: number;
  stock_qty: number; low_stock_at: number; is_exclusive: boolean; featured: boolean; active: boolean;
};
const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const imgUrl = (p?: string) => p ? supabase.storage.from("estore").getPublicUrl(p).data.publicUrl : "";
const STATUSES = ["placed", "confirmed", "packed", "shipped", "delivered", "cancelled"];
const tone: Record<string, string> = {
  pending_payment: "bg-amber-100 text-amber-700", placed: "bg-sky-100 text-sky-700", confirmed: "bg-indigo-100 text-indigo-700",
  packed: "bg-violet-100 text-violet-700", shipped: "bg-blue-100 text-blue-700", delivered: "bg-emerald-100 text-emerald-700", cancelled: "bg-rose-100 text-rose-700",
  paid: "bg-emerald-100 text-emerald-700", pending: "bg-amber-100 text-amber-700", failed: "bg-rose-100 text-rose-700",
};

export function EstoreAdmin() {
  const [tab, setTab] = useState<"products" | "categories" | "orders">("products");
  return (
    <div className="space-y-5">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-extrabold"><ShoppingBag className="h-5 w-5 text-admin" /> E-Store</h2>
        <p className="text-sm text-muted-foreground">Manage the catalog, pricing, stock and orders.</p>
      </div>
      <div className="flex gap-1.5">
        {([["products", "Products"], ["categories", "Categories"], ["orders", "Orders"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-full px-4 h-9 text-xs font-semibold transition ${tab === k ? "bg-india-green text-white" : "border border-border bg-card hover:bg-muted"}`}>{l}</button>
        ))}
      </div>
      {tab === "products" ? <Products /> : tab === "categories" ? <Categories /> : <Orders />}
    </div>
  );
}

// ---------------------------------------------------------------- products
const blankProduct = (): Product => ({
  id: "", category_id: null, name: "", brand: "", sku: "", hsn: "", description: "", image_paths: [],
  mrp: 0, offer_price: null, selling_price: 0, gst_rate: 0, retailer_margin: 0, distributor_commission: 0,
  bharatone_commission: 0, stock_qty: 0, low_stock_at: 5, is_exclusive: false, featured: false, active: true,
});

function Products() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [rows, setRows] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [form, setForm] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function load() {
    setLoading(true);
    const [c, p] = await Promise.all([
      supabase.from("estore_categories").select("*").order("sort_order"),
      supabase.from("estore_products").select("*").order("created_at", { ascending: false }),
    ]);
    setCats((c.data as Cat[]) ?? []);
    setRows((p.data as Product[]) ?? []);
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

      {form && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setForm(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-5 shadow-elev" onClick={(e) => e.stopPropagation()}>
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
          </div>
        </div>
      )}
      <style>{`.in{height:2.25rem;width:100%;border-radius:.5rem;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:0 .6rem;font-size:.8rem;outline:none}`}</style>
    </div>
  );
}
function L({ label, children, span2 }: { label: string; children: React.ReactNode; span2?: boolean }) {
  return <label className={`block ${span2 ? "sm:col-span-2" : ""}`}><span className="mb-1 block text-[11px] font-semibold text-muted-foreground">{label}</span>{children}</label>;
}

// ---------------------------------------------------------------- categories
function Categories() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState(""); const [parent, setParent] = useState("");
  async function load() { setLoading(true); const { data } = await supabase.from("estore_categories").select("*").order("sort_order"); setCats((data as Cat[]) ?? []); setLoading(false); }
  useEffect(() => { load(); }, []);
  const tops = cats.filter((c) => !c.parent_id);
  const add = async () => {
    if (!name.trim()) return toast.error("Enter a name");
    await ensureStaffSession();
    const { error } = await supabase.from("estore_categories").insert({ name: name.trim(), parent_id: parent || null, sort_order: cats.length + 1, active: true });
    if (error) return toast.error("Could not add", { description: error.message });
    setName(""); toast.success("Category added"); load();
  };
  const del = async (c: Cat) => { if (!confirm(`Delete "${c.name}" and its subcategories?`)) return; await ensureStaffSession(); const { error } = await supabase.from("estore_categories").delete().eq("id", c.id); if (error) return toast.error(error.message); toast.success("Deleted"); load(); };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-border bg-card p-4 shadow-soft">
        <label className="flex-1"><span className="mb-1 block text-xs font-semibold text-muted-foreground">Category name</span><input value={name} onChange={(e) => setName(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label>
        <label><span className="mb-1 block text-xs font-semibold text-muted-foreground">Parent (for subcategory)</span><select value={parent} onChange={(e) => setParent(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-sm"><option value="">— top level —</option>{tops.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <Button size="sm" onClick={add} className="bg-india-green text-white"><Plus className="h-4 w-4" /> Add</Button>
      </div>
      {loading ? <div className="py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tops.map((t) => (
            <div key={t.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <div className="mb-2 flex items-center justify-between"><p className="flex items-center gap-1.5 font-bold"><Layers className="h-4 w-4 text-india-green" /> {t.name}</p><button onClick={() => del(t)} className="text-rose-600"><Trash2 className="h-4 w-4" /></button></div>
              <div className="flex flex-wrap gap-1">{cats.filter((c) => c.parent_id === t.id).map((s) => <span key={s.id} className="group inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px]">{s.name}<button onClick={() => del(s)} className="text-rose-500 opacity-0 group-hover:opacity-100"><X className="h-3 w-3" /></button></span>)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- orders
type OrderRow = {
  id: string; order_no: string; created_at: string; status: string; payment_status: string;
  retailer_name: string | null; jsko_id: string | null; total: number; items: number;
  retailer_margin_total: number; distributor_commission_total: number; bharatone_commission_total: number;
  commission_settled: boolean; courier: string | null; tracking_no: string | null;
  ship_name: string | null; ship_phone: string | null; ship_city: string | null; ship_pincode: string | null;
};
function Orders() {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(""); const [st, setSt] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);
  async function load() { setLoading(true); try { await ensureStaffSession(); const { data, error } = await (supabase as any).rpc("estore_admin_orders", { _limit: 1000 }); if (error) throw error; setRows((data as OrderRow[]) ?? []); } catch (e: any) { toast.error("Could not load orders", { description: e.message }); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);

  const setStatus = async (o: OrderRow, status: string) => {
    let courier = o.courier, tracking = o.tracking_no;
    if (status === "shipped") {
      courier = prompt("Courier name:", o.courier || "") || o.courier;
      tracking = prompt("Tracking number:", o.tracking_no || "") || o.tracking_no;
    }
    setBusy(o.id);
    const { error } = await (supabase as any).rpc("estore_set_order_status", { _order: o.id, _status: status, _courier: courier, _tracking: tracking });
    setBusy(null);
    if (error) return toast.error("Could not update", { description: error.message });
    toast.success(`Order ${status}${status === "delivered" ? " — margins credited" : ""}`); load();
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
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat icon={<TrendingUp className="h-4 w-4" />} label="Orders" value={String(rows.length)} sub={`${paid.length} paid`} />
        <Stat icon={<IndianRupee className="h-4 w-4" />} label="Sales (paid)" value={inr(sum(paid, (r) => r.total))} />
        <Stat icon={<Boxes className="h-4 w-4" />} label="Paid to retailers/distributors" value={inr(sum(paid, (r) => r.retailer_margin_total + r.distributor_commission_total))} />
        <Stat icon={<ShoppingBag className="h-4 w-4" />} label="BharatOne margin" value={inr(sum(paid, (r) => r.bharatone_commission_total))} />
      </div>
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
            <tr><th className="px-3 py-2">Order</th><th className="px-3 py-2">Retailer</th><th className="px-3 py-2">Ship to</th><th className="px-3 py-2">Total</th><th className="px-3 py-2">Payment</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Advance</th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
              : filtered.length === 0 ? <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">No orders.</td></tr>
              : filtered.map((o) => (
                <tr key={o.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-3 py-2"><p className="font-semibold">{o.order_no}</p><p className="text-[11px] text-muted-foreground">{new Date(o.created_at).toLocaleDateString("en-IN")} · {o.items} item(s)</p></td>
                  <td className="px-3 py-2"><p className="text-sm">{o.retailer_name ?? "—"}</p><p className="text-[11px] font-mono text-muted-foreground">{o.jsko_id}</p></td>
                  <td className="px-3 py-2 text-xs">{o.ship_name}<div className="text-muted-foreground">{o.ship_city} {o.ship_pincode} · {o.ship_phone}</div>{o.tracking_no && <div className="text-[11px]">{o.courier}: {o.tracking_no}</div>}</td>
                  <td className="px-3 py-2 font-semibold">{inr(o.total)}<div className="text-[10px] text-muted-foreground">R {inr(o.retailer_margin_total)} · Co {inr(o.bharatone_commission_total)}</div></td>
                  <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${tone[o.payment_status] ?? "bg-muted"}`}>{o.payment_status}</span></td>
                  <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${tone[o.status] ?? "bg-muted"}`}>{o.status.replace(/_/g, " ")}</span>{o.commission_settled && <div className="mt-0.5 text-[10px] font-semibold text-emerald-600">settled</div>}</td>
                  <td className="px-3 py-2">
                    {o.payment_status === "paid" && o.status !== "delivered" && o.status !== "cancelled" ? (
                      <div className="flex items-center gap-1">
                        <select disabled={busy === o.id} value="" onChange={(e) => e.target.value && setStatus(o, e.target.value)} className="h-8 rounded-lg border border-border bg-background px-2 text-xs">
                          <option value="">Move to…</option>
                          {STATUSES.filter((s) => s !== o.status).map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
                        </select>
                        {busy === o.id && <Loader2 className="h-4 w-4 animate-spin" />}
                      </div>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return <div className="rounded-2xl border border-border bg-card p-4 shadow-soft"><p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{icon} {label}</p><p className="mt-1 text-2xl font-extrabold">{value}</p>{sub && <p className="text-xs text-muted-foreground">{sub}</p>}</div>;
}
