import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpFromLine, Loader2, RefreshCw, Download } from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { supabase } from "@/integrations/supabase/client";
import { downloadWalletCsv } from "@/lib/wallet-export";

export const Route = createFileRoute("/wallet/deductions")({
  head: () => ({ meta: [{ title: "Wallet · Deductions — BharatOne" }] }),
  component: DeductionsPage,
});

type Tx = { id: string; amount: number; balance_after: number; reason: string | null; ref_type: string | null; ref_id: string | null; created_at: string };
const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");
const svcName = (reason: string | null) => (reason || "").replace(/^Application\s+\S+\s*[-·]\s*/i, "").trim();
const catOf = (t: Tx) => t.ref_type === "application" ? "Service Charge" : t.ref_type === "withdrawal" ? "Withdrawal" : t.ref_type === "recovery" ? "Recovery" : (t.ref_type || "Other");

function DeductionsPage() {
  const [rows, setRows] = useState<Tx[]>([]); const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState("all"); const [from, setFrom] = useState(""); const [to, setTo] = useState("");

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("wallet_transactions").select("id,amount,balance_after,reason,ref_type,ref_id,created_at,direction").eq("direction", "debit").order("created_at", { ascending: false }).limit(500);
    setRows((data as Tx[]) ?? []); setLoading(false);
  }
  useEffect(() => { load(); }, []);
  const cats = useMemo(() => Array.from(new Set(rows.map(catOf))).sort(), [rows]);
  const filtered = useMemo(() => rows.filter((r) => {
    if (cat !== "all" && catOf(r) !== cat) return false;
    if (from && new Date(r.created_at) < new Date(from)) return false;
    if (to && new Date(r.created_at) > new Date(to + "T23:59:59")) return false;
    return true;
  }), [rows, cat, from, to]);
  const total = filtered.reduce((a, r) => a + Number(r.amount || 0), 0);

  const exportCsv = async () => {
    const appIds = Array.from(new Set(filtered.filter((r) => r.ref_type === "application" && r.ref_id).map((r) => r.ref_id as string)));
    const svcMap: Record<string, any> = {};
    if (appIds.length) {
      const { data } = await (supabase as any).from("service_applications").select("id, application_no, service_name, category_name, service_charge, commission_price").in("id", appIds);
      for (const s of (data as any[]) ?? []) svcMap[s.id] = s;
    }
    downloadWalletCsv("deductions.csv", filtered.map((r) => {
      const s = r.ref_id ? svcMap[r.ref_id] : null;
      return {
        "Opening Wallet": Number(r.balance_after) + Number(r.amount),
        "DR Amount": r.amount, "Closing Wallet": r.balance_after, "Deduction": r.amount,
        "Type": catOf(r), "Amount": r.amount,
        "Service Amount": s?.service_charge ?? "", "SP Amount": s?.commission_price ?? "",
        "Reference Table": r.ref_type ?? "wallet_transactions", "Reference Id": r.ref_id ?? "", "Order Id": s?.application_no ?? r.id,
        "Tracking id": s?.application_no ?? "",
        "Service Department": s?.category_name ?? catOf(r), "Service Remarks": s?.service_name ?? svcName(r.reason) ?? r.reason ?? "",
        "Creation Date Time": new Date(r.created_at).toLocaleString("en-IN"),
      };
    }));
  };

  return (
    <RetailerShell>
      <div className="space-y-5">
        <PageHeader icon={<ArrowUpFromLine className="h-5 w-5" />} title="Wallet · Deductions" subtitle="Category-wise wallet deductions" actions={<button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-10 text-sm font-semibold hover:bg-muted"><Download className="h-4 w-4" /> Export</button>} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-soft"><p className="text-[11px] font-semibold uppercase text-muted-foreground">Total Deducted</p><p className="text-lg font-extrabold text-rose-500">{inr(total)}</p></div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-soft"><p className="text-[11px] font-semibold uppercase text-muted-foreground">Entries</p><p className="text-lg font-extrabold">{filtered.length}</p></div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="h-9 rounded-lg border border-border bg-card px-2 text-sm"><option value="all">All categories</option>{cats.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-sm" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-sm" />
          <button onClick={load} className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-9 text-xs font-semibold hover:bg-muted"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2.5">#</th><th className="px-3 py-2.5">Category</th><th className="px-3 py-2.5">Details</th><th className="px-3 py-2.5 text-right">Amount</th><th className="px-3 py-2.5">Date</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={5} className="px-3 py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></td></tr>
                : filtered.length === 0 ? <tr><td colSpan={5} className="px-3 py-10 text-center text-muted-foreground">No deductions.</td></tr>
                : filtered.map((r, i) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-2.5 text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2.5"><span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">{catOf(r)}</span></td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground truncate max-w-[320px]">{svcName(r.reason) || "—"}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-rose-500">-{inr(r.amount)}</td>
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
