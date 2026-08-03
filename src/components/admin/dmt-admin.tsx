// Money Transfer (DMT) — administrator console.
//
// Three things live here: the master switch, the transaction monitor, and the
// commission slabs.
//
// The master switch matters more than it looks. Remittance cannot work until Eko
// provisions the service on the merchant account, and until then a retailer must
// be told that plainly rather than shown a form that fails. Flipping this on
// before Eko confirms would put a broken screen in front of every retailer, so
// the wording on the switch says exactly that.
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeftRight, Loader2, RefreshCw, Search, Download, Plus, Pencil, X,
  ToggleLeft, ToggleRight, AlertTriangle, TrendingUp, CheckCircle2, Clock3,
  IndianRupee, Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

const db = supabase as any;

type Stats = {
  enabled: boolean; slabs: number; senders: number; verified: number;
  today: number; today_value: number; success: number; failed: number;
  held: number; commission: number;
};
type Txn = {
  id: string; created_at: string; retailer_name: string | null; mode: string;
  amount: number; fee: number; commission: number;
  sender_mobile: string | null; sender_name: string | null; beneficiary_name: string | null;
  account_number: string | null; ifsc: string | null; bank_name: string | null;
  status: string; message: string | null; utr: string | null;
  client_ref_id: string | null; tid: string | null;
};
type Slab = {
  id: string; mode: string; min_amount: number; max_amount: number | null;
  charge_mode: string; charge_value: number; min_charge: number; max_charge: number | null;
  retailer_share: number; distributor_share: number; active: boolean;
};

const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const when = (s: string) => new Date(s).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const inp = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-india-green";

const TONE: Record<string, string> = {
  success: "bg-emerald-100 text-emerald-700", failed: "bg-rose-100 text-rose-700",
  refunded: "bg-amber-100 text-amber-700", pending_reconciliation: "bg-sky-100 text-sky-700",
  awaiting_otp: "bg-muted text-muted-foreground", expired: "bg-muted text-muted-foreground",
};

export function DmtAdmin() {
  const [tab, setTab] = useState<"monitor" | "commission">("monitor");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    await ensureStaffSession();
    const { data, error } = await db.rpc("dmt_admin_stats");
    if (error) toast.error("Could not load", { description: error.message });
    setStats((data as Stats) ?? null);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = async () => {
    const on = !stats?.enabled;
    if (on && !window.confirm(
      "Switch money transfer on for every retailer?\n\nOnly do this once Eko has confirmed the remittance service is live on the merchant account. If it is not, retailers will see failures instead of an honest message.")) return;
    const { data, error } = await db.rpc("dmt_set_enabled", { _on: on });
    if (error || !data?.ok) return toast.error("Could not change it", { description: error?.message });
    toast.success(on ? "Money transfer switched on" : "Money transfer switched off");
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold">
            <ArrowLeftRight className="h-5 w-5 text-admin" /> Money Transfer
          </h2>
          <p className="text-sm text-muted-foreground">
            Remittance to any bank account, funded from the retailer's wallet.
          </p>
        </div>
        <button onClick={load}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ${
        stats?.enabled ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
        <div className="flex items-start gap-3">
          {stats?.enabled
            ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            : <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />}
          <div>
            <p className={`text-sm font-bold ${stats?.enabled ? "text-emerald-800" : "text-amber-800"}`}>
              {stats?.enabled ? "Live for retailers" : "Not switched on"}
            </p>
            <p className={`text-xs ${stats?.enabled ? "text-emerald-800/80" : "text-amber-800/80"}`}>
              {stats?.enabled
                ? "Retailers can send money. Every transfer debits their wallet before it is submitted."
                : "Retailers see an honest “not available yet” message. Switch on only once Eko confirms the remittance service is live."}
            </p>
          </div>
        </div>
        <button onClick={toggle}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-semibold hover:bg-muted">
          {stats?.enabled ? <ToggleRight className="h-4 w-4 text-emerald-600" /> : <ToggleLeft className="h-4 w-4" />}
          {stats?.enabled ? "Switch off" : "Switch on"}
        </button>
      </div>

      {stats && stats.slabs === 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-xs">
            No commission rates are set. Every transfer would charge the customer nothing and earn the
            retailer nothing. Add a slab under <b>Commission</b> before switching the service on.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Sent today" value={String(stats?.today ?? 0)} sub={inr(stats?.today_value ?? 0)} icon={TrendingUp} />
        <Stat label="Successful" value={String(stats?.success ?? 0)} icon={CheckCircle2} tone="text-emerald-600" />
        <Stat label="Failed or refunded" value={String(stats?.failed ?? 0)} icon={AlertTriangle}
              tone={(stats?.failed ?? 0) > 0 ? "text-rose-600" : undefined} />
        <Stat label="Being verified" value={String(stats?.held ?? 0)} icon={Clock3}
              tone={(stats?.held ?? 0) > 0 ? "text-sky-600" : undefined} />
        <Stat label="Customers" value={String(stats?.senders ?? 0)} sub={`${stats?.verified ?? 0} verified`} icon={Users} />
      </div>

      <div className="flex w-fit rounded-lg border border-border bg-card p-1">
        {(["monitor", "commission"] as const).map((k) => (
          <button key={k} onClick={() => setTab(k)}
            className={`rounded-md px-4 py-1.5 text-xs font-bold capitalize transition ${
              tab === k ? "bg-india-green text-white" : "text-muted-foreground hover:bg-muted"}`}>
            {k === "monitor" ? "Transactions" : "Commission"}
          </button>
        ))}
      </div>

      {tab === "monitor" ? <DmtMonitor /> : <Commission onChanged={load} />}
    </div>
  );
}

function Stat({ label, value, sub, icon: Icon, tone }: {
  label: string; value: string; sub?: string; icon: any; tone?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <Icon className={`h-4 w-4 ${tone ?? "text-muted-foreground"}`} />
      <p className={`mt-1.5 text-xl font-extrabold ${tone ?? ""}`}>{value}</p>
      <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

/**
 * The transaction monitor, exported on its own.
 *
 * The accountant needs to see and export every transfer — it is money leaving
 * retailer wallets — but must not get the master switch or the commission
 * editor, which are the administrator's. Sharing this component rather than
 * writing a second table keeps the two views honest about the same rows.
 */
export function DmtMonitor() {
  const [rows, setRows] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db.rpc("dmt_admin_transactions", { _status: status || null, _limit: 1000 });
    if (error) toast.error("Could not load transactions", { description: error.message });
    setRows((data as Txn[]) ?? []);
    setLoading(false);
  }, [status]);
  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => [r.retailer_name, r.sender_mobile, r.sender_name, r.beneficiary_name,
      r.account_number, r.utr, r.client_ref_id, r.tid].join(" ").toLowerCase().includes(t));
  }, [rows, q]);

  const exportCsv = () => {
    const head = ["When", "Retailer", "Sender", "Sender mobile", "Beneficiary", "Account", "IFSC",
      "Amount", "Charge", "Retailer commission", "Status", "Bank reference", "Our reference", "Eko id", "Message"];
    const body = shown.map((r) => [
      when(r.created_at), r.retailer_name ?? "", r.sender_name ?? "", r.sender_mobile ?? "",
      r.beneficiary_name ?? "", r.account_number ?? "", r.ifsc ?? "",
      r.amount, r.fee, r.commission, r.status, r.utr ?? "", r.client_ref_id ?? "", r.tid ?? "", r.message ?? "",
    ]);
    const csv = [head, ...body].map((row) =>
      row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url; a.download = `bharatone-money-transfer-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <input className={`${inp} pl-9`} placeholder="Retailer, customer, beneficiary, account or reference"
            value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
          value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="success">Successful</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
          <option value="pending_reconciliation">Being verified</option>
          <option value="awaiting_otp">Awaiting OTP</option>
        </select>
        <button onClick={exportCsv}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted">
          <Download className="h-4 w-4" /> Export
        </button>
      </div>

      {loading ? (
        <div className="grid h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-india-green" /></div>
      ) : shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          {rows.length ? "Nothing matches that search." : "No transfers yet."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="p-3">When</th><th className="p-3">Retailer</th><th className="p-3">Customer</th>
                <th className="p-3">Beneficiary</th><th className="p-3 text-right">Amount</th>
                <th className="p-3 text-right">Charge</th><th className="p-3">Status</th><th className="p-3">Bank ref</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="p-3 text-xs text-muted-foreground">{when(r.created_at)}</td>
                  <td className="p-3 text-xs">{r.retailer_name ?? "—"}</td>
                  <td className="p-3">
                    <p className="text-xs font-semibold">{r.sender_name ?? "—"}</p>
                    <p className="text-[11px] text-muted-foreground">{r.sender_mobile}</p>
                  </td>
                  <td className="p-3">
                    <p className="text-xs font-semibold">{r.beneficiary_name ?? "—"}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {r.bank_name ? r.bank_name + " · " : ""}••••{(r.account_number ?? "").slice(-4)}
                    </p>
                  </td>
                  <td className="p-3 text-right font-bold">{inr(r.amount)}</td>
                  <td className="p-3 text-right text-xs">
                    {inr(r.fee)}
                    {r.commission > 0 && <p className="text-[11px] text-emerald-600">₹{r.commission} to retailer</p>}
                  </td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${TONE[r.status] ?? "bg-muted"}`}>
                      {r.status.replace(/_/g, " ")}
                    </span>
                    {r.message && r.status !== "success" && (
                      <p className="mt-0.5 max-w-[220px] text-[11px] text-muted-foreground">{r.message}</p>
                    )}
                  </td>
                  <td className="p-3 font-mono text-[11px] text-muted-foreground">{r.utr ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Commission({ onChanged }: { onChanged: () => void }) {
  const [rows, setRows] = useState<Slab[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Slab> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db.rpc("dmt_slabs_list");
    if (error) toast.error("Could not load rates", { description: error.message });
    setRows((data as Slab[]) ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-xs text-muted-foreground">
          The <b>charge</b> is what the customer pays on top of the amount sent — the retailer collects
          it in cash and it is debited from their wallet with the transfer. The <b>shares</b> decide how
          much of that charge the retailer and their distributor keep; whatever is left is BharatOne's.
        </p>
        <button onClick={() => setEditing({ mode: "ANY", charge_mode: "flat", active: true, min_amount: 0, retailer_share: 0, distributor_share: 0 })}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-india-green px-4 text-sm font-bold text-white">
          <Plus className="h-4 w-4" /> Add rate
        </button>
      </div>

      {loading ? (
        <div className="grid h-32 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-india-green" /></div>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No rates yet. Without one, transfers charge the customer nothing and earn the retailer nothing.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="p-3">Amount range</th><th className="p-3">Charge</th>
                <th className="p-3 text-center">Retailer</th><th className="p-3 text-center">Distributor</th>
                <th className="p-3 text-center">BharatOne</th><th className="p-3">Status</th><th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="p-3 font-semibold">
                    {inr(s.min_amount)} – {s.max_amount != null ? inr(s.max_amount) : "no limit"}
                  </td>
                  <td className="p-3">
                    {s.charge_mode === "percent" ? `${s.charge_value}%` : inr(s.charge_value)}
                    {(s.min_charge > 0 || s.max_charge != null) && (
                      <span className="ml-1 text-[11px] text-muted-foreground">
                        ({s.min_charge > 0 ? `min ${inr(s.min_charge)}` : ""}
                        {s.min_charge > 0 && s.max_charge != null ? ", " : ""}
                        {s.max_charge != null ? `max ${inr(s.max_charge)}` : ""})
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-center font-semibold">{s.retailer_share}%</td>
                  <td className="p-3 text-center">{s.distributor_share}%</td>
                  <td className="p-3 text-center text-muted-foreground">
                    {Math.max(0, 100 - s.retailer_share - s.distributor_share)}%
                  </td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      s.active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                      {s.active ? "Active" : "Off"}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button onClick={() => setEditing(s)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
                      <Pencil className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && <SlabDialog s={editing} onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); load(); onChanged(); }} />}
    </div>
  );
}

function SlabDialog({ s, onClose, onSaved }: {
  s: Partial<Slab>; onClose: () => void; onSaved: () => void;
}) {
  const [f, setF] = useState({
    min_amount: String(s.min_amount ?? 0),
    max_amount: s.max_amount != null ? String(s.max_amount) : "",
    charge_mode: s.charge_mode ?? "flat",
    charge_value: String(s.charge_value ?? 0),
    min_charge: String(s.min_charge ?? 0),
    max_charge: s.max_charge != null ? String(s.max_charge) : "",
    retailer_share: String(s.retailer_share ?? 0),
    distributor_share: String(s.distributor_share ?? 0),
    active: s.active ?? true,
  });
  const [busy, setBusy] = useState(false);
  const shares = Number(f.retailer_share) + Number(f.distributor_share);

  const save = async () => {
    if (shares > 100) return toast.error("The retailer and distributor shares add up to more than 100%");
    setBusy(true);
    try {
      const { error } = await db.rpc("dmt_save_slab", {
        _id: s.id ?? null, _mode: "ANY",
        _min: Number(f.min_amount) || 0,
        _max: f.max_amount === "" ? null : Number(f.max_amount),
        _charge_mode: f.charge_mode,
        _charge_value: Number(f.charge_value) || 0,
        _min_charge: Number(f.min_charge) || 0,
        _max_charge: f.max_charge === "" ? null : Number(f.max_charge),
        _retailer_share: Number(f.retailer_share) || 0,
        _distributor_share: Number(f.distributor_share) || 0,
        _active: f.active,
      });
      if (error) throw error;
      toast.success(s.id ? "Rate updated" : "Rate added");
      onSaved();
    } catch (e: any) {
      const m = String(e.message || e);
      toast.error("Could not save", {
        description: m.includes("MAX_BELOW_MIN") ? "The upper bound must be above the lower bound."
          : m.includes("SHARES_EXCEED_100") ? "The shares add up to more than 100%." : m,
      });
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-navy/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-card p-5 shadow-elev" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <h3 className="flex items-center gap-2 text-base font-extrabold">
            <IndianRupee className="h-4 w-4 text-india-green" /> {s.id ? "Edit rate" : "Add rate"}
          </h3>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Num label="From amount" v={f.min_amount} on={(v) => setF({ ...f, min_amount: v })} />
            <Num label="To amount" v={f.max_amount} on={(v) => setF({ ...f, max_amount: v })} hint="blank = no limit" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Charge the customer</label>
            <div className="flex gap-2">
              <select className="h-10 rounded-lg border border-border bg-background px-2 text-sm"
                value={f.charge_mode} onChange={(e) => setF({ ...f, charge_mode: e.target.value })}>
                <option value="flat">Flat ₹</option>
                <option value="percent">Percent</option>
              </select>
              <input className={inp} inputMode="decimal" value={f.charge_value}
                onChange={(e) => setF({ ...f, charge_value: e.target.value.replace(/[^\d.]/g, "") })} />
            </div>
          </div>
          {f.charge_mode === "percent" && (
            <div className="grid grid-cols-2 gap-3">
              <Num label="Minimum charge" v={f.min_charge} on={(v) => setF({ ...f, min_charge: v })} />
              <Num label="Maximum charge" v={f.max_charge} on={(v) => setF({ ...f, max_charge: v })} hint="blank = none" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Num label="Retailer share %" v={f.retailer_share} on={(v) => setF({ ...f, retailer_share: v })} />
            <Num label="Distributor share %" v={f.distributor_share} on={(v) => setF({ ...f, distributor_share: v })} />
          </div>
          <p className={`rounded-lg p-2.5 text-[11px] ${shares > 100 ? "bg-rose-50 text-rose-700" : "bg-muted/40 text-muted-foreground"}`}>
            {shares > 100
              ? "These add up to more than the whole charge."
              : `BharatOne keeps ${Math.max(0, 100 - shares)}% of the charge.`}
          </p>
          <label className="flex items-center gap-2 text-xs font-semibold">
            <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />
            Active
          </label>
          <div className="flex gap-2">
            <button onClick={onClose} className="h-10 flex-1 rounded-lg border border-border text-sm font-semibold hover:bg-muted">Cancel</button>
            <button onClick={save} disabled={busy || shares > 100}
              className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-india-green text-sm font-bold text-white disabled:opacity-50">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Num({ label, v, on, hint }: { label: string; v: string; on: (v: string) => void; hint?: string }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</label>
      <input className={inp} inputMode="decimal" value={v} onChange={(e) => on(e.target.value.replace(/[^\d.]/g, ""))} />
      {hint && <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
