import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Wrench, Banknote, ArrowLeftRight, Smartphone, Receipt, FileText, IdCard, Building2, Globe, CheckCircle2, ExternalLink, Search, FilePlus2, TrendingUp } from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/services")({
  head: () => ({ meta: [{ title: "My Services — BharatOne" }] }),
  validateSearch: (s: Record<string, unknown>): { view?: string; cat?: string } => ({
    view: typeof s.view === "string" ? s.view : undefined,
    cat: typeof s.cat === "string" ? s.cat : undefined,
  }),
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
type Cat = { id: string; name: string };

const TYPE_CHIP: Record<Service["service_type"], { label: string; cls: string }> = {
  inlink: { label: "Direct", cls: "bg-sky-100 text-sky-700" },
  backend: { label: "Application", cls: "bg-emerald-100 text-emerald-700" },
  api: { label: "Trending", cls: "bg-violet-100 text-violet-700" },
};

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

const GRADS = ["from-sky-500 to-blue-600", "from-emerald-500 to-green-600", "from-orange-500 to-amber-600", "from-violet-500 to-fuchsia-600", "from-rose-500 to-pink-600", "from-cyan-500 to-teal-600", "from-indigo-500 to-blue-600", "from-teal-500 to-emerald-600"];
const gradFor = (name: string) => GRADS[((name.charCodeAt(0) || 0) + name.length) % GRADS.length];

function CategorySection({ name, list }: { name: string; list: Service[] }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className={`mb-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${gradFor(name)} pl-2 pr-3 py-1 text-white shadow-soft`}>
        <Wrench className="h-4 w-4" />
        <span className="font-display text-sm font-bold uppercase tracking-wide">{name}</span>
        <span className="rounded-full bg-white/25 px-1.5 text-[11px] font-semibold">{list.length}</span>
      </div>
      {list.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No services in this category yet.</p> : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {list.map((s) => (
            <div key={s.id} className="relative">
              <ServiceTile s={s} />
              <span className={`absolute left-2 top-2 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${TYPE_CHIP[s.service_type].cls}`}>{TYPE_CHIP[s.service_type].label}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ServicesPage() {
  const { cat } = Route.useSearch();
  const [services, setServices] = useState<Service[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    let on = true;
    (async () => {
      const [sv, ct] = await Promise.all([
        supabase.from("services").select("id,name,logo_url,redirect_url,backend_route,service_type,category,category_id")
          .eq("is_active", true).in("service_type", ["inlink", "api", "backend"]).order("sort_order").order("name"),
        (supabase as any).from("service_categories").select("id,name")
          .or("kind.eq.frontend,kind.is.null").eq("is_active", true).order("sort_order").order("name"),
      ]);
      if (!on) return;
      setServices((sv.data as Service[]) ?? []);
      setCats((ct.data as Cat[]) ?? []);
    })();
    return () => { on = false; };
  }, []);

  const match = (s: Service) => !q || [s.name, s.category].filter(Boolean).some((v) => String(v).toLowerCase().includes(q.toLowerCase()));
  const typeRank = { inlink: 0, backend: 1, api: 2 } as const;

  // Build category → services, honoring the selected category (cat) and search (q).
  const sections = useMemo(() => {
    const shown = cat ? cats.filter((c) => c.id === cat) : cats;
    const byCat = shown.map((c) => ({
      name: c.name,
      list: services.filter((s) => s.category_id === c.id && match(s)).sort((a, b) => typeRank[a.service_type] - typeRank[b.service_type]),
    }));
    // Uncategorised services only when viewing "all".
    if (!cat) {
      const uncategorised = services.filter((s) => !s.category_id && match(s));
      if (uncategorised.length) byCat.push({ name: "Other Services", list: uncategorised });
    }
    return byCat;
  }, [services, cats, cat, q]);

  const selectedName = cat ? (cats.find((c) => c.id === cat)?.name ?? "Category") : null;
  const hasAny = sections.some((s) => s.list.length > 0);

  return (
    <RetailerShell>
      <div className="space-y-6">
        <PageHeader icon={<Wrench className="h-5 w-5" />} title={selectedName ?? "My Services"} subtitle={selectedName ? `Services under ${selectedName}` : "Services activated on your retailer account"} />

        <div className="flex flex-wrap items-center justify-between gap-2">
          {selectedName
            ? <Link to="/services" className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 h-9 text-sm font-semibold hover:bg-muted">← All Services</Link>
            : <span />}
          <div className="relative w-60"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><input className="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-2 text-sm outline-none" placeholder="Search service" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        </div>

        {sections.length === 0 || !hasAny
          ? <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">No services available yet. Your admin adds services under each category from the Service Catalog.</div>
          : sections.map((sec) => <CategorySection key={sec.name} name={sec.name} list={sec.list} />)}
      </div>
    </RetailerShell>
  );
}
