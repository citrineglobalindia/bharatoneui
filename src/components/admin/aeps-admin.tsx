import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Landmark, Loader2, RefreshCw, Plus, Trash2, Save, Download, Search,
  Percent, IndianRupee, TrendingUp, Users, X,
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
  const [tab, setTab] = useState<"monitor" | "commission">("monitor");
  return (
    <div className="space-y-5">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-extrabold"><Landmark className="h-5 w-5 text-admin" /> AEPS Banking</h2>
        <p className="text-sm text-muted-foreground">Set the commission retailers earn, and monitor every AEPS transaction.</p>
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

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("aeps_commission_slabs").select("*")
      .order("operation").order("min_amount");
    setSlabs((data as Slab[]) ?? []);
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

  const companyShare = 100 - Number(form.retailer_share || 0) - Number(form.distributor_share || 0);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
        Commission is earned by the retailer on every successful <b>cash withdrawal</b> and <b>Aadhaar Pay</b>, and is credited to
        their wallet the moment the transaction succeeds. The distributor for that retailer's district earns an override, and
        BharatOne keeps the remainder. Balance enquiry and mini statement normally earn nothing.
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
