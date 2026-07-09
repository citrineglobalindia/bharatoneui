import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Search, Link2, Server, Plug } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

const db = supabase as any;
const sel = "h-9 w-full min-w-[150px] rounded-lg border border-border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-india-green/30";
const errText = (e: any) => (String(e?.message || "").includes("NOT_ADMIN") ? "Please sign in with your admin account to manage the Service Catalog." : (e?.message || "Update failed"));

type Svc = { id: string; name: string; service_type: "inlink" | "api" | "backend"; category_id: string | null; service_group: string | null; is_active: boolean };
type Cat = { id: string; name: string; parent_id: string | null };
type SC = { id: string; name: string };

const TYPE_META: Record<string, { label: string; icon: any; cls: string }> = {
  inlink: { label: "Direct", icon: Link2, cls: "bg-sky-100 text-sky-700" },
  api: { label: "API", icon: Plug, cls: "bg-violet-100 text-violet-700" },
  backend: { label: "Backend", icon: Server, cls: "bg-emerald-100 text-emerald-700" },
};

// Service-wise mapping: one row per service, pick its Category + Service Category inline.
export function ServiceMapping() {
  const [svcs, setSvcs] = useState<Svc[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [scs, setSCs] = useState<SC[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [type, setType] = useState<"all" | "inlink" | "api" | "backend">("all");
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      await ensureStaffSession();
      const [sv, ct] = await Promise.all([
        db.from("services").select("id,name,service_type,category_id,service_group,is_active").order("name"),
        db.from("service_categories").select("id,name,parent_id,kind").order("sort_order").order("name"),
      ]);
      setSvcs((sv.data as Svc[]) ?? []);
      const all = (ct.data as (Cat & { kind?: string })[]) ?? [];
      setCats(all.filter((c) => c.kind !== "frontend"));
      setSCs(all.filter((c) => c.kind === "frontend").map((c) => ({ id: c.id, name: c.name })));
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const scValid = (id: string | null) => !!id && scs.some((s) => s.id === id);
  const save = async (s: Svc, category_id: string | null, service_group: string | null) => {
    setSavingId(s.id);
    // optimistic
    setSvcs((xs) => xs.map((x) => (x.id === s.id ? { ...x, category_id, service_group } : x)));
    await ensureStaffSession();
    const { error } = await db.rpc("admin_set_service_mapping", { _service: s.id, _category: category_id, _service_group: service_group });
    setSavingId(null);
    if (error) { toast.error("Mapping failed", { description: errText(error) }); load(); return; }
    toast.success("Mapping saved");
  };
  const onCategory = (s: Svc, catId: string) => {
    const parent = cats.find((c) => c.id === catId)?.parent_id ?? null;
    // Auto-fill Service Category from the chosen Category if the service has none yet.
    const sg = scValid(s.service_group) ? s.service_group : (parent || null);
    save(s, catId || null, sg);
  };
  const onServiceCategory = (s: Svc, scId: string) => save(s, s.category_id, scId || null);

  const rows = useMemo(() => svcs.filter((s) =>
    (type === "all" || s.service_type === type) &&
    (!q || s.name.toLowerCase().includes(q.toLowerCase()))
  ), [svcs, q, type]);

  const TABS = [["all", "All"], ["inlink", "Direct"], ["backend", "Backend"], ["api", "API"]] as const;
  const counts = useMemo(() => { const m: any = { all: svcs.length, inlink: 0, api: 0, backend: 0 }; svcs.forEach((s) => m[s.service_type]++); return m; }, [svcs]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-extrabold">Service-wise Mapping</h2>
        <p className="text-sm text-muted-foreground">Every service in one place — set each service's <b>Category</b> and <b>Service Category</b> (menu group). Changes save instantly.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {TABS.map(([k, label]) => (
          <button key={k} onClick={() => setType(k as any)} className={`inline-flex items-center gap-1.5 rounded-full px-3 h-9 text-xs font-semibold transition ${type === k ? "bg-india-green text-white shadow-soft" : "border border-border bg-card hover:bg-muted"}`}>
            {label}<span className={`rounded-full px-1.5 text-[10px] font-bold ${type === k ? "bg-white/25" : "bg-muted text-muted-foreground"}`}>{counts[k] ?? 0}</span>
          </button>
        ))}
        <div className="relative ml-auto w-60"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><input className="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-2 text-sm outline-none" placeholder="Search service" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr><th className="px-4 py-2.5">Service</th><th className="px-4 py-2.5">Type</th><th className="px-4 py-2.5">Category</th><th className="px-4 py-2.5">Service Category (menu)</th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={4} className="px-4 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
              : rows.length === 0 ? <tr><td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">No services found.</td></tr>
              : rows.map((s) => {
                const M = TYPE_META[s.service_type];
                return (
                  <tr key={s.id} className={`border-t border-border hover:bg-muted/30 ${s.is_active ? "" : "opacity-60"}`}>
                    <td className="px-4 py-2.5 font-semibold">{s.name}{s.is_active ? "" : <span className="ml-1 text-[10px] font-normal text-muted-foreground">(inactive)</span>}{savingId === s.id && <Loader2 className="ml-2 inline h-3.5 w-3.5 animate-spin text-india-green" />}</td>
                    <td className="px-4 py-2.5"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${M.cls}`}><M.icon className="h-3 w-3" /> {M.label}</span></td>
                    <td className="px-4 py-2.5">
                      <select className={sel} value={s.category_id ?? ""} onChange={(e) => onCategory(s, e.target.value)}>
                        <option value="">— None —</option>
                        {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-2.5">
                      <select className={sel} value={scValid(s.service_group) ? (s.service_group as string) : ""} onChange={(e) => onServiceCategory(s, e.target.value)}>
                        <option value="">— None —</option>
                        {scs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
