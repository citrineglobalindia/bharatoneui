import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeftRight, Download, Search, Loader2, ArrowDownToLine, ArrowUpFromLine, RefreshCw } from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/transactions")({
  head: () => ({ meta: [{ title: "Transactions — BharatOne" }] }),
  component: TxnPage,
});

type Tx = { id: string; direction: "credit" | "debit"; amount: number; balance_after: number; reason: string | null; ref_type: string | null; created_at: string };
const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");
const appIdOf = (reason: string | null) => (reason || "").match(/\b(APP\d+)\b/)?.[1] ?? "";
const svcNameOf = (reason: string | null) => (reason || "").replace(/^Application\s+\S+\s*[-·]\s*/i, "").trim();

function TxnPage() {
  const [rows, setRows] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [dir, setDir] = useState<"all" | "credit" | "debit">("all");

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("wallet_transactions").select("id,direction,amount,balance_after,reason,ref_type,created_at").order("created_at", { ascending: false }).limit(500);
    setRows((data as Tx[]) ?? []); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const totals = useMemo(() => ({
    credit: rows.filter((r) => r.direction === "credit").reduce((a, r) => a + Number(r.amount), 0),
    debit: rows.filter((r) => r.direction === "debit").reduce((a, r) => a + Number(r.amount), 0),
    count: rows.length,
  }), [rows]);
  const filtered = useMemo(() => rows.filter((r) => (dir === "all" || r.direction === dir) && (!q || (r.reason ?? "").toLowerCase().includes(q.toLowerCase()))), [rows, q, dir]);

  const exportCsv = () => {
    const head = ["Date", "Type", "Details", "Amount", "Balance"].join(",");
    const body = filtered.map((r) => [new Date(r.created_at).toLocaleString("en-IN"), r.direction, r.reason ?? "", r.amount, r.balance_after].map((x) => `"${String(x ?? "")}"`).join(",")).join("\n");
    const blob = new Blob([head + "\n" + body], { type: "text/csv" }); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "wallet-transactions.csv"; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <RetailerShell>
      <div className="space-y-5">
        <PageHeader icon={<ArrowLeftRight className="h-5 w-5" />} title="Transactions" subtitle="Your complete wallet transaction history"
          actions={<button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-10 text-sm font-semibold hover:bg-muted"><Download className="h-4 w-4" /> Export CSV</button>} />

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-soft"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Total Credited</p><p className="text-lg font-extrabold text-emerald-600">{inr(totals.credit)}</p></div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-soft"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Total Spent</p><p className="text-lg font-extrabold text-rose-500">{inr(totals.debit)}</p></div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-soft"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Transactions</p><p className="text-lg font-extrabold">{totals.count}</p></div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><input className="h-9 w-60 rounded-lg border border-border bg-background pl-8 pr-2 text-sm outline-none" placeholder="Search details…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          {(["all", "credit", "debit"] as const).map((k) => <button key={k} onClick={() => setDir(k)} className={`rounded-full px-3 h-9 text-xs font-semibold capitalize transition ${dir === k ? "bg-india-green text-white" : "border border-border bg-card hover:bg-muted"}`}>{k}</button>)}
          <button onClick={load} className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-9 text-xs font-semibold hover:bg-muted"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Time</th><th className="px-3 py-2">Application ID</th><th className="px-3 py-2">Service Name</th><th className="px-3 py-2 text-right">Wallet Amount</th><th className="px-3 py-2 text-right">Deducted Amount</th><th className="px-3 py-2 text-right">Balance</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
                : filtered.length === 0 ? <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">No transactions found.</td></tr>
                : filtered.map((r) => { const appId = appIdOf(r.reason); const svc = svcNameOf(r.reason) || (r.direction === "credit" ? "Wallet Credit" : "Debit"); const d = new Date(r.created_at); return (<tr key={r.id} className="border-t border-border">
                  <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{d.toLocaleDateString("en-IN")}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="px-3 py-2 font-mono text-xs">{appId || "—"}</td>
                  <td className="px-3 py-2">{svc}</td>
                  <td className="px-3 py-2 text-right font-semibold text-emerald-600">{r.direction === "credit" ? "+" + inr(r.amount) : "—"}</td>
                  <td className="px-3 py-2 text-right font-semibold text-rose-500">{r.direction === "debit" ? "−" + inr(r.amount) : "—"}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{inr(r.balance_after)}</td>
                </tr>); })}
            </tbody>
          </table>
        </div>
      </div>
    </RetailerShell>
  );
}
