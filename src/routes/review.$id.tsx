import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, User, Building2, Landmark, FileText, Banknote, ShieldCheck, MapPin,
  CheckCircle2, XCircle, Maximize2, ExternalLink, X, Loader2, Phone, Mail, Copy, RefreshCw,
} from "lucide-react";
import { BharatOneLogo } from "@/components/bharatone-logo";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { NotificationsBell } from "@/components/retailer/notifications-bell";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/review/$id")({
  head: () => ({ meta: [{ title: "Application Review — BharatOne" }] }),
  component: ReviewPage,
});

function fileKind(path?: string | null): "image" | "video" | "pdf" | "other" {
  if (!path) return "other";
  const ext = path.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return "image";
  if (["webm", "mp4", "mov", "ogg", "m4v"].includes(ext)) return "video";
  if (ext === "pdf") return "pdf";
  return "other";
}
function typeLabel(t?: string) { return t === "old" ? "OLD (JSKO Migration)" : t === "distributor" ? "Distributor" : "Retailer"; }
function statusPill(s: string) {
  const m: Record<string, string> = {
    accountant_review: "bg-amber-100 text-amber-700", qc_review: "bg-indigo-100 text-indigo-700",
    telecaller: "bg-orange-100 text-orange-700", approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-rose-100 text-rose-700",
  };
  return m[s] ?? "bg-slate-100 text-slate-700";
}
function docPill(s?: string) {
  if (s === "approved") return "bg-emerald-100 text-emerald-700";
  if (s === "rejected") return "bg-rose-100 text-rose-700";
  return "bg-amber-100 text-amber-700";
}

function Field({ label, value }: { label: string; value: unknown }) {
  const v = value === null || value === undefined || value === "" ? "—" : String(value);
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 break-words font-semibold text-foreground">{v}</p>
    </div>
  );
}
function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <p className="mb-4 flex items-center gap-2 text-sm font-bold text-foreground">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-india-green/10 text-india-green">{icon}</span>
        {title}
      </p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3">{children}</div>
    </div>
  );
}

const TABS = ["Personal", "Business", "Bank", "KYC Docs", "Payment", "Verification"] as const;

function ReviewPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const [reg, setReg] = useState<any | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [docReviews, setDocReviews] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]>("KYC Docs");
  const [selDoc, setSelDoc] = useState<string | null>(null);
  const [qcAction, setQcAction] = useState("");
  const [remarks, setRemarks] = useState("");
  const [reqOpen, setReqOpen] = useState(false);
  const [reqMsg, setReqMsg] = useState("Not approved");
  const REQ_DOCS = ["PAN", "KYC Front", "KYC Back", "Shop Front Image", "Education Certificate", "Cancelled Cheque / Passbook", "Police Verification Certificate (Optional)"];
  const [reqSel, setReqSel] = useState<Record<string, boolean>>({ PAN: true, "KYC Front": true, "KYC Back": true });
  const [busy, setBusy] = useState(false);
  const [lightbox, setLightbox] = useState<{ url: string; kind: string; label: string } | null>(null);
  const [creds, setCreds] = useState<{ username: string; email: string; password: string } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("retailer_registrations").select("*").eq("id", id).maybeSingle();
      if (error || !data) { toast.error("Could not load application"); setReg(null); return; }
      setReg(data);
      setDocReviews(data.doc_reviews || {});
      const cols: Record<string, string | null> = {
        selfie: data.selfie_path, shop: data.shop_photo_path, aadhaar: data.aadhaar_doc_path,
        pan: data.pan_doc_path, police: data.police_verification_path, video: data.video_kyc_path,
        payment: data.payment_screenshot_path,
      };
      const u: Record<string, string> = {};
      for (const [k, p] of Object.entries(cols)) {
        if (p) { const { data: su } = await supabase.storage.from("retailer-kyc").createSignedUrl(p, 3600); if (su?.signedUrl) u[k] = su.signedUrl; }
      }
      setUrls(u);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); ensureStaffSession().then((ok) => { if (ok) load(); }); /* eslint-disable-next-line */ }, [id]);

  const backTo = role === "qc" ? "/qc/kyc-queue" : role === "accountant" ? "/accountant/registrations"
    : role === "telecaller" ? "/telecaller/registrations" : "/admin/registrations";

  const setDoc = async (key: string, status: "approved" | "rejected") => {
    const { data, error } = await supabase.rpc("set_document_status", { reg_id: id, doc_key: key, status, notes: null });
    if (error) { toast.error("Failed", { description: error.message }); return; }
    setDocReviews((data as Record<string, any>) || {});
    toast.success(`Document ${status}`);
  };

  const submitQc = async () => {
    if (!qcAction) { toast.error("Select a QC action"); return; }
    if (qcAction === "approve_payment") { await act(() => supabase.rpc("verify_retailer_payment", { reg_id: id, received: true, notes: remarks || null }), "Approved — forwarded to QC"); return; }
    if (qcAction === "reject_payment") { await act(() => supabase.rpc("verify_retailer_payment", { reg_id: id, received: false, notes: remarks || "Payment not received" }), "Sent to Telecaller"); return; }
    if (qcAction === "approve_kyc") {
      const data = await act(() => supabase.rpc("verify_retailer_qc", { reg_id: id, verified: true, notes: remarks || null }), "Approved — retailer login created", false);
      if (data) setCreds(data as { username: string; email: string; password: string });
      return;
    }
    if (qcAction === "reject_kyc") { await act(() => supabase.rpc("verify_retailer_qc", { reg_id: id, verified: false, notes: remarks || "Rejected by QC" }), "Sent to Telecaller"); return; }
    if (qcAction === "request_docs") { setReqOpen(true); return; }
  };
  const submitRequestDocs = async () => {
    const docs = REQ_DOCS.filter((d) => reqSel[d]);
    if (docs.length === 0) { toast.error("Select at least one required document"); return; }
    const note = `${reqMsg}. Required documents: ${docs.join(", ")}`;
    await act(() => supabase.rpc("verify_retailer_qc", { reg_id: id, verified: false, notes: note }), "Documents requested — sent to Telecaller");
    setReqOpen(false);
  };

  const act = async (fn: () => Promise<{ error: any; data?: unknown }>, msg: string, goBack = true) => {
    setBusy(true);
    try {
      const { error, data } = await fn();
      if (error) { toast.error("Action failed", { description: error.message }); return null; }
      toast.success(msg);
      if (goBack) navigate({ to: backTo }); else await load();
      return data;
    } finally { setBusy(false); }
  };

  if (loading || !reg) {
    return <div className="grid min-h-screen place-items-center bg-tricolor"><Loader2 className="h-6 w-6 animate-spin text-india-green" /></div>;
  }

  const canAccountant = role === "accountant" || role === "admin";
  const canQc = role === "qc" || role === "admin";
  const canTele = role === "telecaller" || role === "admin";
  const canDocReview = canAccountant || canQc;
  const fullName = [reg.first_name, reg.middle_name, reg.surname].filter(Boolean).join(" ");

  const DOCS: { key: string; label: string; path: string | null }[] = [
    { key: "selfie", label: "Selfie", path: reg.selfie_path },
    { key: "shop", label: "Shop Photo", path: reg.shop_photo_path },
    { key: "aadhaar", label: "Aadhaar", path: reg.aadhaar_doc_path },
    { key: "pan", label: "PAN Card", path: reg.pan_doc_path },
    { key: "police", label: "Police Verification", path: reg.police_verification_path },
    { key: "video", label: "Video KYC", path: reg.video_kyc_path },
    { key: "payment", label: "Payment Receipt", path: reg.payment_screenshot_path },
  ];
  const gps = reg.video_kyc_lat && reg.video_kyc_lng ? `${reg.video_kyc_lat}, ${reg.video_kyc_lng}`
    : reg.latitude && reg.longitude ? `${reg.latitude}, ${reg.longitude}` : null;
  const mapUrl = gps ? `https://www.google.com/maps?q=${encodeURIComponent(gps)}` : null;

  return (
    <div className="min-h-screen bg-tricolor pb-28">
      <header className="sticky top-0 z-30 border-b border-border bg-card/85 backdrop-blur-md">
        <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-center px-4">
          <Link to={backTo} aria-label="Back" className="absolute left-4 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold hover:bg-muted">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <BharatOneLogo size="lg" />
          <div className="absolute right-4"><NotificationsBell /></div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6">
        {/* Profile header */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex flex-wrap items-start gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-saffron-gradient text-2xl font-extrabold text-white shadow-elev">
              {(reg.first_name?.[0] ?? "") + (reg.surname?.[0] ?? "")}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-extrabold leading-tight">{fullName}</h1>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${statusPill(reg.status)}`}>{reg.status.replace("_", " ")}</span>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">🟢 {typeLabel(reg.registration_type)}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {reg.mobile}</span>
                <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {reg.email}</span>
                <span className="inline-flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> {reg.shop_name}</span>
                <span className="font-mono font-semibold text-saffron">#{reg.application_id}</span>
                {reg.username && <span className="font-mono font-semibold text-india-green">#{reg.username}</span>}
              </div>
            </div>
            <div className="text-right">
              <p className="font-display text-2xl font-extrabold">{reg.payment_amount ? `₹${Number(reg.payment_amount).toLocaleString("en-IN")}` : "—"}</p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Registration Fee</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-lg px-4 h-9 text-sm font-semibold transition ${tab === t ? "bg-india-green text-white" : "bg-card border border-border text-foreground hover:bg-muted"}`}>{t}</button>
          ))}
        </div>

        {tab === "Personal" && (
          <Card icon={<User className="h-4 w-4" />} title="Personal Information">
            <Field label="Full Name" value={fullName} />
            <Field label="First Name" value={reg.first_name} />
            <Field label="Middle Name" value={reg.middle_name} />
            <Field label="Surname" value={reg.surname} />
            <Field label="Date of Birth" value={reg.dob} />
            <Field label="Mobile" value={reg.mobile} />
            <Field label="Email" value={reg.email} />
            <Field label="Retailer Type" value={typeLabel(reg.registration_type)} />
            <Field label="Agent ID" value={reg.username} />
          </Card>
        )}

        {tab === "Business" && (
          <Card icon={<Building2 className="h-4 w-4" />} title="Business Information">
            <Field label="Shop Name" value={reg.shop_name} />
            <Field label="Address Type" value={reg.address_type} />
            <Field label="Building / Shop No" value={reg.building_shop_no} />
            <Field label="Street / Area" value={reg.street_area} />
            <Field label="Ward Number" value={reg.ward_number} />
            <Field label="Landmark" value={reg.landmark} />
            <Field label="Village" value={reg.village_name} />
            <Field label="Gram Panchayat" value={reg.gram_panchayat} />
            <Field label="Hobli" value={reg.hobli_name} />
            <Field label="Post Office" value={reg.post_office} />
            <Field label="Taluk" value={reg.taluk} />
            <Field label="City" value={reg.city} />
            <Field label="District" value={reg.district} />
            <Field label="State" value={reg.state} />
            <Field label="Pincode" value={reg.pincode} />
          </Card>
        )}

        {tab === "Bank" && (
          <Card icon={<Landmark className="h-4 w-4" />} title="Bank Details">
            <Field label="Account Holder" value={reg.bank_holder_name} />
            <Field label="Bank" value={reg.bank_name} />
            <Field label="Account Number" value={reg.account_number} />
            <Field label="IFSC" value={reg.ifsc} />
            <Field label="Account Type" value={reg.account_type} />
          </Card>
        )}

        {tab === "KYC Docs" && (() => {
          const docs = DOCS.filter((d) => d.path);
          const activeKey = selDoc && docs.some((d) => d.key === selDoc) ? selDoc : (docs[0]?.key ?? null);
          const active = docs.find((d) => d.key === activeKey);
          const aKind = fileKind(active?.path);
          const aUrl = activeKey ? urls[activeKey] : undefined;
          const stageAcct = reg.status === "accountant_review" && canAccountant;
          const stageQc = reg.status === "qc_review" && canQc;
          return (
          <div className="grid gap-4 lg:grid-cols-[280px_1fr_320px] items-start">
            {/* Documents list */}
            <div className="rounded-2xl border border-border bg-card shadow-soft">
              <p className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-bold"><FileText className="h-4 w-4 text-india-green" /> Documents</p>
              <div className="max-h-[60vh] overflow-y-auto p-2">
                {docs.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No documents submitted.</p>
                  : docs.map((d) => { const st = docReviews[d.key]?.status ?? "pending"; return (
                    <button key={d.key} onClick={() => setSelDoc(d.key)} className={`mb-1 flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${activeKey === d.key ? "border-india-green bg-india-green/5" : "border-transparent hover:bg-muted/50"}`}>
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-india-green"><FileText className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{d.label}</span><span className="text-[10px] text-muted-foreground">View document</span></span>
                      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${docPill(st)}`}>{st}</span>
                    </button>
                  ); })}
              </div>
            </div>

            {/* Viewer */}
            <div className="rounded-2xl border border-border bg-card shadow-soft">
              <div className="flex items-center justify-between border-b border-border px-4 py-3"><p className="flex items-center gap-2 text-sm font-bold"><Maximize2 className="h-4 w-4 text-india-green" /> Viewer</p>{active && <span className="text-xs text-muted-foreground">{active.label}</span>}</div>
              <div className="grid min-h-[420px] place-items-center bg-muted/30 p-3">
                {!active ? <p className="text-sm text-muted-foreground">Select a document</p>
                  : !aUrl ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  : aKind === "image" ? <img src={aUrl} alt={active.label} className="max-h-[60vh] max-w-full cursor-zoom-in object-contain" onClick={() => setLightbox({ url: aUrl, kind: aKind, label: active.label })} />
                  : aKind === "video" ? <video src={aUrl} controls className="max-h-[60vh] max-w-full rounded-lg bg-black" />
                  : <iframe src={aUrl} title={active.label} className="h-[60vh] w-full rounded-lg bg-white" />}
              </div>
              {active && canDocReview && (
                <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
                  <span className="text-xs text-muted-foreground">Mark this document</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-emerald-700" onClick={() => setDoc(active.key, "approved")}><CheckCircle2 className="h-3.5 w-3.5" /> Approve</Button>
                    <Button size="sm" variant="outline" className="text-rose-600" onClick={() => setDoc(active.key, "rejected")}><XCircle className="h-3.5 w-3.5" /> Reject</Button>
                    {aUrl && <a href={aUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"><ExternalLink className="h-3.5 w-3.5" /> Open</a>}
                  </div>
                </div>
              )}
            </div>

            {/* QC Remarks / Action */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <p className="mb-3 flex items-center gap-2 text-sm font-bold"><ShieldCheck className="h-4 w-4 text-india-green" /> KYC QC Remarks</p>
              {!(stageAcct || stageQc) ? (
                <div className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
                  {reg.status === "approved" ? "This application is approved." : reg.status === "rejected" ? "This application was rejected." : reg.status === "telecaller" ? "With Telecaller for follow-up." : "No action available at your role for this stage."}
                </div>
              ) : (
                <>
                  <label className="text-[11px] font-semibold text-muted-foreground">Select QC Action</label>
                  <select className="mb-3 h-10 w-full rounded-lg border border-border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30" value={qcAction} onChange={(e) => setQcAction(e.target.value)}>
                    <option value="">Choose action…</option>
                    {stageAcct && <><option value="approve_payment">✓ Approve Payment → QC</option><option value="reject_payment">✗ Reject (payment not received)</option></>}
                    {stageQc && <><option value="approve_kyc">✓ Approve KYC (create login)</option><option value="reject_kyc">✗ Reject</option><option value="request_docs">⟳ Request Documents</option></>}
                  </select>
                  <label className="text-[11px] font-semibold text-muted-foreground">Remarks</label>
                  <textarea rows={4} className="w-full rounded-lg border border-border bg-background p-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30" placeholder="add remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                  <Button onClick={submitQc} disabled={busy || !qcAction} className="mt-3 w-full bg-india-green text-white hover:bg-india-green/90">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Submit</Button>
                </>
              )}
              <div className="mt-4 space-y-1.5 border-t border-border pt-3 text-xs">
                <p className="flex items-center justify-between"><span className="text-muted-foreground">Payment</span><span className={reg.payment_verified ? "font-bold text-emerald-600" : "text-amber-600"}>{reg.payment_verified ? "Verified" : "Pending"}</span></p>
                <p className="flex items-center justify-between"><span className="text-muted-foreground">QC</span><span className={reg.qc_verified ? "font-bold text-emerald-600" : "text-amber-600"}>{reg.qc_verified ? "Verified" : "Pending"}</span></p>
                <p className="flex items-center justify-between"><span className="text-muted-foreground">Stage</span><span className="font-semibold capitalize">{reg.status.replace("_", " ")}</span></p>
              </div>
            </div>
          </div>
          );
        })()}

        {tab === "Payment" && (
          <Card icon={<Banknote className="h-4 w-4" />} title="Payment">
            <Field label="Amount" value={reg.payment_amount ? `₹${Number(reg.payment_amount).toLocaleString("en-IN")}` : null} />
            <Field label="UTR / Reference" value={reg.payment_utr} />
            <Field label="Method" value={reg.payment_method} />
            <Field label="Paid On" value={reg.payment_paid_on} />
            <Field label="Payer Name" value={reg.payer_name} />
            <Field label="Payer Bank" value={reg.payer_bank} />
          </Card>
        )}

        {tab === "Verification" && (
          <Card icon={<ShieldCheck className="h-4 w-4" />} title="Verification Status">
            <Field label="Stage" value={reg.status.replace("_", " ")} />
            <Field label="Payment Verified" value={reg.payment_verified ? "Yes" : "No"} />
            <Field label="Payment Notes" value={reg.payment_verification_notes} />
            <Field label="QC Verified" value={reg.qc_verified ? "Yes" : "No"} />
            <Field label="QC Notes" value={reg.qc_notes} />
            <Field label="Rejection Reason" value={reg.rejection_reason} />
            <Field label="Declaration Agreed" value={reg.declaration_agreed ? "Yes" : "No"} />
          </Card>
        )}
      </main>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[80] flex flex-col bg-black/90 backdrop-blur-sm" onClick={() => setLightbox(null)}>
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <span className="truncate text-sm font-semibold">{lightbox.label}</span>
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <a href={lightbox.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20"><ExternalLink className="h-3.5 w-3.5" /> Open</a>
              <button onClick={() => setLightbox(null)} className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20"><X className="h-3.5 w-3.5" /> Close</button>
            </div>
          </div>
          <div className="flex flex-1 items-center justify-center overflow-auto p-4" onClick={(e) => e.stopPropagation()}>
            {lightbox.kind === "image" ? <img src={lightbox.url} alt={lightbox.label} className="max-h-full max-w-full object-contain" />
              : lightbox.kind === "video" ? <video src={lightbox.url} controls autoPlay className="max-h-full max-w-full rounded-lg bg-black" />
              : <iframe src={lightbox.url} title={lightbox.label} className="h-full w-full rounded-lg bg-white" />}
          </div>
        </div>
      )}

      {/* Required documents modal */}
      <Dialog open={reqOpen} onOpenChange={setReqOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Required Document Details</DialogTitle><DialogDescription>Select the documents the retailer must re-submit. This sends the application to the Telecaller with your message.</DialogDescription></DialogHeader>
          <div className="space-y-3 text-sm">
            <div><label className="text-[11px] font-semibold text-muted-foreground">Message *</label><textarea rows={2} className="w-full rounded-lg border border-border bg-background p-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30" value={reqMsg} onChange={(e) => setReqMsg(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-2">
              {REQ_DOCS.map((d) => (<label key={d} className="flex items-center gap-2"><input type="checkbox" checked={!!reqSel[d]} onChange={(e) => setReqSel({ ...reqSel, [d]: e.target.checked })} className="h-4 w-4 accent-[oklch(0.55_0.12_150)]" /> {d}</label>))}
            </div>
            <div><label className="text-[11px] font-semibold text-muted-foreground">Required Docs *</label><div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs">{REQ_DOCS.filter((d) => reqSel[d]).join(", ") || "—"}</div></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setReqOpen(false)}>Cancel</Button><Button className="bg-india-green text-white" disabled={busy} onClick={submitRequestDocs}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Submit</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credentials dialog */}
      <Dialog open={!!creds} onOpenChange={(o) => { if (!o) { setCreds(null); navigate({ to: backTo }); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600" /> Retailer approved</DialogTitle>
            <DialogDescription>Share these credentials with the retailer. The password is shown only once.</DialogDescription>
          </DialogHeader>
          {creds && (
            <div className="space-y-2 text-sm">
              {([["Retailer ID", creds.username], ["Email", creds.email], ["Password", creds.password]] as const).map(([l, val]) => (
                <div key={l} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
                  <span className="text-muted-foreground">{l}</span><span className="font-mono font-semibold">{val}</span>
                  <button className="text-india-green" onClick={() => { navigator.clipboard.writeText(val); toast.success("Copied"); }}><Copy className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          )}
          <DialogFooter><Button onClick={() => { setCreds(null); navigate({ to: backTo }); }}>Done</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
