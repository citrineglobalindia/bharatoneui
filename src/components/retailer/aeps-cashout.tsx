// ============================================================================
// AEPS Cashout — Eko fund settlement to the agent's own bank ("My Merchant").
// ----------------------------------------------------------------------------
// DELIBERATELY ISOLATED in its own file. It loads its own config/data, defines
// its own `call` helper, and is wrapped in an error boundary — so nothing here
// can affect or crash the core AEPS page (transactions / eKYC / daily 2FA).
// The core `src/routes/aeps.tsx` only renders <AepsCashout /> and passes nothing.
// Backend actions (config, get_banks, settlement_*, settle) live in the `aeps`
// edge function. Renders nothing unless the admin enabled settlement for the agent.
// ============================================================================
import { Component, useCallback, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Landmark, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/components/retailer/mock-data";

const tone: Record<string, string> = {
  success: "bg-emerald-100 text-emerald-700",
  failed: "bg-rose-100 text-rose-700",
  pending: "bg-amber-100 text-amber-700",
  pending_reconciliation: "bg-amber-100 text-amber-800",
};

// Invoke the dedicated `aeps-cashout` edge function. Kept local so this file has
// no dependency on the core page or the core `aeps` gateway.
async function call(action: string, extra: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("aeps-cashout", { body: { action, ...extra } });
  if (error) {
    let msg = "Request failed";
    try {
      const ctx = (error as { context?: Response }).context;
      const b = ctx ? await ctx.json() : null;
      if (b?.error) msg = String(b.message ?? b.error);
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  if ((data as any)?.error) throw new Error(String((data as any).message ?? (data as any).error));
  return data as any;
}

type Cashout = {
  unsettled_fund: number; remaining_limit: number;
  accounts: { recipient_id: string; name: string; account: string; ifsc: string }[];
};

function AepsCashoutInner() {
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [bankList, setBankList] = useState<{ value: string; label: string; bank_id?: number }[]>([]);
  const [cashout, setCashout] = useState<Cashout | null>(null);
  const [cashoutErr, setCashoutErr] = useState<string | null>(null);
  const [settleHistory, setSettleHistory] = useState<any[]>([]);
  const [showAddAcct, setShowAddAcct] = useState(false);
  const [saAccount, setSaAccount] = useState("");
  const [saIfsc, setSaIfsc] = useState("");
  const [saBankId, setSaBankId] = useState("");
  const [saBusy, setSaBusy] = useState(false);
  const [stAmt, setStAmt] = useState("");
  const [stMode, setStMode] = useState("5");
  const [stRecipient, setStRecipient] = useState("");
  const [stBusy, setStBusy] = useState(false);

  const loadCashout = useCallback(async () => {
    try {
      const r = await call("accounts");
      setCashoutErr(null);
      setCashout({ unsettled_fund: r.unsettled_fund ?? 0, remaining_limit: r.remaining_limit ?? 0, accounts: r.accounts ?? [] });
      if ((r.accounts ?? []).length) setStRecipient((cur) => cur || String(r.accounts[0].recipient_id));
    } catch (e: any) { setCashoutErr(e.message || "Could not reach Eko"); }
    try {
      const h = await (supabase as any).from("aeps_settlements").select("*").order("created_at", { ascending: false }).limit(10);
      setSettleHistory((h?.data as any[]) ?? []);
    } catch { /* optional */ }
  }, []);

  // Self-contained bootstrap: check if settlement is enabled for this agent, and
  // if so load the balance, accounts and the bank list. One extra `config` call,
  // the price of full isolation from the core page.
  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const st = await call("status").catch(() => null);
        if (!on) return;
        const en = !!(st?.settlement_enabled && st?.service_activated);
        setEnabled(en);
        setReady(true);
        if (!en) return;
        void loadCashout();
        try {
          const r = await call("banks");
          if (on) setBankList((r?.list ?? []) as { value: string; label: string; bank_id?: number }[]);
        } catch { /* optional */ }
      } catch { if (on) setReady(true); }
    })();
    return () => { on = false; };
  }, [loadCashout]);

  const addSettlementAccount = async () => {
    if (!saBankId) return toast.error("Select the bank");
    if (!/^\d{6,20}$/.test(saAccount.trim())) return toast.error("Enter a valid account number");
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(saIfsc.trim())) return toast.error("Enter a valid IFSC code");
    setSaBusy(true);
    try {
      const r = await call("add_account", { account: saAccount.trim(), ifsc: saIfsc.trim().toUpperCase(), bank_id: Number(saBankId) });
      toast.success("Settlement account added", { description: r.message });
      setShowAddAcct(false); setSaAccount(""); setSaIfsc(""); setSaBankId("");
      await loadCashout();
    } catch (e: any) {
      // A first-ever failure is often service 39 not being active yet for this
      // agent — activate it once and ask the agent to retry.
      if (/service.*not|not.*service|activate/i.test(e.message)) {
        try {
          await call("activate");
          toast.info("Settlement service activated", { description: "Try adding the account again." });
        } catch { toast.error("Could not add account", { description: e.message }); }
      } else toast.error("Could not add account", { description: e.message });
    } finally { setSaBusy(false); }
  };

  const doSettle = async () => {
    const amt = Number(stAmt);
    if (!(amt > 0)) return toast.error("Enter a valid amount to settle");
    if (amt > 200000) return toast.error("Maximum ₹2,00,000 per settlement");
    if (cashout && amt > cashout.unsettled_fund) return toast.error(`You can settle up to ${inr(cashout.unsettled_fund)}`);
    if (!stRecipient) return toast.error("Pick a settlement account");
    setStBusy(true);
    try {
      const r = await call("settle", { amount: amt, recipient_id: stRecipient, payment_mode: Number(stMode) });
      toast.success(r.status === "success" ? "Settlement successful" : "Settlement in process", {
        description: `${inr(amt)}${r.total_fee ? ` · fee ₹${r.total_fee}` : ""}${r.bank_ref_num ? ` · UTR ${r.bank_ref_num}` : r.tid ? ` · TID ${r.tid}` : ""}`,
      });
      setStAmt("");
      await loadCashout();
    } catch (e: any) { toast.error("Settlement failed", { description: e.message }); }
    finally { setStBusy(false); }
  };

  if (!ready || !enabled) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-bold"><Landmark className="h-4 w-4 text-sky-600" /> AEPS Cashout — Bank Settlement</p>
        <button onClick={() => void loadCashout()} className="text-[11px] font-semibold text-sky-700 hover:underline">Refresh</button>
      </div>

      <div className="rounded-xl bg-sky-50 p-4">
        <p className="text-[11px] font-semibold text-sky-700">Unsettled AePS fund at Eko</p>
        <p className="mt-0.5 text-2xl font-extrabold text-sky-700">{cashout ? inr(cashout.unsettled_fund) : "—"}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Daily limit left {cashout ? inr(cashout.remaining_limit) : "—"} · Mon–Fri 10 AM–5 PM · max ₹2,00,000 per settlement · after 5 PM settles next working day
        </p>
      </div>
      {cashoutErr && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
          Could not fetch your settlement balance from Eko: {cashoutErr} — press Refresh to retry.
        </p>
      )}

      {/* Registered settlement accounts */}
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-[11px] font-semibold text-muted-foreground">Settlement accounts (max 3)</p>
          {(cashout?.accounts?.length ?? 0) < 3 && (
            <button onClick={() => setShowAddAcct((v) => !v)} className="text-[11px] font-semibold text-sky-700 hover:underline">{showAddAcct ? "Cancel" : "+ Add account"}</button>
          )}
        </div>
        {(cashout?.accounts?.length ?? 0) > 0 ? (
          <div className="divide-y divide-border rounded-xl border border-border">
            {cashout!.accounts.map((a) => (
              <label key={a.recipient_id} className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs">
                <input type="radio" name="settle-acct" checked={stRecipient === a.recipient_id} onChange={() => setStRecipient(a.recipient_id)} />
                <span className="font-semibold">{a.name || "Account"}</span>
                <span className="text-muted-foreground">{a.account} · {a.ifsc}</span>
              </label>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">No settlement account yet — add your own bank account (name must match your AEPS registration).</p>
        )}
        {showAddAcct && (
          <div className="mt-2 grid gap-2 rounded-xl bg-muted/40 p-3 sm:grid-cols-2">
            <label><span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Account number</span>
              <input inputMode="numeric" value={saAccount} onChange={(e) => setSaAccount(e.target.value.replace(/\D/g, ""))} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" />
            </label>
            <label><span className="mb-1 block text-[11px] font-semibold text-muted-foreground">IFSC</span>
              <input value={saIfsc} onChange={(e) => setSaIfsc(e.target.value.toUpperCase())} maxLength={11} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" />
            </label>
            <label className="sm:col-span-2"><span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Bank</span>
              <select value={saBankId} onChange={(e) => setSaBankId(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm">
                <option value="">Select bank…</option>
                {bankList.filter((b) => b.bank_id != null).map((b) => <option key={String(b.bank_id)} value={String(b.bank_id)}>{b.label}</option>)}
              </select>
            </label>
            <div className="sm:col-span-2">
              <button onClick={addSettlementAccount} disabled={saBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 h-9 text-xs font-bold text-white disabled:opacity-50">
                {saBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Verify & add account
              </button>
              <p className="mt-1 text-[11px] text-muted-foreground">The bank verifies the account holder name against your AEPS registration (₹1 penny-drop).</p>
            </div>
          </div>
        )}
      </div>

      {/* Settle */}
      {(cashout?.accounts?.length ?? 0) > 0 && (
        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl bg-muted/40 p-3">
          <label className="flex-1 min-w-[140px]"><span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Amount to settle (₹)</span>
            <input inputMode="numeric" value={stAmt} onChange={(e) => setStAmt(e.target.value.replace(/\D/g, ""))} placeholder={`Max ${inr(Math.min(cashout?.unsettled_fund ?? 0, 200000))}`} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </label>
          <label><span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Mode</span>
            <select value={stMode} onChange={(e) => setStMode(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-3 text-sm">
              <option value="5">IMPS</option><option value="4">NEFT</option><option value="13">RTGS</option>
            </select>
          </label>
          <button onClick={() => setStAmt(String(Math.min(cashout?.unsettled_fund ?? 0, 200000)))} className="rounded-lg border border-border px-3 h-9 text-xs font-semibold hover:bg-muted">Max</button>
          <button onClick={doSettle} disabled={stBusy || !(cashout && cashout.unsettled_fund > 0)} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 h-9 text-xs font-bold text-white disabled:opacity-50">
            {stBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Landmark className="h-3.5 w-3.5" />} Settle to bank
          </button>
          <p className="w-full text-[11px] text-muted-foreground">Eko charges a settlement fee (approx ₹18 incl. GST), deducted from the fund.</p>
        </div>
      )}

      {/* History */}
      {settleHistory.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-[11px] font-semibold text-muted-foreground">Recent settlements</p>
          <div className="divide-y divide-border rounded-xl border border-border">
            {settleHistory.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-3 py-2 text-xs">
                <span>{new Date(s.created_at).toLocaleDateString("en-IN")} · {inr(Number(s.amount))}{s.fee ? ` · fee ₹${s.fee}` : ""}{s.bank_ref_num ? ` · UTR ${s.bank_ref_num}` : ""}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tone[s.status] ?? "bg-muted text-muted-foreground"}`}>
                  {s.status === "pending_reconciliation" ? "In process" : s.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Error boundary: a fault inside Cashout must never take down the AEPS page.
class CashoutBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err: unknown) { console.error("AEPS Cashout error (contained):", err); }
  render() { return this.state.failed ? null : this.props.children; }
}

export function AepsCashout() {
  return (
    <CashoutBoundary>
      <AepsCashoutInner />
    </CashoutBoundary>
  );
}
