import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowRight, BellRing, BriefcaseBusiness,
  CheckCircle2, CircleDollarSign, ClipboardCheck,
  FileChartColumn, FileClock, Goal,
  Handshake, LayoutDashboard, PieChart,
  Target, TrendingUp, UserCheck, UserPlus,
  UsersRound, type LucideIcon,
} from "lucide-react";
import { BdeShell } from "@/components/bde/bde-shell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/bde/dashboard")({
  head: () => ({ meta: [
    { title: "BDE Dashboard — BharatOne" },
    { name: "description", content: "BharatOne sales pipeline, leads, merchant acquisition and performance dashboard." },
  ] }),
  component: BdeDashboard,
});

type Tone = "blue" | "green" | "amber" | "rose" | "violet" | "bd";
const TONES: Record<Tone, { icon: string; soft: string; bar: string }> = {
  blue: { icon: "text-blue-600", soft: "bg-blue-50", bar: "bg-blue-600" },
  green: { icon: "text-india-green", soft: "bg-india-green/10", bar: "bg-india-green" },
  amber: { icon: "text-saffron", soft: "bg-saffron/10", bar: "bg-saffron" },
  rose: { icon: "text-destructive", soft: "bg-destructive/10", bar: "bg-destructive" },
  violet: { icon: "text-chart-5", soft: "bg-chart-5/10", bar: "bg-chart-5" },
  bd: { icon: "text-bd", soft: "bg-bd-soft", bar: "bg-bd" },
};

type Metric = { label: string; value: string; icon: LucideIcon; tone: Tone; detail?: string; progress?: number };

const salesPipeline: Metric[] = [
  { label: "Total Leads", value: "142", icon: Target, tone: "bd", detail: "+12 this week" },
  { label: "Negotiation", value: "28", icon: Handshake, tone: "amber", detail: "₹14.5L potential" },
  { label: "Closed Deals", value: "18", icon: CheckCircle2, tone: "green", detail: "This month" },
  { label: "Lost Leads", value: "9", icon: CircleDollarSign, tone: "rose", detail: "6.3% churn rate" },
];
const merchantAcquisition: Metric[] = [
  { label: "Onboarding", value: "34", icon: UserPlus, tone: "blue", detail: "Pending verification" },
  { label: "Active Merchants", value: "482", icon: UserCheck, tone: "green", detail: "88% activity rate" },
  { label: "Doc Pending", value: "12", icon: FileClock, tone: "amber", detail: "Requires follow-up" },
  { label: "Market Share", value: "12.5%", icon: PieChart, tone: "violet", detail: "Region: North" },
];
const performance: Metric[] = [
  { label: "Monthly Target", value: "₹45L", icon: Goal, tone: "bd", detail: "72% achieved", progress: 72 },
  { label: "Daily Calls", value: "24/40", icon: BriefcaseBusiness, tone: "blue", detail: "Target: 40 calls", progress: 60 },
  { label: "Conversion Rate", value: "18.4%", icon: TrendingUp, tone: "green", detail: "+2.1% vs last month", progress: 84 },
];

function MetricCard({ metric }: { metric: Metric }) {
  const Icon = metric.icon;
  const tone = TONES[metric.tone];
  return <div className="rounded-xl border border-border bg-card p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-elev">
    <div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{metric.label}</p><p className="mt-1 font-display text-2xl font-extrabold text-foreground">{metric.value}</p></div><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone.soft} ${tone.icon}`}><Icon className="h-5 w-5" /></span></div>
    {metric.progress !== undefined && <Progress value={metric.progress} className={`mt-3 [&>div]:${tone.bar}`} />}
    {metric.detail && <p className="mt-2 text-[11px] font-medium text-muted-foreground">{metric.detail}</p>}
  </div>;
}

function ModuleSection({ id, eyebrow, title, metrics, columns = 4, onOpen }: { id: string; eyebrow: string; title: string; metrics: Metric[]; columns?: number; onOpen: () => void }) {
  return <section id={id} className="scroll-mt-20">
    <div className="mb-3 flex items-end justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-bd">{eyebrow}</p><h2 className="font-display text-lg font-extrabold">{title}</h2></div><Button variant="ghost" size="sm" className="text-bd" onClick={onOpen}>View details <ArrowRight className="ml-2 h-4 w-4" /></Button></div>
    <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${columns === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>{metrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)}</div>
  </section>;
}

function BdeDashboard() {
  const navigate = useNavigate();
  const action = (label: string) => toast.success(`${label} started`, { description: "The sales workflow is ready for your input." });
  return <BdeShell><div id="overview" className="mx-auto max-w-[1600px] space-y-7">
    <section className="relative overflow-hidden rounded-3xl bg-navy p-6 text-bd-foreground shadow-elev lg:p-8">
      <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-bd/30 blur-3xl" />
      <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center"><div><span className="inline-flex rounded-full border border-bd-foreground/10 bg-bd-foreground/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-bd-foreground/65">Sunday, 14 June 2026 · Sales Performance</span><h1 className="mt-4 font-display text-3xl font-extrabold sm:text-4xl">Welcome back, Vikram</h1><p className="mt-2 max-w-lg text-sm text-bd-foreground/65">Track your pipeline, manage merchant relationships, and drive business growth.</p><div className="mt-5 flex flex-wrap gap-2"><Button size="sm" className="bg-bd text-bd-foreground hover:bg-bd/90" onClick={()=>navigate({to:"/bde/leads"})}>Open leads command center</Button><Button size="sm" variant="outline" className="border-bd-foreground/20 bg-bd-foreground/5 text-bd-foreground hover:bg-bd-foreground/10 hover:text-bd-foreground" onClick={()=>navigate({to:"/bde/reports"})}>View performance report</Button></div></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[{l:"Total Revenue",v:"₹32.4L",i:TrendingUp,n:"+15% vs May"},{l:"Conversion",v:"22%",i:Target,n:"Goal: 25%"},{l:"Merchants",v:"482",i:UsersRound,n:"12 new"},{l:"Calls Today",v:"24",i:BriefcaseBusiness,n:"6 left"}].map(x => <div key={x.l} className="min-w-32 rounded-2xl border border-bd-foreground/10 bg-bd-foreground/10 p-4 backdrop-blur"><div className="flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-wider text-bd-foreground/55">{x.l}</p><x.i className="h-4 w-4 text-bd"/></div><p className="mt-3 text-2xl font-extrabold">{x.v}</p><p className="mt-1 text-[10px] text-bd-foreground/50">{x.n}</p></div>)}</div></div>
    </section>

    <section aria-label="Quick actions"><div className="mb-3 flex items-end justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-bd">Command Center</p><h2 className="font-display text-lg font-extrabold">Priority actions</h2></div><p className="hidden text-xs text-muted-foreground sm:block">4 shortcuts · 12 items awaiting action</p></div><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[
      ["Add New Lead",Target],["Onboard Merchant",UserPlus],["Log Daily Call",BriefcaseBusiness],["Generate Sales Report",FileChartColumn],
    ].map(([label, Icon], index) => <Button key={label as string} variant="outline" className="h-20 justify-start rounded-2xl bg-card px-4 shadow-soft hover:-translate-y-0.5 hover:border-bd hover:bg-bd-soft" onClick={() => action(label as string)}><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-bd-soft text-bd"><Icon className="h-5 w-5" /></span><span className="text-left"><span className="block text-xs font-bold">{label as string}</span><span className="mt-1 block text-[9px] font-normal text-muted-foreground">Open workflow</span></span></Button>)}</div></section>

    <ModuleSection id="pipeline" eyebrow="Lead Pipeline" title="Sales Cycle" metrics={salesPipeline} onOpen={() => navigate({ to: "/bde/leads" })} />
    <ModuleSection id="acquisition" eyebrow="Merchant Growth" title="Acquisition Metrics" metrics={merchantAcquisition} onOpen={() => navigate({ to: "/bde/merchants" })} />
    <ModuleSection id="performance" eyebrow="My Performance" title="Targets & KPIs" metrics={performance} columns={3} onOpen={() => navigate({ to: "/bde/performance" })} />

    <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
      <section className="rounded-xl border border-border bg-card shadow-soft xl:col-span-3"><div className="flex items-center justify-between border-b border-border p-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-destructive">Attention needed</p><h2 className="font-display text-lg font-extrabold">Recent Alerts</h2></div><BellRing className="h-5 w-5 text-destructive" /></div><div className="divide-y divide-border">{[
        ["Lead Follow-up Overdue","Techno Solutions - Scheduled for yesterday",FileClock,"Call now"],
        ["Incomplete Onboarding","Global Retailers requires 2 documents",ClipboardCheck,"Fix now"],
        ["Target Milestone","You are 5% away from reaching your weekly goal",Goal,"View target"],
      ].map(([title,desc,Icon,cta]) => <div key={title as string} className="flex items-center gap-3 p-4 hover:bg-muted/40"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive"><Icon className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="text-sm font-bold">{title as string}</p><p className="truncate text-xs text-muted-foreground">{desc as string}</p></div><Button variant="ghost" size="sm" className="hidden text-bd sm:inline-flex" onClick={() => action(cta as string)}>{cta as string}<ArrowRight className="ml-2 h-4 w-4" /></Button></div>)}</div></section>
      <section id="reports" className="rounded-xl border border-border bg-card p-4 shadow-soft xl:col-span-2"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-bd">Analytics center</p><h2 className="font-display text-lg font-extrabold">Reports</h2><p className="mt-1 text-xs text-muted-foreground">Download current sales insights.</p><div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">{[
        ["Leads Report",Target],["Sales Pipeline",TrendingUp],["Onboarding Summary",UserPlus],["Performance KPI",FileChartColumn],
      ].map(([label,Icon]) => <Button key={label as string} variant="outline" className="h-11 justify-start px-3 text-xs" onClick={() => toast.success(`${label as string} generated`)}><Icon className="h-4 w-4 mr-2 text-bd" />{label as string}</Button>)}</div></section>
    </div>
  </div></BdeShell>;
}
