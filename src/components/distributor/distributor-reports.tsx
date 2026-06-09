import { useMemo, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart as RePieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import {
  FileBarChart, Download, Layers, Coins, TrendingUp, Store, Trophy,
  MapPinned, Percent, CheckCircle2, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { DistributorShell } from "@/components/distributor/distributor-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { StatCard } from "@/components/retailer/stat-card";
import {
  RETAILERS, OFFICERS, SERVICE_META, MONTHLY, inr, serviceTotal,
  retailerCommission, aggregateServices, officerSummary, retailerCounts,
  periodFigures, exportRetailersCsv, DISTRIBUTOR_MARGIN,
} from "@/components/distributor/distributor-data";

const PERIODS = ["Daily", "Weekly", "Monthly"] as const;
type Period = (typeof PERIODS)[number];
const HEX = "#0ea5e9";

export function DistributorReports() {
  const [period, setPeriod] = useState<Period>("Monthly");

  const figures = useMemo(() => periodFigures(RETAILERS), []);
  const fig = figures[period];
  const counts = useMemo(() => retailerCounts(RETAILERS), []);

  // Service-wise: distributor commission only
  const services = useMemo(() => {
    const base = aggregateServices(RETAILERS);
    const scale = fig.services / Math.max(base.reduce((a, s) => a + s.count, 0), 1);
    return base.map((s) => ({
      ...s,
      count: Math.round(s.count * scale),
      distComm: Math.round(s.commission * scale * DISTRIBUTOR_MARGIN),
    }));
  }, [fig]);

  const totalDistComm = services.reduce((a, s) => a + s.distComm, 0);

  // Officer leaderboard (distributor commission only)
  const officerRows = useMemo(
    () =>
      OFFICERS.filter((o) => o.role === "TRO")
        .map((o) => {
          const sum = officerSummary(o.id);
          return {
            id: o.id,
            name: o.name,
            scope: o.scope,
            active: o.active ?? true,
            retailers: sum.retailers,
            services: sum.services,
            distComm: Math.round(sum.commission * DISTRIBUTOR_MARGIN),
          };
        })
        .sort((a, b) => b.distComm - a.distComm),
    [],
  );

  // Taluk-wise breakdown
  const taluks = useMemo(() => {
    const map = new Map<string, { taluk: string; retailers: number; services: number; distComm: number }>();
    for (const r of RETAILERS) {
      const e = map.get(r.taluk) ?? { taluk: r.taluk, retailers: 0, services: 0, distComm: 0 };
      e.retailers += 1;
      e.services += serviceTotal(r);
      e.distComm += Math.round(retailerCommission(r) * DISTRIBUTOR_MARGIN);
      map.set(r.taluk, e);
    }
    return [...map.values()].sort((a, b) => b.distComm - a.distComm);
  }, []);

  const settlement = [
    { name: "Settled", value: Math.round(totalDistComm * 0.82), color: "#10b981" },
    { name: "In Process", value: Math.round(totalDistComm * 0.12), color: "#0ea5e9" },
    { name: "Pending", value: Math.round(totalDistComm * 0.06), color: "#f59e0b" },
  ];

  return (
    <DistributorShell>
      <div className="space-y-6">
        <PageHeader
          icon={<FileBarChart className="h-5 w-5" />}
          title="Reports & Analytics"
          subtitle="Distributor commission, service and network performance reports."
          actions={
            <button
              onClick={() => {
                exportRetailersCsv(RETAILERS, "distributor-report.csv");
                toast.success("Report exported");
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 text-white px-3 h-9 text-sm font-semibold hover:bg-sky-700 transition"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
          }
        />

        {/* Period filter */}
        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1 w-fit shadow-soft">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${
                period === p ? "bg-sky-600 text-white shadow-soft" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label={`${period} Services`} value={fig.services.toLocaleString("en-IN")} icon={<Layers className="h-5 w-5" />} tone="sky" delta={{ value: "+12.4%", positive: true }} />
          <StatCard label="Distributor Commission" value={inr(fig.distributorRevenue)} icon={<Coins className="h-5 w-5" />} tone="green" delta={{ value: "+14.8%", positive: true }} />
          <StatCard label="Retailer Revenue" value={inr(fig.retailerRevenue)} icon={<TrendingUp className="h-5 w-5" />} tone="saffron" delta={{ value: "+15.3%", positive: true }} />
          <StatCard label="Active Shops" value={`${counts.active}/${counts.total}`} icon={<Store className="h-5 w-5" />} tone="violet" delta={{ value: `${counts.activePct}% live`, positive: true }} />
        </div>

        {/* Monthly trend */}
        <div className="rounded-xl border border-border bg-card shadow-soft p-4">
          <h3 className="text-sm font-bold flex items-center gap-2 mb-3"><TrendingUp className="h-4 w-4" style={{ color: HEX }} /> 6-Month Commission Trend (Distributor)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MONTHLY.map((m) => ({ ...m, distComm: Math.round(m.commission * DISTRIBUTOR_MARGIN) }))}>
                <defs>
                  <linearGradient id="dcGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={HEX} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={HEX} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} className="text-xs" />
                <YAxis tickLine={false} axisLine={false} className="text-xs" />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v: number) => inr(v)} />
                <Area type="monotone" dataKey="distComm" name="Distributor Commission" stroke={HEX} strokeWidth={2} fill="url(#dcGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          {/* Service mix */}
          <div className="rounded-xl border border-border bg-card shadow-soft p-4">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-3"><Layers className="h-4 w-4" style={{ color: HEX }} /> Commission by Service</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie data={services} dataKey="distComm" nameKey="label" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3}>
                    {services.map((s) => (
                      <Cell key={s.key} fill={s.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v: number) => inr(v)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Settlement */}
          <div className="rounded-xl border border-border bg-card shadow-soft p-4">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-3"><CheckCircle2 className="h-4 w-4" style={{ color: HEX }} /> Commission Settlement</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={settlement} layout="vertical" margin={{ left: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={false} />
                  <XAxis type="number" tickLine={false} axisLine={false} className="text-xs" tickFormatter={(v: number) => inr(v)} />
                  <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} className="text-xs" width={80} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v: number) => inr(v)} />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                    {settlement.map((s) => (
                      <Cell key={s.name} fill={s.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Service-wise table */}
        <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 p-4 pb-3 border-b border-border">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2"><Coins className="h-4 w-4" style={{ color: HEX }} /> Service-wise Distributor Commission</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">{period} totals · distributor share only</p>
            </div>
            <span className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-1.5 text-[11px] font-mono font-semibold text-slate-700">
              Distributor = Retailer commission × {Math.round(DISTRIBUTOR_MARGIN * 100)}%
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2.5 font-bold">Service</th>
                  <th className="text-right px-3 py-2.5 font-bold">Transactions</th>
                  <th className="text-right px-4 py-2.5 font-bold">Distributor Commission</th>
                  <th className="text-right px-4 py-2.5 font-bold">% Share</th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.key} className="border-t border-border">
                    <td className="px-4 py-2.5 font-semibold">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                        {s.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{s.count.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-bold text-emerald-700">{inr(s.distComm)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      <span className="inline-flex items-center gap-1 font-semibold">
                        <Percent className="h-3 w-3 text-muted-foreground" />
                        {Math.round((s.distComm / Math.max(totalDistComm, 1)) * 100)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/40 font-bold">
                  <td className="px-4 py-2.5">Total</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{services.reduce((a, s) => a + s.count, 0).toLocaleString("en-IN")}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-emerald-700">{inr(totalDistComm)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">100</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          {/* Officer leaderboard */}
          <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
            <div className="p-4 pb-3 border-b border-border">
              <h3 className="text-sm font-bold flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" /> TRO Performance (Distributor Commission)</h3>
            </div>
            <ul className="divide-y divide-border">
              {officerRows.map((o, i) => (
                <li key={o.id} className="flex items-center gap-3 px-4 py-3">
                  <span className={`h-7 w-7 shrink-0 rounded-lg grid place-items-center text-xs font-bold ${i === 0 ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{o.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{o.scope} · {o.retailers} retailers</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-700 tabular-nums">{inr(o.distComm)}</p>
                    <p className="text-[11px] text-muted-foreground">{o.services.toLocaleString("en-IN")} services</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Taluk breakdown */}
          <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
            <div className="p-4 pb-3 border-b border-border">
              <h3 className="text-sm font-bold flex items-center gap-2"><MapPinned className="h-4 w-4" style={{ color: HEX }} /> Taluk-wise Breakdown</h3>
            </div>
            <ul className="divide-y divide-border">
              {taluks.map((t) => (
                <li key={t.taluk} className="flex items-center gap-3 px-4 py-3">
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{t.taluk}</p>
                    <p className="text-[11px] text-muted-foreground">{t.retailers} retailers · {t.services.toLocaleString("en-IN")} services</p>
                  </div>
                  <p className="font-bold text-emerald-700 tabular-nums">{inr(t.distComm)}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </DistributorShell>
  );
}
