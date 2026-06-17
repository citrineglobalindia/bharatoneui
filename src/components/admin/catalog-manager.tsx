import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Loader2, Check, X, FolderTree, Boxes, IndianRupee, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

type Cat = { id: string; name: string; is_active: boolean; sort_order: number };
type Svc = {
  id: string; category_id: string; name: string; description: string | null; service_charge: number;
  company_commission: number; distributor_commission: number; tro_commission: number; dro_commission: number;
  retailer_commission: number; is_active: boolean; sort_order: number;
};
const emptySvc: any = { id: "", category_id: "", name: "", description: "", service_charge: 0, company_commission: 0, distributor_commission: 0, tro_commission: 0, dro_commission: 0, retailer_commission: 0, is_active: true, sort_order: 0 };
const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");
const inp = "h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30";
const Pill = ({ on }: { on: boolean }) => <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${on ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{on ? "Active" : "Inactive"}</span>;

export function CatalogManager() {
  const [tab, setTab] = useState<"categories" | "services">("categories");
  const [cats, setCats] = useState<Cat[]>([]);
  const [svcs, setSvcs] = useState<Svc[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      await ensureStaffSession();
      const [c, s] = await Promise.all([
        supabase.from("service_categories").select("*").order("sort_order").order("name"),
        supabase.from("catalog_services").select("*").order("sort_order").order("name"),
      ]);
      setCats((c.data as Cat[]) ?? []);
      setSvcs((s.data as Svc[]) ?? []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold">Service Catalog</h2>
          <p className="text-sm text-muted-foreground">Manage categories and services with charges and commission splits.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button>
      </div>

      <div className="inline-flex rounded-xl border border-border bg-card p-1">
        <button onClick={() => setTab("categories")} className={`inline-flex items-center gap-1.5 rounded-lg px-4 h-9 text-sm font-semibold transition ${tab === "categories" ? "bg-admin text-admin-foreground" : "text-muted-foreground hover:text-foreground"}`}><FolderTree className="h-4 w-4" /> Categories <span className="rounded-full bg-black/10 px-1.5 text-[11px]">{cats.length}</span></button>
        <button onClick={() => setTab("services")} className={`inline-flex items-center gap-1.5 rounded-lg px-4 h-9 text-sm font-semibold transition ${tab === "services" ? "bg-admin text-admin-foreground" : "text-muted-foreground hover:text-foreground"}`}><Boxes className="h-4 w-4" /> Services <span className="rounded-full bg-black/10 px-1.5 text-[11px]">{svcs.length}</span></button>
      </div>

      {loading ? <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        : tab === "categories" ? <CategoriesTab cats={cats} svcs={svcs} reload={load} />
        : <ServicesTab cats={cats} svcs={svcs} reload={load} />}
    </div>
  );
}

function CategoriesTab({ cats, svcs, reload }: { cats: Cat[]; svcs: Svc[]; reload: () => void }) {
  const [name, setName] = useState("");
  const [active, setActive] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState(false);
  const count = (id: string) => svcs.filter((s) => s.category_id === id).length;

  const add = async () => {
    if (!name.trim()) return toast.error("Category name required");
    setBusy(true);
    const { error } = await supabase.from("service_categories").insert({ name: name.trim(), is_active: active, sort_order: cats.length });
    setBusy(false);
    if (error) return toast.error("Add failed", { description: error.message });
    setName(""); setActive(true); toast.success("Category added"); reload();
  };
  const saveEdit = async (id: string) => {
    if (!editName.trim()) return;
    const { error } = await supabase.from("service_categories").update({ name: editName.trim() }).eq("id", id);
    if (error) return toast.error(error.message);
    setEditId(null); toast.success("Renamed"); reload();
  };
  const toggle = async (c: Cat) => { await supabase.from("service_categories").update({ is_active: !c.is_active }).eq("id", c.id); reload(); };
  const del = async (id: string) => { if (!confirm("Delete category and all its services?")) return; const { error } = await supabase.from("service_categories").delete().eq("id", id); if (error) return toast.error(error.message); toast.success("Deleted"); reload(); };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr><th className="px-4 py-2.5">Category</th><th className="px-4 py-2.5">Services</th><th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {cats.length === 0 ? <tr><td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">No categories yet. Add one →</td></tr>
              : cats.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-4 py-2.5 font-semibold">{editId === c.id
                  ? <span className="inline-flex items-center gap-1"><input className={inp + " w-44"} value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveEdit(c.id)} autoFocus /><button onClick={() => saveEdit(c.id)} className="text-india-green"><Check className="h-4 w-4" /></button><button onClick={() => setEditId(null)} className="text-muted-foreground"><X className="h-4 w-4" /></button></span>
                  : c.name}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{count(c.id)}</td>
                <td className="px-4 py-2.5"><Pill on={c.is_active} /></td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap">
                  <button onClick={() => toggle(c)} className="mr-3 text-xs font-semibold text-muted-foreground hover:text-foreground">{c.is_active ? "Deactivate" : "Activate"}</button>
                  <button onClick={() => { setEditId(c.id); setEditName(c.name); }} className="mr-3 text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => del(c.id)} className="text-rose-500 hover:text-rose-700"><Trash2 className="h-3.5 w-3.5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="h-fit rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="mb-3 flex items-center gap-2 text-sm font-bold"><Plus className="h-4 w-4 text-india-green" /> Add Category</p>
        <label className="text-[11px] font-semibold text-muted-foreground">Name</label>
        <input className={inp + " h-10"} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Government Services" onKeyDown={(e) => e.key === "Enter" && add()} />
        <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-[oklch(0.55_0.12_150)]" /> Active</label>
        <Button onClick={add} disabled={busy} className="mt-4 w-full bg-india-green text-white hover:bg-india-green/90">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add Category</Button>
      </div>
    </div>
  );
}

function ServicesTab({ cats, svcs, reload }: { cats: Cat[]; svcs: Svc[]; reload: () => void }) {
  const [form, setForm] = useState<any>({ ...emptySvc });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [filterCat, setFilterCat] = useState("");

  const catName = (id: string) => cats.find((c) => c.id === id)?.name ?? "\u2014";
  const filtered = useMemo(() => svcs.filter((s) =>
    (!filterCat || s.category_id === filterCat) &&
    (!q || s.name.toLowerCase().includes(q.toLowerCase()))), [svcs, q, filterCat]);

  const fields: [string, string][] = [["Company","company_commission"],["Distributor","distributor_commission"],["DRO","dro_commission"],["TRO","tro_commission"],["Retailer","retailer_commission"]];
  const charge = Number(form.service_charge) || 0;
  const totalPct = fields.reduce((a, [, k]) => a + (Number(form[k]) || 0), 0);
  const pctOk = Math.abs(totalPct - 100) < 0.001;
  const amt = (pct: number) => Math.round((charge * (Number(pct) || 0) / 100) * 100) / 100;

  const reset = () => { setForm({ ...emptySvc }); setEditing(false); };
  const save = async () => {
    if (!form.category_id) return toast.error("Select a category");
    if (!form.name.trim()) return toast.error("Service name required");
    if (!pctOk) return toast.error("Commission split must total 100%", { description: `Currently ${totalPct}%` });
    setSaving(true);
    try {
      const payload = { category_id: form.category_id, name: form.name.trim(), description: form.description || null,
        service_charge: charge, company_commission: Number(form.company_commission) || 0,
        distributor_commission: Number(form.distributor_commission) || 0, tro_commission: Number(form.tro_commission) || 0,
        dro_commission: Number(form.dro_commission) || 0, retailer_commission: Number(form.retailer_commission) || 0, is_active: form.is_active };
      const res = editing ? await supabase.from("catalog_services").update(payload).eq("id", form.id) : await supabase.from("catalog_services").insert(payload);
      if (res.error) return toast.error("Save failed", { description: res.error.message });
      toast.success(editing ? "Service updated" : "Service created"); reset(); reload();
    } finally { setSaving(false); }
  };
  const edit = (s: Svc) => { setForm({ ...s, description: s.description ?? "" }); setEditing(true); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const toggle = async (s: Svc) => { await supabase.from("catalog_services").update({ is_active: !s.is_active }).eq("id", s.id); reload(); };
  const del = async (id: string) => { if (!confirm("Delete this service?")) return; await supabase.from("catalog_services").delete().eq("id", id); reload(); };
  const rowAmt = (s: Svc, pct: number) => inr(Math.round((Number(s.service_charge) * (Number(pct) || 0) / 100) * 100) / 100);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="mb-3 flex items-center gap-2 text-sm font-bold">{editing ? <Pencil className="h-4 w-4 text-india-green" /> : <Plus className="h-4 w-4 text-india-green" />} {editing ? "Edit Service" : "Create Service"}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div><label className="text-[11px] font-semibold text-muted-foreground">Category *</label>
            <select className={inp + " h-10"} value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              <option value="">Select category</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}{!c.is_active && " (inactive)"}</option>)}
            </select>
          </div>
          <div><label className="text-[11px] font-semibold text-muted-foreground">Service name *</label><input className={inp + " h-10"} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. PAN Card Application" /></div>
          <div><label className="text-[11px] font-semibold text-muted-foreground">Total Cost of Service (\u20b9)</label><input type="number" min="0" className={inp + " h-10"} value={form.service_charge} onChange={(e) => setForm({ ...form, service_charge: e.target.value })} /></div>
        </div>
        <div className="mt-3"><label className="text-[11px] font-semibold text-muted-foreground">Description</label><input className={inp + " h-10"} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional" /></div>
        <div className="mb-2 mt-4 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground"><IndianRupee className="h-3.5 w-3.5" /> Commission split (% of total cost)</span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${pctOk ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>Total: {totalPct}% {pctOk ? "\u2713" : "(must be 100%)"}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {fields.map(([label, key]) => (
            <div key={key}>
              <label className="text-[11px] font-semibold text-muted-foreground">{label} (%)</label>
              <input type="number" min="0" max="100" className={inp} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
              <p className="mt-0.5 text-[11px] text-muted-foreground">= {inr(amt(form[key]))}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Sum of splits = total cost of service. Company {inr(amt(form.company_commission))} + Distributor {inr(amt(form.distributor_commission))} + DRO {inr(amt(form.dro_commission))} + TRO {inr(amt(form.tro_commission))} + Retailer {inr(amt(form.retailer_commission))} = <b className="text-foreground">{inr(amt(totalPct))}</b></p>
        <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 accent-[oklch(0.55_0.12_150)]" /> Active (visible to retailers)</label>
        <div className="mt-3 flex gap-2">
          <Button onClick={save} disabled={saving} className="bg-india-green text-white hover:bg-india-green/90">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {editing ? "Update Service" : "Create Service"}</Button>
          {editing && <Button variant="outline" onClick={reset}><X className="h-4 w-4" /> Cancel</Button>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><input className={inp + " h-9 w-56 pl-8"} placeholder="Search services" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select className={inp + " h-9 w-48"} value={filterCat} onChange={(e) => setFilterCat(e.target.value)}><option value="">All categories</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr><th className="px-3 py-2">Service</th><th className="px-3 py-2">Category</th><th className="px-3 py-2">Total Cost</th><th className="px-3 py-2">Company</th><th className="px-3 py-2">Distrib.</th><th className="px-3 py-2">DRO</th><th className="px-3 py-2">TRO</th><th className="px-3 py-2">Retailer</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? <tr><td colSpan={10} className="px-3 py-10 text-center text-muted-foreground">No services found.</td></tr>
              : filtered.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="px-3 py-2 font-semibold">{s.name}</td>
                <td className="px-3 py-2 text-muted-foreground">{catName(s.category_id)}</td>
                <td className="px-3 py-2 font-semibold">{inr(s.service_charge)}</td>
                <td className="px-3 py-2">{s.company_commission}% <span className="text-[11px] text-muted-foreground">({rowAmt(s, s.company_commission)})</span></td>
                <td className="px-3 py-2">{s.distributor_commission}% <span className="text-[11px] text-muted-foreground">({rowAmt(s, s.distributor_commission)})</span></td>
                <td className="px-3 py-2">{s.dro_commission}%</td><td className="px-3 py-2">{s.tro_commission}%</td>
                <td className="px-3 py-2 text-india-green">{s.retailer_commission}% <span className="text-[11px]">({rowAmt(s, s.retailer_commission)})</span></td>
                <td className="px-3 py-2"><Pill on={s.is_active} /></td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button onClick={() => toggle(s)} className="mr-3 text-xs font-semibold text-muted-foreground hover:text-foreground">{s.is_active ? "Deactivate" : "Activate"}</button>
                  <button onClick={() => edit(s)} className="mr-3 text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => del(s.id)} className="text-rose-500 hover:text-rose-700"><Trash2 className="h-3.5 w-3.5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
