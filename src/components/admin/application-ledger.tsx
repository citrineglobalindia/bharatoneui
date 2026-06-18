import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw, Search, IndianRupee, BadgeCheck, Clock3, Wallet, TrendingUp, CheckCircle2, RotateCcw, Download, UserCog, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

type Row = {
  id: string; application_no: string; category_name: string; service_name: string;
  full_name: string; submitter_name: string | null; assigned_operator: string | null;
  service_charge: number; commission_price: number; company_commission?: number;
  status: string; payment_verified: boolean; payment_verified_at: string | null; created_at: string;
};
const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");
const statusTone: Record<string, string> = { submitted: "bg-saffron/10 text-saffron", on_process: "bg-amber-500/10 text-amber-600", in_progress: "bg-amber-500/10 text-amber-600", waiting_approval: "bg-sky-500/10 text-sky-600", on_delay: "bg-orange-600/10 text-orange-700", approved: "bg-sky-500/10 text-sky-600", completed: "bg-india-green/10 text-india-green", rejected: "bg-rose-500/10 text-rose-600" };
const statusLabel: Record<string, string> = { submitted: "New", on_process: "On Process", in_progress: "On Process", waiting_approval: "Waiting for Approval", on_delay: "On Delay", approved: "Waiting for Approval", completed: "Completed", rejected: "Rejected" };

export function ApplicationLedger() {
  const [rows, setRows] = useState<Row[]>([]);
  const [ops, setOps] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [pay, setPay] = useState<"all" | "verified" | "pending">("all");

  async function load() {
    setLoading(true);
    try {
      await ensureStaffSession();
      const [a, u] = await Promise.all([
        supabase.from("service_applications").select("id,application_no,category_name,service_name,full_name,submitter_name,assigned_operator,service_charge,commission_price,status,payment_verified,payment_verified_at,created_at").order("created_at", { ascending: false }),
        supabase.rpc("admin_list_users"),
      ]);
      setRows((a.data as Row[]) ?? []);
      const m: Record<string, string> = {}; ((u.data as any[]) ?? []).forEach((x) => { m[x.id] = x.display_name || x.email || "User"; });
      setOps(m);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const verify = async (r: Row, val: boolean) => {
    setBusy(r.id);
    const { error } = await supabase.rpc("verify_application_payment", { p_id: r.id, p_verified: val });
    setBusy(null);
    if (error) return toast.error("Failed", { description: error.message });
    toast.success(val ? "Payment verified" : "Verification removed");
    setRows((p) => p.map((x) => x.id === r.id ? { ...x, payment_verified: val, payment_verified_at: val ? new Date().toISOString() : null } : x));
  };

  const setStatus = async (r: Row, status: string) => {
    setBusy(r.id + status);
    const { error } = await supabase.from("service_applications").update({ status }).eq("id", r.id);
    setBusy(null);
    if (error) return toast.error("Failed", { description: error.message });
    toast.success("Transaction " + status);
    setRows((p) => p.map((x) => x.id === r.id ? { ...x, status } : x));
  };

  const totals = useMemo(() => ({
    amount: rows.reduce((a, r) => a + Number(r.service_charge || 0), 0),
    verified: rows.filter((r) => r.payment_verified).reduce((a, r) => a + Number(r.service_charge || 0), 0),
    pending: rows.filter((r) => !r.payment_verified).reduce((a, r) => a + Number(r.service_charge || 0), 0),
    commission: rows.reduce((a, r) => a + Number(r.commission_price || 0), 0),
  }), [rows]);

  const filtered = useMemo(() => rows.filter((r) =>
    (pay === "all" || (pay === "verified" ? r.payment_verified : !r.payment_verified)) &&
    (!q || [r.application_no, r.full_name, r.service_name, r.submitter_name].filter(Boolean).some((v) => String(v).toLowerCase().includes(q.toLowerCase())))
  ), [rows, q, pay]);

  const exportCsv = () => {
    const head = ["Application ID", "Date", "Retailer", "Applicant", "Service", "Category", "Amount", "Commission", "Status", "Payment"].join(",");
    const body = filtered.map((r) => [r.application_no, new Date(r.created_at).toLocaleDateString("en-IN"), r.submitter_name ?? "", r.full_name, r.service_name, r.category_name, r.service_charge, r.commission_price, statusLabel[r.status] ?? r.status, r.payment_verified ? "Verified" : "Pending"].map((x) => `"${String(x ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([head + "\n" + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "application-ledger.csv"; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="flex items-center gap-2 text-lg font-extrabold"><Wallet className="h-5 w-5 text-admin" /> Application Ledger</h2>
          <p className="text-sm text-muted-foreground">Service application amounts and commissions. Verify each payment.</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4" /> Export CSV</Button>
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[["Total Amount", inr(totals.amount), IndianRupee, "bg-blue-500/10 text-blue-600"], ["Verified", inr(totals.verified), BadgeCheck, "bg-india-green/10 text-india-green"], ["Pending Verification", inr(totals.pending), Clock3, "bg-amber-500/10 text-amber-600"], ["Total Commission", inr(totals.commission), TrendingUp, "bg-saffron/10 text-saffron"]].map(([l, v, Icon, t]: any, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-4 shadow-soft"><div className="flex items-center gap-2"><span className={`grid h-9 w-9 place-items-center rounded-lg ${t}`}><Icon className="h-4 w-4" /></span><div><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{l}</p><p className="text-lg font-extrabold">{v}</p></div></div></div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><input className="h-9 w-60 rounded-lg border border-border bg-background pl-8 pr-2 text-sm outline-none" placeholder="Search ID, retailer, service…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        {(["all", "pending", "verified"] as const).map((k) => <button key={k} onClick={() => setPay(k)} className={`rounded-full px-3 h-9 text-xs font-semibold capitalize transition ${pay === k ? "bg-india-green text-white" : "border border-border bg-card hover:bg-muted"}`}>{k === "all" ? "All payments" : k}</button>)}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr><th className="px-3 py-2">Application ID</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Retailer</th><th className="px-3 py-2">Service</th><th className="px-3 py-2">Amount</th><th className="px-3 py-2">Commission</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Payment</th><th className="px-3 py-2 text-right">Verify Payment</th><th className="px-3 py-2 text-right">Approve</th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={10} className="px-3 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
              : filtered.length === 0 ? <tr><td colSpan={10} className="px-3 py-10 text-center text-muted-foreground">No application transactions found.</td></tr>
              : filtered.map((r) => (
              <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                <td className="px-3 py-2 font-mono text-xs font-semibold">{r.application_no}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("en-IN")}</td>
                <td className="px-3 py-2">{r.submitter_name || "—"}</td>
                <td className="px-3 py-2"><div className="font-medium">{r.service_name}</div><div className="text-[11px] text-muted-foreground">{r.category_name}</div></td>
                <td className="px-3 py-2 font-semibold">{inr(r.service_charge)}</td>
                <td className="px-3 py-2 text-india-green">{inr(r.commission_price)}</td>
                <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${statusTone[r.status] ?? "bg-muted"}`}>{statusLabel[r.status] ?? r.status}</span></td>
                <td className="px-3 py-2">{r.payment_verified ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700"><BadgeCheck className="h-3.5 w-3.5" /> Verified</span> : <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">Pending</span>}</td>
                <td className="px-3 py-2 text-right">
                  {r.payment_verified
                    ? <button onClick={() => verify(r, false)} disabled={busy === r.id} className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">{busy === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />} Unverify</button>
                    : <button onClick={() => verify(r, true)} disabled={busy === r.id} className="inline-flex items-center gap-1 rounded-lg bg-india-green px-2.5 py-1 text-xs font-semibold text-white hover:bg-india-green/90">{busy === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Verify</button>}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  {["approved","completed"].includes(r.status)
                    ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-india-green"><CheckCircle2 className="h-3.5 w-3.5" /> {statusLabel[r.status]}</span>
                    : r.status === "rejected"
                      ? <span className="text-xs font-semibold text-rose-600">Rejected</span>
                      : <><button onClick={() => setStatus(r, "approved")} disabled={busy === r.id+"approved"} className="mr-2 inline-flex items-center gap-1 rounded-lg bg-admin px-2.5 py-1 text-xs font-semibold text-admin-foreground hover:bg-admin/90">{busy === r.id+"approved" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Approve</button><button onClick={() => setStatus(r, "rejected")} disabled={busy === r.id+"rejected"} className="text-xs font-semibold text-rose-600 hover:underline"><XCircle className="inline h-3.5 w-3.5" /></button></>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
