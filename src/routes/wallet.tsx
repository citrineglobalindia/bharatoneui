import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Wallet, Plus, Loader2, ArrowDownToLine, ArrowUpFromLine, Clock3, RefreshCw } from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { SectionCard, Field, Input, Select, PrimaryButton } from "@/components/retailer/section-card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/wallet")({
  head: () => ({ meta: [{ title: "Wallet — BharatOne" }] }),
  component: WalletPage,
});

type Tx = { id: string; direction: "credit" | "debit"; amount: number; balance_after: number; reason: string | null; created_at: string };
type Topup = { id: string; amount: number; method: string | null; reference: string | null; status: string; created_at: string };
const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");
const statusTone: Record<string, string> = { pending: "bg-amber-100 text-amber-700", verified: "bg-emerald-100 text-emerald-700", rejected: "bg-rose-100 text-rose-700" };

function WalletPage() {
  const [balance, setBalance] = useState(0);
  const [txns, setTxns] = useState<Tx[]>([]);
  const [topups, setTopups] = useState<Topup[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("UPI");
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setLoading(false); return; }
    const [w, t, tp] = await Promise.all([
      supabase.from("wallets").select("balance").eq("user_id", u.user.id).maybeSingle(),
      supabase.from("wallet_transactions").select("id,direction,amount,balance_after,reason,created_at").order("created_at", { ascending: false }).limit(50),
      supabase.from("wallet_topups").select("id,amount,method,reference,status,created_at").order("created_at", { ascending: false }).limit(20),
    ]);
    setBalance(Number((w.data as any)?.balance ?? 0));
    setTxns((t.data as Tx[]) ?? []);
    setTopups((tp.data as Topup[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    setSubmitting(true);
    const { error } = await supabase.rpc("request_wallet_topup", { p_amount: amt, p_method: method, p_reference: reference || null });
    setSubmitting(false);
    if (error) return toast.error("Request failed", { description: error.message });
    toast.success("Top-up request sent", { description: "Awaiting accountant verification." });
    setAmount(""); setReference(""); load();
  };

  const pendingTotal = useMemo(() => topups.filter((t) => t.status === "pending").reduce((a, t) => a + Number(t.amount), 0), [topups]);

  return (
    <RetailerShell>
      <div className="space-y-5">
        <PageHeader icon={<Wallet className="h-5 w-5" />} title="Wallet" subtitle="Add funds, track balance and view all wallet transactions"
          actions={<button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-10 text-sm font-semibold hover:bg-muted"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button>} />

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl bg-saffron-gradient p-5 text-white shadow-elev lg:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-90">Available Balance</p>
            <p className="mt-1 font-display text-3xl font-extrabold">{loading ? "…" : inr(balance)}</p>
            {pendingTotal > 0 && <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold"><Clock3 className="h-3 w-3" /> {inr(pendingTotal)} pending verification</p>}
          </div>
          <SectionCard title="Add Funds" className="lg:col-span-2">
            <form onSubmit={submit} className="grid gap-3 sm:grid-cols-3">
              <Field label="Amount (₹)"><Input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="500" /></Field>
              <Field label="Method"><Select value={method} onChange={(e) => setMethod(e.target.value)}><option>UPI</option><option>Bank Transfer</option><option>Cash Deposit</option><option>NEFT/IMPS</option></Select></Field>
              <Field label="Reference / UTR"><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Txn ref (optional)" /></Field>
              <div className="sm:col-span-3 flex justify-end"><PrimaryButton type="submit" disabled={submitting}>{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Request Top-up</PrimaryButton></div>
            </form>
            <p className="mt-1 text-xs text-muted-foreground">Funds are credited after the accountant verifies your payment.</p>
          </SectionCard>
        </div>

        {topups.length > 0 && (
          <SectionCard title="Top-up Requests">
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="py-2">Date</th><th className="py-2">Amount</th><th className="py-2">Method</th><th className="py-2">Reference</th><th className="py-2">Status</th></tr></thead>
              <tbody>{topups.map((t) => (<tr key={t.id} className="border-t border-border"><td className="py-2 text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString("en-IN")}</td><td className="py-2 font-semibold">{inr(t.amount)}</td><td className="py-2">{t.method ?? "—"}</td><td className="py-2 text-xs">{t.reference ?? "—"}</td><td className="py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${statusTone[t.status]}`}>{t.status}</span></td></tr>))}</tbody>
            </table></div>
          </SectionCard>
        )}

        <SectionCard title="Recent Transactions">
          {loading ? <div className="py-6 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
            : txns.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No transactions yet.</p>
            : <div className="overflow-x-auto"><table className="w-full text-sm">
                <thead className="text-left text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="py-2">Date</th><th className="py-2">Details</th><th className="py-2 text-right">Amount</th><th className="py-2 text-right">Balance</th></tr></thead>
                <tbody>{txns.map((t) => (<tr key={t.id} className="border-t border-border">
                  <td className="py-2 text-xs text-muted-foreground whitespace-nowrap">{new Date(t.created_at).toLocaleString("en-IN")}</td>
                  <td className="py-2"><span className="inline-flex items-center gap-1.5">{t.direction === "credit" ? <ArrowDownToLine className="h-3.5 w-3.5 text-emerald-600" /> : <ArrowUpFromLine className="h-3.5 w-3.5 text-rose-500" />}{t.reason ?? (t.direction === "credit" ? "Credit" : "Debit")}</span></td>
                  <td className={`py-2 text-right font-semibold ${t.direction === "credit" ? "text-emerald-600" : "text-rose-500"}`}>{t.direction === "credit" ? "+" : "−"}{inr(t.amount)}</td>
                  <td className="py-2 text-right text-muted-foreground">{inr(t.balance_after)}</td>
                </tr>))}</tbody>
              </table></div>}
        </SectionCard>
      </div>
    </RetailerShell>
  );
}
