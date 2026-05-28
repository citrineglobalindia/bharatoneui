import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Video,
  Banknote,
  CheckCircle2,
  ArrowLeftRight,
  Smartphone,
  Receipt,
  FileText,
  Building2,
  Globe,
  ClipboardList,
  Wrench,
  PlusCircle,
  Wallet,
  BarChart3,
  LifeBuoy,
  Settings,
  LogOut,
  Bell,
  ChevronDown,
  Zap,
  IdCard,
  FileSpreadsheet,
  Landmark,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";
import { BharatOneLogo } from "@/components/bharatone-logo";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Retailer Dashboard — BharatOne" },
      { name: "description", content: "BharatOne retailer services dashboard." },
    ],
  }),
  component: DashboardPage,
});

type NavItem = { label: string; icon: React.ReactNode; active?: boolean };
type NavSection = { heading?: string; items: NavItem[] };

const NAV: NavSection[] = [
  {
    heading: "Main",
    items: [
      { label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, active: true },
      { label: "Video KYC", icon: <Video className="h-4 w-4" /> },
    ],
  },
  {
    heading: "Financial Services",
    items: [
      { label: "AEPS", icon: <Banknote className="h-4 w-4" /> },
      { label: "AEPS Activation", icon: <CheckCircle2 className="h-4 w-4" /> },
      { label: "Money Transfer", icon: <ArrowLeftRight className="h-4 w-4" /> },
      { label: "Recharge", icon: <Smartphone className="h-4 w-4" /> },
      { label: "BBPS Bills", icon: <Receipt className="h-4 w-4" /> },
    ],
  },
  {
    heading: "Business Services",
    items: [
      { label: "GST Services", icon: <FileText className="h-4 w-4" /> },
      { label: "PAN Services", icon: <IdCard className="h-4 w-4" /> },
      { label: "Business Reg.", icon: <Building2 className="h-4 w-4" /> },
      { label: "Gov. Services", icon: <Globe className="h-4 w-4" /> },
      { label: "My Applications", icon: <ClipboardList className="h-4 w-4" /> },
      { label: "My Services", icon: <Wrench className="h-4 w-4" /> },
      { label: "New Service Request", icon: <PlusCircle className="h-4 w-4" /> },
    ],
  },
  {
    heading: "Finance",
    items: [
      { label: "Wallet", icon: <Wallet className="h-4 w-4" /> },
      { label: "Transactions", icon: <ArrowLeftRight className="h-4 w-4" /> },
      { label: "Reports", icon: <BarChart3 className="h-4 w-4" /> },
    ],
  },
  {
    heading: "Support",
    items: [
      { label: "Support Tickets", icon: <LifeBuoy className="h-4 w-4" /> },
      { label: "Settings", icon: <Settings className="h-4 w-4" /> },
    ],
  },
];

type Service = { label: string; icon: React.ReactNode; tone: string; active?: boolean };

const SERVICE_STATUS: Service[] = [
  { label: "AEPS", icon: <Banknote className="h-4 w-4" />, tone: "bg-sky-500", active: true },
  { label: "Money Transfer", icon: <ArrowLeftRight className="h-4 w-4" />, tone: "bg-orange-500", active: true },
  { label: "Recharge", icon: <Smartphone className="h-4 w-4" />, tone: "bg-emerald-600", active: true },
  { label: "Bill Payments", icon: <Receipt className="h-4 w-4" />, tone: "bg-orange-500", active: true },
  { label: "GST Services", icon: <FileText className="h-4 w-4" />, tone: "bg-emerald-600", active: true },
  { label: "PAN Services", icon: <IdCard className="h-4 w-4" />, tone: "bg-rose-500", active: true },
  { label: "Business Reg.", icon: <Building2 className="h-4 w-4" />, tone: "bg-slate-400", active: false },
  { label: "MSME / Udyam", icon: <Landmark className="h-4 w-4" />, tone: "bg-slate-400", active: false },
  { label: "ITR Filing", icon: <FileSpreadsheet className="h-4 w-4" />, tone: "bg-slate-400", active: false },
  { label: "Digital Sign.", icon: <ShieldCheck className="h-4 w-4" />, tone: "bg-slate-400", active: false },
];

const ALL_SERVICES: Service[] = [
  { label: "AEPS", icon: <Banknote className="h-5 w-5" />, tone: "bg-sky-500" },
  { label: "Money Transfer", icon: <ArrowLeftRight className="h-5 w-5" />, tone: "bg-orange-500" },
  { label: "Mobile Recharge", icon: <Smartphone className="h-5 w-5" />, tone: "bg-emerald-600" },
  { label: "DTH Recharge", icon: <Zap className="h-5 w-5" />, tone: "bg-violet-500" },
  { label: "Bill Payments", icon: <Receipt className="h-5 w-5" />, tone: "bg-orange-500" },
  { label: "GST Services", icon: <FileText className="h-5 w-5" />, tone: "bg-teal-600" },
  { label: "PAN Services", icon: <IdCard className="h-5 w-5" />, tone: "bg-rose-500" },
  { label: "Business Reg.", icon: <Building2 className="h-5 w-5" />, tone: "bg-violet-500" },
  { label: "MSME / Udyam", icon: <Landmark className="h-5 w-5" />, tone: "bg-teal-600" },
  { label: "ITR Filing", icon: <FileSpreadsheet className="h-5 w-5" />, tone: "bg-indigo-500" },
  { label: "FSSAI License", icon: <ShieldCheck className="h-5 w-5" />, tone: "bg-emerald-600" },
  { label: "Digital Sign.", icon: <ShieldCheck className="h-5 w-5" />, tone: "bg-slate-700" },
];

function DashboardPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border bg-card">
        <div className="px-4 py-4 border-b border-border">
          <BharatOneLogo size="md" />
        </div>
        <div className="px-4 py-3 border-b border-border flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-india-green/10 text-india-green flex items-center justify-center font-bold">D</div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">Demo Retailer</p>
            <p className="text-[11px] text-muted-foreground">9000000004</p>
            <span className="inline-block mt-0.5 text-[10px] font-semibold bg-india-green text-white px-1.5 py-0.5 rounded">Retailer</span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {NAV.map((sec) => (
            <div key={sec.heading}>
              {sec.heading && (
                <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{sec.heading}</p>
              )}
              <ul className="space-y-0.5">
                {sec.items.map((it) => (
                  <li key={it.label}>
                    <button
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        it.active
                          ? "bg-saffron-gradient text-white shadow-elev"
                          : "text-foreground/80 hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <span className={it.active ? "text-white" : "text-muted-foreground"}>{it.icon}</span>
                      <span className="truncate">{it.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <button
          onClick={() => navigate({ to: "/login" })}
          className="m-3 flex items-center justify-center gap-2 rounded-lg bg-india-green/10 text-india-green px-3 py-2 text-sm font-semibold hover:bg-india-green/15"
        >
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4 lg:px-6">
          <BharatOneLogo size="sm" />
          <div className="flex items-center gap-3">
            <button className="relative h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-saffron" />
            </button>
            <button className="flex items-center gap-2 rounded-full hover:bg-muted pl-1 pr-2 py-1">
              <div className="h-7 w-7 rounded-full bg-india-green text-white text-xs font-bold flex items-center justify-center">D</div>
              <span className="text-sm font-semibold">Demo Retailer</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-5">
          {/* Greeting */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-display text-2xl font-extrabold">Hello, Demo Retailer</h1>
              <p className="text-sm text-muted-foreground">Your services dashboard</p>
            </div>
            <button className="inline-flex items-center gap-2 rounded-lg bg-saffron-gradient text-white px-4 py-2 text-sm font-semibold shadow-elev hover:scale-[1.02] transition">
              <Wallet className="h-4 w-4" /> My Wallet
            </button>
          </div>

          {/* Wallet banner */}
          <div className="rounded-2xl bg-saffron-gradient text-white p-5 shadow-elev">
            <p className="text-[11px] font-bold uppercase tracking-wider opacity-90">Wallet Balance</p>
            <p className="font-display text-3xl font-extrabold mt-1">₹0.00</p>
            <p className="text-xs opacity-90">Available for services</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
              {["View Ledger", "Transactions", "Applications"].map((l) => (
                <button key={l} className="rounded-lg bg-white/15 hover:bg-white/25 border border-white/20 py-2 text-sm font-semibold transition">
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* KYC alert */}
          <button className="w-full flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 hover:bg-amber-100/70 transition">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-amber-200/70 text-amber-700 flex items-center justify-center">
                <Video className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-amber-900">Complete Video KYC</p>
                <p className="text-xs text-amber-800/80">Required for account activation</p>
              </div>
            </div>
            <ArrowUpRight className="h-4 w-4 text-amber-700" />
          </button>

          {/* Service status */}
          <section>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Service Status</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {SERVICE_STATUS.map((s) => (
                <div
                  key={s.label}
                  className={`rounded-xl border bg-card px-3 py-2.5 flex items-center gap-2.5 ${
                    s.active ? "border-emerald-200" : "border-border opacity-70"
                  }`}
                >
                  <div className={`h-8 w-8 rounded-lg ${s.tone} text-white flex items-center justify-center`}>{s.icon}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{s.label}</p>
                    <p className={`text-[11px] font-semibold ${s.active ? "text-india-green" : "text-muted-foreground"}`}>
                      {s.active ? "Active" : "Inactive"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* All services */}
          <section>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">All Services</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {ALL_SERVICES.map((s) => (
                <button
                  key={s.label}
                  className="rounded-xl border border-border bg-card px-3 py-4 flex flex-col items-center gap-2 hover:shadow-elev hover:-translate-y-0.5 transition"
                >
                  <div className={`h-10 w-10 rounded-xl ${s.tone} text-white flex items-center justify-center shadow-soft`}>{s.icon}</div>
                  <span className="text-xs font-semibold text-center">{s.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Recent transactions */}
          <section className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-sm font-bold">Recent Transactions</p>
              <button className="text-xs font-semibold text-india-green hover:underline inline-flex items-center gap-1">
                View All <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
            <div className="py-10 text-center text-sm text-muted-foreground">No transactions yet</div>
          </section>

          {/* My applications */}
          <button className="w-full flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:bg-muted/40 transition">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-saffron/10 text-saffron flex items-center justify-center">
                <ClipboardList className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold">My Applications</p>
                <p className="text-xs text-muted-foreground">GST, PAN, Business registration status</p>
              </div>
            </div>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </main>
      </div>
    </div>
  );
}