import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Wrench, Banknote, ArrowLeftRight, Smartphone, Receipt, FileText, IdCard, Building2, Globe, CheckCircle2, ExternalLink, Search } from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/services")({
  head: () => ({ meta: [{ title: "My Services — BharatOne" }] }),
  validateSearch: (s: Record<string, unknown>): { group?: string } => ({ group: typeof s.group === "string" ? s.group : undefined }),
  component: ServicesPage,
});

const CORE = [
  { label: "AEPS", to: "/aeps", icon: <Banknote className="h-5 w-5" />, tone: "bg-sky-500", active: true },
  { label: "AEPS Activation", to: "/aeps-activation", icon: <CheckCircle2 className="h-5 w-5" />, tone: "bg-sky-600", active: true },
  { label: "Money Transfer", to: "/money-transfer", icon: <ArrowLeftRight className="h-5 w-5" />, tone: "bg-orange-500", active: true },
  { label: "Recharge", to: "/recharge", icon: <Smartphone className="h-5 w-5" />, tone: "bg-emerald-600", active: true },
  { label: "BBPS", to: "/bbps", icon: <Receipt className="h-5 w-5" />, tone: "bg-orange-500", active: true },
  { label: "GST", to: "/gst", icon: <FileText className="h-5 w-5" />, tone: "bg-teal-600", active: true },
  { label: "PAN", to: "/pan", icon: <IdCard className="h-5 w-5" />, tone: "bg-rose-500", active: true },
  { label: "Business Reg.", to: "/business-reg", icon: <Building2 className="h-5 w-5" />, tone: "bg-violet-500", active: true },
  { label: "Gov. Services", to: "/gov-services", icon: <Globe className="h-5 w-5" />, tone: "bg-indigo-500", active: true },
];

type Service = { id: string; name: string; logo_url: string | null; redirect_url: string | null; backend_route: string | null; service_type: "inlink" | "api" | "backend"; category: string | null; category_id: string | null; service_group: string | null };

const TYPE_LABEL: Record<string, string> = { inlink: "Redirect", api: "API Integrated", backend: "Backend" };
const TYPE_BADGE: Record<string, string> = { inlink: "bg-sky-100 text-sky-700", api: "bg-violet-100 text-violet-700", backend: "bg-emerald-100 text-emerald-700" };
const PALETTE = ["from-sky-500 to-blue-600", "from-emerald-500 to-green-600", "from-orange-500 to-amber-600", "from-violet-500 to-fuchsia-600", "from-rose-500 to-pink-600", "from-cyan-500 to-teal-600", "from-indigo-500 to-blue-600", "from-teal-500 to-emerald-600"];

function ServiceTile({ s }: { s: Service }) {
  const inner = (
    <>
      <div className="relative">
        {s.logo_url
          ? <img src={s.logo_url} alt={s.name} className="h-12 w-12 object-contain" />
          : <div className="grid h-12 w-12 place-items-center rounded-lg bg-india-green/10 text-india-green font-bold">{s.name[0]}</div>}
      </div>
      <p className="text-xs font-semibold leading-tight">{s.name}</p>
      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${TYPE_BADGE[s.service_type] || "bg-muted text-muted-foreground"}`}>{TYPE_LABEL[s.service_type] || s.service_type}</span>
    </>
  );
  const cls = "group relative flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center transition hover:shadow-elev hover:-translate-y-0.5";
  if (s.service_type === "inlink" && s.redirect_url) {
    return (<a href={s.redirect_url} target="_blank" rel="noreferrer" className={cls}>{inner}<ExternalLink className="absolute right-2 top-2 h-3.5 w-3.5 text-muted-foreground opacity-0 transition group-hover:opacity-100" /></a>);
  }
  if (s.service_type === "backend" && s.backend_route) {
    return (<Link to={s.backend_route as never} className={cls}>{inner}</Link>);
  }
  return (<Link to="/service/$id" params={{ id: s.id }} className={cls}>{inner}</Link>);
}

function ServicesPage() {
  const { group } = Route.useSearch();
  const [services, setServices] = useState<Service[]>([]);
  const [frontCatName, setFrontCatName] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");

  useEffect(() => {
    let on = true;
    (async () => {
      const [svc, cats] = await Promise.all([
        supabase.from("services").select("id,name,logo_url,redirect_url,backend_route,service_type,category,category_id,service_group")
          .eq("is_active", true).in("service_type", ["inlink", "api", "backend"]).order("sort_order").order("name"),
        // Admin-created frontend categories = the retailer menu service groups (dynamic).
        (supabase as any).from("service_categories").select("id,name").eq("kind", "frontend").eq("is_active", true),
      ]);
      if (!on) return;
      setServices((svc.data as Service[]) ?? []);
      const m: Record<string, string> = {};
      ((cats.data as { id: string; name: string }[]) ?? []).forEach((c) => { m[c.id] = c.name; });
      setFrontCatName(m);
    })();
    return () => { on = false; };
  }, []);

  const groupLabel = group ? (frontCatName[group] ?? "Services") : null;
  // A service belongs to a frontend category if it was created under it (category_id)
  // or assigned to it via the Service Group (Retailer Menu) field (service_group).
  const inGroup = (s: Service) => !group || s.category_id === group || s.service_group === group;

  const filtered = useMemo(() => services.filter((s) =>
    inGroup(s) &&
    (!q || [s.name, s.category].filter(Boolean).some((v) => String(v).toLowerCase().includes(q.toLowerCase())))
  ), [services, q, group, frontCatName]);

  const byCategory = useMemo(() => {
    const m = new Map<string, Service[]>();
    filtered.forEach((s) => { const k = s.category || "Other"; if (!m.has(k)) m.set(k, []); m.get(k)!.push(s); });
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const catGrad = (name: string) => PALETTE[(name.charCodeAt(0) + name.length) % PALETTE.length];

  return (
    <RetailerShell>
      <div className="space-y-6">
        <PageHeader icon={<Wrench className="h-5 w-5" />} title={groupLabel ?? "My Services"} subtitle={groupLabel ? `Services under ${groupLabel}` : "Services activated on your retailer account"} />

        {!group && <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {CORE.map((s) => (
            <Link key={s.label} to={s.to} className="rounded-xl border border-border bg-card p-4 hover:shadow-elev hover:-translate-y-0.5 transition flex items-start gap-3">
              <div className={`h-10 w-10 rounded-xl ${s.tone} text-white flex items-center justify-center shadow-soft shrink-0`}>{s.icon}</div>
              <div className="min-w-0">
                <p className="font-bold text-sm">{s.label}</p>
                <p className={`text-[11px] font-semibold ${s.active ? "text-india-green" : "text-muted-foreground"}`}>{s.active ? "● Active" : "○ Inactive"}</p>
              </div>
            </Link>
          ))}
        </div>}

        {services.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-extrabold text-foreground">Partner Services <span className="ml-1 text-xs font-semibold text-muted-foreground">Redirect &amp; API services</span></h2>
              <div className="relative w-60"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><input className="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-2 text-sm outline-none" placeholder="Search service" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            </div>

            {byCategory.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No services match your filters.</p>
            ) : (
              <div className="space-y-5">
                {byCategory.map(([cn, list]) => (
                  <section key={cn} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
                    <div className={`mb-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${catGrad(cn)} pl-1.5 pr-3 py-1 text-white shadow-soft`}>
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/25 text-[11px] font-bold">{cn[0]?.toUpperCase() || "?"}</span>
                      <span className="font-display text-sm font-bold uppercase tracking-wide">{cn}</span>
                      <span className="rounded-full bg-white/25 px-1.5 text-[11px] font-semibold">{list.length}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      {list.map((s) => <ServiceTile key={s.id} s={s} />)}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </RetailerShell>
  );
}
