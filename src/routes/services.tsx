import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Wrench, Banknote, ArrowLeftRight, Smartphone, Receipt, FileText, IdCard, Building2, Globe, CheckCircle2, ExternalLink, Search, FilePlus2, TrendingUp } from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/services")({
  head: () => ({ meta: [{ title: "My Services — BharatOne" }] }),
  validateSearch: (s: Record<string, unknown>): { view?: string } => ({ view: typeof s.view === "string" ? s.view : undefined }),
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

type Service = { id: string; name: string; logo_url: string | null; redirect_url: string | null; backend_route: string | null; service_type: "inlink" | "api" | "backend"; category: string | null; category_id: string | null };

function ServiceTile({ s }: { s: Service }) {
  const inner = (
    <>
      <div className="relative">
        {s.logo_url
          ? <img src={s.logo_url} alt={s.name} className="h-12 w-12 object-contain" />
          : <div className="grid h-12 w-12 place-items-center rounded-lg bg-india-green/10 text-india-green font-bold">{s.name[0]}</div>}
      </div>
      <p className="text-xs font-semibold leading-tight">{s.name}</p>
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

function Bucket({ title, hint, Icon, grad, list, empty }: { title: string; hint: string; Icon: any; grad: string; list: Service[]; empty: string }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className={`mb-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${grad} pl-2 pr-3 py-1 text-white shadow-soft`}>
        <Icon className="h-4 w-4" />
        <span className="font-display text-sm font-bold uppercase tracking-wide">{title}</span>
        <span className="rounded-full bg-white/25 px-1.5 text-[11px] font-semibold">{list.length}</span>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">{hint}</p>
      {list.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p> : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">{list.map((s) => <ServiceTile key={s.id} s={s} />)}</div>
      )}
    </section>
  );
}

function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    let on = true;
    (async () => {
      const { data } = await supabase.from("services").select("id,name,logo_url,redirect_url,backend_route,service_type,category,category_id")
        .eq("is_active", true).in("service_type", ["inlink", "api", "backend"]).order("sort_order").order("name");
      if (on) setServices((data as Service[]) ?? []);
    })();
    return () => { on = false; };
  }, []);

  const match = (s: Service) => !q || [s.name, s.category].filter(Boolean).some((v) => String(v).toLowerCase().includes(q.toLowerCase()));
  const direct = useMemo(() => services.filter((s) => s.service_type === "inlink" && match(s)), [services, q]);
  const backend = useMemo(() => services.filter((s) => s.service_type === "backend" && match(s)), [services, q]);
  const api = useMemo(() => services.filter((s) => s.service_type === "api" && match(s)), [services, q]);

  return (
    <RetailerShell>
      <div className="space-y-6">
        <PageHeader icon={<Wrench className="h-5 w-5" />} title="My Services" subtitle="Services activated on your retailer account" />

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {CORE.map((s) => (
            <Link key={s.label} to={s.to} className="rounded-xl border border-border bg-card p-4 hover:shadow-elev hover:-translate-y-0.5 transition flex items-start gap-3">
              <div className={`h-10 w-10 rounded-xl ${s.tone} text-white flex items-center justify-center shadow-soft shrink-0`}>{s.icon}</div>
              <div className="min-w-0"><p className="font-bold text-sm">{s.label}</p><p className={`text-[11px] font-semibold ${s.active ? "text-india-green" : "text-muted-foreground"}`}>{s.active ? "● Active" : "○ Inactive"}</p></div>
            </Link>
          ))}
        </div>

        <div className="flex justify-end">
          <div className="relative w-60"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><input className="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-2 text-sm outline-none" placeholder="Search service" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        </div>

        {/* Direct services → My Services */}
        <Bucket title="My Services" hint="Direct services — tap to open the partner site." Icon={Wrench} grad="from-sky-500 to-blue-600" list={direct} empty="No direct services yet." />

        {/* Backend services → New Applications */}
        <Bucket title="New Applications" hint="Fill an application form and submit it for processing." Icon={FilePlus2} grad="from-emerald-500 to-green-600" list={backend} empty="No application services yet." />

        {/* API services → Trending Services */}
        <Bucket title="Trending Services" hint="Integrated services available on your account." Icon={TrendingUp} grad="from-violet-500 to-fuchsia-600" list={api} empty="No trending services yet." />
      </div>
    </RetailerShell>
  );
}
