import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Wallet, TrendingUp, Receipt, ClipboardCheck, ArrowUpRight, Video, Banknote, ArrowLeftRight, Smartphone, Zap, FileText, IdCard, Building2, FileSpreadsheet, ShieldCheck, Landmark, ClipboardList,
} from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader, StatusBadge } from "@/components/retailer/page-header";
import { StatCard } from "@/components/retailer/stat-card";
import { DataTable, type Column } from "@/components/retailer/data-table";
import { inr } from "@/components/retailer/mock-data";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/use-current-user";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Retailer Dashboard — BharatOne" },
      { name: "description", content: "BharatOne retailer services dashboard." },
    ],
  }),
  component: DashboardPage,
});

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

type Row = {
  id: string; application_no: string | null; service_name: string | null; category_name: string | null;
  full_name: string | null; service_charge: number | null; commission_price: number | null; status: string; created_at: string;
};
type Txn = { id: string; service: string; customer: string; amount: number; commission: number; status: string };

const statusLabel: Record<string, string> = { submitted: "pending", in_progress: "pending", approved: "success", completed: "success", rejected: "failed" };

const txnColumns: Column<Txn>[] = [
  { key: "id", header: "App ID", cell: (r) => <span className="font-mono text-xs">{r.id}</span> },
  { key: "service", header: "Service", cell: (r) => <span className="font-medium">{r.service}</span> },
  { key: "customer", header: "Applicant", cell: (r) => <span className="text-muted-foreground">{r.customer}</span> },
  { key: "amount", header: "Charge", cell: (r) => <span className="font-semibold">{inr(r.amount)}</span>, className: "text-right" },
  { key: "commission", header: "Commission", cell: (r) => <span className="text-emerald-700 font-semibold">+{inr(r.commission)}</span>, className: "text-right" },
  { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status as any} /> },
];

const PIE_COLORS = ["#f59e0b", "#16a34a", "#0ea5e9", "#8b5cf6", "#ef4444", "#14b8a6", "#6366f1", "#64748b"];

function DashboardPage() {
  const me = useCurrentUser();
  const [balance, setBalance] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [kycStatus, setKycStatus] = useState<string | null>(null);

  useEffect(() => {
    let on = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) { if (on) setLoading(false); return; }
      const [w, apps, reg] = await Promise.all([
        supabase.from("wallets").select("balance").eq("user_id", u.user.id).maybeSingle(),
        supabase.from("service_applications")
          .select("id,application_no,service_name,category_name,full_name,service_charge,commission_price,status,created_at")
          .eq("submitted_by", u.user.id)
          .order("created_at", { ascending: false }),
        supabase.from("retailer_registrations").select("status").eq("auth_user_id", u.user.id)
          .order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (!on) return;
      setBalance(Number((w.data as any)?.balance ?? 0));
      setRows(((apps.data as Row[]) ?? []));
      setKycStatus((reg.data as any)?.status ?? null);
      setLoading(false);
    })();
    return () => { on = false; };
  }, []);

  const earned = (s: string) => ["approved", "completed"].includes(s);
  const todayStr = new Date().toDateString();

  const kpi = useMemo(() => {
    const total = rows.length;
    const pending = rows.filter((r) => ["submitted", "in_progress"].includes(r.status)).length;
    const todays = rows.filter((r) => new Date(r.created_at).toDateString() === todayStr);
    return {
      total, pending,
      todayVolume: todays.reduce((a, r) => a + Number(r.service_charge || 0), 0),
      commission: rows.filter((r) => earned(r.status)).reduce((a, r) => a + Number(r.commission_price || 0), 0),
    };
  }, [rows]);

  const weekly = useMemo(() => {
    const days: { day: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString("en-IN", { weekday: "short" });
      const v = rows.filter((r) => new Date(r.created_at).toDateString() === d.toDateString())
        .reduce((a, r) => a + Number(r.service_charge || 0), 0);
      days.push({ day: label, value: v });
    }
    return days;
  }, [rows]);

  const mix = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => { const k = r.category_name || "Other"; m.set(k, (m.get(k) || 0) + Number(r.service_charge || 0)); });
    const arr = Array.from(m.entries()).map(([name, value], i) => ({ name, value, color: PIE_COLORS[i % PIE_COLORS.length] }));
    return arr.sort((a, b) => b.value - a.value).slice(0, 6);
  }, [rows]);

  const recent: Txn[] = useMemo(() => rows.slice(0, 6).map((r) => ({
    id: r.application_no || r.id.slice(0, 8),
    service: r.service_name || r.category_name || "Service",
    customer: r.full_name || "—",
    amount: Number(r.service_charge || 0),
    commission: Number(r.commission_price || 0),
    status: statusLabel[r.status] || r.status,
  })), [rows]);

  const firstName = (me.name || "there").split(/\s+/)[0];

  return (
    <RetailerShell>
      <div className="space-y-5">
        <PageHeader
          title={`Hello, ${firstName} 👋`}
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
          <StatCard label="Wallet Balance" value={loading ? "…" : inr(balance)} icon={<Wallet className="h-5 w-5" />} tone="saffron" delta={{ value: balance > 0 ? "Available" : "Top up to begin", positive: true }} />
          <StatCard label="Today's Volume" value={loading ? "…" : inr(kpi.todayVolume)} icon={<TrendingUp className="h-5 w-5" />} tone="green" delta={{ value: `${rows.filter((r) => new Date(r.created_at).toDateString() === todayStr).length} today`, positive: true }} />
          <StatCard label="Earned Commission" value={loading ? "…" : inr(kpi.commission)} icon={<Receipt className="h-5 w-5" />} tone="sky" delta={{ value: "Approved + completed", positive: true }} />
          <StatCard label="Applications" value={loading ? "…" : String(kpi.total)} icon={<ClipboardCheck className="h-5 w-5" />} tone="violet" delta={{ value: `${kpi.pending} pending`, positive: kpi.pending === 0 }} />
        </div>

        {/* Wallet + KYC banner */}
        <div className="grid lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 rounded-2xl bg-saffron-gradient text-white p-5 shadow-elev relative overflow-hidden">
            <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10" />
            <div className="absolute right-6 bottom-2 h-24 w-24 rounded-full bg-white/10" />
            <div className="relative">
              <p className="text-[11px] font-bold uppercase tracking-wider opacity-90">Wallet Balance</p>
              <p className="font-display text-4xl font-extrabold mt-1">{loading ? "…" : inr(balance)}</p>
              <p className="text-xs opacity-90">Available for services · Updated just now</p>
              <div className="grid grid-cols-3 gap-2 mt-4 max-w-md">
                <Link to="/wallet" className="rounded-lg bg-white/15 hover:bg-white/25 border border-white/20 py-2 text-xs font-semibold transition text-center">View Ledger</Link>
                <Link to="/transactions" className="rounded-lg bg-white/15 hover:bg-white/25 border border-white/20 py-2 text-xs font-semibold transition text-center">Transactions</Link>
                <Link to="/applications" className="rounded-lg bg-white/15 hover:bg-white/25 border border-white/20 py-2 text-xs font-semibold transition text-center">Applications</Link>
              </div>
            </div>
          </div>
          {kycStatus === "approved" ? (
            <Link to="/video-kyc" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 hover:bg-emerald-100/70 transition flex flex-col">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-200/70 text-emerald-700 flex items-center justify-center">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <p className="font-bold text-emerald-900">KYC Verified</p>
              </div>
              <p className="text-xs text-emerald-800/80 mt-2 flex-1">
                Your documents were verified during registration. Your account is active — no further KYC needed.
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-900">
                View Documents <ArrowUpRight className="h-3 w-3" />
              </span>
            </Link>
          ) : (
            <Link to="/video-kyc" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 hover:bg-amber-100/70 transition flex flex-col">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-200/70 text-amber-700 flex items-center justify-center">
                  <Video className="h-4 w-4" />
                </div>
                <p className="font-bold text-amber-900">KYC Documents</p>
              </div>
              <p className="text-xs text-amber-800/80 mt-2 flex-1">
                Track the status of the Aadhaar, PAN, shop photo and Video KYC you submitted during registration.
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-amber-900">
                View Documents <ArrowUpRight className="h-3 w-3" />
              </span>
            </Link>
          )}
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4 shadow-soft">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-bold">Weekly Application Volume</h3>
                <p className="text-xs text-muted-foreground">Last 7 days · service charges</p>
              </div>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weekly} margin={{ top: 10, right: 6, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tickLine={false} axisLine={false} className="text-xs" />
                  <YAxis tickLine={false} axisLine={false} className="text-xs" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }} formatter={(v: number) => inr(v)} />
                  <Area type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2.5} fill="url(#grad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <h3 className="text-sm font-bold">Service Mix</h3>
            <p className="text-xs text-muted-foreground mb-2">Share by category</p>
            <div className="h-56">
              {mix.length === 0 ? (
                <div className="grid h-full place-items-center text-xs text-muted-foreground">No applications yet</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={mix} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={2}>
                      {mix.map((s) => (<Cell key={s.name} fill={s.color} />))}
                    </Pie>
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => inr(v)} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Quick links */}
        <section>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">All Services</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {QUICK_LINKS.map((s) => (
              <Link key={s.label} to={s.to} className="rounded-xl border border-border bg-card px-3 py-4 flex flex-col items-center gap-2 hover:shadow-elev hover:-translate-y-0.5 transition">
                <div className={`h-10 w-10 rounded-xl ${s.tone} text-white flex items-center justify-center shadow-soft`}>{s.icon}</div>
                <span className="text-xs font-semibold text-center">{s.label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Recent applications */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Recent Applications</p>
            <Link to="/applications" className="text-xs font-semibold text-india-green hover:underline inline-flex items-center gap-1">
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          {loading ? (
            <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">Loading…</div>
          ) : recent.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">No applications yet. Start with “+ New Request”.</div>
          ) : (
            <DataTable columns={txnColumns} rows={recent} />
          )}
        </section>

        {/* Applications link */}
        <Link to="/applications" className="w-full flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:bg-muted/40 transition">
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
