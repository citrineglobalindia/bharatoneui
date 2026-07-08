import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowUpFromLine, CheckCircle2, XCircle, Loader2, RefreshCw, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";
import { useSort, SortTh, useColumnFilters, FilterTh } from "@/components/ui/sortable";

type WD = { id: string; user_id: string; amount: number; method: string | null; account_details: string | null; note: string | null; status: string; requested_at: string };
type RUser = { id: string; name: string; email: string };
const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");
const tone: Record<string, string> = { pending: "bg-amber-100 text-amber-700", paid: "bg-emerald-100 text-emerald-700", approved: "bg-emerald-100 text-emerald-700", rejected: "bg-rose-100 text-rose-700" };

export function WithdrawalsAdmin() {
  const [rows, setRows] = useState<WD[]>([]);
  const [users, setUsers] = useState<Record<string, RUser>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<"pending" | "all">("pending");

  async function load() {
    setLoading(true);
    try {
      await ensureStaffSession();
      const [w, u] = await Promise.all([
        supabase.from("wallet_withdrawals").select("*").order("requested_at", { ascending: false }),
        supabase.rpc("admin_list_users"),
      ]);
      setRows((w.data as WD[]) ?? []);
      const map: Record<string, RUser> = {}; ((u.data as any[]) ?? []).forEach((x) => { map[x.id] = { id: x.id, name: x.display_name || x.email || "User", email: x.email }; });
      setUsers(map);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const act = async (w: WD, action: "approve" | "reject") => {
    setBusy(w.id);
    const { error } = await supabase.rpc("process_withdrawal", { p_id: w.id, p_action: action, p_note: null });
    setBusy(null);
    if (error) {
      if (String(error.message).includes("INSUFFICIENT_FUNDS")) return toast.error("Retailer balance too low to pay out");
      return toast.error("Failed", { description: error.message });
    }
    toast.success(action === "approve" ? "Payout processed" : "Request rejected"); load();
  };

  const pendingTotal = useMemo(() => rows.filter((r) => r.status === "pending").reduce((a, r) => a + Number(r.amount), 0), [rows]);
  const paidTotal = useMemo(() => rows.filter((r) => r.status === "paid").reduce((a, r) => a + Number(r.amount), 0), [rows]);
  const filtered = useMemo(() => tab === "pending" ? rows.filter((r) => r.status === "pending") : rows, [rows, tab]);

  const acc = (r: WD, key: string) => {
    switch (key) {
      case "date": return new Date(r.requested_at).getTime();
      case "retailer": return users[r.user_id]?.name ?? "";
      case "amount": return Number(r.amount || 0);
      case "method": return r.method ?? "";
      case "account": return r.account_details ?? "";
      case "status": return r.status;
      default: return "";
    }
  };
  const cf = useColumnFilters<WD>();
  const colFiltered = useMemo(() => cf.apply(filtered, acc), [filtered, cf.filters]);
  const { sorted, sort, toggle } = useSort(colFiltered, acc);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="flex items-center gap-2 text-lg font-extrabold"><ArrowUpFromLine className="h-5 w-5 text-admin" /> Withdrawal / Payout Requests</h2><p className="text-sm text-muted-foreground">Approve to pay out (deducts from retailer wallet), or reject.</p></div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Pending</p><p className="text-2xl font-extrabold">{rows.filter((r) => r.status === "pending").length}</p><p className="text-xs text-muted-foreground">{inr(pendingTotal)} awaiting</p></div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Paid out</p><p className="text-2xl font-extrabold text-emerald-600">{inr(paidTotal)}</p></div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Total requests</p><p className="text-2xl font-extrabold">{rows.length}</p></div>
      </div>
      <div className="flex gap-1.5">{(["pending", "all"] as const).map((k) => <button key={k} onClick={() => setTab(k)} className={`rounded-full px-3 h-8 text-xs font-semibold capitalize transition ${tab === k ? "bg-india-green text-white" : "border border-border bg-card hover:bg-muted"}`}>{k === "pending" ? "Pending" : "All"}</button>)}</div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground"><tr><SortTh label="Date" sortKey="date" sort={sort} onSort={toggle} className="px-3 py-2" /><SortTh label="Retailer" sortKey="retailer" sort={sort} onSort={toggle} className="px-3 py-2" /><SortTh label="Amount" sortKey="amount" sort={sort} onSort={toggle} className="px-3 py-2" /><SortTh label="Method" sortKey="method" sort={sort} onSort={toggle} className="px-3 py-2" /><SortTh label="Account" sortKey="account" sort={sort} onSort={toggle} className="px-3 py-2" /><SortTh label="Status" sortKey="status" sort={sort} onSort={toggle} className="px-3 py-2" /><th className="px-3 py-2 text-right">Action</th></tr>
            <tr className="bg-muted/30">
              <FilterTh filterKey="date" filters={cf.filters} setFilter={cf.setFilter} optionsFor={cf.optionsFor} className="px-2 pb-2" />
              <FilterTh filterKey="retailer" filters={cf.filters} setFilter={cf.setFilter} optionsFor={cf.optionsFor} className="px-2 pb-2" />
              <FilterTh filterKey="amount" filters={cf.filters} setFilter={cf.setFilter} optionsFor={cf.optionsFor} className="px-2 pb-2" />
              <FilterTh filterKey="method" filters={cf.filters} setFilter={cf.setFilter} optionsFor={cf.optionsFor} className="px-2 pb-2" />
              <FilterTh filterKey="account" filters={cf.filters} setFilter={cf.setFilter} optionsFor={cf.optionsFor} className="px-2 pb-2" />
              <FilterTh filterKey="status" filters={cf.filters} setFilter={cf.setFilter} optionsFor={cf.optionsFor} className="px-2 pb-2" />
              <th className="px-2 pb-2" />
            </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
              : sorted.length === 0 ? <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">No requests.</td></tr>
              : sorted.map((w) => (<tr key={w.id} className="border-t border-border">
                <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{new Date(w.requested_at).toLocaleString("en-IN")}</td>
                <td className="px-3 py-2">{users[w.user_id]?.name ?? "—"}<div className="text-[11px] text-muted-foreground">{users[w.user_id]?.email}</div></td>
                <td className="px-3 py-2 font-semibold">{inr(w.amount)}</td>
                <td className="px-3 py-2">{w.method ?? "—"}</td>
                <td className="px-3 py-2 text-xs">{w.account_details ?? "—"}</td>
                <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${tone[w.status]}`}>{w.status}</span></td>
                <td className="px-3 py-2 text-right whitespace-nowrap">{w.status === "pending" ? <>
                  <Button size="sm" disabled={busy === w.id} onClick={() => act(w, "approve")} className="mr-2 bg-india-green text-white hover:bg-india-green/90">{busy === w.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Pay out</Button>
                  <Button size="sm" variant="outline" disabled={busy === w.id} onClick={() => act(w, "reject")} className="text-rose-600"><XCircle className="h-3.5 w-3.5" /> Reject</Button>
                </> : <span className="text-xs text-muted-foreground">—</span>}</td>
              </tr>))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
