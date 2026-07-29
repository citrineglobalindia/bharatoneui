import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, BookOpenText, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Retailer = { user_id: string; name: string; jsko_id: string | null; mobile: string | null; balance: number; last_activity: string | null };
type Entry = { at: string; source: string; kind: string; direction: string; amount: number; description: string | null; balance_after: number | null };

const inr = (n: number | null | undefined) =>
  n == null ? "—" : "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });

/**
 * Accountant/admin view: pick a retailer and see their full AEPS ledger — cash
 * deposits, commission, transfers to main wallet, bank withdrawals, daily KYC
 * charges — each with a clear description and a running balance.
 */
export function AepsRetailerLedger() {
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Retailer | null>(null);
  const [rows, setRows] = useState<Entry[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingLedger, setLoadingLedger] = useState(false);

  const loadList = async () => {
    setLoadingList(true);
    const { data } = await (supabase as any).rpc("aeps_staff_retailers");
    setRetailers((data as Retailer[]) ?? []);
    setLoadingList(false);
  };
  useEffect(() => { loadList(); }, []);

  const openLedger = async (r: Retailer) => {
    setSel(r); setLoadingLedger(true); setRows([]);
    const { data } = await (supabase as any).rpc("aeps_staff_ledger", { p_user: r.user_id, _limit: 300 });
    setRows((data as Entry[]) ?? []);
    setLoadingLedger(false);
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return retailers;
    return retailers.filter((r) =>
      [r.name, r.jsko_id, r.mobile].filter(Boolean).some((v) => String(v).toLowerCase().includes(s)));
  }, [retailers, q]);

  const credits = rows.filter((r) => r.direction === "credit").reduce((s, r) => s + Number(r.amount || 0), 0);
  const debits = rows.filter((r) => r.direction === "debit").reduce((s, r) => s + Number(r.amount || 0), 0);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-soft">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-bold">
          <BookOpenText className="h-4 w-4 text-india-green" /> Retailer AEPS Ledger
        </p>
        <button onClick={loadList} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 h-8 text-xs font-semibold hover:bg-muted">
          <RefreshCw className={`h-3.5 w-3.5 ${loadingList ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        {/* Retailer picker */}
        <div>
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name / JSKO ID / mobile"
              className="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-3 text-sm outline-none" />
          </div>
          <div className="max-h-[420px] overflow-y-auto rounded-lg border border-border divide-y divide-border">
            {loadingList ? (
              <div className="grid h-24 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-india-green" /></div>
            ) : filtered.length === 0 ? (
              <p className="p-3 text-center text-xs text-muted-foreground">No retailers found.</p>
            ) : filtered.map((r) => (
              <button key={r.user_id} onClick={() => openLedger(r)}
                className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-muted ${sel?.user_id === r.user_id ? "bg-india-green/10" : ""}`}>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{r.name}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">{r.jsko_id || "—"} · {r.mobile || "—"}</span>
                </span>
                <span className="shrink-0 font-semibold text-india-green">{inr(r.balance)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Ledger */}
        <div>
          {!sel ? (
            <div className="grid h-40 place-items-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
              Select a retailer to view their AEPS ledger.
            </div>
          ) : (
            <>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold">{sel.name} <span className="text-[11px] font-normal text-muted-foreground">· {sel.jsko_id || "—"}</span></p>
                <p className="text-[11px] text-muted-foreground">
                  Credits <span className="font-semibold text-emerald-600">{inr(credits)}</span> ·
                  Debits <span className="font-semibold text-rose-600">{inr(debits)}</span> ·
                  Balance <span className="font-semibold text-india-green">{inr(sel.balance)}</span>
                </p>
              </div>
              {loadingLedger ? (
                <div className="grid h-28 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-india-green" /></div>
              ) : rows.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No ledger entries for this retailer.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full min-w-[620px] text-left text-sm">
                    <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-2 py-2">Date</th>
                        <th className="px-2 py-2">Source</th>
                        <th className="px-2 py-2">Description</th>
                        <th className="px-2 py-2 text-right">Credit</th>
                        <th className="px-2 py-2 text-right">Debit</th>
                        <th className="px-2 py-2 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={i} className="border-t border-border/60">
                          <td className="px-2 py-2 whitespace-nowrap text-xs text-muted-foreground">
                            {new Date(r.at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap text-[11px]">
                            <span className={`rounded-full px-2 py-0.5 font-semibold ${r.source === "AEPS wallet" ? "bg-india-green/10 text-india-green" : "bg-slate-100 text-slate-600"}`}>{r.source}</span>
                          </td>
                          <td className="px-2 py-2">
                            <div className="font-medium">{r.kind}</div>
                            <div className="text-[11px] text-muted-foreground">{r.description || "—"}</div>
                          </td>
                          <td className="px-2 py-2 text-right font-semibold text-emerald-600">{r.direction === "credit" ? inr(r.amount) : "—"}</td>
                          <td className="px-2 py-2 text-right font-semibold text-rose-600">{r.direction === "debit" ? inr(r.amount) : "—"}</td>
                          <td className="px-2 py-2 text-right text-muted-foreground">{inr(r.balance_after)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
