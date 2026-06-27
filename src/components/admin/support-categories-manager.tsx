import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Check, FolderTree, Eye, EyeOff, CornerDownRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Cat = { id: string; name: string; sort_order: number; is_active: boolean };
type Sub = { id: string; category_id: string; name: string; sort_order: number; is_active: boolean };

const input = "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30";

export function SupportCategoriesManager() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCat, setNewCat] = useState("");
  const [newSub, setNewSub] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    const [c, s] = await Promise.all([
      supabase.from("support_categories").select("*").order("sort_order").order("name"),
      supabase.from("support_subcategories").select("*").order("sort_order").order("name"),
    ]);
    setCats((c.data as Cat[]) ?? []);
    setSubs((s.data as Sub[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const patchCat = (id: string, p: Partial<Cat>) => setCats((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const patchSub = (id: string, p: Partial<Sub>) => setSubs((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)));

  const addCat = async () => {
    if (!newCat.trim()) return toast.error("Category name is required");
    const { error } = await supabase.from("support_categories").insert({ name: newCat.trim(), sort_order: cats.length });
    if (error) return toast.error("Add failed", { description: error.message });
    setNewCat(""); toast.success("Category added"); load();
  };
  const saveCat = async (c: Cat) => {
    const { error } = await supabase.from("support_categories").update({ name: c.name }).eq("id", c.id);
    if (error) return toast.error("Save failed", { description: error.message });
    toast.success("Category saved");
  };
  const toggleCat = async (c: Cat) => {
    const { error } = await supabase.from("support_categories").update({ is_active: !c.is_active }).eq("id", c.id);
    if (error) return toast.error(error.message);
    patchCat(c.id, { is_active: !c.is_active });
  };
  const delCat = async (c: Cat) => {
    if (!confirm(`Delete category "${c.name}" and all its sub-categories?`)) return;
    const { error } = await supabase.from("support_categories").delete().eq("id", c.id);
    if (error) return toast.error("Delete failed", { description: error.message });
    setCats((xs) => xs.filter((x) => x.id !== c.id));
    setSubs((xs) => xs.filter((x) => x.category_id !== c.id));
    toast.success("Category deleted");
  };

  const addSub = async (catId: string) => {
    const name = (newSub[catId] || "").trim();
    if (!name) return toast.error("Sub-category name is required");
    const count = subs.filter((s) => s.category_id === catId).length;
    const { error } = await supabase.from("support_subcategories").insert({ category_id: catId, name, sort_order: count });
    if (error) return toast.error("Add failed", { description: error.message });
    setNewSub((m) => ({ ...m, [catId]: "" })); toast.success("Sub-category added"); load();
  };
  const saveSub = async (s: Sub) => {
    const { error } = await supabase.from("support_subcategories").update({ name: s.name }).eq("id", s.id);
    if (error) return toast.error("Save failed", { description: error.message });
    toast.success("Sub-category saved");
  };
  const toggleSub = async (s: Sub) => {
    const { error } = await supabase.from("support_subcategories").update({ is_active: !s.is_active }).eq("id", s.id);
    if (error) return toast.error(error.message);
    patchSub(s.id, { is_active: !s.is_active });
  };
  const delSub = async (s: Sub) => {
    const { error } = await supabase.from("support_subcategories").delete().eq("id", s.id);
    if (error) return toast.error("Delete failed", { description: error.message });
    setSubs((xs) => xs.filter((x) => x.id !== s.id));
    toast.success("Sub-category deleted");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="mb-3 flex items-center gap-2 text-sm font-bold"><FolderTree className="h-4 w-4 text-india-green" /> Add support category</p>
        <div className="flex gap-2">
          <input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="e.g. Onboarding" className={input}
            onKeyDown={(e) => e.key === "Enter" && addCat()} />
          <Button className="bg-india-green text-white" onClick={addCat}><Plus className="h-4 w-4" /> Add</Button>
        </div>
      </div>

      {loading ? (
        <div className="grid h-32 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-india-green" /></div>
      ) : cats.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No categories yet. Add one above.</p>
      ) : (
        <div className="space-y-4">
          {cats.map((c) => (
            <div key={c.id} className={`rounded-2xl border border-border bg-card p-4 shadow-soft ${c.is_active ? "" : "opacity-60"}`}>
              <div className="flex flex-wrap items-center gap-2">
                <input value={c.name} onChange={(e) => patchCat(c.id, { name: e.target.value })} className={input + " max-w-xs font-semibold"} />
                <Button size="sm" className="bg-india-green text-white" onClick={() => saveCat(c)}><Check className="h-3.5 w-3.5" /> Save</Button>
                <button onClick={() => toggleCat(c)} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1.5 text-[11px] font-semibold hover:bg-muted">
                  {c.is_active ? <><EyeOff className="h-3 w-3" /> Hide</> : <><Eye className="h-3 w-3" /> Show</>}
                </button>
                <button onClick={() => delCat(c)} className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-2 py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50">
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </div>

              <div className="mt-3 space-y-2 border-l-2 border-border pl-4">
                {subs.filter((s) => s.category_id === c.id).map((s) => (
                  <div key={s.id} className={`flex flex-wrap items-center gap-2 ${s.is_active ? "" : "opacity-60"}`}>
                    <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <input value={s.name} onChange={(e) => patchSub(s.id, { name: e.target.value })} className={input + " max-w-xs"} />
                    <Button size="sm" variant="outline" onClick={() => saveSub(s)}><Check className="h-3.5 w-3.5" /> Save</Button>
                    <button onClick={() => toggleSub(s)} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1.5 text-[11px] font-semibold hover:bg-muted">
                      {s.is_active ? <><EyeOff className="h-3 w-3" /> Hide</> : <><Eye className="h-3 w-3" /> Show</>}
                    </button>
                    <button onClick={() => delSub(s)} className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-2 py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50">
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  </div>
                ))}
                <div className="flex gap-2 pt-1">
                  <input value={newSub[c.id] || ""} onChange={(e) => setNewSub((m) => ({ ...m, [c.id]: e.target.value }))}
                    placeholder="Add sub-category" className={input + " max-w-xs"} onKeyDown={(e) => e.key === "Enter" && addSub(c.id)} />
                  <Button size="sm" variant="outline" onClick={() => addSub(c.id)}><Plus className="h-3.5 w-3.5" /> Add sub</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
