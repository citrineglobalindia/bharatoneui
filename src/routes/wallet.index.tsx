import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Wallet, Plus, Loader2, ArrowDownToLine, ArrowUpFromLine, Clock3, RefreshCw, Send, Upload, CalendarDays, Lock, QrCode, CreditCard, CheckCircle2 } from "lucide-react";
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
            <div className="space-y-4">
              {/* Steps 1 & 2 — amount and mode side by side */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Step 1 · Amount</p>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">₹</span>
                    <Input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="500" className="pl-7 font-semibold" />
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Step 2 · Payment mode</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setPayMode("qr")}
                      className={`flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border text-sm font-semibold transition ${payMode === "qr" ? "border-india-green bg-india-green text-white shadow-soft" : "border-border bg-background text-muted-foreground hover:text-foreground"}`}>
                      <QrCode className="h-4 w-4 shrink-0" /> QR / Bank
                    </button>
                    <button type="button" onClick={() => setPayMode("razorpay")}
                      className={`flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border text-sm font-semibold transition ${payMode === "razorpay" ? "border-india-green bg-india-green text-white shadow-soft" : "border-border bg-background text-muted-foreground hover:text-foreground"}`}>
                      <CreditCard className="h-4 w-4 shrink-0" /> Razorpay
                    </button>
                  </div>
                </div>
              </div>

              {payMode === "qr" ? (
                <form onSubmit={submit} className="space-y-4">
                  {/* Step 3 — scan & pay */}
                  <div className="rounded-xl border border-india-green/30 bg-india-green/5 p-4">
                    <p className="mb-3 text-xs font-bold uppercase tracking-wide text-india-green">Step 3 · Scan &amp; pay{amount ? ` ₹${Number(amount).toLocaleString("en-IN")}` : ""}</p>
                    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                      {qrUrl ? (
                        <img src={qrUrl} alt="Payment QR — scan with any UPI app" className="h-44 w-44 shrink-0 rounded-xl border border-border bg-white object-contain shadow-soft" />
                      ) : (
                        <div className="grid h-44 w-44 shrink-0 place-items-center rounded-xl border border-dashed border-border bg-card text-center text-[11px] text-muted-foreground">No QR published yet — pay to the company account</div>
                      )}
                      <ul className="space-y-2 text-xs text-muted-foreground">
                        <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-india-green" /> Open any UPI app (GPay, PhonePe, Paytm…) and scan the QR.</li>
                        <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-india-green" /> Pay exactly the amount you entered in Step 1.</li>
                        <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-india-green" /> Take a screenshot of the successful payment.</li>
                        <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-india-green" /> Fill in Step 4 below and press <b className="text-foreground">Request Top-up</b>.</li>
                      </ul>
                    </div>
                  </div>

                  {/* Step 4 — payment details */}
                  <div className="rounded-xl border border-border p-4">
                    <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Step 4 · Payment details</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Date of transaction *"><Input type="date" value={txnDate} max={new Date().toISOString().slice(0,10)} onChange={(e) => setTxnDate(e.target.value)} /></Field>
                      <Field label="Method *"><Select value={method} onChange={(e) => setMethod(e.target.value)}><option>UPI</option><option>Bank Transfer</option><option>Cash Deposit</option><option>NEFT/IMPS</option></Select></Field>
                      <Field label="Transaction ID / UTR"><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. 415522903211" /></Field>
                      <Field label="Transaction receipt *">
                        <div className="flex items-center gap-2">
                          <label className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-semibold hover:bg-muted">
                            {uploadingRcpt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            <span className="truncate">{receiptName || (receiptPath ? "Replace receipt" : "Upload receipt")}</span>
                            <input type="file" accept="*/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadReceipt(e.target.files[0])} />
                          </label>
                          {receiptPath && <CheckCircle2 className="h-5 w-5 shrink-0 text-india-green" />}
                        </div>
                      </Field>
                    </div>
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-[11px] text-muted-foreground">The accountant verifies the payment against your receipt and transaction ID, then credits your wallet.</p>
                      <PrimaryButton type="submit" disabled={submitting || uploadingRcpt} className="shrink-0">
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Request Top-up
                      </PrimaryButton>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="rounded-xl border border-india-green/30 bg-india-green/5 p-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wide text-india-green">Step 3 · Pay securely via Razorpay</p>
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-india-green" /> Pay {amount ? <b className="text-foreground">₹{Number(amount).toLocaleString("en-IN")}</b> : "the amount"} by UPI, card or netbanking — no forms to fill.</li>
                    <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-india-green" /> The payment shows in your transaction history immediately.</li>
                    <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-india-green" /> After accountant verification, your wallet is credited with the <b className="text-foreground">amount received after Razorpay's gateway charges</b>.</li>
                  </ul>
                  <button type="button" onClick={payNow} disabled={paying}
                    className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-india-green px-4 text-sm font-bold text-white hover:bg-india-green/90 disabled:opacity-50 sm:w-auto">
                    {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />} Pay ₹{amount ? Number(amount).toLocaleString("en-IN") : "—"} with Razorpay
                  </button>
                </div>
              )}
            </div>
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
