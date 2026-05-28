import { createFileRoute } from "@tanstack/react-router";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid } from "recharts";
import { BarChart3, Download, TrendingUp, Wallet, Receipt } from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { StatCard } from "@/components/retailer/stat-card";
import { SectionCard, GhostButton } from "@/components/retailer/section-card";
import { WEEKLY_VOLUME, inr } from "@/components/retailer/mock-data";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — BharatOne" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  return (
    <RetailerShell>
      <div className="space-y-5">
        <PageHeader
          icon={<BarChart3 className="h-5 w-5" />}
          title="Reports & Analytics"
          subtitle="Track business performance, commissions and settlement summaries"
          actions={<GhostButton><Download className="h-3.5 w-3.5" /> Download PDF</GhostButton>}
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="MTD Volume" value={inr(827400)} icon={<TrendingUp className="h-5 w-5" />} tone="saffron" delta={{ value: "+34.2%", positive: true }} />
          <StatCard label="MTD Commission" value={inr(18420)} icon={<Receipt className="h-5 w-5" />} tone="green" delta={{ value: "+27.9%", positive: true }} />
          <StatCard label="Avg Daily Txns" value="29" icon={<BarChart3 className="h-5 w-5" />} tone="sky" />
          <StatCard label="Settlement Pending" value={inr(2640)} icon={<Wallet className="h-5 w-5" />} tone="violet" />
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
      </div>
    </RetailerShell>
  );
}