// BharatOne — ICICI Payments
//
// Everything that happens on the ICICI gateway, in one place: which flows are routed
// to it, every transaction, and the full journey of each one — sent to ICICI, customer
// paid, result confirmed — including the raw payloads exchanged, so a failure can be
// understood without going near the database.
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle, ArrowRight, BadgeCheck, Ban, CheckCircle2, Clock, CreditCard,
  Download, Loader2, RefreshCw, Search, ShieldCheck, Smartphone, Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";
import { exportRowsToCsv } from "@/components/ui/table-toolbar";

const db = supabase as any;
const inr = (n: number | null | undefined) => "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
const when = (t: string) => new Date(t).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "medium" });

type Row = {
  id: string; created_at: string; user_id: string | null; purpose: string; ref_id: string | null;
  amount: number; status: string; merchant_txn_no: string | null; gateway_txn_id: string | null;
  payment_id: string | null; payment_mode: string | null; wallet_recharge_id: string | null;
  gateway_response: Record<string, any> | null;
};

type Routing = { purpose: string; gateway: string; enabled: boolean };
type Gateway = { name: string; active: boolean; mode: string };

/** Every state a payment can be in, in the order it moves through them. */
const STATES: Record<string, { label: string; help: string; tone: string; icon: any }> = {
  created:        { label: "Starting",        help: "Reference allocated, not yet sent to ICICI", tone: "bg-slate-100 text-slate-600", icon: Clock },
  initiated:      { label: "Sent to ICICI",   help: "Customer was handed over to the ICICI payment page", tone: "bg-indigo-100 text-indigo-700", icon: ArrowRight },
  pending:        { label: "Awaiting bank",   help: "Accepted by ICICI, waiting for the bank or UPI app to confirm", tone: "bg-blue-100 text-blue-700", icon: Clock },
  paid:           { label: "Paid",            help: "Money received and verified — accountant can now credit it", tone: "bg-amber-100 text-amber-700", icon: CheckCircle2 },
  credited:       { label: "Credited",        help: "Accountant has released it to the retailer's wallet", tone: "bg-emerald-100 text-emerald-700", icon: BadgeCheck },
  failed:         { label: "Failed",          help: "ICICI declined the payment or the customer abandoned it", tone: "bg-rose-100 text-rose-700", icon: Ban },
  cancelled:      { label: "Cancelled",       help: "Cancelled before completion", tone: "bg-rose-100 text-rose-700", icon: Ban },
  not_configured: { label: "Not configured",  help: "Someone tried to pay while the gateway was switched off", tone: "bg-slate-100 text-slate-600", icon: AlertTriangle },
};

const PURPOSE: Record<string, string> = {
  wallet_topup: "Wallet recharge", registration_fee: "Registration fee",
  service_payment: "Service payment", estore_order: "E-Store order",
};

export function IciciPayments() {
  const [rows, setRows] = useState<Row[]>([]);
  const [routing, setRouting] = useState<Routing[]>([]);
  const [gw, setGw] = useState<Gateway | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [checking, setChecking] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "live" | "paid" | "failed">("all");

  const load = useCallback(async () => {
    setLoading(true);
    await ensureStaffSession();
    const [{ data: pays }, { data: route }, { data: gate }] = await Promise.all([
      db.from("razorpay_payments")
        .select("id,created_at,user_id,purpose,ref_id,amount,status,merchant_txn_no,gateway_txn_id,payment_id,payment_mode,wallet_recharge_id,gateway_response")
        .eq("gateway", "icici").order("created_at", { ascending: false }).limit(300),
      db.from("payment_routing").select("purpose,gateway,enabled"),
      db.from("payment_gateways").select("name,active,mode").eq("name", "icici").maybeSingle(),
    ]);
    setRows((pays as Row[]) ?? []);
    setRouting((route as Routing[]) ?? []);
    setGw((gate as Gateway) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /** Ask ICICI directly what happened to this reference. */
  const recheck = async (r: Row) => {
    if (!r.merchant_txn_no) return;
    setChecking(r.id);
    const { data, error } = await db.functions.invoke("icici-status", {
      body: { merchant_txn_no: r.merchant_txn_no },
    });
    setChecking(null);
    if (error) return toast.error("Could not reach ICICI", { description: error.message });
    const outcome = (data as any)?.results?.[0]?.outcome ?? "no change";
    toast.success("Checked with ICICI", { description: `${r.merchant_txn_no} — ${outcome}` });
    load();
  };

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (tab === "live" && !["created", "initiated", "pending"].includes(r.status)) return false;
      if (tab === "paid" && !["paid", "credited"].includes(r.status)) return false;
      if (tab === "failed" && !["failed", "cancelled", "not_configured"].includes(r.status)) return false;
      if (q) {
        const hay = [r.merchant_txn_no, r.payment_id, r.gateway_txn_id, r.payment_mode, PURPOSE[r.purpose], String(r.amount)]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [rows, tab, q]);

  const stats = useMemo(() => {
    const paid = rows.filter((r) => ["paid", "credited"].includes(r.status));
    return {
      total: rows.length,
      paid: paid.length,
      value: paid.reduce((a, r) => a + Number(r.amount || 0), 0),
      live: rows.filter((r) => ["created", "initiated", "pending"].includes(r.status)).length,
      failed: rows.filter((r) => ["failed", "cancelled"].includes(r.status)).length,
    };
  }, [rows]);

  const iciciFlows = routing.filter((r) => r.gateway === "icici" && r.enabled);

  /** Reconstruct what happened, in order, from the stored gateway payloads. */
  const journey = (r: Row) => {
    const g = r.gateway_response ?? {};
    const steps: { at: string; title: string; detail: string; ok: boolean }[] = [];
    steps.push({ at: when(r.created_at), title: "Payment started", detail: `Reference ${r.merchant_txn_no ?? "—"} · ${inr(r.amount)} · ${PURPOSE[r.purpose] ?? r.purpose}`, ok: true });
    if (g.initiate) {
      steps.push({ at: "", title: "Sent to ICICI", detail: `ICICI accepted the request (${g.initiate.responseCode ?? "?"}) and returned a payment page. Customer redirected.`, ok: true });
    }
    if (g.return) {
      steps.push({ at: g.return.paymentDateTime ? String(g.return.paymentDateTime) : "", title: "Customer returned from ICICI", detail: `${g.return.respDescription ?? ""} (${g.return.responseCode ?? "?"})`, ok: g.return.responseCode === "000" || g.return.responseCode === "0000" });
    }
    if (g.advice) {
      steps.push({ at: "", title: "ICICI confirmed server-to-server", detail: `Payment advice received: ${g.advice.respDescription ?? ""} (${g.advice.responseCode ?? "?"})`, ok: true });
    }
    if (g.status) {
      steps.push({ at: "", title: "Status checked with ICICI", detail: `${g.status.txnRespDescription ?? g.status.respDescription ?? ""} — ${g.status.txnStatus ?? ""}`, ok: g.status.txnStatus === "SUC" });
    }
    if (g.return_rejected || g.advice_rejected || g.status_rejected) {
      steps.push({ at: "", title: "Rejected — signature did not match", detail: "A payment result arrived that could not be verified. It was ignored and not applied.", ok: false });
    }
    if (r.wallet_recharge_id) {
      steps.push({ at: "", title: "Credited to wallet", detail: `Wallet recharge ${r.wallet_recharge_id}`, ok: true });
    }
    return steps;
  };

  const exportCsv = () => {
    if (filtered.length === 0) return toast.error("Nothing to export");
    exportRowsToCsv(filtered, [
      { header: "Date", value: (r) => when(r.created_at) },
      { header: "Reference", value: (r) => r.merchant_txn_no ?? "" },
      { header: "Purpose", value: (r) => PURPOSE[r.purpose] ?? r.purpose },
      { header: "Amount", value: (r) => r.amount },
      { header: "Status", value: (r) => STATES[r.status]?.label ?? r.status },
      { header: "Mode", value: (r) => r.payment_mode ?? "" },
      { header: "ICICI txn ID", value: (r) => r.payment_id ?? "" },
    ], `icici-payments-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success("Exported", { description: `${filtered.length} rows` });
  };

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold">
            <CreditCard className="h-5 w-5 text-admin" /> ICICI Payments
          </h2>
          <p className="text-sm text-muted-foreground">
            Every transaction on the ICICI gateway and exactly what happened to it.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button onClick={exportCsv} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted">
            <Download className="h-4 w-4" /> CSV
          </button>
        </div>
      </div>

      {/* gateway state */}
      <div className={`rounded-xl border p-4 ${gw?.active ? "border-emerald-200 bg-emerald-50/60" : "border-amber-200 bg-amber-50/60"}`}>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="flex items-center gap-2 font-bold">
            <ShieldCheck className={`h-4 w-4 ${gw?.active ? "text-emerald-600" : "text-amber-600"}`} />
            Gateway {gw?.active ? "switched on" : "switched off"}
          </span>
          <span className="text-muted-foreground">
            Environment: <b className={gw?.mode === "live" ? "text-emerald-700" : "text-amber-700"}>
              {gw?.mode === "live" ? "LIVE — real money" : "TEST (UAT) — no real money"}</b>
          </span>
          <span className="text-muted-foreground">
            Handling:{" "}
            {iciciFlows.length === 0
              ? <b className="text-amber-700">nothing yet — all payments still go to Razorpay</b>
              : <b>{iciciFlows.map((f) => PURPOSE[f.purpose] ?? f.purpose).join(", ")}</b>}
          </span>
        </div>
      </div>

      {/* stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Transactions", value: stats.total, icon: CreditCard, tone: "" },
          { label: "Successful", value: stats.paid, icon: CheckCircle2, tone: "text-emerald-600" },
          { label: "Value received", value: inr(stats.value), icon: Wallet, tone: "" },
          { label: "Failed", value: stats.failed, icon: Ban, tone: stats.failed ? "text-rose-600" : "" },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              <c.icon className="h-3.5 w-3.5" /> {c.label}
            </div>
            <div className={`mt-1 text-2xl font-extrabold tabular-nums ${c.tone}`}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-border bg-card p-1">
          {([["all", "All"], ["live", `In progress (${stats.live})`], ["paid", "Successful"], ["failed", "Failed"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${tab === k ? "bg-admin text-white" : "text-muted-foreground hover:bg-muted"}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search reference, ICICI ID, amount…"
            className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm outline-none focus:border-admin" />
        </div>
      </div>

      {/* table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="max-h-[58vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/60 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Reference</th>
                <th className="px-3 py-2">For</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Paid by</th>
                <th className="px-3 py-2">What happened</th>
                <th className="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="px-3 py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></td></tr>}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-12 text-center text-muted-foreground">
                  No ICICI transactions{tab !== "all" || q ? " for this filter" : " yet"}.
                </td></tr>
              )}
              {!loading && filtered.map((r) => {
                const st = STATES[r.status] ?? { label: r.status, help: "", tone: "bg-slate-100 text-slate-600", icon: Clock };
                const isOpen = open === r.id;
                return (
                  <>
                    <tr key={r.id} onClick={() => setOpen(isOpen ? null : r.id)} className="cursor-pointer border-t border-border hover:bg-muted/40">
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">{when(r.created_at)}</td>
                      <td className="px-3 py-2 font-mono text-xs font-semibold">{r.merchant_txn_no ?? "—"}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs">{PURPOSE[r.purpose] ?? r.purpose}</td>
                      <td className="whitespace-nowrap px-3 py-2 font-bold tabular-nums">{inr(r.amount)}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs">
                        {r.payment_mode
                          ? <span className="inline-flex items-center gap-1"><Smartphone className="h-3 w-3 text-muted-foreground" />{r.payment_mode}</span>
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${st.tone}`}>
                          <st.icon className="h-3 w-3" />{st.label}
                        </span>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">{st.help}</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right">
                        {["created", "initiated", "pending"].includes(r.status) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); recheck(r); }}
                            disabled={checking === r.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[11px] font-bold hover:bg-muted disabled:opacity-50"
                          >
                            {checking === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                            Check with ICICI
                          </button>
                        )}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={r.id + "-d"} className="border-t border-border bg-muted/30">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="grid gap-5 lg:grid-cols-2">
                            <div>
                              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">What happened, step by step</p>
                              <ol className="space-y-2">
                                {journey(r).map((s, i) => (
                                  <li key={i} className="flex gap-2.5">
                                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${s.ok ? "bg-emerald-500" : "bg-rose-500"}`} />
                                    <div>
                                      <p className="text-sm font-semibold">{s.title}</p>
                                      <p className="text-xs text-muted-foreground">{s.detail}</p>
                                    </div>
                                  </li>
                                ))}
                              </ol>
                            </div>
                            <div className="space-y-1.5 text-xs">
                              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Reference details</p>
                              {[
                                ["Our reference", r.merchant_txn_no],
                                ["ICICI transaction ID", r.payment_id],
                                ["ICICI session", r.gateway_txn_id],
                                ["Payment method", r.payment_mode],
                                ["Wallet recharge", r.wallet_recharge_id],
                                ["Linked to", r.ref_id],
                              ].map(([k, v]) => (
                                <div key={String(k)} className="flex justify-between gap-3 border-b border-border/60 py-1">
                                  <span className="text-muted-foreground">{k}</span>
                                  <span className="font-mono">{v || "—"}</span>
                                </div>
                              ))}
                              {r.gateway_response && (
                                <details className="mt-3">
                                  <summary className="cursor-pointer text-[11px] font-semibold text-muted-foreground hover:text-foreground">
                                    Show the raw messages exchanged with ICICI
                                  </summary>
                                  <pre className="mt-2 max-h-56 overflow-auto rounded-lg bg-slate-900 p-3 text-[10px] leading-relaxed text-slate-100">
{JSON.stringify(r.gateway_response, null, 2)}
                                  </pre>
                                </details>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground">
          {filtered.length} transaction(s) · click any row to see its full journey and the raw messages
        </div>
      </div>
    </div>
  );
}

export default IciciPayments;
