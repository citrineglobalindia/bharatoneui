import { useEffect, useState } from "react";
import { Loader2, RefreshCw, ReceiptText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  at: string;
  operation: string;
  service_type: number;
  amount: number | null;
  status: string;
  aadhaar_last4: string | null;
  ref: string | null;
  party: string | null;
  gross: number | null;
  retailer_share: number | null;
  distributor_share: number | null;
  admin_share: number | null;
  my_share: number | null;
  scope: string;
};

const inr = (n: number | null | undefined) =>
  n == null ? "—" : "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const opLabel = (o: string) => (o || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const statusTone: Record<string, string> = {
  success: "bg-emerald-100 text-emerald-700",
  failed: "bg-rose-100 text-rose-700",
  pending: "bg-amber-100 text-amber-700",
  pending_reconciliation: "bg-amber-100 text-amber-700",
};

/**
 * AEPS commission mini-statement. The RPC returns rows scoped to the caller:
 * retailers & distributors see only their own share; admin/accountant see the
 * full split (retailer + distributor + admin) per transaction.
 */
export function AepsMiniStatement({ limit = 60 }: { limit?: number }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any).rpc("aeps_mini_statement", { _limit: limit });
    setRows((data as Row[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const full = rows[0]?.scope === "full";
  const myTotal = rows.reduce((s, r) => s + Number(r.my_share || 0), 0);
  const grossTotal = rows.reduce((s, r) => s + Number(r.gross || 0), 0);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-soft">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-bold">
          <ReceiptText className="h-4 w-4 text-india-green" /> AEPS Mini Statement — commission
        </p>
        <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 h-8 text-xs font-semibold hover:bg-muted">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {!full && (
        <p className="mb-2 text-[11px] text-muted-foreground">
          Your commission share per AEPS transaction (cash withdrawal &amp; mini statement).
          Total shown: <span className="font-semibold text-foreground">{inr(myTotal)}</span>
        </p>
      )}
      {full && (
        <p className="mb-2 text-[11px] text-muted-foreground">
          Full commission distribution per transaction. Gross total shown:{" "}
          <span className="font-semibold text-foreground">{inr(grossTotal)}</span>
        </p>
      )}

      {loading ? (
        <div className="grid h-28 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-india-green" /></div>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No AEPS transactions yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-2 py-2">Date</th>
                {full && <th className="px-2 py-2">Retailer</th>}
                <th className="px-2 py-2">Operation</th>
                <th className="px-2 py-2 text-right">Amount</th>
                <th className="px-2 py-2">Status</th>
                {full ? (
                  <>
                    <th className="px-2 py-2 text-right">Gross</th>
                    <th className="px-2 py-2 text-right">Retailer</th>
                    <th className="px-2 py-2 text-right">Distributor</th>
                    <th className="px-2 py-2 text-right">Admin</th>
                  </>
                ) : (
                  <th className="px-2 py-2 text-right">My commission</th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-border/60">
                  <td className="px-2 py-2 whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(r.at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  {full && <td className="px-2 py-2 whitespace-nowrap">{r.party || "—"}</td>}
                  <td className="px-2 py-2 whitespace-nowrap">{opLabel(r.operation)}</td>
                  <td className="px-2 py-2 text-right">{r.amount ? inr(r.amount) : "—"}</td>
                  <td className="px-2 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusTone[r.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {r.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  {full ? (
                    <>
                      <td className="px-2 py-2 text-right text-muted-foreground">{inr(r.gross)}</td>
                      <td className="px-2 py-2 text-right font-semibold text-emerald-600">{inr(r.retailer_share)}</td>
                      <td className="px-2 py-2 text-right">{inr(r.distributor_share)}</td>
                      <td className="px-2 py-2 text-right">{inr(r.admin_share)}</td>
                    </>
                  ) : (
                    <td className="px-2 py-2 text-right font-semibold text-emerald-600">
                      {r.my_share && Number(r.my_share) > 0 ? inr(r.my_share) : "—"}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
