import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Loader2, RefreshCw, Download } from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { supabase } from "@/integrations/supabase/client";
import { downloadWalletCsv } from "@/lib/wallet-export";

export const Route = createFileRoute("/wallet/ledger")({
  head: () => ({ meta: [{ title: "Wallet · Ledger — BharatOne" }] }),
  component: LedgerPage,
});

type Tx = { id: string; direction: "credit" | "debit"; amount: number; balance_after: number; reason: string | null; ref_type: string | null; ref_id: string | null; created_at: string };
const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");
const svcName = (reason: string | null) => (reason || "").replace(/^Application\s+\S+\s*[-·]\s*/i, "").trim();
const svcOf = (t: Tx) => t.ref_type === "topup" ? "Wallet Credit" : t.ref_type === "application" ? "Service" : (t.ref_type || "Other");

function LedgerPage() {
  const [rows, setRows] = useState<Tx[]>([]); const [loading, setLoading] = useState(true);
  const [svc, setSvc] = useState("all"); const [from, setFrom] = useState(""); const [to, setTo] = useState("");

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("wallet_transactions").select("id,direction,amount,balance_after,reason,ref_type,ref_id,created_at").order("created_at", { ascending: false }).limit(500);
    setRows((data as Tx[]) ?? []); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const services = useMemo(() => Array.from(new Set(rows.map(svcOf))).sort(), [rows]);
  const filtered = useMemo(() => rows.filter((r) => {
    if (svc !== "all" && svcOf(r) !== svc) return false;
    if (from && new Date(r.created_at) < new Date(from)) return false;
    if (to && new Date(r.created_at) > new Date(to + "T23:59:59")) return false;
    return true;
  }), [rows, svc, from, to]);

  const exportCsv = () => {
    downloadWalletCsv("ledger.csv", filtered.map((r) => ({
      "Opening Wallet": r.direction === "credit" ? Number(r.balance_after) - Number(r.amount) : Number(r.balance_after) + Number(r.amount),
      "CR amount": r.direction === "credit" ? r.amount : "",
      "DR Amount": r.direction === "debit" ? r.amount : "",
      "Closing Wallet": r.balance_after, "Type": r.direction, "Amount": r.amount,
      "Reference Table": r.ref_type ?? "wallet_transactions", "Reference Id": r.ref_id ?? "", "Order Id": r.id,
      "Service Department": svcOf(r), "Service Remarks": svcName(r.reason) || r.reason || "",
      "Creation Date Time": new Date(r.created_at).toLocaleString("en-IN"),
    })));
  };

  return (
    <RetailerShell>
      <div className="space-y-5">
        <PageHeader icon={<BookOpen className="h-5 w-5" />} title="Wallet · Ledger" subtitle="Service-wise wallet ledger with running balance"
          actions={<button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-10 text-sm font-semibold hover:bg-muted"><Download className="h-4 w-4" /> Export</button>} />
        <div className="flex flex-wrap items-center gap-2">
          <select value={svc} onChange={(e) => setSvc(e.target.value)} className="h-9 rounded-lg border border-border bg-card px-2 text-sm"><option value="all">All services</option>{services.map((s) => <option key={s} value={s}>{s}</option>)}</select>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-sm" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-sm" />
          <button onClick={load} className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-9 text-xs font-semibold hover:bg-muted"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2.5">Date</th><th className="px-3 py-2.5">Service</th><th className="px-3 py-2.5 text-right">Credit</th><th className="px-3 py-2.5 text-right">Debit</th><th className="px-3 py-2.5 text-right">Closing</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={5} className="px-3 py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></td></tr>
                : filtered.length === 0 ? <tr><td colSpan={5} className="px-3 py-10 text-center text-muted-foreground">No ledger entries.</td></tr>
                : filtered.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("en-IN")}</td>
                    <td className="px-3 py-2.5"><span className="font-medium">{svcName(r.reason) || svcOf(r)}</span></td>
                    <td className="px-3 py-2.5 text-right font-semibold text-emerald-600">{r.direction === "credit" ? inr(r.amount) : "—"}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-rose-500">{r.direction === "debit" ? inr(r.amount) : "—"}</td>
                    <td className="px-3 py-2.5 text-right">{inr(r.balance_after)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </RetailerShell>
  );
}
