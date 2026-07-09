import { useEffect, useState } from "react";
import { sanitizeMobile } from "@/lib/phone";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Loader2, Check, X, FolderTree, ChevronRight, UserCog, ArrowLeft, CornerDownRight, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";
import { ServicesManager } from "@/components/admin/services-manager";

type Cat = { id: string; name: string; is_active: boolean; sort_order: number; kind?: string | null; parent_id?: string | null };
type Sub = { id: string; category_id: string; name: string; is_active: boolean; sort_order: number };
type Operator = { id: string; name: string };
const db = supabase as any;
const inp = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30";
const Pill = ({ on }: { on: boolean }) => <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${on ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{on ? "Active" : "Inactive"}</span>;

// Unified Service Catalog: Category -> Sub-Category -> Service (Direct / Backend / API),
// with operator assignment per category.
export function CatalogManager() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [svcCats, setSvcCats] = useState<Cat[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [svcCounts, setSvcCounts] = useState<Record<string, number>>({});
  const [opCounts, setOpCounts] = useState<Record<string, { total: number; active: number }>>({});
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<Cat | null>(null);
  const [selSub, setSelSub] = useState<Sub | null>(null);

  const [name, setName] = useState("");
  const [active, setActive] = useState(true);
  const [parentId, setParentId] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newSub, setNewSub] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    try {
      await ensureStaffSession();
      const [c, s, sv, u, co] = await Promise.all([
        db.from("service_categories").select("id,name,is_active,sort_order,kind,parent_id").order("sort_order").order("name"),
        db.from("service_subcategories").select("id,category_id,name,is_active,sort_order").order("sort_order").order("name"),
        db.from("services").select("subcategory_id,category_id"),
        db.rpc("admin_list_users"),
        db.from("category_operators").select("category_id,is_active"),
      ]);
      const all = (c.data as Cat[]) ?? [];
      // Two levels: Service Category (kind='frontend', the retailer/distributor menu group)
      // and Category (everything else — operator-managed, holds sub-categories & services).
      const cl = all.filter((x) => x.kind !== "frontend");
      setCats(cl);
      setSvcCats(all.filter((x) => x.kind === "frontend"));
      const sl = (s.data as Sub[]) ?? [];
      setSubs(sl);
      if (sel) setSel(cl.find((x) => x.id === sel.id) ?? null);
      if (selSub) setSelSub(sl.find((x) => x.id === selSub.id) ?? null);
      const sc: Record<string, number> = {};
      ((sv.data as { subcategory_id: string | null; category_id: string | null }[]) ?? []).forEach((r) => {
        const k = r.subcategory_id || r.category_id; if (k) sc[k] = (sc[k] ?? 0) + 1;
      });
      setSvcCounts(sc);
      const ops = ((u.data as any[]) ?? []).filter((x) => Array.isArray(x.roles) && x.roles.includes("operator"))
        .map((x) => ({ id: x.id, name: x.display_name || x.email || "Operator" }));
      setOperators(ops);
      const cm: Record<string, { total: number; active: number }> = {};
      ((co.data as any[]) ?? []).forEach((r) => { const e = cm[r.category_id] ?? { total: 0, active: 0 }; e.total++; if (r.is_active) e.active++; cm[r.category_id] = e; });
      setOpCounts(cm);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const resetForm = () => { setName(""); setActive(true); setParentId(""); setEditId(null); };
  const startEdit = (c: Cat) => { setEditId(c.id); setName(c.name); setActive(c.is_active); setParentId(c.parent_id ?? ""); };
  const saveCat = async () => {
    if (!name.trim()) return toast.error("Category name required");
    setBusy(true);
    await ensureStaffSession();
    // parent_id = the Service Category this Category belongs under (retailer/distributor menu group).
    const payload = { name: name.trim(), is_active: active, parent_id: parentId || null };
    const res = editId
      ? await db.from("service_categories").update(payload).eq("id", editId)
      // kind:'backend' → a mid-level Category (operator-managed). Service Categories (the
      // retailer/distributor menu groups) are created separately as kind:'frontend'.
      : await db.from("service_categories").insert({ ...payload, kind: "backend", sort_order: cats.length });
    setBusy(false);
    if (res.error) return toast.error("Save failed", { description: res.error.message });
    toast.success(editId ? "Category updated" : "Category added"); resetForm(); load();
  };
  const setCatParent = async (c: Cat, pid: string) => {
    await ensureStaffSession();
    const { error } = await db.from("service_categories").update({ parent_id: pid || null }).eq("id", c.id);
    if (error) return toast.error("Mapping failed", { description: error.message });
    toast.success(pid ? "Mapped to Service Category" : "Unmapped"); load();
  };
  const toggleCat = async (c: Cat) => { await db.from("service_categories").update({ is_active: !c.is_active }).eq("id", c.id); load(); };
  const delCat = async (c: Cat) => { if (!confirm("Delete this category and its sub-categories? Services become uncategorised.")) return; const { error } = await db.from("service_categories").delete().eq("id", c.id); if (error) return toast.error(error.message); if (sel?.id === c.id) setSel(null); toast.success("Deleted"); load(); };

  const addSub = async (catId: string) => {
    const nm = (newSub[catId] || "").trim();
    if (!nm) return toast.error("Sub-category name required");
    const count = subs.filter((s) => s.category_id === catId).length;
    const { error } = await db.from("service_subcategories").insert({ category_id: catId, name: nm, sort_order: count });
    if (error) return toast.error("Add failed", { description: error.message });
    setNewSub((m) => ({ ...m, [catId]: "" })); toast.success("Sub-category added"); load();
  };
  const saveSub = async (s: Sub) => { const { error } = await db.from("service_subcategories").update({ name: s.name }).eq("id", s.id); if (error) return toast.error(error.message); toast.success("Saved"); };
  const toggleSub = async (s: Sub) => { await db.from("service_subcategories").update({ is_active: !s.is_active }).eq("id", s.id); load(); };
  const delSub = async (s: Sub) => { if (!confirm("Delete this sub-category? Its services become uncategorised.")) return; const { error } = await db.from("service_subcategories").delete().eq("id", s.id); if (error) return toast.error(error.message); if (selSub?.id === s.id) setSelSub(null); toast.success("Deleted"); load(); };
  const patchSub = (id: string, p: Partial<Sub>) => setSubs((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)));

  // ---- Sub-category detail: manage services under it ----
  if (sel && selSub) {
    return (
      <div className="space-y-5">
        <button onClick={() => setSelSub(null)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> {sel.name}</button>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <p className="flex items-center gap-2 font-display text-lg font-extrabold"><FolderTree className="h-5 w-5 text-india-green" /> {sel.name} <ChevronRight className="h-4 w-4 text-muted-foreground" /> {selSub.name} <Pill on={selSub.is_active} /></p>
          <p className="mt-1 text-sm text-muted-foreground">Add services under this sub-category. Each service is a <b>Direct</b> (link), <b>Backend</b> (form) or <b>API</b> service.</p>
        </div>
        <ServicesManager subcategoryId={selSub.id} categoryId={sel.id} />
      </div>
    );
  }

  // ---- Category detail: operators + sub-categories ----
  if (sel) {
    const mySubs = subs.filter((s) => s.category_id === sel.id);
    return (
      <div className="space-y-5">
        <button onClick={() => setSel(null)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> All categories</button>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div>
            <p className="flex items-center gap-2 font-display text-lg font-extrabold"><FolderTree className="h-5 w-5 text-india-green" /> {sel.name} <Pill on={sel.is_active} /></p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><UserCog className="h-4 w-4" /> {(opCounts[sel.id]?.active ?? 0)} active operator(s) · {mySubs.length} sub-categor(y/ies)</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => startEdit(sel)}><Pencil className="h-4 w-4" /> Edit category</Button>
        </div>
        {editId === sel.id && <CatForm {...{ name, setName, active, setActive, busy, saveCat, resetForm, editId, svcCats, parentId, setParentId }} />}

        <CategoryOperators categoryId={sel.id} allOperators={operators} onChange={load} />

        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <p className="mb-3 text-sm font-bold">Sub-categories</p>
          <div className="space-y-2">
            {mySubs.length === 0 ? <p className="text-sm text-muted-foreground">No sub-categories yet. Add one below.</p> : mySubs.map((s) => (
              <div key={s.id} className={`flex flex-wrap items-center gap-2 rounded-xl border border-border p-2.5 ${s.is_active ? "" : "opacity-60"}`}>
                <CornerDownRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input value={s.name} onChange={(e) => patchSub(s.id, { name: e.target.value })} className={inp + " max-w-xs"} />
                <span className="text-xs text-muted-foreground">{svcCounts[s.id] ?? 0} service(s)</span>
                <div className="ml-auto flex items-center gap-2">
                  <Button size="sm" className="bg-india-green text-white" onClick={() => { setSelSub(s); }}>Open <ChevronRight className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="outline" onClick={() => saveSub(s)}><Check className="h-3.5 w-3.5" /> Save</Button>
                  <button onClick={() => toggleSub(s)} className="rounded-md border border-border px-2 py-1.5 text-[11px] font-semibold hover:bg-muted">{s.is_active ? "Hide" : "Show"}</button>
                  <button onClick={() => delSub(s)} className="rounded-md border border-rose-200 px-2 py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50"><Trash2 className="h-3 w-3" /></button>
                </div>
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <input value={newSub[sel.id] || ""} onChange={(e) => setNewSub((m) => ({ ...m, [sel.id]: e.target.value }))} placeholder="Add sub-category" className={inp + " max-w-xs"} onKeyDown={(e) => e.key === "Enter" && addSub(sel.id)} />
              <Button size="sm" variant="outline" onClick={() => addSub(sel.id)}><Plus className="h-3.5 w-3.5" /> Add sub-category</Button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <p className="mb-1 text-sm font-bold">Services in this category</p>
          <p className="mb-3 text-xs text-muted-foreground">Add <b>Direct</b> / <b>Backend</b> / <b>API</b> services. Assign each to a sub-category (optional).</p>
          <ServicesManager categoryId={sel.id} subcategories={mySubs.map((s) => ({ id: s.id, name: s.name }))} />
        </div>
      </div>
    );
  }

  // ---- Category list ----
  return (
    <div className="space-y-5">
      <ServiceCategoriesPanel svcCats={svcCats} onChange={load} />
      <div>
        <h2 className="text-lg font-extrabold">Service Catalog — Categories</h2>
        <p className="text-sm text-muted-foreground">Each category is handled by one or more operators, and belongs under a <b>Service Category</b> (the retailer/distributor menu group above). Open a category to manage its sub-categories, and open a sub-category to add Direct / Backend / API services.</p>
      </div>
      {editId === null && <CatForm {...{ name, setName, active, setActive, busy, saveCat, resetForm, editId, svcCats, parentId, setParentId }} />}
      {editId && !sel && <CatForm {...{ name, setName, active, setActive, busy, saveCat, resetForm, editId, svcCats, parentId, setParentId }} />}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr><th className="px-4 py-2.5">Category</th><th className="px-4 py-2.5">Service Category</th><th className="px-4 py-2.5">Operators</th><th className="px-4 py-2.5">Sub-categories</th><th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
              : cats.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No categories yet. Add one →</td></tr>
              : cats.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3"><button onClick={() => setSel(c)} className="inline-flex items-center gap-1.5 font-semibold hover:text-india-green">{c.name} <ChevronRight className="h-4 w-4 text-muted-foreground" /></button></td>
                  <td className="px-4 py-3">
                    <select value={c.parent_id ?? ""} onChange={(e) => setCatParent(c, e.target.value)} className="h-8 max-w-[190px] rounded-lg border border-border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-india-green/30">
                      <option value="">— Not mapped —</option>
                      {svcCats.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 text-xs ${(opCounts[c.id]?.active ?? 0) ? "text-foreground" : "text-muted-foreground"}`}><UserCog className="h-3.5 w-3.5" /> {(opCounts[c.id]?.active ?? 0) ? `${opCounts[c.id].active} operator(s)` : "Unassigned"}</span></td>
                  <td className="px-4 py-3 text-muted-foreground">{subs.filter((s) => s.category_id === c.id).length}</td>
                  <td className="px-4 py-3"><Pill on={c.is_active} /></td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => setSel(c)} className="mr-3 text-xs font-semibold text-india-green hover:underline">Open</button>
                    <button onClick={() => toggleCat(c)} className="mr-3 text-xs font-semibold text-muted-foreground hover:text-foreground">{c.is_active ? "Deactivate" : "Activate"}</button>
                    <button onClick={() => startEdit(c)} className="mr-3 text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => delCat(c)} className="text-rose-500 hover:text-rose-700"><Trash2 className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CatForm({ name, setName, active, setActive, busy, saveCat, resetForm, editId, svcCats = [], parentId, setParentId }: any) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <p className="mb-3 flex items-center gap-2 text-sm font-bold">{editId ? <Pencil className="h-4 w-4 text-india-green" /> : <Plus className="h-4 w-4 text-india-green" />} {editId ? "Edit category" : "Add category"}</p>
      <label className="text-[11px] font-semibold text-muted-foreground">Category Name</label>
      <input className={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Government Services" onKeyDown={(e) => e.key === "Enter" && saveCat()} />
      <label className="mt-3 block text-[11px] font-semibold text-muted-foreground">Service Category (retailer/distributor menu)</label>
      <select className={inp} value={parentId ?? ""} onChange={(e) => setParentId(e.target.value)}>
        <option value="">— Not mapped —</option>
        {(svcCats as Cat[]).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      {svcCats.length === 0 && <p className="mt-1 text-[11px] text-amber-600">Create a Service Category above first.</p>}
      <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-[oklch(0.55_0.12_150)]" /> Active</label>
      <div className="mt-4 flex gap-2">
        <Button onClick={saveCat} disabled={busy} className="flex-1 bg-india-green text-white hover:bg-india-green/90">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : editId ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {editId ? "Save" : "Add category"}</Button>
        {editId && <Button variant="outline" onClick={resetForm}><X className="h-4 w-4" /></Button>}
      </div>
    </div>
  );
}

// ---- Service Categories (top level = retailer/distributor "My Services" menu groups) ----
function ServiceCategoriesPanel({ svcCats, onChange }: { svcCats: Cat[]; onChange: () => void }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const add = async () => {
    if (!name.trim()) return toast.error("Service Category name required");
    setBusy(true);
    await ensureStaffSession();
    const { error } = await db.from("service_categories").insert({ name: name.trim(), kind: "frontend", is_active: true, sort_order: svcCats.length });
    setBusy(false);
    if (error) return toast.error("Add failed", { description: error.message });
    setName(""); toast.success("Service Category added"); onChange();
  };
  const saveEdit = async (id: string) => {
    if (!editName.trim()) return;
    await ensureStaffSession();
    const { error } = await db.from("service_categories").update({ name: editName.trim() }).eq("id", id);
    if (error) return toast.error(error.message);
    setEditId(null); toast.success("Saved"); onChange();
  };
  const toggle = async (c: Cat) => { await ensureStaffSession(); await db.from("service_categories").update({ is_active: !c.is_active }).eq("id", c.id); onChange(); };
  const del = async (c: Cat) => { if (!confirm("Delete this Service Category? Categories mapped under it become unmapped.")) return; await ensureStaffSession(); const { error } = await db.from("service_categories").delete().eq("id", c.id); if (error) return toast.error(error.message); toast.success("Deleted"); onChange(); };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <p className="flex items-center gap-2 font-display text-lg font-extrabold"><Layers className="h-5 w-5 text-india-green" /> Service Categories</p>
      <p className="mt-1 text-sm text-muted-foreground">Top-level menu groups shown to retailers &amp; distributors under <b>My Services</b> (e.g. B2C Services, G2C Services). Create these first, then map Categories &amp; services to them.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. G2C Services" className={inp + " max-w-xs"} onKeyDown={(e) => e.key === "Enter" && add()} />
        <Button onClick={add} disabled={busy} className="bg-india-green text-white hover:bg-india-green/90">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add Service Category</Button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {svcCats.length === 0 ? <p className="text-sm text-muted-foreground">No Service Categories yet. Add one above.</p>
          : svcCats.map((c) => (
            <div key={c.id} className={`flex items-center gap-2 rounded-xl border border-border px-3 py-2 ${c.is_active ? "" : "opacity-60"}`}>
              {editId === c.id ? (
                <>
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} className={inp + " h-8 w-40"} onKeyDown={(e) => e.key === "Enter" && saveEdit(c.id)} />
                  <button onClick={() => saveEdit(c.id)} className="text-india-green"><Check className="h-4 w-4" /></button>
                  <button onClick={() => setEditId(null)} className="text-muted-foreground"><X className="h-4 w-4" /></button>
                </>
              ) : (
                <>
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">{c.name}</span>
                  <Pill on={c.is_active} />
                  <button onClick={() => { setEditId(c.id); setEditName(c.name); }} className="text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => toggle(c)} className="text-[11px] font-semibold text-muted-foreground hover:text-foreground">{c.is_active ? "Hide" : "Show"}</button>
                  <button onClick={() => del(c)} className="text-rose-500 hover:text-rose-700"><Trash2 className="h-3.5 w-3.5" /></button>
                </>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}

type CatOp = { operator_id: string; name: string; phone: string | null; is_active: boolean; assigned_count: number; pending: number };

function CategoryOperators({ categoryId, allOperators, onChange }: { categoryId: string; allOperators: Operator[]; onChange: () => void }) {
  const [rows, setRows] = useState<CatOp[]>([]);
  const [loading, setLoading] = useState(true);
  const [addId, setAddId] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.rpc("category_operators_list", { _cat: categoryId });
    setRows((data as CatOp[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [categoryId]);

  const addOp = async () => {
    if (!addId) return;
    setBusy(true);
    const { error } = await supabase.rpc("set_category_operator", { _cat: categoryId, _op: addId, _active: true });
    setBusy(false);
    if (error) return toast.error("Could not add operator", { description: error.message });
    setAddId(""); toast.success("Operator assigned"); await load(); onChange();
  };
  const toggle = async (op: CatOp) => {
    const { error } = await supabase.rpc("set_category_operator", { _cat: categoryId, _op: op.operator_id, _active: !op.is_active });
    if (error) return toast.error(error.message);
    toast.success(op.is_active ? "Operator paused — pending work redistributed" : "Operator activated");
    await load(); onChange();
  };
  const remove = async (op: CatOp) => {
    if (!confirm(`Remove ${op.name} from this category? Their pending applications will be redistributed.`)) return;
    const { error } = await supabase.rpc("remove_category_operator", { _cat: categoryId, _op: op.operator_id });
    if (error) return toast.error(error.message);
    toast.success("Operator removed"); await load(); onChange();
  };
  const savePhone = async (op: CatOp, phone: string) => {
    const { error } = await supabase.rpc("set_operator_phone", { _op: op.operator_id, _phone: phone });
    if (error) return toast.error(error.message);
    setRows((rs) => rs.map((r) => r.operator_id === op.operator_id ? { ...r, phone: phone || null } : r));
    toast.success("Operator contact saved");
  };

  const unassigned = allOperators.filter((o) => !rows.some((r) => r.operator_id === o.id));

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="mb-1 flex items-center gap-2 text-sm font-bold"><UserCog className="h-4 w-4 text-india-green" /> Operators handling this category</div>
      <p className="mb-4 text-xs text-muted-foreground">Applications are distributed <b>equally</b> among <b>active</b> operators. Pause one and its pending work is re-split among the rest.</p>
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <div className="min-w-[220px] flex-1">
          <label className="text-[11px] font-semibold text-muted-foreground">Add operator</label>
          <select className={inp} value={addId} onChange={(e) => setAddId(e.target.value)}>
            <option value="">Select an operator…</option>
            {unassigned.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
        <Button onClick={addOp} disabled={busy || !addId} className="bg-india-green text-white hover:bg-india-green/90">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Assign</Button>
      </div>
      {loading ? <div className="py-6 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>
        : rows.length === 0 ? <p className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-6 text-center text-sm text-muted-foreground">No operators assigned yet. Applications for this category won't be routed until you add one.</p>
        : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-3 py-2">Operator</th><th className="px-3 py-2">Contact no.</th><th className="px-3 py-2 text-right">Total</th><th className="px-3 py-2 text-right">Pending</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Actions</th></tr>
            </thead>
            <tbody>
              {rows.map((op) => (
                <tr key={op.operator_id} className="border-t border-border">
                  <td className="px-3 py-2 font-semibold">{op.name}</td>
                  <td className="px-3 py-2"><input defaultValue={op.phone ?? ""} placeholder="Phone" onBlur={(e) => { const v = sanitizeMobile(e.target.value); e.target.value = v; if (v !== (op.phone ?? "")) savePhone(op, v); }} inputMode="numeric" maxLength={10} className="h-8 w-32 rounded-lg border border-border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-india-green/30" /></td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{op.assigned_count}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{op.pending}</td>
                  <td className="px-3 py-2"><Pill on={op.is_active} /></td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button onClick={() => toggle(op)} className="mr-3 text-xs font-semibold text-muted-foreground hover:text-foreground">{op.is_active ? "Pause" : "Activate"}</button>
                    <button onClick={() => remove(op)} className="text-rose-500 hover:text-rose-700"><Trash2 className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
