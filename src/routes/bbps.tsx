import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Receipt, Loader2, RefreshCw, Wallet, ArrowLeft, Search, CheckCircle2,
  AlertTriangle, Smartphone, Zap, Tv, Flame, Wifi, IndianRupee,
} from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/bbps")({
  head: () => ({ meta: [{ title: "Recharge & Bill Payment — BharatOne" }] }),
  component: BbpsPage,
});

type Cat = { id: string; name: string };
type Op = { code: string; name: string };
type Param = { name: string; label: string; type: string; required: boolean; min: number | null; max: number | null };
type Bill = {
  customer_name: string | null; amount: number | null; bill_number: string | null;
  bill_date: string | null; due_date: string | null; convenience_fee: number;
};
type Txn = {
  id: string; category: string; operator_name: string | null; amount: number;
  status: string; client_ref_id: string; message: string | null; created_at: string;
  commission: number;
};

const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const tone: Record<string, string> = {
  success: "bg-emerald-100 text-emerald-700",
  failed: "bg-rose-100 text-rose-700",
  refunded: "bg-slate-100 text-slate-600",
  pending: "bg-amber-100 text-amber-700",
  pending_reconciliation: "bg-amber-100 text-amber-800",
};

// Icon per launch category — falls back to a generic receipt.
function catIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("mobile") || n.includes("prepaid")) return Smartphone;
  if (n.includes("electric")) return Zap;
  if (n.includes("dth") || n.includes("cable") || n.includes("tv")) return Tv;
  if (n.includes("gas") || n.includes("lpg")) return Flame;
  if (n.includes("broadband") || n.includes("landline")) return Wifi;
  return Receipt;
}

function BbpsPage() {
  const [status, setStatus] = useState<any>(null);
  const [cats, setCats] = useState<Cat[]>([]);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);

  // selection
  const [cat, setCat] = useState<Cat | null>(null);
  const [ops, setOps] = useState<Op[]>([]);
  const [opQuery, setOpQuery] = useState("");
  const [op, setOp] = useState<Op | null>(null);
  const [params, setParams] = useState<Param[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [bill, setBill] = useState<Bill | null>(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<any>(null);
  const [catError, setCatError] = useState<string | null>(null);
  const [acc, setAcc] = useState("");            // utility_acc_no
  const [custMobile, setCustMobile] = useState(""); // confirmation_mobile_no
  const [fetchRaw, setFetchRaw] = useState<string | null>(null); // billfetchresponse echo
  const [latlong, setLatlong] = useState("");

  const call = useCallback(async (action: string, extra: Record<string, unknown> = {}) => {
    const { data, error } = await supabase.functions.invoke("bbps", { body: { action, ...extra } });
    if (error) {
      let msg = "Request failed";
      try {
        const ctx = (error as { context?: Response }).context;
        const b = ctx ? await ctx.json() : null;
        if (b?.error) msg = String(b.detail ?? b.error);
      } catch { /* ignore */ }
      throw new Error(msg);
    }
    if ((data as any)?.error) throw new Error(String((data as any).error));
    return data as any;
  }, []);

  async function load() {
    setLoading(true);
    try { setStatus(await call("config")); } catch { /* ignore */ }
    try {
      const c = await call("categories");
      setCats(c?.list ?? []);
      setCatError((c?.list ?? []).length === 0 ? (c?.message ?? "The banking partner returned no categories.") : null);
    } catch (e: any) { setCats([]); setCatError(e?.message ?? "Could not reach the banking partner."); }
    try {
      const t = await (supabase as any).rpc("bbps_my_transactions", { _limit: 25 });
      setTxns((t?.data as Txn[]) ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setLatlong(`${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`),
      () => { /* Eko falls back to the shop location on the server */ },
      { timeout: 8000, maximumAge: 300000 },
    );
  }, []);

  const pickCategory = async (c: Cat) => {
    setCat(c); setOp(null); setOps([]); setParams([]); setValues({}); setBill(null); setAmount(""); setDone(null); setAcc(""); setCustMobile(""); setFetchRaw(null);
    try {
      const r = await call("operators", { category: c.name });
      setOps(r?.list ?? []);
    } catch (e: any) { toast.error("Could not load operators", { description: e.message }); }
  };

  const pickOperator = async (o: Op) => {
    setOp(o); setParams([]); setValues({}); setBill(null); setAmount(""); setFetchRaw(null);
    try {
      const r = await call("operator_params", { operator_code: o.code });
      setParams(r?.list ?? []);
    } catch (e: any) { toast.error("Could not load the form", { description: e.message }); }
  };

  const missing = params.filter((p) => p.required && !(values[p.name] ?? "").trim());

  const fetchBill = async () => {
    if (!acc.trim()) return toast.error("Enter the account / consumer number");
    if (!/^\d{10}$/.test(custMobile)) return toast.error("Enter the customer's 10-digit mobile number");
    setBusy(true);
    try {
      const r = await call("fetch_bill", {
        operator_code: op?.code, utility_acc_no: acc.trim(),
        confirmation_mobile_no: custMobile, latlong,
        dob: values.dob, cycle_number: values.cycle_number,
      });
      setBill(r.bill);
      setFetchRaw(r.billfetchresponse ?? null);
      if (r.bill?.amount != null) setAmount(String(r.bill.amount));
      toast.success("Bill fetched");
    } catch (e: any) {
      toast.error("Could not fetch the bill", { description: e.message });
    } finally { setBusy(false); }
  };

  const payBill = async () => {
    const amt = Number(amount);
    if (!acc.trim()) return toast.error("Enter the account / consumer number");
    if (!/^\d{10}$/.test(custMobile)) return toast.error("Enter the customer's 10-digit mobile number");
    if (!(amt > 0)) return toast.error("Enter a valid amount");
    const total = amt + Number(bill?.convenience_fee ?? 0);
    if (Number(status?.wallet_balance ?? 0) < total) {
      return toast.error("Not enough wallet balance", { description: `You need ${inr(total)}. Recharge your wallet first.` });
    }
    if (!confirm(`Pay ${inr(total)} to ${op?.name}?\n\nThis cannot be reversed once the biller accepts it.`)) return;

    setBusy(true);
    try {
      const r = await call("pay_bill", {
        category: cat?.name, operator_code: op?.code, operator_name: op?.name,
        amount: amt, convenience_fee: bill?.convenience_fee ?? 0,
        utility_acc_no: acc.trim(), confirmation_mobile_no: custMobile, latlong,
        customer_name: bill?.customer_name ?? null, bill_number: bill?.bill_number ?? null,
        billfetchresponse: fetchRaw,
      });
      setDone(r);
      toast.success("Payment successful");
      load();
    } catch (e: any) {
      toast.error("Payment failed", { description: e.message });
      load();
    } finally { setBusy(false); }
  };

  const reset = () => {
    setCat(null); setOp(null); setOps([]); setParams([]); setValues({});
    setBill(null); setAmount(""); setDone(null); setAcc(""); setCustMobile(""); setFetchRaw(null);
  };

  const filteredOps = ops.filter((o) => !opQuery.trim() || o.name.toLowerCase().includes(opQuery.toLowerCase()));

  return (
    <RetailerShell>
      <PageHeader
        icon={<Receipt className="h-5 w-5" />}
        title="Recharge & Bill Payment"
        subtitle="Mobile, electricity, DTH, gas and broadband — paid from your wallet"
        actions={
          <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 h-9 text-sm font-semibold hover:bg-muted">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        }
      />

      <div className="space-y-5">
        {/* Wallet strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-india-green/10 text-india-green"><Wallet className="h-5 w-5" /></span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Wallet balance</p>
              <p className="text-xl font-extrabold">{inr(Number(status?.wallet_balance ?? 0))}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Bills are debited from this balance. Failed payments are refunded automatically.</p>
        </div>

        {status && !status.keys_set && !loading && (
          <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Bill payments are not configured yet. Contact the BharatOne team.
          </div>
        )}

        {/* Success receipt */}
        {done && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="flex items-center gap-2 text-lg font-extrabold text-emerald-800">
              <CheckCircle2 className="h-5 w-5" /> Payment successful
            </p>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <p><span className="text-muted-foreground">Operator:</span> <b>{op?.name}</b></p>
              <p><span className="text-muted-foreground">Amount:</span> <b>{inr(Number(amount))}</b></p>
              <p><span className="text-muted-foreground">Reference:</span> <span className="font-mono text-xs">{done.client_ref_id}</span></p>
              {done.tid && <p><span className="text-muted-foreground">Txn ID:</span> <span className="font-mono text-xs">{done.tid}</span></p>}
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => window.print()} className="rounded-lg border border-border bg-card px-4 h-9 text-sm font-semibold hover:bg-muted">Print receipt</button>
              <button onClick={reset} className="rounded-lg bg-india-green px-4 h-9 text-sm font-bold text-white">New payment</button>
            </div>
          </div>
        )}

        {/* Step 1 — category grid */}
        {!cat && !done && (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <p className="mb-4 text-sm font-bold">Choose a service</p>
            {loading ? (
              <div className="grid h-24 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-india-green" /></div>
            ) : cats.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-semibold">Bill payment services aren't available yet.</p>
                <p className="mt-1 text-xs">
                  The banking partner has not enabled Bharat Connect (BBPS) for this account yet.
                  Once it is activated these services will appear here automatically.
                </p>
                {catError && <p className="mt-2 font-mono text-[11px] opacity-80">Partner said: {catError}</p>}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {cats.map((c) => {
                  const Icon = catIcon(c.name);
                  return (
                    <button key={c.id || c.name} onClick={() => pickCategory(c)}
                      className="group rounded-xl border border-border bg-background p-4 text-center transition hover:border-saffron/50 hover:shadow-soft">
                      <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-saffron/10 text-saffron transition-colors group-hover:bg-saffron group-hover:text-white">
                        <Icon className="h-5 w-5" />
                      </span>
                      <p className="mt-2 text-sm font-semibold">{c.name}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 2 & 3 — operator + dynamic form */}
        {cat && !done && (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <button onClick={reset} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> All services
            </button>
            <p className="text-sm font-bold">{cat.name}</p>

            {!op ? (
              <div className="mt-3">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input value={opQuery} onChange={(e) => setOpQuery(e.target.value)} placeholder="Search operator…"
                    className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm" />
                </div>
                {ops.length === 0 ? (
                  <div className="grid h-20 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-india-green" /></div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredOps.map((o) => (
                      <button key={o.code} onClick={() => pickOperator(o)}
                        className="rounded-lg border border-border bg-background px-3 py-2.5 text-left text-sm font-medium hover:border-saffron/50 hover:bg-muted">
                        {o.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-3 max-w-lg space-y-3">
                <button onClick={() => { setOp(null); setBill(null); setParams([]); }}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground">← Change operator</button>
                <p className="text-base font-bold">{op.name}</p>

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground">
                    Account / consumer number<span className="text-rose-600"> *</span>
                  </label>
                  <input value={acc} onChange={(e) => setAcc(e.target.value)}
                    placeholder="As printed on the bill"
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground">
                    Customer mobile<span className="text-rose-600"> *</span>
                  </label>
                  <input value={custMobile} onChange={(e) => setCustMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    inputMode="numeric" placeholder="10-digit mobile for the receipt"
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
                </div>

                {params.length === 0 ? null : params
                  .filter((p) => !["utility_acc_no", "confirmation_mobile_no", "sender_name", "amount"].includes(p.name))
                  .map((p) => (
                  <div key={p.name}>
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      {p.label}{p.required && <span className="text-rose-600"> *</span>}
                    </label>
                    <input
                      value={values[p.name] ?? ""}
                      onChange={(e) => setValues((v) => ({ ...v, [p.name]: e.target.value }))}
                      inputMode={p.type === "numeric" || p.type === "number" ? "numeric" : "text"}
                      maxLength={p.max ?? undefined}
                      placeholder={p.label}
                      className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                    />
                  </div>
                ))}

                {bill && (
                  <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm">
                    {bill.customer_name && <p><span className="text-muted-foreground">Customer:</span> <b>{bill.customer_name}</b></p>}
                    {bill.bill_number && <p><span className="text-muted-foreground">Bill no:</span> {bill.bill_number}</p>}
                    {bill.due_date && <p><span className="text-muted-foreground">Due:</span> {bill.due_date}</p>}
                    {bill.convenience_fee > 0 && <p><span className="text-muted-foreground">Convenience fee:</span> {inr(bill.convenience_fee)}</p>}
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground">Amount<span className="text-rose-600"> *</span></label>
                  <div className="relative mt-1">
                    <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                      inputMode="decimal" placeholder="0"
                      className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm font-semibold" />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button onClick={fetchBill} disabled={busy || params.length === 0}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 h-10 text-sm font-semibold hover:bg-muted disabled:opacity-50">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Fetch bill
                  </button>
                  <button onClick={payBill} disabled={busy || !(Number(amount) > 0)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-india-green px-5 h-10 text-sm font-bold text-white disabled:opacity-50">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Pay {Number(amount) > 0 ? inr(Number(amount)) : ""}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Prepaid recharges usually have no bill to fetch — enter the amount and pay directly.
                </p>
              </div>
            )}
          </div>
        )}

        {/* History */}
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
          <p className="border-b border-border px-4 py-3 text-sm font-bold">Recent payments</p>
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Service</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Commission</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Reference</th>
              </tr>
            </thead>
            <tbody>
              {txns.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">No bill payments yet.</td></tr>
              ) : txns.map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="px-3 py-2.5 whitespace-nowrap text-[11px] text-muted-foreground">
                    {new Date(t.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-medium">{t.category}</div>
                    <div className="text-[11px] text-muted-foreground">{t.operator_name ?? "—"}</div>
                  </td>
                  <td className="px-3 py-2.5 font-semibold">{inr(t.amount)}</td>
                  <td className="px-3 py-2.5 text-emerald-700">{t.commission > 0 ? inr(t.commission) : "—"}</td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${tone[t.status] ?? "bg-muted"}`}>
                      {t.status.replace(/_/g, " ")}
                    </span>
                    {t.message && t.status !== "success" && (
                      <div className="mt-0.5 max-w-[220px] truncate text-[10px] text-muted-foreground" title={t.message}>{t.message}</div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">{t.client_ref_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </RetailerShell>
  );
}
