import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Banknote, Plus, Loader2, RefreshCw, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { AccountantShell } from "@/components/accountant/accountant-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

export const Route = createFileRoute("/accountant/main-recharge")({
  head: () => ({ meta: [{ title: "Main Account Recharge — BharatOne Accountant" }] }),
  component: MainRechargePage,
});

type Ledger = { id: string; direction: "credit" | "debit"; amount: number; balance_after: number; reason: string | null; created_at: string };
const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");

function MainRechargePage() {
  const [balance, setBalance] = useState(0);
  const [ledger, setLedger] = useState<Ledger[]>([]);
  const [loading, setLoading] = useState(true);
  const [amt, setAmt] = useState(""); const [note, setNote] = useState(""); const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      await ensureStaffSession();
      const [b, l] = await Promise.all([
        supabase.rpc("company_balance"),
        supabase.from("company_ledger").select("id,direction,amount,balance_after,reason,created_at").order("created_at", { ascending: false }).limit(100),
      ]);
      setBalance(Number((b.data as any) ?? 0));
      setLedger((l.data as Ledger[]) ?? []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const recharge = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = Number(amt); if (!v || v <= 0) return toast.error("Enter a valid amount");
    setBusy(true);
    const { error } = await supabase.rpc("recharge_company_account", { p_amount: v, p_note: note || null });
    setBusy(false);
    if (error) return toast.error("Recharge failed", { description: error.message });
    toast.success("Main account recharged"); setAmt(""); setNote(""); load();
  };

  const totals = useMemo(() => ({
    credit: ledger.filter((l) => l.direction === "credit").reduce((a, l) => a + Number(l.amount), 0),
    debit: ledger.filter((l) => l.direction === "debit").reduce((a, l) => a + Number(l.amount), 0),
  }), [ledger]);

  return (
    <AccountantShell>
      <div className="space-y-5">
        <PageHeader icon={<Banknote className="h-5 w-5" />} title="Main Account Recharge" subtitle="Company float used to credit retailer wallets."
          actions={<button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-10 text-sm font-semibold hover:bg-muted"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button>} />

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl bg-saffron-gradient p-5 text-white shadow-elev">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-90">Main Account Balance</p>
            <p className="mt-1 font-display text-3xl font-extrabold">{loading ? "…" : inr(balance)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft lg:col-span-2">
            <p className="mb-3 flex items-center gap-2 text-sm font-bold"><Plus className="h-4 w-4 text-india-green" /> Recharge main account</p>
            <form onSubmit={recharge} className="grid gap-3 sm:grid-cols-4">
              <input type="number" min="1" className="h-10 rounded-lg border border-border bg-background px-2 text-sm sm:col-span-1" placeholder="Amount" value={amt} onChange={(e) => setAmt(e.target.value)} />
              <input className="h-10 rounded-lg border border-border bg-background px-2 text-sm sm:col-span-2" placeholder="Note / reference (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
              <Button type="submit" disabled={busy} className="bg-india-green text-white hover:bg-india-green/90">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Recharge</Button>
            </form>
            <p className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <span className="rounded-lg bg-emerald-50 px-3 py-2">Total in <b className="text-emerald-700">{inr(totals.credit)}</b></span>
              <span className="rounded-lg bg-rose-50 px-3 py-2">Total disbursed <b className="text-rose-600">{inr(totals.debit)}</b></span>
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Details</th><th className="px-3 py-2 text-right">Amount</th><th className="px-3 py-2 text-right">Balance</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={4} className="px-3 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
                : ledger.length === 0 ? <tr><td colSpan={4} className="px-3 py-10 text-center text-muted-foreground">No movements yet. Recharge to add float.</td></tr>
                : ledger.map((l) => (<tr key={l.id} className="border-t border-border">
                  <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{new Date(l.created_at).toLocaleString("en-IN")}</td>
                  <td className="px-3 py-2"><span className="inline-flex items-center gap-1.5">{l.direction === "credit" ? <ArrowDownToLine className="h-3.5 w-3.5 text-emerald-600" /> : <ArrowUpFromLine className="h-3.5 w-3.5 text-rose-500" />}{l.reason ?? l.direction}</span></td>
                  <td className={`px-3 py-2 text-right font-semibold ${l.direction === "credit" ? "text-emerald-600" : "text-rose-500"}`}>{l.direction === "credit" ? "+" : "−"}{inr(l.amount)}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{inr(l.balance_after)}</td>
                </tr>))}
            </tbody>
          </table>
        </div>
      </div>
    </AccountantShell>
  );
}
