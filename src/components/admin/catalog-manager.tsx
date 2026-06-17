import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Loader2, Check, X, FolderTree, ChevronRight, UserCog, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";
import { ServicesManager } from "@/components/admin/services-manager";

type Cat = { id: string; name: string; is_active: boolean; sort_order: number; operator_id: string | null };
type Operator = { id: string; name: string };
const inp = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30";
const Pill = ({ on }: { on: boolean }) => <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${on ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{on ? "Active" : "Inactive"}</span>;

export function CatalogManager() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<Cat | null>(null);

  // add/edit category form
  const [name, setName] = useState("");
  const [active, setActive] = useState(true);
  const [operatorId, setOperatorId] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      await ensureStaffSession();
      const [c, s, u] = await Promise.all([
        supabase.from("service_categories").select("id,name,is_active,sort_order,operator_id").order("sort_order").order("name"),
        supabase.from("services").select("category_id"),
        supabase.rpc("admin_list_users"),
      ]);
      const list = (c.data as Cat[]) ?? [];
      setCats(list);
      if (sel) setSel(list.find((x) => x.id === sel.id) ?? null);
      const rows = (s.data as { category_id: string | null }[]) ?? [];
      const m: Record<string, number> = {};
      rows.forEach((r) => { if (r.category_id) m[r.category_id] = (m[r.category_id] ?? 0) + 1; });
      setCounts(m);
      const ops = ((u.data as any[]) ?? []).filter((x) => Array.isArray(x.roles) && x.roles.includes("operator"))
        .map((x) => ({ id: x.id, name: x.display_name || x.email || "Operator" }));
      setOperators(ops);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const opName = (id: string | null) => id ? (operators.find((o) => o.id === id)?.name ?? "Assigned") : "Unassigned";

  const resetForm = () => { setName(""); setActive(true); setOperatorId(""); setEditId(null); };
  const startEdit = (c: Cat) => { setEditId(c.id); setName(c.name); setActive(c.is_active); setOperatorId(c.operator_id ?? ""); };
  const saveCat = async () => {
    if (!name.trim()) return toast.error("Category name required");
    setBusy(true);
    const payload = { name: name.trim(), is_active: active, operator_id: operatorId || null };
    const res = editId
      ? await supabase.from("service_categories").update(payload).eq("id", editId)
      : await supabase.from("service_categories").insert({ ...payload, sort_order: cats.length });
    setBusy(false);
    if (res.error) return toast.error("Save failed", { description: res.error.message });
    toast.success(editId ? "Category updated" : "Category added"); resetForm(); load();
  };
  const toggle = async (c: Cat) => { await supabase.from("service_categories").update({ is_active: !c.is_active }).eq("id", c.id); load(); };
  const del = async (c: Cat) => { if (!confirm("Delete this category? Its services become uncategorised.")) return; const { error } = await supabase.from("service_categories").delete().eq("id", c.id); if (error) return toast.error(error.message); if (sel?.id === c.id) setSel(null); toast.success("Deleted"); load(); };

  // ---- Detail view: a category's services ----
  if (sel) {
    return (
      <div className="space-y-5">
        <button onClick={() => setSel(null)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> All categories</button>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div>
            <p className="flex items-center gap-2 font-display text-lg font-extrabold"><FolderTree className="h-5 w-5 text-india-green" /> {sel.name} <Pill on={sel.is_active} /></p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><UserCog className="h-4 w-4" /> Operator: <b className="text-foreground">{opName(sel.operator_id)}</b> · {counts[sel.id] ?? 0} service(s)</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => startEdit(sel)}><Pencil className="h-4 w-4" /> Edit category</Button>
        </div>
        {editId === sel.id && <CatForm {...{ name, setName, active, setActive, operatorId, setOperatorId, operators, busy, saveCat, resetForm, editId }} />}
        <div>
          <p className="mb-2 text-sm font-bold">Services in this category</p>
          <p className="mb-3 text-xs text-muted-foreground">Add Inlink, API-integrated or Backend services. Set each service's total cost and commission split.</p>
          <ServicesManager categoryId={sel.id} />
        </div>
      </div>
    );
  }

  // ---- List view: categories are the main thing ----
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-extrabold">Service Catalog</h2>
        <p className="text-sm text-muted-foreground">Categories are the backbone — each is handled by an operator who receives its applications. Open a category to map its services (Inlink, API, Backend) and commission splits.</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-4 py-2.5">Category</th><th className="px-4 py-2.5">Operator</th><th className="px-4 py-2.5">Services</th><th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5 text-right">Actions</th></tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
                : cats.length === 0 ? <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No categories yet. Add one →</td></tr>
                : cats.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3"><button onClick={() => setSel(c)} className="inline-flex items-center gap-1.5 font-semibold hover:text-india-green">{c.name} <ChevronRight className="h-4 w-4 text-muted-foreground" /></button></td>
                  <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 text-xs ${c.operator_id ? "text-foreground" : "text-muted-foreground"}`}><UserCog className="h-3.5 w-3.5" /> {opName(c.operator_id)}</span></td>
                  <td className="px-4 py-3 text-muted-foreground">{counts[c.id] ?? 0}</td>
                  <td className="px-4 py-3"><Pill on={c.is_active} /></td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => setSel(c)} className="mr-3 text-xs font-semibold text-india-green hover:underline">Open</button>
                    <button onClick={() => toggle(c)} className="mr-3 text-xs font-semibold text-muted-foreground hover:text-foreground">{c.is_active ? "Deactivate" : "Activate"}</button>
                    <button onClick={() => startEdit(c)} className="mr-3 text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => del(c)} className="text-rose-500 hover:text-rose-700"><Trash2 className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="h-fit">
          {editId && !sel ? <CatForm {...{ name, setName, active, setActive, operatorId, setOperatorId, operators, busy, saveCat, resetForm, editId }} />
            : <CatForm {...{ name, setName, active, setActive, operatorId, setOperatorId, operators, busy, saveCat, resetForm, editId: null }} />}
        </div>
      </div>
    </div>
  );
}

function CatForm({ name, setName, active, setActive, operatorId, setOperatorId, operators, busy, saveCat, resetForm, editId }: any) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <p className="mb-3 flex items-center gap-2 text-sm font-bold">{editId ? <Pencil className="h-4 w-4 text-india-green" /> : <Plus className="h-4 w-4 text-india-green" />} {editId ? "Edit category" : "Add category"}</p>
      <label className="text-[11px] font-semibold text-muted-foreground">Name</label>
      <input className={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Government Services" onKeyDown={(e) => e.key === "Enter" && saveCat()} />
      <label className="mt-3 block text-[11px] font-semibold text-muted-foreground">Assign operator (receives applications)</label>
      <select className={inp} value={operatorId} onChange={(e) => setOperatorId(e.target.value)}>
        <option value="">Unassigned</option>
        {operators.map((o: Operator) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
      {operators.length === 0 && <p className="mt-1 text-[11px] text-amber-600">No operators yet — create one in User Management (role: Operator).</p>}
      <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-[oklch(0.55_0.12_150)]" /> Active</label>
      <div className="mt-4 flex gap-2">
        <Button onClick={saveCat} disabled={busy} className="flex-1 bg-india-green text-white hover:bg-india-green/90">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : editId ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {editId ? "Save" : "Add category"}</Button>
        {editId && <Button variant="outline" onClick={resetForm}><X className="h-4 w-4" /></Button>}
      </div>
    </div>
  );
}
