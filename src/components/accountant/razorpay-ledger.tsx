import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, CreditCard, ShieldCheck, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

type Payment = { id: string; user_id: string | null; purpose: string; amount: number; status: string; order_id: string | null; payment_id: string | null; created_at: string };

const db = supabase as any;
const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");
const statusTone: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-700", created: "bg-amber-100 text-amber-700",
  failed: "bg-rose-100 text-rose-700", not_configured: "bg-slate-100 text-slate-600",
};
const purposeLabel: Record<string, string> = {
  wallet_topup: "Wallet recharge", registration_fee: "Registration fee", service_payment: "Service payment",
};

export function RazorpayLedger() {
  const [rows, setRows] = useState<Payment[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "paid" | "created" | "failed">("all");
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    await ensureStaffSession();
    const { data } = await db.from("razorpay_payments")
      .select("id,user_id,purpose,amount,status,order_id,payment_id,created_at")
      .order("created_at", { ascending: false }).limit(300);
    const list = (data as Payment[]) ?? [];
    setRows(list);
    const uids = Array.from(new Set(list.map((r) => r.user_id).filter(Boolean))) as string[];
    if (uids.length) {
      const { data: profs } = await db.from("profiles").select("id,display_name").in("id", uids);
      const m: Record<string, string> = {};
      for (const p of (profs as any[]) ?? []) m[p.id] = p.display_name || "Retailer";
      setNames(m);
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const paid = rows.filter((r) => r.status === "paid");
    return { count: paid.length, total: paid.reduce((a, r) => a + Number(r.amount), 0) };
  }, [rows]);

  const filtered = useMemo(() => rows.filter((r) =>
    (tab === "all" || r.status === tab) &&
    (!q || [names[r.user_id ?? ""], r.order_id, r.payment_id, purposeLabel[r.purpose]].filter(Boolean).some((v) => String(v).toLowerCase().includes(q.toLowerCase())))
  ), [rows, tab, q, names]);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold"><CreditCard className="h-4 w-4 text-india-green" /> Razorpay Payments</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5 text-india-green" /> Auto-verified by Razorpay signature and credited instantly — shown here for reconciliation.</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-9 text-sm font-semibold hover:bg-muted"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Successful</p><p className="text-lg font-extrabold">{stats.count}</p></div>
        <div className="rounded-xl border border-border p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Collected online</p><p className="text-lg font-extrabold text-india-green">{inr(stats.total)}</p></div>
        <div className="rounded-xl border border-border p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Records</p><p className="text-lg font-extrabold">{rows.length}</p></div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {(["all", "paid", "created", "failed"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full px-3 h-8 text-xs font-semibold capitalize transition ${tab === t ? "bg-india-green text-white" : "border border-border bg-card hover:bg-muted"}`}>{t}</button>
        ))}
        <div className="relative ml-auto"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><input className="h-9 w-56 rounded-lg border border-border bg-background pl-8 pr-2 text-sm outline-none" placeholder="Search retailer, order, payment id" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Retailer</th><th className="px-3 py-2">Purpose</th><th className="px-3 py-2">Amount</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Payment ID</th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="px-3 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
              : filtered.length === 0 ? <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No Razorpay payments{tab !== "all" || q ? " for this filter" : " yet"}.</td></tr>
              : filtered.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td>
                  <td className="px-3 py-2 font-medium">{r.user_id ? (names[r.user_id] ?? "Retailer") : "—"}</td>
                  <td className="px-3 py-2">{purposeLabel[r.purpose] ?? r.purpose}</td>
                  <td className="px-3 py-2 font-semibold">{inr(r.amount)}</td>
                  <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusTone[r.status] ?? "bg-slate-100 text-slate-600"}`}>{r.status.replace("_", " ")}</span></td>
                  <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{r.payment_id ?? "—"}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
