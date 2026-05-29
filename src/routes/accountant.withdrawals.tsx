import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowDownToLine, CheckCircle2, XCircle, Store, Truck, AlertTriangle } from "lucide-react";
import { AccountantShell } from "@/components/accountant/accountant-shell";
import { PageHeader, StatusBadge } from "@/components/retailer/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { WITHDRAWALS, inr, type WithdrawalRequest, type ApprovalStatus } from "@/components/accountant/mock-data";

export const Route = createFileRoute("/accountant/withdrawals")({
  head: () => ({ meta: [{ title: "Withdrawals — BharatOne Accountant" }] }),
  component: WithdrawalsPage,
});

function WithdrawalsPage() {
  const [rows, setRows] = useState<WithdrawalRequest[]>(WITHDRAWALS);
  const [target, setTarget] = useState<{ row: WithdrawalRequest; action: "Approved" | "Rejected" } | null>(null);
  const [processing, setProcessing] = useState(false);

  const confirm = () => {
    if (!target) return;
    setProcessing(true);
    setTimeout(() => {
      setRows((p) => p.map((r) => (r.id === target.row.id ? { ...r, status: target.action as ApprovalStatus } : r)));
      toast.success(`Withdrawal ${target.action.toLowerCase()}`, { description: `${target.row.name} · ${inr(target.row.amount)} to ${target.row.bank}` });
      setProcessing(false); setTarget(null);
    }, 800);
  };

  return (
    <AccountantShell>
      <div className="space-y-5">
        <PageHeader icon={<ArrowDownToLine className="h-5 w-5" />} title="Withdrawal / Payout Requests" subtitle="Approve payout requests from Retailer & Distributor wallets to bank accounts." />
        <div className="grid gap-3">
          {rows.map((r) => {
            const insufficient = r.amount > r.walletBalance;
            return (
              <div key={r.id} className="rounded-xl border border-border bg-card shadow-soft p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`h-11 w-11 rounded-xl flex items-center justify-center text-white ${r.role === "Retailer" ? "bg-emerald-600" : "bg-violet-600"}`}>{r.role === "Retailer" ? <Store className="h-5 w-5" /> : <Truck className="h-5 w-5" />}</div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap"><p className="font-bold">{r.name}</p><StatusBadge status={r.status === "Pending" ? "pending" : r.status} /></div>
                      <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{r.id} · {r.requestedAt}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">A/C {r.accountNo} · {r.ifsc} · {r.bank}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-xl font-extrabold">{inr(r.amount)}</p>
                    <p className="text-[11px] text-muted-foreground">Wallet bal: {inr(r.walletBalance)}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  {insufficient
                    ? <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-700"><AlertTriangle className="h-3.5 w-3.5" /> Amount exceeds wallet balance</span>
                    : <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Sufficient balance available</span>}
                  {r.status === "Pending" ? (
                    <div className="flex gap-2">
                      <Button onClick={() => setTarget({ row: r, action: "Rejected" })} variant="outline" className="h-9 border-rose-200 text-rose-700 hover:bg-rose-50"><XCircle className="h-4 w-4" /> Reject</Button>
                      <Button onClick={() => setTarget({ row: r, action: "Approved" })} disabled={insufficient} className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white"><CheckCircle2 className="h-4 w-4" /> Approve Payout</Button>
                    </div>
                  ) : <span className="text-xs text-muted-foreground">Processed</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">{target?.action === "Approved" ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <XCircle className="h-5 w-5 text-rose-600" />}{target?.action === "Approved" ? "Approve Payout" : "Reject Withdrawal"}</DialogTitle>
            <DialogDescription>{target && `${target.row.name} · ${inr(target.row.amount)} to ${target.row.bank} (${target.row.accountNo})`}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)} disabled={processing}>Cancel</Button>
            <Button onClick={confirm} disabled={processing} className={target?.action === "Approved" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-rose-600 hover:bg-rose-700 text-white"}>{processing ? "Processing…" : "Confirm"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AccountantShell>
  );
}
