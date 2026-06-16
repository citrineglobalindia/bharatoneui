import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Activity, AlertTriangle, ArrowUpRight, BadgeIndianRupee, BarChart3, Bell,
  Building2, ChevronDown, CircleCheckBig, ClipboardCheck, FileClock, FileSearch, Gauge,
  Headphones, Landmark, LockKeyhole, LogOut, MapPin, Menu, RefreshCw, Search, Settings,
  ShieldCheck, Store, Users, WalletCards, X, Zap,
  type LucideIcon,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { BharatOneLogo } from "@/components/bharatone-logo";
import { AdminAuditLog } from "@/components/admin/admin-audit-log";
import { AdminModuleView } from "@/components/admin/admin-module-view";
import { UserManagementWorkflow } from "@/components/admin/user-management-workflow";
import { ServiceCatalogBuilder } from "@/components/admin/service-catalog-builder";
import { RolePermissionCenter } from "@/components/admin/role-permission-center";
import { AccountantOperations } from "@/components/admin/accountant-operations";
import { QcOperations } from "@/components/admin/qc-operations";
import { RegionalOperations } from "@/components/admin/regional-operations";
import { RetailerNetworkCenter } from "@/components/admin/retailer-network-center";
import { KycWorkflow } from "@/components/admin/kyc-workflow";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { downloadCsv } from "@/lib/admin-actions";
import { cn } from "@/lib/utils";
import { RegistrationsReview } from "@/components/registrations/registrations-review";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type NavItem = { label: string; icon: LucideIcon; badge?: string };
type NavGroup = { label: string; items: NavItem[] };

const NAVIGATION: NavGroup[] = [
  { label: "Command", items: [{ label: "Executive Overview", icon: Gauge }, { label: "Live Operations", icon: Activity, badge: "LIVE" }] },
  { label: "Network", items: [{ label: "User Management", icon: Users }, { label: "KYC Approvals", icon: ClipboardCheck, badge: "116" }, { label: "QC Operations", icon: ClipboardCheck }, { label: "DRO Operations", icon: MapPin }, { label: "TRO Operations", icon: MapPin }, { label: "Applications", icon: FileSearch }, { label: "Retailer Network", icon: Store }, { label: "Roles & Permissions", icon: LockKeyhole }] },
  { label: "Finance", items: [{ label: "Accountant Operations", icon: Landmark }, { label: "Wallet Control", icon: WalletCards }, { label: "Revenue Analytics", icon: BarChart3 }, { label: "Settlements", icon: Landmark }, { label: "Risk & Fraud", icon: ShieldCheck, badge: "8" }] },
  { label: "Platform", items: [{ label: "Service Catalog", icon: Zap }, { label: "Support Center", icon: Headphones }, { label: "System Settings", icon: Settings }, { label: "Audit Log", icon: FileClock }] },
];

const KPI = [
  { label: "Gross volume today", value: "₹48.72L", detail: "+18.4% vs yesterday", icon: BadgeIndianRupee, tone: "admin" },
  { label: "Active retailers", value: "8,412", detail: "+126 this month", icon: Store, tone: "success" },
  { label: "Wallet pool", value: "₹2.84Cr", detail: "78% liquidity available", icon: WalletCards, tone: "warning" },
  { label: "Success rate", value: "98.7%", detail: "42,918 transactions", icon: CircleCheckBig, tone: "success" },
  { label: "KYC pending", value: "116", detail: "34 high priority", icon: ClipboardCheck, tone: "warning" },
  { label: "Risk alerts", value: "8", detail: "2 require action", icon: AlertTriangle, tone: "danger" },
];

const VOLUME = [
  { time: "08:00", volume: 18, success: 16 }, { time: "10:00", volume: 31, success: 29 },
  { time: "12:00", volume: 46, success: 42 }, { time: "14:00", volume: 39, success: 37 },
  { time: "16:00", volume: 58, success: 54 }, { time: "18:00", volume: 71, success: 68 },
  { time: "20:00", volume: 62, success: 59 },
];

const REGIONS = [
  { name: "Karnataka", value: 86 }, { name: "Tamil Nadu", value: 72 },
  { name: "Maharashtra", value: 64 }, { name: "Telangana", value: 58 },
  { name: "Kerala", value: 49 },
];

const SERVICES = [
  { name: "AEPS", value: 38, fill: "var(--admin)" },
  { name: "DMT", value: 27, fill: "var(--india-green)" },
  { name: "BBPS", value: 19, fill: "var(--saffron)" },
  { name: "Recharge", value: 16, fill: "var(--admin-muted)" },
];

const LIVE_ACTIVITY = [
  { id: "BO-92841", service: "AEPS Withdrawal", user: "Shree Balaji Store", location: "Mysuru", amount: "₹8,500", status: "Success", time: "12 sec ago" },
  { id: "BO-92840", service: "Money Transfer", user: "Kaveri Digital", location: "Bengaluru", amount: "₹24,000", status: "Processing", time: "31 sec ago" },
  { id: "BO-92839", service: "BBPS Electricity", user: "Vijaya Services", location: "Hubballi", amount: "₹3,260", status: "Success", time: "48 sec ago" },
  { id: "BO-92838", service: "AEPS Balance", user: "Namma One Center", location: "Mandya", amount: "—", status: "Review", time: "1 min ago" },
];

const ALERTS = [
  { title: "Unusual wallet velocity", detail: "Retailer RT-2041 · 14 transfers in 6 minutes", level: "Critical", time: "2m" },
  { title: "KYC SLA threshold", detail: "34 applications waiting longer than 4 hours", level: "High", time: "8m" },
  { title: "Settlement variance", detail: "₹12,480 variance detected in Karnataka batch", level: "Medium", time: "22m" },
];

function Sidebar({ active, onChange, onClose }: { active: string; onChange: (value: string) => void; onClose?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-admin-panel text-admin-panel-foreground">
      <div className="flex h-20 items-center gap-3 border-b border-admin-panel-foreground/10 px-5">
        <span className="rounded-xl bg-card p-1.5 shadow-soft"><BharatOneLogo size="sm" /></span>
        <div><p className="font-display text-sm font-extrabold">BharatOne Control</p><p className="text-[10px] text-admin-panel-foreground/55">Enterprise command center</p></div>
      </div>
      <div className="mx-3 mt-4 rounded-xl border border-admin-panel-foreground/10 bg-admin-panel-foreground/5 p-3">
        <div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-widest text-admin-panel-foreground/55">Platform health</span><span className="flex items-center gap-1 text-[10px] font-bold text-admin-success"><span className="h-1.5 w-1.5 rounded-full bg-admin-success animate-pulse" /> Operational</span></div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-admin-panel-foreground/10"><div className="h-full w-[99%] rounded-full bg-admin-success" /></div>
        <p className="mt-2 text-[10px] text-admin-panel-foreground/45">99.98% uptime · 42ms response</p>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAVIGATION.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="mb-1.5 px-3 text-[9px] font-extrabold uppercase tracking-[0.18em] text-admin-panel-foreground/35">{group.label}</p>
            <div className="space-y-1">{group.items.map((item) => { const Icon = item.icon; const selected = active === item.label; return (
              <Button key={item.label} variant="ghost" className={cn("h-9 w-full justify-start rounded-lg px-3 text-xs", selected ? "bg-admin text-admin-foreground hover:bg-admin/90 hover:text-admin-foreground" : "text-admin-panel-foreground/65 hover:bg-admin-panel-foreground/8 hover:text-admin-panel-foreground")} onClick={() => { onChange(item.label); onClose?.(); }}>
                <Icon className="h-4 w-4" /><span className="flex-1 text-left">{item.label}</span>{item.badge && <span className={cn("rounded px-1.5 py-0.5 text-[8px] font-extrabold", selected ? "bg-admin-foreground/15" : "bg-admin-panel-foreground/10 text-admin-panel-foreground/60")}>{item.badge}</span>}
              </Button>
            ); })}</div>
          </div>
        ))}
      </nav>
      <div className="border-t border-admin-panel-foreground/10 p-3"><div className="flex items-center gap-3 rounded-xl bg-admin-panel-foreground/5 p-2.5"><span className="grid h-9 w-9 place-items-center rounded-lg bg-admin font-display text-xs font-extrabold text-admin-foreground">SA</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">Super Admin</p><p className="truncate text-[9px] text-admin-panel-foreground/45">Full system access</p></div><ShieldCheck className="h-4 w-4 text-admin-success" /></div></div>
    </div>
  );
}

function MetricCard({ item }: { item: (typeof KPI)[number] }) {
  const Icon = item.icon;
  const tones: Record<string, string> = { admin: "bg-admin-soft text-admin", success: "bg-admin-success-soft text-admin-success", warning: "bg-admin-warning-soft text-admin-warning", danger: "bg-admin-danger-soft text-admin-danger" };
  return <div className="group rounded-2xl border border-border bg-card p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-elev"><div className="flex items-start justify-between"><span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">{item.label}</span><span className={cn("grid h-9 w-9 place-items-center rounded-xl", tones[item.tone])}><Icon className="h-4 w-4" /></span></div><p className="mt-3 font-display text-2xl font-extrabold tracking-tight">{item.value}</p><p className="mt-1 text-[10px] font-semibold text-muted-foreground">{item.detail}</p></div>;
}

export function AdminWorkspace() {
  const [active, setActive] = useState("Executive Overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("Just now");
  const [globalQuery, setGlobalQuery] = useState("");
  const navigate = useNavigate();
  const date = useMemo(() => new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" }).format(new Date()), []);

  const signOut = () => { void supabase.auth.signOut(); localStorage.removeItem("bharatone:auth"); navigate({ to: "/login", replace: true }); };
  const runGlobalSearch = () => {
    const term = globalQuery.trim().toLowerCase();
    if (!term) return;
    const match = NAVIGATION.flatMap((group) => group.items).find((item) => item.label.toLowerCase().includes(term));
    if (match) { setActive(match.label); toast.success(`Opened ${match.label}`); }
    else toast.info("No matching admin module found");
  };
  const exportOverview = () => {
    downloadCsv("executive-overview.csv", ["Metric", "Value", "Detail"], KPI.map((item) => [item.label, item.value, item.detail]));
    toast.success("Executive report downloaded");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden w-72 shrink-0 lg:block"><Sidebar active={active} onChange={setActive} /></aside>
      {sidebarOpen && <div className="fixed inset-0 z-50 flex lg:hidden"><div className="absolute inset-0 bg-admin-panel/70 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} /><aside className="relative w-72"><Button variant="ghost" size="icon" className="absolute right-2 top-2 z-10 text-admin-panel-foreground" onClick={() => setSidebarOpen(false)}><X /></Button><Sidebar active={active} onChange={setActive} onClose={() => setSidebarOpen(false)} /></aside></div>}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-20 shrink-0 items-center gap-3 border-b border-border bg-card/90 px-4 backdrop-blur-xl xl:px-7">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}><Menu /></Button>
          <div className="hidden max-w-xl flex-1 items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 md:flex"><Search className="h-4 w-4 text-muted-foreground" /><input value={globalQuery} onChange={(event) => setGlobalQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && runGlobalSearch()} className="h-10 w-full bg-transparent text-xs outline-none" placeholder="Search admin modules…" /><Button variant="ghost" size="sm" className="h-7 px-2 text-[9px]" onClick={runGlobalSearch}>Go</Button></div>
          <div className="flex-1 md:hidden" />
          <div className="hidden items-center gap-2 xl:flex"><span className="h-2 w-2 rounded-full bg-admin-success animate-pulse" /><span className="text-[10px] font-bold text-muted-foreground">All systems operational</span></div>
          <Button variant="outline" size="icon" className="relative" onClick={() => setActive("Risk & Fraud")} aria-label="Open risk alerts"><Bell /><span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-admin-danger px-1 text-[8px] font-bold text-admin-danger-foreground">8</span></Button>
          <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="h-10 gap-2 px-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-admin text-[10px] font-extrabold text-admin-foreground">SA</span><span className="hidden text-left sm:block"><span className="block text-[11px] font-bold">Super Admin</span><span className="block text-[8px] text-muted-foreground">Platform owner</span></span><ChevronDown /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => setActive("User Management")}><Building2 />Organization</DropdownMenuItem><DropdownMenuItem onClick={() => setActive("System Settings")}><Settings />Preferences</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onClick={signOut}><LogOut />Sign out</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1700px] space-y-5 p-4 lg:p-6 xl:p-7">
            <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div><p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-admin">Administrator command center</p><h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight lg:text-3xl">{active}</h1><p className="mt-1 text-xs text-muted-foreground">{date} · Real-time control across the BharatOne network</p></div>
              <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => { setLastUpdated(new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date())); toast.success("Dashboard refreshed"); }}><RefreshCw /> Refresh <span className="hidden text-muted-foreground sm:inline">· {lastUpdated}</span></Button><Button size="sm" className="bg-admin text-admin-foreground hover:bg-admin/90" onClick={exportOverview}><BarChart3 /> Export report</Button></div>
            </section>

            {active === "Executive Overview" ? <>
            <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{KPI.map((item) => <MetricCard key={item.label} item={item} />)}</section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,.65fr)]">
              <div className="rounded-2xl border border-border bg-card p-4 shadow-soft lg:p-5">
                <div className="flex items-start justify-between"><div><h2 className="text-sm font-extrabold">Transaction intelligence</h2><p className="text-[10px] text-muted-foreground">Hourly gross volume and successful settlements · in lakhs</p></div><span className="rounded-lg bg-admin-success-soft px-2 py-1 text-[9px] font-extrabold text-admin-success">+18.4% TODAY</span></div>
                <div className="mt-4 h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={VOLUME} margin={{ left: -20, right: 5 }}><defs><linearGradient id="adminVolume" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--admin)" stopOpacity={0.35} /><stop offset="100%" stopColor="var(--admin)" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="time" tickLine={false} axisLine={false} fontSize={10} /><YAxis tickLine={false} axisLine={false} fontSize={10} /><Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 11 }} /><Area type="monotone" dataKey="volume" stroke="var(--admin)" strokeWidth={2.5} fill="url(#adminVolume)" /><Area type="monotone" dataKey="success" stroke="var(--india-green)" strokeWidth={2} fill="transparent" /></AreaChart></ResponsiveContainer></div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4 shadow-soft lg:p-5"><div><h2 className="text-sm font-extrabold">Service distribution</h2><p className="text-[10px] text-muted-foreground">Share of today's transaction volume</p></div><div className="relative h-44"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={SERVICES} dataKey="value" innerRadius={52} outerRadius={72} paddingAngle={4}>{SERVICES.map((item) => <Cell key={item.name} fill={item.fill} />)}</Pie><Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 11 }} /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 grid place-items-center"><div className="text-center"><p className="font-display text-xl font-extrabold">42.9K</p><p className="text-[8px] font-bold uppercase text-muted-foreground">Transactions</p></div></div></div><div className="grid grid-cols-2 gap-2">{SERVICES.map((item) => <div key={item.name} className="flex items-center justify-between rounded-lg bg-muted/50 px-2.5 py-2 text-[10px]"><span className="font-semibold">{item.name}</span><span className="font-extrabold">{item.value}%</span></div>)}</div></div>
            </section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,.75fr)]">
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft"><div className="flex items-center justify-between border-b border-border px-4 py-3.5"><div><h2 className="text-sm font-extrabold">Live network activity</h2><p className="text-[10px] text-muted-foreground">Streaming platform transactions</p></div><Button variant="ghost" size="sm" className="text-admin" onClick={() => setActive("Live Operations")}>Open monitor <ArrowUpRight /></Button></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead className="bg-muted/40 text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground"><tr>{["Transaction", "Service", "Retailer", "Amount", "Status", "Time"].map((head) => <th key={head} className="px-4 py-2.5">{head}</th>)}</tr></thead><tbody className="divide-y divide-border">{LIVE_ACTIVITY.map((row) => <tr key={row.id} className="text-[11px] transition hover:bg-muted/30"><td className="px-4 py-3 font-mono font-semibold">{row.id}</td><td className="px-4 py-3 font-bold">{row.service}</td><td className="px-4 py-3"><p className="font-semibold">{row.user}</p><p className="text-[9px] text-muted-foreground">{row.location}</p></td><td className="px-4 py-3 font-extrabold">{row.amount}</td><td className="px-4 py-3"><span className={cn("rounded-full px-2 py-1 text-[9px] font-extrabold", row.status === "Success" ? "bg-admin-success-soft text-admin-success" : row.status === "Review" ? "bg-admin-danger-soft text-admin-danger" : "bg-admin-warning-soft text-admin-warning")}>{row.status}</span></td><td className="px-4 py-3 text-muted-foreground">{row.time}</td></tr>)}</tbody></table></div></div>
              <div className="rounded-2xl border border-border bg-card p-4 shadow-soft"><div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold">Priority alerts</h2><p className="text-[10px] text-muted-foreground">AI-assisted risk and operations queue</p></div><span className="rounded-full bg-admin-danger-soft px-2 py-1 text-[9px] font-extrabold text-admin-danger">3 OPEN</span></div><div className="mt-3 space-y-2.5">{ALERTS.map((alert) => <Button key={alert.title} variant="outline" className="flex h-auto w-full items-start justify-start gap-3 whitespace-normal rounded-xl p-3 text-left" onClick={() => { setActive(alert.title.includes("KYC") ? "KYC Approvals" : alert.title.includes("Settlement") ? "Settlements" : "Risk & Fraud"); toast.info(`Opened ${alert.title}`); }}><span className={cn("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg", alert.level === "Critical" ? "bg-admin-danger-soft text-admin-danger" : alert.level === "High" ? "bg-admin-warning-soft text-admin-warning" : "bg-admin-soft text-admin")}><AlertTriangle className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="flex items-center justify-between"><span className="text-[11px] font-extrabold">{alert.title}</span><span className="text-[9px] text-muted-foreground">{alert.time}</span></span><span className="mt-0.5 block text-[9px] leading-relaxed text-muted-foreground">{alert.detail}</span></span></Button>)}</div><Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => setActive("Risk & Fraud")}>Review all alerts</Button></div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="rounded-2xl border border-border bg-card p-4 shadow-soft"><div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold">Regional performance</h2><p className="text-[10px] text-muted-foreground">Activation target achievement by state</p></div><Button variant="ghost" size="sm" onClick={() => setActive("Retailer Network")}>Details <ArrowUpRight /></Button></div><div className="mt-3 h-52"><ResponsiveContainer width="100%" height="100%"><BarChart data={REGIONS} layout="vertical" margin={{ left: 4, right: 20 }}><CartesianGrid stroke="var(--border)" horizontal={false} /><XAxis type="number" hide domain={[0, 100]} /><YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={85} fontSize={10} /><Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 11 }} /><Bar dataKey="value" fill="var(--admin)" radius={[0, 6, 6, 0]} barSize={14} /></BarChart></ResponsiveContainer></div></div>
              <div className="rounded-2xl border border-border bg-admin-panel p-5 text-admin-panel-foreground shadow-elev"><div className="flex items-start justify-between"><div><p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-admin-panel-foreground/45">Network pulse</p><h2 className="mt-1 font-display text-xl font-extrabold">Business is operating at peak efficiency.</h2></div><span className="grid h-11 w-11 place-items-center rounded-xl bg-admin-success/15 text-admin-success"><Activity /></span></div><div className="mt-6 grid grid-cols-3 gap-3"><div><p className="font-display text-2xl font-extrabold">99.98%</p><p className="text-[9px] text-admin-panel-foreground/45">Uptime</p></div><div><p className="font-display text-2xl font-extrabold">42ms</p><p className="text-[9px] text-admin-panel-foreground/45">API latency</p></div><div><p className="font-display text-2xl font-extrabold">0.03%</p><p className="text-[9px] text-admin-panel-foreground/45">Error rate</p></div></div><div className="mt-5 flex items-center gap-2 rounded-xl bg-admin-panel-foreground/5 p-3"><ShieldCheck className="h-4 w-4 text-admin-success" /><p className="text-[10px] text-admin-panel-foreground/65">Security controls active · Last integrity scan passed 4 minutes ago</p></div></div>
            </section>
            </> : active === "Audit Log" ? <AdminAuditLog /> : active === "User Management" ? <UserManagementWorkflow /> : active === "Service Catalog" ? <ServiceCatalogBuilder /> : active === "Roles & Permissions" ? <RolePermissionCenter /> : active === "Accountant Operations" ? <RegistrationsReview /> : active === "QC Operations" ? <RegistrationsReview /> : active === "KYC Approvals" ? <RegistrationsReview /> : active === "DRO Operations" ? <RegionalOperations role="DRO" /> : active === "TRO Operations" ? <RegionalOperations role="TRO" /> : active === "Retailer Network" ? <RetailerNetworkCenter /> : <AdminModuleView module={active} />}
          </div>
        </main>
      </div>
    </div>
  );
}