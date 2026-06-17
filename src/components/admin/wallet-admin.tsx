import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Wallet, CheckCircle2, XCircle, Loader2, RefreshCw, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

type Topup = { id: string; user_id: string; amount: number; method: string | null; reference: string | null; note: string | null; status: string; created_at: string };
type RUser = { id: string; name: string; email: string };
const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");
const tone: Record<string, string> = { pending: "bg-amber-100 text-amber-700", verified: "bg-emerald-100 text-emerald-700", rejected: "bg-rose-100 text-rose-700" };

export function WalletAdmin() {
  const [rows, setRows] = useState<Topup[]>([]);
  const [users, setUsers] = useState<Record<string, RUser>>({});
  const [retailers, setRetailers] = useState<RUser[]>([]);
  const [balances, setBalances] = useState<{ user_id: string; balance: number }[]>([]);
  const [mainBal, setMainBal] = useState(0);
  const [rcAmt, setRcAmt] = useState(""); const [rcBusy, setRcBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [tuUser, setTuUser] = useState(""); const [tuAmt, setTuAmt] = useState(""); const [tuNote, setTuNote] = useState(""); const [tuBusy, setTuBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      await ensureStaffSession();
      const [t, u, w, cb] = await Promise.all([
        supabase.from("wallet_topups").select("*").order("created_at", { ascending: false }),
        supabase.rpc("admin_list_users"),
        supabase.from("wallets").select("user_id,balance"),
        supabase.rpc("company_balance"),
      ]);
      setMainBal(Number((cb.data as any) ?? 0));
      setRows((t.data as Topup[]) ?? []);
      setBalances((w.data as any[]) ?? []);
      const map: Record<string, RUser> = {}; const rets: RUser[] = [];
      ((u.data as any[]) ?? []).forEach((x) => { const ru = { id: x.id, name: x.display_name || x.email || "User", email: x.email }; map[x.id] = ru; if (Array.isArray(x.roles) && x.roles.includes("retailer")) rets.push(ru); });
      setUsers(map); setRetailers(rets);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const act = async (t: Topup, approve: boolean) => {
    setBusy(t.id);
    const { error } = await supabase.rpc("verify_wallet_topup", { p_id: t.id, p_approve: approve });
    setBusy(null);
    if (error) return toast.error("Failed", { description: error.message });
    toast.success(approve ? "Top-up verified & credited" : "Request rejected"); load();
  };
  const directTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tuUser) return toast.error("Select a retailer");
    const amt = Number(tuAmt); if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    setTuBusy(true);
    const { error } = await supabase.rpc("accountant_topup_wallet", { p_user: tuUser, p_amount: amt, p_note: tuNote || null });
    setTuBusy(false);
    if (error) return toast.error("Top-up failed", { description: error.message });
    toast.success("Wallet topped up"); setTuAmt(""); setTuNote(""); load();
  };

  const recharge = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(rcAmt); if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    setRcBusy(true);
    const { error } = await supabase.rpc("recharge_company_account", { p_amount: amt, p_note: null });
    setRcBusy(false);
    if (error) return toast.error("Recharge failed", { description: error.message });
    toast.success("Main account recharged"); setRcAmt(""); load();
  };

  const pendingTotal = useMemo(() => rows.filter((r) => r.status === "pending").reduce((a, r) => a + Number(r.amount), 0), [rows]);
  const floatTotal = useMemo(() => balances.reduce((a, b) => a + Number(b.balance), 0), [balances]);
  const filtered = useMemo(() => tab === "pending" ? rows.filter((r) => r.status === "pending") : rows, [rows, tab]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="flex items-center gap-2 text-lg font-extrabold"><Wallet className="h-5 w-5 text-admin" /> Wallet & Top-ups</h2><p className="text-sm text-muted-foreground">Verify top-up requests, top-up wallets, and view the wallet float.</p></div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-india-green/30 bg-india-green/5 p-4 shadow-soft">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Main account balance</p>
          <p className="text-2xl font-extrabold text-india-green">{inr(mainBal)}</p>
          <form onSubmit={recharge} className="mt-2 flex gap-2">
            <input type="number" min="1" className="h-8 w-24 rounded-lg border border-border bg-background px-2 text-sm" placeholder="Amount" value={rcAmt} onChange={(e) => setRcAmt(e.target.value)} />
            <Button type="submit" size="sm" variant="outline" disabled={rcBusy}>{rcBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Recharge</Button>
          </form>
          <p className="mt-1 text-[10px] text-muted-foreground">Approvals & top-ups deduct from this.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Retailer wallet float</p><p className="text-2xl font-extrabold">{inr(floatTotal)}</p><p className="text-xs text-muted-foreground">{balances.length} wallet(s) · {rows.filter((r) => r.status === "pending").length} pending ({inr(pendingTotal)})</p></div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <p className="mb-2 flex items-center gap-2 text-sm font-bold"><Plus className="h-4 w-4 text-india-green" /> Direct top-up</p>
          <form onSubmit={directTopup} className="space-y-2">
            <select className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm" value={tuUser} onChange={(e) => setTuUser(e.target.value)}><option value="">Select retailer</option>{retailers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
            <div className="flex gap-2"><input type="number" min="1" className="h-9 flex-1 rounded-lg border border-border bg-background px-2 text-sm" placeholder="Amount" value={tuAmt} onChange={(e) => setTuAmt(e.target.value)} /><Button type="submit" disabled={tuBusy} className="bg-india-green text-white hover:bg-india-green/90">{tuBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Top-up"}</Button></div>
          </form>
        </div>
      </div>

      <div className="flex gap-1.5">{(["pending", "all"] as const).map((k) => <button key={k} onClick={() => setTab(k)} className={`rounded-full px-3 h-8 text-xs font-semibold capitalize transition ${tab === k ? "bg-india-green text-white" : "border border-border bg-card hover:bg-muted"}`}>{k === "pending" ? "Pending" : "All requests"}</button>)}</div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Retailer</th><th className="px-3 py-2">Amount</th><th className="px-3 py-2">Method</th><th className="px-3 py-2">Reference</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Action</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
              : filtered.length === 0 ? <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">No requests.</td></tr>
              : filtered.map((t) => (<tr key={t.id} className="border-t border-border">
                <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{new Date(t.created_at).toLocaleString("en-IN")}</td>
                <td className="px-3 py-2">{users[t.user_id]?.name ?? "—"}<div className="text-[11px] text-muted-foreground">{users[t.user_id]?.email}</div></td>
                <td className="px-3 py-2 font-semibold">{inr(t.amount)}</td>
                <td className="px-3 py-2">{t.method ?? "—"}</td>
                <td className="px-3 py-2 text-xs">{t.reference ?? "—"}</td>
                <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${tone[t.status]}`}>{t.status}</span></td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  {t.status === "pending" ? <>
                    <Button size="sm" disabled={busy === t.id} onClick={() => act(t, true)} className="mr-2 bg-india-green text-white hover:bg-india-green/90">{busy === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Verify</Button>
                    <Button size="sm" variant="outline" disabled={busy === t.id} onClick={() => act(t, false)} className="text-rose-600"><XCircle className="h-3.5 w-3.5" /> Reject</Button>
                  </> : <span className="text-xs text-muted-foreground">—</span>}
                </td>
              </tr>))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
