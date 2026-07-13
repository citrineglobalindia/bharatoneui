import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Landmark, Fingerprint, Loader2, RefreshCw, IndianRupee, ShieldCheck,
  AlertTriangle, CheckCircle2, Usb, Search, Receipt,
} from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { discoverDevice, captureFingerprint, getLatLong, type RdDevice } from "@/lib/rdservice";
import { AEPS_BANKS } from "@/lib/aeps-banks";

export const Route = createFileRoute("/aeps")({
  head: () => ({ meta: [{ title: "AEPS Banking — BharatOne" }] }),
  component: AepsPage,
});

type Txn = {
  id: string; operation: string; amount: number; status: string;
  aadhaar_last4: string | null; rrn: string | null; message: string | null;
  balance: number | null; client_ref_id: string | null;
  commission: number; commission_settled: boolean; created_at: string;
};
type Status = {
  env: string; keys_set: boolean; user_code: string | null;
  onboarded: boolean; service_activated: boolean; ekyc_done: boolean;
  daily_kyc_done: boolean; can_transact: boolean; last_error: string | null;
};

const OPS = [
  { key: "cash_withdrawal", label: "Cash Withdrawal", needsAmount: true },
  { key: "balance_enquiry", label: "Balance Enquiry", needsAmount: false },
  { key: "mini_statement", label: "Mini Statement", needsAmount: false },
  { key: "aadhaar_pay", label: "Aadhaar Pay", needsAmount: true },
] as const;

const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");
const tone: Record<string, string> = {
  success: "bg-emerald-100 text-emerald-700",
  failed: "bg-rose-100 text-rose-700",
  pending: "bg-amber-100 text-amber-700",
  pending_reconciliation: "bg-amber-100 text-amber-800",
};

function AepsPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);

  // device
  const [device, setDevice] = useState<RdDevice | null>(null);
  const [scanning, setScanning] = useState(false);
  const [pid, setPid] = useState<string | null>(null);
  const [quality, setQuality] = useState<number | null>(null);

  // form
  const [op, setOp] = useState<string>("cash_withdrawal");
  const [aadhaar, setAadhaar] = useState("");
  const [mobile, setMobile] = useState("");
  const [bank, setBank] = useState("");
  const [bankQuery, setBankQuery] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  const needsAmount = OPS.find((o) => o.key === op)?.needsAmount ?? false;

  const call = useCallback(async (action: string, extra: Record<string, unknown> = {}) => {
    const { data, error } = await supabase.functions.invoke("aeps", { body: { action, ...extra } });
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
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [st, tx] = await Promise.all([
        call("config").catch(() => null),
        (supabase as any).rpc("aeps_my_transactions", { _limit: 25 }),
      ]);
      setStatus(st);
      setTxns((tx.data as Txn[]) ?? []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const connect = async () => {
    setScanning(true);
    const d = await discoverDevice();
    setScanning(false);
    if (!d) {
      return toast.error("No fingerprint scanner found", {
        description: "Start the device's RD service, plug the scanner in, and use Chrome or Edge.",
      });
    }
    setDevice(d);
    toast.success("Scanner connected", { description: d.info || `Port ${d.port}` });
  };

  const scan = async () => {
    let d = device;
    if (!d) {
      setScanning(true);
      d = await discoverDevice();
      setScanning(false);
      if (!d) return toast.error("No fingerprint scanner found. Start the RD service and try again.");
      setDevice(d);
    }
    setScanning(true);
    setPid(null); setQuality(null);
    const r = await captureFingerprint(d);
    setScanning(false);
    if (!r.ok || !r.pidData) return toast.error("Capture failed", { description: r.error });
    setPid(r.pidData);
    setQuality(r.quality ?? null);
    toast.success(`Fingerprint captured (quality ${r.quality ?? "?"})`);
  };

  // Daily biometric authentication — NPCI requires this once per day, per agent.
  const dailyAuth = async () => {
    if (!pid) return toast.error("Scan the retailer's fingerprint first");
    setBusy(true);
    try {
      const latlong = await getLatLong();
      await call("kyc_daily", { piddata: pid, latlong });
      toast.success("Daily authentication complete");
      setPid(null); setQuality(null);
      load();
    } catch (e: any) {
      toast.error("Authentication failed", { description: e.message });
    } finally { setBusy(false); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{12}$/.test(aadhaar)) return toast.error("Enter the customer's 12-digit Aadhaar number");
    if (!/^\d{10}$/.test(mobile)) return toast.error("Enter the customer's 10-digit mobile number");
    if (!bank) return toast.error("Select the customer's bank");
    if (needsAmount && !(Number(amount) > 0)) return toast.error("Enter a valid amount");
    if (!pid) return toast.error("Capture the customer's fingerprint");

    setBusy(true); setResult(null);
    try {
      const latlong = await getLatLong();
      const r = await call("transact", {
        operation: op,
        aadhaar,
        customer_mobile: mobile,
        bank_code: bank,
        amount: needsAmount ? Number(amount) : 0,
        piddata: pid,
        latlong,
        notify_customer: true,
      });
      setResult(r);
      toast.success(r.message || "Transaction successful");
      setAmount(""); setPid(null); setQuality(null);
      load();
    } catch (e: any) {
      if (String(e.message).includes("biometric authentication")) {
        toast.error("Daily authentication needed", { description: "Scan your own fingerprint and press “Daily authentication”." });
      } else {
        toast.error("Transaction failed", { description: e.message });
      }
      load();
    } finally { setBusy(false); }
  };

  const recheck = async (t: Txn) => {
    if (!t.client_ref_id) return;
    try {
      const r = await call("inquire", { client_ref_id: t.client_ref_id });
      toast.success(`Status: ${r.status}`, { description: r.message });
      load();
    } catch (e: any) { toast.error("Could not check", { description: e.message }); }
  };

  const banks = useMemo(() => {
    const q = bankQuery.trim().toLowerCase();
    const list = q ? AEPS_BANKS.filter((b) => b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q)) : AEPS_BANKS;
    return list.slice(0, 80);
  }, [bankQuery]);

  const blocked = status && !status.can_transact;

  return (
    <RetailerShell>
      <div className="space-y-5">
        <PageHeader
          icon={<Landmark className="h-5 w-5" />}
          title="AEPS Banking"
          subtitle="Aadhaar-enabled cash withdrawal, balance enquiry, mini statement and Aadhaar Pay"
          actions={
            <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-10 text-sm font-semibold hover:bg-muted">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          }
        />

        {/* Readiness */}
        {status && !status.keys_set && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>AEPS is not configured yet. An administrator must set the Eko API keys before transactions can be made.</span>
          </div>
        )}

        {status?.keys_set && blocked && (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <p className="mb-3 flex items-center gap-2 text-sm font-bold"><ShieldCheck className="h-4 w-4 text-india-green" /> Before you can transact</p>
            <div className="space-y-2 text-sm">
              <Step done={status.onboarded} label="Retailer registered with the banking partner" />
              <Step done={status.service_activated} label="AEPS service activated" />
              <Step done={status.ekyc_done} label="One-time biometric eKYC completed" />
              <Step done={status.daily_kyc_done} label="Today's biometric authentication" />
            </div>
            {status.onboarded && status.service_activated && status.ekyc_done && !status.daily_kyc_done && (
              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground flex-1">
                  NPCI requires you to authenticate with your own fingerprint once each day before serving customers.
                </p>
                <button onClick={scan} disabled={scanning} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 h-9 text-xs font-semibold hover:bg-muted disabled:opacity-50">
                  {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Fingerprint className="h-3.5 w-3.5" />} Scan my finger
                </button>
                <button onClick={dailyAuth} disabled={!pid || busy} className="inline-flex items-center gap-1.5 rounded-lg bg-india-green px-3 h-9 text-xs font-semibold text-white disabled:opacity-50">
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />} Daily authentication
                </button>
              </div>
            )}
            {(!status.onboarded || !status.service_activated || !status.ekyc_done) && (
              <p className="mt-3 text-xs text-muted-foreground">
                Contact BharatOne support to complete your AEPS onboarding and one-time eKYC.
              </p>
            )}
            {status.last_error && <p className="mt-2 text-xs text-rose-600">Last error: {status.last_error}</p>}
          </div>
        )}

        {/* Scanner */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
          <Usb className={`h-5 w-5 ${device ? "text-emerald-600" : "text-muted-foreground"}`} />
          <div className="flex-1 min-w-[180px]">
            <p className="text-sm font-semibold">{device ? "Scanner connected" : "Fingerprint scanner"}</p>
            <p className="text-xs text-muted-foreground">{device ? (device.info || `127.0.0.1:${device.port}`) : "Mantra, Morpho, Startek and other UIDAI-registered devices"}</p>
          </div>
          {pid && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-700">
              <CheckCircle2 className="h-3 w-3" /> Captured{quality != null ? ` · quality ${quality}` : ""}
            </span>
          )}
          <button onClick={connect} disabled={scanning} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-9 text-xs font-semibold hover:bg-muted disabled:opacity-50">
            {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Detect device
          </button>
        </div>

        {/* Transaction */}
        <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="mb-4 flex flex-wrap gap-1.5">
            {OPS.map((o) => (
              <button key={o.key} type="button" onClick={() => { setOp(o.key); setResult(null); }}
                className={`rounded-full px-3 h-9 text-xs font-semibold transition ${op === o.key ? "bg-india-green text-white" : "border border-border bg-card hover:bg-muted"}`}>
                {o.label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Customer Aadhaar number *">
              <input inputMode="numeric" maxLength={12} value={aadhaar}
                onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, ""))}
                placeholder="12-digit Aadhaar" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none" />
            </Field>
            <Field label="Customer mobile number *">
              <input inputMode="numeric" maxLength={10} value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                placeholder="10-digit mobile" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none" />
            </Field>
            <Field label="Customer's bank *">
              <div className="relative">
                <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                <input value={bankQuery} onChange={(e) => setBankQuery(e.target.value)}
                  placeholder="Search bank…" className="mb-1 h-10 w-full rounded-lg border border-border bg-background pl-8 pr-3 text-sm outline-none" />
              </div>
              <select value={bank} onChange={(e) => setBank(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none">
                <option value="">Select bank</option>
                {banks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
              </select>
            </Field>
            {needsAmount && (
              <Field label="Amount (₹) *">
                <div className="relative">
                  <IndianRupee className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                  <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                    placeholder="500" className="h-10 w-full rounded-lg border border-border bg-background pl-8 pr-3 text-sm outline-none" />
                </div>
              </Field>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            <button type="button" onClick={scan} disabled={scanning}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 h-10 text-sm font-semibold hover:bg-muted disabled:opacity-50">
              {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
              {pid ? "Re-scan customer's finger" : "Scan customer's finger"}
            </button>
            <button type="submit" disabled={busy || !pid || !!blocked}
              className="inline-flex items-center gap-1.5 rounded-lg bg-saffron-gradient px-5 h-10 text-sm font-bold text-white shadow-elev disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Landmark className="h-4 w-4" />} Proceed
            </button>
          </div>
          <p className="mt-2 text-right text-[11px] text-muted-foreground">
            The fingerprint is encrypted by the scanner itself and is never stored by BharatOne.
          </p>
        </form>

        {/* Result */}
        {result?.ok && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="flex items-center gap-2 text-sm font-bold text-emerald-800"><Receipt className="h-4 w-4" /> {result.message || "Transaction successful"}</p>
            <div className="mt-2 grid gap-1 text-sm text-emerald-900 sm:grid-cols-2">
              {result.balance != null && <p>Account balance: <b>{inr(Number(result.balance))}</b></p>}
              {result.amount > 0 && <p>Amount: <b>{inr(result.amount)}</b></p>}
              {result.rrn && <p>RRN: <b>{result.rrn}</b></p>}
              {result.client_ref_id && <p>Reference: <b>{result.client_ref_id}</b></p>}
            </div>
            {Array.isArray(result.statement) && result.statement.length > 0 && (
              <div className="mt-3 overflow-x-auto rounded-lg bg-white p-2">
                <table className="w-full text-xs">
                  <thead className="text-left text-muted-foreground"><tr><th className="p-1">Date</th><th className="p-1">Narration</th><th className="p-1 text-right">Amount</th></tr></thead>
                  <tbody>
                    {result.statement.map((s: any, i: number) => (
                      <tr key={i} className="border-t border-border">
                        <td className="p-1 whitespace-nowrap">{s.date ?? s.txn_date ?? "—"}</td>
                        <td className="p-1">{s.narration ?? s.description ?? "—"}</td>
                        <td className="p-1 text-right font-semibold">{s.amount ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* History */}
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Operation</th>
                <th className="px-3 py-2">Aadhaar</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">RRN</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Commission</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
              ) : txns.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">No AEPS transactions yet.</td></tr>
              ) : txns.map((t) => (
                <tr key={t.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString("en-IN")}</td>
                  <td className="px-3 py-2 capitalize">{t.operation.replace(/_/g, " ")}</td>
                  <td className="px-3 py-2 font-mono text-xs">{t.aadhaar_last4 ? `XXXX XXXX ${t.aadhaar_last4}` : "—"}</td>
                  <td className="px-3 py-2 font-semibold">{t.amount > 0 ? inr(t.amount) : t.balance != null ? inr(t.balance) : "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{t.rrn ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${tone[t.status] ?? "bg-muted"}`}>
                      {t.status.replace(/_/g, " ")}
                    </span>
                    {t.status === "pending_reconciliation" && (
                      <button onClick={() => recheck(t)} className="ml-2 text-[11px] font-semibold text-india-green underline">Check</button>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {t.commission > 0 ? <span className={t.commission_settled ? "font-semibold text-emerald-600" : "text-muted-foreground"}>{inr(t.commission)}</span> : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </RetailerShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Step({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {done
        ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
        : <span className="h-4 w-4 shrink-0 rounded-full border-2 border-muted-foreground/40" />}
      <span className={done ? "text-muted-foreground line-through" : "font-medium"}>{label}</span>
    </div>
  );
}
