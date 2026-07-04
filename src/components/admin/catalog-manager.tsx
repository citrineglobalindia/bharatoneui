import { useEffect, useState } from "react";
import { sanitizeMobile } from "@/lib/phone";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Loader2, Check, X, FolderTree, ChevronRight, UserCog, ArrowLeft, Layers, Tag, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";
import { ServicesManager } from "@/components/admin/services-manager";

type Cat = { id: string; name: string; is_active: boolean; sort_order: number; operator_id: string | null; service_group: string | null; kind: string };
type Operator = { id: string; name: string };
const inp = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30";
const Pill = ({ on }: { on: boolean }) => <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${on ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{on ? "Active" : "Inactive"}</span>;

export function CatalogManager({ kind = "backend", mode = "list" }: { kind?: "backend" | "frontend"; mode?: "add" | "list" } = {}) {
  const frontend = kind === "frontend";
  const [cats, setCats] = useState<Cat[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [opCounts, setOpCounts] = useState<Record<string, { total: number; active: number }>>({});
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<Cat | null>(null);

  // add/edit category form
  const [name, setName] = useState("");
  const [active, setActive] = useState(true);
  const [operatorId, setOperatorId] = useState("");
  const [serviceGroup, setServiceGroup] = useState("b2c");
  const [editId, setEditId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      await ensureStaffSession();
      // Categories are the critical data: fetch them on their own with a short
      // retry so a transient auth/network hiccup never leaves the list empty.
      let list: Cat[] | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data, error } = await (supabase as any)
          .from("service_categories")
          .select("id,name,is_active,sort_order,operator_id,service_group,kind")
          .eq("kind", kind).order("sort_order").order("name");
        if (!error) { list = (data as unknown as Cat[]) ?? []; break; }
        await ensureStaffSession();
        await new Promise((r) => setTimeout(r, 300));
      }
      // Only overwrite the list when the fetch actually succeeded (never wipe on error).
      if (list) {
        setCats(list);
        if (sel) setSel(list.find((x) => x.id === sel.id) ?? null);
      }

      // Auxiliary data (counts, operators) — failures here must NOT affect categories.
      const [s, u, co] = await Promise.allSettled([
        supabase.from("services").select("category_id"),
        supabase.rpc("admin_list_users"),
        supabase.from("category_operators").select("category_id,is_active"),
      ]);
      if (s.status === "fulfilled") {
        const rows = ((s.value.data as { category_id: string | null }[]) ?? []);
        const m: Record<string, number> = {};
        rows.forEach((r) => { if (r.category_id) m[r.category_id] = (m[r.category_id] ?? 0) + 1; });
        setCounts(m);
      }
      if (u.status === "fulfilled") {
        const ops = ((u.value.data as any[]) ?? []).filter((x) => Array.isArray(x.roles) && x.roles.includes("operator"))
          .map((x) => ({ id: x.id, name: x.display_name || x.email || "Operator" }));
        setOperators(ops);
      }
      if (co.status === "fulfilled") {
        const cm: Record<string, { total: number; active: number }> = {};
        ((co.value.data as any[]) ?? []).forEach((r) => { const e = cm[r.category_id] ?? { total: 0, active: 0 }; e.total++; if (r.is_active) e.active++; cm[r.category_id] = e; });
        setOpCounts(cm);
      }
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [kind]);

  const opName = (id: string | null) => id ? (operators.find((o) => o.id === id)?.name ?? "Assigned") : "Unassigned";

  const resetForm = () => { setName(""); setActive(true); setOperatorId(""); setServiceGroup("b2c"); setEditId(null); };
  const startEdit = (c: Cat) => { setEditId(c.id); setName(c.name); setActive(c.is_active); setOperatorId(c.operator_id ?? ""); setServiceGroup(c.service_group ?? "b2c"); };
  const saveCat = async () => {
    if (!name.trim()) return toast.error("Category name required");
    setBusy(true);
    const payload = { name: name.trim(), is_active: active, operator_id: frontend ? null : (operatorId || null), service_group: frontend ? null : serviceGroup, kind };
    const res = editId
      ? await (supabase as any).from("service_categories").update(payload).eq("id", editId)
      : await (supabase as any).from("service_categories").insert({ ...payload, sort_order: cats.length });
    setBusy(false);
    if (res.error) return toast.error("Save failed", { description: res.error.message });
    toast.success(editId ? "Category updated" : "Category added"); resetForm(); load();
  };
  const toggle = async (c: Cat) => { await (supabase as any).from("service_categories").update({ is_active: !c.is_active }).eq("id", c.id); load(); };
  const del = async (c: Cat) => { if (!confirm("Delete this category? Its services become uncategorised.")) return; const { error } = await (supabase as any).from("service_categories").delete().eq("id", c.id); if (error) return toast.error(error.message); if (sel?.id === c.id) setSel(null); toast.success("Deleted"); load(); };

  // ---- Detail view: a category's services ----
  if (sel) {
    return (
      <div className="space-y-5">
        <button onClick={() => setSel(null)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> All categories</button>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div>
            <p className="flex items-center gap-2 font-display text-lg font-extrabold"><FolderTree className="h-5 w-5 text-india-green" /> {sel.name} <Pill on={sel.is_active} /></p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">{frontend ? <FolderTree className="h-4 w-4" /> : <UserCog className="h-4 w-4" />}{!frontend && <>{(opCounts[sel.id]?.active ?? 0)} active operator(s) · </>}{counts[sel.id] ?? 0} service(s)</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => startEdit(sel)}><Pencil className="h-4 w-4" /> Edit category</Button>
        </div>
        {editId === sel.id && <CatForm {...{ name, setName, active, setActive, operatorId, setOperatorId, serviceGroup, setServiceGroup, operators, busy, saveCat, resetForm, editId, frontend }} />}
        {!frontend && <CategoryOperators categoryId={sel.id} allOperators={operators} onChange={load} />}
        <div>
          <p className="mb-2 text-sm font-bold">Services in this category</p>
          <p className="mb-3 text-xs text-muted-foreground">{frontend ? "Add redirect (Inlink) services — retailers open these from My Services." : "Add Inlink, API-integrated or Backend services. Set each service's total cost and commission split."}</p>
          <ServicesManager categoryId={sel.id} frontend={frontend} backendOnly={kind === "backend"} />
        </div>
      </div>
    );
  }

  const kindLabel = frontend ? "Frontend" : "Backend";

  // ---- Add Category page (standalone form) ----
  if (mode === "add") {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-soft sm:p-10">
          <div className="text-center">
            <h2 className="flex items-center justify-center gap-2.5 text-2xl font-extrabold text-saffron sm:text-3xl"><Layers className="h-7 w-7" /> Add New Category</h2>
            <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">Manage your {kindLabel.toLowerCase()} service categories efficiently</p>
          </div>

          <div className="mt-8">
            <label className="text-sm font-semibold text-foreground/80">Category Name</label>
            <div className="mt-1.5 flex overflow-hidden rounded-xl border border-border bg-background focus-within:ring-2 focus-within:ring-saffron/30">
              <div className="flex w-12 shrink-0 items-center justify-center bg-saffron text-white"><Tag className="h-5 w-5" /></div>
              <input
                className="h-12 flex-1 bg-transparent px-4 text-base outline-none"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter category name"
                onKeyDown={(e) => e.key === "Enter" && saveCat()}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">e.g., Web Development, Mobile Apps</p>
          </div>

          <div className="mt-6">
            <label className="text-sm font-semibold text-foreground/80">Status</label>
            <div className="mt-1.5 grid gap-4 sm:grid-cols-2">
              {[["Active", true], ["Inactive", false]].map(([label, val]) => {
                const selected = active === val;
                return (
                  <button
                    key={label as string}
                    type="button"
                    onClick={() => setActive(val as boolean)}
                    className={`flex items-center gap-3 rounded-xl border px-5 py-4 text-left transition ${selected ? "border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-500/30" : "border-border bg-background hover:bg-muted/40"}`}
                  >
                    <span className={`grid h-5 w-5 place-items-center rounded-full border-2 ${selected ? "border-blue-600" : "border-slate-300"}`}>
                      {selected && <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />}
                    </span>
                    <span className={`text-base font-medium ${selected ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={saveCat}
            disabled={busy || !name.trim()}
            className="mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-india-green text-base font-bold text-white transition hover:bg-india-green/90 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <PlusCircle className="h-5 w-5" />} Add Category
          </button>
        </div>
      </div>
    );
  }

  // ---- List view: categories are the main thing ----
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-extrabold">{frontend ? "Frontend Services — Categories" : "Service Catalog — Backend Categories"}</h2>
        <p className="text-sm text-muted-foreground">{frontend ? "Frontend categories appear in the retailer My Services menu. Open a category to add redirect (Inlink) services." : "Categories are the backbone — each can be handled by one or more operators; applications are split equally among the active ones. Open a category to map its services (Inlink, API, Backend) and commission splits."}</p>
      </div>
      {editId && !sel && <CatForm {...{ name, setName, active, setActive, operatorId, setOperatorId, serviceGroup, setServiceGroup, operators, busy, saveCat, resetForm, editId, frontend }} />}
      <div className="grid gap-5">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-4 py-2.5">Category</th>{!frontend && <th className="px-4 py-2.5">Operators</th>}<th className="px-4 py-2.5">Services</th><th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5 text-right">Actions</th></tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={frontend ? 4 : 5} className="px-4 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
                : cats.length === 0 ? <tr><td colSpan={frontend ? 4 : 5} className="px-4 py-10 text-center text-muted-foreground">No {kindLabel.toLowerCase()} categories yet. Add one →</td></tr>
                : cats.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3"><button onClick={() => setSel(c)} className="inline-flex items-center gap-1.5 font-semibold hover:text-india-green">{c.name} <ChevronRight className="h-4 w-4 text-muted-foreground" /></button></td>
                  {!frontend && <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 text-xs ${(opCounts[c.id]?.active ?? 0) ? "text-foreground" : "text-muted-foreground"}`}><UserCog className="h-3.5 w-3.5" /> {(opCounts[c.id]?.active ?? 0) ? `${opCounts[c.id].active} operator(s)` : "Unassigned"}</span></td>}
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
      </div>
    </div>
  );
}

function CatForm({ name, setName, active, setActive, operatorId, setOperatorId, serviceGroup, setServiceGroup, operators, busy, saveCat, resetForm, editId, frontend }: any) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <p className="mb-3 flex items-center gap-2 text-sm font-bold">{editId ? <Pencil className="h-4 w-4 text-india-green" /> : <Plus className="h-4 w-4 text-india-green" />} {editId ? "Edit category" : "Add category"}</p>
      <label className="text-[11px] font-semibold text-muted-foreground">Category Name</label>
      <input className={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder={frontend ? "e.g. B2C Services" : "e.g. Government Services"} onKeyDown={(e) => e.key === "Enter" && saveCat()} />
      {!frontend && (<>
      <label className="mt-3 block text-[11px] font-semibold text-muted-foreground">Service group (retailer menu)</label>
      <select className={inp} value={serviceGroup} onChange={(e) => setServiceGroup(e.target.value)}>
        <option value="b2c">B2C Services</option>
        <option value="g2c">G2C Services</option>
        <option value="state_gov">State Government Services</option>
        <option value="central_gov">Central Government Services</option>
        <option value="internal_links">Internal Links</option>
        <option value="mart">BharatOne Mart - Separate KYC</option>
      </select>
      <label className="mt-3 block text-[11px] font-semibold text-muted-foreground">Assign operator (receives applications)</label>
      <select className={inp} value={operatorId} onChange={(e) => setOperatorId(e.target.value)}>
        <option value="">Unassigned</option>
        {operators.map((o: Operator) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
      {operators.length === 0 && <p className="mt-1 text-[11px] text-amber-600">No operators yet — create one in User Management (role: Operator).</p>}
      </>)}
      <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-[oklch(0.55_0.12_150)]" /> Active</label>
      <div className="mt-4 flex gap-2">
        <Button onClick={saveCat} disabled={busy} className="flex-1 bg-india-green text-white hover:bg-india-green/90">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : editId ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {editId ? "Save" : "Add category"}</Button>
        {editId && <Button variant="outline" onClick={resetForm}><X className="h-4 w-4" /></Button>}
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
  const activeCount = rows.filter((r) => r.is_active).length;

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
                    <button onClick={() => remove(op)} className="text-rose-500 hover:text-rose-700"><Trash2 className="inline h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-[11px] text-muted-foreground">{activeCount} active · new applications share equally across them.</p>
    </div>
  );
}
