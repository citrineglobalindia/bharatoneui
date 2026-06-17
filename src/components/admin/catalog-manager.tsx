import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Loader2, Check, X, FolderTree, Boxes, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";
import { ServicesManager } from "@/components/admin/services-manager";

type Cat = { id: string; name: string; is_active: boolean; sort_order: number };
const inp = "h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30";
const Pill = ({ on }: { on: boolean }) => <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${on ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{on ? "Active" : "Inactive"}</span>;

export function CatalogManager() {
  const [tab, setTab] = useState<"categories" | "services">("categories");
  const [cats, setCats] = useState<Cat[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [svcTotal, setSvcTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      await ensureStaffSession();
      const [c, s] = await Promise.all([
        supabase.from("service_categories").select("*").order("sort_order").order("name"),
        supabase.from("services").select("category_id"),
      ]);
      setCats((c.data as Cat[]) ?? []);
      const rows = (s.data as { category_id: string | null }[]) ?? [];
      setSvcTotal(rows.length);
      const m: Record<string, number> = {};
      rows.forEach((r) => { if (r.category_id) m[r.category_id] = (m[r.category_id] ?? 0) + 1; });
      setCounts(m);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold">Service Catalog</h2>
          <p className="text-sm text-muted-foreground">Manage categories and services (Inlink, API-integrated or Backend) with charges and commission splits.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button>
      </div>

      <div className="inline-flex rounded-xl border border-border bg-card p-1">
        <button onClick={() => setTab("categories")} className={`inline-flex items-center gap-1.5 rounded-lg px-4 h-9 text-sm font-semibold transition ${tab === "categories" ? "bg-admin text-admin-foreground" : "text-muted-foreground hover:text-foreground"}`}><FolderTree className="h-4 w-4" /> Categories <span className="rounded-full bg-black/10 px-1.5 text-[11px]">{cats.length}</span></button>
        <button onClick={() => setTab("services")} className={`inline-flex items-center gap-1.5 rounded-lg px-4 h-9 text-sm font-semibold transition ${tab === "services" ? "bg-admin text-admin-foreground" : "text-muted-foreground hover:text-foreground"}`}><Boxes className="h-4 w-4" /> Services <span className="rounded-full bg-black/10 px-1.5 text-[11px]">{svcTotal}</span></button>
      </div>

      {tab === "categories"
        ? (loading ? <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div> : <CategoriesTab cats={cats} counts={counts} reload={load} />)
        : <ServicesManager />}
    </div>
  );
}

function CategoriesTab({ cats, counts, reload }: { cats: Cat[]; counts: Record<string, number>; reload: () => void }) {
  const [name, setName] = useState("");
  const [active, setActive] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState(false);

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
  const del = async (id: string) => { if (!confirm("Delete this category? Its services stay but become uncategorised.")) return; const { error } = await supabase.from("service_categories").delete().eq("id", id); if (error) return toast.error(error.message); toast.success("Deleted"); reload(); };

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
                <td className="px-4 py-2.5 text-muted-foreground">{counts[c.id] ?? 0}</td>
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
