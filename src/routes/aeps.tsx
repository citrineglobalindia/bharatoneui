import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Landmark, Fingerprint, Loader2, RefreshCw, Info, IndianRupee } from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/aeps")({
  head: () => ({ meta: [{ title: "AEPS Banking — BharatOne" }] }),
  component: AepsPage,
});

type Txn = {
  id: string; operation: string; amount: number; status: string;
  aadhaar_last4: string | null; rrn: string | null; message: string | null;
  commission: number; commission_settled: boolean; created_at: string;
};

const OPS: { key: string; label: string; needsAmount: boolean }[] = [
  { key: "balance_enquiry", label: "Balance Enquiry", needsAmount: false },
  { key: "cash_withdrawal", label: "Cash Withdrawal", needsAmount: true },
  { key: "mini_statement", label: "Mini Statement", needsAmount: false },
  { key: "aadhaar_pay", label: "Aadhaar Pay", needsAmount: true },
];
// A short starter list — replace/extend with the provider's full bank IIN list on integration.
const BANKS: { iin: string; name: string }[] = [
  { iin: "", name: "Select bank" },
  { iin: "508505", name: "State Bank of India" },
  { iin: "607094", name: "Bank of Baroda" },
  { iin: "606985", name: "Canara Bank" },
  { iin: "608117", name: "Punjab National Bank" },
  { iin: "636103", name: "Union Bank of India" },
];

const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");
const opLabel = (k: string) => OPS.find((o) => o.key === k)?.label ?? k;
const statusTone: Record<string, string> = {
  success: "bg-emerald-100 text-emerald-700", failed: "bg-rose-100 text-rose-700",
  pending: "bg-amber-100 text-amber-700", timeout: "bg-orange-100 text-orange-700",
  not_configured: "bg-slate-100 text-slate-600",
};

function AepsPage() {
  const [op, setOp] = useState("cash_withdrawal");
  const [aadhaar, setAadhaar] = useState("");
  const [bankIin, setBankIin] = useState("");
  const [amount, setAmount] = useState("");
  const [captured, setCaptured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);

  const needsAmount = useMemo(() => OPS.find((o) => o.key === op)?.needsAmount, [op]);

  async function load() {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("aeps_transactions")
      .select("id,operation,amount,status,aadhaar_last4,rrn,message,commission,commission_settled,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    setRows((data as Txn[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!/^\d{12}$/.test(aadhaar.replace(/\s/g, ""))) { toast.error("Enter a valid 12-digit Aadhaar number"); return; }
    if (!bankIin) { toast.error("Select the customer's bank"); return; }
    if (needsAmount && !(Number(amount) > 0)) { toast.error("Enter an amount"); return; }
    if (!captured) { toast.error("Capture the customer's fingerprint first"); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("aeps", {
        body: {
          operation: op,
          aadhaarLast4: aadhaar.replace(/\s/g, "").slice(-4),
          bankIin,
          amount: needsAmount ? Number(amount) : 0,
          // pidBlock: <captured RD-service PID block goes here once the device SDK is wired>
        },
      });
      if (error) { toast.error("AEPS request failed", { description: error.message }); return; }
      const res = data as { status: string; message?: string };
      if (res.status === "not_configured") {
        toast.info("AEPS provider not configured yet", { description: "The request was logged. Connect the provider API to go live." });
      } else if (res.status === "success") {
        toast.success("Transaction successful");
      } else {
        toast.error("Transaction " + res.status, { description: res.message });
      }
      setAadhaar(""); setAmount(""); setCaptured(false);
      load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <RetailerShell>
      <div className="space-y-5">
        <PageHeader icon={<Landmark className="h-5 w-5" />} title="AEPS Banking" subtitle="Aadhaar Enabled Payment System — cash withdrawal, balance & mini statement" />

        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>This screen is ready for integration. Transactions are recorded, but the provider API is not connected yet — requests return a “not configured” status until the AEPS API and a certified biometric device are wired in.</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* Transaction form */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <p className="mb-3 text-sm font-bold">New transaction</p>

            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Operation</label>
            <div className="mt-1.5 mb-3 grid grid-cols-2 gap-2">
              {OPS.map((o) => (
                <button key={o.key} onClick={() => setOp(o.key)} className={`rounded-lg px-3 h-10 text-sm font-semibold transition ${op === o.key ? "bg-india-green text-white" : "border border-border bg-background hover:bg-muted"}`}>{o.label}</button>
              ))}
            </div>

            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Aadhaar number</label>
            <input value={aadhaar} onChange={(e) => setAadhaar(e.target.value.replace(/[^\d]/g, "").slice(0, 12))} inputMode="numeric" placeholder="12-digit Aadhaar" className="mt-1.5 mb-3 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30" />

            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Customer's bank</label>
            <select value={bankIin} onChange={(e) => setBankIin(e.target.value)} className="mt-1.5 mb-3 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30">
              {BANKS.map((b) => <option key={b.iin} value={b.iin}>{b.name}</option>)}
            </select>

            {needsAmount && (
              <>
                <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Amount</label>
                <div className="relative mt-1.5 mb-3">
                  <IndianRupee className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" placeholder="0" className="h-11 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30" />
                </div>
              </>
            )}

            <button onClick={() => setCaptured(true)} className={`mb-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border text-sm font-semibold transition ${captured ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-border bg-background hover:bg-muted"}`}>
              <Fingerprint className="h-4 w-4" /> {captured ? "Fingerprint captured (simulated)" : "Capture fingerprint"}
            </button>
            <p className="mb-3 text-[11px] text-muted-foreground">On go-live this button talks to the certified RD-service device and produces the encrypted PID block.</p>

            <button onClick={submit} disabled={busy} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-india-green text-sm font-bold text-white hover:bg-india-green/90 disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Landmark className="h-4 w-4" />} Submit {opLabel(op)}
            </button>
          </div>

          {/* Recent transactions */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold">Recent AEPS transactions</p>
              <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 h-8 text-xs font-semibold hover:bg-muted"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
            </div>
            {loading ? (
              <div className="grid h-40 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-india-green" /></div>
            ) : rows.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No AEPS transactions yet.</p>
            ) : (
              <div className="space-y-2">
                {rows.map((r) => (
                  <div key={r.id} className="rounded-xl border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{opLabel(r.operation)}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusTone[r.status] ?? "bg-slate-100 text-slate-600"}`}>{r.status.replace("_", " ")}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground">
                      {r.amount > 0 && <span>Amount {inr(r.amount)}</span>}
                      <span>Aadhaar ••••{r.aadhaar_last4 || "----"}</span>
                      {r.rrn && <span>RRN {r.rrn}</span>}
                      {r.commission > 0 && <span>Commission {inr(r.commission)}{r.commission_settled ? " ✓" : ""}</span>}
                      <span>{new Date(r.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                    </div>
                    {r.message && <p className="mt-1 text-[11px] text-muted-foreground">{r.message}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </RetailerShell>
  );
}
