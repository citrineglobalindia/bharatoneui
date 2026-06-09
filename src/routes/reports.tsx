import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, LineChart, Line,
  CartesianGrid, AreaChart, Area, PieChart, Pie, Cell, Legend,
  RadialBarChart, RadialBar,
} from "recharts";
import {
  BarChart3, Download, TrendingUp, Wallet, Receipt, Layers, Percent, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { StatCard } from "@/components/retailer/stat-card";
import { SectionCard, GhostButton } from "@/components/retailer/section-card";
import {
  WEEKLY_VOLUME, MONTHLY_VOLUME, SERVICE_REPORT, COMMISSION_SPLIT, PERIOD_MULTIPLIER, inr,
} from "@/components/retailer/mock-data";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports & Analytics — BharatOne" }] }),
  component: ReportsPage,
});

const PERIODS = ["Daily", "Weekly", "Monthly"] as const;
type Period = (typeof PERIODS)[number];

function ReportsPage() {
  const [period, setPeriod] = useState<Period>("Monthly");
  const m = PERIOD_MULTIPLIER[period];

  const services = useMemo(
    () =>
      SERVICE_REPORT.map((s) => {
        const txns = Math.round(s.txns * m);
        const volume = Math.round(s.volume * m);
        const commission = Math.round(volume * (s.rate / 100));
        return { ...s, txns, volume, commission };
      }),
    [m],
  );

  const totals = useMemo(() => {
    const volume = services.reduce((a, s) => a + s.volume, 0);
    const txns = services.reduce((a, s) => a + s.txns, 0);
    const commission = services.reduce((a, s) => a + s.commission, 0);
    return { volume, txns, commission };
  }, [services]);

  const pending = Math.round(totals.commission * 0.14);
  const settlementRate = Math.round(((totals.commission - pending) / Math.max(totals.commission, 1)) * 100);

  return (
    <RetailerShell>
      <div className="space-y-5">
        <PageHeader
          icon={<BarChart3 className="h-5 w-5" />}
          title="Reports & Analytics"
          subtitle="Track business performance, commissions and settlement summaries"
          actions={
            <GhostButton onClick={() => toast.success("Report export started")}>
              <Download className="h-3.5 w-3.5" /> Download PDF
            </GhostButton>
          }
        />

        {/* Period filter */}
        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1 w-fit shadow-soft">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${
                period === p ? "bg-orange-500 text-white shadow-soft" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label={`${period} Volume`} value={inr(totals.volume)} icon={<TrendingUp className="h-5 w-5" />} tone="saffron" delta={{ value: "+34.2%", positive: true }} />
          <StatCard label={`${period} Commission`} value={inr(totals.commission)} icon={<Receipt className="h-5 w-5" />} tone="green" delta={{ value: "+27.9%", positive: true }} />
          <StatCard label={`${period} Txns`} value={totals.txns.toLocaleString("en-IN")} icon={<Layers className="h-5 w-5" />} tone="sky" delta={{ value: "+12.4%", positive: true }} />
          <StatCard label="Settlement Pending" value={inr(pending)} icon={<Wallet className="h-5 w-5" />} tone="violet" delta={{ value: `${settlementRate}% cleared`, positive: true }} />
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <SectionCard title="Daily Transaction Volume" description="Last 7 days">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={WEEKLY_VOLUME}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} className="text-xs" />
                  <YAxis tickLine={false} axisLine={false} className="text-xs" />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v: number) => inr(v)} />
                  <Bar dataKey="value" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
          <SectionCard title="Transaction Count Trend">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={WEEKLY_VOLUME}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} className="text-xs" />
                  <YAxis tickLine={false} axisLine={false} className="text-xs" />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="txns" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>

        <SectionCard title="6-Month Business Trend" description="Volume vs commission earned">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MONTHLY_VOLUME}>
                <defs>
                  <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="commGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} className="text-xs" />
                <YAxis tickLine={false} axisLine={false} className="text-xs" />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v: number) => inr(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="value" name="Volume" stroke="#f59e0b" strokeWidth={2} fill="url(#volGrad)" />
                <Area type="monotone" dataKey="commission" name="Commission" stroke="#10b981" strokeWidth={2} fill="url(#commGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <div className="grid lg:grid-cols-2 gap-4">
          <SectionCard title="Service-wise Volume Share" description={`${period} contribution`}>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={services} dataKey="volume" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3}>
                    {services.map((s) => (
                      <Cell key={s.name} fill={s.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v: number) => inr(v)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard title="Commission Settlement" description="Earned vs settled vs pending">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart innerRadius="30%" outerRadius="100%" data={COMMISSION_SPLIT} startAngle={90} endAngle={-270}>
                  <RadialBar dataKey="value" cornerRadius={8} background>
                    {COMMISSION_SPLIT.map((c) => (
                      <Cell key={c.name} fill={c.color} />
                    ))}
                  </RadialBar>
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v: number) => inr(v)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>

        {/* Service-wise breakdown table */}
        <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 p-4 pb-3 border-b border-border">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-orange-500" /> Service-wise Commission Breakdown</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">{period} totals · Commission = Volume × Rate</p>
            </div>
            <span className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-1.5 text-[11px] font-mono font-semibold text-slate-700">
              Commission = Σ (Volume × Rate%)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2.5 font-bold">Service</th>
                  <th className="text-right px-3 py-2.5 font-bold">Txns</th>
                  <th className="text-right px-3 py-2.5 font-bold">Volume</th>
                  <th className="text-right px-3 py-2.5 font-bold">Rate</th>
                  <th className="text-right px-4 py-2.5 font-bold">Commission</th>
                  <th className="text-right px-4 py-2.5 font-bold">% Share</th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.name} className="border-t border-border">
                    <td className="px-4 py-2.5 font-semibold">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                        {s.name}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{s.txns.toLocaleString("en-IN")}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{inr(s.volume)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{s.rate}%</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-bold text-emerald-700">{inr(s.commission)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      <span className="inline-flex items-center gap-1 font-semibold">
                        <Percent className="h-3 w-3 text-muted-foreground" />
                        {Math.round((s.commission / Math.max(totals.commission, 1)) * 100)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/40 font-bold">
                  <td className="px-4 py-2.5">Total</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{totals.txns.toLocaleString("en-IN")}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{inr(totals.volume)}</td>
                  <td className="px-3 py-2.5 text-right">—</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-emerald-700">{inr(totals.commission)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">100</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </RetailerShell>
  );
}