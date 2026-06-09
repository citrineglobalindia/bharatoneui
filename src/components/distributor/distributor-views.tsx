import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  AreaChart, Area, BarChart, Bar, PieChart as RePieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import {
  Users, Activity, Layers, IndianRupee, Download, Search, Network, TrendingUp,
  Store, Coins, ChevronRight, Building2, MapPinned, ArrowUpRight, ArrowDownRight,
  Receipt, BadgeIndianRupee, CheckCircle2, CalendarDays, Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { DistributorShell } from "@/components/distributor/distributor-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { StatCard } from "@/components/retailer/stat-card";
import {
  RETAILERS, OFFICERS, SERVICE_META, WEEKLY, MONTHLY, inr, serviceTotal,
  retailerCommission, aggregateServices, officerSummary, topRetailers,
  exportRetailersCsv, officerCounts, retailerCounts, periodFigures,
  DISTRIBUTOR_MARGIN, type Retailer, type PeriodKey,
} from "@/components/distributor/distributor-data";

const HEX = "#0ea5e9";

/* ---------------- Sales Dashboard data ---------------- */
const KPIS = [
  { label: "Total Transactions", value: "8,510", delta: "12.6%", up: true, icon: <Users className="h-5 w-5" />, ring: "bg-sky-50 text-sky-600", bar: "from-sky-500 to-sky-400" },
  { label: "Total Business Volume", value: "\u20B943,16,500", delta: "15.3%", up: true, icon: <BadgeIndianRupee className="h-5 w-5" />, ring: "bg-emerald-50 text-emerald-600", bar: "from-emerald-500 to-emerald-400" },
  { label: "Total Commission Earned", value: "\u20B996,330", delta: "14.8%", up: true, icon: <Coins className="h-5 w-5" />, ring: "bg-amber-50 text-amber-600", bar: "from-amber-500 to-amber-400" },
  { label: "Active Retailers", value: "125", delta: "8.7%", up: true, icon: <Store className="h-5 w-5" />, ring: "bg-violet-50 text-violet-600", bar: "from-violet-500 to-violet-400" },
  { label: "Success Rate", value: "97.45%", delta: "2.1%", up: true, icon: <CheckCircle2 className="h-5 w-5" />, ring: "bg-teal-50 text-teal-600", bar: "from-teal-500 to-teal-400" },
];

const SERVICE_PERF = [
  { name: "AEPS Cash Withdrawal", txns: 1250, revenue: 625000, commission: 12500, growth: 10.2, up: true },
  { name: "Money Transfer (DMT)", txns: 850, revenue: 1700000, commission: 25500, growth: 18.7, up: true },
  { name: "Mobile Recharge", txns: 3200, revenue: 480000, commission: 9600, growth: 11.3, up: true },
  { name: "DTH Recharge", txns: 750, revenue: 112500, commission: 2250, growth: -2.7, up: false },
  { name: "Electricity Bill Payment", txns: 1100, revenue: 550000, commission: 8250, growth: 13.6, up: true },
  { name: "Water Bill Payment", txns: 420, revenue: 84000, commission: 1680, growth: 7.4, up: true },
  { name: "Insurance Premium", txns: 180, revenue: 360000, commission: 10800, growth: 16.9, up: true },
  { name: "PAN Card Services", txns: 95, revenue: 47500, commission: 4750, growth: 5.6, up: true },
  { name: "Government Services", txns: 540, revenue: 270000, commission: 13500, growth: 12.8, up: true },
  { name: "Travel Booking", txns: 125, revenue: 187500, commission: 7500, growth: 9.2, up: true },
];

const VOLUME_TREND = [
  { d: "01 Jun", v: 8 }, { d: "03 Jun", v: 12 }, { d: "05 Jun", v: 10 }, { d: "07 Jun", v: 18 },
  { d: "09 Jun", v: 15 }, { d: "11 Jun", v: 22 }, { d: "13 Jun", v: 20 }, { d: "15 Jun", v: 28 },
  { d: "17 Jun", v: 24 }, { d: "19 Jun", v: 32 }, { d: "21 Jun", v: 30 }, { d: "23 Jun", v: 38 },
  { d: "25 Jun", v: 35 }, { d: "27 Jun", v: 43 }, { d: "29 Jun", v: 41 }, { d: "30 Jun", v: 47 },
];

const CONTRIBUTION = [
  { name: "DMT", value: 39.4, color: "#3b82f6" },
  { name: "AEPS", value: 14.5, color: "#10b981" },
  { name: "Bill Payments", value: 14.7, color: "#f59e0b" },
  { name: "Recharges", value: 13.7, color: "#06b6d4" },
  { name: "Insurance", value: 8.3, color: "#8b5cf6" },
  { name: "Government Services", value: 6.3, color: "#ec4899" },
  { name: "Others", value: 3.1, color: "#94a3b8" },
];

const TOP5 = [
  { rank: 1, id: "RET001", name: "Sai Online Center", revenue: 125000 },
  { rank: 2, id: "RET015", name: "Shree Enterprises", revenue: 110000 },
  { rank: 3, id: "RET028", name: "Grama One Center", revenue: 98500 },
  { rank: 4, id: "RET042", name: "Digital Seva Kendra", revenue: 92000 },
  { rank: 5, id: "RET063", name: "Karnataka Services Hub", revenue: 85500 },
];

const DISTRICTS = [
  { name: "Bengaluru Urban", value: 1245000 },
  { name: "Mysuru", value: 675000 },
  { name: "Belagavi", value: 485000 },
  { name: "Dharwad", value: 420000 },
  { name: "Hubballi", value: 315000 },
  { name: "Others", value: 1176500 },
];

const SUMMARY = [
  { name: "Active Retailers", value: 125, color: "#10b981" },
  { name: "Inactive Retailers", value: 18, color: "#ef4444" },
];

const inrFull = (n: number) => "\u20B9" + n.toLocaleString("en-IN");

function Card({ title, action, children, className = "" }: { title?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-4 lg:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="text-sm font-bold text-slate-800">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

/* ---------------- Original Network Dashboard ---------------- */
const TONE_BG: Record<string, string> = {
  rose: "bg-rose-500",
  violet: "bg-violet-500",
  sky: "bg-sky-500",
  green: "bg-emerald-600",
};

function CountCard({
  title, icon, tone, total, active, inactive,
}: {
  title: string; icon: React.ReactNode; tone: string;
  total: number; active: number; inactive: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
        <div className={`h-9 w-9 rounded-xl ${TONE_BG[tone]} text-white flex items-center justify-center`}>{icon}</div>
      </div>
      <p className="font-display text-3xl font-extrabold mt-2">{total}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-2.5 py-1.5">
          <p className="text-[10px] font-bold uppercase text-emerald-600">Active</p>
          <p className="text-base font-extrabold text-emerald-700">{active}</p>
        </div>
        <div className="rounded-lg bg-rose-50 border border-rose-100 px-2.5 py-1.5">
          <p className="text-[10px] font-bold uppercase text-rose-500">Inactive</p>
          <p className="text-base font-extrabold text-rose-600">{inactive}</p>
        </div>
      </div>
    </div>
  );
}

const PERIODS: PeriodKey[] = ["Daily", "Weekly", "Monthly", "Custom"];

function FilterMetricCard({
  title, icon, tone, period, onPeriod, range, onRange, value, caption,
}: {
  title: string; icon: React.ReactNode; tone: string;
  period: PeriodKey; onPeriod: (p: PeriodKey) => void;
  range: { from: string; to: string }; onRange: (r: { from: string; to: string }) => void;
  value: string; caption: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`h-9 w-9 rounded-xl ${TONE_BG[tone]} text-white flex items-center justify-center`}>{icon}</div>
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        </div>
        <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => onPeriod(p)}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition ${
                period === p ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <p className="font-display text-3xl font-extrabold text-slate-900">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-1">{caption} · {period === "Custom" ? "custom range" : period.toLowerCase()}</p>
      {period === "Custom" && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="date" value={range.from}
            onChange={(e) => onRange({ ...range, from: e.target.value })}
            className="rounded-lg border border-slate-200 bg-white px-2.5 h-8 text-xs font-semibold text-slate-700"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date" value={range.to}
            onChange={(e) => onRange({ ...range, to: e.target.value })}
            className="rounded-lg border border-slate-200 bg-white px-2.5 h-8 text-xs font-semibold text-slate-700"
          />
        </div>
      )}
    </div>
  );
}

export function DistributorDashboard() {
  const mix = useMemo(() => aggregateServices(RETAILERS), []);
  const top = useMemo(() => topRetailers(RETAILERS), []);
  const oc = useMemo(() => officerCounts(), []);
  const rc = useMemo(() => retailerCounts(RETAILERS), []);
  const periods = useMemo(() => periodFigures(RETAILERS), []);

  const [svcPeriod, setSvcPeriod] = useState<PeriodKey>("Daily");
  const [commPeriod, setCommPeriod] = useState<PeriodKey>("Daily");
  const [svcRange, setSvcRange] = useState({ from: "2026-06-01", to: "2026-06-30" });
  const [commRange, setCommRange] = useState({ from: "2026-06-01", to: "2026-06-30" });

  const daysBetween = (a: string, b: string) =>
    Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000) + 1);

  const svcFig = useMemo(() => {
    if (svcPeriod === "Custom") {
      const d = daysBetween(svcRange.from, svcRange.to);
      return {
        services: periods.Daily.services * d,
        commission: periods.Daily.commission * d,
        retailerRevenue: periods.Daily.retailerRevenue * d,
        distributorRevenue: periods.Daily.distributorRevenue * d,
      };
    }
    return periods[svcPeriod];
  }, [svcPeriod, svcRange, periods]);

  const commFig = useMemo(() => {
    if (commPeriod === "Custom") {
      const d = daysBetween(commRange.from, commRange.to);
      return {
        services: periods.Daily.services * d,
        commission: periods.Daily.commission * d,
        retailerRevenue: periods.Daily.retailerRevenue * d,
        distributorRevenue: periods.Daily.distributorRevenue * d,
      };
    }
    return periods[commPeriod];
  }, [commPeriod, commRange, periods]);

  return (
    <DistributorShell>
      <div className="space-y-6">
        <PageHeader
          icon={<Network className="h-5 w-5" />}
          title="Karthik's Distributor Dashboard"
          subtitle="Live oversight of DRO, TRO and retailer network across the zone."
          badge={
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-bold text-sky-700">
              <Activity className="h-3 w-3" /> Live Network
            </span>
          }
        />

        {/* Officer + Retailer counts (active / inactive) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <CountCard
            title="DRO Officers"
            icon={<Building2 className="h-5 w-5" />}
            tone="rose"
            total={oc.droTotal}
            active={oc.droActive}
            inactive={oc.droInactive}
          />
          <CountCard
            title="TRO Officers"
            icon={<MapPinned className="h-5 w-5" />}
            tone="violet"
            total={oc.troTotal}
            active={oc.troActive}
            inactive={oc.troInactive}
          />
          <CountCard
            title="Retailers"
            icon={<Users className="h-5 w-5" />}
            tone="sky"
            total={rc.total}
            active={rc.active}
            inactive={rc.inactive}
          />
        </div>

        {/* Service, Commission, Revenue + Active shops */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <FilterMetricCard
            title="Services"
            icon={<Layers className="h-5 w-5" />}
            tone="violet"
            period={svcPeriod}
            onPeriod={setSvcPeriod}
            range={svcRange}
            onRange={setSvcRange}
            value={svcFig.services.toLocaleString("en-IN")}
            caption="transactions processed"
          />
          <FilterMetricCard
            title="Commission"
            icon={<Coins className="h-5 w-5" />}
            tone="green"
            period={commPeriod}
            onPeriod={setCommPeriod}
            range={commRange}
            onRange={setCommRange}
            value={inr(commFig.commission)}
            caption="commission earned"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Retailer Revenue</p>
              <div className="h-9 w-9 rounded-xl bg-orange-500 text-white flex items-center justify-center"><IndianRupee className="h-5 w-5" /></div>
            </div>
            <p className="font-display text-2xl font-extrabold mt-2">{inr(periods.Monthly.retailerRevenue)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Total this month across shops</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Distributor Revenue</p>
              <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center"><BadgeIndianRupee className="h-5 w-5" /></div>
            </div>
            <p className="font-display text-2xl font-extrabold mt-2">{inr(periods.Monthly.distributorRevenue)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Your margin this month</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Active vs Inactive Shops</p>
            <div className="flex items-center justify-between text-sm font-bold">
              <span className="text-emerald-600">{rc.active} Active</span>
              <span className="text-rose-500">{rc.inactive} Inactive</span>
            </div>
            <div className="mt-2 h-3 w-full rounded-full bg-rose-100 overflow-hidden flex">
              <div className="h-full bg-emerald-500" style={{ width: `${rc.activePct}%` }} />
              <div className="h-full bg-rose-400" style={{ width: `${rc.inactivePct}%` }} />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px] font-semibold">
              <span className="text-emerald-600">{rc.activePct}%</span>
              <span className="text-rose-500">{rc.inactivePct}%</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4 shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold">Daily Services & Commission</h3>
                <p className="text-[11px] text-muted-foreground">Network volume over the last 7 days</p>
              </div>
              <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5">Last 7 days</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer>
                <AreaChart data={WEEKLY}>
                  <defs>
                    <linearGradient id="dsvc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={HEX} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={HEX} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="services" stroke={HEX} fill="url(#dsvc)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <h3 className="text-sm font-bold mb-1">Service Mix</h3>
            <p className="text-[11px] text-muted-foreground mb-2">Today by service type</p>
            <div className="h-52">
              <ResponsiveContainer>
                <RePieChart>
                  <Pie data={mix} dataKey="count" nameKey="key" innerRadius={48} outerRadius={78} paddingAngle={2}>
                    {mix.map((m) => <Cell key={m.key} fill={m.color} />)}
                  </Pie>
                  <Tooltip />
                </RePieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-1.5 mt-2">
              {mix.map((m) => (
                <div key={m.key} className="flex items-center gap-1.5 text-[11px]">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: m.color }} />
                  <span className="font-semibold text-slate-700">{m.key}</span>
                  <span className="ml-auto font-bold">{m.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4" style={{ color: HEX }} /> Top Retailers by Volume</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={top} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip />
                  <Bar dataKey="count" fill={HEX} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4" style={{ color: HEX }} /> Monthly Commission Trend</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={MONTHLY}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip formatter={(v: number) => inr(v)} />
                  <Bar dataKey="commission" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </DistributorShell>
  );
}

/* ---------------- Sales Dashboard ---------------- */
export function DistributorSalesDashboard() {
  return (
    <DistributorShell>
      <div className="space-y-5">
        {/* Hero header */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white flex items-center justify-center shadow-md">
              <Network className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-xl lg:text-2xl font-extrabold tracking-tight text-slate-900">Distributor Sales Dashboard</h1>
              <p className="text-xs lg:text-sm text-slate-500">Overview of your business performance</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 h-9 text-xs font-semibold text-slate-700 shadow-soft">
              <CalendarDays className="h-4 w-4 text-slate-500" /> 01 Jun 2026 - 30 Jun 2026
            </span>
            <button
              onClick={() => toast.success("Report download started")}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 h-9 text-xs font-semibold text-white shadow-elev hover:bg-slate-800"
            >
              <Download className="h-4 w-4" /> Download Report
            </button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {KPIS.map((k) => (
            <div key={k.label} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
              <div className={`absolute left-0 top-0 h-full w-1 bg-gradient-to-b ${k.bar}`} />
              <div className="flex items-start justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{k.label}</p>
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${k.ring}`}>{k.icon}</div>
              </div>
              <p className="mt-2 font-display text-2xl font-extrabold text-slate-900">{k.value}</p>
              <div className={`mt-1 inline-flex items-center gap-1 text-[11px] font-bold ${k.up ? "text-emerald-600" : "text-rose-600"}`}>
                {k.up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                {k.delta} <span className="font-medium text-slate-400">vs May 2026</span>
              </div>
            </div>
          ))}
        </div>

        {/* Service performance + Volume trend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="Service Wise Performance">
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-slate-500 bg-slate-50">
                    <th className="text-left font-bold px-2 py-2 rounded-l-lg">Service Category</th>
                    <th className="text-right font-bold px-2 py-2">Transactions</th>
                    <th className="text-right font-bold px-2 py-2">Revenue (\u20B9)</th>
                    <th className="text-right font-bold px-2 py-2">Commission (\u20B9)</th>
                    <th className="text-right font-bold px-2 py-2 rounded-r-lg">Growth</th>
                  </tr>
                </thead>
                <tbody>
                  {SERVICE_PERF.map((r) => (
                    <tr key={r.name} className="border-b border-slate-100 hover:bg-slate-50/60">
                      <td className="px-2 py-2 font-semibold text-slate-700">{r.name}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-slate-700">{r.txns.toLocaleString("en-IN")}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-slate-700">{r.revenue.toLocaleString("en-IN")}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-slate-700">{r.commission.toLocaleString("en-IN")}</td>
                      <td className={`px-2 py-2 text-right font-bold tabular-nums ${r.up ? "text-emerald-600" : "text-rose-600"}`}>
                        <span className="inline-flex items-center gap-0.5 justify-end">
                          {r.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {Math.abs(r.growth)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-extrabold text-slate-900">
                    <td className="px-2 py-2.5 rounded-l-lg">Total</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">8,510</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">43,16,500</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">96,330</td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-emerald-600 rounded-r-lg">15.3%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Business Volume Trend">
            <div className="h-72">
              <ResponsiveContainer>
                <AreaChart data={VOLUME_TREND} margin={{ left: -10, right: 8, top: 4 }}>
                  <defs>
                    <linearGradient id="vol" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={HEX} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={HEX} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                  <XAxis dataKey="d" tick={{ fontSize: 10, fill: "#94a3b8" }} interval={2} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => `${v}L`} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => [`\u20B9${v}L`, "Volume"]} />
                  <Area type="monotone" dataKey="v" stroke={HEX} fill="url(#vol)" strokeWidth={2.5} dot={{ r: 2.5, fill: HEX }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-1 flex items-center justify-center gap-2 text-[11px] font-semibold text-slate-500">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: HEX }} /> Business Volume (\u20B9)
            </div>
          </Card>
        </div>

        {/* Service contribution */}
        <Card title="Service Contribution (by Revenue)">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div className="relative h-60">
              <ResponsiveContainer>
                <RePieChart>
                  <Pie data={CONTRIBUTION} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={2}>
                    {CONTRIBUTION.map((c) => <Cell key={c.name} fill={c.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v}%`} />
                </RePieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="font-display text-lg font-extrabold text-slate-900">{inrFull(4316500)}</p>
                <p className="text-[10px] uppercase tracking-wide text-slate-400">Total</p>
              </div>
            </div>
            <ul className="space-y-2.5">
              {CONTRIBUTION.map((c) => (
                <li key={c.name} className="flex items-center gap-2 text-sm">
                  <span className="h-3 w-3 rounded-sm" style={{ background: c.color }} />
                  <span className="font-medium text-slate-600 flex-1">{c.name}</span>
                  <span className="font-bold text-slate-900 tabular-nums">{c.value}%</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        {/* Bottom row: top retailers / summary / districts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card title="Top 5 Retailers by Revenue">
            <ul className="divide-y divide-slate-100">
              {TOP5.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2.5">
                  <span className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-xs font-extrabold ${
                    r.rank === 1 ? "bg-amber-100 text-amber-700" : r.rank === 2 ? "bg-slate-200 text-slate-600" : r.rank === 3 ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-500"
                  }`}>{r.rank}</span>
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="text-sm font-semibold text-slate-800 truncate">{r.name}</p>
                    <p className="text-[11px] text-slate-400">{r.id}</p>
                  </div>
                  <span className="text-sm font-bold text-slate-900 tabular-nums">{inrFull(r.revenue)}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Retailer Summary">
            <div className="relative h-44">
              <ResponsiveContainer>
                <RePieChart>
                  <Pie data={SUMMARY} dataKey="value" nameKey="name" innerRadius={50} outerRadius={72} paddingAngle={2}>
                    {SUMMARY.map((c) => <Cell key={c.name} fill={c.color} />)}
                  </Pie>
                  <Tooltip />
                </RePieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="font-display text-2xl font-extrabold text-slate-900">143</p>
                <p className="text-[10px] uppercase tracking-wide text-slate-400">Total Retailers</p>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="h-3 w-3 rounded-sm bg-emerald-500" />
                <span className="text-slate-600 flex-1">Active Retailers</span>
                <span className="font-bold text-slate-900">125 <span className="text-[11px] font-medium text-slate-400">(87.4%)</span></span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="h-3 w-3 rounded-sm bg-rose-500" />
                <span className="text-slate-600 flex-1">Inactive Retailers</span>
                <span className="font-bold text-slate-900">18 <span className="text-[11px] font-medium text-slate-400">(12.6%)</span></span>
              </div>
            </div>
          </Card>

          <Card title="Top Districts by Business Volume" action={<button className="text-[11px] font-semibold text-sky-600 hover:underline">View All</button>}>
            <div className="h-56">
              <ResponsiveContainer>
                <BarChart data={DISTRICTS} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eef2f7" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => `${v / 100000}L`} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#475569" }} width={92} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => inrFull(v)} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={14}>
                    {DISTRICTS.map((d, i) => <Cell key={d.name} fill={i === DISTRICTS.length - 1 ? "#94a3b8" : "#3b82f6"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    </DistributorShell>
  );
}

/* ---------------- Network Map ---------------- */
export function DistributorNetwork() {
  const dro = OFFICERS.find((o) => o.role === "DRO") ?? OFFICERS[0];
  const ds = officerSummary(dro.id);
  const tros = OFFICERS.filter((o) => o.parentId === dro.id);
  const distCommission = Math.round(ds.commission * DISTRIBUTOR_MARGIN);

  return (
    <DistributorShell>
      <div className="space-y-6">
        <PageHeader
          icon={<Network className="h-5 w-5" />}
          title="Network Map"
          subtitle="Your DRO → TRO → Retailer hierarchy with distributor commission."
        />

        {/* Hero DRO card */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-slate-900 via-slate-800 to-rose-900 text-white shadow-elev">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-rose-500/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-sky-500/20 blur-3xl" />
          <div className="relative p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-600 flex items-center justify-center text-2xl font-black shadow-lg ring-2 ring-white/20">
                  {dro.name[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xl font-extrabold">{dro.name}</p>
                    <span className="text-[10px] font-bold bg-white/15 px-2 py-0.5 rounded-full uppercase tracking-wide">DRO</span>
                  </div>
                  <p className="text-sm text-white/70 flex items-center gap-1.5 mt-0.5"><Building2 className="h-3.5 w-3.5" />{dro.scope}</p>
                  <p className="text-xs text-white/50 mt-0.5">{dro.phone}</p>
                </div>
              </div>
              <div className="rounded-2xl bg-white/10 backdrop-blur px-5 py-3 text-right ring-1 ring-white/15">
                <p className="text-[11px] uppercase tracking-wider text-white/60 flex items-center gap-1 justify-end"><Coins className="h-3.5 w-3.5" /> Distributor Commission</p>
                <p className="text-3xl font-black text-emerald-300 mt-1">{inr(distCommission)}</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-white/10 px-4 py-3 text-center ring-1 ring-white/10">
                <p className="text-2xl font-extrabold">{tros.length}</p>
                <p className="text-[10px] uppercase tracking-wider text-white/60">TROs</p>
              </div>
              <div className="rounded-xl bg-white/10 px-4 py-3 text-center ring-1 ring-white/10">
                <p className="text-2xl font-extrabold">{ds.retailers}</p>
                <p className="text-[10px] uppercase tracking-wider text-white/60">Retailers</p>
              </div>
              <div className="rounded-xl bg-white/10 px-4 py-3 text-center ring-1 ring-white/10">
                <p className="text-2xl font-extrabold">{ds.services}</p>
                <p className="text-[10px] uppercase tracking-wider text-white/60">Services</p>
              </div>
            </div>
          </div>
        </div>

        {/* TRO cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tros.map((tro) => {
            const ts = officerSummary(tro.id);
            const rets = RETAILERS.filter((r) => r.troId === tro.id);
            const troDistComm = Math.round(ts.commission * DISTRIBUTOR_MARGIN);
            return (
              <div key={tro.id} className="rounded-xl border border-border bg-card shadow-soft overflow-hidden hover:shadow-elev transition-shadow">
                <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-amber-50 to-white px-4 py-3 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center text-sm font-extrabold">{tro.name[0]}</div>
                    <div>
                      <p className="text-sm font-bold flex items-center gap-1.5">{tro.name}
                        <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1 py-0.5 rounded uppercase">TRO</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1"><MapPinned className="h-2.5 w-2.5" />{tro.scope}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Dist. Commission</p>
                    <p className="text-sm font-extrabold text-emerald-700">{inr(troDistComm)}</p>
                  </div>
                </div>
                <ul className="p-3 space-y-1.5">
                  {rets.map((r) => (
                    <li key={r.id} className="flex items-center gap-2 text-[11px] rounded-lg bg-muted/30 px-2.5 py-1.5 border border-border">
                      <span className={`h-1.5 w-1.5 rounded-full ${r.active ? "bg-emerald-500" : "bg-slate-300"}`} />
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      <span className="font-semibold truncate flex-1">{r.name}</span>
                      <span className="text-emerald-700 font-semibold">{inr(Math.round(retailerCommission(r) * DISTRIBUTOR_MARGIN))}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </DistributorShell>
  );
}

/* ---------------- Retailers ---------------- */
export function DistributorRetailers() {
  const [query, setQuery] = useState("");
  const [dro, setDro] = useState("all");
  const [onlyActive, setOnlyActive] = useState(false);
  const navigate = useNavigate();
  const dros = OFFICERS.filter((o) => o.role === "DRO");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return RETAILERS.filter((r) => {
      if (dro !== "all" && r.droId !== dro) return false;
      if (onlyActive && !r.active) return false;
      if (!q) return true;
      return [r.name, r.shop, r.phone, r.id, r.taluk].some((v) => v.toLowerCase().includes(q));
    });
  }, [query, dro, onlyActive]);

  const oname = (id: string) => OFFICERS.find((o) => o.id === id)?.name ?? "—";

  return (
    <DistributorShell>
      <div className="space-y-5">
        <PageHeader
          icon={<Users className="h-5 w-5" />}
          title="Retailers"
          subtitle="Every retailer mapped under your DRO/TRO officers with daily activity."
          actions={
            <button
              onClick={() => { exportRetailersCsv(filtered, "distributor-retailers.csv"); toast.success("CSV exported"); }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 text-white px-4 h-9 text-sm font-semibold shadow-elev hover:bg-slate-800"
            >
              <Download className="h-4 w-4" /> Export CSV
            </button>
          }
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 h-9 flex-1 min-w-[220px]">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, shop, phone…" className="bg-transparent flex-1 text-sm outline-none" />
          </div>
          <select value={dro} onChange={(e) => setDro(e.target.value)} className="h-9 rounded-lg border border-border bg-white px-3 text-sm font-medium">
            <option value="all">All DROs</option>
            {dros.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <button
            onClick={() => setOnlyActive((v) => !v)}
            className={`h-9 rounded-lg border px-3 text-sm font-semibold ${onlyActive ? "bg-emerald-600 text-white border-emerald-600" : "bg-white border-border text-slate-700"}`}
          >
            Active only
          </button>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th rowSpan={2} className="text-left px-3 py-2.5 font-bold">Sl.No</th>
                  <th rowSpan={2} className="text-left px-3 py-2.5 font-bold">Retailer ID</th>
                  <th rowSpan={2} className="text-left px-3 py-2.5 font-bold">Name</th>
                  <th rowSpan={2} className="text-left px-3 py-2.5 font-bold">Mobile No</th>
                  <th rowSpan={2} className="text-left px-3 py-2.5 font-bold">District</th>
                  <th rowSpan={2} className="text-left px-3 py-2.5 font-bold">Taluk</th>
                  <th rowSpan={2} className="text-left px-3 py-2.5 font-bold">GP / Ward / Locality</th>
                  <th rowSpan={2} className="text-right px-3 py-2.5 font-bold">Services</th>
                  <th rowSpan={2} className="text-right px-3 py-2.5 font-bold">Total Txns</th>
                  <th colSpan={4} className="text-center px-3 py-2 font-bold border-l border-border bg-emerald-50/60 text-emerald-800">Total Commission</th>
                </tr>
                <tr>
                  <th className="text-right px-3 py-2 font-bold border-l border-border bg-emerald-50/40">Gross</th>
                  <th className="text-right px-3 py-2 font-bold bg-emerald-50/40">TDS</th>
                  <th className="text-right px-3 py-2 font-bold bg-emerald-50/40">GST</th>
                  <th className="text-right px-3 py-2 font-bold bg-emerald-50/40 text-emerald-800">Payable</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const cb = commissionBreakdown(r);
                  return (
                    <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-3 py-2.5 tabular-nums text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2.5 font-mono text-[11px]">{r.id}</td>
                      <td className="px-3 py-2.5">
                        <button
                          onClick={() => navigate({ to: "/distributor/retailers/$id", params: { id: r.id } })}
                          className="flex items-center gap-2 text-left group"
                        >
                          <span className={`h-2 w-2 shrink-0 rounded-full ${r.active ? "bg-emerald-500" : "bg-slate-300"}`} />
                          <span className="leading-tight">
                            <span className="block font-semibold text-sky-700 group-hover:underline">{r.name}</span>
                            <span className="block text-[11px] text-muted-foreground">{r.shop}</span>
                          </span>
                        </button>
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">{r.phone}</td>
                      <td className="px-3 py-2.5">{r.district}</td>
                      <td className="px-3 py-2.5">{r.taluk}</td>
                      <td className="px-3 py-2.5">{retailerLocality(r)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{servicesUsed(r)}</td>
                      <td className="px-3 py-2.5 text-right font-bold tabular-nums">{serviceTotal(r)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums border-l border-border">{inr(cb.gross)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-rose-600">-{inr(cb.tds)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-rose-600">-{inr(cb.gst)}</td>
                      <td className="px-3 py-2.5 text-right font-bold tabular-nums text-emerald-700">{inr(cb.payable)}</td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={13} className="px-4 py-8 text-center text-sm text-muted-foreground">No retailers match your filters.</td></tr>
                )}
              </tbody>
              {filtered.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/40 font-bold">
                    <td colSpan={8} className="px-3 py-2.5">Total ({filtered.length})</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{filtered.reduce((a, r) => a + serviceTotal(r), 0)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums border-l border-border">{inr(filtered.reduce((a, r) => a + commissionBreakdown(r).gross, 0))}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-rose-600">-{inr(filtered.reduce((a, r) => a + commissionBreakdown(r).tds, 0))}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-rose-600">-{inr(filtered.reduce((a, r) => a + commissionBreakdown(r).gst, 0))}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700">{inr(filtered.reduce((a, r) => a + commissionBreakdown(r).payable, 0))}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </DistributorShell>
  );
}

/* ---------------- Services Live ---------------- */
export function DistributorServices() {
  const navigate = useNavigate();
  const mix = useMemo(() => aggregateServices(RETAILERS), []);
  const total = mix.reduce((sum, m) => sum + m.count, 0);
  const activeRetailers = RETAILERS.filter((r) => r.active).length;
  const liveServices = mix.filter((m) => m.count > 0).length;

  return (
    <DistributorShell>
      <div className="space-y-6">
        <PageHeader
          icon={<Layers className="h-5 w-5" />}
          title="Services Live"
          subtitle="Daily / weekly / monthly service activity across the network."
          badge={
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> {liveServices} live now
            </span>
          }
        />

        <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-bold">Live Service List</h3>
            <span className="text-[11px] font-semibold text-muted-foreground">{activeRetailers} active retailers</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2.5 font-bold">Service</th>
                  <th className="text-left px-3 py-2.5 font-bold">Status</th>
                  <th className="text-right px-3 py-2.5 font-bold">Today</th>
                  <th className="text-right px-3 py-2.5 font-bold">Share</th>
                  <th className="text-right px-3 py-2.5 font-bold">Rate</th>
                  <th className="text-right px-4 py-2.5 font-bold">Commission</th>
                </tr>
              </thead>
              <tbody>
                {mix.map((m) => {
                  const live = m.count > 0;
                  return (
                    <tr key={m.key} className="border-t border-border hover:bg-muted/30 cursor-pointer" onClick={() => navigate({ to: "/distributor/services/$key", params: { key: m.key } })}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: m.color }} />
                          <div className="leading-tight">
                            <p className="font-semibold">{m.label}</p>
                            <p className="text-[11px] text-muted-foreground">{m.key}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${live ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                          {live ? "Live" : "Idle"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold tabular-nums">{m.count}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{total ? Math.round((m.count / total) * 100) : 0}%</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{inr(m.rate)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-emerald-700">{inr(m.commission)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {mix.map((m) => (
            <div key={m.key} onClick={() => navigate({ to: "/distributor/services/$key", params: { key: m.key } })} className="rounded-xl border border-border bg-card p-4 shadow-soft cursor-pointer hover:shadow-elev transition-shadow">
              <span className="h-2.5 w-2.5 rounded-sm inline-block" style={{ background: m.color }} />
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mt-1">{m.key}</p>
              <p className="font-display text-2xl font-extrabold mt-1">{m.count}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{total ? Math.round((m.count / total) * 100) : 0}% · {inr(m.commission)}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <h3 className="text-sm font-bold mb-3">Service Counts (Today)</h3>
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={mix}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="key" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {mix.map((m) => <Cell key={m.key} fill={m.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold">Weekly Services & Revenue</h3>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">Last 7 days</span>
            </div>
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={WEEKLY}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="l" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 12 }} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="l" dataKey="services" fill={HEX} radius={[6, 6, 0, 0]} />
                  <Bar yAxisId="r" dataKey="revenue" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
          <h3 className="text-sm font-bold mb-3">Monthly Service Volume</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={MONTHLY}>
                <defs>
                  <linearGradient id="msvc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={HEX} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={HEX} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip />
                <Area type="monotone" dataKey="services" stroke={HEX} fill="url(#msvc)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </DistributorShell>
  );
}

/* ---------------- Commissions ---------------- */
export function DistributorCommissions() {
  const mix = useMemo(() => aggregateServices(RETAILERS), []);
  const totalComm = mix.reduce((sum, m) => sum + m.commission, 0);
  const ranked = useMemo(
    () => [...RETAILERS].map((r) => ({ r, comm: retailerCommission(r) })).sort((a, b) => b.comm - a.comm),
    [],
  );
  const oname = (id: string) => OFFICERS.find((o) => o.id === id)?.name ?? "—";
  const monthComm = MONTHLY.reduce((s, m) => s + m.commission, 0);

  return (
    <DistributorShell>
      <div className="space-y-6">
        <PageHeader
          icon={<Coins className="h-5 w-5" />}
          title="Commissions"
          subtitle="Commission earned across services and retailers in your network."
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Commission Today" value={inr(totalComm)} delta={{ value: "all services", positive: true }} icon={<Coins className="h-5 w-5" />} tone="green" />
          <StatCard label="This Month" value={inr(MONTHLY[MONTHLY.length - 1].commission)} delta={{ value: "+6.1% MoM", positive: true }} icon={<TrendingUp className="h-5 w-5" />} tone="sky" />
          <StatCard label="6-Month Total" value={inr(monthComm)} icon={<IndianRupee className="h-5 w-5" />} tone="violet" />
          <StatCard label="Top Service" value={[...mix].sort((a, b) => b.commission - a.commission)[0].key} delta={{ value: "by commission", positive: true }} icon={<Layers className="h-5 w-5" />} tone="saffron" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <h3 className="text-sm font-bold mb-3">Commission by Service</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={mix}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="key" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip formatter={(v: number) => inr(v)} />
                  <Bar dataKey="commission" radius={[6, 6, 0, 0]}>
                    {mix.map((m) => <Cell key={m.key} fill={m.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <h3 className="text-sm font-bold mb-3">Monthly Commission</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <AreaChart data={MONTHLY}>
                  <defs>
                    <linearGradient id="mcomm" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip formatter={(v: number) => inr(v)} />
                  <Area type="monotone" dataKey="commission" stroke="#10b981" fill="url(#mcomm)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
          <div className="px-4 py-3 border-b border-border"><h3 className="text-sm font-bold">Commission by Retailer</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2.5 font-bold">Retailer</th>
                  <th className="text-left px-3 py-2.5 font-bold">TRO</th>
                  <th className="text-right px-3 py-2.5 font-bold">Services</th>
                  <th className="text-right px-4 py-2.5 font-bold">Commission</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map(({ r, comm }) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-2.5">
                      <p className="font-semibold">{r.name}</p>
                      <p className="text-[11px] text-muted-foreground">{r.shop}</p>
                    </td>
                    <td className="px-3 py-2.5 text-xs">{oname(r.troId)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{serviceTotal(r)}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-emerald-700">{inr(comm)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DistributorShell>
  );
}
