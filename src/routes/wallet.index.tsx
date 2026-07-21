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
  // No mode pre-selected: the QR (or Razorpay panel) appears only after the
  // retailer explicitly picks how they want to pay.
  const [payMode, setPayMode] = useState<"qr" | "razorpay" | null>(null);
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

        {/* Balance — slim full-width strip, no dead vertical space */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-saffron-gradient px-6 py-5 text-white shadow-elev">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/20"><Wallet className="h-6 w-6" /></div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider opacity-90">Available Balance</p>
              <p className="font-display text-3xl font-extrabold leading-tight">{loading ? "…" : inr(balance)}</p>
            </div>
          </div>
          {pendingTotal > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold"><Clock3 className="h-3.5 w-3.5" /> {inr(pendingTotal)} pending verification</span>
          )}
        </div>

        {/* Add Funds — full width, three-column stepper */}
        <SectionCard title="Add Funds">
          <div className="grid items-stretch gap-4 lg:grid-cols-3">
            {/* Column 1 — amount + mode */}
            <div className="flex flex-col gap-5 rounded-xl border border-border bg-muted/20 p-4">
              <div>
                <p className="flex items-center gap-2 text-sm font-bold"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-india-green text-[11px] font-bold text-white">1</span> Enter amount</p>
                <div className="relative mt-2">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base font-bold text-muted-foreground">₹</span>
                  <Input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="500" className="h-12 pl-8 text-lg font-bold" />
                </div>
              </div>
              <div>
                <p className="flex items-center gap-2 text-sm font-bold"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-india-green text-[11px] font-bold text-white">2</span> Choose payment mode</p>
                <div className="mt-2 space-y-2">
                  <button type="button" onClick={() => setPayMode("qr")}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${payMode === "qr" ? "border-india-green bg-india-green/5 ring-2 ring-india-green/20" : "border-border bg-card hover:border-india-green/40"}`}>
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${payMode === "qr" ? "bg-india-green text-white" : "bg-muted text-muted-foreground"}`}><QrCode className="h-5 w-5" /></span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold">QR / Bank Transfer</span>
                      <span className="block text-[11px] text-muted-foreground">Scan the company QR, then submit payment proof</span>
                    </span>
                    {payMode === "qr" && <CheckCircle2 className="ml-auto h-5 w-5 shrink-0 text-india-green" />}
                  </button>
                  <button type="button" onClick={() => setPayMode("razorpay")}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${payMode === "razorpay" ? "border-india-green bg-india-green/5 ring-2 ring-india-green/20" : "border-border bg-card hover:border-india-green/40"}`}>
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${payMode === "razorpay" ? "bg-india-green text-white" : "bg-muted text-muted-foreground"}`}><CreditCard className="h-5 w-5" /></span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold">Pay Online — Razorpay</span>
                      <span className="block text-[11px] text-muted-foreground">Instant UPI, card or netbanking — no proof needed</span>
                    </span>
                    {payMode === "razorpay" && <CheckCircle2 className="ml-auto h-5 w-5 shrink-0 text-india-green" />}
                  </button>
                </div>
              </div>
            </div>

            {payMode === null ? (
              <div className="grid place-items-center rounded-xl border-2 border-dashed border-border p-8 text-center lg:col-span-2">
                <div>
                  <QrCode className="mx-auto h-10 w-10 text-muted-foreground/40" />
                  <p className="mt-3 text-sm font-semibold text-muted-foreground">Choose how you want to pay</p>
                  <p className="mt-1 text-xs text-muted-foreground">Enter the amount and pick a payment mode on the left to continue.</p>
                </div>
              </div>
            ) : payMode === "qr" ? (
              <form onSubmit={submit} className="contents">
                {/* Column 2 — scan & pay */}
                <div className="flex flex-col items-center rounded-xl border border-india-green/30 bg-india-green/5 p-4">
                  <p className="mb-3 flex items-center gap-2 self-start text-sm font-bold"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-india-green text-[11px] font-bold text-white">3</span> Scan &amp; pay{amount ? ` ₹${Number(amount).toLocaleString("en-IN")}` : ""}</p>
                  {qrUrl ? (
                    <img src={qrUrl} alt="Payment QR — scan with any UPI app" className="w-full max-w-[240px] flex-1 rounded-xl border border-border bg-white object-contain p-1 shadow-soft" />
                  ) : (
                    <div className="grid w-full max-w-[240px] flex-1 place-items-center rounded-xl border border-dashed border-border bg-card p-4 text-center text-[11px] text-muted-foreground">No QR published yet — pay to the company account</div>
                  )}
                  <p className="mt-3 text-center text-[11px] text-muted-foreground">
                    Scan with any UPI app · pay <b className="text-foreground">exactly the Step-1 amount</b> · keep the payment screenshot.
                  </p>
                </div>

                {/* Column 3 — payment details */}
                <div className="flex flex-col rounded-xl border border-border p-4">
                  <p className="mb-3 flex items-center gap-2 text-sm font-bold"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-india-green text-[11px] font-bold text-white">4</span> Payment details</p>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Date *"><Input type="date" value={txnDate} max={new Date().toISOString().slice(0,10)} onChange={(e) => setTxnDate(e.target.value)} /></Field>
                      <Field label="Method *"><Select value={method} onChange={(e) => setMethod(e.target.value)}><option>UPI</option><option>Bank Transfer</option><option>Cash Deposit</option><option>NEFT/IMPS</option></Select></Field>
                    </div>
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
                  <div className="mt-auto pt-4">
                    <PrimaryButton type="submit" disabled={submitting || uploadingRcpt} className="w-full">
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Request Top-up
                    </PrimaryButton>
                    <p className="mt-2 text-center text-[11px] text-muted-foreground">Credited after accountant verification.</p>
                  </div>
                </div>
              </form>
            ) : (
              <div className="flex flex-col rounded-xl border border-india-green/30 bg-india-green/5 p-5 lg:col-span-2">
                <p className="flex items-center gap-2 text-sm font-bold"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-india-green text-[11px] font-bold text-white">3</span> Pay securely via Razorpay</p>
                <div className="my-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-border bg-card p-3 text-center">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">You pay</p>
                    <p className="mt-1 text-xl font-extrabold">{amount ? `₹${Number(amount).toLocaleString("en-IN")}` : "—"}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">UPI · card · netbanking</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-3 text-center">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Then</p>
                    <p className="mt-1 text-xl font-extrabold"><Clock3 className="mx-auto h-6 w-6 text-india-green" /></p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">Shows in history · accountant verifies</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-3 text-center">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Wallet gets</p>
                    <p className="mt-1 text-xl font-extrabold text-india-green">Net amount</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">After Razorpay gateway charges</p>
                  </div>
                </div>
                <div className="mt-auto">
                  <button type="button" onClick={payNow} disabled={paying}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-india-green px-6 text-sm font-bold text-white shadow-soft hover:bg-india-green/90 disabled:opacity-50">
                    {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />} Pay {amount ? `₹${Number(amount).toLocaleString("en-IN")}` : ""} with Razorpay
                  </button>
                </div>
              </div>
            )}
          </div>
        </SectionCard>

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
