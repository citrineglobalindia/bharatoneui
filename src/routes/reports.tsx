import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  AreaChart, Area, PieChart, Pie, Cell, Legend,
} from "recharts";
import { BarChart3, Download, TrendingUp, Wallet, Receipt, Layers, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { StatCard } from "@/components/retailer/stat-card";
import { SectionCard } from "@/components/retailer/section-card";
import { inr } from "@/components/retailer/mock-data";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports & Analytics — BharatOne" }] }),
  component: ReportsPage,
});

const PERIODS = [
  { key: "7d", label: "Last 7 days", days: 7 },
  { key: "30d", label: "Last 30 days", days: 30 },
  { key: "90d", label: "Last 90 days", days: 90 },
  { key: "all", label: "All time", days: 100000 },
] as const;
type PeriodKey = (typeof PERIODS)[number]["key"];

type App = { service_name: string | null; category_name: string | null; service_charge: number | null; commission_price: number | null; status: string; created_at: string };
const PIE_COLORS = ["#f59e0b", "#16a34a", "#0ea5e9", "#8b5cf6", "#ef4444", "#14b8a6", "#6366f1", "#64748b"];
const earned = (s: string) => ["approved", "completed"].includes(s);

function ReportsPage() {
  const [apps, setApps] = useState<App[]>([]);
  const [walletCredit, setWalletCredit] = useState(0);
  const [walletDebit, setWalletDebit] = useState(0);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodKey>("30d");

  useEffect(() => {
    let on = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) { if (on) setLoading(false); return; }
      const [a, wt] = await Promise.all([
        supabase.from("service_applications").select("service_name,category_name,service_charge,commission_price,status,created_at").eq("submitted_by", u.user.id),
        supabase.from("wallet_transactions").select("direction,amount,created_at").eq("user_id", u.user.id),
      ]);
      if (!on) return;
      setApps((a.data as App[]) ?? []);
      const w = (wt.data as any[]) ?? [];
      setWalletCredit(w.filter((x) => x.direction === "credit").reduce((s, x) => s + Number(x.amount || 0), 0));
      setWalletDebit(w.filter((x) => x.direction === "debit").reduce((s, x) => s + Number(x.amount || 0), 0));
      setLoading(false);
    })();
    return () => { on = false; };
  }, []);

  const days = PERIODS.find((p) => p.key === period)!.days;
  const cutoff = useMemo(() => { const d = new Date(); d.setDate(d.getDate() - days); return d; }, [days]);
  const rows = useMemo(() => apps.filter((a) => new Date(a.created_at) >= cutoff), [apps, cutoff]);

  const totals = useMemo(() => ({
    volume: rows.reduce((s, r) => s + Number(r.service_charge || 0), 0),
    commission: rows.filter((r) => earned(r.status)).reduce((s, r) => s + Number(r.commission_price || 0), 0),
    count: rows.length,
    approved: rows.filter((r) => earned(r.status)).length,
  }), [rows]);

  const trend = useMemo(() => {
    const buckets = Math.min(days, 30);
    const arr: { day: string; volume: number; commission: number }[] = [];
    for (let i = buckets - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const same = rows.filter((r) => new Date(r.created_at).toDateString() === d.toDateString());
      arr.push({
        day: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
        volume: same.reduce((s, r) => s + Number(r.service_charge || 0), 0),
        commission: same.filter((r) => earned(r.status)).reduce((s, r) => s + Number(r.commission_price || 0), 0),
      });
    }
    return arr;
  }, [rows, days]);

  const byService = useMemo(() => {
    const m = new Map<string, { volume: number; commission: number; txns: number }>();
    rows.forEach((r) => {
      const k = r.service_name || r.category_name || "Other";
      const e = m.get(k) || { volume: 0, commission: 0, txns: 0 };
      e.volume += Number(r.service_charge || 0); e.txns += 1;
      if (earned(r.status)) e.commission += Number(r.commission_price || 0);
      m.set(k, e);
    });
    return Array.from(m.entries()).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.volume - a.volume);
  }, [rows]);

  const byStatus = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => m.set(r.status, (m.get(r.status) || 0) + 1));
    return Array.from(m.entries()).map(([name, value], i) => ({ name: name.replace(/_/g, " "), value, color: PIE_COLORS[i % PIE_COLORS.length] }));
  }, [rows]);

  const exportCsv = () => {
    if (byService.length === 0) return toast.error("No data to export");
    const head = ["Service", "Transactions", "Volume", "Commission"].join(",");
    const body = byService.map((s) => [s.name, s.txns, s.volume, s.commission].map((x) => `"${x}"`).join(",")).join("\n");
    const blob = new Blob([head + "\n" + body], { type: "text/csv" }); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `report-${period}.csv`; a.click(); URL.revokeObjectURL(url);
    toast.success("Report exported");
  };

  return (
    <RetailerShell>
      <div className="space-y-5">
        <PageHeader icon={<BarChart3 className="h-5 w-5" />} title="Reports & Analytics" subtitle="Your application volume, commissions and service breakdown"
          actions={<button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-10 text-sm font-semibold hover:bg-muted"><Download className="h-4 w-4" /> Export CSV</button>} />

        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <button key={p.key} onClick={() => setPeriod(p.key)} className={`rounded-full px-3 h-9 text-xs font-semibold transition ${period === p.key ? "bg-india-green text-white" : "border border-border bg-card hover:bg-muted"}`}>{p.label}</button>
          ))}
        </div>

        {loading ? (
          <div className="grid place-items-center rounded-2xl border border-border bg-card p-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label="Application Volume" value={inr(totals.volume)} icon={<TrendingUp className="h-5 w-5" />} tone="saffron" />
              <StatCard label="Earned Commission" value={inr(totals.commission)} icon={<Receipt className="h-5 w-5" />} tone="green" />
              <StatCard label="Applications" value={String(totals.count)} icon={<Layers className="h-5 w-5" />} tone="sky" />
              <StatCard label="Approved / Completed" value={String(totals.approved)} icon={<CheckCircle2 className="h-5 w-5" />} tone="violet" />
            </div>

            <SectionCard title="Volume & Commission Trend" description={PERIODS.find((p) => p.key === period)!.label}>
              <div className="h-64">
                {rows.length === 0 ? <div className="grid h-full place-items-center text-sm text-muted-foreground">No applications in this period</div> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trend} margin={{ top: 10, right: 6, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="v" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity={0.5} /><stop offset="100%" stopColor="#f59e0b" stopOpacity={0} /></linearGradient>
                        <linearGradient id="cm" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#16a34a" stopOpacity={0.4} /><stop offset="100%" stopColor="#16a34a" stopOpacity={0} /></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                      <XAxis dataKey="day" tickLine={false} axisLine={false} className="text-xs" minTickGap={20} />
                      <YAxis tickLine={false} axisLine={false} className="text-xs" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => inr(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      <Area type="monotone" dataKey="volume" name="Volume" stroke="#f59e0b" strokeWidth={2.5} fill="url(#v)" />
                      <Area type="monotone" dataKey="commission" name="Commission" stroke="#16a34a" strokeWidth={2.5} fill="url(#cm)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </SectionCard>

            <div className="grid lg:grid-cols-3 gap-3">
              <div className="lg:col-span-2">
                <SectionCard title="By Service" description="Volume per service">
                  <div className="h-64">
                    {byService.length === 0 ? <div className="grid h-full place-items-center text-sm text-muted-foreground">No data</div> : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={byService.slice(0, 8)} margin={{ top: 8, right: 6, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                          <XAxis dataKey="name" tickLine={false} axisLine={false} className="text-[10px]" interval={0} angle={-15} height={50} textAnchor="end" />
                          <YAxis tickLine={false} axisLine={false} className="text-xs" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                          <Tooltip formatter={(v: number) => inr(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                          <Bar dataKey="volume" name="Volume" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </SectionCard>
              </div>
              <SectionCard title="By Status" description="Application outcomes">
                <div className="h-64">
                  {byStatus.length === 0 ? <div className="grid h-full place-items-center text-sm text-muted-foreground">No data</div> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={byStatus} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={2}>
                          {byStatus.map((s) => <Cell key={s.name} fill={s.color} />)}
                        </Pie>
                        <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </SectionCard>
            </div>

            <SectionCard title="Service Breakdown" description="Detailed figures">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-2">Service</th><th className="py-2 text-right">Txns</th><th className="py-2 text-right">Volume</th><th className="py-2 text-right">Commission</th>
                  </tr></thead>
                  <tbody>
                    {byService.length === 0 ? <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No applications in this period</td></tr> :
                      byService.map((s) => (
                        <tr key={s.name} className="border-b border-border/60">
                          <td className="py-2 font-medium">{s.name}</td>
                          <td className="py-2 text-right">{s.txns}</td>
                          <td className="py-2 text-right">{inr(s.volume)}</td>
                          <td className="py-2 text-right font-semibold text-emerald-700">+{inr(s.commission)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border bg-card p-4 shadow-soft flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700"><Wallet className="h-5 w-5" /></span>
                <div><p className="text-[11px] font-semibold uppercase text-muted-foreground">Wallet Credited (all time)</p><p className="text-lg font-extrabold text-emerald-600">{inr(walletCredit)}</p></div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4 shadow-soft flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-100 text-rose-600"><Wallet className="h-5 w-5" /></span>
                <div><p className="text-[11px] font-semibold uppercase text-muted-foreground">Wallet Spent (all time)</p><p className="text-lg font-extrabold text-rose-500">{inr(walletDebit)}</p></div>
              </div>
            </div>
          </>
        )}
      </div>
    </RetailerShell>
  );
}
