import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Wallet, TrendingUp, Receipt, Users, ArrowUpRight, Video, Banknote, ArrowLeftRight, Smartphone, Zap, FileText, IdCard, Building2, FileSpreadsheet, ShieldCheck, Landmark, ClipboardList,
} from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader, StatusBadge } from "@/components/retailer/page-header";
import { StatCard } from "@/components/retailer/stat-card";
import { DataTable, type Column } from "@/components/retailer/data-table";
import { MOCK_TXNS, WEEKLY_VOLUME, SERVICE_SPLIT, inr, type Txn } from "@/components/retailer/mock-data";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Retailer Dashboard — BharatOne" },
      { name: "description", content: "BharatOne retailer services dashboard." },
    ],
  }),
  component: DashboardPage,
});

const SERVICE_STATUS = [
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

const QUICK_LINKS = [
  { label: "AEPS", to: "/aeps", icon: <Banknote className="h-5 w-5" />, tone: "bg-sky-500" },
  { label: "Money Transfer", to: "/money-transfer", icon: <ArrowLeftRight className="h-5 w-5" />, tone: "bg-orange-500" },
  { label: "Mobile Recharge", to: "/recharge", icon: <Smartphone className="h-5 w-5" />, tone: "bg-emerald-600" },
  { label: "DTH Recharge", to: "/recharge", icon: <Zap className="h-5 w-5" />, tone: "bg-violet-500" },
  { label: "Bill Payments", to: "/bbps", icon: <Receipt className="h-5 w-5" />, tone: "bg-orange-500" },
  { label: "GST Services", to: "/gst", icon: <FileText className="h-5 w-5" />, tone: "bg-teal-600" },
  { label: "PAN Services", to: "/pan", icon: <IdCard className="h-5 w-5" />, tone: "bg-rose-500" },
  { label: "Business Reg.", to: "/business-reg", icon: <Building2 className="h-5 w-5" />, tone: "bg-violet-500" },
  { label: "MSME / Udyam", to: "/gov-services", icon: <Landmark className="h-5 w-5" />, tone: "bg-teal-600" },
  { label: "ITR Filing", to: "/gov-services", icon: <FileSpreadsheet className="h-5 w-5" />, tone: "bg-indigo-500" },
  { label: "FSSAI License", to: "/gov-services", icon: <ShieldCheck className="h-5 w-5" />, tone: "bg-emerald-600" },
  { label: "Digital Sign.", to: "/gov-services", icon: <ShieldCheck className="h-5 w-5" />, tone: "bg-slate-700" },
];

const txnColumns: Column<Txn>[] = [
  { key: "id", header: "Txn ID", cell: (r) => <span className="font-mono text-xs">{r.id}</span> },
  { key: "service", header: "Service", cell: (r) => <span className="font-medium">{r.service}</span> },
  { key: "customer", header: "Customer", cell: (r) => <span className="text-muted-foreground">{r.customer}</span> },
  { key: "amount", header: "Amount", cell: (r) => <span className="font-semibold">{inr(r.amount)}</span>, className: "text-right" },
  { key: "commission", header: "Commission", cell: (r) => <span className="text-emerald-700 font-semibold">+{inr(r.commission)}</span>, className: "text-right" },
  { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
];

function DashboardPage() {
  return (
    <RetailerShell>
      <div className="space-y-5">
        <PageHeader
          title="Hello, Demo Retailer 👋"
          subtitle="Here's what's happening with your business today."
          actions={
            <>
              <Link to="/wallet" className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 h-10 text-sm font-semibold hover:bg-muted transition">
                <Wallet className="h-4 w-4" /> My Wallet
              </Link>
              <Link to="/new-service-request" className="inline-flex items-center gap-2 rounded-lg bg-saffron-gradient text-white px-4 h-10 text-sm font-semibold shadow-elev hover:scale-[1.02] transition">
                + New Request
              </Link>
            </>
          }
        />

        {/* KPI grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Wallet Balance" value="₹0.00" icon={<Wallet className="h-5 w-5" />} tone="saffron" delta={{ value: "Top up to begin", positive: true }} />
          <StatCard label="Today's Volume" value={inr(80420)} icon={<TrendingUp className="h-5 w-5" />} tone="green" delta={{ value: "+18.4%", positive: true }} />
          <StatCard label="Today's Commission" value={inr(264.07)} icon={<Receipt className="h-5 w-5" />} tone="sky" delta={{ value: "+9.1%", positive: true }} />
          <StatCard label="Active Customers" value="142" icon={<Users className="h-5 w-5" />} tone="violet" delta={{ value: "+12 this week", positive: true }} />
        </div>

        {/* Wallet + KYC banner */}
        <div className="grid lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 rounded-2xl bg-saffron-gradient text-white p-5 shadow-elev relative overflow-hidden">
            <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10" />
            <div className="absolute right-6 bottom-2 h-24 w-24 rounded-full bg-white/10" />
            <div className="relative">
              <p className="text-[11px] font-bold uppercase tracking-wider opacity-90">Wallet Balance</p>
              <p className="font-display text-4xl font-extrabold mt-1">₹0.00</p>
              <p className="text-xs opacity-90">Available for services · Last updated just now</p>
              <div className="grid grid-cols-3 gap-2 mt-4 max-w-md">
                {["View Ledger", "Transactions", "Applications"].map((l) => (
                  <button key={l} className="rounded-lg bg-white/15 hover:bg-white/25 border border-white/20 py-2 text-xs font-semibold transition">
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <Link to="/video-kyc" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 hover:bg-amber-100/70 transition flex flex-col">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-200/70 text-amber-700 flex items-center justify-center">
                <Video className="h-4 w-4" />
              </div>
              <p className="font-bold text-amber-900">Complete Video KYC</p>
            </div>
            <p className="text-xs text-amber-800/80 mt-2 flex-1">
              Required to activate AEPS, DMT, and Business services. Takes under 2 minutes.
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-amber-900">
              Start KYC <ArrowUpRight className="h-3 w-3" />
            </span>
          </Link>
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4 shadow-soft">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-bold">Weekly Transaction Volume</h3>
                <p className="text-xs text-muted-foreground">Last 7 days · GMV</p>
              </div>
              <span className="text-xs font-semibold text-emerald-600">+24.3% WoW</span>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={WEEKLY_VOLUME} margin={{ top: 10, right: 6, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tickLine={false} axisLine={false} className="text-xs" />
                  <YAxis tickLine={false} axisLine={false} className="text-xs" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }}
                    formatter={(v: number) => inr(v)}
                  />
                  <Area type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2.5} fill="url(#grad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <h3 className="text-sm font-bold">Service Mix</h3>
            <p className="text-xs text-muted-foreground mb-2">Share of monthly volume</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={SERVICE_SPLIT} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={2}>
                    {SERVICE_SPLIT.map((s) => (
                      <Cell key={s.name} fill={s.color} />
                    ))}
                  </Pie>
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Service status */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Service Status</p>
            <span className="text-[11px] text-muted-foreground">6 active · 4 inactive</span>
          </div>
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
                    {s.active ? "● Active" : "○ Inactive"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Quick links */}
        <section>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">All Services</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {QUICK_LINKS.map((s) => (
              <Link
                key={s.label}
                to={s.to}
                className="rounded-xl border border-border bg-card px-3 py-4 flex flex-col items-center gap-2 hover:shadow-elev hover:-translate-y-0.5 transition"
              >
                <div className={`h-10 w-10 rounded-xl ${s.tone} text-white flex items-center justify-center shadow-soft`}>
                  {s.icon}
                </div>
                <span className="text-xs font-semibold text-center">{s.label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Recent transactions */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Recent Transactions</p>
            <Link to="/transactions" className="text-xs font-semibold text-india-green hover:underline inline-flex items-center gap-1">
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <DataTable columns={txnColumns} rows={MOCK_TXNS.slice(0, 5)} />
        </section>

        {/* Applications */}
        <Link
          to="/applications"
          className="w-full flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:bg-muted/40 transition"
        >
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
        </Link>
      </div>
    </RetailerShell>
  );
}