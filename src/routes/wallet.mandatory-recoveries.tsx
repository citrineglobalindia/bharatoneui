import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ShieldAlert, Loader2, RefreshCw, Download } from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { supabase } from "@/integrations/supabase/client";
import { downloadWalletCsv } from "@/lib/wallet-export";

export const Route = createFileRoute("/wallet/mandatory-recoveries")({
  head: () => ({ meta: [{ title: "Wallet · Mandatory Recoveries — BharatOne" }] }),
  component: MRPage,
});

type Row = { id: string; category: string; amount: number; status: string; note: string | null; created_at: string };
const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");
const tone: Record<string, string> = { pending: "bg-amber-100 text-amber-700", recovered: "bg-emerald-100 text-emerald-700", waived: "bg-slate-100 text-slate-600" };

function MRPage() {
  const [rows, setRows] = useState<Row[]>([]); const [loading, setLoading] = useState(true);
  async function load() { setLoading(true); const { data } = await supabase.from("mandatory_recoveries").select("id,category,amount,status,note,created_at").order("created_at", { ascending: false }); setRows((data as Row[]) ?? []); setLoading(false); }
  const exportCsv = () => {
    downloadWalletCsv("mandatory-recoveries.csv", rows.map((r) => ({
      "DR Amount": r.amount, "Deduction": r.amount, "Amount": r.amount, "Type": r.category,
      "Reference Table": "mandatory_recoveries", "Reference Id": r.id, "Order Id": r.id,
      "Service Department": r.category, "Service Remarks": (r.note || "") + (r.status ? ` · ${r.status}` : ""),
      "Creation Date Time": new Date(r.created_at).toLocaleString("en-IN"),
    })));
  };
  useEffect(() => { load(); }, []);
  return (
    <RetailerShell>
      <div className="space-y-5">
        <PageHeader icon={<ShieldAlert className="h-5 w-5" />} title="Mandatory Recoveries" subtitle="Deductions applied from the company end"
          actions={<><button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-10 text-sm font-semibold hover:bg-muted"><Download className="h-4 w-4" /> Export</button><button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-10 text-sm font-semibold hover:bg-muted"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button></>} />
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2.5">#</th><th className="px-3 py-2.5">Category</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5 text-right">Amount</th><th className="px-3 py-2.5">Created</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={5} className="px-3 py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></td></tr>
                : rows.length === 0 ? <tr><td colSpan={5} className="px-3 py-12 text-center text-muted-foreground">No record found.</td></tr>
                : rows.map((r, i) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-2.5 text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2.5"><span className="font-medium">{r.category}</span>{r.note && <span className="block text-[11px] text-muted-foreground">{r.note}</span>}</td>
                    <td className="px-3 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${tone[r.status] ?? "bg-muted"}`}>{r.status}</span></td>
                    <td className="px-3 py-2.5 text-right font-semibold text-rose-500">{inr(r.amount)}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("en-IN")}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </RetailerShell>
  );
}
