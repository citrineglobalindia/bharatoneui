import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  FileCheck2, CheckCircle2, XCircle, Search, Store, Truck, ReceiptText, ShieldCheck, AlertTriangle,
} from "lucide-react";
import { AccountantShell } from "@/components/accountant/accountant-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { StatusBadge } from "@/components/retailer/page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { REGISTRATION_PAYMENTS, inr, type RegistrationPayment, type ApprovalStatus } from "@/components/accountant/mock-data";

export const Route = createFileRoute("/accountant/registrations")({
  head: () => ({ meta: [{ title: "Registration Payments — BharatOne Accountant" }] }),
  component: RegistrationsPage,
});

type Action = "Approved" | "Rejected";

function RegistrationsPage() {
  const [rows, setRows] = useState<RegistrationPayment[]>(REGISTRATION_PAYMENTS);
  const [filter, setFilter] = useState<"All" | "Retailer" | "Distributor">("All");
  const [q, setQ] = useState("");
  const [target, setTarget] = useState<{ row: RegistrationPayment; action: Action } | null>(null);
  const [remark, setRemark] = useState("");
  const [processing, setProcessing] = useState(false);

  const filtered = rows.filter((r) =>
    (filter === "All" || r.role === filter) &&
    (q === "" || r.name.toLowerCase().includes(q.toLowerCase()) || r.utr.includes(q) || r.id.includes(q)),
  );

  const confirm = () => {
    if (!target) return;
    setProcessing(true);
    setTimeout(() => {
      setRows((prev) => prev.map((r) => (r.id === target.row.id ? { ...r, status: target.action as ApprovalStatus } : r)));
      toast.success(`Registration ${target.action.toLowerCase()}`, {
        description: `${target.row.name} · ${inr(target.row.amount + target.row.gst)}`,
      });
      setProcessing(false);
      setTarget(null);
      setRemark("");
    }, 800);
  };

  return (
    <AccountantShell>
      <div className="space-y-5">
        <PageHeader
          icon={<FileCheck2 className="h-5 w-5" />}
          title="Registration Payment Verification"
          subtitle="Verify Retailer & Distributor registration amounts and approve onboarding payments."
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl bg-white border border-border px-3 h-10 shadow-soft flex-1 min-w-[220px]">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, UTR or registration ID…" className="bg-transparent flex-1 text-sm outline-none" />
          </div>
          <div className="flex rounded-xl border border-border bg-white overflow-hidden shadow-soft">
            {(["All", "Retailer", "Distributor"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`px-3 h-10 text-xs font-bold ${filter === f ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-muted"}`}>{f}</button>
            ))}
          </div>
        </div>

        <div className="grid gap-3">
          {filtered.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card shadow-soft p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center text-white shrink-0 ${r.role === "Retailer" ? "bg-emerald-600" : "bg-violet-600"}`}>
                    {r.role === "Retailer" ? <Store className="h-5 w-5" /> : <Truck className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold truncate">{r.name}</p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${r.role === "Retailer" ? "bg-emerald-100 text-emerald-700" : "bg-violet-100 text-violet-700"}`}>{r.role}</span>
                      <StatusBadge status={r.status === "Pending" ? "pending" : r.status} />
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">{r.id} · {r.applicantId}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.plan} · {r.city}, {r.state}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display text-xl font-extrabold">{inr(r.amount + r.gst)}</p>
                  <p className="text-[11px] text-muted-foreground">Base {inr(r.amount)} + GST {inr(r.gst)}</p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="rounded-lg bg-muted/50 px-3 py-2"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Method</p><p className="font-bold">{r.method}</p></div>
                <div className="rounded-lg bg-muted/50 px-3 py-2"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">UTR / Ref</p><p className="font-bold font-mono truncate">{r.utr}</p></div>
                <div className="rounded-lg bg-muted/50 px-3 py-2"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Payer Bank</p><p className="font-bold truncate">{r.payerBank}</p></div>
                <div className="rounded-lg bg-muted/50 px-3 py-2"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Submitted</p><p className="font-bold">{r.submittedAt.split(" ")[1]}</p></div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${r.receiptVerified ? "text-emerald-700" : "text-amber-700"}`}>
                  {r.receiptVerified ? <ShieldCheck className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                  {r.receiptVerified ? "Receipt matched in bank statement" : "Receipt not yet matched"}
                </span>
                {r.status === "Pending" ? (
                  <div className="flex gap-2">
                    <Button onClick={() => setTarget({ row: r, action: "Rejected" })} variant="outline" className="h-9 border-rose-200 text-rose-700 hover:bg-rose-50">
                      <XCircle className="h-4 w-4" /> Reject
                    </Button>
                    <Button onClick={() => setTarget({ row: r, action: "Approved" })} className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white">
                      <CheckCircle2 className="h-4 w-4" /> Approve Payment
                    </Button>
                  </div>
                ) : (
                  <span className="text-xs font-semibold text-muted-foreground">Processed</span>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-10">No registration payments found.</p>}
        </div>
      </div>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {target?.action === "Approved" ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <XCircle className="h-5 w-5 text-rose-600" />}
              {target?.action === "Approved" ? "Approve Registration Payment" : "Reject Registration Payment"}
            </DialogTitle>
            <DialogDescription>
              {target && `${target.row.name} (${target.row.role}) · ${inr(target.row.amount + target.row.gst)} via ${target.row.method}`}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-muted/50 p-3 text-xs flex items-center gap-2">
            <ReceiptText className="h-4 w-4 text-muted-foreground" />
            <span>UTR <span className="font-mono font-bold">{target?.row.utr}</span> · {target?.row.payerBank}</span>
          </div>
          <textarea
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder={target?.action === "Rejected" ? "Reason for rejection (required)…" : "Remark (optional)…"}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[72px] outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)} disabled={processing}>Cancel</Button>
            <Button
              onClick={confirm}
              disabled={processing || (target?.action === "Rejected" && remark.trim() === "")}
              className={target?.action === "Approved" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-rose-600 hover:bg-rose-700 text-white"}
            >
              {processing ? "Processing…" : target?.action === "Approved" ? "Confirm Approve" : "Confirm Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AccountantShell>
  );
}
