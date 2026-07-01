import { useEffect, useState } from "react";
import { Loader2, RefreshCw, TrendingUp, Users, FileSearch, Wallet, LifeBuoy, Network, Landmark } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

type Summary = {
  registrations: { total: number; approved: number; pending: number; rejected: number; old: number; new: number };
  applications: { total: number; completed: number; in_progress: number };
  wallet: { credit: number; debit: number; balance: number };
  support: { total: number; open: number };
  distributors: number;
  aeps_txns: number;
  trend: { day: string; registrations_new: number; registrations_approved: number; service_applications: number; wallet_credit: number }[];
};

const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");

export function PlatformAnalytics() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true); setErr(null);
    await ensureStaffSession();
    const { data: res, error } = await supabase.rpc("admin_analytics_summary");
    if (error) setErr(error.message);
    else setData(res as unknown as Summary);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const cards = data ? [
    { label: "Registrations", value: data.registrations.total, sub: `${data.registrations.approved} approved · ${data.registrations.pending} pending`, icon: Users, tone: "text-blue-600 bg-blue-500/10" },
    { label: "Service Applications", value: data.applications.total, sub: `${data.applications.completed} completed`, icon: FileSearch, tone: "text-violet-600 bg-violet-500/10" },
    { label: "Wallet Pool", value: inr(data.wallet.balance), sub: `${inr(data.wallet.credit)} in · ${inr(data.wallet.debit)} out`, icon: Wallet, tone: "text-emerald-600 bg-emerald-500/10" },
    { label: "Support Tickets", value: data.support.total, sub: `${data.support.open} open`, icon: LifeBuoy, tone: "text-amber-600 bg-amber-500/10" },
    { label: "Distributors", value: data.distributors, sub: "network partners", icon: Network, tone: "text-indigo-600 bg-indigo-500/10" },
    { label: "AEPS Transactions", value: data.aeps_txns, sub: "logged", icon: Landmark, tone: "text-teal-600 bg-teal-500/10" },
  ] : [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold"><TrendingUp className="h-5 w-5 text-india-green" /> Platform Analytics</h2>
          <p className="text-sm text-muted-foreground">Live platform metrics with a 30-day trend (snapshotted daily).</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-9 text-sm font-semibold hover:bg-muted"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
      </div>

      {loading ? (
        <div className="grid h-48 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-india-green" /></div>
      ) : err ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Couldn't load analytics: {err}</div>
      ) : data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((c) => (
              <div key={c.label} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
                <div className="flex items-center gap-3">
                  <span className={`grid h-10 w-10 place-items-center rounded-lg ${c.tone}`}><c.icon className="h-5 w-5" /></span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{c.label}</p>
                    <p className="text-xl font-extrabold">{c.value}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{c.sub}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <p className="mb-3 text-sm font-bold">New vs approved registrations — last 30 days</p>
            {data.trend.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Trend data will appear from tomorrow (daily snapshot).</p>
            ) : (
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer>
                  <AreaChart data={data.trend.map((t) => ({ ...t, day: new Date(t.day).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) }))}>
                    <defs>
                      <linearGradient id="gN" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3056d3" stopOpacity={0.35} /><stop offset="95%" stopColor="#3056d3" stopOpacity={0} /></linearGradient>
                      <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#1F7A3D" stopOpacity={0.35} /><stop offset="95%" stopColor="#1F7A3D" stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="registrations_new" name="New" stroke="#3056d3" fill="url(#gN)" strokeWidth={2} />
                    <Area type="monotone" dataKey="registrations_approved" name="Approved" stroke="#1F7A3D" fill="url(#gA)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
