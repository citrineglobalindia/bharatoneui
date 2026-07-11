import { useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Loader2, RefreshCw, Search, Receipt, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

type Txn = {
  id: string; created_at: string; direction: string; amount: number; balance_after: number;
  reason: string | null; ref_type: string | null; jsko_id: string | null; name: string;
};
const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");

// Recent wallet transactions across all retailers (accountant / admin).
export function RecentTransactions({ limit = 50 }: { limit?: number }) {
  const [rows, setRows] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [dir, setDir] = useState<"all" | "credit" | "debit">("all");

  async function load() {
    setLoading(true);
    try {
      await ensureStaffSession();
      const { data } = await (supabase as any).rpc("recent_wallet_transactions", { _limit: limit });
      setRows((data as Txn[]) ?? []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [limit]);

  const filtered = useMemo(() => rows.filter((r) =>
    (dir === "all" || r.direction === dir) &&
    (!q.trim() || [r.jsko_id, r.name, r.reason, r.ref_type].filter(Boolean).some((v) => String(v).toLowerCase().includes(q.trim().toLowerCase())))
  ), [rows, q, dir]);

  const totals = useMemo(() => ({
    cr: filtered.filter((r) => r.direction === "credit").reduce((a, r) => a + Number(r.amount || 0), 0),
    dr: filtered.filter((r) => r.direction === "debit").reduce((a, r) => a + Number(r.amount || 0), 0),
  }), [filtered]);

  const exportCsv = () => {
    if (!filtered.length) return;
    const headers = ["Date & Time", "JSKO ID", "Retailer", "Type", "Amount", "Balance After", "Reason", "Reference"];
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const body = filtered.map((r) => [new Date(r.created_at).toLocaleString("en-IN"), r.jsko_id || "", r.name, r.direction === "credit" ? "Credit" : "Debit", r.amount, r.balance_after, r.reason || "", r.ref_type || ""]);
    const csv = [headers.map(esc).join(","), ...body.map((x) => x.map(esc).join(","))].join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `wallet_transactions_${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold"><Receipt className="h-4 w-4 text-india-green" /> Recent Transactions</p>
          <p className="text-xs text-muted-foreground">Latest wallet credits & debits across all retailers.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative"><Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" /><input className="h-8 w-52 rounded-lg border border-border bg-background pl-8 pr-2 text-xs outline-none" placeholder="Search JSKO ID, retailer…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <select className="h-8 rounded-lg border border-border bg-background px-2 text-xs" value={dir} onChange={(e) => setDir(e.target.value as any)}>
            <option value="all">All</option><option value="credit">Credit</option><option value="debit">Debit</option>
          </select>
          <button onClick={exportCsv} disabled={!filtered.length} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-8 text-xs font-semibold hover:bg-muted disabled:opacity-50"><Download className="h-3.5 w-3.5" /> Export</button>
          <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-8 text-xs font-semibold hover:bg-muted"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700"><ArrowDownLeft className="h-3.5 w-3.5" /> Credit {inr(totals.cr)}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 font-semibold text-rose-700"><ArrowUpRight className="h-3.5 w-3.5" /> Debit {inr(totals.dr)}</span>
        <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 font-semibold text-muted-foreground">{filtered.length} txn(s)</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr><th className="px-3 py-2">Date & Time</th><th className="px-3 py-2">JSKO ID</th><th className="px-3 py-2">Retailer</th><th className="px-3 py-2">Type</th><th className="px-3 py-2 text-right">Amount</th><th className="px-3 py-2 text-right">Balance After</th><th className="px-3 py-2">Reason</th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
              : filtered.length === 0 ? <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">No transactions yet.</td></tr>
              : filtered.map((r) => {
                const credit = r.direction === "credit";
                return (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="px-3 py-2 font-mono text-xs font-semibold">{r.jsko_id || "—"}</td>
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${credit ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                        {credit ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />} {credit ? "Credit" : "Debit"}
                      </span>
                    </td>
                    <td className={`px-3 py-2 text-right font-semibold ${credit ? "text-emerald-700" : "text-rose-700"}`}>{credit ? "+" : "−"}{inr(r.amount)}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{inr(r.balance_after)}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{r.reason || r.ref_type || "—"}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
