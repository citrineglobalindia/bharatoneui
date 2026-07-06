import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Check, FolderTree, Eye, EyeOff, CornerDownRight, Flag, Package } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Cat = { id: string; name: string; sort_order: number; is_active: boolean };
type Sub = { id: string; category_id: string; name: string; sort_order: number; is_active: boolean };
type Prod = { id: string; category_id: string | null; subcategory_id: string | null; name: string; sort_order: number; is_active: boolean };
type Prio = { id: string; name: string; sort_order: number; is_active: boolean };

const db = supabase as any;
const input = "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30";

export function SupportCategoriesManager() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [prods, setProds] = useState<Prod[]>([]);
  const [prios, setPrios] = useState<Prio[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCat, setNewCat] = useState("");
  const [newSub, setNewSub] = useState<Record<string, string>>({});
  const [newProd, setNewProd] = useState<Record<string, string>>({});
  const [newPrio, setNewPrio] = useState("");

  async function load() {
    setLoading(true);
    const [c, s, p, pr] = await Promise.all([
      db.from("support_categories").select("*").order("sort_order").order("name"),
      db.from("support_subcategories").select("*").order("sort_order").order("name"),
      db.from("support_products").select("*").order("sort_order").order("name"),
      db.from("support_priorities").select("*").order("sort_order").order("name"),
    ]);
    setCats((c.data as Cat[]) ?? []);
    setSubs((s.data as Sub[]) ?? []);
    setProds((p.data as Prod[]) ?? []);
    setPrios((pr.data as Prio[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const patchCat = (id: string, p: Partial<Cat>) => setCats((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const patchSub = (id: string, p: Partial<Sub>) => setSubs((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const patchProd = (id: string, p: Partial<Prod>) => setProds((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const patchPrio = (id: string, p: Partial<Prio>) => setPrios((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)));

  // ---- Categories ----
  const addCat = async () => {
    if (!newCat.trim()) return toast.error("Category name is required");
    const { error } = await db.from("support_categories").insert({ name: newCat.trim(), sort_order: cats.length });
    if (error) return toast.error("Add failed", { description: error.message });
    setNewCat(""); toast.success("Category added"); load();
  };
  const saveCat = async (c: Cat) => { const { error } = await db.from("support_categories").update({ name: c.name }).eq("id", c.id); if (error) return toast.error("Save failed", { description: error.message }); toast.success("Category saved"); };
  const toggleCat = async (c: Cat) => { const { error } = await db.from("support_categories").update({ is_active: !c.is_active }).eq("id", c.id); if (error) return toast.error(error.message); patchCat(c.id, { is_active: !c.is_active }); };
  const delCat = async (c: Cat) => { if (!confirm(`Delete category "${c.name}" and all its sub-categories & products?`)) return; const { error } = await db.from("support_categories").delete().eq("id", c.id); if (error) return toast.error("Delete failed", { description: error.message }); setCats((xs) => xs.filter((x) => x.id !== c.id)); setSubs((xs) => xs.filter((x) => x.category_id !== c.id)); setProds((xs) => xs.filter((x) => x.category_id !== c.id)); toast.success("Category deleted"); };

  // ---- Sub-categories ----
  const addSub = async (catId: string) => {
    const name = (newSub[catId] || "").trim();
    if (!name) return toast.error("Sub-category name is required");
    const count = subs.filter((s) => s.category_id === catId).length;
    const { error } = await db.from("support_subcategories").insert({ category_id: catId, name, sort_order: count });
    if (error) return toast.error("Add failed", { description: error.message });
    setNewSub((m) => ({ ...m, [catId]: "" })); toast.success("Sub-category added"); load();
  };
  const saveSub = async (s: Sub) => { const { error } = await db.from("support_subcategories").update({ name: s.name }).eq("id", s.id); if (error) return toast.error("Save failed", { description: error.message }); toast.success("Sub-category saved"); };
  const toggleSub = async (s: Sub) => { const { error } = await db.from("support_subcategories").update({ is_active: !s.is_active }).eq("id", s.id); if (error) return toast.error(error.message); patchSub(s.id, { is_active: !s.is_active }); };
  const delSub = async (s: Sub) => { const { error } = await db.from("support_subcategories").delete().eq("id", s.id); if (error) return toast.error("Delete failed", { description: error.message }); setSubs((xs) => xs.filter((x) => x.id !== s.id)); setProds((xs) => xs.filter((x) => x.subcategory_id !== s.id)); toast.success("Sub-category deleted"); };

  // ---- Products / Services (mapped to a sub-category) ----
  const addProd = async (sub: Sub) => {
    const name = (newProd[sub.id] || "").trim();
    if (!name) return toast.error("Product / service name is required");
    const count = prods.filter((p) => p.subcategory_id === sub.id).length;
    const { error } = await db.from("support_products").insert({ category_id: sub.category_id, subcategory_id: sub.id, name, sort_order: count });
    if (error) return toast.error("Add failed", { description: error.message });
    setNewProd((m) => ({ ...m, [sub.id]: "" })); toast.success("Product / service added"); load();
  };
  const saveProd = async (p: Prod) => { const { error } = await db.from("support_products").update({ name: p.name }).eq("id", p.id); if (error) return toast.error("Save failed", { description: error.message }); toast.success("Saved"); };
  const toggleProd = async (p: Prod) => { const { error } = await db.from("support_products").update({ is_active: !p.is_active }).eq("id", p.id); if (error) return toast.error(error.message); patchProd(p.id, { is_active: !p.is_active }); };
  const delProd = async (p: Prod) => { const { error } = await db.from("support_products").delete().eq("id", p.id); if (error) return toast.error("Delete failed", { description: error.message }); setProds((xs) => xs.filter((x) => x.id !== p.id)); toast.success("Deleted"); };

  // ---- Priorities ----
  const addPrio = async () => {
    if (!newPrio.trim()) return toast.error("Priority name is required");
    const { error } = await db.from("support_priorities").insert({ name: newPrio.trim(), sort_order: prios.length });
    if (error) return toast.error("Add failed", { description: error.message });
    setNewPrio(""); toast.success("Priority added"); load();
  };
  const savePrio = async (p: Prio) => { const { error } = await db.from("support_priorities").update({ name: p.name }).eq("id", p.id); if (error) return toast.error("Save failed", { description: error.message }); toast.success("Priority saved"); };
  const togglePrio = async (p: Prio) => { const { error } = await db.from("support_priorities").update({ is_active: !p.is_active }).eq("id", p.id); if (error) return toast.error(error.message); patchPrio(p.id, { is_active: !p.is_active }); };
  const delPrio = async (p: Prio) => { const { error } = await db.from("support_priorities").delete().eq("id", p.id); if (error) return toast.error("Delete failed", { description: error.message }); setPrios((xs) => xs.filter((x) => x.id !== p.id)); toast.success("Priority deleted"); };

  const HideBtn = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
    <button onClick={onClick} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1.5 text-[11px] font-semibold hover:bg-muted">
      {on ? <><EyeOff className="h-3 w-3" /> Hide</> : <><Eye className="h-3 w-3" /> Show</>}
    </button>
  );
  const DelBtn = ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick} className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-2 py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50"><Trash2 className="h-3 w-3" /> Delete</button>
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="mb-3 flex items-center gap-2 text-sm font-bold"><FolderTree className="h-4 w-4 text-india-green" /> Add support category</p>
        <div className="flex gap-2">
          <input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="e.g. Onboarding" className={input} onKeyDown={(e) => e.key === "Enter" && addCat()} />
          <Button className="bg-india-green text-white" onClick={addCat}><Plus className="h-4 w-4" /> Add</Button>
        </div>
      </div>

      {loading ? (
        <div className="grid h-32 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-india-green" /></div>
      ) : (
        <>
          {cats.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No categories yet. Add one above.</p>
          ) : (
            <div className="space-y-4">
              {cats.map((c) => (
                <div key={c.id} className={`rounded-2xl border border-border bg-card p-4 shadow-soft ${c.is_active ? "" : "opacity-60"}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <input value={c.name} onChange={(e) => patchCat(c.id, { name: e.target.value })} className={input + " max-w-xs font-semibold"} />
                    <Button size="sm" className="bg-india-green text-white" onClick={() => saveCat(c)}><Check className="h-3.5 w-3.5" /> Save</Button>
                    <HideBtn on={c.is_active} onClick={() => toggleCat(c)} />
                    <DelBtn onClick={() => delCat(c)} />
                  </div>

                  <div className="mt-3 space-y-3 border-l-2 border-border pl-4">
                    {subs.filter((s) => s.category_id === c.id).map((s) => (
                      <div key={s.id} className={s.is_active ? "" : "opacity-60"}>
                        <div className="flex flex-wrap items-center gap-2">
                          <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <input value={s.name} onChange={(e) => patchSub(s.id, { name: e.target.value })} className={input + " max-w-xs"} />
                          <Button size="sm" variant="outline" onClick={() => saveSub(s)}><Check className="h-3.5 w-3.5" /> Save</Button>
                          <HideBtn on={s.is_active} onClick={() => toggleSub(s)} />
                          <DelBtn onClick={() => delSub(s)} />
                        </div>
                        {/* Products / Services under this sub-category */}
                        <div className="mt-2 ml-6 space-y-1.5 border-l border-dashed border-border pl-3">
                          {prods.filter((p) => p.subcategory_id === s.id).map((p) => (
                            <div key={p.id} className={`flex flex-wrap items-center gap-2 ${p.is_active ? "" : "opacity-60"}`}>
                              <Package className="h-3 w-3 shrink-0 text-muted-foreground" />
                              <input value={p.name} onChange={(e) => patchProd(p.id, { name: e.target.value })} className={input + " max-w-[220px] text-xs"} />
                              <Button size="sm" variant="outline" onClick={() => saveProd(p)}><Check className="h-3 w-3" /></Button>
                              <HideBtn on={p.is_active} onClick={() => toggleProd(p)} />
                              <DelBtn onClick={() => delProd(p)} />
                            </div>
                          ))}
                          <div className="flex gap-2 pt-0.5">
                            <input value={newProd[s.id] || ""} onChange={(e) => setNewProd((m) => ({ ...m, [s.id]: e.target.value }))} placeholder="Add product / service" className={input + " max-w-[220px] text-xs"} onKeyDown={(e) => e.key === "Enter" && addProd(s)} />
                            <Button size="sm" variant="outline" onClick={() => addProd(s)}><Plus className="h-3 w-3" /> Add</Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-2 pt-1">
                      <input value={newSub[c.id] || ""} onChange={(e) => setNewSub((m) => ({ ...m, [c.id]: e.target.value }))} placeholder="Add sub-category" className={input + " max-w-xs"} onKeyDown={(e) => e.key === "Enter" && addSub(c.id)} />
                      <Button size="sm" variant="outline" onClick={() => addSub(c.id)}><Plus className="h-3.5 w-3.5" /> Add sub</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Priorities */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <p className="mb-3 flex items-center gap-2 text-sm font-bold"><Flag className="h-4 w-4 text-india-green" /> Ticket priorities</p>
            <div className="mb-3 flex gap-2">
              <input value={newPrio} onChange={(e) => setNewPrio(e.target.value)} placeholder="e.g. Urgent" className={input + " max-w-xs"} onKeyDown={(e) => e.key === "Enter" && addPrio()} />
              <Button size="sm" className="bg-india-green text-white" onClick={addPrio}><Plus className="h-3.5 w-3.5" /> Add priority</Button>
            </div>
            <div className="space-y-2">
              {prios.length === 0 ? <p className="text-sm text-muted-foreground">No priorities yet.</p> : prios.map((p) => (
                <div key={p.id} className={`flex flex-wrap items-center gap-2 ${p.is_active ? "" : "opacity-60"}`}>
                  <input value={p.name} onChange={(e) => patchPrio(p.id, { name: e.target.value })} className={input + " max-w-xs"} />
                  <Button size="sm" variant="outline" onClick={() => savePrio(p)}><Check className="h-3.5 w-3.5" /> Save</Button>
                  <HideBtn on={p.is_active} onClick={() => togglePrio(p)} />
                  <DelBtn onClick={() => delPrio(p)} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
