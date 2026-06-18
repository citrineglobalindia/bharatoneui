import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, User, Building2, Landmark, FileText, Banknote, ShieldCheck, MapPin,
  CheckCircle2, XCircle, Maximize2, ExternalLink, X, Loader2, Phone, Mail, Copy, RefreshCw, Pencil, UserPlus,
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
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<any>({});
  const [savingAll, setSavingAll] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignList, setAssignList] = useState<{ id: string; name: string }[]>([]);
  const [assignee, setAssignee] = useState("");
  const [busy, setBusy] = useState(false);
  const [lightbox, setLightbox] = useState<{ url: string; kind: string; label: string } | null>(null);
  const [creds, setCreds] = useState<{ username: string; email: string; password: string } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("retailer_registrations").select("*").eq("id", id).maybeSingle();
      if (error || !data) { toast.error("Could not load application"); setReg(null); return; }
      setReg(data);
      setForm(data);
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
  useEffect(() => {
    try { const intent = localStorage.getItem("bharatone:review-intent"); if (intent) { localStorage.removeItem("bharatone:review-intent"); if (intent === "edit") setTimeout(() => setEditMode(true), 300); if (intent === "assign") setTimeout(() => openAssign(), 300); } } catch {}
  }, []);
  const openAssign = async () => {
    setAssignOpen(true);
    if (assignList.length === 0) { const { data } = await supabase.rpc("admin_list_users"); setAssignList(((data as any[]) ?? []).map((x) => ({ id: x.id, name: (x.display_name || x.email || "User") + (Array.isArray(x.roles) && x.roles.length ? ` · ${x.roles.find((r:string)=>r!=="employee")||x.roles[0]}` : "") }))); }
  };
  const doAssign = async () => {
    if (!assignee) { toast.error("Select a user"); return; }
    const { error } = await supabase.rpc("assign_registration", { reg_id: id, p_user: assignee });
    if (error) { toast.error("Assign failed", { description: error.message }); return; }
    toast.success("Assigned"); setAssignOpen(false); await load();
  };
  const saveAll = async () => {
    setSavingAll(true);
    const cols = ["first_name","middle_name","surname","dob","mobile","email","shop_name","address_type","building_shop_no","street_area","ward_number","landmark","village_name","gram_panchayat","hobli_name","post_office","taluk","city","district","state","pincode","bank_holder_name","bank_name","account_number","ifsc","account_type","payment_amount","payment_utr","payment_method","payment_paid_on","payer_name","payer_bank"];
    const payload: any = {}; cols.forEach((c) => { payload[c] = form[c] === "" ? null : form[c]; });
    if (payload.payment_amount != null && payload.payment_amount !== "") payload.payment_amount = Number(payload.payment_amount);
    const { error } = await supabase.from("retailer_registrations").update(payload).eq("id", id);
    setSavingAll(false);
    if (error) { toast.error("Save failed", { description: error.message }); return; }
    toast.success("All details saved"); setEditMode(false); await load();
  };

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
  const ef = (label: string, key: string, type = "text") => editMode
    ? <div className="min-w-0"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p><input type={type} className="mt-0.5 h-9 w-full rounded-lg border border-border bg-background px-2 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-india-green/30" value={form[key] ?? ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></div>
    : <Field label={label} value={reg[key]} />;

  return (
    <div className="min-h-screen bg-tricolor pb-28">
      <header className="sticky top-0 z-30 border-b border-border bg-card/85 backdrop-blur-md">
        <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-center px-4">
          <Link to={backTo} aria-label="Back" className="absolute left-4 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold hover:bg-muted">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <BharatOneLogo size="lg" />
          <div className="absolute right-4 flex items-center gap-2">
            {role === "admin" && !editMode && <Button size="sm" variant="outline" onClick={() => setEditMode(true)}><Pencil className="h-4 w-4" /> Edit</Button>}
            {role === "admin" && editMode && <><Button size="sm" disabled={savingAll} className="bg-india-green text-white hover:bg-india-green/90" onClick={saveAll}>{savingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Save all</Button><Button size="sm" variant="outline" onClick={() => { setEditMode(false); setForm(reg); }}><X className="h-4 w-4" /> Cancel</Button></>}
            {role === "admin" && !editMode && <Button size="sm" variant="outline" onClick={openAssign}><UserPlus className="h-4 w-4" /> Assign</Button>}
            <NotificationsBell />
          </div>
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
                {reg.assigned_name && <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700"><UserPlus className="h-3 w-3" /> {reg.assigned_name}</span>}
              </div>
            </div>
            <div className="text-right">
              <p className="font-display text-2xl font-extrabold">{reg.payment_amount ? `₹${Number(reg.payment_amount).toLocaleString("en-IN")}` : "—"}</p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Registration Fee</p>
            </div>
          </div>
        </div>

        {/* QC / Accountant action — Verify or Reject with remarks */}
        {(() => {
          const stageAcct = reg.status === "accountant_review" && canAccountant;
          const stageQc = reg.status === "qc_review" && canQc;
          if (!stageAcct && !stageQc) return (
            <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-soft">
              {reg.status === "approved" ? "This application is approved." : reg.status === "rejected" ? "This application was rejected." : reg.status === "telecaller" ? "With Telecaller for follow-up." : "No verification action available at your role for this stage."}
            </div>
          );
          return (
            <div className="rounded-2xl border-2 border-india-green/30 bg-india-green/5 p-5 shadow-soft">
              <p className="mb-3 flex items-center gap-2 text-sm font-bold"><ShieldCheck className="h-4 w-4 text-india-green" /> {stageAcct ? "Payment Verification" : "QC Verification"} — {role}</p>
              <label className="text-[11px] font-semibold text-muted-foreground">Remarks</label>
              <textarea rows={3} className="mb-3 w-full rounded-lg border border-border bg-background p-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30" placeholder="Add remarks (required for reject)" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
              <div className="flex flex-wrap gap-2">
                <Button disabled={busy} onClick={() => { setQcAction(stageAcct ? "approve_payment" : "approve_kyc"); setTimeout(submitQc, 0); }} className="bg-india-green text-white hover:bg-india-green/90">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Verify {stageAcct ? "Payment" : "& Approve"}</Button>
                <Button variant="outline" disabled={busy} className="text-rose-600" onClick={() => { if (!remarks.trim()) { toast.error("Add remarks before rejecting"); return; } setQcAction(stageAcct ? "reject_payment" : "reject_kyc"); setTimeout(submitQc, 0); }}><XCircle className="h-4 w-4" /> Reject</Button>
                {stageQc && <Button variant="outline" disabled={busy} onClick={() => setReqOpen(true)}><RefreshCw className="h-4 w-4" /> Request Documents</Button>}
              </div>
            </div>
          );
        })()}

        {/* All details on one page */}
        <Card icon={<User className="h-4 w-4" />} title="Personal Information">
          {ef("First Name", "first_name")}
          {ef("Middle Name", "middle_name")}
          {ef("Surname", "surname")}
          {ef("Date of Birth", "dob")}
          {ef("Mobile", "mobile")}
          {ef("Email", "email")}
          <Field label="Retailer Type" value={typeLabel(reg.registration_type)} />
          <Field label="Agent ID" value={reg.username} />
        </Card>

        <Card icon={<Building2 className="h-4 w-4" />} title="Business Information">
          {ef("Shop Name", "shop_name")}
          {ef("Address Type", "address_type")}
          {ef("Building / Shop No", "building_shop_no")}
          {ef("Street / Area", "street_area")}
          {ef("Ward Number", "ward_number")}
          {ef("Landmark", "landmark")}
          {ef("Village", "village_name")}
          {ef("Gram Panchayat", "gram_panchayat")}
          {ef("Hobli", "hobli_name")}
          {ef("Post Office", "post_office")}
          {ef("Taluk", "taluk")}
          {ef("City", "city")}
          {ef("District", "district")}
          {ef("State", "state")}
          {ef("Pincode", "pincode")}
        </Card>

        <Card icon={<Landmark className="h-4 w-4" />} title="Bank Details">
          {ef("Account Holder", "bank_holder_name")}
          {ef("Bank", "bank_name")}
          {ef("Account Number", "account_number")}
          {ef("IFSC", "ifsc")}
          {ef("Account Type", "account_type")}
        </Card>

        <Card icon={<Banknote className="h-4 w-4" />} title="Payment">
          {editMode ? ef("Amount", "payment_amount", "number") : <Field label="Amount" value={reg.payment_amount ? `\u20b9${Number(reg.payment_amount).toLocaleString("en-IN")}` : null} />}
          {ef("UTR / Reference", "payment_utr")}
          {ef("Method", "payment_method")}
          {ef("Paid On", "payment_paid_on")}
          {ef("Payer Name", "payer_name")}
          {ef("Payer Bank", "payer_bank")}
        </Card>

        {/* KYC Documents */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <p className="mb-4 flex items-center gap-2 text-sm font-bold"><FileText className="h-4 w-4 text-india-green" /> KYC Documents</p>
          {gps && (
            <div className="mb-4 flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm">
              <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-india-green" /> GPS: <span className="font-mono">{gps}</span></span>
              {mapUrl && <a href={mapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-india-green hover:underline">View Map <ExternalLink className="h-3.5 w-3.5" /></a>}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DOCS.filter((d) => d.path).map((d) => {
              const url = urls[d.key]; const kind = fileKind(d.path); const st = docReviews[d.key]?.status ?? "pending";
              return (
                <div key={d.key} className="overflow-hidden rounded-xl border border-border">
                  <button type="button" onClick={() => url && setLightbox({ url, kind, label: d.label })} className="relative block h-44 w-full bg-muted/40">
                    {url && kind === "image" ? <img src={url} alt={d.label} className="h-full w-full object-cover" />
                      : url && kind === "video" ? <video src={url} className="h-full w-full object-cover" muted />
                      : <div className="grid h-full w-full place-items-center"><FileText className="h-10 w-10 text-muted-foreground" /></div>}
                    <span className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg bg-black/55 text-white"><Maximize2 className="h-4 w-4" /></span>
                  </button>
                  <div className="space-y-2 p-3">
                    <div className="flex items-center justify-between"><span className="font-semibold">{d.label}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${docPill(st)}`}>{st}</span></div>
                    {canDocReview && (
                      <div className="grid grid-cols-2 gap-2">
                        <Button size="sm" variant="outline" className="h-8 text-emerald-700" onClick={() => setDoc(d.key, "approved")}><CheckCircle2 className="h-3.5 w-3.5" /> Approve</Button>
                        <Button size="sm" variant="outline" className="h-8 text-rose-600" onClick={() => setDoc(d.key, "rejected")}><XCircle className="h-3.5 w-3.5" /> Reject</Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {DOCS.filter((d) => d.path).length === 0 && <p className="text-sm text-muted-foreground">No documents submitted.</p>}
          </div>
        </div>

        <Card icon={<ShieldCheck className="h-4 w-4" />} title="Verification Status">
          <Field label="Stage" value={reg.status.replace("_", " ")} />
          <Field label="Payment Verified" value={reg.payment_verified ? "Yes" : "No"} />
          <Field label="Payment Notes" value={reg.payment_verification_notes} />
          <Field label="QC Verified" value={reg.qc_verified ? "Yes" : "No"} />
          <Field label="QC Notes" value={reg.qc_notes} />
          <Field label="Rejection Reason" value={reg.rejection_reason} />
        </Card>

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

      {/* Assign dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-india-green" /> Assign application</DialogTitle><DialogDescription>Assign this KYC application to a user for review. They'll be notified and can open it.</DialogDescription></DialogHeader>
          <select className="h-10 w-full rounded-lg border border-border bg-background px-2 text-sm" value={assignee} onChange={(e) => setAssignee(e.target.value)}><option value="">Select user</option>{assignList.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
          <DialogFooter><Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button><Button className="bg-india-green text-white" onClick={doAssign}>Assign</Button></DialogFooter>
        </DialogContent>
      </Dialog>

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
