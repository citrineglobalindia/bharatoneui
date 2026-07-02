import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, CreditCard, Check, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

type Cfg = { active: boolean; key_id: string | null };
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

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`relative h-6 w-11 rounded-full transition ${on ? "bg-india-green" : "bg-slate-300"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

export function RazorpaySettings() {
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [keyId, setKeyId] = useState("");
  const [rows, setRows] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    await ensureStaffSession();
    const [{ data: c }, { data: p }] = await Promise.all([
      db.from("razorpay_config").select("active,key_id").eq("id", 1).maybeSingle(),
      db.from("razorpay_payments").select("id,user_id,purpose,amount,status,order_id,payment_id,created_at").order("created_at", { ascending: false }).limit(100),
    ]);
    setCfg((c as Cfg) ?? { active: false, key_id: null });
    setKeyId((c as Cfg)?.key_id ?? "");
    setRows((p as Payment[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const save = async (patch: Partial<Cfg>) => {
    setSaving(true);
    const { error } = await db.from("razorpay_config").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", 1);
    setSaving(false);
    if (error) return toast.error("Save failed", { description: error.message });
    toast.success("Razorpay settings saved");
    setCfg((c) => (c ? { ...c, ...patch } : c));
  };

  const stats = useMemo(() => {
    const paid = rows.filter((r) => r.status === "paid");
    return { count: paid.length, total: paid.reduce((a, r) => a + Number(r.amount), 0) };
  }, [rows]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold"><CreditCard className="h-5 w-5 text-india-green" /> Razorpay Payments</h2>
          <p className="text-sm text-muted-foreground">Enable online payments and review the Razorpay payment ledger.</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-9 text-sm font-semibold hover:bg-muted"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
      </div>

      {loading ? (
        <div className="grid h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-india-green" /></div>
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-bold">Online payments (Razorpay) {cfg?.active ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">ON</span> : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">OFF</span>}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">When ON (and secrets are set), retailers can pay online instantly.</p>
              </div>
              <Toggle on={!!cfg?.active} onClick={() => save({ active: !cfg?.active })} />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Key ID (for reference)</label>
                <div className="mt-1 flex gap-2">
                  <input value={keyId} onChange={(e) => setKeyId(e.target.value)} placeholder="rzp_live_… or rzp_test_…" className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30" />
                  <button onClick={() => save({ key_id: keyId.trim() || null })} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-10 text-sm font-semibold hover:bg-muted">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save</button>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-india-green" />
                <span>The Key <b>Secret</b> is stored only in Supabase Edge Function secrets (<code>RAZORPAY_KEY_ID</code> / <code>RAZORPAY_KEY_SECRET</code>) — never in the app or database. This field is informational only.</span>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-soft"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Successful payments</p><p className="text-xl font-extrabold">{stats.count}</p></div>
            <div className="rounded-2xl border border-border bg-card p-4 shadow-soft"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Total collected</p><p className="text-xl font-extrabold text-india-green">{inr(stats.total)}</p></div>
            <div className="rounded-2xl border border-border bg-card p-4 shadow-soft"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Records</p><p className="text-xl font-extrabold">{rows.length}</p></div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Purpose</th><th className="px-3 py-2">Amount</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Order ID</th><th className="px-3 py-2">Payment ID</th></tr>
              </thead>
              <tbody>
                {rows.length === 0 ? <tr><td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">No Razorpay payments yet.</td></tr>
                  : rows.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td>
                      <td className="px-3 py-2">{purposeLabel[r.purpose] ?? r.purpose}</td>
                      <td className="px-3 py-2 font-semibold">{inr(r.amount)}</td>
                      <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusTone[r.status] ?? "bg-slate-100 text-slate-600"}`}>{r.status.replace("_", " ")}</span></td>
                      <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{r.order_id ?? "—"}</td>
                      <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{r.payment_id ?? "—"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
