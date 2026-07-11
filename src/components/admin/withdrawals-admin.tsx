import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowUpFromLine, CheckCircle2, XCircle, Loader2, RefreshCw, Search, Download, CalendarDays, Lock, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";
import { useSort, SortTh } from "@/components/ui/sortable";

type WD = { id: string; user_id: string; amount: number; method: string | null; account_details: string | null; note: string | null; status: string; requested_at: string; processed_at?: string | null; processor_note?: string | null };
type Acct = { user_id: string; jsko_id: string | null; name: string; balance: number };
type Win = { enabled: boolean; days: number[]; open_today: boolean; today: string; next_open: string | null };

const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");
const tone: Record<string, string> = { pending: "bg-amber-100 text-amber-700", paid: "bg-emerald-100 text-emerald-700", approved: "bg-emerald-100 text-emerald-700", rejected: "bg-rose-100 text-rose-700" };
const STATUS_TABS = [["pending", "Pending"], ["paid", "Paid"], ["rejected", "Rejected"], ["all", "All / History"]] as const;

// allowWindowConfig: only the admin portal can set the days retailers may withdraw on.
export function WithdrawalsAdmin({ allowWindowConfig = false }: { allowWindowConfig?: boolean } = {}) {
  const [rows, setRows] = useState<WD[]>([]);
  const [accts, setAccts] = useState<Record<string, Acct>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<string>("pending");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [win, setWin] = useState<Win | null>(null);
  const [winDays, setWinDays] = useState<number[]>([]);
  const [winOn, setWinOn] = useState(true);
  const [winBusy, setWinBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      await ensureStaffSession();
      const [w, a, wd] = await Promise.all([
        supabase.from("wallet_withdrawals").select("*").order("requested_at", { ascending: false }),
        (supabase as any).rpc("wallet_topup_accounts"),
        (supabase as any).rpc("withdrawal_window"),
      ]);
      setRows((w.data as WD[]) ?? []);
      const map: Record<string, Acct> = {};
      ((a.data as Acct[]) ?? []).forEach((x) => { map[x.user_id] = x; });
      setAccts(map);
      const win0 = (wd.data as Win) ?? null;
      setWin(win0);
      if (win0) { setWinDays(win0.days ?? []); setWinOn(!!win0.enabled); }
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const act = async (w: WD, action: "approve" | "reject") => {
    if (action === "approve" && !confirm(`Transfer ${inr(w.amount)} to ${accts[w.user_id]?.name ?? "this retailer"}? This debits their wallet.`)) return;
    setBusy(w.id);
    const { error } = await supabase.rpc("process_withdrawal", { p_id: w.id, p_action: action, p_note: null });
    setBusy(null);
    if (error) {
      if (String(error.message).includes("INSUFFICIENT_FUNDS")) return toast.error("Retailer balance too low to pay out");
      return toast.error("Failed", { description: error.message });
    }
    toast.success(action === "approve" ? "Payout transferred" : "Request rejected"); load();
  };

  const saveWindow = async () => {
    setWinBusy(true);
    const { data, error } = await (supabase as any).rpc("set_withdrawal_window", { _enabled: winOn, _days: winDays.slice().sort((a, b) => a - b).join(",") });
    setWinBusy(false);
    if (error) return toast.error("Could not save", { description: error.message });
    setWin(data as Win);
    toast.success("Withdrawal window saved");
  };

  const filtered = useMemo(() => rows.filter((r) => {
    if (tab !== "all" && r.status !== tab) return false;
    if (from && new Date(r.requested_at) < new Date(from + "T00:00:00")) return false;
    if (to && new Date(r.requested_at) > new Date(to + "T23:59:59")) return false;
    const s = q.trim().toLowerCase();
    if (s) {
      const a = accts[r.user_id];
      const hay = [a?.jsko_id, a?.name, r.method, r.account_details, r.status].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(s)) return false;
    }
    return true;
  }), [rows, tab, q, from, to, accts]);

  const acc = (r: WD, key: string) => {
    switch (key) {
      case "date": return new Date(r.requested_at).getTime();
      case "jsko": return accts[r.user_id]?.jsko_id ?? "";
      case "retailer": return accts[r.user_id]?.name ?? "";
      case "amount": return Number(r.amount || 0);
      case "method": return r.method ?? "";
      case "status": return r.status;
      default: return "";
    }
  };
  const { sorted, sort, toggle } = useSort(filtered, acc);

  const stat = (s: string) => rows.filter((r) => r.status === s);
  const sum = (l: WD[]) => l.reduce((a, r) => a + Number(r.amount || 0), 0);

  const exportCsv = () => {
    if (!sorted.length) return toast.error("Nothing to export");
    const headers = ["Requested On", "JSKO ID", "Retailer", "Amount", "Method", "Account Details", "Status", "Processed On", "Note"];
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const body = sorted.map((r) => [new Date(r.requested_at).toLocaleString("en-IN"), accts[r.user_id]?.jsko_id || "", accts[r.user_id]?.name || "", r.amount, r.method || "", r.account_details || "", r.status, r.processed_at ? new Date(r.processed_at).toLocaleString("en-IN") : "", r.processor_note || r.note || ""]);
    const csv = [headers.map(esc).join(","), ...body.map((x) => x.map(esc).join(","))].join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `withdrawals_${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold"><ArrowUpFromLine className="h-5 w-5 text-admin" /> Withdrawal / Payout Requests</h2>
          <p className="text-sm text-muted-foreground">Retailer payout requests — transfer to pay out (debits their wallet) or reject.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button>
      </div>

      {/* Withdrawal window status */}
      {win && (
        <div className={`flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2.5 text-sm ${win.open_today ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
          {win.open_today ? <CalendarDays className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          <span className="font-semibold">{!win.enabled ? "Withdrawals are turned OFF." : win.open_today ? "Withdrawal window is OPEN today." : "Withdrawal window is CLOSED today."}</span>
          {win.enabled && win.days?.length > 0 && <span>Allowed days of month: <b>{win.days.join(", ")}</b>.</span>}
          {win.enabled && !win.open_today && win.next_open && <span>Next open: <b>{new Date(win.next_open).toLocaleDateString("en-IN")}</b>.</span>}
          {win.enabled && (!win.days || win.days.length === 0) && <span>No day restriction — retailers can request any day.</span>}
        </div>
      )}

      {/* Admin-only: configure which dates retailers may withdraw on */}
      {allowWindowConfig && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <p className="mb-1 flex items-center gap-2 text-sm font-bold"><CalendarDays className="h-4 w-4 text-india-green" /> Withdrawal window (admin)</p>
          <p className="mb-3 text-xs text-muted-foreground">Pick the days of the month on which retailers may request a withdrawal. Leave all unselected to allow any day.</p>
          <label className="mb-3 flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={winOn} onChange={(e) => setWinOn(e.target.checked)} className="h-4 w-4 accent-[oklch(0.55_0.12_150)]" /> Withdrawals enabled</label>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
              const on = winDays.includes(d);
              return (
                <button key={d} type="button" disabled={!winOn}
                  onClick={() => setWinDays((p) => on ? p.filter((x) => x !== d) : [...p, d])}
                  className={`h-8 w-8 rounded-lg text-xs font-semibold transition disabled:opacity-40 ${on ? "bg-india-green text-white" : "border border-border bg-card hover:bg-muted"}`}>{d}</button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={saveWindow} disabled={winBusy} className="bg-india-green text-white">{winBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Save window</Button>
            <button onClick={() => setWinDays([])} className="text-xs font-semibold text-muted-foreground hover:text-foreground">Clear (allow any day)</button>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Pending</p><p className="text-2xl font-extrabold">{stat("pending").length}</p><p className="text-xs text-muted-foreground">{inr(sum(stat("pending")))} awaiting</p></div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Paid out</p><p className="text-2xl font-extrabold text-emerald-600">{inr(sum(stat("paid")))}</p><p className="text-xs text-muted-foreground">{stat("paid").length} transfer(s)</p></div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Rejected</p><p className="text-2xl font-extrabold text-rose-600">{stat("rejected").length}</p></div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Total requests</p><p className="text-2xl font-extrabold">{rows.length}</p></div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_TABS.map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`rounded-full px-3 h-8 text-xs font-semibold transition ${tab === k ? "bg-india-green text-white" : "border border-border bg-card hover:bg-muted"}`}>
              {l}{k !== "all" && <span className={`ml-1 rounded-full px-1.5 text-[10px] font-bold ${tab === k ? "bg-white/25" : "bg-muted text-muted-foreground"}`}>{stat(k).length}</span>}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative"><Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" /><input className="h-8 w-56 rounded-lg border border-border bg-background pl-8 pr-2 text-xs outline-none" placeholder="Search JSKO ID, retailer, method…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <label className="flex items-center gap-1 text-xs text-muted-foreground">From <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 rounded-lg border border-border bg-background px-2 text-xs" /></label>
          <label className="flex items-center gap-1 text-xs text-muted-foreground">To <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 rounded-lg border border-border bg-background px-2 text-xs" /></label>
          <button onClick={exportCsv} disabled={!sorted.length} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-8 text-xs font-semibold hover:bg-muted disabled:opacity-50"><Download className="h-3.5 w-3.5" /> Export</button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <SortTh label="Requested On" sortKey="date" sort={sort} onSort={toggle} className="px-3 py-2" />
              <SortTh label="JSKO ID" sortKey="jsko" sort={sort} onSort={toggle} className="px-3 py-2" />
              <SortTh label="Retailer" sortKey="retailer" sort={sort} onSort={toggle} className="px-3 py-2" />
              <SortTh label="Amount" sortKey="amount" sort={sort} onSort={toggle} className="px-3 py-2" />
              <SortTh label="Method" sortKey="method" sort={sort} onSort={toggle} className="px-3 py-2" />
              <th className="px-3 py-2">Account Details</th>
              <SortTh label="Status" sortKey="status" sort={sort} onSort={toggle} className="px-3 py-2" />
              <th className="px-3 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={8} className="px-3 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
              : sorted.length === 0 ? <tr><td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">No withdrawal requests{tab !== "all" ? ` (${tab})` : ""}.</td></tr>
              : sorted.map((w) => {
                const a = accts[w.user_id];
                return (
                  <tr key={w.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">{new Date(w.requested_at).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="px-3 py-2 font-mono text-xs font-semibold">{a?.jsko_id || "—"}</td>
                    <td className="px-3 py-2">{a?.name ?? "—"}<div className="text-[11px] text-muted-foreground">Wallet {inr(a?.balance ?? 0)}</div></td>
                    <td className="px-3 py-2 font-semibold">{inr(w.amount)}</td>
                    <td className="px-3 py-2 capitalize">{w.method ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">{w.account_details ?? "—"}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${tone[w.status] ?? "bg-muted"}`}>{w.status}</span>
                      {w.processed_at && <div className="mt-0.5 text-[10px] text-muted-foreground">{new Date(w.processed_at).toLocaleDateString("en-IN")}</div>}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">{w.status === "pending" ? <>
                      <Button size="sm" disabled={busy === w.id} onClick={() => act(w, "approve")} className="mr-2 bg-india-green text-white hover:bg-india-green/90">{busy === w.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Banknote className="h-3.5 w-3.5" />} Transfer</Button>
                      <Button size="sm" variant="outline" disabled={busy === w.id} onClick={() => act(w, "reject")} className="text-rose-600"><XCircle className="h-3.5 w-3.5" /> Reject</Button>
                    </> : <span className="text-xs text-muted-foreground">{w.status === "paid" ? "Transferred" : "—"}</span>}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
