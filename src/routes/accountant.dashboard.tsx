import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Landmark, FileCheck2, Wallet, ArrowDownToLine, IndianRupee, Loader2, RefreshCw, Banknote, Receipt } from "lucide-react";
import { AccountantShell } from "@/components/accountant/accountant-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

export const Route = createFileRoute("/accountant/dashboard")({
  head: () => ({ meta: [{ title: "Accountant Dashboard — BharatOne" }] }),
  component: DashboardPage,
});
const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");

function Stat({ icon: Icon, label, value, sub, tone, to }: any) {
  const inner = (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft transition hover:shadow-elev">
      <div className="flex items-center gap-2"><span className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span>
        <div><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="text-xl font-extrabold">{value}</p>{sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}</div></div>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

function DashboardPage() {
  const [d, setD] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  async function load() { setLoading(true); try { await ensureStaffSession(); const { data } = await supabase.rpc("accountant_dashboard"); setD(data ?? {}); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);

  return (
    <AccountantShell>
      <div className="space-y-5">
        <PageHeader icon={<Landmark className="h-5 w-5" />} title="Accountant Dashboard" subtitle="Payments, wallets and settlements at a glance."
          actions={<button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-10 text-sm font-semibold hover:bg-muted"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button>} />
        {loading ? <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div> : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat icon={FileCheck2} label="Registration Payments" value={d?.reg_pending ?? 0} sub="pending verification" tone="bg-amber-500/10 text-amber-600" to="/accountant/registrations" />
              <Stat icon={Wallet} label="Top-up Requests" value={d?.topup_pending ?? 0} sub={inr(d?.topup_pending_amt) + " awaiting"} tone="bg-india-green/10 text-india-green" to="/accountant/wallet-requests" />
              <Stat icon={ArrowDownToLine} label="Withdrawals" value={d?.withdrawal_pending ?? 0} sub={inr(d?.withdrawal_pending_amt) + " awaiting"} tone="bg-rose-500/10 text-rose-600" to="/accountant/withdrawals" />
              <Stat icon={Banknote} label="Main Account" value={inr(d?.company_balance)} sub="company float" tone="bg-blue-500/10 text-blue-600" to="/accountant/main-recharge" />
              <Stat icon={Wallet} label="Wallet Float" value={inr(d?.wallet_float)} sub="across retailers" tone="bg-violet-500/10 text-violet-600" />
              <Stat icon={IndianRupee} label="Application Charges" value={inr(d?.app_charges)} sub="total" tone="bg-saffron/10 text-saffron" to="/accountant/services-payments" />
              <Stat icon={Receipt} label="Unverified Payments" value={d?.apps_unverified ?? 0} sub="service applications" tone="bg-amber-500/10 text-amber-600" to="/accountant/services-payments" />
              <Stat icon={FileCheck2} label="Payments Verified" value={d?.payments_verified ?? 0} sub="registrations" tone="bg-india-green/10 text-india-green" />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <p className="mb-3 text-sm font-bold">Pending Registration Payments</p>
                {(d?.recent_regs ?? []).length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Nothing pending.</p>
                  : <div className="space-y-2">{(d.recent_regs as any[]).map((r, i) => (<div key={i} className="flex items-center justify-between border-b border-border pb-2 text-sm"><div><p className="font-semibold">{r.name}</p><p className="text-[11px] text-muted-foreground font-mono">{r.application_id}</p></div><span className="font-bold">{r.payment_amount ? inr(r.payment_amount) : "—"}</span></div>))}</div>}
              </div>
              <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <p className="mb-3 text-sm font-bold">Recent Wallet Top-ups</p>
                {(d?.recent_topups ?? []).length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No top-ups yet.</p>
                  : <div className="space-y-2">{(d.recent_topups as any[]).map((t, i) => (<div key={i} className="flex items-center justify-between border-b border-border pb-2 text-sm"><div><p className="font-semibold">{t.who ?? "Retailer"}</p><p className="text-[11px] text-muted-foreground capitalize">{t.status}</p></div><span className="font-bold">{inr(t.amount)}</span></div>))}</div>}
              </div>
            </div>
          </>
        )}
      </div>
    </AccountantShell>
  );
}
