import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Layers, FolderTree, UserCog, CornerDownRight, Wrench, Check, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";
import { ServicesManager } from "@/components/admin/services-manager";
import { CategoryOperators } from "@/components/admin/catalog-manager";

const db = supabase as any;
const inp = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30";
const errText = (e: any) => (String(e?.message || "").includes("NOT_ADMIN") ? "Please sign in with your admin account to manage the Service Catalog." : (e?.message || "Something went wrong"));

type SC = { id: string; name: string };
type Cat = { id: string; name: string; parent_id: string | null; is_active: boolean; kind?: string | null };
type Sub = { id: string; category_id: string; name: string };
type Operator = { id: string; name: string };

// Guided top-down builder: Service Category → Category → Operator → Sub-category → Service.
export function CatalogBuilder() {
  const [scs, setSCs] = useState<SC[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);

  const [scId, setScId] = useState("");
  const [catId, setCatId] = useState("");
  const [subId, setSubId] = useState("");

  const [newSC, setNewSC] = useState("");
  const [newCat, setNewCat] = useState("");
  const [newSub, setNewSub] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      await ensureStaffSession();
      const [c, s, u] = await Promise.all([
        db.from("service_categories").select("id,name,is_active,parent_id,kind").order("sort_order").order("name"),
        db.from("service_subcategories").select("id,category_id,name").order("sort_order").order("name"),
        db.rpc("admin_list_users"),
      ]);
      const all = (c.data as Cat[]) ?? [];
      setSCs(all.filter((x) => x.kind === "frontend").map((x) => ({ id: x.id, name: x.name })));
      setCats(all.filter((x) => x.kind !== "frontend"));
      setSubs((s.data as Sub[]) ?? []);
      setOperators(((u.data as any[]) ?? []).filter((x) => Array.isArray(x.roles) && x.roles.includes("operator")).map((x) => ({ id: x.id, name: x.display_name || x.email || "Operator" })));
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const catsForSC = useMemo(() => cats.filter((c) => c.parent_id === scId), [cats, scId]);
  const subsForCat = useMemo(() => subs.filter((s) => s.category_id === catId), [subs, catId]);

  const createSC = async () => {
    if (!newSC.trim()) return toast.error("Service Category name required");
    setBusy(true); await ensureStaffSession();
    const { data, error } = await db.rpc("admin_save_service_category", { _id: null, _name: newSC.trim(), _active: true });
    setBusy(false);
    if (error) return toast.error("Add failed", { description: errText(error) });
    toast.success("Service Category created"); setNewSC(""); await load(); setScId(data as string); setCatId(""); setSubId("");
  };
  const createCat = async () => {
    if (!scId) return toast.error("Select a Service Category first");
    if (!newCat.trim()) return toast.error("Category name required");
    setBusy(true); await ensureStaffSession();
    const { data, error } = await db.rpc("admin_save_category", { _id: null, _name: newCat.trim(), _active: true, _parent: scId });
    setBusy(false);
    if (error) return toast.error("Add failed", { description: errText(error) });
    toast.success("Category created"); setNewCat(""); await load(); setCatId(data as string); setSubId("");
  };
  const createSub = async () => {
    if (!catId) return toast.error("Select a Category first");
    if (!newSub.trim()) return toast.error("Sub-category name required");
    setBusy(true); await ensureStaffSession();
    const { data, error } = await db.from("service_subcategories").insert({ category_id: catId, name: newSub.trim(), sort_order: subsForCat.length }).select("id").single();
    setBusy(false);
    if (error) return toast.error("Add failed", { description: errText(error) });
    toast.success("Sub-category created"); setNewSub(""); await load(); setSubId((data as any).id);
  };

  if (loading) return <div className="grid h-40 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-india-green" /></div>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-extrabold">Build a Service — step by step</h2>
        <p className="text-sm text-muted-foreground">Service Category → Category → Operator → Sub-category → Service. Create new at each step or pick an existing one.</p>
      </div>

      {/* Step 1 — Service Category */}
      <Step n={1} icon={Layers} title="Service Category" done={!!scId} hint="The retailer/distributor menu group.">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="text-[11px] font-semibold text-muted-foreground">Select existing</label>
            <select className={inp} value={scId} onChange={(e) => { setScId(e.target.value); setCatId(""); setSubId(""); }}>
              <option value="">— Choose a Service Category —</option>
              {scs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select></div>
          <div><label className="text-[11px] font-semibold text-muted-foreground">…or create new</label>
            <div className="flex gap-2">
              <input className={inp} value={newSC} onChange={(e) => setNewSC(e.target.value)} placeholder="e.g. G2C Services" onKeyDown={(e) => e.key === "Enter" && createSC()} />
              <Button onClick={createSC} disabled={busy} className="shrink-0 bg-india-green text-white">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}</Button>
            </div></div>
        </div>
      </Step>

      {/* Step 2 — Category */}
      <Step n={2} icon={FolderTree} title="Category" done={!!catId} disabled={!scId} hint="Operator-managed grouping inside the Service Category.">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="text-[11px] font-semibold text-muted-foreground">Select existing</label>
            <select className={inp} value={catId} onChange={(e) => { setCatId(e.target.value); setSubId(""); }} disabled={!scId}>
              <option value="">{catsForSC.length ? "— Choose a Category —" : "No categories yet — create one →"}</option>
              {catsForSC.map((c) => <option key={c.id} value={c.id}>{c.name}{c.is_active ? "" : " (inactive)"}</option>)}
            </select></div>
          <div><label className="text-[11px] font-semibold text-muted-foreground">…or create new (under this Service Category)</label>
            <div className="flex gap-2">
              <input className={inp} value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="e.g. Banking Services" disabled={!scId} onKeyDown={(e) => e.key === "Enter" && createCat()} />
              <Button onClick={createCat} disabled={busy || !scId} className="shrink-0 bg-india-green text-white">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}</Button>
            </div></div>
        </div>
      </Step>

      {/* Step 3 — Operator */}
      <Step n={3} icon={UserCog} title="Operators" done={false} disabled={!catId} hint="Who handles applications for this Category (optional).">
        {catId ? <CategoryOperators categoryId={catId} allOperators={operators} onChange={load} /> : <p className="text-sm text-muted-foreground">Pick a Category first.</p>}
      </Step>

      {/* Step 4 — Sub-category (optional) */}
      <Step n={4} icon={CornerDownRight} title="Sub-category (optional)" done={false} disabled={!catId} hint="Group services further, if you need it.">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="text-[11px] font-semibold text-muted-foreground">Select existing</label>
            <select className={inp} value={subId} onChange={(e) => setSubId(e.target.value)} disabled={!catId}>
              <option value="">— None —</option>
              {subsForCat.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select></div>
          <div><label className="text-[11px] font-semibold text-muted-foreground">…or create new</label>
            <div className="flex gap-2">
              <input className={inp} value={newSub} onChange={(e) => setNewSub(e.target.value)} placeholder="e.g. AEPS" disabled={!catId} onKeyDown={(e) => e.key === "Enter" && createSub()} />
              <Button onClick={createSub} disabled={busy || !catId} className="shrink-0 bg-india-green text-white">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}</Button>
            </div></div>
        </div>
      </Step>

      {/* Step 5 — Service */}
      <Step n={5} icon={Wrench} title="Service" done={false} disabled={!catId} hint="Add Direct / API / Backend services in this Category.">
        {catId
          ? <ServicesManager key={catId + ":" + subId} categoryId={catId} subcategoryId={subId || undefined} subcategories={subsForCat.map((s) => ({ id: s.id, name: s.name }))} />
          : <p className="text-sm text-muted-foreground">Pick a Category first.</p>}
      </Step>
    </div>
  );
}

function Step({ n, icon: Icon, title, hint, done, disabled, children }: { n: number; icon: any; title: string; hint: string; done?: boolean; disabled?: boolean; children: React.ReactNode }) {
  return (
    <section className={`rounded-2xl border border-border bg-card p-5 shadow-soft ${disabled ? "opacity-60" : ""}`}>
      <div className="mb-3 flex items-center gap-2.5">
        <span className={`grid h-8 w-8 place-items-center rounded-full text-sm font-extrabold ${done ? "bg-india-green text-white" : "bg-india-green/10 text-india-green"}`}>{done ? <Check className="h-4 w-4" /> : n}</span>
        <div className="flex items-center gap-1.5">
          <Icon className="h-4 w-4 text-india-green" />
          <p className="font-display text-base font-extrabold">{title}</p>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{hint}</span>
        </div>
      </div>
      {children}
    </section>
  );
}
