import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  FileCheck2, CheckCircle2, XCircle, Search, Store, Truck, ReceiptText, ShieldCheck, AlertTriangle,
  Eye, Copy, Phone, MapPin, CreditCard, Building2, Clock, FileText, Fingerprint, ScanFace,
  Video, BadgeCheck, TrendingUp, ShieldAlert, Banknote, Printer,
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

// Deterministic helpers derived from the record so the "extraordinary" view stays stable per applicant.
const hash = (s: string) => s.split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
function riskScore(r: RegistrationPayment) {
  let score = 18;
  if (!r.receiptVerified) score += 34;
  if (r.method === "UPI") score += 6;
  if (r.amount >= 20000) score += 10;
  score += hash(r.utr) % 14;
  return Math.min(96, score);
}
function kycChecklist(r: RegistrationPayment) {
  const h = hash(r.id);
  return [
    { label: "PAN Verified", icon: <CreditCard className="h-4 w-4" />, ok: true },
    { label: "Aadhaar e-KYC", icon: <Fingerprint className="h-4 w-4" />, ok: true },
    { label: "Bank Account Penny-Drop", icon: <Building2 className="h-4 w-4" />, ok: r.receiptVerified },
    { label: "Selfie Match", icon: <ScanFace className="h-4 w-4" />, ok: (h % 5) !== 0 },
    { label: "Video KYC", icon: <Video className="h-4 w-4" />, ok: r.role === "Distributor" ? (h % 3 !== 0) : true },
  ];
}

function RegistrationsPage() {
  const [rows, setRows] = useState<RegistrationPayment[]>(REGISTRATION_PAYMENTS);
  const [filter, setFilter] = useState<"All" | "Retailer" | "Distributor">("All");
  const [q, setQ] = useState("");
  const [target, setTarget] = useState<{ row: RegistrationPayment; action: Action } | null>(null);
  const [remark, setRemark] = useState("");
  const [processing, setProcessing] = useState(false);
  const [view, setView] = useState<RegistrationPayment | null>(null);

  const copy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    toast.success(`${label} copied`, { description: text });
  };

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
      setView(null);
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
                    <Button onClick={() => setView(r)} variant="outline" className="h-9">
                      <Eye className="h-4 w-4" /> View
                    </Button>
                    <Button onClick={() => setTarget({ row: r, action: "Rejected" })} variant="outline" className="h-9 border-rose-200 text-rose-700 hover:bg-rose-50">
                      <XCircle className="h-4 w-4" /> Reject
                    </Button>
                    <Button onClick={() => setTarget({ row: r, action: "Approved" })} className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white">
                      <CheckCircle2 className="h-4 w-4" /> Approve Payment
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button onClick={() => setView(r)} variant="outline" className="h-8">
                      <Eye className="h-4 w-4" /> View
                    </Button>
                    <span className="text-xs font-semibold text-muted-foreground">Processed</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-10">No registration payments found.</p>}
        </div>
      </div>

      {/* ===== Extraordinary 360° View ===== */}
      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden gap-0 max-h-[92vh] overflow-y-auto">
          {view && (() => {
            const total = view.amount + view.gst;
            const risk = riskScore(view);
            const riskTone = risk >= 60 ? "rose" : risk >= 35 ? "amber" : "emerald";
            const checklist = kycChecklist(view);
            const passed = checklist.filter((c) => c.ok).length;
            const timeline = [
              { t: view.submittedAt.split(" ")[1], label: "Payment submitted by applicant", done: true },
              { t: "Auto", label: "Bank statement reconciliation", done: view.receiptVerified },
              { t: "Auto", label: "KYC verification completed", done: passed >= 4 },
              { t: "—", label: "Accountant approval", done: view.status === "Approved" },
            ];
            return (
              <>
                <div className="relative px-5 py-4 bg-gradient-to-br from-emerald-600 to-teal-700 text-white">
                  <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                  <div className="relative flex items-start gap-3">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${view.role === "Retailer" ? "bg-white/20" : "bg-white/20"}`}>
                      {view.role === "Retailer" ? <Store className="h-6 w-6" /> : <Truck className="h-6 w-6" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <DialogTitle className="text-lg font-extrabold text-white flex items-center gap-2">
                        {view.name}
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/20 uppercase tracking-wide">{view.role}</span>
                      </DialogTitle>
                      <DialogDescription className="text-emerald-50/90 text-xs mt-0.5 font-mono">{view.id} · {view.applicantId}</DialogDescription>
                      <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-emerald-50/90">
                        <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {view.phone}</span>
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {view.city}, {view.state}</span>
                        <span className="inline-flex items-center gap-1"><FileText className="h-3 w-3" /> {view.plan}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-display text-2xl font-extrabold leading-none">{inr(total)}</p>
                      <p className="text-[10px] text-emerald-50/80 mt-1">Base {inr(view.amount)} + GST {inr(view.gst)}</p>
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* Risk + KYC summary */}
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className={`rounded-xl border p-3 ${riskTone === "rose" ? "border-rose-200 bg-rose-50" : riskTone === "amber" ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1"><ShieldAlert className="h-3.5 w-3.5" /> Risk Score</span>
                        <span className={`text-lg font-extrabold ${riskTone === "rose" ? "text-rose-700" : riskTone === "amber" ? "text-amber-700" : "text-emerald-700"}`}>{risk}</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-white/70 overflow-hidden">
                        <div className={`h-full rounded-full ${riskTone === "rose" ? "bg-rose-500" : riskTone === "amber" ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${risk}%` }} />
                      </div>
                      <p className="text-[10px] mt-1 font-semibold capitalize text-muted-foreground">{riskTone === "rose" ? "High" : riskTone === "amber" ? "Medium" : "Low"} risk profile</p>
                    </div>
                    <div className="rounded-xl border border-border bg-white p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1"><BadgeCheck className="h-3.5 w-3.5" /> KYC Passed</span>
                      <p className="text-lg font-extrabold mt-1">{passed}/{checklist.length}</p>
                      <p className="text-[10px] text-muted-foreground">verification checks cleared</p>
                    </div>
                    <div className="rounded-xl border border-border bg-white p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" /> Receipt</span>
                      <p className={`text-sm font-extrabold mt-1 ${view.receiptVerified ? "text-emerald-700" : "text-amber-700"}`}>{view.receiptVerified ? "Matched" : "Not matched"}</p>
                      <p className="text-[10px] text-muted-foreground">bank statement reconciliation</p>
                    </div>
                  </div>

                  {/* Payment ledger */}
                  <div className="rounded-xl border border-border bg-white overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 bg-muted/30"><Banknote className="h-4 w-4 text-emerald-600" /><h4 className="text-sm font-bold">Payment Ledger</h4></div>
                    <div className="p-4 grid sm:grid-cols-2 gap-3 text-sm">
                      {[
                        { l: "Method", v: view.method },
                        { l: "Payer Bank", v: view.payerBank },
                        { l: "Submitted", v: view.submittedAt },
                        { l: "Plan", v: view.plan },
                      ].map((f) => (
                        <div key={f.l} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{f.l}</span>
                          <span className="font-bold text-right truncate ml-2">{f.v}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 sm:col-span-2">
                        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">UTR / Reference</span>
                        <button onClick={() => copy(view.utr, "UTR")} className="font-mono font-bold inline-flex items-center gap-1.5 hover:text-emerald-700">{view.utr} <Copy className="h-3.5 w-3.5" /></button>
                      </div>
                      <div className="flex items-center justify-between px-3 py-1 sm:col-span-2 border-t border-dashed border-border pt-3">
                        <span className="text-xs text-muted-foreground">Base</span><span className="font-semibold">{inr(view.amount)}</span>
                      </div>
                      <div className="flex items-center justify-between px-3 sm:col-span-2">
                        <span className="text-xs text-muted-foreground">GST (18%)</span><span className="font-semibold">{inr(view.gst)}</span>
                      </div>
                      <div className="flex items-center justify-between px-3 py-2 sm:col-span-2 rounded-lg bg-emerald-50 border border-emerald-200">
                        <span className="text-sm font-bold text-emerald-800">Total Payable</span><span className="font-extrabold text-emerald-800">{inr(total)}</span>
                      </div>
                    </div>
                  </div>

                  {/* KYC checklist + timeline */}
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border bg-white overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 bg-muted/30"><ShieldCheck className="h-4 w-4 text-emerald-600" /><h4 className="text-sm font-bold">KYC Verification</h4></div>
                      <ul className="p-3 space-y-1.5">
                        {checklist.map((c) => (
                          <li key={c.label} className="flex items-center gap-2 text-sm px-2 py-1.5 rounded-lg hover:bg-muted/40">
                            <span className={c.ok ? "text-emerald-600" : "text-rose-500"}>{c.icon}</span>
                            <span className="flex-1">{c.label}</span>
                            {c.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-rose-500" />}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-xl border border-border bg-white overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 bg-muted/30"><Clock className="h-4 w-4 text-emerald-600" /><h4 className="text-sm font-bold">Activity Timeline</h4></div>
                      <ol className="p-4 space-y-3">
                        {timeline.map((s, i) => (
                          <li key={i} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <span className={`h-3 w-3 rounded-full ${s.done ? "bg-emerald-500" : "bg-slate-300"}`} />
                              {i < timeline.length - 1 && <span className="w-px flex-1 bg-border my-0.5" />}
                            </div>
                            <div className="pb-1 -mt-0.5">
                              <p className={`text-sm ${s.done ? "font-semibold" : "text-muted-foreground"}`}>{s.label}</p>
                              <p className="text-[10px] text-muted-foreground">{s.t}</p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </div>

                <DialogFooter className="px-5 py-3 border-t border-border bg-muted/20 flex-row flex-wrap gap-2 sm:justify-between">
                  <Button variant="outline" onClick={() => window.print()} className="h-9"><Printer className="h-4 w-4" /> Print</Button>
                  {view.status === "Pending" ? (
                    <div className="flex gap-2">
                      <Button onClick={() => { setTarget({ row: view, action: "Rejected" }); }} variant="outline" className="h-9 border-rose-200 text-rose-700 hover:bg-rose-50"><XCircle className="h-4 w-4" /> Reject</Button>
                      <Button onClick={() => { setTarget({ row: view, action: "Approved" }); }} className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white"><CheckCircle2 className="h-4 w-4" /> Approve Payment</Button>
                    </div>
                  ) : (
                    <StatusBadge status={view.status === "Approved" ? "Approved" : "Rejected"} />
                  )}
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

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
