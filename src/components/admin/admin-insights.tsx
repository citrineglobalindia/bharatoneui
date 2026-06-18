import { useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, Landmark, ShieldAlert, Loader2, RefreshCw, IndianRupee, TrendingUp, AlertTriangle, ArrowDownToLine, ArrowUpFromLine, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");
function useRpc(fn: string, poll = 0) {
  const [d, setD] = useState<any>(null); const [loading, setLoading] = useState(true);
  async function load() { try { await ensureStaffSession(); const { data } = await supabase.rpc(fn); setD(data); } finally { setLoading(false); } }
  useEffect(() => { load(); if (poll) { const t = setInterval(load, poll); return () => clearInterval(t); } /* eslint-disable-next-line */ }, []);
  return { d, loading, reload: load };
}
function Card({ icon: Icon, label, value, sub, tone }: any) {
  return <div className="rounded-2xl border border-border bg-card p-4 shadow-soft"><div className="flex items-center gap-2"><span className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span><div><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="text-xl font-extrabold">{value}</p>{sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}</div></div></div>;
}
function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return <div className="mb-2"><div className="mb-1 flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className="font-bold">{inr(value)}</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${max ? (value / max) * 100 : 0}%`, background: color }} /></div></div>;
}

export function LiveOperations() {
  const { d, loading, reload } = useRpc("admin_live_feed", 10000);
  const rows = (d as any[]) ?? [];
  const tone: Record<string, string> = { application: "bg-saffron/10 text-saffron", wallet: "bg-india-green/10 text-india-green", registration: "bg-blue-500/10 text-blue-600" };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><div><h2 className="flex items-center gap-2 text-lg font-extrabold"><Activity className="h-5 w-5 text-admin" /> Live Operations</h2><p className="text-sm text-muted-foreground">Real-time platform activity (auto-refreshes every 10s).</p></div><Button variant="outline" size="sm" onClick={reload}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button></div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft"><table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2">Type</th><th className="px-3 py-2">Ref</th><th className="px-3 py-2">Detail</th><th className="px-3 py-2">Who</th><th className="px-3 py-2">Amount</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Time</th></tr></thead>
        <tbody>{loading && rows.length === 0 ? <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
          : rows.length === 0 ? <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">No activity yet.</td></tr>
          : rows.map((r, i) => (<tr key={i} className="border-t border-border"><td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${tone[r.kind] || "bg-muted"}`}>{r.kind}</span></td><td className="px-3 py-2 font-mono text-xs">{r.ref || "—"}</td><td className="px-3 py-2 font-medium">{r.title}</td><td className="px-3 py-2 text-muted-foreground">{r.who || "—"}</td><td className="px-3 py-2">{r.amount != null ? inr(r.amount) : "—"}</td><td className="px-3 py-2 capitalize">{String(r.status || "").replace("_", " ")}</td><td className="px-3 py-2 text-xs text-muted-foreground">{new Date(r.at).toLocaleString("en-IN")}</td></tr>))}</tbody>
      </table></div>
    </div>
  );
}

export function RevenueAnalytics() {
  const { d, loading, reload } = useRpc("admin_revenue");
  const daily = (d?.daily as any[]) ?? []; const maxDaily = Math.max(1, ...daily.map((x) => Number(x.amount || 0)));
  const comms = d ? [["Company", d.company_comm, "#6366f1"], ["Distributor", d.distributor_comm, "#138808"], ["DRO", d.dro_comm, "#f59e0b"], ["TRO", d.tro_comm, "#f97316"], ["Retailer", d.retailer_comm, "#e11d48"]] as any[] : [];
  const maxComm = Math.max(1, ...comms.map((c) => Number(c[1] || 0)));
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><div><h2 className="flex items-center gap-2 text-lg font-extrabold"><BarChart3 className="h-5 w-5 text-admin" /> Revenue Analytics</h2><p className="text-sm text-muted-foreground">Service revenue, commission split and trends.</p></div><Button variant="outline" size="sm" onClick={reload}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button></div>
      {loading ? <div className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div> : (<>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card icon={IndianRupee} label="Gross Revenue" value={inr(d?.gross)} sub={`${d?.apps ?? 0} applications`} tone="bg-saffron/10 text-saffron" />
          <Card icon={TrendingUp} label="Company Commission" value={inr(d?.company_comm)} tone="bg-india-green/10 text-india-green" />
          <Card icon={ArrowDownToLine} label="Wallet In" value={inr(d?.wallet_in)} tone="bg-blue-500/10 text-blue-600" />
          <Card icon={ArrowUpFromLine} label="Wallet Out" value={inr(d?.wallet_out)} tone="bg-rose-500/10 text-rose-600" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft"><p className="mb-3 text-sm font-bold">Commission split</p>{comms.map((c) => <Bar key={c[0]} label={c[0]} value={Number(c[1] || 0)} max={maxComm} color={c[2]} />)}</div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft"><p className="mb-3 text-sm font-bold">Revenue by category</p>{((d?.by_category as any[]) ?? []).map((x) => <Bar key={x.name} label={`${x.name} (${x.cnt})`} value={Number(x.amount || 0)} max={Math.max(1, ...((d?.by_category as any[]) ?? []).map((y) => Number(y.amount || 0)))} color="#138808" />)}{(!d?.by_category || (d.by_category as any[]).length === 0) && <p className="text-sm text-muted-foreground">No data.</p>}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft"><p className="mb-3 text-sm font-bold">Daily revenue (14 days)</p>
          <div className="flex items-end gap-2 h-40">{daily.length === 0 ? <p className="text-sm text-muted-foreground">No recent activity.</p> : daily.map((x, i) => (<div key={i} className="flex flex-1 flex-col items-center gap-1"><div className="w-full rounded-t bg-india-green" style={{ height: `${(Number(x.amount || 0) / maxDaily) * 100}%`, minHeight: "2px" }} title={inr(x.amount)} /><span className="text-[9px] text-muted-foreground">{x.d}</span></div>))}</div>
        </div>
      </>)}
    </div>
  );
}

export function Settlements() {
  const { d, loading, reload } = useRpc("admin_settlements");
  const rows = (d?.by_distributor as any[]) ?? [];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><div><h2 className="flex items-center gap-2 text-lg font-extrabold"><Landmark className="h-5 w-5 text-admin" /> Settlements</h2><p className="text-sm text-muted-foreground">Commission payable to distributors and retailers.</p></div><Button variant="outline" size="sm" onClick={reload}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button></div>
      {loading ? <div className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div> : (<>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card icon={IndianRupee} label="Company Revenue" value={inr(d?.company_revenue)} tone="bg-india-green/10 text-india-green" />
          <Card icon={Landmark} label="Distributor Payable" value={inr(d?.distributor_payable)} tone="bg-blue-500/10 text-blue-600" />
          <Card icon={TrendingUp} label="Retailer Payable" value={inr(d?.retailer_payable)} tone="bg-saffron/10 text-saffron" />
          <Card icon={AlertTriangle} label="Pending (unsettled)" value={inr(d?.pending_settlement)} tone="bg-amber-500/10 text-amber-600" />
        </div>
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft"><table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2">Distributor</th><th className="px-3 py-2">Applications</th><th className="px-3 py-2">Earned (settle)</th><th className="px-3 py-2">Pending</th></tr></thead>
          <tbody>{rows.length === 0 ? <tr><td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">No distributors.</td></tr>
            : rows.map((r, i) => (<tr key={i} className="border-t border-border"><td className="px-3 py-2 font-semibold">{r.name}</td><td className="px-3 py-2">{r.apps}</td><td className="px-3 py-2 text-india-green font-semibold">{inr(r.earned)}</td><td className="px-3 py-2 text-amber-600">{inr(r.pending)}</td></tr>))}</tbody>
        </table></div>
      </>)}
    </div>
  );
}

export function RiskFraud() {
  const { d, loading, reload } = useRpc("admin_risk", 20000);
  const alerts = (d?.alerts as any[]) ?? [];
  const lt: Record<string, string> = { High: "bg-rose-100 text-rose-700", Medium: "bg-amber-100 text-amber-700", Low: "bg-slate-100 text-slate-600" };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><div><h2 className="flex items-center gap-2 text-lg font-extrabold"><ShieldAlert className="h-5 w-5 text-admin" /> Risk &amp; Fraud</h2><p className="text-sm text-muted-foreground">Signals and alerts from live data.</p></div><Button variant="outline" size="sm" onClick={reload}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button></div>
      {loading ? <div className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div> : (<>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card icon={AlertTriangle} label="Rejected Registrations" value={d?.rejected_regs ?? 0} tone="bg-rose-500/10 text-rose-600" />
          <Card icon={FileText} label="Rejected Applications" value={d?.rejected_apps ?? 0} tone="bg-rose-500/10 text-rose-600" />
          <Card icon={IndianRupee} label="Large Top-ups Pending" value={d?.big_topups ?? 0} tone="bg-amber-500/10 text-amber-600" />
          <Card icon={Landmark} label="Main Balance" value={inr(d?.main_balance)} sub={d?.low_main ? "⚠ Low — recharge" : "Healthy"} tone={d?.low_main ? "bg-rose-500/10 text-rose-600" : "bg-india-green/10 text-india-green"} />
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft"><p className="mb-3 text-sm font-bold">Alerts</p>
          {alerts.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No active alerts.</p>
            : <div className="space-y-2">{alerts.map((a, i) => (<div key={i} className="flex items-start gap-3 rounded-xl border border-border p-3"><span className={`mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${lt[a.level] || "bg-muted"}`}>{a.level}</span><div className="flex-1"><p className="text-sm font-semibold">{a.title}</p><p className="text-xs text-muted-foreground">{a.detail}</p></div><span className="text-[11px] text-muted-foreground">{new Date(a.at).toLocaleDateString("en-IN")}</span></div>))}</div>}
        </div>
      </>)}
    </div>
  );
}
