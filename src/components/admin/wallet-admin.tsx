import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Wallet, CheckCircle2, XCircle, Loader2, RefreshCw, Plus, Download, ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

type Topup = {
  id: string; user_id: string; amount: number; method: string | null; reference: string | null; note: string | null;
  status: string; created_at: string; txn_date: string | null; receipt_path: string | null;
  source: "manual" | "razorpay"; fee?: number | null; net_amount?: number | null;
};
type RUser = { id: string; name: string; email: string };
type Account = { user_id: string; jsko_id: string | null; name: string; balance: number };
const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");
const tone: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700", verified: "bg-emerald-100 text-emerald-700", rejected: "bg-rose-100 text-rose-700",
  paid: "bg-amber-100 text-amber-700", credited: "bg-emerald-100 text-emerald-700", failed: "bg-rose-100 text-rose-700",
};
const statusText: Record<string, string> = { paid: "received", credited: "approved", verified: "approved" };
// pending = awaiting accountant action; approved = credited; rejected = declined/failed.
const bucketOf = (t: Topup): "pending" | "approved" | "rejected" =>
  t.status === "pending" || t.status === "paid" ? "pending" : t.status === "verified" || t.status === "credited" ? "approved" : "rejected";

// allowMainRecharge: only the admin portal may add funds to the main company account.
export function WalletAdmin({ allowMainRecharge = false }: { allowMainRecharge?: boolean } = {}) {
  const [rows, setRows] = useState<Topup[]>([]);
  const [users, setUsers] = useState<Record<string, RUser>>({});
  const [retailers, setRetailers] = useState<RUser[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [balances, setBalances] = useState<{ user_id: string; balance: number }[]>([]);
  const [mainBal, setMainBal] = useState(0);
  const [rcAmt, setRcAmt] = useState(""); const [rcBusy, setRcBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [tuUser, setTuUser] = useState(""); const [tuAmt, setTuAmt] = useState(""); const [tuNote, setTuNote] = useState(""); const [tuBusy, setTuBusy] = useState(false);

  /* ── Bulk top-up ──────────────────────────────────────────────────────
     CSV of jsko_id + amount (+ optional note). Each parsed row is shown with
     the retailer's CURRENT balance and the balance it will become, then the
     whole batch is confirmed with an OTP mailed to the accountant and executed
     all-or-nothing through the same audited path as a single Direct top-up. */
  type BulkRow = { jsko: string; amount: number; note: string; user_id?: string; name?: string; balance?: number; error?: string };
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([]);
  const [bulkOtpSent, setBulkOtpSent] = useState(false);
  const [bulkCode, setBulkCode] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkDone, setBulkDone] = useState<{ count: number; total: number } | null>(null);

  const downloadSample = () => {
    const csv = "jsko_id,amount,note\nJSKOBH004,500,August incentive\nJSK0132,250,\n";
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a"); a.href = url; a.download = "bulk-topup-sample.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const parseBulkFile = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const rows: BulkRow[] = [];
    for (const line of lines) {
      const [c0, c1, ...rest] = line.split(",");
      const jsko = (c0 ?? "").trim();
      if (!jsko || /^jsko/i.test(jsko) && !/\d/.test(c1 ?? "")) continue; // header
      const amount = Number((c1 ?? "").trim());
      const note = rest.join(",").trim();
      // Match against the same account list the single top-up uses.
      const acc = accounts.find((a) => (a.jsko_id ?? "").toLowerCase() === jsko.toLowerCase());
      rows.push({
        jsko, amount, note,
        user_id: acc?.user_id, name: acc?.name, balance: acc?.balance,
        error: !acc ? "JSKO ID not found" : !Number.isFinite(amount) || amount <= 0 ? "Invalid amount" : undefined,
      });
    }
    if (rows.length === 0) return toast.error("No rows found", { description: "Use the sample file format: jsko_id, amount, note." });
    if (rows.length > 200) return toast.error("Too many rows", { description: "A batch is limited to 200 rows — split the file." });
    setBulkRows(rows); setBulkOtpSent(false); setBulkCode(""); setBulkDone(null);
  };

  const bulkValid = bulkRows.filter((r) => !r.error);
  const bulkTotal = bulkValid.reduce((a, r) => a + r.amount, 0);

  const sendBulkOtp = async () => {
    setBulkBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const email = u.user?.email;
      if (!email) return toast.error("No email on your account");
      const { error } = await supabase.functions.invoke("send-otp", { body: { channel: "email", target: email } });
      if (error) return toast.error("Could not send OTP", { description: error.message });
      setBulkOtpSent(true);
      toast.success("OTP sent", { description: `Check ${email} — the code confirms this batch.` });
    } finally { setBulkBusy(false); }
  };

  const initiateBulk = async () => {
    if (bulkValid.length === 0) return toast.error("No valid rows to process");
    if (!/^\d{6}$/.test(bulkCode.trim())) return toast.error("Enter the 6-digit OTP");
    setBulkBusy(true);
    try {
      const payload = bulkValid.map((r) => ({ user_id: r.user_id, amount: r.amount, note: r.note || null }));
      const { data, error } = await (supabase.rpc as any)("accountant_bulk_topup", { p_rows: payload, p_code: bulkCode.trim() });
      if (error) return toast.error("Bulk top-up failed — nothing was credited", { description: error.message });
      const res = data as { count: number; total: number };
      setBulkDone({ count: res.count, total: Number(res.total) });
      toast.success(`Bulk top-up successful — ${res.count} wallet(s) credited ₹${Number(res.total).toLocaleString("en-IN")}`);
      load();
    } finally { setBulkBusy(false); }
  };

  async function load() {
    setLoading(true);
    try {
      await ensureStaffSession();
      const [t, rz, acc, w, cb] = await Promise.all([
        supabase.from("wallet_topups").select("*").order("created_at", { ascending: false }),
        (supabase as any).from("razorpay_payments")
          .select("id,user_id,amount,fee,net_amount,status,payment_id,wallet_recharge_id,created_at")
          .eq("purpose", "wallet_topup").in("status", ["paid", "credited", "failed"])
          .order("created_at", { ascending: false }).limit(300),
        (supabase as any).rpc("wallet_topup_accounts"),
        supabase.from("wallets").select("user_id,balance"),
        supabase.rpc("company_balance"),
      ]);
      setMainBal(Number((cb.data as any) ?? 0));
      // Merge manual top-up requests with online (Razorpay) wallet payments so
      // the accountant sees every recharge request in one list.
      const manual: Topup[] = ((t.data as any[]) ?? []).map((r) => ({ ...r, source: "manual" as const }));
      const online: Topup[] = ((rz.data as any[]) ?? []).map((r) => ({
        id: r.id, user_id: r.user_id, amount: Number(r.amount), method: "Razorpay (online)",
        reference: r.payment_id ?? null, note: r.wallet_recharge_id ?? null, status: r.status,
        created_at: r.created_at, txn_date: r.created_at, receipt_path: null,
        source: "razorpay" as const, fee: r.fee, net_amount: r.net_amount,
      }));
      const merged = [...manual, ...online].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRows(merged);
      setBalances((w.data as any[]) ?? []);
      // Retailer accounts (JSKO IDs) available for direct top-up — accountant/admin-safe RPC.
      const list = (acc.data as Account[]) ?? [];
      setAccounts(list);
      const map: Record<string, RUser> = {}; const rets: RUser[] = [];
      list.forEach((a) => { const label = a.jsko_id ? `${a.jsko_id} · ${a.name}` : a.name; const ru = { id: a.user_id, name: label, email: "" }; map[a.user_id] = ru; rets.push(ru); });
      // Resolve names for payers missing from the accounts list (e.g. no wallet yet).
      const missing = Array.from(new Set(merged.map((r) => r.user_id).filter((id) => id && !map[id])));
      if (missing.length > 0) {
        const { data: extra } = await (supabase as any).rpc("staff_user_names", { _ids: missing });
        for (const u of (extra as any[]) ?? []) if (!map[u.id]) map[u.id] = { id: u.id, name: u.name || "Retailer", email: "" };
      }
      setUsers(map); setRetailers(rets);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const viewReceipt = async (path: string) => {
    const { data } = await supabase.storage.from("wallet-receipts").createSignedUrl(path, 3600);
    if (data) window.open(data.signedUrl, "_blank");
  };
  const act = async (t: Topup, approve: boolean) => {
    setBusy(t.id);
    if (t.source === "razorpay") {
      // Online payment: credit the NET amount (gross - Razorpay fee).
      const { data, error } = await (supabase as any).rpc("accountant_confirm_razorpay", { p_payment: t.id });
      setBusy(null);
      if (error) return toast.error("Failed", { description: error.message });
      const credited = (data as any)?.credited;
      toast.success("Wallet recharged", { description: credited != null ? `${inr(Number(credited))} credited (net of gateway fee).` : "Credited." });
      return load();
    }
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

  const pendingTotal = useMemo(() => rows.filter((r) => bucketOf(r) === "pending").reduce((a, r) => a + Number(r.amount), 0), [rows]);
  const floatTotal = useMemo(() => balances.reduce((a, b) => a + Number(b.balance), 0), [balances]);
  const filtered = useMemo(() => tab === "all" ? rows : rows.filter((r) => bucketOf(r) === tab), [rows, tab]);
  const counts = useMemo(() => ({
    pending: rows.filter((r) => bucketOf(r) === "pending").length,
    approved: rows.filter((r) => bucketOf(r) === "approved").length,
    rejected: rows.filter((r) => bucketOf(r) === "rejected").length,
    all: rows.length,
  }), [rows]);

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
          {allowMainRecharge && (
            <form onSubmit={recharge} className="mt-2 flex gap-2">
              <input type="number" min="1" className="h-8 w-24 rounded-lg border border-border bg-background px-2 text-sm" placeholder="Amount" value={rcAmt} onChange={(e) => setRcAmt(e.target.value)} />
              <Button type="submit" size="sm" variant="outline" disabled={rcBusy}>{rcBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Recharge</Button>
            </form>
          )}
          <p className="mt-1 text-[10px] text-muted-foreground">{allowMainRecharge ? "Approvals & top-ups deduct from this." : "Approvals & top-ups deduct from this. Only an admin can add funds."}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Retailer wallet float</p><p className="text-2xl font-extrabold">{inr(floatTotal)}</p><p className="text-xs text-muted-foreground">{balances.length} wallet(s) · {rows.filter((r) => bucketOf(r) === "pending").length} pending ({inr(pendingTotal)})</p></div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="mb-2 flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-bold"><Plus className="h-4 w-4 text-india-green" /> Direct top-up</p>
            <button onClick={() => { setBulkOpen(true); setBulkRows([]); setBulkOtpSent(false); setBulkCode(""); setBulkDone(null); }} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 h-7 text-[11px] font-bold hover:bg-muted"><Download className="h-3 w-3 rotate-180" /> Bulk top-up</button>
          </div>
          <form onSubmit={directTopup} className="space-y-2">
            <AccountPicker accounts={accounts} value={tuUser} onChange={setTuUser} />
            {/* The note state and the RPC's p_note parameter existed from day
                one — this input just was never rendered, so every direct top-up
                landed in the ledger with no explanation of why it was made. */}
            <input
              type="text"
              maxLength={200}
              className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
              placeholder="Remarks (e.g. reason for top-up)"
              value={tuNote}
              onChange={(e) => setTuNote(e.target.value)}
            />
            <div className="flex gap-2"><input type="number" min="1" className="h-9 flex-1 rounded-lg border border-border bg-background px-2 text-sm" placeholder="Amount" value={tuAmt} onChange={(e) => setTuAmt(e.target.value)} /><Button type="submit" disabled={tuBusy} className="bg-india-green text-white hover:bg-india-green/90">{tuBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Top-up"}</Button></div>
          </form>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">{(["pending", "approved", "rejected", "all"] as const).map((k) => <button key={k} onClick={() => setTab(k)} className={`rounded-full px-3 h-8 text-xs font-semibold capitalize transition ${tab === k ? "bg-india-green text-white" : "border border-border bg-card hover:bg-muted"}`}>{k === "all" ? "All" : k} ({counts[k]})</button>)}</div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2">Requested</th><th className="px-3 py-2">Retailer</th><th className="px-3 py-2">Amount</th><th className="px-3 py-2">Txn Date</th><th className="px-3 py-2">Method</th><th className="px-3 py-2">Receipt</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Action</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={8} className="px-3 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
              : filtered.length === 0 ? <tr><td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">No requests.</td></tr>
              : filtered.map((t) => (<tr key={t.id} className="border-t border-border">
                <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{new Date(t.created_at).toLocaleString("en-IN")}</td>
                <td className="px-3 py-2">{users[t.user_id]?.name ?? "—"}<div className="text-[11px] text-muted-foreground">{users[t.user_id]?.email}</div></td>
                <td className="px-3 py-2">
                  <p className="font-semibold">{inr(t.amount)}</p>
                  {t.source === "razorpay" && t.fee != null && <p className="text-[10px] text-muted-foreground">net {inr(t.net_amount ?? t.amount)} · fee {inr(t.fee)}</p>}
                </td>
                <td className="px-3 py-2 text-xs">{t.txn_date ? new Date(t.txn_date).toLocaleDateString("en-IN") : "—"}</td>
                <td className="px-3 py-2">{t.method ?? "—"}{t.reference ? <div className="max-w-[160px] truncate font-mono text-[11px] text-muted-foreground" title={t.reference}>{t.reference}</div> : null}</td>
                <td className="px-3 py-2">{t.receipt_path ? <button onClick={() => viewReceipt(t.receipt_path!)} className="inline-flex items-center gap-1 text-xs font-semibold text-india-green hover:underline"><Download className="h-3.5 w-3.5" /> View</button> : <span className="text-xs text-muted-foreground">—</span>}</td>
                <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${tone[t.status] ?? "bg-muted"}`}>{statusText[t.status] ?? t.status}</span>{t.source === "razorpay" && t.note ? <div className="font-mono text-[10px] font-semibold text-india-green">{t.note}</div> : null}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  {bucketOf(t) === "pending" ? <>
                    <Button size="sm" disabled={busy === t.id} onClick={() => act(t, true)} className="mr-2 bg-india-green text-white hover:bg-india-green/90">{busy === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} {t.source === "razorpay" ? `Credit ${inr(t.net_amount ?? t.amount)}` : "Verify"}</Button>
                    {t.source === "manual" && <Button size="sm" variant="outline" disabled={busy === t.id} onClick={() => act(t, false)} className="text-rose-600"><XCircle className="h-3.5 w-3.5" /> Reject</Button>}
                  </> : <span className="text-xs text-muted-foreground">—</span>}
                </td>
              </tr>))}
          </tbody>
        </table>
      </div>

      {/* ── Bulk top-up dialog ─────────────────────────────────────────── */}
      {bulkOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-foreground/50 p-4" onClick={() => setBulkOpen(false)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-elev" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">Bulk top-up</p>
              <button onClick={() => setBulkOpen(false)}><XCircle className="h-5 w-5 text-muted-foreground" /></button>
            </div>

            {bulkDone ? (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
                <p className="mt-2 text-lg font-extrabold text-emerald-800">Bulk top-up successful</p>
                <p className="mt-1 text-sm text-emerald-700">{bulkDone.count} wallet(s) credited · total {inr(bulkDone.total)}</p>
                <p className="mt-2 text-xs text-muted-foreground">Every credit is recorded in the wallet ledger and the top-ups list, and each retailer has been notified.</p>
                <Button className="mt-4" variant="outline" onClick={() => setBulkOpen(false)}>Close</Button>
              </div>
            ) : (
              <>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button onClick={downloadSample} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-9 text-xs font-semibold hover:bg-muted"><Download className="h-3.5 w-3.5" /> Download sample CSV</button>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-india-green px-3 h-9 text-xs font-semibold text-white hover:bg-india-green/90">
                    Upload CSV
                    <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const fl = e.target.files?.[0]; if (fl) parseBulkFile(fl); e.target.value = ""; }} />
                  </label>
                  <span className="text-[11px] text-muted-foreground">Columns: jsko_id, amount, note (optional) · max 200 rows</span>
                </div>

                {bulkRows.length > 0 && (
                  <>
                    <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-border">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-muted/80 text-left text-[10px] uppercase tracking-wide text-muted-foreground backdrop-blur">
                          <tr><th className="px-3 py-1.5">JSKO ID</th><th className="px-3 py-1.5">Retailer</th><th className="px-3 py-1.5 text-right">Current balance</th><th className="px-3 py-1.5 text-right">Top-up</th><th className="px-3 py-1.5 text-right">After</th></tr>
                        </thead>
                        <tbody>
                          {bulkRows.map((r, i) => (
                            <tr key={i} className={`border-t border-border ${r.error ? "bg-rose-50" : ""}`}>
                              <td className="px-3 py-1.5 font-mono text-xs font-semibold">{r.jsko}</td>
                              <td className="px-3 py-1.5">{r.error ? <span className="text-xs font-semibold text-rose-600">{r.error}</span> : r.name}</td>
                              <td className="px-3 py-1.5 text-right text-xs">{r.error ? "—" : inr(r.balance ?? 0)}</td>
                              <td className="px-3 py-1.5 text-right text-xs font-bold">{Number.isFinite(r.amount) ? inr(r.amount) : "—"}</td>
                              <td className="px-3 py-1.5 text-right text-xs font-bold text-india-green">{r.error ? "—" : inr((r.balance ?? 0) + r.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                      <p><b>{bulkValid.length}</b> of {bulkRows.length} row(s) valid · total <b className="text-india-green">{inr(bulkTotal)}</b> · main account holds {inr(mainBal)}</p>
                      {bulkRows.some((r) => r.error) && <p className="text-xs font-semibold text-rose-600">Rows with errors will not be processed — fix the file to include them.</p>}
                    </div>

                    {/* OTP confirmation: the code goes to the signed-in
                        accountant's email and is checked inside the database
                        function, single-use, before any money moves. */}
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                      {!bulkOtpSent ? (
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-amber-900">Confirm with a one-time password sent to your email.</p>
                          <Button size="sm" disabled={bulkBusy || bulkValid.length === 0} onClick={sendBulkOtp} className="bg-amber-500 text-white hover:bg-amber-600">{bulkBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Send OTP</Button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <input inputMode="numeric" maxLength={6} className="h-10 w-32 rounded-lg border border-border bg-background px-3 text-center font-mono text-lg tracking-widest outline-none" placeholder="......" value={bulkCode} onChange={(e) => setBulkCode(e.target.value.replace(/\D/g, ""))} />
                          <Button disabled={bulkBusy} onClick={initiateBulk} className="bg-india-green text-white hover:bg-india-green/90">{bulkBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />} Initiate bulk top-up</Button>
                          <button onClick={sendBulkOtp} disabled={bulkBusy} className="text-xs font-semibold text-muted-foreground hover:text-foreground">Resend OTP</button>
                          <p className="w-full text-[10px] text-muted-foreground">All-or-nothing: if any row fails, nothing is credited.</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Searchable account picker for Direct Top-up — filters by JSKO ID / name, handles thousands of rows.
function AccountPicker({ accounts, value, onChange }: { accounts: Account[]; value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  const selected = accounts.find((a) => a.user_id === value) || null;
  const s = q.trim().toLowerCase();
  const results = useMemo(() => {
    const base = s ? accounts.filter((a) => `${a.jsko_id ?? ""} ${a.name}`.toLowerCase().includes(s)) : accounts;
    return base.slice(0, 60);
  }, [accounts, s]);
  const label = (a: Account) => (a.jsko_id ? `${a.jsko_id} · ${a.name}` : a.name);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30">
        <span className={`truncate ${selected ? "font-medium" : "text-muted-foreground"}`}>{selected ? label(selected) : "Select account"}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-lg border border-border bg-card shadow-elev">
          <div className="flex items-center gap-1.5 border-b border-border px-2 py-1.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search JSKO ID or name…" className="h-7 w-full bg-transparent text-sm outline-none" />
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {accounts.length === 0 ? <p className="px-3 py-3 text-center text-xs text-muted-foreground">No retailer accounts yet.</p>
              : results.length === 0 ? <p className="px-3 py-3 text-center text-xs text-muted-foreground">No match for “{q}”.</p>
              : results.map((a) => (
                <button key={a.user_id} type="button" onClick={() => { onChange(a.user_id); setOpen(false); setQ(""); }} className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted ${a.user_id === value ? "bg-muted" : ""}`}>
                  <span className="min-w-0 truncate"><span className="font-mono font-semibold">{a.jsko_id || "—"}</span> <span className="text-muted-foreground">· {a.name}</span></span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{inr(a.balance)}</span>
                </button>
              ))}
            {!s && accounts.length > 60 && <p className="px-3 py-1.5 text-center text-[11px] text-muted-foreground">Showing 60 of {accounts.length} — type to search.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
