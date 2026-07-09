import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { PlusCircle, Loader2, Send, Upload, Wallet, CheckCircle2, FileDown, ImageDown, Share2 } from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeMobile } from "@/lib/phone";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";
import { downloadReceiptPDF, downloadReceiptPNG, shareReceipt, type AppReceipt } from "@/lib/application-receipt";

export const Route = createFileRoute("/new-service-request")({
  head: () => ({ meta: [{ title: "New Application — BharatOne" }] }),
  validateSearch: (s: Record<string, unknown>): { sc?: string } => ({ sc: typeof s.sc === "string" ? s.sc : undefined }),
  component: NewRequestPage,
});

type Field = { key: string; label: string; type: string; required: boolean; placeholder?: string; options?: string[] };
type Svc = { id: string; name: string; category: string | null; category_id: string | null; service_charge: number; retailer_commission: number; form_schema: Field[] | null };

const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");
const input = "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30";

// Standard applicant fields common to every application
const COMMON: Field[] = [
  { key: "full_name", label: "Full Name", type: "text", required: true, placeholder: "Applicant full name" },
  { key: "father_name", label: "Father's Name", type: "text", required: true, placeholder: "Father's / husband's name" },
  { key: "gender", label: "Gender", type: "select", required: true, options: ["Male", "Female", "Other"] },
  { key: "email", label: "Email Address", type: "email", required: true, placeholder: "name@example.com" },
  { key: "phone", label: "Phone Number", type: "tel", required: true, placeholder: "10-digit mobile" },
  { key: "address", label: "Address", type: "textarea", required: false, placeholder: "Full address" },
  { key: "aadhaar_number", label: "Aadhaar Number", type: "text", required: true, placeholder: "12-digit Aadhaar" },
  { key: "pan_number", label: "PAN Number", type: "text", required: false, placeholder: "ABCDE1234F" },
];

function NewRequestPage() {
  const navigate = useNavigate();
  const { sc } = Route.useSearch();
  const [svcs, setSvcs] = useState<Svc[]>([]);
  const [scName, setScName] = useState<string>("");
  const [catParent, setCatParent] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [values, setValues] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [receipt, setReceipt] = useState<AppReceipt | null>(null);
  const [lowBalOpen, setLowBalOpen] = useState(false);

  useEffect(() => {
    (async () => {
      await ensureStaffSession();
      const [{ data }, mid, scRow] = await Promise.all([
        (supabase as any).from("services")
          .select("id,name,category,category_id,service_charge,retailer_commission,form_schema")
          .eq("is_active", true).eq("service_type", "backend").order("sort_order").order("name"),
        (supabase as any).from("service_categories").select("id,parent_id").neq("kind", "frontend"),
        sc ? (supabase as any).from("service_categories").select("name").eq("id", sc).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      setSvcs((data as unknown as Svc[]) ?? []);
      const m: Record<string, string | null> = {};
      ((mid.data as { id: string; parent_id: string | null }[]) ?? []).forEach((r) => { m[r.id] = r.parent_id; });
      setCatParent(m);
      setScName(((scRow as any).data?.name as string) ?? "");
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess?.session?.user?.id;
      if (uid) { const { data: w } = await (supabase as any).from("wallets").select("balance").eq("user_id", uid).maybeSingle(); setBalance(Number((w as any)?.balance ?? 0)); }
      setLoading(false);
    })();
  }, []);

  // Scope backend services to the selected Service Category (via each Category's parent_id).
  const scopedSvcs = useMemo(() => {
    if (!sc) return svcs;
    return svcs.filter((s) => (s.category_id ? catParent[s.category_id] : null) === sc);
  }, [svcs, catParent, sc]);
  const categories = useMemo(() => Array.from(new Set(scopedSvcs.map((s) => s.category || "Other"))).sort(), [scopedSvcs]);
  const servicesInCat = useMemo(() => scopedSvcs.filter((s) => (s.category || "Other") === category), [scopedSvcs, category]);
  const svc = useMemo(() => svcs.find((s) => s.id === serviceId) || null, [svcs, serviceId]);
  const dynFields: Field[] = (svc?.form_schema as Field[]) ?? [];
  const allFields: Field[] = [...COMMON, ...dynFields];

  const uploadFile = async (key: string, file: File) => {
    if (!serviceId) { toast.error("Select a service first"); return; }
    if (file.size > 50 * 1024 * 1024) { toast.error("File too large", { description: "Maximum size is 50 MB." }); return; }
    setUploadingKey(key);
    try {
      const ext = (file.name.split(".").pop() || "bin").toLowerCase();
      const path = `${serviceId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("application-files").upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (error) { toast.error("Upload failed", { description: error.message }); return; }
      setValues((v) => ({ ...v, [key]: { __file: path, name: file.name } }));
      toast.success(`${file.name} uploaded`);
    } finally { setUploadingKey(null); }
  };

  const renderField = (f: Field) => {
    if (f.type === "textarea") return <textarea className={`${input} h-24 py-2`} placeholder={f.placeholder} value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />;
    if (f.type === "select") return (
      <select className={input} value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}>
        <option value="">Select…</option>{(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
    if (f.type === "checkbox") return <label className="mt-1 flex items-center gap-2 text-sm"><input type="checkbox" checked={!!values[f.key]} onChange={(e) => setValues({ ...values, [f.key]: e.target.checked })} className="h-4 w-4 accent-[oklch(0.55_0.12_150)]" /> Yes</label>;
    if (f.type === "file") return (
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 h-9 text-xs font-semibold hover:bg-muted">
          {uploadingKey === f.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} {values[f.key]?.__file ? "Replace file" : "Choose file"}
          <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFile(f.key, e.target.files[0])} />
        </label>
        {values[f.key]?.name && <span className="max-w-[200px] truncate text-xs font-medium text-india-green">{values[f.key].name}</span>}
      </div>
    );
    const isPhone = /phone|mobile/i.test(f.key); const isAadhaar = /aadhaar|aadhar/i.test(f.key); const isPan = /pan/i.test(f.key);
    const ml = isPhone ? 10 : isAadhaar ? 12 : isPan ? 10 : undefined;
    const clean = (val: string) => isPhone ? sanitizeMobile(val) : isAadhaar ? val.replace(/\D/g, "").slice(0, 12) : isPan ? val.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10) : val;
    return <input type={f.type} inputMode={isPhone || isAadhaar ? "numeric" : undefined} maxLength={ml} className={input} placeholder={f.placeholder} value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: clean(e.target.value) })} />;
  };

  const submit = async () => {
    if (!category) { toast.error("Please select a category"); return; }
    if (!serviceId) { toast.error("Please select a service"); return; }
    for (const f of allFields) if (f.required && !values[f.key] && f.type !== "checkbox") { toast.error(`${f.label} is required`); return; }
    setSubmitting(true);
    try {
      await ensureStaffSession();
      const { data: sess } = await supabase.auth.getSession();
      if (!sess?.session) { toast.error("Your session has expired", { description: "Please sign in again.", action: { label: "Sign in", onClick: () => navigate({ to: "/login" }) } }); return; }
      const charge = Number(svc?.service_charge || 0);
      if (balance != null && balance - charge < 1000) { setLowBalOpen(true); return; }
      const { data, error } = await supabase.rpc("submit_backend_application", { p_service_id: serviceId, p_form: values });
      if (error) {
        if (String(error.message).includes("ONLY_RETAILER")) { toast.error("Only retailer accounts can apply for services."); return; }
        if (String(error.message).includes("MIN_BALANCE") || String(error.message).includes("INSUFFICIENT_FUNDS")) { setLowBalOpen(true); return; }
        toast.error("Submit failed", { description: error.message }); return;
      }
      const res = (data as any) ?? {};
      setReceipt({
        application_no: res.application_no ?? "—", status: res.status ?? "submitted", created_at: new Date().toISOString(),
        full_name: values.full_name, phone: values.phone, email: values.email, address: values.address,
        aadhaar_number: values.aadhaar_number, pan_number: values.pan_number,
        category_name: svc?.category ?? undefined, service_name: svc?.name,
        service_charge: svc?.service_charge, commission_price: Math.round((Number(svc?.service_charge || 0) * Number(svc?.retailer_commission || 0) / 100) * 100) / 100,
      });
      if (balance != null) setBalance(balance - charge);
      toast.success("Application submitted", { description: res.application_no ? `Reference ${res.application_no}` : undefined });
    } finally { setSubmitting(false); }
  };

  if (loading) return <RetailerShell><div className="grid h-64 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-india-green" /></div></RetailerShell>;

  if (receipt) return (
    <RetailerShell>
      <div className="mx-auto max-w-lg rounded-2xl border border-emerald-200 bg-emerald-50/60 p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
        <p className="mt-3 font-display text-lg font-bold">Application Submitted</p>
        <p className="mt-1 text-sm text-muted-foreground">Your request for {receipt.service_name} has been received and is under review.</p>
        <p className="mt-3 inline-block rounded-lg border border-border bg-white px-4 py-2 font-mono text-sm font-bold">{receipt.application_no}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button onClick={() => downloadReceiptPDF(receipt!)} className="inline-flex items-center gap-1.5 rounded-lg bg-india-green px-3 h-10 text-sm font-semibold text-white hover:bg-india-green/90"><FileDown className="h-4 w-4" /> PDF</button>
          <button onClick={() => downloadReceiptPNG(receipt!)} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 h-10 text-sm font-semibold hover:bg-muted"><ImageDown className="h-4 w-4" /> Image</button>
          <button onClick={async () => { const r = await shareReceipt(receipt!); if (r === "copied") toast.success("Receipt details copied"); }} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 h-10 text-sm font-semibold hover:bg-muted"><Share2 className="h-4 w-4" /> Share</button>
        </div>
        <div className="mt-5 flex justify-center gap-2">
          <Link to="/applications" className="inline-flex h-10 items-center rounded-lg bg-saffron-gradient px-4 text-sm font-semibold text-white shadow-elev">My Applications</Link>
          <button onClick={() => { setReceipt(null); setValues({}); setCategory(""); setServiceId(""); }} className="inline-flex h-10 items-center rounded-lg border border-border bg-white px-4 text-sm font-semibold hover:bg-muted">New application</button>
        </div>
      </div>
    </RetailerShell>
  );

  const charge = Number(svc?.service_charge || 0);
  const low = balance != null && balance < 1000;

  return (
    <RetailerShell>
      <div className="space-y-5">
        <PageHeader icon={<PlusCircle className="h-5 w-5" />} title={sc && scName ? `New Application — ${scName}` : "New Application Form"} subtitle={sc && scName ? `Backend services under ${scName}. Fill all required fields marked with *` : "Please fill all required fields marked with *"} />
        {sc && <Link to="/new-service-request" className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 h-9 text-sm font-semibold hover:bg-muted">← All Categories</Link>}

        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          {/* Applicant details */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {COMMON.map((f) => (
              <div key={f.key} className={f.type === "textarea" ? "sm:col-span-2 lg:col-span-3" : ""}>
                <label className="text-xs font-semibold text-foreground">{f.label}{f.required && <span className="text-rose-500"> *</span>}</label>
                <div className="mt-1">{renderField(f)}</div>
              </div>
            ))}
          </div>

          {/* Category + Service */}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-foreground">Category <span className="text-rose-500">*</span></label>
              <select className={`${input} mt-1`} value={category} onChange={(e) => { setCategory(e.target.value); setServiceId(""); }}>
                <option value="">Select A Category</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">Service <span className="text-rose-500">*</span></label>
              <select className={`${input} mt-1`} value={serviceId} disabled={!category} onChange={(e) => { setServiceId(e.target.value); setValues((v) => ({ ...v })); }}>
                <option value="">{category ? "Select A Service" : "Select a category first"}</option>
                {servicesInCat.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {/* Dynamic admin-configured fields */}
          {svc && (
            dynFields.length > 0 ? (
              <div className="mt-5">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{svc.name} — additional details</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {dynFields.map((f) => (
                    <div key={f.key} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
                      <label className="text-xs font-semibold text-foreground">{f.label}{f.required && <span className="text-rose-500"> *</span>}</label>
                      <div className="mt-1">{renderField(f)}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-4 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">This service has no extra fields configured — the applicant details above are sufficient.</p>
            )
          )}

          {/* Charge + submit */}
          {svc && (
            <>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">
                <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Wallet className="h-4 w-4 text-india-green" /> Service charge <b className="text-foreground">{inr(charge)}</b></span>
                <span className="text-muted-foreground">Wallet balance: <b className={low ? "text-rose-600" : "text-india-green"}>{balance == null ? "…" : inr(balance)}</b></span>
              </div>
              <Button onClick={submit} disabled={submitting} className="mt-3 bg-india-green text-white">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Submit application</Button>
            </>
          )}
        </div>
      </div>

      {lowBalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setLowBalOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-card p-6 text-center shadow-elev" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-rose-100 text-rose-600"><Wallet className="h-7 w-7" /></div>
            <h3 className="mt-4 text-lg font-bold text-foreground">Low wallet balance</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">Your wallet balance is below the required minimum of ₹1,000. Please top up your wallet to submit this application.</p>
            <div className="mt-5 flex gap-2">
              <Button onClick={() => setLowBalOpen(false)} className="flex-1 border border-border bg-card text-foreground hover:bg-muted">Cancel</Button>
              <Button onClick={() => navigate({ to: "/wallet" })} className="flex-1 bg-india-green text-white"><Wallet className="h-4 w-4" /> Top up wallet</Button>
            </div>
          </div>
        </div>
      )}
    </RetailerShell>
  );
}
