import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Wallet, Loader2, RefreshCw, Search, ShieldCheck, CheckCircle2, BadgeIndianRupee } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

type RUser = { id: string; name: string; email: string };
type Recharge = { id: string; wallet_recharge_id: string; user_id: string; amount: number; method: string; note: string | null; created_at: string };

const db = supabase as any;
const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");
const METHODS = [["cash", "Cash"], ["bank", "Bank transfer"], ["upi", "UPI"], ["cheque", "Cheque"], ["manual", "Other"]] as const;

export function WalletRecharge() {
  const [retailers, setRetailers] = useState<RUser[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [recent, setRecent] = useState<Recharge[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [mainBal, setMainBal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [pick, setPick] = useState("");
  const [q, setQ] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string>("cash");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastWr, setLastWr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      await ensureStaffSession();
      const [u, w, cb, rc] = await Promise.all([
        db.rpc("admin_list_users"),
        db.from("wallets").select("user_id,balance"),
        db.rpc("company_balance"),
        db.from("wallet_recharges").select("id,wallet_recharge_id,user_id,amount,method,note,created_at").order("created_at", { ascending: false }).limit(50),
      ]);
      setMainBal(Number((cb.data as any) ?? 0));
      const map: Record<string, string> = {}; const rets: RUser[] = [];
      ((u.data as any[]) ?? []).forEach((x) => {
        const role = (Array.isArray(x.roles) ? x.roles.find((r: string) => r !== "employee") : "") || "";
        const label = (x.display_name || x.email || "User") + (role ? ` · ${role}` : "");
        map[x.id] = x.display_name || x.email || "Retailer";
        rets.push({ id: x.id, name: label, email: x.email });
      });
      setNames(map); setRetailers(rets);
      const bal: Record<string, number> = {};
      ((w.data as any[]) ?? []).forEach((b) => { bal[b.user_id] = Number(b.balance); });
      setBalances(bal);
      setRecent((rc.data as Recharge[]) ?? []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const options = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = !s ? retailers : retailers.filter((r) => r.name.toLowerCase().includes(s) || r.email.toLowerCase().includes(s));
    return list.slice(0, 50);
  }, [retailers, q]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pick) return toast.error("Select a retailer");
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    setBusy(true);
    const { data, error } = await db.rpc("accountant_recharge_wallet", { p_user: pick, p_amount: amt, p_note: note || null, p_method: method });
    setBusy(false);
    if (error) return toast.error("Recharge failed", { description: error.message });
    const wr = (data as any)?.wallet_recharge_id as string;
    setLastWr(wr);
    toast.success("Wallet recharged", { description: `${wr} — ${names[pick] ?? "Retailer"} credited ${inr(amt)}. Retailer & admin notified.` });
    setAmount(""); setNote(""); load();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold"><Wallet className="h-5 w-5 text-india-green" /> Recharge Retailer Wallet</h2>
          <p className="text-sm text-muted-foreground">Credit a retailer's wallet directly. A Wallet Recharge ID is generated and it reflects to the admin and the retailer.</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-9 text-sm font-semibold hover:bg-muted"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-5 shadow-soft space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-india-green/30 bg-india-green/5 px-3 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Main account balance</span>
            <span className="text-lg font-extrabold text-india-green">{inr(mainBal)}</span>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Retailer</label>
            <div className="relative mt-1"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email" className="h-10 w-full rounded-lg border border-border bg-background pl-8 pr-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30" /></div>
            <select value={pick} onChange={(e) => setPick(e.target.value)} size={6} className="mt-2 w-full rounded-lg border border-border bg-background p-1 text-sm outline-none">
              {options.length === 0 ? <option value="" disabled>No matches</option> : options.map((r) => (
                <option key={r.id} value={r.id}>{r.name} — bal {inr(balances[r.id] ?? 0)}</option>
              ))}
            </select>
            {pick && <p className="mt-1 text-xs text-muted-foreground">Selected: <b>{names[pick]}</b> · current balance {inr(balances[pick] ?? 0)}</p>}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Amount (₹)</label>
              <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30" />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Payment method</label>
              <select value={method} onChange={(e) => setMethod(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-2 text-sm outline-none">
                {METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Note / reference (optional)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="UTR, receipt no., remark…" className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30" />
          </div>

          <button type="submit" disabled={busy || !pick} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-india-green px-4 h-11 text-sm font-bold text-white hover:bg-india-green/90 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeIndianRupee className="h-4 w-4" />} Recharge wallet
          </button>

          {lastWr && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              <CheckCircle2 className="h-4 w-4" /> Last recharge reference: <b className="font-mono">{lastWr}</b>
            </div>
          )}
          <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-india-green" /> The amount is debited from the main account and credited to the retailer instantly. Both the retailer and admins are notified with the Wallet Recharge ID.</p>
        </form>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <p className="mb-3 flex items-center gap-2 text-sm font-bold"><Wallet className="h-4 w-4 text-india-green" /> Recent recharges</p>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr><th className="px-3 py-2">Recharge ID</th><th className="px-3 py-2">Retailer</th><th className="px-3 py-2">Amount</th><th className="px-3 py-2">Method</th><th className="px-3 py-2">When</th></tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={5} className="px-3 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
                  : recent.length === 0 ? <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">No recharges yet.</td></tr>
                  : recent.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-3 py-2 font-mono text-[11px] font-semibold text-india-green">{r.wallet_recharge_id}</td>
                      <td className="px-3 py-2">{names[r.user_id] ?? "Retailer"}</td>
                      <td className="px-3 py-2 font-semibold">{inr(r.amount)}</td>
                      <td className="px-3 py-2 capitalize text-xs">{r.method}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
