import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Banknote, Plus } from "lucide-react";
import { AccountantShell } from "@/components/accountant/accountant-shell";
import { PageHeader, StatusBadge } from "@/components/retailer/page-header";
import { StatCard } from "@/components/retailer/stat-card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { MAIN_ACCOUNT, MAIN_ACCOUNT_RECHARGES, inr, type MainAccountRecharge } from "@/components/accountant/mock-data";

export const Route = createFileRoute("/accountant/main-recharge")({
  head: () => ({ meta: [{ title: "Main Account Recharge — BharatOne Accountant" }] }),
  component: MainRechargePage,
});

function MainRechargePage() {
  const [rows, setRows] = useState<MainAccountRecharge[]>(MAIN_ACCOUNT_RECHARGES);
  const [balance, setBalance] = useState(MAIN_ACCOUNT.balance);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("Aggregator Top-up (NSDL)");
  const [method, setMethod] = useState("RTGS");
  const [reference, setReference] = useState("");
  const [processing, setProcessing] = useState(false);

  const submit = () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (reference.trim() === "") { toast.error("Enter a payment reference"); return; }
    setProcessing(true);
    setTimeout(() => {
      const rec: MainAccountRecharge = { id: `BO-MAR-${9002 + rows.length}`, source, amount: amt, method, reference, date: new Date().toISOString().slice(0, 16).replace("T", " "), status: "Credited" };
      setRows((p) => [rec, ...p]);
      setBalance((b) => b + amt);
      toast.success("Main account recharged", { description: `${inr(amt)} credited via ${method}` });
      setProcessing(false); setOpen(false); setAmount(""); setReference("");
    }, 900);
  };

  return (
    <AccountantShell>
      <div className="space-y-5">
        <PageHeader
          icon={<Banknote className="h-5 w-5" />}
          title="Main Account Recharge"
          subtitle="Top up the company master wallet that funds AEPS, BBPS and recharge floats."
          actions={<Button onClick={() => setOpen(true)} className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4" /> New Recharge</Button>}
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Main A/C Balance" value={inr(balance)} icon={<Banknote className="h-5 w-5" />} tone="green" />
          <StatCard label="AEPS Float" value={inr(MAIN_ACCOUNT.aepsFloat)} icon={<Banknote className="h-5 w-5" />} tone="sky" />
          <StatCard label="BBPS Float" value={inr(MAIN_ACCOUNT.bbpsFloat)} icon={<Banknote className="h-5 w-5" />} tone="violet" />
          <StatCard label="Recharge Float" value={inr(MAIN_ACCOUNT.rechargeFloat)} icon={<Banknote className="h-5 w-5" />} tone="saffron" />
        </div>

        <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
          <div className="p-4 border-b border-border"><h3 className="text-sm font-bold">Recharge History</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 font-bold">Ref ID</th>
                  <th className="text-left px-4 py-3 font-bold">Source</th>
                  <th className="text-left px-4 py-3 font-bold">Method / Ref</th>
                  <th className="text-right px-4 py-3 font-bold">Amount</th>
                  <th className="text-left px-4 py-3 font-bold">Date</th>
                  <th className="text-left px-4 py-3 font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs">{r.id}</td>
                    <td className="px-4 py-3">{r.source}</td>
                    <td className="px-4 py-3 text-xs"><p className="font-bold">{r.method}</p><p className="font-mono text-muted-foreground">{r.reference}</p></td>
                    <td className="px-4 py-3 text-right font-bold">{inr(r.amount)}</td>
                    <td className="px-4 py-3 text-xs">{r.date}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status === "Credited" ? "success" : "pending"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Banknote className="h-5 w-5 text-emerald-600" /> Recharge Main Account</DialogTitle>
            <DialogDescription>Record a top-up to the company master wallet.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold">Amount (₹)</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 1000000" className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40" />
            </div>
            <div>
              <label className="text-xs font-semibold">Source</label>
              <select value={source} onChange={(e) => setSource(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none">
                <option>Aggregator Top-up (NSDL)</option><option>AEPS Settlement Pool</option><option>BBPS Float Recharge</option><option>Recharge Float Top-up</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold">Method</label>
              <select value={method} onChange={(e) => setMethod(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none">
                <option>RTGS</option><option>NEFT</option><option>IMPS</option><option>UPI</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold">Payment Reference / UTR</label>
              <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UTR number" className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={processing}>Cancel</Button>
            <Button onClick={submit} disabled={processing} className="bg-emerald-600 hover:bg-emerald-700 text-white">{processing ? "Processing…" : "Confirm Recharge"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AccountantShell>
  );
}
