import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Wallet, Plus, Loader2, ArrowDownToLine, ArrowUpFromLine, Clock3, RefreshCw, Send, Upload, CalendarDays, Lock } from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { SectionCard, Field, Input, Select, PrimaryButton } from "@/components/retailer/section-card";
import { supabase } from "@/integrations/supabase/client";
import { payWithRazorpay } from "@/lib/razorpay";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

export const Route = createFileRoute("/wallet/")({
  head: () => ({ meta: [{ title: "Wallet — BharatOne" }] }),
  component: WalletPage,
});

type Tx = { id: string; direction: "credit" | "debit"; amount: number; balance_after: number; reason: string | null; created_at: string };
const appIdOf = (reason: string | null) => (reason || "").match(/\b(APP\d+)\b/)?.[1] ?? "";
const svcNameOf = (reason: string | null) => (reason || "").replace(/^Application\s+\S+\s*[-·]\s*/i, "").trim();
type Topup = { id: string; amount: number; method: string | null; reference: string | null; status: string; created_at: string };
const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");
const statusTone: Record<string, string> = { pending: "bg-amber-100 text-amber-700", verified: "bg-emerald-100 text-emerald-700", paid: "bg-emerald-100 text-emerald-700", rejected: "bg-rose-100 text-rose-700" };

function WalletPage() {
  const [balance, setBalance] = useState(0);
  const [txns, setTxns] = useState<Tx[]>([]);
  const [topups, setTopups] = useState<Topup[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("UPI");
  const [reference, setReference] = useState("");
  const [txnDate, setTxnDate] = useState("");
  const [receiptPath, setReceiptPath] = useState("");
  const [receiptName, setReceiptName] = useState("");
  const [uploadingRcpt, setUploadingRcpt] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [wAmt, setWAmt] = useState(""); const [wMethod, setWMethod] = useState("Bank Transfer"); const [wAcct, setWAcct] = useState(""); const [wBusy, setWBusy] = useState(false);
  const [win, setWin] = useState<{ enabled: boolean; days: number[]; open_today: boolean; next_open: string | null } | null>(null);
  const wOpen = !win || (win.enabled && win.open_today);

  async function load() {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setLoading(false); return; }
    const [w, t, tp, wd, win] = await Promise.all([
      supabase.from("wallets").select("balance").eq("user_id", u.user.id).maybeSingle(),
      supabase.from("wallet_transactions").select("id,direction,amount,balance_after,reason,created_at").order("created_at", { ascending: false }).limit(50),
      supabase.from("wallet_topups").select("id,amount,method,reference,status,created_at").order("created_at", { ascending: false }).limit(20),
      supabase.from("wallet_withdrawals").select("id,amount,method,account_details,status,requested_at").order("requested_at", { ascending: false }).limit(20),
      (supabase as any).rpc("withdrawal_window"),
    ]);
    setBalance(Number((w.data as any)?.balance ?? 0));
    setTxns((t.data as Tx[]) ?? []);
    setTopups((tp.data as Topup[]) ?? []);
    setWithdrawals((wd.data as any[]) ?? []);
    setWin((win.data as any) ?? null);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  // Payment QR managed by the admin (System Settings). Empty = no QR shown.
  const [qrUrl, setQrUrl] = useState<string>("");
  const [payMode, setPayMode] = useState<"qr" | "razorpay">("qr");
  useEffect(() => { (async () => {
    const { data } = await supabase.from("app_settings").select("value").eq("key", "wallet_qr_url").maybeSingle();
    setQrUrl(((data as any)?.value ?? "").trim());
  })(); }, []);

  const uploadReceipt = async (file: File) => {
    if (file.size > 50 * 1024 * 1024) { toast.error("File too large", { description: "Maximum size is 50 MB." }); return; }
    setUploadingRcpt(true);
    try {
      await ensureStaffSession();
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess?.session?.user?.id;
      if (!uid) { toast.error("Your session has expired", { description: "Please sign in again to upload the receipt." }); return; }
      const ext = (file.name.split(".").pop() || "bin").toLowerCase();
      const path = `${uid}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("wallet-receipts").upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (error) { toast.error("Upload failed", { description: error.message }); return; }
      setReceiptPath(path); setReceiptName(file.name); toast.success("Receipt uploaded");
    } finally { setUploadingRcpt(false); }
  };
  const [paying, setPaying] = useState(false);
  const payNow = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    setPaying(true);
    const r = await payWithRazorpay({ amount: amt, purpose: "wallet_topup", description: "BharatOne wallet recharge" });
    setPaying(false);
    if (r.status === "not_configured") return toast.info("Online payment not enabled yet", { description: "Razorpay isn't configured. Use the manual request below, or ask the admin to enable it." });
    if (r.status === "dismissed") return;
    if (r.status === "received") { toast.success("Payment received", { description: `₹${Number(r.amount || 0).toLocaleString("en-IN")} received. Your wallet will be credited once the accountant verifies it.` }); setAmount(""); load(); return; }
    toast.error("Payment failed", { description: r.message });
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (!txnDate) return toast.error("Select the date of transaction");
    if (!receiptPath) return toast.error("Please upload the transaction receipt");
    setSubmitting(true);
    const { error } = await supabase.rpc("request_wallet_topup", { p_amount: amt, p_method: method, p_reference: reference || null, p_txn_date: txnDate, p_receipt_path: receiptPath });
    setSubmitting(false);
    if (error) return toast.error("Request failed", { description: error.message });
    toast.success("Top-up request sent", { description: "Awaiting accountant verification." });
    setAmount(""); setReference(""); setTxnDate(""); setReceiptPath(""); setReceiptName(""); load();
  };

  const withdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(wAmt);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (amt > balance) return toast.error("Amount exceeds your wallet balance");
    if (!wAcct.trim()) return toast.error("Enter your payout account details");
    setWBusy(true);
    const { error } = await supabase.rpc("request_withdrawal", { p_amount: amt, p_method: wMethod, p_account: wAcct, p_note: null });
    setWBusy(false);
    if (error) {
      if (String(error.message).includes("WITHDRAWAL_CLOSED")) return toast.error("Withdrawals are closed today", { description: win?.days?.length ? `Allowed only on day ${win.days.join(", ")} of each month.` : "Please try again during the withdrawal window." });
      if (String(error.message).includes("INSUFFICIENT_FUNDS")) return toast.error("Insufficient balance");
      return toast.error("Request failed", { description: error.message });
    }
    toast.success("Withdrawal request sent", { description: "Awaiting approval." });
    setWAmt(""); setWAcct(""); load();
  };

  const pendingTotal = useMemo(() => topups.filter((t) => t.status === "pending").reduce((a, t) => a + Number(t.amount), 0), [topups]);

  return (
    <RetailerShell>
      <div className="space-y-5">
        <PageHeader icon={<Wallet className="h-5 w-5" />} title="Wallet" subtitle="Add funds, track balance and view all wallet transactions"
          actions={<button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-10 text-sm font-semibold hover:bg-muted"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button>} />

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl bg-saffron-gradient p-5 text-white shadow-elev lg:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-90">Available Balance</p>
            <p className="mt-1 font-display text-3xl font-extrabold">{loading ? "…" : inr(balance)}</p>
            {pendingTotal > 0 && <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold"><Clock3 className="h-3 w-3" /> {inr(pendingTotal)} pending verification</p>}
          </div>
          <SectionCard title="Add Funds" className="lg:col-span-2">
            {/* Step 1: amount. Step 2: payment mode. Step 3: mode-specific flow. */}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="1. Amount (₹) *"><Input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="500" /></Field>
              <Field label="2. Select payment mode *">
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setPayMode("qr")}
                    className={`h-10 rounded-lg border px-3 text-sm font-semibold transition ${payMode === "qr" ? "border-india-green bg-india-green/10 text-india-green" : "border-border bg-background text-muted-foreground hover:text-foreground"}`}>
                    QR / Bank Transfer
                  </button>
                  <button type="button" onClick={() => setPayMode("razorpay")}
                    className={`h-10 rounded-lg border px-3 text-sm font-semibold transition ${payMode === "razorpay" ? "border-india-green bg-india-green/10 text-india-green" : "border-border bg-background text-muted-foreground hover:text-foreground"}`}>
                    Pay Online (Razorpay)
                  </button>
                </div>
              </Field>
            </div>

            {payMode === "qr" ? (
              <form onSubmit={submit} className="mt-3">
                {qrUrl ? (
                  <div className="mb-3 flex flex-wrap items-center gap-4 rounded-xl border border-india-green/30 bg-india-green/5 p-3">
                    <img src={qrUrl} alt="Payment QR — scan with any UPI app" className="h-36 w-36 rounded-lg border border-border bg-white object-contain" />
                    <div className="min-w-[200px] flex-1 text-sm">
                      <p className="font-bold">3. Scan &amp; Pay</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Scan this QR with any UPI app and pay <b>{amount ? `₹${Number(amount).toLocaleString("en-IN")}` : "the amount"}</b>. Then fill in the payment details below and press <b>Request Top-up</b>.
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="mb-3 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">Pay by bank transfer / UPI to the company account, then fill in the details below. (The admin has not published a payment QR yet.)</p>
                )}
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Date of Transaction *"><Input type="date" value={txnDate} max={new Date().toISOString().slice(0,10)} onChange={(e) => setTxnDate(e.target.value)} /></Field>
                  <Field label="Method *"><Select value={method} onChange={(e) => setMethod(e.target.value)}><option>UPI</option><option>Bank Transfer</option><option>Cash Deposit</option><option>NEFT/IMPS</option></Select></Field>
                  <Field label="Transaction ID / UTR"><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Txn ref" /></Field>
                  <div className="sm:col-span-2"><Field label="Transaction Receipt *">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 h-10 text-sm font-semibold hover:bg-muted">{uploadingRcpt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {receiptPath ? "Replace receipt" : "Upload receipt"}<input type="file" accept="*/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadReceipt(e.target.files[0])} /></label>
                      {receiptName && <span className="truncate max-w-[180px] text-xs font-medium text-india-green">{receiptName}</span>}
                    </div>
                  </Field></div>
                  <div className="flex items-end justify-end">
                    <PrimaryButton type="submit" disabled={submitting || uploadingRcpt}>{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Request Top-up</PrimaryButton>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">The accountant verifies your payment against the receipt and transaction ID, then credits your wallet. You'll be notified once it's recharged.</p>
              </form>
            ) : (
              <div className="mt-3 rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-sm font-bold">3. Pay securely via Razorpay</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  You'll pay {amount ? <b>₹{Number(amount).toLocaleString("en-IN")}</b> : "the amount"} through Razorpay (UPI, card or netbanking).
                  The payment appears in your transaction history immediately, and after accountant verification your wallet is credited with the
                  <b> amount received after Razorpay's gateway charges are deducted</b>.
                </p>
                <button type="button" onClick={payNow} disabled={paying} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-india-green px-4 h-10 text-sm font-semibold text-white hover:bg-india-green/90 disabled:opacity-50">{paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />} Pay online (Razorpay)</button>
              </div>
            )}
          </SectionCard>
        </div>

        <SectionCard title="Withdraw Funds">
          {win && (
            <div className={`mb-3 flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-sm ${wOpen ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
              {wOpen ? <CalendarDays className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              <span className="font-semibold">{!win.enabled ? "Withdrawals are currently turned off." : win.open_today ? "Withdrawal window is open today." : "Withdrawals are closed today."}</span>
              {win.enabled && win.days?.length > 0 && <span>Allowed only on day <b>{win.days.join(", ")}</b> of each month.</span>}
              {win.enabled && !win.open_today && win.next_open && <span>Next open: <b>{new Date(win.next_open).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</b></span>}
            </div>
          )}
          <form onSubmit={withdraw} className={`grid gap-3 sm:grid-cols-4 ${wOpen ? "" : "pointer-events-none opacity-50"}`}>
            <Field label="Amount (₹)"><Input type="number" min="1" value={wAmt} onChange={(e) => setWAmt(e.target.value)} placeholder="500" disabled={!wOpen} /></Field>
            <Field label="Method"><Select value={wMethod} onChange={(e) => setWMethod(e.target.value)} disabled={!wOpen}><option>Bank Transfer</option><option>UPI</option><option>NEFT/IMPS</option></Select></Field>
            <div className="sm:col-span-2"><Field label="Payout account (A/C no, IFSC or UPI)"><Input value={wAcct} onChange={(e) => setWAcct(e.target.value)} placeholder="Account / UPI details" disabled={!wOpen} /></Field></div>
            <div className="sm:col-span-4 flex justify-end"><PrimaryButton type="submit" disabled={wBusy || !wOpen}>{wBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Request Withdrawal</PrimaryButton></div>
          </form>
          {withdrawals.length > 0 && (
            <div className="mt-3 overflow-x-auto"><table className="w-full text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="py-2">Date</th><th className="py-2">Amount</th><th className="py-2">Method</th><th className="py-2">Status</th></tr></thead>
              <tbody>{withdrawals.map((wd) => (<tr key={wd.id} className="border-t border-border"><td className="py-2 text-xs text-muted-foreground">{new Date(wd.requested_at).toLocaleString("en-IN")}</td><td className="py-2 font-semibold">{inr(wd.amount)}</td><td className="py-2">{wd.method ?? "—"}</td><td className="py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${statusTone[wd.status] ?? "bg-muted"}`}>{wd.status}</span></td></tr>))}</tbody>
            </table></div>
          )}
        </SectionCard>

        {topups.length > 0 && (
          <SectionCard title="Top-up Requests">
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="py-2">Date</th><th className="py-2">Amount</th><th className="py-2">Method</th><th className="py-2">Reference</th><th className="py-2">Status</th></tr></thead>
              <tbody>{topups.map((t) => (<tr key={t.id} className="border-t border-border"><td className="py-2 text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString("en-IN")}</td><td className="py-2 font-semibold">{inr(t.amount)}</td><td className="py-2">{t.method ?? "—"}</td><td className="py-2 text-xs">{t.reference ?? "—"}</td><td className="py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${statusTone[t.status]}`}>{t.status}</span></td></tr>))}</tbody>
            </table></div>
          </SectionCard>
        )}

        <SectionCard title="Recent Transactions">
          {loading ? <div className="py-6 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
            : txns.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No transactions yet.</p>
            : <div className="overflow-x-auto"><table className="w-full text-sm">
                <thead className="text-left text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="py-2 pr-3">Date</th><th className="py-2 pr-3">Time</th><th className="py-2 pr-3">Application ID</th><th className="py-2 pr-3">Service Name</th><th className="py-2 pr-3 text-right">Wallet Amount</th><th className="py-2 pr-3 text-right">Deducted Amount</th><th className="py-2 text-right">Balance</th></tr></thead>
                <tbody>{txns.map((t) => { const appId = appIdOf(t.reason); const svc = svcNameOf(t.reason) || (t.direction === "credit" ? "Wallet Credit" : "Debit"); const d = new Date(t.created_at); return (<tr key={t.id} className="border-t border-border">
                  <td className="py-2 pr-3 text-xs text-muted-foreground whitespace-nowrap">{d.toLocaleDateString("en-IN")}</td>
                  <td className="py-2 pr-3 text-xs text-muted-foreground whitespace-nowrap">{d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{appId || "—"}</td>
                  <td className="py-2 pr-3">{svc}</td>
                  <td className="py-2 pr-3 text-right font-semibold text-emerald-600">{t.direction === "credit" ? "+" + inr(t.amount) : "—"}</td>
                  <td className="py-2 pr-3 text-right font-semibold text-rose-500">{t.direction === "debit" ? "−" + inr(t.amount) : "—"}</td>
                  <td className="py-2 text-right text-muted-foreground">{inr(t.balance_after)}</td>
                </tr>); })}</tbody>
              </table></div>}
        </SectionCard>
      </div>
    </RetailerShell>
  );
}
