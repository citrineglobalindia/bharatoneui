import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Loader2, Check, X, FolderPlus, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

type Cat = { id: string; name: string; is_active: boolean; sort_order: number };
type Svc = {
  id: string; category_id: string; name: string; description: string | null; service_charge: number;
  company_commission: number; distributor_commission: number; tro_commission: number; dro_commission: number;
  retailer_commission: number; is_active: boolean; sort_order: number;
};
const emptySvc: any = { id: "", name: "", description: "", service_charge: 0, company_commission: 0, distributor_commission: 0, tro_commission: 0, dro_commission: 0, retailer_commission: 0, is_active: true, sort_order: 0 };

export function CatalogManager() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [svcs, setSvcs] = useState<Svc[]>([]);
  const [sel, setSel] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [newCat, setNewCat] = useState("");
  const [form, setForm] = useState<any>({ ...emptySvc });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load(selectId?: string) {
    setLoading(true);
    try {
      const { data: c } = await supabase.from("service_categories").select("*").order("sort_order").order("name");
      const list = (c as Cat[]) ?? [];
      setCats(list);
      const next = selectId ?? (sel || (list[0]?.id ?? ""));
      setSel(next);
    } finally { setLoading(false); }
  }
  async function loadSvcs(catId: string) {
    const { data } = await supabase.from("catalog_services").select("*").eq("category_id", catId).order("sort_order").order("name");
    setSvcs((data as Svc[]) ?? []);
  }
  useEffect(() => { (async () => { await ensureStaffSession(); await load(); })(); }, []);
  useEffect(() => { if (sel) loadSvcs(sel); else setSvcs([]); }, [sel]);

  const addCat = async () => {
    if (!newCat.trim()) return;
    const { data, error } = await supabase.from("service_categories").insert({ name: newCat.trim() }).select("id").single();
    if (error) { toast.error("Add failed", { description: error.message }); return; }
    setNewCat(""); await load((data as any).id); toast.success("Category added");
  };
  const delCat = async (id: string) => { if (!confirm("Delete category and all its services?")) return; const { error } = await supabase.from("service_categories").delete().eq("id", id); if (error) { toast.error(error.message); return; } await load(""); };
  const toggleCat = async (c: Cat) => { await supabase.from("service_categories").update({ is_active: !c.is_active }).eq("id", c.id); await load(c.id); };

  const reset = () => { setForm({ ...emptySvc }); setEditing(false); };
  const saveSvc = async () => {
    if (!sel) { toast.error("Select or add a category first"); return; }
    if (!form.name.trim()) { toast.error("Service name is required"); return; }
    setSaving(true);
    try {
      const payload = { category_id: sel, name: form.name.trim(), description: form.description || null,
        service_charge: Number(form.service_charge) || 0, company_commission: Number(form.company_commission) || 0,
        distributor_commission: Number(form.distributor_commission) || 0, tro_commission: Number(form.tro_commission) || 0,
        dro_commission: Number(form.dro_commission) || 0, retailer_commission: Number(form.retailer_commission) || 0, is_active: form.is_active };
      const res = editing ? await supabase.from("catalog_services").update(payload).eq("id", form.id) : await supabase.from("catalog_services").insert(payload);
      if (res.error) { toast.error("Save failed", { description: res.error.message }); return; }
      toast.success(editing ? "Service updated" : "Service added"); reset(); loadSvcs(sel);
    } finally { setSaving(false); }
  };
  const editSvc = (s: Svc) => { setForm({ ...s, description: s.description ?? "" }); setEditing(true); };
  const delSvc = async (id: string) => { if (!confirm("Delete this service?")) return; await supabase.from("catalog_services").delete().eq("id", id); loadSvcs(sel); };

  const inp = "h-9 w-full rounded-lg border border-border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30";
  const fields: [string, string][] = [["Company","company_commission"],["Distributor","distributor_commission"],["DRO","dro_commission"],["TRO","tro_commission"],["Retailer","retailer_commission"]];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-extrabold">Service Pricing & Commissions</h2>
        <p className="text-sm text-muted-foreground">Manage categories and services with charges and commission splits. These power the retailer New Application form.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="mb-3 flex items-center gap-2 text-sm font-bold"><FolderPlus className="h-4 w-4 text-india-green" /> Categories</p>
        <div className="flex flex-wrap items-center gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : cats.length === 0 ? <span className="text-sm text-muted-foreground">No categories yet — add one →</span> : cats.map((c) => (
            <div key={c.id} className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition ${sel === c.id ? "bg-india-green text-white" : "border border-border bg-card hover:bg-muted"}`}>
              <button onClick={() => setSel(c.id)}>{c.name}{!c.is_active && " (off)"}</button>
              <button onClick={() => toggleCat(c)} title="toggle active" className="text-[11px] opacity-70 hover:opacity-100">{c.is_active ? "●" : "○"}</button>
              <button onClick={() => delCat(c.id)} title="delete" className="opacity-70 hover:opacity-100"><Trash2 className="h-3 w-3" /></button>
            </div>
          ))}
          <div className="inline-flex items-center gap-1">
            <input className="h-9 rounded-lg border border-border bg-background px-2 text-sm" placeholder="New category" value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCat()} />
            <Button size="sm" variant="outline" onClick={addCat}><Plus className="h-4 w-4" /> Add</Button>
          </div>
        </div>
      </div>

      {sel && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <p className="mb-3 flex items-center gap-2 text-sm font-bold">{editing ? <Pencil className="h-4 w-4 text-india-green" /> : <Plus className="h-4 w-4 text-india-green" />} {editing ? "Edit service" : "Add a service"}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="text-[11px] font-semibold text-muted-foreground">Service name *</label><input className={inp + " h-10"} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. PAN Card Application" /></div>
            <div><label className="text-[11px] font-semibold text-muted-foreground">Service charge (₹)</label><input type="number" min="0" className={inp + " h-10"} value={form.service_charge} onChange={(e) => setForm({ ...form, service_charge: e.target.value })} /></div>
          </div>
          <div className="mt-3"><label className="text-[11px] font-semibold text-muted-foreground">Description</label><input className={inp + " h-10"} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional short description" /></div>
          <p className="mb-2 mt-4 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground"><IndianRupee className="h-3.5 w-3.5" /> Commission split</p>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {fields.map(([label, key]) => (
              <div key={key}><label className="text-[11px] font-semibold text-muted-foreground">{label} (₹)</label><input type="number" min="0" className={inp} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></div>
            ))}
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 accent-[oklch(0.55_0.12_150)]" /> Active (visible to retailers)</label>
          <div className="mt-3 flex gap-2">
            <Button onClick={saveSvc} disabled={saving} className="bg-india-green text-white hover:bg-india-green/90">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {editing ? "Update service" : "Add service"}</Button>
            {editing && <Button variant="outline" onClick={reset}><X className="h-4 w-4" /> Cancel</Button>}
          </div>

          <div className="mt-5 overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr><th className="px-3 py-2">Service</th><th className="px-3 py-2">Charge</th><th className="px-3 py-2">Company</th><th className="px-3 py-2">Distrib.</th><th className="px-3 py-2">DRO</th><th className="px-3 py-2">TRO</th><th className="px-3 py-2">Retailer</th><th className="px-3 py-2"></th></tr>
              </thead>
              <tbody>
                {svcs.length === 0 ? <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">No services in this category yet.</td></tr>
                  : svcs.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-3 py-2 font-semibold">{s.name}{!s.is_active && <span className="ml-1 text-[10px] text-muted-foreground">(off)</span>}</td>
                    <td className="px-3 py-2">₹{Number(s.service_charge).toLocaleString("en-IN")}</td>
                    <td className="px-3 py-2">₹{s.company_commission}</td><td className="px-3 py-2">₹{s.distributor_commission}</td>
                    <td className="px-3 py-2">₹{s.dro_commission}</td><td className="px-3 py-2">₹{s.tro_commission}</td><td className="px-3 py-2">₹{s.retailer_commission}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap"><button onClick={() => editSvc(s)} className="mr-3 text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button><button onClick={() => delSvc(s.id)} className="text-rose-500 hover:text-rose-700"><Trash2 className="h-3.5 w-3.5" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
