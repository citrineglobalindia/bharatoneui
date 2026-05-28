import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, ShieldCheck, AlertTriangle, CheckCircle2, XCircle, PauseCircle, FileText, Image as ImageIcon, Video, Download, Eye, MapPin, Phone, Mail, Calendar, Building2, Landmark, IdCard, Camera, Sparkles, FileSearch,
} from "lucide-react";
import { QcShell } from "@/components/qc/qc-shell";
import { PageHeader, StatusBadge } from "@/components/retailer/page-header";
import { Button } from "@/components/ui/button";
import { getApplicant } from "@/components/qc/mock-data";

export const Route = createFileRoute("/qc/kyc-review/$id")({
  head: () => ({
    meta: [{ title: "KYC Review — QC Portal" }],
  }),
  component: KycReviewPage,
});

function ScoreBar({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  const tone = value > 90 ? "emerald" : value > 75 ? "amber" : "rose";
  const fill = tone === "emerald" ? "bg-emerald-500" : tone === "amber" ? "bg-amber-500" : "bg-rose-500";
  const text = tone === "emerald" ? "text-emerald-700" : tone === "amber" ? "text-amber-700" : "text-rose-700";
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-semibold text-muted-foreground inline-flex items-center gap-1.5">{icon} {label}</span>
        <span className={`text-sm font-bold ${text}`}>{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${fill} transition-all`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function DocTile({ label, type, size, verified, onView }: { label: string; type: string; size: string; verified: boolean; onView: () => void }) {
  const isVideo = type.startsWith("video");
  const isPdf = type.includes("pdf");
  const Icon = isVideo ? Video : isPdf ? FileText : ImageIcon;
  return (
    <div className="group relative rounded-xl border border-border bg-card overflow-hidden hover:shadow-elev transition-all">
      <div className={`aspect-[4/3] flex items-center justify-center bg-gradient-to-br ${isVideo ? "from-violet-100 to-violet-50" : isPdf ? "from-rose-100 to-rose-50" : "from-indigo-100 to-indigo-50"}`}>
        <Icon className={`h-12 w-12 ${isVideo ? "text-violet-600" : isPdf ? "text-rose-600" : "text-indigo-600"}`} />
        <div className="absolute top-2 right-2 flex gap-1">
          {verified ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded-full">
              <CheckCircle2 className="h-3 w-3" /> Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded-full">
              <AlertTriangle className="h-3 w-3" /> Check
            </span>
          )}
        </div>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
          <button onClick={onView} className="rounded-lg bg-white text-foreground px-3 h-8 text-xs font-bold inline-flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" /> View
          </button>
          <button className="rounded-lg bg-white text-foreground px-3 h-8 text-xs font-bold inline-flex items-center gap-1">
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="p-2.5">
        <p className="text-xs font-bold truncate">{label}</p>
        <p className="text-[10px] text-muted-foreground">{size} · {type.split("/")[1]?.toUpperCase()}</p>
      </div>
    </div>
  );
}

function KycReviewPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const applicant = getApplicant(id);
  const [decision, setDecision] = useState<"Approved" | "Rejected" | "On Hold" | null>(
    applicant && (applicant.status === "Approved" || applicant.status === "Rejected" || applicant.status === "On Hold")
      ? applicant.status
      : null
  );
  const [remark, setRemark] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  if (!applicant) {
    return (
      <QcShell>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Applicant not found.</p>
          <Link to="/qc/kyc-queue" className="text-indigo-700 font-bold mt-3 inline-block">← Back to queue</Link>
        </div>
      </QcShell>
    );
  }

  const submit = (status: "Approved" | "Rejected" | "On Hold") => {
    if (status !== "Approved" && remark.trim().length < 5) {
      toast.error("Please add a remark", { description: "Reason required for rejection or hold." });
      return;
    }
    setDecision(status);
    toast.success(`KYC ${status}`, { description: `${applicant.id} marked as ${status}.` });
    setTimeout(() => navigate({ to: "/qc/kyc-queue" }), 900);
  };

  return (
    <QcShell>
      <div className="space-y-5">
        <Link to="/qc/kyc-queue" className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to queue
        </Link>

        <PageHeader
          icon={<FileSearch className="h-5 w-5" />}
          title={applicant.name}
          subtitle={`KYC ID ${applicant.id} · Submitted ${applicant.submittedAt}`}
          badge={
            <div className="flex gap-1.5">
              <StatusBadge status={applicant.status === "Pending Review" ? "pending" : applicant.status} />
              <StatusBadge status={applicant.risk} />
            </div>
          }
        />

        {/* Decision banner */}
        {decision && (
          <div className={`rounded-xl border p-3 flex items-center gap-2 ${decision === "Approved" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : decision === "Rejected" ? "bg-rose-50 border-rose-200 text-rose-800" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
            <ShieldCheck className="h-4 w-4" />
            <span className="text-sm font-bold">Decision recorded: {decision}</span>
          </div>
        )}

        {/* Flags */}
        {applicant.flags.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5 mb-1.5"><AlertTriangle className="h-4 w-4" /> System Flags ({applicant.flags.length})</p>
            <ul className="text-xs text-amber-900 list-disc pl-5 space-y-0.5">
              {applicant.flags.map((f) => <li key={f}>{f}</li>)}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Applicant + AI scores */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl font-extrabold">
                  {applicant.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="font-display text-lg font-extrabold truncate">{applicant.name}</p>
                  <p className="text-xs text-muted-foreground">{applicant.channel} applicant</p>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> {applicant.phone}</div>
                <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" /> {applicant.email}</div>
                <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-muted-foreground" /> DOB {applicant.dob}</div>
                <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /> {applicant.city}, {applicant.state} - {applicant.pincode}</div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-muted/50 p-2"><p className="text-muted-foreground text-[10px]">AADHAAR</p><p className="font-mono font-bold">{applicant.aadhaar}</p></div>
                <div className="rounded-lg bg-muted/50 p-2"><p className="text-muted-foreground text-[10px]">PAN</p><p className="font-mono font-bold">{applicant.pan}</p></div>
                {applicant.gst && <div className="col-span-2 rounded-lg bg-muted/50 p-2"><p className="text-muted-foreground text-[10px]">GST</p><p className="font-mono font-bold">{applicant.gst}</p></div>}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
              <h3 className="text-sm font-bold flex items-center gap-1.5 mb-3"><Sparkles className="h-4 w-4 text-indigo-600" /> AI Verification Scores</h3>
              <div className="space-y-3">
                <ScoreBar label="Face Match" value={applicant.matchScore} icon={<Camera className="h-3 w-3" />} />
                <ScoreBar label="Liveness Detection" value={applicant.livenessScore} icon={<Eye className="h-3 w-3" />} />
                <ScoreBar label="Document OCR" value={92} icon={<FileText className="h-3 w-3" />} />
                <ScoreBar label="Address Match" value={applicant.flags.some((f) => f.toLowerCase().includes("address")) ? 58 : 88} icon={<MapPin className="h-3 w-3" />} />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
              <h3 className="text-sm font-bold flex items-center gap-1.5 mb-3"><Landmark className="h-4 w-4 text-emerald-600" /> Bank Account</h3>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Bank</span><span className="font-semibold">{applicant.bank.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">IFSC</span><span className="font-mono font-semibold">{applicant.bank.ifsc}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Account</span><span className="font-mono font-semibold">{applicant.bank.account}</span></div>
                <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                  <CheckCircle2 className="h-3 w-3" /> Penny-drop verified
                </div>
              </div>
            </div>
          </div>

          {/* Middle + Right: Documents & decision */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold flex items-center gap-1.5"><IdCard className="h-4 w-4 text-indigo-600" /> Submitted Documents ({applicant.documents.length})</h3>
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {applicant.documents.filter((d) => d.verified).length} verified · {applicant.documents.filter((d) => !d.verified).length} needs review
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {applicant.documents.map((d) => (
                  <DocTile key={d.label} {...d} onView={() => setPreview(d.label)} />
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
              <h3 className="text-sm font-bold flex items-center gap-1.5 mb-3"><Building2 className="h-4 w-4 text-violet-600" /> Audit Trail</h3>
              <ol className="relative border-l-2 border-indigo-200 pl-4 space-y-3">
                <li>
                  <span className="absolute -left-[7px] mt-1 h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
                  <p className="text-xs font-bold">Application submitted</p>
                  <p className="text-[11px] text-muted-foreground">{applicant.submittedAt} · via {applicant.channel} app</p>
                </li>
                <li>
                  <span className="absolute -left-[7px] mt-1 h-3 w-3 rounded-full bg-indigo-500 ring-4 ring-indigo-100" />
                  <p className="text-xs font-bold">Automated checks completed</p>
                  <p className="text-[11px] text-muted-foreground">OCR, face match, liveness · 4m 12s</p>
                </li>
                <li>
                  <span className="absolute -left-[7px] mt-1 h-3 w-3 rounded-full bg-amber-500 ring-4 ring-amber-100" />
                  <p className="text-xs font-bold">Awaiting QC reviewer decision</p>
                  <p className="text-[11px] text-muted-foreground">Assigned to {applicant.assignedTo ?? "Unassigned"}</p>
                </li>
              </ol>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
              <h3 className="text-sm font-bold mb-2">Reviewer Decision</h3>
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                rows={3}
                placeholder="Add remarks (required for Reject or Hold)…"
                className="w-full rounded-lg border border-input bg-background p-3 text-sm shadow-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/15 focus-visible:border-indigo-500"
              />
              <div className="mt-3 flex flex-wrap gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => submit("On Hold")}
                  className="border-amber-300 text-amber-800 hover:bg-amber-50"
                >
                  <PauseCircle className="h-4 w-4" /> Put On Hold
                </Button>
                <Button
                  variant="outline"
                  onClick={() => submit("Rejected")}
                  className="border-rose-300 text-rose-700 hover:bg-rose-50"
                >
                  <XCircle className="h-4 w-4" /> Reject
                </Button>
                <Button onClick={() => submit("Approved")} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <CheckCircle2 className="h-4 w-4" /> Approve KYC
                </Button>
              </div>
            </div>
          </div>
        </div>

        {preview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => setPreview(null)}>
            <div className="bg-card rounded-xl p-4 max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold">{preview}</h3>
                <button onClick={() => setPreview(null)} className="text-muted-foreground hover:text-foreground"><XCircle className="h-5 w-5" /></button>
              </div>
              <div className="aspect-video rounded-lg bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-muted-foreground text-sm">
                Secure document preview (demo)
              </div>
            </div>
          </div>
        )}
      </div>
    </QcShell>
  );
}