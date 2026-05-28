import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend, BarChart, Bar, CartesianGrid,
} from "recharts";
import {
  ClipboardCheck, ShieldCheck, AlertTriangle, Clock, ArrowUpRight, ArrowRight, TrendingUp, FileCheck2, UserCheck, Gauge,
} from "lucide-react";
import { QcShell } from "@/components/qc/qc-shell";
import { PageHeader, StatusBadge } from "@/components/retailer/page-header";
import { StatCard } from "@/components/retailer/stat-card";
import { QC_APPLICANTS, QC_WEEKLY, QC_RISK_SPLIT } from "@/components/qc/mock-data";

export const Route = createFileRoute("/qc/dashboard")({
  head: () => ({
    meta: [
      { title: "QC Dashboard — BharatOne" },
      { name: "description", content: "Quality Control reviewer dashboard for KYC approvals." },
    ],
  }),
  component: QcDashboardPage,
});

function QcDashboardPage() {
  const pending = QC_APPLICANTS.filter((a) => a.status === "Pending Review" || a.status === "In Review").length;
  const approved = QC_APPLICANTS.filter((a) => a.status === "Approved").length;
  const rejected = QC_APPLICANTS.filter((a) => a.status === "Rejected").length;

  return (
    <QcShell>
      <div className="space-y-6">
        <PageHeader
          icon={<ClipboardCheck className="h-5 w-5" />}
          title="Quality Control"
          subtitle="Review KYC submissions, verify documents and approve onboarding."
          badge={
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 px-2.5 py-0.5 text-[11px] font-bold">
              <ShieldCheck className="h-3 w-3" /> QC · Level 2
            </span>
          }
          actions={
            <Link
              to="/qc/kyc-queue"
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 text-white px-4 h-9 text-sm font-semibold shadow-elev hover:bg-indigo-700"
            >
              Open Review Queue <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Pending Review" value={String(pending)} delta={{ value: "+12% today", positive: true }} icon={<Clock className="h-5 w-5" />} tone="violet" />
          <StatCard label="Approved Today" value="48" delta={{ value: "+8% vs yesterday", positive: true }} icon={<UserCheck className="h-5 w-5" />} tone="green" />
          <StatCard label="Rejected Today" value="6" delta={{ value: "-3% vs yesterday", positive: false }} icon={<AlertTriangle className="h-5 w-5" />} tone="rose" />
          <StatCard label="Avg. TAT" value="4m 28s" delta={{ value: "-22s improvement", positive: true }} icon={<Gauge className="h-5 w-5" />} tone="sky" />
        </div>

        {/* SLA strip */}
        <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-emerald-50 p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-indigo-700">
            <TrendingUp className="h-5 w-5" />
            <span className="text-sm font-bold">SLA Health</span>
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="h-2 w-full rounded-full bg-white border border-border overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600" style={{ width: "92%" }} />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">92% of cases reviewed within 10 minute SLA</p>
          </div>
          <div className="flex gap-4 text-xs">
            <div><p className="text-muted-foreground">Within SLA</p><p className="font-bold text-emerald-700">412</p></div>
            <div><p className="text-muted-foreground">Breached</p><p className="font-bold text-rose-700">36</p></div>
            <div><p className="text-muted-foreground">Auto-approved</p><p className="font-bold text-indigo-700">128</p></div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4 shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold">Weekly Review Throughput</h3>
                <p className="text-[11px] text-muted-foreground">Approved · Rejected · Pending per day</p>
              </div>
              <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full px-2 py-0.5">Last 7 days</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={QC_WEEKLY}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="approved" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="pending" stackId="a" fill="#6366f1" />
                  <Bar dataKey="rejected" stackId="a" fill="#ef4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold">Risk Distribution</h3>
                <p className="text-[11px] text-muted-foreground">Current open applications</p>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={QC_RISK_SPLIT} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                    {QC_RISK_SPLIT.map((e) => <Cell key={e.name} fill={e.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent queue */}
        <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
          <div className="p-4 flex items-center justify-between border-b border-border">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2"><FileCheck2 className="h-4 w-4 text-indigo-600" /> Latest Submissions</h3>
              <p className="text-[11px] text-muted-foreground">Top 5 most recent KYC applications awaiting QC</p>
            </div>
            <Link to="/qc/kyc-queue" className="text-xs font-semibold text-indigo-700 hover:underline inline-flex items-center gap-1">
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2.5 font-bold">KYC ID</th>
                  <th className="text-left px-4 py-2.5 font-bold">Applicant</th>
                  <th className="text-left px-4 py-2.5 font-bold">Channel</th>
                  <th className="text-left px-4 py-2.5 font-bold">Match</th>
                  <th className="text-left px-4 py-2.5 font-bold">Risk</th>
                  <th className="text-left px-4 py-2.5 font-bold">Status</th>
                  <th className="text-right px-4 py-2.5 font-bold">Action</th>
                </tr>
              </thead>
              <tbody>
                {QC_APPLICANTS.slice(0, 5).map((a) => (
                  <tr key={a.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-mono text-xs">{a.id}</td>
                    <td className="px-4 py-2.5">
                      <p className="font-semibold">{a.name}</p>
                      <p className="text-[11px] text-muted-foreground">{a.city}, {a.state}</p>
                    </td>
                    <td className="px-4 py-2.5 text-xs">{a.channel}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full ${a.matchScore > 90 ? "bg-emerald-500" : a.matchScore > 75 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${a.matchScore}%` }} />
                        </div>
                        <span className="text-xs font-semibold">{a.matchScore}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5"><StatusBadge status={a.risk} /></td>
                    <td className="px-4 py-2.5"><StatusBadge status={a.status === "Pending Review" ? "pending" : a.status} /></td>
                    <td className="px-4 py-2.5 text-right">
                      <Link to="/qc/kyc-review/$id" params={{ id: a.id }} className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 hover:underline">
                        Review <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </QcShell>
  );
}