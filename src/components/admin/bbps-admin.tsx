import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Receipt, Loader2, RefreshCw, Plus, Trash2, Save, Download, Search,
  IndianRupee, TrendingUp, AlertTriangle, CheckCircle2, Undo2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

type Row = {
  id: string; created_at: string; category: string; operator_name: string | null;
  retailer_name: string | null; jsko_id: string | null; amount: number;
  convenience_fee: number; status: string; client_ref_id: string; tid: string | null;
  message: string | null; commission: number; wallet_debited: boolean;
};
type Slab = {
  id: string; category: string; min_amount: number; max_amount: number | null;
  mode: "flat" | "percent"; value: number; max_commission: number | null;
  retailer_share: number; distributor_share: number; active: boolean;
};

const CATEGORIES = ["Mobile Prepaid", "Electricity", "DTH", "Gas", "Broadband Postpaid"];
const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const tone: Record<string, string> = {
  success: "bg-emerald-100 text-emerald-700",
  failed: "bg-rose-100 text-rose-700",
  refunded: "bg-slate-100 text-slate-600",
  pending: "bg-amber-100 text-amber-700",
  pending_reconciliation: "bg-amber-100 text-amber-800",
};
const blank = (): Slab => ({
  id: "", category: "Mobile Prepaid", min_amount: 0, max_amount: null,
  mode: "flat", value: 0, max_commission: null, retailer_share: 70, distributor_share: 10, active: true,
});

export function BbpsAdmin() {
  const [tab, setTab] = useState<"monitor" | "commission">("monitor");
  return (
    <div className="space-y-5">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-extrabold">
          <Receipt className="h-5 w-5 text-admin" /> Recharge &amp; Bill Payment
        </h2>
        <p className="text-sm text-muted-foreground">
          Monitor BBPS payments, resolve stuck transactions, and set retailer commission.
        </p>
      </div>
      <div className="flex gap-1.5">
        {([["monitor", "Transaction Monitor"], ["commission", "Commission Setup"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`rounded-full px-4 h-9 text-xs font-semibold transition ${tab === k ? "bg-india-green text-white" : "border border-border bg-card hover:bg-muted"}`}>
            {l}
          </button>
        ))}
      </div>
      {tab === "monitor" ? <Monitor /> : <CommissionSetup />}
    </div>
  );
}

function Monitor() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    await ensureStaffSession();
    const { data, error } = await (supabase as any).rpc("admin_list_bbps", { _status: status, _limit: 300 });
    if (error) toast.error(error.message);
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [status]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => [r.retailer_name, r.jsko_id, r.category, r.operator_name, r.client_ref_id, r.tid]
      .some((f) => String(f ?? "").toLowerCase().includes(s)));
  }, [rows, q]);

  const stuck = rows.filter((r) => r.status === "pending_reconciliation" || r.status === "pending").length;
  const succeeded = rows.filter((r) => r.status === "success");
  const volume = succeeded.reduce((a, r) => a + Number(r.amount || 0), 0);
  const commission = succeeded.reduce((a, r) => a + Number(r.commission || 0), 0);

  const resolve = async (r: Row, outcome: "success" | "failed") => {
    const verb = outcome === "success" ? "confirm as SUCCESSFUL (retailer keeps the debit)" : "mark FAILED and refund the retailer";
    const note = prompt(`This will ${verb}.\n\n${r.category} · ${inr(r.amount)} · ${r.client_ref_id}\n\nCheck the biller's portal first. Add a note:`);
    if (note === null) return;
    const { data, error } = await (supabase as any).rpc("admin_resolve_bbps", { p_txn: r.id, p_outcome: outcome, p_note: note || null });
    if (error) return toast.error(error.message);
    toast.success(data === "refunded" ? "Refunded to the retailer's wallet" : "Marked successful");
    load();
  };

  const exportCsv = () => {
    const head = ["When", "Retailer", "JSKO ID", "Category", "Operator", "Amount", "Fee", "Commission", "Status", "Reference", "Txn ID", "Message"];
    const body = filtered.map((r) => [
      new Date(r.created_at).toLocaleString("en-IN"), r.retailer_name, r.jsko_id, r.category, r.operator_name,
      r.amount, r.convenience_fee, r.commission, r.status, r.client_ref_id, r.tid, r.message,
    ]);
    const csv = [head, ...body].map((line) => line.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = `bbps-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat icon={<IndianRupee className="h-4 w-4" />} label="Successful volume" value={inr(volume)} sub={`${succeeded.length} payments`} />
        <Stat icon={<TrendingUp className="h-4 w-4" />} label="Retailer commission" value={inr(commission)} />
        <Stat icon={<AlertTriangle className="h-4 w-4" />} label="Needs attention" value={String(stuck)} sub="Pending / unreconciled" />
      </div>

      {stuck > 0 && (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {stuck} payment{stuck > 1 ? "s are" : " is"} unresolved. The retailer's money is still held.
            Check the biller's portal for each one, then confirm or refund below — never guess.
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search retailer, JSKO ID, operator, reference…"
            className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="h-9 rounded-lg border border-border bg-card px-3 text-xs font-semibold">
          <option value="all">All statuses</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
          <option value="pending_reconciliation">Unreconciled</option>
          <option value="pending">Pending</option>
        </select>
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
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Retailer</th>
              <th className="px-3 py-2">Service</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Commission</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">No bill payments yet.</td></tr>
            ) : filtered.map((r) => (
              <tr key={r.id} className="border-t border-border align-top">
                <td className="px-3 py-2.5 whitespace-nowrap text-[11px] text-muted-foreground">
                  {new Date(r.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                </td>
                <td className="px-3 py-2.5">
                  <div className="font-medium">{r.retailer_name ?? "—"}</div>
                  <div className="text-[11px] text-muted-foreground">{r.jsko_id ?? "—"}</div>
                </td>
                <td className="px-3 py-2.5">
                  <div>{r.category}</div>
                  <div className="text-[11px] text-muted-foreground">{r.operator_name ?? "—"}</div>
                </td>
                <td className="px-3 py-2.5 font-semibold">
                  {inr(r.amount)}
                  {r.convenience_fee > 0 && <div className="text-[10px] text-muted-foreground">+{inr(r.convenience_fee)} fee</div>}
                </td>
                <td className="px-3 py-2.5 text-emerald-700">{r.commission > 0 ? inr(r.commission) : "—"}</td>
                <td className="px-3 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${tone[r.status] ?? "bg-muted"}`}>
                    {r.status.replace(/_/g, " ")}
                  </span>
                  <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">{r.client_ref_id}</div>
                  {r.message && r.status !== "success" && (
                    <div className="mt-0.5 max-w-[240px] text-[10px] text-muted-foreground">{r.message}</div>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  {(r.status === "pending_reconciliation" || r.status === "pending") ? (
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <button onClick={() => resolve(r, "success")}
                        className="inline-flex items-center gap-1 rounded-md border border-emerald-200 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Paid
                      </button>
                      <button onClick={() => resolve(r, "failed")}
                        className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50">
                        <Undo2 className="h-3.5 w-3.5" /> Refund
                      </button>
                    </div>
                  ) : (
                    <div className="text-right text-[11px] text-muted-foreground">{r.tid ?? "—"}</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CommissionSetup() {
  const [rows, setRows] = useState<Slab[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Slab>(blank());
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    await ensureStaffSession();
    const { data } = await (supabase as any).from("bbps_commission_slabs").select("*").order("category").order("min_amount");
    setRows((data as Slab[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (draft.retailer_share + draft.distributor_share > 100) {
      return toast.error("Retailer and distributor share cannot exceed 100%");
    }
    setSaving(true);
    const { id, ...payload } = draft;
    const { error } = await (supabase as any).from("bbps_commission_slabs").insert(payload as never);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Slab added");
    setDraft(blank());
    load();
  };

  const remove = async (r: Slab) => {
    if (!confirm(`Delete the ${r.category} slab?`)) return;
    const { error } = await (supabase as any).from("bbps_commission_slabs").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="mb-1 flex items-center gap-2 text-sm font-bold"><Plus className="h-4 w-4 text-india-green" /> Add a commission slab</p>
        <p className="mb-4 text-[11px] text-muted-foreground">
          The retailer's share is credited to their wallet automatically on every successful payment.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <L label="Category">
            <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </L>
          <L label="Min amount">
            <input type="number" value={draft.min_amount} onChange={(e) => setDraft({ ...draft, min_amount: Number(e.target.value) })}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </L>
          <L label="Max amount (blank = no limit)">
            <input type="number" value={draft.max_amount ?? ""} onChange={(e) => setDraft({ ...draft, max_amount: e.target.value === "" ? null : Number(e.target.value) })}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </L>
          <L label="Mode">
            <select value={draft.mode} onChange={(e) => setDraft({ ...draft, mode: e.target.value as "flat" | "percent" })}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
              <option value="flat">Flat ₹</option>
              <option value="percent">Percent %</option>
            </select>
          </L>
          <L label={draft.mode === "percent" ? "Percent of bill" : "Flat amount"}>
            <input type="number" step="0.01" value={draft.value} onChange={(e) => setDraft({ ...draft, value: Number(e.target.value) })}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </L>
          <L label="Cap (optional)">
            <input type="number" value={draft.max_commission ?? ""} onChange={(e) => setDraft({ ...draft, max_commission: e.target.value === "" ? null : Number(e.target.value) })}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </L>
          <L label="Retailer share %">
            <input type="number" value={draft.retailer_share} onChange={(e) => setDraft({ ...draft, retailer_share: Number(e.target.value) })}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </L>
          <L label="Distributor share %">
            <input type="number" value={draft.distributor_share} onChange={(e) => setDraft({ ...draft, distributor_share: Number(e.target.value) })}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </L>
        </div>
        <button onClick={save} disabled={saving}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-india-green px-4 h-10 text-sm font-semibold text-white hover:bg-india-green/90 disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Add slab
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Range</th>
              <th className="px-3 py-2">Commission</th>
              <th className="px-3 py-2">Retailer</th>
              <th className="px-3 py-2">Distributor</th>
              <th className="px-3 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-3 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">No slabs yet — retailers earn nothing until you add one.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-3 py-2.5 font-medium">{r.category}</td>
                <td className="px-3 py-2.5">{inr(r.min_amount)} – {r.max_amount == null ? "∞" : inr(r.max_amount)}</td>
                <td className="px-3 py-2.5">
                  {r.mode === "percent" ? `${r.value}%` : inr(r.value)}
                  {r.max_commission != null && <span className="text-[11px] text-muted-foreground"> (max {inr(r.max_commission)})</span>}
                </td>
                <td className="px-3 py-2.5">{r.retailer_share}%</td>
                <td className="px-3 py-2.5">{r.distributor_share}%</td>
                <td className="px-3 py-2.5 text-right">
                  <button onClick={() => remove(r)} className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50">
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
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
  return <div><label className="text-[11px] font-semibold text-muted-foreground">{label}</label><div className="mt-1">{children}</div></div>;
}
function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{icon} {label}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
