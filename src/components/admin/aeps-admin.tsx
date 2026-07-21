import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Landmark, Loader2, RefreshCw, Plus, Trash2, Save, Download, Search,
  Percent, IndianRupee, TrendingUp, Users, X, Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";
import { useSort, SortTh } from "@/components/ui/sortable";

type Slab = {
  id: string; operation: string; min_amount: number; max_amount: number | null;
  mode: "flat" | "percent"; value: number; max_commission: number | null;
  retailer_share: number; distributor_share: number; active: boolean;
};
type Row = {
  id: string; created_at: string; operation: string; status: string;
  jsko_id: string | null; retailer_name: string | null; distributor_name: string | null;
  customer_mobile: string | null; aadhaar_last4: string | null; bank_code: string | null;
  amount: number; rrn: string | null; client_ref_id: string | null;
  commission_gross: number; commission_retailer: number;
  commission_distributor: number; commission_company: number;
  commission_settled: boolean; message: string | null;
};

const OPS = [
  { key: "cash_withdrawal", label: "Cash Withdrawal" },
  { key: "aadhaar_pay", label: "Aadhaar Pay" },
  { key: "balance_enquiry", label: "Balance Enquiry" },
  { key: "mini_statement", label: "Mini Statement" },
];
const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const tone: Record<string, string> = {
  success: "bg-emerald-100 text-emerald-700",
  failed: "bg-rose-100 text-rose-700",
  pending: "bg-amber-100 text-amber-700",
  pending_reconciliation: "bg-amber-100 text-amber-800",
};
const blank = (): Slab => ({
  id: "", operation: "cash_withdrawal", min_amount: 0, max_amount: null,
  mode: "flat", value: 0, max_commission: null, retailer_share: 70, distributor_share: 10, active: true,
});

export function AepsAdmin() {
  const [tab, setTab] = useState<"monitor" | "commission" | "payouts" | "users">("monitor");
  return (
    <div className="space-y-5">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-extrabold"><Landmark className="h-5 w-5 text-admin" /> AEPS Banking</h2>
        <p className="text-sm text-muted-foreground">Set the commission retailers earn, monitor transactions, and approve payout requests.</p>
      </div>
      <EkoBalance />

      <div className="flex gap-1.5">
        {([["monitor", "Transaction Monitor"], ["users", "Users"], ["commission", "Commission Setup"], ["payouts", "Payout Requests"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`rounded-full px-4 h-9 text-xs font-semibold transition ${tab === k ? "bg-india-green text-white" : "border border-border bg-card hover:bg-muted"}`}>
            {l}
          </button>
        ))}
      </div>
      {tab === "monitor" ? <Monitor /> : tab === "users" ? <AepsUsers /> : tab === "commission" ? <CommissionSetup /> : <Payouts />}
    </div>
  );
}

// ------------------------------------------------------- Eko E-value balance

/**
 * The float BharatOne holds with Eko. Every AePS cash withdrawal is funded from
 * this balance, so when it hits zero all retailers stop being able to transact.
 */
function EkoBalance() {
  const [state, setState] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("aeps", { body: { action: "eko_balance" } });
      if (error) throw error;
      setState(data);
    } catch (e: any) {
      setState({ ok: false, error: e?.message || "Could not reach Eko" });
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const bal = state?.ok ? state.balance : null;
  const low = bal != null && bal < 5000;

  return (
    <div className={`rounded-2xl border p-4 shadow-soft ${
      state?.ok === false ? "border-amber-200 bg-amber-50" : low ? "border-rose-200 bg-rose-50" : "border-border bg-card"
    }`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <Wallet className="h-4 w-4" /> Eko E-value Balance
          </p>
          {loading ? (
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking with Eko…
            </p>
          ) : state?.ok ? (
            <>
              <p className={`mt-1 text-3xl font-extrabold ${low ? "text-rose-700" : "text-india-green"}`}>
                {bal != null ? inr(bal) : "—"}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Funds every AePS cash withdrawal. Checked {new Date(state.checked_at).toLocaleTimeString("en-IN")}.
                {low && " Top up in the Eko portal — retailers cannot withdraw once this runs out."}
              </p>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm font-semibold text-amber-800">Balance unavailable</p>
              <p className="mt-0.5 max-w-xl text-[11px] text-muted-foreground">
                {state?.error || "Eko did not return a balance."} Ask Eko to confirm the balance-enquiry
                endpoint for our account, then check the Eko portal directly meanwhile.
              </p>
            </>
          )}
        </div>
        <button onClick={load} disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 h-9 text-xs font-semibold hover:bg-muted disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- users

type AepsUser = {
  user_id: string; eko_user_code: string | null; jsko_id: string | null; application_id: string | null;
  full_name: string | null; mobile: string | null; email: string | null; dob: string | null;
  pan_number: string | null; aadhaar_number: string | null;
  settlement_account: string | null; settlement_ifsc: string | null; bank_holder_name: string | null;
  shop_name: string | null; shop_address: string | null;
  onboarded: boolean | null; service_activated: boolean | null; ekyc_done: boolean | null;
  daily_kyc_done: boolean | null; last_error: string | null; created_at: string | null;
};

/**
 * Whether the banking partner (Eko) has fully verified this agent. Onboarding,
 * service activation and eKYC must all be done before the retailer can transact;
 * the daily Agent Authentication is a separate per-day step they do themselves.
 */
function ekoReadiness(r: AepsUser) {
  const missing: string[] = [];
  if (!r.onboarded) missing.push("onboarding");
  if (!r.service_activated) missing.push("service activation");
  if (!r.ekyc_done) missing.push("eKYC");
  return {
    verified: missing.length === 0,
    missing,
    label: missing.length === 0 ? "Verified by Eko" : "Pending with Eko",
    detail:
      missing.length === 0
        ? r.daily_kyc_done
          ? "Ready — authenticated today"
          : "Ready — needs daily Agent Auth"
        : `Waiting on ${missing.join(", ")}`,
  };
}

const maskAadhaar = (v: string | null) => (v && v.length >= 4 ? "XXXX XXXX " + v.slice(-4) : v || "—");
const maskPan = (v: string | null) => (v && v.length >= 4 ? v.slice(0, 2) + "XXXX" + v.slice(-2) : v || "—");
const fmtDob = (v: string | null) => (v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");

function AepsUsers() {
  const [rows, setRows] = useState<AepsUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [reveal, setReveal] = useState(false);
  const [open, setOpen] = useState<AepsUser | null>(null);
  const [only, setOnly] = useState<"all" | "verified" | "pending">("all");

  async function load() {
    setLoading(true);
    await ensureStaffSession();
    const { data, error } = await (supabase as any).rpc("admin_aeps_users");
    if (error) toast.error(error.message);
    setRows((data as AepsUser[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      const okSearch = !s || [r.eko_user_code, r.jsko_id, r.application_id, r.full_name, r.mobile, r.email, r.pan_number, r.aadhaar_number, r.shop_name]
        .some((f) => String(f ?? "").toLowerCase().includes(s));
      const v = ekoReadiness(r).verified;
      const okOnly = only === "all" || (only === "verified" ? v : !v);
      return okSearch && okOnly;
    });
  }, [rows, q, only]);

  const live = rows.filter((r) => ekoReadiness(r).verified).length;

  const exportCsv = () => {
    const head = ["AEPS Code", "JSKO ID", "Application", "Name", "Mobile", "Email", "DOB", "PAN", "Aadhaar", "Settlement A/C", "IFSC", "A/C Holder", "Shop", "Address", "Onboarded", "Activated", "eKYC", "Today 2FA"];
    const body = filtered.map((r) => [
      r.eko_user_code, r.jsko_id, r.application_id, r.full_name, r.mobile, r.email, r.dob,
      r.pan_number, r.aadhaar_number, r.settlement_account, r.settlement_ifsc, r.bank_holder_name,
      r.shop_name, r.shop_address,
      r.onboarded ? "Yes" : "No", r.service_activated ? "Yes" : "No", r.ekyc_done ? "Yes" : "No", r.daily_kyc_done ? "Yes" : "No",
    ]);
    const csv = [head, ...body].map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = `aeps-users-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat icon={<Users className="h-4 w-4" />} label="AEPS Users" value={String(rows.length)} />
        <Stat icon={<Landmark className="h-4 w-4" />} label="Verified by Eko" value={String(live)} sub="Cleared to transact" />
        <Stat icon={<TrendingUp className="h-4 w-4" />} label="Authenticated Today" value={String(rows.filter((r) => r.daily_kyc_done).length)} sub="Daily 2FA complete" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, AEPS code, JSKO ID, mobile, PAN…"
            className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm" />
        </div>
        {([["all", "All"], ["verified", "Verified by Eko"], ["pending", "Pending"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setOnly(k)}
            className={`rounded-lg px-3 h-9 text-xs font-semibold transition ${only === k ? "bg-india-green text-white" : "border border-border bg-card hover:bg-muted"}`}>
            {l}
          </button>
        ))}
        <button onClick={() => setReveal((v) => !v)} className="rounded-lg border border-border px-3 h-9 text-xs font-semibold hover:bg-muted">
          {reveal ? "Hide" : "Show"} PAN / Aadhaar
        </button>
        <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-9 text-xs font-semibold hover:bg-muted">
          <Download className="h-4 w-4" /> Export
        </button>
        <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-9 text-xs font-semibold hover:bg-muted">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">AEPS Code</th>
              <th className="px-3 py-2">Agent</th>
              <th className="px-3 py-2">Contact</th>
              <th className="px-3 py-2">KYC</th>
              <th className="px-3 py-2">Settlement A/C</th>
              <th className="px-3 py-2">Eko Verification</th>
              <th className="px-3 py-2 text-right">Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">No AEPS users yet.</td></tr>
            ) : filtered.map((r) => (
              <tr key={r.user_id} className="border-t border-border align-top">
                <td className="px-3 py-2.5 font-mono text-xs font-semibold">{r.eko_user_code ?? "—"}</td>
                <td className="px-3 py-2.5">
                  <div className="font-semibold">{r.full_name ?? "—"}</div>
                  <div className="text-[11px] text-muted-foreground">{r.jsko_id ?? "—"} · {r.application_id ?? "—"}</div>
                </td>
                <td className="px-3 py-2.5 text-xs">
                  <div>{r.mobile ?? "—"}</div>
                  <div className="text-muted-foreground">{r.email ?? "—"}</div>
                </td>
                <td className="px-3 py-2.5 text-xs">
                  <div className="font-mono">{reveal ? (r.pan_number ?? "—") : maskPan(r.pan_number)}</div>
                  <div className="font-mono text-muted-foreground">{reveal ? (r.aadhaar_number ?? "—") : maskAadhaar(r.aadhaar_number)}</div>
                </td>
                <td className="px-3 py-2.5 text-xs">
                  <div className="font-mono">{r.settlement_account ?? "—"}</div>
                  <div className="text-muted-foreground">{r.settlement_ifsc ?? "—"}</div>
                </td>
                <td className="px-3 py-2.5">
                  {(() => {
                    const k = ekoReadiness(r);
                    return (
                      <>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          k.verified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"
                        }`}>
                          {k.verified ? "✓" : "⏳"} {k.label}
                        </span>
                        <div className="mt-1 text-[10px] text-muted-foreground">{k.detail}</div>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          <Chip label="Onboard" value={r.onboarded ? "✓" : "✕"} good={!!r.onboarded} />
                          <Chip label="Active" value={r.service_activated ? "✓" : "✕"} good={!!r.service_activated} />
                          <Chip label="eKYC" value={r.ekyc_done ? "✓" : "✕"} good={!!r.ekyc_done} />
                          <Chip label="2FA today" value={r.daily_kyc_done ? "✓" : "✕"} good={!!r.daily_kyc_done} />
                        </div>
                      </>
                    );
                  })()}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <button onClick={() => setOpen(r)} className="rounded-md border border-border px-2 py-1 text-xs font-semibold hover:bg-muted">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(null)}>
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-extrabold">{open.full_name ?? "AEPS User"}</h3>
                <p className="text-xs text-muted-foreground">AEPS Agent Code {open.eko_user_code ?? "—"}</p>
              </div>
              <button onClick={() => setOpen(null)} className="rounded-md p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>

            {(() => {
              const k = ekoReadiness(open);
              return (
                <div className={`mb-4 rounded-xl border p-3 ${
                  k.verified ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
                }`}>
                  <p className={`text-sm font-bold ${k.verified ? "text-emerald-700" : "text-amber-800"}`}>
                    {k.verified ? "✓ Verified by Eko — cleared to use AEPS" : "⏳ Pending verification with Eko"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {k.verified
                      ? k.detail + ". The retailer completes Agent Authentication once each day before transacting."
                      : `Still waiting on ${k.missing.join(", ")}. The retailer cannot transact until these are complete.`}
                  </p>
                </div>
              );
            })()}
            <div className="grid gap-3 sm:grid-cols-2">
              <L label="AEPS Agent Code"><span className="font-mono">{open.eko_user_code ?? "—"}</span></L>
              <L label="JSKO ID / Application">{[open.jsko_id, open.application_id].filter(Boolean).join(" · ") || "—"}</L>
              <L label="Name">{open.full_name ?? "—"}</L>
              <L label="Mobile">{open.mobile ?? "—"}</L>
              <L label="Email">{open.email ?? "—"}</L>
              <L label="Date of Birth">{fmtDob(open.dob)}</L>
              <L label="PAN"><span className="font-mono">{reveal ? (open.pan_number ?? "—") : maskPan(open.pan_number)}</span></L>
              <L label="Aadhaar"><span className="font-mono">{reveal ? (open.aadhaar_number ?? "—") : maskAadhaar(open.aadhaar_number)}</span></L>
              <L label="Settlement Account"><span className="font-mono">{open.settlement_account ?? "—"}</span></L>
              <L label="IFSC"><span className="font-mono">{open.settlement_ifsc ?? "—"}</span></L>
              <L label="Account Holder">{open.bank_holder_name ?? "—"}</L>
              <L label="Shop Name">{open.shop_name ?? "—"}</L>
              <div className="sm:col-span-2"><L label="Shop Address">{open.shop_address ?? "—"}</L></div>
              <div className="sm:col-span-2">
                <L label="AEPS Status">
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Chip label="Onboarded" value={open.onboarded ? "Yes" : "No"} good={!!open.onboarded} />
                    <Chip label="Service Activated" value={open.service_activated ? "Yes" : "No"} good={!!open.service_activated} />
                    <Chip label="eKYC" value={open.ekyc_done ? "Done" : "Pending"} good={!!open.ekyc_done} />
                    <Chip label="Agent Auth Today" value={open.daily_kyc_done ? "Done" : "Pending"} good={!!open.daily_kyc_done} />
                  </div>
                </L>
              </div>
              {open.last_error && (
                <div className="sm:col-span-2"><L label="Last Error"><span className="text-rose-600">{open.last_error}</span></L></div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- payouts
function Payouts() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<"requested" | "paid" | "rejected" | "all">("requested");

  async function load() {
    setLoading(true);
    try {
      await ensureStaffSession();
      const { data, error } = await (supabase as any).rpc("admin_list_aeps_payouts", { p_status: filter === "all" ? null : filter });
      if (error) throw error;
      setRows((data as any[]) ?? []);
    } catch (e: any) { toast.error("Could not load payouts", { description: e.message }); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [filter]);

  const act = async (id: string, action: "approve" | "reject") => {
    let utr: string | null = null;
    if (action === "approve") {
      utr = window.prompt("Enter the bank payment reference / UTR for this payout:") || "";
      if (!utr.trim()) return;
    }
    setBusy(id);
    try {
      const { data, error } = await (supabase as any).rpc("admin_process_aeps_payout", { p_id: id, p_action: action, p_utr: utr, p_remarks: null });
      if (error) throw error;
      toast.success(action === "approve" ? "Marked paid" : "Rejected");
      await load();
    } catch (e: any) { toast.error("Action failed", { description: e.message }); }
    finally { setBusy(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {(["requested", "paid", "rejected", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 h-8 text-xs font-semibold ${filter === f ? "bg-india-green text-white" : "border border-border bg-card hover:bg-muted"}`}>
            {f === "requested" ? "Pending" : f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
        <button onClick={load} className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-8 text-xs font-semibold hover:bg-muted"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr><th className="p-3">Retailer</th><th className="p-3">Amount</th><th className="p-3">Bank account</th><th className="p-3">Requested</th><th className="p-3">Status</th><th className="p-3 text-right">Action</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">{loading ? "Loading…" : "No payout requests."}</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-3"><div className="font-semibold">{r.retailer_name || "—"}</div><div className="text-[11px] text-muted-foreground">{r.jsko_id} · {r.mobile}</div></td>
                <td className="p-3 font-bold">{inr(Number(r.amount))}</td>
                <td className="p-3 text-xs">{r.account_holder}<br />{r.bank_account} · {r.ifsc}</td>
                <td className="p-3 text-xs">{new Date(r.requested_at).toLocaleString("en-IN")}</td>
                <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.status === "paid" ? "bg-emerald-100 text-emerald-700" : r.status === "rejected" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>{r.status === "requested" ? "Pending" : r.status}</span>{r.utr ? <div className="mt-0.5 text-[10px] text-muted-foreground">UTR {r.utr}</div> : null}</td>
                <td className="p-3 text-right">
                  {r.status === "requested" ? (
                    <div className="inline-flex gap-1.5">
                      <button onClick={() => act(r.id, "approve")} disabled={busy === r.id} className="rounded-lg bg-india-green px-3 h-8 text-xs font-bold text-white disabled:opacity-50">{busy === r.id ? "…" : "Mark paid"}</button>
                      <button onClick={() => act(r.id, "reject")} disabled={busy === r.id} className="rounded-lg border border-border px-3 h-8 text-xs font-semibold hover:bg-muted">Reject</button>
                    </div>
                  ) : <span className="text-xs text-muted-foreground">{r.processed_at ? new Date(r.processed_at).toLocaleDateString("en-IN") : ""}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- monitor
function Monitor() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [st, setSt] = useState("all");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");

  async function load() {
    setLoading(true);
    try {
      await ensureStaffSession();
      const { data, error } = await (supabase as any).rpc("admin_aeps_transactions", { _limit: 1000 });
      if (error) throw error;
      setRows((data as Row[]) ?? []);
    } catch (e: any) {
      toast.error("Could not load AEPS transactions", { description: e.message });
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => rows.filter((r) => {
    if (st !== "all" && r.status !== st) return false;
    if (from && new Date(r.created_at) < new Date(from + "T00:00:00")) return false;
    if (to && new Date(r.created_at) > new Date(to + "T23:59:59")) return false;
    const s = q.trim().toLowerCase();
    if (s) {
      const hay = [r.jsko_id, r.retailer_name, r.distributor_name, r.customer_mobile, r.rrn, r.client_ref_id, r.bank_code]
        .filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(s)) return false;
    }
    return true;
  }), [rows, q, st, from, to]);

  const acc = (r: Row, k: string) => {
    switch (k) {
      case "date": return new Date(r.created_at).getTime();
      case "jsko": return r.jsko_id ?? "";
      case "retailer": return r.retailer_name ?? "";
      case "op": return r.operation;
      case "amount": return Number(r.amount || 0);
      case "comm": return Number(r.commission_gross || 0);
      case "status": return r.status;
      default: return "";
    }
  };
  const { sorted, sort, toggle } = useSort(filtered, acc);

  const ok = filtered.filter((r) => r.status === "success");
  const sum = (l: Row[], f: (r: Row) => number) => l.reduce((a, r) => a + Number(f(r) || 0), 0);
  const successRate = filtered.length ? Math.round((ok.length / filtered.length) * 100) : 0;

  const exportCsv = () => {
    if (!sorted.length) return toast.error("Nothing to export");
    const head = ["Date", "JSKO ID", "Retailer", "Distributor", "Operation", "Customer Mobile", "Aadhaar", "Bank", "Amount",
      "Gross Commission", "Retailer Share", "Distributor Share", "Company Share", "Settled", "RRN", "Reference", "Status", "Message"];
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const body = sorted.map((r) => [
      new Date(r.created_at).toLocaleString("en-IN"), r.jsko_id, r.retailer_name, r.distributor_name,
      r.operation, r.customer_mobile, r.aadhaar_last4 ? "XXXX" + r.aadhaar_last4 : "", r.bank_code, r.amount,
      r.commission_gross, r.commission_retailer, r.commission_distributor, r.commission_company,
      r.commission_settled ? "Yes" : "No", r.rrn, r.client_ref_id, r.status, r.message,
    ]);
    const csv = [head.map(esc).join(","), ...body.map((x) => x.map(esc).join(","))].join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `aeps_transactions_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat icon={<TrendingUp className="h-4 w-4" />} label="Transactions" value={String(filtered.length)} sub={`${successRate}% success`} />
        <Stat icon={<IndianRupee className="h-4 w-4" />} label="Value transacted" value={inr(sum(ok, (r) => r.amount))} sub={`${ok.length} successful`} />
        <Stat icon={<Users className="h-4 w-4" />} label="Paid to retailers" value={inr(sum(ok, (r) => r.commission_retailer))} sub={`+ ${inr(sum(ok, (r) => r.commission_distributor))} to distributors`} />
        <Stat icon={<Landmark className="h-4 w-4" />} label="Company margin" value={inr(sum(ok, (r) => r.commission_company))} sub={`of ${inr(sum(ok, (r) => r.commission_gross))} gross`} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {["all", "success", "failed", "pending_reconciliation"].map((k) => (
            <button key={k} onClick={() => setSt(k)}
              className={`rounded-full px-3 h-8 text-xs font-semibold capitalize transition ${st === k ? "bg-india-green text-white" : "border border-border bg-card hover:bg-muted"}`}>
              {k.replace(/_/g, " ")}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="JSKO ID, retailer, RRN…"
              className="h-8 w-52 rounded-lg border border-border bg-background pl-8 pr-2 text-xs outline-none" />
          </div>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 rounded-lg border border-border bg-background px-2 text-xs" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 rounded-lg border border-border bg-background px-2 text-xs" />
          <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-8 text-xs font-semibold hover:bg-muted"><Download className="h-3.5 w-3.5" /> Export</button>
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <SortTh label="Date" sortKey="date" sort={sort} onSort={toggle} className="px-3 py-2" />
              <SortTh label="JSKO ID" sortKey="jsko" sort={sort} onSort={toggle} className="px-3 py-2" />
              <SortTh label="Retailer" sortKey="retailer" sort={sort} onSort={toggle} className="px-3 py-2" />
              <SortTh label="Operation" sortKey="op" sort={sort} onSort={toggle} className="px-3 py-2" />
              <SortTh label="Amount" sortKey="amount" sort={sort} onSort={toggle} className="px-3 py-2" />
              <SortTh label="Commission" sortKey="comm" sort={sort} onSort={toggle} className="px-3 py-2" />
              <SortTh label="Status" sortKey="status" sort={sort} onSort={toggle} className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
            ) : sorted.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">No AEPS transactions yet.</td></tr>
            ) : sorted.map((r) => (
              <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                <td className="px-3 py-2 font-mono text-xs font-semibold">{r.jsko_id ?? "—"}</td>
                <td className="px-3 py-2">
                  {r.retailer_name ?? "—"}
                  {r.distributor_name && <div className="text-[11px] text-muted-foreground">via {r.distributor_name}</div>}
                </td>
                <td className="px-3 py-2 capitalize">{r.operation.replace(/_/g, " ")}</td>
                <td className="px-3 py-2 font-semibold">{r.amount > 0 ? inr(r.amount) : "—"}</td>
                <td className="px-3 py-2 text-xs">
                  {r.commission_gross > 0 ? (
                    <>
                      <span className="font-semibold">{inr(r.commission_gross)}</span>
                      <div className="text-[11px] text-muted-foreground">
                        R {inr(r.commission_retailer)} · D {inr(r.commission_distributor)} · Co {inr(r.commission_company)}
                      </div>
                    </>
                  ) : "—"}
                </td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${tone[r.status] ?? "bg-muted"}`}>{r.status.replace(/_/g, " ")}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ------------------------------------------------------------- commission
function CommissionSetup() {
  const [slabs, setSlabs] = useState<Slab[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Slab>(blank());
  const [saving, setSaving] = useState(false);
  const [testAmt, setTestAmt] = useState("500");
  const [testOp, setTestOp] = useState("cash_withdrawal");
  const [quote, setQuote] = useState<any>(null);
  const [twofaCharge, setTwofaCharge] = useState("");
  const [chargeSaving, setChargeSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("aeps_commission_slabs").select("*")
      .order("operation").order("min_amount");
    setSlabs((data as Slab[]) ?? []);
    const { data: cs } = await supabase.from("app_settings").select("value").eq("key", "aeps_daily_2fa_charge").maybeSingle();
    setTwofaCharge(String((cs as any)?.value ?? "0"));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (form.retailer_share + form.distributor_share > 100) return toast.error("Retailer + distributor share cannot exceed 100%");
    setSaving(true);
    try {
      await ensureStaffSession();
      const { error } = await (supabase as any).rpc("admin_save_aeps_slab", {
        _id: form.id || null,
        _operation: form.operation,
        _min: Number(form.min_amount) || 0,
        _max: form.max_amount == null || String(form.max_amount) === "" ? null : Number(form.max_amount),
        _mode: form.mode,
        _value: Number(form.value) || 0,
        _cap: form.max_commission == null || String(form.max_commission) === "" ? null : Number(form.max_commission),
        _retailer_share: Number(form.retailer_share),
        _distributor_share: Number(form.distributor_share),
        _active: form.active,
      });
      if (error) throw error;
      toast.success(form.id ? "Slab updated" : "Slab added");
      setForm(blank()); load();
    } catch (e: any) {
      toast.error("Could not save", { description: e.message });
    } finally { setSaving(false); }
  };

  const del = async (s: Slab) => {
    if (!confirm(`Delete this ${s.operation.replace(/_/g, " ")} slab?`)) return;
    await ensureStaffSession();
    const { error } = await (supabase as any).rpc("admin_delete_aeps_slab", { _id: s.id });
    if (error) return toast.error("Could not delete", { description: error.message });
    toast.success("Slab deleted"); load();
  };

  const runQuote = async () => {
    const { data, error } = await (supabase as any).rpc("aeps_quote_commission", {
      _operation: testOp, _amount: Number(testAmt) || 0,
    });
    if (error) return toast.error(error.message);
    setQuote((data as any[])?.[0] ?? null);
  };

  const saveCharge = async () => {
    const v = Number(twofaCharge);
    if (!(v >= 0)) return toast.error("Enter a valid charge (0 or more)");
    setChargeSaving(true);
    try {
      await ensureStaffSession();
      const { error } = await (supabase as any).rpc("set_app_setting", { p_key: "aeps_daily_2fa_charge", p_value: String(v) });
      if (error) throw error;
      toast.success(v > 0 ? `Daily 2FA charge set to ₹${v}` : "Daily 2FA charge disabled (₹0)");
    } catch (e: any) {
      toast.error("Could not save charge", { description: e.message });
    } finally { setChargeSaving(false); }
  };

  const companyShare = 100 - Number(form.retailer_share || 0) - Number(form.distributor_share || 0);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
        Commission is earned by the retailer on every successful <b>cash withdrawal</b> and <b>Aadhaar Pay</b>, and is credited to
        their wallet the moment the transaction succeeds. The distributor for that retailer's district earns an override, and
        BharatOne keeps the remainder. Balance enquiry and mini statement normally earn nothing.
      </div>

      {/* Daily 2FA charge */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="mb-1 text-sm font-bold">Daily 2FA charge</p>
        <p className="mb-3 text-[11px] text-muted-foreground">
          Deducted from the agent's wallet each time they complete their daily biometric authentication, and credited to the
          company account. Set to <b>0</b> to disable. Agents whose wallet balance is below the charge are blocked from daily
          authentication until they top up.
        </p>
        <div className="flex items-end gap-3">
          <L label="Charge per day (₹)">
            <div className="relative">
              <IndianRupee className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
              <input type="number" step="0.01" min="0" value={twofaCharge} onChange={(e) => setTwofaCharge(e.target.value)} className="h-10 w-40 rounded-lg border border-border bg-background pl-8 pr-3 text-sm" />
            </div>
          </L>
          <button onClick={saveCharge} disabled={chargeSaving} className="inline-flex items-center gap-1.5 rounded-lg bg-india-green px-4 h-10 text-sm font-semibold text-white disabled:opacity-50">
            {chargeSaving ? "Saving…" : "Save charge"}
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="mb-3 text-sm font-bold">{form.id ? "Edit slab" : "Add a commission slab"}</p>
        <div className="grid gap-3 sm:grid-cols-4">
          <L label="Service">
            <select value={form.operation} onChange={(e) => setForm({ ...form, operation: e.target.value })} className="h-10 w-full rounded-lg border border-border bg-background px-2 text-sm">
              {OPS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </L>
          <L label="From amount (₹)">
            <input type="number" value={form.min_amount} onChange={(e) => setForm({ ...form, min_amount: Number(e.target.value) })} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </L>
          <L label="To amount (₹) — blank = no limit">
            <input type="number" value={form.max_amount ?? ""} onChange={(e) => setForm({ ...form, max_amount: e.target.value === "" ? null : Number(e.target.value) })} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </L>
          <L label="Commission type">
            <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as any })} className="h-10 w-full rounded-lg border border-border bg-background px-2 text-sm">
              <option value="flat">Flat ₹ per transaction</option>
              <option value="percent">% of amount</option>
            </select>
          </L>
          <L label={form.mode === "flat" ? "Commission (₹)" : "Commission (%)"}>
            <div className="relative">
              {form.mode === "flat" ? <IndianRupee className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" /> : <Percent className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />}
              <input type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} className="h-10 w-full rounded-lg border border-border bg-background pl-8 pr-3 text-sm" />
            </div>
          </L>
          {form.mode === "percent" && (
            <L label="Maximum commission (₹)">
              <input type="number" value={form.max_commission ?? ""} onChange={(e) => setForm({ ...form, max_commission: e.target.value === "" ? null : Number(e.target.value) })} placeholder="optional cap" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
            </L>
          )}
          <L label="Retailer share (%)">
            <input type="number" value={form.retailer_share} onChange={(e) => setForm({ ...form, retailer_share: Number(e.target.value) })} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </L>
          <L label="Distributor share (%)">
            <input type="number" value={form.distributor_share} onChange={(e) => setForm({ ...form, distributor_share: Number(e.target.value) })} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </L>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${companyShare < 0 ? "bg-rose-100 text-rose-700" : "bg-muted"}`}>
            BharatOne keeps {companyShare}%
          </span>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-4 w-4" /> Active
          </label>
          <div className="ml-auto flex gap-2">
            {form.id && <Button variant="outline" size="sm" onClick={() => setForm(blank())}><X className="h-4 w-4" /> Cancel</Button>}
            <Button size="sm" onClick={save} disabled={saving || companyShare < 0} className="bg-india-green text-white">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : form.id ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {form.id ? "Update slab" : "Add slab"}
            </Button>
          </div>
        </div>
      </div>

      {/* Calculator */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
        <L label="Test: service">
          <select value={testOp} onChange={(e) => setTestOp(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-sm">
            {OPS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </L>
        <L label="Amount (₹)">
          <input value={testAmt} onChange={(e) => setTestAmt(e.target.value.replace(/\D/g, ""))} className="h-9 w-28 rounded-lg border border-border bg-background px-3 text-sm" />
        </L>
        <Button size="sm" variant="outline" onClick={runQuote}>Calculate</Button>
        {quote && (
          <div className="flex flex-wrap gap-2 text-xs">
            <Chip label="Gross" value={inr(quote.gross)} />
            <Chip label="Retailer" value={inr(quote.retailer)} good />
            <Chip label="Distributor" value={inr(quote.distributor)} />
            <Chip label="BharatOne" value={inr(quote.company)} />
            {!quote.slab_id && <span className="rounded-full bg-rose-100 px-2 py-1 font-semibold text-rose-700">No slab matches — nothing would be paid</span>}
          </div>
        )}
      </div>

      {/* Slabs */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Service</th>
              <th className="px-3 py-2">Amount band</th>
              <th className="px-3 py-2">Commission</th>
              <th className="px-3 py-2">Retailer</th>
              <th className="px-3 py-2">Distributor</th>
              <th className="px-3 py-2">BharatOne</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-3 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
            ) : slabs.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">No slabs yet — retailers would earn nothing. Add one above.</td></tr>
            ) : slabs.map((s) => (
              <tr key={s.id} className="border-t border-border hover:bg-muted/30">
                <td className="px-3 py-2 capitalize">{s.operation.replace(/_/g, " ")}</td>
                <td className="px-3 py-2">{inr(s.min_amount)} – {s.max_amount == null ? "no limit" : inr(s.max_amount)}</td>
                <td className="px-3 py-2 font-semibold">
                  {s.mode === "flat" ? inr(s.value) : `${s.value}%`}
                  {s.mode === "percent" && s.max_commission != null && <span className="ml-1 text-[11px] font-normal text-muted-foreground">(max {inr(s.max_commission)})</span>}
                </td>
                <td className="px-3 py-2">{s.retailer_share}%</td>
                <td className="px-3 py-2">{s.distributor_share}%</td>
                <td className="px-3 py-2">{100 - s.retailer_share - s.distributor_share}%</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${s.active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                    {s.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button onClick={() => setForm(s)} className="mr-3 text-xs font-semibold text-india-green hover:underline">Edit</button>
                  <button onClick={() => del(s)} className="text-rose-600 hover:text-rose-700"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>{children}</label>;
}
function Chip({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <span className={`rounded-full px-2.5 py-1 font-semibold ${good ? "bg-emerald-100 text-emerald-700" : "bg-muted"}`}>
      {label}: {value}
    </span>
  );
}
function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{icon} {label}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
