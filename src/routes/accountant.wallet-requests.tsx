import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Wallet, CheckCircle2, XCircle, Store, Truck } from "lucide-react";
import { AccountantShell } from "@/components/accountant/accountant-shell";
import { PageHeader, StatusBadge } from "@/components/retailer/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { WALLET_REQUESTS, inr, type WalletRequest, type ApprovalStatus } from "@/components/accountant/mock-data";

export const Route = createFileRoute("/accountant/wallet-requests")({
  head: () => ({ meta: [{ title: "Wallet Requests — BharatOne Accountant" }] }),
  component: WalletRequestsPage,
});

function WalletRequestsPage() {
  const [rows, setRows] = useState<WalletRequest[]>(WALLET_REQUESTS);
  const [target, setTarget] = useState<{ row: WalletRequest; action: "Approved" | "Rejected" } | null>(null);
  const [processing, setProcessing] = useState(false);

  const confirm = () => {
    if (!target) return;
    setProcessing(true);
    setTimeout(() => {
      setRows((p) => p.map((r) => (r.id === target.row.id ? { ...r, status: target.action as ApprovalStatus } : r)));
      toast.success(`Wallet recharge ${target.action.toLowerCase()}`, { description: `${target.row.name} · ${inr(target.row.amount)} credited to wallet` });
      setProcessing(false); setTarget(null);
    }, 800);
  };

  return (
    <AccountantShell>
      <div className="space-y-5">
        <PageHeader icon={<Wallet className="h-5 w-5" />} title="Wallet Recharge Requests" subtitle="Approve wallet top-up requests raised by Retailers and Distributors." />
        <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 font-bold">Request</th>
                  <th className="text-left px-4 py-3 font-bold">User</th>
                  <th className="text-left px-4 py-3 font-bold">Method / UTR</th>
                  <th className="text-right px-4 py-3 font-bold">Amount</th>
                  <th className="text-left px-4 py-3 font-bold">Status</th>
                  <th className="text-right px-4 py-3 font-bold">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs">{r.id}<div className="text-[10px] text-muted-foreground">{r.requestedAt.split(" ")[1]}</div></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-white ${r.role === "Retailer" ? "bg-emerald-600" : "bg-violet-600"}`}>{r.role === "Retailer" ? <Store className="h-4 w-4" /> : <Truck className="h-4 w-4" />}</div>
                        <div><p className="font-semibold">{r.name}</p><p className="text-[11px] text-muted-foreground">{r.role} · {r.phone}</p></div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs"><p className="font-bold">{r.method}</p><p className="font-mono text-muted-foreground">{r.utr}</p><p className="text-muted-foreground">{r.bank}</p></td>
                    <td className="px-4 py-3 text-right font-bold">{inr(r.amount)}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status === "Pending" ? "pending" : r.status} /></td>
                    <td className="px-4 py-3 text-right">
                      {r.status === "Pending" ? (
                        <div className="flex justify-end gap-1.5">
                          <Button onClick={() => setTarget({ row: r, action: "Rejected" })} variant="outline" className="h-8 px-2 border-rose-200 text-rose-700 hover:bg-rose-50"><XCircle className="h-4 w-4" /></Button>
                          <Button onClick={() => setTarget({ row: r, action: "Approved" })} className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white"><CheckCircle2 className="h-4 w-4" /> Approve</Button>
                        </div>
                      ) : <span className="text-xs text-muted-foreground">Processed</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">{target?.action === "Approved" ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <XCircle className="h-5 w-5 text-rose-600" />}{target?.action === "Approved" ? "Approve Wallet Recharge" : "Reject Wallet Recharge"}</DialogTitle>
            <DialogDescription>{target && `${target.row.name} · ${inr(target.row.amount)} via ${target.row.method} (${target.row.utr})`}</DialogDescription>
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
