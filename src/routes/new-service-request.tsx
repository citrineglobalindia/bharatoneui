import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PlusCircle, Loader2, Search, FolderTree, Server, ChevronRight, FileText } from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/new-service-request")({
  head: () => ({ meta: [{ title: "New Application — BharatOne" }] }),
  component: NewRequestPage,
});

type Svc = { id: string; name: string; category: string | null; category_id: string | null; logo_url: string | null; service_charge: number; retailer_commission: number; form_schema: any };
const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");
const PALETTE = ["from-sky-500 to-blue-600", "from-emerald-500 to-green-600", "from-orange-500 to-amber-600", "from-violet-500 to-fuchsia-600", "from-rose-500 to-pink-600", "from-cyan-500 to-teal-600", "from-indigo-500 to-blue-600", "from-teal-500 to-emerald-600"];

function NewRequestPage() {
  const [svcs, setSvcs] = useState<Svc[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("services")
        .select("id,name,category,category_id,logo_url,service_charge,retailer_commission,form_schema")
        .eq("is_active", true).eq("service_type", "backend").order("sort_order").order("name");
      setSvcs((data as Svc[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const categories = useMemo(() => {
    const m = new Map<string, number>();
    svcs.forEach((s) => { const k = s.category || "Other"; m.set(k, (m.get(k) || 0) + 1); });
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [svcs]);

  const filtered = useMemo(() => svcs.filter((s) =>
    (cat === "all" || (s.category || "Other") === cat) &&
    (!q || [s.name, s.category].filter(Boolean).some((v) => String(v).toLowerCase().includes(q.toLowerCase())))
  ), [svcs, q, cat]);

  const byCategory = useMemo(() => {
    const m = new Map<string, Svc[]>();
    filtered.forEach((s) => { const k = s.category || "Other"; if (!m.has(k)) m.set(k, []); m.get(k)!.push(s); });
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const catGrad = (name: string) => PALETTE[(name.charCodeAt(0) + name.length) % PALETTE.length];

  return (
    <RetailerShell>
      <div className="space-y-5">
        <PageHeader icon={<PlusCircle className="h-5 w-5" />} title="New Application" subtitle="Apply for a backend service. Pick a service to fill the form and submit to the assigned operator." />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground"><Server className="h-4 w-4 text-india-green" /> Backend Services</p>
          <div className="relative w-60"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><input className="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-2 text-sm outline-none" placeholder="Search service" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setCat("all")} className={`inline-flex items-center gap-1.5 rounded-full px-3 h-8 text-xs font-semibold transition ${cat === "all" ? "bg-foreground text-background" : "border border-border bg-card hover:bg-muted"}`}><FolderTree className="h-3.5 w-3.5" /> All categories</button>
          {categories.map(([name, n]) => (
            <button key={name} onClick={() => setCat(name)} className={`inline-flex items-center gap-1.5 rounded-full px-3 h-8 text-xs font-semibold transition ${cat === name ? "bg-foreground text-background" : "border border-border bg-card hover:bg-muted"}`}>
              {name}<span className={`rounded-full px-1.5 text-[10px] font-bold ${cat === name ? "bg-background/25" : "bg-muted text-muted-foreground"}`}>{n}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground shadow-soft"><Loader2 className="h-4 w-4 animate-spin" /> Loading services…</div>
        ) : byCategory.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card/60 py-12 text-center text-sm text-muted-foreground">No backend services available{q || cat !== "all" ? " for this filter" : ""}.</p>
        ) : (
          <div className="space-y-5">
            {byCategory.map(([cn, list]) => (
              <section key={cn} className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
                <div className={`flex items-center gap-2.5 bg-gradient-to-r ${catGrad(cn)} px-4 py-2.5 text-white`}>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/25 text-xs font-bold">{cn[0]?.toUpperCase() || "?"}</span>
                  <p className="flex-1 truncate font-display text-sm font-bold uppercase tracking-wide">{cn}</p>
                  <span className="shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold">{list.length} service{list.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((s) => {
                    const g = PALETTE[(s.name?.charCodeAt(0) || 0) % PALETTE.length];
                    const fieldCount = Array.isArray(s.form_schema) ? s.form_schema.length : 0;
                    return (
                      <Link key={s.id} to="/service/$id" params={{ id: s.id }} className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 transition hover:-translate-y-0.5 hover:shadow-elev">
                        {s.logo_url ? <img src={s.logo_url} alt={s.name} className="h-11 w-11 rounded-lg border border-border bg-white object-contain p-1" />
                          : <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${g} text-base font-extrabold text-white`}>{(s.name?.[0] || "S").toUpperCase()}</span>}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold leading-tight">{s.name}</p>
                          <p className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span>{inr(s.service_charge)}</span>
                            {fieldCount > 0 && <span className="inline-flex items-center gap-1"><FileText className="h-3 w-3" /> {fieldCount} field{fieldCount !== 1 ? "s" : ""}</span>}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-india-green" />
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-4 text-xs text-muted-foreground">
          <p className="mb-1 font-semibold text-foreground">How it works</p>
          Choose a backend service to open its form (fields are configured by admin per service). On submit, the charge is deducted from your wallet and the application is routed to the mapped operator. Track status under <b className="text-foreground">My Applications</b>.
        </div>
      </div>
    </RetailerShell>
  );
}
