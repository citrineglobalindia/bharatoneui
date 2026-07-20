import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, CreditCard, ShieldCheck, Search, ExternalLink, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";
import { useSort, SortTh, useColumnFilters, FilterTh } from "@/components/ui/sortable";
import { exportRowsToCsv } from "@/components/ui/table-toolbar";
import { Download } from "lucide-react";

type Payment = { id: string; user_id: string | null; purpose: string; amount: number; status: string; order_id: string | null; payment_id: string | null; wallet_recharge_id: string | null; created_at: string };

const db = supabase as any;
const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");
const statusTone: Record<string, string> = {
  paid: "bg-amber-100 text-amber-700", credited: "bg-emerald-100 text-emerald-700", created: "bg-slate-100 text-slate-600",
  failed: "bg-rose-100 text-rose-700", not_configured: "bg-slate-100 text-slate-600",
};
const statusLabel: Record<string, string> = {
  paid: "Received · verify", credited: "Credited", created: "Started", failed: "Failed", not_configured: "Not configured",
};
const purposeLabel: Record<string, string> = {
  wallet_topup: "Wallet recharge", registration_fee: "Registration fee", service_payment: "Service payment",
};

export function RazorpayLedger() {
  const [rows, setRows] = useState<Payment[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "paid" | "credited" | "failed">("paid");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [confirmRow, setConfirmRow] = useState<Payment | null>(null);
  const [busy, setBusy] = useState(false);

  const confirmPay = async (r: Payment) => {
    setBusy(true);
    const { data, error } = await db.rpc("accountant_confirm_razorpay", { p_payment: r.id });
    setBusy(false);
    if (error) return toast.error("Could not credit wallet", { description: error.message });
    toast.success("Wallet recharged", { description: `Ref ${(data as any)?.wallet_recharge_id ?? ""} — retailer notified.` });
    setConfirmRow(null); load();
  };

  async function load() {
    setLoading(true);
    await ensureStaffSession();
    const [{ data }, { data: users }] = await Promise.all([
      db.from("razorpay_payments")
        .select("id,user_id,purpose,amount,status,order_id,payment_id,wallet_recharge_id,created_at")
        .order("created_at", { ascending: false }).limit(300),
      db.rpc("admin_list_users"),
    ]);
    setRows((data as Payment[]) ?? []);
    const m: Record<string, string> = {};
    for (const u of (users as any[]) ?? []) m[u.id] = u.display_name || u.email || "Retailer";
    setNames(m);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const paid = rows.filter((r) => r.status === "paid");
    return { count: paid.length, total: paid.reduce((a, r) => a + Number(r.amount), 0) };
  }, [rows]);

  const filtered = useMemo(() => {
    const f = from ? new Date(from + "T00:00:00").getTime() : null;
    const t = to ? new Date(to + "T23:59:59").getTime() : null;
    return rows.filter((r) => {
      if (tab !== "all" && r.status !== tab) return false;
      if (f || t) { const d = new Date(r.created_at).getTime(); if (f && d < f) return false; if (t && d > t) return false; }
      if (q && ![names[r.user_id ?? ""], r.order_id, r.payment_id, purposeLabel[r.purpose]].filter(Boolean).some((v) => String(v).toLowerCase().includes(q.toLowerCase()))) return false;
      return true;
    });
  }, [rows, tab, q, from, to, names]);

  const acc = (r: Payment, key: string) => {
    switch (key) {
      case "date": return new Date(r.created_at).getTime();
      case "retailer": return r.user_id ? (names[r.user_id] ?? "") : "";
      case "amount": return Number(r.amount || 0);
      case "status": return statusLabel[r.status] ?? r.status;
      case "payment": return r.payment_id ?? "";
      case "recharge": return r.wallet_recharge_id ?? "";
      default: return "";
    }
  };
  const cf = useColumnFilters<Payment>();
  const colFiltered = useMemo(() => cf.apply(filtered, acc), [filtered, cf.filters]);
  const { sorted, sort, toggle } = useSort(colFiltered, acc);

  const exportCsv = () => {
    if (filtered.length === 0) return toast.error("No rows to export");
    exportRowsToCsv(sorted, [
      { header: "Date", value: (r) => new Date(r.created_at).toLocaleString("en-IN") },
      { header: "Retailer", value: (r) => r.user_id ? (names[r.user_id] ?? "Retailer") : "" },
      { header: "Amount", value: (r) => r.amount },
      { header: "Status", value: (r) => statusLabel[r.status] ?? r.status },
      { header: "Purpose", value: (r) => purposeLabel[r.purpose] ?? r.purpose },
      { header: "Payment ID", value: (r) => r.payment_id ?? "" },
      { header: "Order ID", value: (r) => r.order_id ?? "" },
      { header: "Recharge ID", value: (r) => r.wallet_recharge_id ?? "" },
    ], `razorpay-payments-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success("Exported", { description: `${sorted.length} rows` });
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold"><CreditCard className="h-4 w-4 text-india-green" /> Razorpay Payments</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5 text-india-green" /> Razorpay verifies the signature; you cross-check in the dashboard, then Confirm &amp; recharge to credit the wallet.</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-9 text-sm font-semibold hover:bg-muted"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Successful</p><p className="text-lg font-extrabold">{stats.count}</p></div>
        <div className="rounded-xl border border-border p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Collected online</p><p className="text-lg font-extrabold text-india-green">{inr(stats.total)}</p></div>
        <div className="rounded-xl border border-border p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Records</p><p className="text-lg font-extrabold">{rows.length}</p></div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {([["paid", "Awaiting verify"], ["credited", "Credited"], ["failed", "Failed"], ["all", "All"]] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full px-3 h-8 text-xs font-semibold transition ${tab === t ? "bg-india-green text-white" : "border border-border bg-card hover:bg-muted"}`}>{label} {t !== "all" && `(${rows.filter((r) => r.status === t).length})`}</button>
        ))}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2 h-9 text-xs">
            <span className="font-semibold text-muted-foreground">From</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-transparent outline-none" />
            <span className="font-semibold text-muted-foreground">To</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="bg-transparent outline-none" />
            {(from || to) && <button onClick={() => { setFrom(""); setTo(""); }} className="ml-1 rounded px-1.5 py-0.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50">Clear</button>}
          </div>
          <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><input className="h-9 w-56 rounded-lg border border-border bg-background pl-8 pr-2 text-sm outline-none" placeholder="Search retailer, order, payment id" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg bg-india-green px-3 h-9 text-sm font-semibold text-white hover:bg-india-green/90"><Download className="h-4 w-4" /> Export</button>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr><SortTh className="px-3 py-2" label="Date" sortKey="date" sort={sort} onSort={toggle} /><SortTh className="px-3 py-2" label="Retailer" sortKey="retailer" sort={sort} onSort={toggle} /><SortTh className="px-3 py-2" label="Amount" sortKey="amount" sort={sort} onSort={toggle} /><SortTh className="px-3 py-2" label="Status" sortKey="status" sort={sort} onSort={toggle} /><SortTh className="px-3 py-2" label="Payment ID" sortKey="payment" sort={sort} onSort={toggle} /><SortTh className="px-3 py-2" label="Recharge ID" sortKey="recharge" sort={sort} onSort={toggle} /><th className="px-3 py-2 text-right">Action</th></tr>
            <tr className="bg-muted/30">
              <FilterTh className="px-2 pb-2" filterKey="date" filters={cf.filters} setFilter={cf.setFilter} />
              <FilterTh className="px-2 pb-2" filterKey="retailer" filters={cf.filters} setFilter={cf.setFilter} />
              <FilterTh className="px-2 pb-2" filterKey="amount" filters={cf.filters} setFilter={cf.setFilter} />
              <FilterTh className="px-2 pb-2" filterKey="status" filters={cf.filters} setFilter={cf.setFilter} />
              <FilterTh className="px-2 pb-2" filterKey="payment" filters={cf.filters} setFilter={cf.setFilter} />
              <FilterTh className="px-2 pb-2" filterKey="recharge" filters={cf.filters} setFilter={cf.setFilter} />
              <th className="px-2 pb-2" />
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
              : sorted.length === 0 ? <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">No Razorpay payments{tab !== "all" || q ? " for this filter" : " yet"}.</td></tr>
              : sorted.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td>
                  <td className="px-3 py-2 font-medium">{r.user_id ? (names[r.user_id] ?? "Retailer") : "—"}</td>
                  <td className="px-3 py-2 font-semibold">{inr(r.amount)}</td>
                  <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusTone[r.status] ?? "bg-slate-100 text-slate-600"}`}>{statusLabel[r.status] ?? r.status}</span></td>
                  <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{r.payment_id ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-[11px] font-semibold text-india-green">{r.wallet_recharge_id ?? "—"}</td>
                  <td className="px-3 py-2 text-right">
                    {r.status === "paid" && <button onClick={() => setConfirmRow(r)} className="inline-flex items-center gap-1 rounded-md bg-india-green px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-india-green/90"><CheckCircle2 className="h-3.5 w-3.5" /> Confirm &amp; recharge</button>}
                    {r.status === "credited" && <span className="text-[11px] font-semibold text-emerald-600">Recharged</span>}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {confirmRow && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setConfirmRow(null)}>
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-elev" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-2 text-lg font-bold"><ShieldCheck className="h-5 w-5 text-india-green" /> Confirm payment</p>
              <button onClick={() => setConfirmRow(null)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            <p className="text-sm text-muted-foreground">Cross-check this payment in your <b>Razorpay dashboard</b> first. On confirm, the retailer's wallet is recharged and a Wallet Recharge ID is generated.</p>
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <div><p className="text-[10px] uppercase text-muted-foreground">Retailer</p><p className="font-semibold">{confirmRow.user_id ? (names[confirmRow.user_id] ?? "Retailer") : "—"}</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">Amount</p><p className="font-semibold">{inr(confirmRow.amount)}</p></div>
              <div className="col-span-2"><p className="text-[10px] uppercase text-muted-foreground">Payment ID</p><p className="font-mono text-xs">{confirmRow.payment_id ?? "—"}</p></div>
              <div className="col-span-2"><p className="text-[10px] uppercase text-muted-foreground">Order ID</p><p className="font-mono text-xs">{confirmRow.order_id ?? "—"}</p></div>
            </div>
            <a href="https://dashboard.razorpay.com/app/payments" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-india-green hover:underline"><ExternalLink className="h-3.5 w-3.5" /> Open Razorpay dashboard</a>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setConfirmRow(null)} className="flex-1 rounded-lg border border-border px-4 h-10 text-sm font-semibold hover:bg-muted">Cancel</button>
              <button onClick={() => confirmPay(confirmRow)} disabled={busy} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-india-green px-4 h-10 text-sm font-bold text-white hover:bg-india-green/90 disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Confirm &amp; recharge</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
