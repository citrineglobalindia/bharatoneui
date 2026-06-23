import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownToLine, Loader2, RefreshCw, Search, Download } from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { supabase } from "@/integrations/supabase/client";
import { downloadWalletCsv } from "@/lib/wallet-export";

export const Route = createFileRoute("/wallet/recharges")({
  head: () => ({ meta: [{ title: "Wallet · Recharges — BharatOne" }] }),
  component: RechargesPage,
});

type Row = { id: string; amount: number; method: string | null; reference: string | null; status: string; created_at: string };
const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");
// Full payment-transaction status set (CCAvenue-style)
const norm = (raw: string) => {
  const v = (raw || "").toLowerCase().replace(/[\s/-]+/g, "_");
  if (["verified", "success", "successful", "shipped"].includes(v)) return "success";
  if (v === "successful_system_refund") return "system_refund";
  if (v === "auto_cancelled") return "auto_cancelled";
  if (v === "auto_reversed") return "auto_reversed";
  return v;
};
const META: Record<string, { label: string; tone: string }> = {
  success: { label: "Success", tone: "bg-emerald-100 text-emerald-700" },
  pending: { label: "Pending", tone: "bg-amber-100 text-amber-700" },
  awaited: { label: "Awaited", tone: "bg-amber-100 text-amber-700" },
  initiated: { label: "Initiated", tone: "bg-sky-100 text-sky-700" },
  refunded: { label: "Refunded", tone: "bg-sky-100 text-sky-700" },
  system_refund: { label: "Successful system refund", tone: "bg-sky-100 text-sky-700" },
  aborted: { label: "Aborted", tone: "bg-rose-100 text-rose-700" },
  auto_cancelled: { label: "Auto-cancelled", tone: "bg-rose-100 text-rose-700" },
  cancelled: { label: "Cancelled", tone: "bg-rose-100 text-rose-700" },
  auto_reversed: { label: "Auto-reversed", tone: "bg-orange-100 text-orange-700" },
  invalid: { label: "Invalid", tone: "bg-slate-100 text-slate-600" },
  fraud: { label: "Fraud", tone: "bg-red-200 text-red-800" },
  unsuccessful: { label: "Unsuccessful", tone: "bg-rose-100 text-rose-700" },
  rejected: { label: "Rejected", tone: "bg-rose-100 text-rose-700" },
};
const STATUS_OPTIONS: { v: string; label: string }[] = [
  { v: "all", label: "All status" },
  { v: "success", label: "Success / Successful / Shipped" },
  { v: "pending", label: "Pending" },
  { v: "awaited", label: "Awaited" },
  { v: "initiated", label: "Initiated" },
  { v: "refunded", label: "Refunded" },
  { v: "system_refund", label: "Successful system refund" },
  { v: "aborted", label: "Aborted" },
  { v: "auto_cancelled", label: "Auto-cancelled" },
  { v: "cancelled", label: "Cancelled" },
  { v: "auto_reversed", label: "Auto-reversed" },
  { v: "invalid", label: "Invalid" },
  { v: "fraud", label: "Fraud" },
  { v: "unsuccessful", label: "Unsuccessful" },
  { v: "rejected", label: "Rejected" },
];
const metaOf = (raw: string) => META[norm(raw)] ?? { label: raw || "—", tone: "bg-muted text-foreground" };

function RechargesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(""); const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [st, setSt] = useState("all");

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("wallet_topups").select("id,amount,method,reference,status,created_at").order("created_at", { ascending: false }).limit(500);
    setRows((data as Row[]) ?? []); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => rows.filter((r) => {
    if (st !== "all" && norm(r.status) !== st) return false;
    if (from && new Date(r.created_at) < new Date(from)) return false;
    if (to && new Date(r.created_at) > new Date(to + "T23:59:59")) return false;
    if (q && !((r.reference ?? "") + (r.method ?? "")).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [rows, q, from, to, st]);
  const total = filtered.filter((r) => norm(r.status) === "success").reduce((a, r) => a + Number(r.amount || 0), 0);

  const exportCsv = () => {
    downloadWalletCsv("recharges.csv", filtered.map((r) => ({
      "CR amount": r.amount, "Amount": r.amount, "Type": "Recharge",
      "Reference Table": "wallet_topups", "Reference Id": r.reference ?? "", "Order Id": r.id,
      "Service Remarks": (r.method ?? "") + (metaOf(r.status).label ? ` · ${metaOf(r.status).label}` : ""),
      "Creation Date Time": new Date(r.created_at).toLocaleString("en-IN"),
    })));
  };

  return (
    <RetailerShell>
      <div className="space-y-5">
        <PageHeader icon={<ArrowDownToLine className="h-5 w-5" />} title="Wallet · Recharges" subtitle="All wallet recharge requests and their status"
          actions={<button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-10 text-sm font-semibold hover:bg-muted"><Download className="h-4 w-4" /> Export</button>} />

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-soft"><p className="text-[11px] font-semibold uppercase text-muted-foreground">Total Recharged</p><p className="text-lg font-extrabold text-emerald-600">{inr(total)}</p></div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-soft"><p className="text-[11px] font-semibold uppercase text-muted-foreground">Requests</p><p className="text-lg font-extrabold">{filtered.length}</p></div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-soft"><p className="text-[11px] font-semibold uppercase text-muted-foreground">Pending</p><p className="text-lg font-extrabold text-amber-600">{filtered.filter((r) => norm(r.status) === "pending").length}</p></div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-sm" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-sm" />
          <select value={st} onChange={(e) => setSt(e.target.value)} className="h-9 rounded-lg border border-border bg-card px-2 text-sm">{STATUS_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}</select>
          <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><input className="h-9 w-56 rounded-lg border border-border bg-background pl-8 pr-2 text-sm outline-none" placeholder="Reference / method…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <button onClick={load} className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-9 text-xs font-semibold hover:bg-muted"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2.5">Order ID</th><th className="px-3 py-2.5">Method</th><th className="px-3 py-2.5">Reference</th><th className="px-3 py-2.5 text-right">Amount</th><th className="px-3 py-2.5">Date</th><th className="px-3 py-2.5">Status</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={6} className="px-3 py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></td></tr>
                : filtered.length === 0 ? <tr><td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">No recharges found.</td></tr>
                : filtered.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-2.5 font-mono text-xs">{r.id.slice(0, 10)}</td>
                    <td className="px-3 py-2.5">{r.method || "—"}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{r.reference || "—"}</td>
                    <td className="px-3 py-2.5 text-right font-semibold">{inr(r.amount)}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("en-IN")}</td>
                    <td className="px-3 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${metaOf(r.status).tone}`}>{metaOf(r.status).label}</span></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </RetailerShell>
  );
}
