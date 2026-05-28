import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, TrendingUp, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid } from "recharts";
import { QcShell } from "@/components/qc/qc-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { QC_WEEKLY, QC_RISK_SPLIT } from "@/components/qc/mock-data";

export const Route = createFileRoute("/qc/reports")({
  head: () => ({ meta: [{ title: "Reports — QC Portal" }] }),
  component: ReportsPage,
});

const TAT_TREND = [
  { week: "W1", tat: 3.2 },
  { week: "W2", tat: 2.9 },
  { week: "W3", tat: 2.6 },
  { week: "W4", tat: 2.4 },
  { week: "W5", tat: 2.1 },
  { week: "W6", tat: 2.3 },
];

function ReportsPage() {
  return (
    <QcShell>
      <div className="space-y-5">
        <PageHeader
          icon={<BarChart3 className="h-5 w-5" />}
          title="QC Reports & Analytics"
          subtitle="Throughput, risk distribution and reviewer SLA insights."
          actions={
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 h-9 text-xs font-semibold hover:bg-muted">
              <Download className="h-4 w-4" /> Export Report
            </button>
          }
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPI label="Total Reviewed" value="421" sub="this month" accent="text-indigo-700" />
          <KPI label="Approval Rate" value="86.4%" sub="+2.1% vs last" accent="text-emerald-700" />
          <KPI label="Avg TAT" value="2.3 hrs" sub="-0.3 hrs" accent="text-amber-700" />
          <KPI label="SLA Compliance" value="94.8%" sub="target 95%" accent="text-slate-700" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4 shadow-soft">
            <p className="text-sm font-bold mb-3">Weekly Throughput</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={QC_WEEKLY}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="approved" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="rejected" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pending" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <p className="text-sm font-bold mb-3">Risk Distribution</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={QC_RISK_SPLIT} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {QC_RISK_SPLIT.map((e) => (
                      <Cell key={e.name} fill={e.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold">TAT Trend (last 6 weeks)</p>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><TrendingUp className="h-3.5 w-3.5" /> Improving</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={TAT_TREND}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit="h" />
                <Tooltip />
                <Line type="monotone" dataKey="tat" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </QcShell>
  );
}

function KPI({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
      <p className="text-[11px] uppercase font-bold text-muted-foreground tracking-wider">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold ${accent}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}