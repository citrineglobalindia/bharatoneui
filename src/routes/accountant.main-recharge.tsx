import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Banknote, Plus, Loader2, RefreshCw, ArrowDownToLine, ArrowUpFromLine, Search, Download } from "lucide-react";
import { AccountantShell } from "@/components/accountant/accountant-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";
import { useSort, SortTh, useColumnFilters, FilterTh } from "@/components/ui/sortable";
import { exportRowsToCsv } from "@/components/ui/table-toolbar";

export const Route = createFileRoute("/accountant/main-recharge")({
  head: () => ({ meta: [{ title: "Main Account Recharge — BharatOne Accountant" }] }),
  component: MainRechargePage,
});

type Ledger = { id: string; direction: "credit" | "debit"; amount: number; balance_after: number; reason: string | null; created_at: string };
const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");

function MainRechargePage() {
  const [balance, setBalance] = useState(0);
  const [ledger, setLedger] = useState<Ledger[]>([]);
  const [loading, setLoading] = useState(true);
  const [amt, setAmt] = useState(""); const [note, setNote] = useState(""); const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      await ensureStaffSession();
      const [b, l] = await Promise.all([
        supabase.rpc("company_balance"),
        supabase.from("company_ledger").select("id,direction,amount,balance_after,reason,created_at").order("created_at", { ascending: false }).limit(100),
      ]);
      setBalance(Number((b.data as any) ?? 0));
      setLedger((l.data as Ledger[]) ?? []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const recharge = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = Number(amt); if (!v || v <= 0) return toast.error("Enter a valid amount");
    setBusy(true);
    const { error } = await supabase.rpc("recharge_company_account", { p_amount: v, p_note: note || null });
    setBusy(false);
    if (error) return toast.error("Recharge failed", { description: error.message });
    toast.success("Main account recharged"); setAmt(""); setNote(""); load();
  };

  const totals = useMemo(() => ({
    credit: ledger.filter((l) => l.direction === "credit").reduce((a, l) => a + Number(l.amount), 0),
    debit: ledger.filter((l) => l.direction === "debit").reduce((a, l) => a + Number(l.amount), 0),
  }), [ledger]);

  const [q, setQ] = useState(""); const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const f = from ? new Date(from + "T00:00:00").getTime() : null;
    const t = to ? new Date(to + "T23:59:59").getTime() : null;
    return ledger.filter((l) => {
      if (f || t) { const d = new Date(l.created_at).getTime(); if (f && d < f) return false; if (t && d > t) return false; }
      if (s && !`${l.reason ?? ""} ${l.direction} ${l.amount}`.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [ledger, q, from, to]);
  const acc = (l: Ledger, key: string) => {
    switch (key) {
      case "date": return new Date(l.created_at).getTime();
      case "details": return l.reason ?? l.direction;
      case "amount": return Number(l.amount || 0);
      case "balance": return Number(l.balance_after || 0);
      default: return "";
    }
  };
  const cf = useColumnFilters<Ledger>();
  const colFiltered = useMemo(() => cf.apply(filtered, acc), [filtered, cf.filters]);
  const { sorted, sort, toggle } = useSort(colFiltered, acc);
  const exportCsv = () => {
    if (filtered.length === 0) return toast.error("No rows to export");
    exportRowsToCsv(sorted, [
      { header: "Date", value: (l) => new Date(l.created_at).toLocaleString("en-IN") },
      { header: "Details", value: (l) => l.reason ?? l.direction },
      { header: "Direction", value: (l) => l.direction },
      { header: "Amount", value: (l) => l.amount },
      { header: "Balance", value: (l) => l.balance_after },
    ], `main-account-ledger-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success("Exported", { description: `${sorted.length} rows` });
  };

  return (
    <AccountantShell>
      <div className="space-y-5">
        <PageHeader icon={<Banknote className="h-5 w-5" />} title="Main Account Recharge" subtitle="Company float used to credit retailer wallets."
          actions={<button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-10 text-sm font-semibold hover:bg-muted"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button>} />

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl bg-saffron-gradient p-5 text-white shadow-elev">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-90">Main Account Balance</p>
            <p className="mt-1 font-display text-3xl font-extrabold">{loading ? "…" : inr(balance)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft lg:col-span-2">
            <p className="mb-3 flex items-center gap-2 text-sm font-bold"><Plus className="h-4 w-4 text-india-green" /> Recharge main account</p>
            <form onSubmit={recharge} className="grid gap-3 sm:grid-cols-4">
              <input type="number" min="1" className="h-10 rounded-lg border border-border bg-background px-2 text-sm sm:col-span-1" placeholder="Amount" value={amt} onChange={(e) => setAmt(e.target.value)} />
              <input className="h-10 rounded-lg border border-border bg-background px-2 text-sm sm:col-span-2" placeholder="Note / reference (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
              <Button type="submit" disabled={busy} className="bg-india-green text-white hover:bg-india-green/90">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Recharge</Button>
            </form>
            <p className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <span className="rounded-lg bg-emerald-50 px-3 py-2">Total in <b className="text-emerald-700">{inr(totals.credit)}</b></span>
              <span className="rounded-lg bg-rose-50 px-3 py-2">Total disbursed <b className="text-rose-600">{inr(totals.debit)}</b></span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-lg bg-slate-100 px-3 h-9"><Search className="h-4 w-4 text-muted-foreground" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search details / amount…" className="bg-transparent flex-1 text-sm outline-none placeholder:text-muted-foreground" /></div>
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2 h-9 text-xs"><span className="font-semibold text-muted-foreground">From</span><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-transparent outline-none" /><span className="font-semibold text-muted-foreground">To</span><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="bg-transparent outline-none" />{(from || to) && <button onClick={() => { setFrom(""); setTo(""); }} className="ml-1 rounded px-1.5 py-0.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50">Clear</button>}</div>
          <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg bg-india-green px-3 h-9 text-sm font-semibold text-white hover:bg-india-green/90"><Download className="h-4 w-4" /> Export</button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground"><tr><SortTh className="px-3 py-2" label="Date" sortKey="date" sort={sort} onSort={toggle} /><SortTh className="px-3 py-2" label="Details" sortKey="details" sort={sort} onSort={toggle} /><SortTh className="px-3 py-2 text-right" label="Amount" sortKey="amount" sort={sort} onSort={toggle} /><SortTh className="px-3 py-2 text-right" label="Balance" sortKey="balance" sort={sort} onSort={toggle} /></tr><tr className="bg-muted/30"><FilterTh className="px-2 pb-2" filterKey="date" filters={cf.filters} setFilter={cf.setFilter} optionsFor={cf.optionsFor} /><FilterTh className="px-2 pb-2" filterKey="details" filters={cf.filters} setFilter={cf.setFilter} optionsFor={cf.optionsFor} /><FilterTh className="px-2 pb-2" filterKey="amount" filters={cf.filters} setFilter={cf.setFilter} optionsFor={cf.optionsFor} /><FilterTh className="px-2 pb-2" filterKey="balance" filters={cf.filters} setFilter={cf.setFilter} optionsFor={cf.optionsFor} /></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={4} className="px-3 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
                : sorted.length === 0 ? <tr><td colSpan={4} className="px-3 py-10 text-center text-muted-foreground">No movements yet. Recharge to add float.</td></tr>
                : sorted.map((l) => (<tr key={l.id} className="border-t border-border">
                  <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{new Date(l.created_at).toLocaleString("en-IN")}</td>
                  <td className="px-3 py-2"><span className="inline-flex items-center gap-1.5">{l.direction === "credit" ? <ArrowDownToLine className="h-3.5 w-3.5 text-emerald-600" /> : <ArrowUpFromLine className="h-3.5 w-3.5 text-rose-500" />}{l.reason ?? l.direction}</span></td>
                  <td className={`px-3 py-2 text-right font-semibold ${l.direction === "credit" ? "text-emerald-600" : "text-rose-500"}`}>{l.direction === "credit" ? "+" : "−"}{inr(l.amount)}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{inr(l.balance_after)}</td>
                </tr>))}
            </tbody>
          </table>
        </div>
      </div>
    </AccountantShell>
  );
}
