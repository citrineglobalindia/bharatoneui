import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, ShieldCheck, AlertTriangle, CheckCircle2, XCircle, PauseCircle, FileText, Image as ImageIcon, Video, Download, Eye, MapPin, Phone, Mail, Calendar, Building2, Landmark, IdCard, Camera, Sparkles, FileSearch,
  User, Users, CreditCard, Smartphone, Globe, Wifi, Hash, Languages, BadgeCheck, Clock, Receipt, MapPinned,
  Play, ScanFace, ShieldAlert, FileCheck2, IndianRupee, Lock, QrCode, KeyRound, Copy, MessageCircle, Send, Loader2, PartyPopper,
} from "lucide-react";
import { QcShell } from "@/components/qc/qc-shell";
import { PageHeader, StatusBadge } from "@/components/retailer/page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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

function Info({ label, value, mono, verified }: { label: string; value: string; mono?: boolean; verified?: boolean }) {
  return (
    <div className="rounded-lg bg-muted/40 p-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-xs font-semibold text-slate-900 break-words inline-flex items-center gap-1 ${mono ? "font-mono" : ""}`}>
        {value}
        {verified !== undefined && (
          verified
            ? <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            : <AlertTriangle className="h-3 w-3 text-amber-600" />
        )}
      </p>
    </div>
  );
}

function Row({ k, v, tone }: { k: string; v: string; tone?: "good" | "bad" }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{k}</span>
      <span className={`font-semibold ${tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-rose-700" : ""}`}>{v}</span>
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
  const [dialog, setDialog] = useState<null | "Approved" | "Rejected" | "On Hold">(null);
  const [holdReason, setHoldReason] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [credentials, setCredentials] = useState<null | {
    userId: string;
    password: string;
    role: "Retailer" | "Distributor" | "Master Distributor";
    emailSent: boolean;
    whatsappSent: boolean;
  }>(null);

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

  const a = applicant;

  const generateUserId = (role: "Retailer" | "Distributor" | "Master Distributor") => {
    const prefix = role === "Retailer" ? "RET" : role === "Distributor" ? "DIS" : "MDS";
    const key = `bo-${prefix.toLowerCase()}-seq`;
    const start = 100;
    const current = Number(localStorage.getItem(key) || start);
    const next = current + 1;
    localStorage.setItem(key, String(next));
    return `${prefix}${String(current).padStart(8, "0")}`;
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let p = "";
    for (let i = 0; i < 10; i++) p += chars[Math.floor(Math.random() * chars.length)];
    return `Bo@${p}`;
  };

  const confirmApprove = async () => {
    setProcessing(true);
    // Simulate async ID generation + dispatch to Email & WhatsApp
    await new Promise((r) => setTimeout(r, 1400));
    const userId = generateUserId(a.channel);
    const password = generatePassword();
    setCredentials({ userId, password, role: a.channel, emailSent: true, whatsappSent: true });
    setDecision("Approved");
    setProcessing(false);
    toast.success("KYC Approved", { description: `${userId} provisioned & credentials dispatched.` });
  };

  const confirmReject = async () => {
    if (rejectReason.trim().length < 5) {
      toast.error("Reason required", { description: "Please specify why this KYC is rejected." });
      return;
    }
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 700));
    setDecision("Rejected");
    setRemark(rejectReason);
    setProcessing(false);
    setDialog(null);
    toast.success("KYC Rejected", { description: `${applicant.id} rejected. Applicant notified.` });
    setTimeout(() => navigate({ to: "/qc/kyc-queue" }), 900);
  };

  const confirmHold = async () => {
    if (holdReason.trim().length < 5) {
      toast.error("Reason required", { description: "Please specify why this KYC is being held." });
      return;
    }
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 700));
    setDecision("On Hold");
    setRemark(holdReason);
    setProcessing(false);
    setDialog(null);
    toast.success("KYC On Hold", { description: `${applicant.id} placed on hold. Applicant informed.` });
    setTimeout(() => navigate({ to: "/qc/kyc-queue" }), 900);
  };

  const copy = (txt: string, label: string) => {
    navigator.clipboard.writeText(txt);
    toast.success(`${label} copied`);
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
                {a.bankDetails && (
                  <>
                    <div className="flex justify-between"><span className="text-muted-foreground">Holder</span><span className="font-semibold">{a.bankDetails.holder}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-semibold">{a.bankDetails.accountType}</span></div>
                    {a.bankDetails.branch && <div className="flex justify-between"><span className="text-muted-foreground">Branch</span><span className="font-semibold">{a.bankDetails.branch}</span></div>}
                    {a.bankDetails.pennyDropAmount && <div className="flex justify-between"><span className="text-muted-foreground">Penny-drop</span><span className="font-mono font-semibold">{a.bankDetails.pennyDropAmount}</span></div>}
                  </>
                )}
                <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                  <CheckCircle2 className="h-3 w-3" /> Penny-drop verified
                </div>
              </div>
            </div>

            {a.deviceMeta && (
              <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
                <h3 className="text-sm font-bold flex items-center gap-1.5 mb-3"><Smartphone className="h-4 w-4 text-slate-600" /> Device & Session</h3>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Device</span><span className="font-semibold">{a.deviceMeta.device}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">OS</span><span className="font-semibold">{a.deviceMeta.os}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">App</span><span className="font-semibold">{a.deviceMeta.appVersion}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground inline-flex items-center gap-1"><Wifi className="h-3 w-3" /> IP</span><span className="font-mono font-semibold">{a.deviceMeta.ip}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Location</span><span className="font-semibold">{a.deviceMeta.location}</span></div>
                </div>
              </div>
            )}
          </div>

          {/* Middle + Right: Documents & decision */}
          <div className="lg:col-span-2 space-y-4">
            {/* Personal details */}
            {a.personal && (
              <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
                <h3 className="text-sm font-bold flex items-center gap-1.5 mb-3"><User className="h-4 w-4 text-indigo-600" /> Personal Details</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <Info label="First Name" value={a.personal.firstName} />
                  <Info label="Middle Name" value={a.personal.middleName || "—"} />
                  <Info label="Surname" value={a.personal.surname} />
                  <Info label="Gender" value={a.personal.gender} />
                  <Info label="Date of Birth" value={a.dob} />
                  <Info label="Father's Name" value={a.personal.fatherName || "—"} />
                  <Info label="Marital Status" value={a.personal.maritalStatus || "—"} />
                  <Info label="Nationality" value={a.personal.nationality || "Indian"} />
                </div>
              </div>
            )}

            {/* Account & contact */}
            {a.account && (
              <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
                <h3 className="text-sm font-bold flex items-center gap-1.5 mb-3"><BadgeCheck className="h-4 w-4 text-emerald-600" /> Account & Contact</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <Info label="Username" value={a.account.username} />
                  <Info label="Email" value={a.email} verified={a.account.emailVerified} />
                  <Info label="Mobile" value={a.phone} verified={a.account.mobileVerified} />
                  <Info label="Referral Code" value={a.account.referralCode || "—"} />
                  <Info label="Registered" value={a.account.registeredOn} />
                  <Info label="Channel" value={a.channel} />
                </div>
              </div>
            )}

            {/* Address */}
            {a.address && (
              <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
                <h3 className="text-sm font-bold flex items-center gap-1.5 mb-3">
                  <MapPinned className="h-4 w-4 text-rose-600" /> Business Address
                  <span className="ml-1 text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">{a.address.type}</span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <Info label="Shop / Business" value={a.address.shopName} />
                  {a.address.type === "Urban" ? (
                    <>
                      <Info label="Building / Shop No" value={a.address.building || "—"} />
                      <Info label="Street / Area" value={a.address.street || "—"} />
                      <Info label="Ward" value={a.address.ward || "—"} />
                      <Info label="Landmark" value={a.address.landmark || "—"} />
                    </>
                  ) : (
                    <>
                      <Info label="Village" value={a.address.village || "—"} />
                      <Info label="Gram Panchayat" value={a.address.gramPanchayat || "—"} />
                      <Info label="Hobli" value={a.address.hobli || "—"} />
                      <Info label="Post Office" value={a.address.postOffice || "—"} />
                    </>
                  )}
                  <Info label="Taluk" value={a.address.taluk || "—"} />
                  <Info label="City" value={a.city} />
                  <Info label="District" value={a.address.district} />
                  <Info label="State" value={a.state} />
                  <Info label="Pincode" value={a.pincode} />
                  {a.address.geo && (
                    <Info label="Geo-tag" value={`${a.address.geo.lat.toFixed(4)}, ${a.address.geo.lng.toFixed(4)}`} />
                  )}
                </div>
              </div>
            )}

            {/* Business entity */}
            {a.entity && (
              <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
                <h3 className="text-sm font-bold flex items-center gap-1.5 mb-3"><Building2 className="h-4 w-4 text-violet-600" /> Business Entity</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <Info label="Legal Name" value={a.entity.name} />
                  <Info label="Entity Type" value={a.entity.type} />
                  <Info label="Incorporation" value={a.entity.dateOfIncorporation || "—"} />
                  <Info label="Organisation PAN" value={a.entity.pan} mono />
                  {a.entity.cin && <Info label="CIN" value={a.entity.cin} mono />}
                  {a.entity.gstin && <Info label="GSTIN" value={a.entity.gstin} mono />}
                  {a.entity.udyam && <Info label="Udyam" value={a.entity.udyam} mono />}
                  {a.entity.fssai && <Info label="FSSAI" value={a.entity.fssai} mono />}
                  {a.entity.website && <Info label="Website" value={a.entity.website} />}
                </div>
              </div>
            )}

            {/* Live Selfie + Video KYC – advanced verification panels */}
            {(a.selfie || a.videoKyc) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {a.selfie && (
                  <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-indigo-50 to-white">
                      <h3 className="text-sm font-bold flex items-center gap-1.5"><ScanFace className="h-4 w-4 text-indigo-600" /> Live Selfie Verification</h3>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="h-3 w-3" /> Captured Live
                      </span>
                    </div>
                    <div className="p-4 space-y-3">
                      <button
                        onClick={() => setPreview("Live Selfie")}
                        className="group relative w-full aspect-[4/3] rounded-lg overflow-hidden bg-gradient-to-br from-indigo-100 via-violet-100 to-indigo-50 border border-border flex items-center justify-center"
                      >
                        <Camera className="h-14 w-14 text-indigo-500/70" />
                        <span className="absolute bottom-2 left-2 text-[10px] font-bold bg-black/70 text-white px-2 py-0.5 rounded">LIVE · {a.selfie.capturedAt.split(" ")[1]}</span>
                        <span className="absolute top-2 right-2 text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded inline-flex items-center gap-1"><Lock className="h-3 w-3" /> Camera only</span>
                        <span className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <span className="rounded-lg bg-white text-foreground px-3 h-8 inline-flex items-center gap-1 text-xs font-bold"><Eye className="h-3.5 w-3.5" /> Open preview</span>
                        </span>
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2">
                          <p className="text-[10px] font-bold uppercase text-emerald-700">Face Match vs Aadhaar</p>
                          <p className="text-lg font-extrabold text-emerald-800">{a.selfie.faceMatchVsAadhaar ?? a.matchScore}%</p>
                        </div>
                        <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-2">
                          <p className="text-[10px] font-bold uppercase text-indigo-700">Liveness Score</p>
                          <p className="text-lg font-extrabold text-indigo-800">{a.selfie.livenessScore ?? a.livenessScore}%</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <Info label="Captured At" value={a.selfie.capturedAt} />
                        <Info label="Device" value={a.selfie.deviceModel} />
                        <Info label="Blur" value={`${a.selfie.blurScore ?? 10} (low)`} />
                        <Info label="Brightness" value={`${a.selfie.brightnessScore ?? 90}%`} />
                        <Info label="Geo Match" value={a.selfie.geoMatch ? "Within 50m" : "Mismatch"} verified={a.selfie.geoMatch} />
                        <Info label="Gallery Upload" value={a.selfie.galleryUploadBlocked ? "Blocked" : "Allowed"} verified={a.selfie.galleryUploadBlocked} />
                        {a.selfie.geoCoords && (
                          <div className="col-span-2">
                            <Info label="GPS Coordinates" value={`${a.selfie.geoCoords.lat.toFixed(4)}, ${a.selfie.geoCoords.lng.toFixed(4)}`} mono />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {a.videoKyc && (
                  <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-violet-50 to-white">
                      <h3 className="text-sm font-bold flex items-center gap-1.5"><Video className="h-4 w-4 text-violet-600" /> Video KYC — Self Declaration</h3>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">
                        <Clock className="h-3 w-3" /> {a.videoKyc.durationSec}s recorded
                      </span>
                    </div>
                    <div className="p-4 space-y-3">
                      <button
                        onClick={() => setPreview("Video KYC Recording")}
                        className="group relative w-full aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-violet-200 via-violet-100 to-indigo-100 border border-border flex items-center justify-center"
                      >
                        <div className="h-14 w-14 rounded-full bg-white/90 flex items-center justify-center shadow">
                          <Play className="h-6 w-6 text-violet-700 fill-violet-700 ml-1" />
                        </div>
                        <span className="absolute bottom-2 left-2 text-[10px] font-bold bg-black/70 text-white px-2 py-0.5 rounded">REC · {a.videoKyc.completedAt.split(" ")[1]} · {a.videoKyc.videoSizeMB ?? 4}MB</span>
                        <span className="absolute top-2 right-2 text-[10px] font-bold bg-rose-500 text-white px-2 py-0.5 rounded inline-flex items-center gap-1">● LIVE REC</span>
                      </button>
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5">
                        <p className="text-[10px] font-bold uppercase text-amber-800 flex items-center gap-1"><FileCheck2 className="h-3 w-3" /> Declaration Read on Camera</p>
                        <p className="text-[11px] text-amber-900 mt-1 leading-relaxed line-clamp-2">
                          "I, {a.name}, hereby declare that all information provided during registration is true. I am voluntarily registering as a BharatOne {a.channel}. I consent to this video being recorded and used for KYC verification."
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <Info label="Agent" value={a.videoKyc.agent} />
                        <Info label="Language" value={a.videoKyc.languageSpoken} />
                        <Info label="Random Code" value={a.videoKyc.randomCode ?? "BO-0000"} mono verified={a.videoKyc.randomCodeMatch} />
                        <Info label="ID Shown" value={a.videoKyc.idShownOnCamera ?? "Aadhaar"} verified />
                        <Info label="Declaration" value={a.videoKyc.declarationAccepted ? "Read & Accepted" : "Skipped"} verified={a.videoKyc.declarationAccepted} />
                        <Info label="Liveness" value={a.videoKyc.livenessPassed ? "Passed" : "Failed"} verified={a.videoKyc.livenessPassed} />
                        <Info label="Face vs Aadhaar" value={`${a.videoKyc.faceMatchVsAadhaar ?? 95}%`} verified={(a.videoKyc.faceMatchVsAadhaar ?? 95) > 80} />
                        <Info label="Geo Match" value={a.videoKyc.geoMatch ? "Within range" : "Mismatch"} verified={a.videoKyc.geoMatch} />
                        {a.videoKyc.geoCoords && (
                          <div className="col-span-2">
                            <Info label="GPS Coordinates" value={`${a.videoKyc.geoCoords.lat.toFixed(4)}, ${a.videoKyc.geoCoords.lng.toFixed(4)}`} mono />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* KYC Verification Charges — receipt */}
            {a.payment && (() => {
              const items = a.charges?.items ?? [
                { label: "KYC Verification Charges", amount: 1499, gstPct: 18 },
                { label: "Onboarding & Platform Fee", amount: 2000, gstPct: 18 },
                { label: "Video KYC Agent Charges", amount: 500, gstPct: 18 },
              ];
              const subtotal = items.reduce((s, i) => s + i.amount, 0);
              const gst = items.reduce((s, i) => s + (i.amount * (i.gstPct ?? 0)) / 100, 0);
              const total = subtotal + gst;
              const inr = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
              return (
                <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
                  <div className="relative">
                    <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-amber-500 via-emerald-500 to-emerald-600" />
                    <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4 pb-3 border-b border-border bg-gradient-to-r from-amber-50/60 to-emerald-50/40">
                      <div>
                        <h3 className="text-sm font-bold flex items-center gap-1.5"><IndianRupee className="h-4 w-4 text-emerald-700" /> KYC Verification Charges</h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Receipt <span className="font-mono font-bold text-foreground">#{a.charges?.receiptId ?? a.payment.utr}</span> · {a.charges?.plan ?? "Onboarding"}</p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-full">
                        <CheckCircle2 className="h-3.5 w-3.5" /> PAID · {inr(total)}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
                    <div>
                      <div className="rounded-lg border border-border overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="bg-muted/60 text-[10px] uppercase tracking-wider text-muted-foreground">
                            <tr>
                              <th className="text-left px-3 py-2 font-bold">Item</th>
                              <th className="text-right px-3 py-2 font-bold">Amount</th>
                              <th className="text-right px-3 py-2 font-bold">GST</th>
                              <th className="text-right px-3 py-2 font-bold">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {items.map((i) => {
                              const g = (i.amount * (i.gstPct ?? 0)) / 100;
                              return (
                                <tr key={i.label}>
                                  <td className="px-3 py-2 font-semibold">{i.label}</td>
                                  <td className="px-3 py-2 text-right font-mono">{inr(i.amount)}</td>
                                  <td className="px-3 py-2 text-right font-mono text-muted-foreground">{i.gstPct ?? 0}% · {inr(g)}</td>
                                  <td className="px-3 py-2 text-right font-mono font-bold">{inr(i.amount + g)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot className="bg-emerald-50/60">
                            <tr>
                              <td colSpan={3} className="px-3 py-2 text-right text-xs font-bold text-muted-foreground">Subtotal</td>
                              <td className="px-3 py-2 text-right font-mono font-bold">{inr(subtotal)}</td>
                            </tr>
                            <tr>
                              <td colSpan={3} className="px-3 py-2 text-right text-xs font-bold text-muted-foreground">GST</td>
                              <td className="px-3 py-2 text-right font-mono font-bold">{inr(gst)}</td>
                            </tr>
                            <tr className="border-t border-emerald-200">
                              <td colSpan={3} className="px-3 py-2.5 text-right text-sm font-extrabold">Amount Paid</td>
                              <td className="px-3 py-2.5 text-right font-mono text-base font-extrabold text-emerald-700">{inr(total)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                      <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                        <Info label="Payment Method" value={a.payment.method} />
                        <Info label="Paid At" value={a.charges?.paidAt ?? a.payment.date} />
                        <Info label="UTR / Txn ID" value={a.payment.utr} mono verified={a.payment.receiptVerified} />
                        <Info label="Payer Name" value={a.payment.payerName} />
                        <Info label="Payer Bank" value={a.payment.payerBank || "—"} />
                        <Info label="Payer UPI / A/C" value={a.payment.payerAccount || "—"} mono />
                        <Info label="Receipt" value={a.payment.receiptVerified ? "Verified" : "Pending"} verified={a.payment.receiptVerified} />
                        <Info label="Plan" value={a.charges?.plan ?? "Onboarding"} />
                        <Info label="Remarks" value={a.payment.remarks || "—"} />
                      </div>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 p-4 lg:w-44">
                      <div className="h-28 w-28 rounded-lg bg-white border border-border flex items-center justify-center">
                        <QrCode className="h-20 w-20 text-foreground" />
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Scan to verify</p>
                      <Button variant="outline" size="sm" className="w-full">
                        <Download className="h-3.5 w-3.5" /> Receipt PDF
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Consents */}
            {a.consents && a.consents.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
                <h3 className="text-sm font-bold flex items-center gap-1.5 mb-3"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Consents & Authorisations</h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {a.consents.map((c) => (
                    <li key={c.label} className="flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs">
                      <span className="font-semibold text-emerald-900 inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> {c.label}</span>
                      <span className="text-emerald-700 text-[10px] font-mono">{c.acceptedAt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

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
                  onClick={() => { setHoldReason(remark); setDialog("On Hold"); }}
                  disabled={!!decision}
                  className="border-amber-300 text-amber-800 hover:bg-amber-50"
                >
                  <PauseCircle className="h-4 w-4" /> Put On Hold
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setRejectReason(remark); setDialog("Rejected"); }}
                  disabled={!!decision}
                  className="border-rose-300 text-rose-700 hover:bg-rose-50"
                >
                  <XCircle className="h-4 w-4" /> Reject
                </Button>
                <Button
                  onClick={() => setDialog("Approved")}
                  disabled={!!decision}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
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

        {/* ===== Approve KYC dialog ===== */}
        <Dialog open={dialog === "Approved"} onOpenChange={(o) => { if (!o && !processing) { setDialog(null); if (credentials) setTimeout(() => navigate({ to: "/qc/kyc-queue" }), 200); } }}>
          <DialogContent className="max-w-lg overflow-hidden p-0">
            {!credentials ? (
              <div>
                <div className="relative bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 p-6 text-white">
                  <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
                  <div className="relative flex items-start gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-white/15 ring-1 ring-white/30 flex items-center justify-center backdrop-blur">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <DialogTitle className="text-white text-xl font-extrabold">Approve KYC</DialogTitle>
                      <DialogDescription className="text-white/85 mt-1">
                        You're about to approve <span className="font-bold">{a.name}</span> as a verified <span className="font-bold">{a.channel}</span>.
                      </DialogDescription>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs space-y-2">
                    <p className="font-bold text-emerald-900 flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> The following will happen automatically</p>
                    <ul className="space-y-1 text-emerald-900/90">
                      <li className="flex items-center gap-2"><KeyRound className="h-3.5 w-3.5" /> Unique {a.channel} ID + secure password generated</li>
                      <li className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> Welcome email sent to <span className="font-semibold">{a.email}</span></li>
                      <li className="flex items-center gap-2"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp credentials sent to <span className="font-semibold">{a.phone}</span></li>
                      <li className="flex items-center gap-2"><BadgeCheck className="h-3.5 w-3.5" /> Account activated for BharatOne services</li>
                    </ul>
                  </div>
                  <DialogFooter className="gap-2 sm:gap-2">
                    <Button variant="outline" disabled={processing} onClick={() => setDialog(null)}>Cancel</Button>
                    <Button disabled={processing} onClick={confirmApprove} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      {processing ? (<><Loader2 className="h-4 w-4 animate-spin" /> Provisioning…</>) : (<><CheckCircle2 className="h-4 w-4" /> Confirm & Approve</>)}
                    </Button>
                  </DialogFooter>
                </div>
              </div>
            ) : (
              <div>
                <div className="relative bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 p-6 text-white text-center">
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,white,transparent_60%)]" />
                  <div className="relative">
                    <div className="mx-auto h-16 w-16 rounded-full bg-white/15 ring-4 ring-white/30 flex items-center justify-center backdrop-blur animate-in zoom-in-50 duration-500">
                      <PartyPopper className="h-8 w-8" />
                    </div>
                    <DialogTitle className="text-white text-2xl font-extrabold mt-3">Successfully Approved!</DialogTitle>
                    <DialogDescription className="text-white/90 mt-1">
                      {credentials.role} account provisioned for <span className="font-bold">{a.name}</span>
                    </DialogDescription>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="rounded-xl border-2 border-dashed border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50 p-4 space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1"><Lock className="h-3 w-3" /> Generated Login Credentials</p>

                    <div className="rounded-lg bg-white border border-emerald-200 p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{credentials.role} ID</p>
                        <p className="font-mono font-extrabold text-emerald-700 text-lg truncate">{credentials.userId}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => copy(credentials.userId, "ID")}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="rounded-lg bg-white border border-emerald-200 p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Temporary Password</p>
                        <p className="font-mono font-extrabold text-slate-900 text-lg truncate">{credentials.password}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => copy(credentials.password, "Password")}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <p className="text-[10px] text-emerald-900/70 flex items-start gap-1"><AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" /> Applicant will be prompted to reset this password on first login.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5">
                      <div className="flex items-center gap-1.5 text-emerald-800">
                        <Mail className="h-3.5 w-3.5" />
                        <p className="text-[11px] font-bold">Email Sent</p>
                        <CheckCircle2 className="h-3 w-3 ml-auto" />
                      </div>
                      <p className="text-[10px] text-emerald-900/70 truncate mt-0.5">{a.email}</p>
                    </div>
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5">
                      <div className="flex items-center gap-1.5 text-emerald-800">
                        <MessageCircle className="h-3.5 w-3.5" />
                        <p className="text-[11px] font-bold">WhatsApp Sent</p>
                        <CheckCircle2 className="h-3 w-3 ml-auto" />
                      </div>
                      <p className="text-[10px] text-emerald-900/70 truncate mt-0.5">{a.phone}</p>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button onClick={() => { setDialog(null); navigate({ to: "/qc/kyc-queue" }); }} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                      <Send className="h-4 w-4" /> Done · Back to Queue
                    </Button>
                  </DialogFooter>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ===== Reject KYC dialog ===== */}
        <Dialog open={dialog === "Rejected"} onOpenChange={(o) => !processing && setDialog(o ? "Rejected" : null)}>
          <DialogContent className="max-w-lg overflow-hidden p-0">
            <div className="relative bg-gradient-to-br from-rose-500 via-rose-600 to-red-600 p-6 text-white">
              <div className="relative flex items-start gap-3">
                <div className="h-12 w-12 rounded-2xl bg-white/15 ring-1 ring-white/30 flex items-center justify-center backdrop-blur">
                  <XCircle className="h-6 w-6" />
                </div>
                <div>
                  <DialogTitle className="text-white text-xl font-extrabold">Reject KYC</DialogTitle>
                  <DialogDescription className="text-white/85 mt-1">
                    Applicant <span className="font-bold">{a.name}</span> will be notified. They may re-apply after addressing the issues.
                  </DialogDescription>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-3">
              <label className="text-xs font-bold text-slate-700">Reason for rejection <span className="text-rose-600">*</span></label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                placeholder="e.g. Aadhaar photo mismatch with selfie, address proof unreadable…"
                className="w-full rounded-lg border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-500/15 focus-visible:border-rose-500"
              />
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-[11px] text-rose-900 flex gap-2">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                Reason will be shared with the applicant via Email & WhatsApp.
              </div>
              <DialogFooter className="gap-2 sm:gap-2">
                <Button variant="outline" disabled={processing} onClick={() => setDialog(null)}>Cancel</Button>
                <Button disabled={processing} onClick={confirmReject} className="bg-rose-600 hover:bg-rose-700 text-white">
                  {processing ? (<><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>) : (<><XCircle className="h-4 w-4" /> Confirm Reject</>)}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* ===== Hold KYC dialog ===== */}
        <Dialog open={dialog === "On Hold"} onOpenChange={(o) => !processing && setDialog(o ? "On Hold" : null)}>
          <DialogContent className="max-w-lg overflow-hidden p-0">
            <div className="relative bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 p-6 text-white">
              <div className="relative flex items-start gap-3">
                <div className="h-12 w-12 rounded-2xl bg-white/15 ring-1 ring-white/30 flex items-center justify-center backdrop-blur">
                  <PauseCircle className="h-6 w-6" />
                </div>
                <div>
                  <DialogTitle className="text-white text-xl font-extrabold">Put KYC On Hold</DialogTitle>
                  <DialogDescription className="text-white/85 mt-1">
                    Pause review for <span className="font-bold">{a.name}</span> pending additional clarification.
                  </DialogDescription>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-3">
              <label className="text-xs font-bold text-slate-700">Reason / Information needed <span className="text-amber-600">*</span></label>
              <textarea
                value={holdReason}
                onChange={(e) => setHoldReason(e.target.value)}
                rows={4}
                placeholder="e.g. Awaiting clearer shop photo, pending bank account confirmation…"
                className="w-full rounded-lg border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-500/15 focus-visible:border-amber-500"
              />
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-[11px] text-amber-900 flex gap-2">
                <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                Applicant will receive a notification via Email & WhatsApp explaining what's required.
              </div>
              <DialogFooter className="gap-2 sm:gap-2">
                <Button variant="outline" disabled={processing} onClick={() => setDialog(null)}>Cancel</Button>
                <Button disabled={processing} onClick={confirmHold} className="bg-amber-600 hover:bg-amber-700 text-white">
                  {processing ? (<><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>) : (<><PauseCircle className="h-4 w-4" /> Confirm Hold</>)}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </QcShell>
  );
}