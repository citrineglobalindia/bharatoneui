import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Plug, ExternalLink, Play, CheckCircle2, Send, FileDown, ImageDown, Share2, Upload, Wallet } from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";
import { downloadReceiptPDF, downloadReceiptPNG, shareReceipt, type AppReceipt } from "@/lib/application-receipt";
import { toast as _toast } from "sonner";

export const Route = createFileRoute("/service/$id")({
  head: () => ({ meta: [{ title: "Service — BharatOne" }] }),
  component: ServiceLauncher,
});

type Field = { key: string; label: string; type: string; required: boolean; placeholder?: string; options?: string[] };

function ServiceLauncher() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [svc, setSvc] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<AppReceipt | null>(null);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      await ensureStaffSession();
      const { data } = await supabase.from("services").select("*").eq("id", id).maybeSingle();
      setSvc(data); setLoading(false);
      if (data?.service_type === "inlink" && data.redirect_url) { try { window.open(data.redirect_url, "_blank", "noopener,noreferrer"); } catch { /* popup blocked */ } }
      const { data: sess0 } = await supabase.auth.getSession();
      const uid0 = sess0?.session?.user?.id;
      if (uid0) { const { data: w } = await supabase.from("wallets").select("balance").eq("user_id", uid0).maybeSingle(); setBalance(Number((w as any)?.balance ?? 0)); }
      if (data?.service_type === "backend" && (!data.form_schema || data.form_schema.length === 0) && data.backend_route) navigate({ to: data.backend_route as never });
    })();
    // eslint-disable-next-line
  }, [id]);

  const runApi = async () => {
    setRunning(true); setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("service-proxy", { body: { service_id: id } });
      setResult(error ? "Integration not available yet: " + error.message : JSON.stringify(data, null, 2));
    } catch (e) { setResult("Could not run: " + (e instanceof Error ? e.message : String(e))); }
    finally { setRunning(false); }
  };

  const uploadFile = async (key: string, file: File) => {
    if (file.size > 50 * 1024 * 1024) { toast.error("File too large", { description: "Maximum size is 50 MB." }); return; }
    setUploadingKey(key);
    try {
      const ext = (file.name.split(".").pop() || "bin").toLowerCase();
      const path = `${id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("application-files").upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (error) { toast.error("Upload failed", { description: error.message }); return; }
      setValues((v) => ({ ...v, [key]: { __file: path, name: file.name } }));
      toast.success(`${file.name} uploaded`);
    } finally { setUploadingKey(null); }
  };

  const submitForm = async (fields: Field[]) => {
    for (const f of fields) {
      if (f.required && !values[f.key] && f.type !== "checkbox") { toast.error(`${f.label} is required`); return; }
    }
    setSubmitting(true);
    try {
      await ensureStaffSession();
      const { data: sess } = await supabase.auth.getSession();
      if (!sess?.session) { toast.error("Your session has expired", { description: "Please sign in again to submit this application.", action: { label: "Sign in", onClick: () => navigate({ to: "/login" }) } }); return; }
      const charge = Number(svc.service_charge || 0);
      if (charge > 0 && balance != null && balance < charge) { toast.error("Insufficient wallet balance", { description: `This service costs ₹${charge.toLocaleString("en-IN")}. Add funds to your wallet to continue.`, action: { label: "Add funds", onClick: () => navigate({ to: "/wallet" }) } }); return; }
      const { data, error } = await supabase.rpc("submit_backend_application", { p_service_id: id, p_form: values });
      if (error) { if (String(error.message).includes("ONLY_RETAILER")) { toast.error("Only retailer accounts can apply for services."); return; }
      if (String(error.message).includes("INSUFFICIENT_FUNDS")) { toast.error("Insufficient wallet balance", { description: "Please add funds to your wallet before applying." }); return; } toast.error("Submit failed", { description: error.message }); return; }
      const res = (data as any) ?? {};
      const pick = (re: RegExp) => { const k = Object.keys(values).find((x) => re.test(x.toLowerCase()) && typeof values[x] !== "object"); return k ? String(values[k]) : undefined; };
      setReceipt({
        application_no: res.application_no ?? "—", status: res.status ?? "submitted", created_at: new Date().toISOString(),
        full_name: pick(/name/) , phone: pick(/phone|mobile/), email: pick(/email/), address: pick(/address/),
        aadhaar_number: pick(/aadhaar|aadhar/), pan_number: pick(/pan/),
        category_name: svc.category, service_name: svc.name,
        service_charge: svc.service_charge, commission_price: Math.round((Number(svc.service_charge||0)*Number(svc.retailer_commission||0)/100)*100)/100,
      });
      if (balance != null) setBalance(balance - Number(svc.service_charge || 0));
      toast.success("Application submitted", { description: res.application_no ? `Reference ${res.application_no}` : undefined });
    } finally { setSubmitting(false); }
  };

  if (loading) return <RetailerShell><div className="grid h-64 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-india-green" /></div></RetailerShell>;
  if (!svc) return <RetailerShell><div className="p-6">Service not found. <Link to="/services" className="text-india-green underline">Back to services</Link></div></RetailerShell>;

  const fields: Field[] = svc.form_schema ?? [];
  // Standard applicant fields common to ALL backend services
  const COMMON: Field[] = [
    { key: "full_name", label: "Full Name", type: "text", required: true, placeholder: "Applicant full name" },
    { key: "father_name", label: "Father/Husband Name", type: "text", required: true, placeholder: "Father's / husband's name" },
    { key: "gender", label: "Gender", type: "select", required: true, options: ["Male", "Female", "Other"] },
    { key: "email", label: "Email Address", type: "email", required: true, placeholder: "name@example.com" },
    { key: "phone", label: "Phone Number", type: "tel", required: true, placeholder: "10-digit mobile" },
    { key: "address", label: "Address", type: "textarea", required: false, placeholder: "Full address" },
    { key: "aadhaar_number", label: "Aadhaar Number", type: "text", required: true, placeholder: "12-digit Aadhaar" },
    { key: "pan_number", label: "PAN Number", type: "text", required: false, placeholder: "ABCDE1234F" },
  ];
  const allFields: Field[] = [...COMMON, ...fields];
  const input = "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30";

  return (
    <RetailerShell>
      <div className="space-y-5">
        <Link to="/services" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Services</Link>
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
          {svc.logo_url ? <img src={svc.logo_url} alt={svc.name} className="h-16 w-16 object-contain" /> : <div className="grid h-16 w-16 place-items-center rounded-xl bg-india-green/10 text-india-green text-2xl font-bold">{svc.name[0]}</div>}
          <div><p className="font-display text-lg font-bold">{svc.name}</p><p className="text-sm text-muted-foreground">{svc.category || (svc.service_type === "api" ? "API service" : "Service")}</p></div>
        </div>

        {svc.service_type === "api" && (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft space-y-3">
            <Button onClick={runApi} disabled={running} className="bg-india-green text-white">{running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Launch service</Button>
            {result && <pre className="max-h-80 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{result}</pre>}
          </div>
        )}

        {svc.service_type === "backend" && (fields.length > 0 || !svc.backend_route) && (
          receipt ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-8 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
              <p className="mt-3 font-display text-lg font-bold">Application Submitted</p>
              <p className="mt-1 text-sm text-muted-foreground">Your request for {svc.name} has been received and is under review.</p>
              <p className="mt-3 inline-block rounded-lg bg-white px-4 py-2 font-mono text-sm font-bold border border-border">{receipt.application_no}</p>
              <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Receipt</p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                <button onClick={() => downloadReceiptPDF(receipt!)} className="inline-flex items-center gap-1.5 rounded-lg bg-india-green px-3 h-10 text-sm font-semibold text-white hover:bg-india-green/90"><FileDown className="h-4 w-4" /> Download PDF</button>
                <button onClick={() => downloadReceiptPNG(receipt!)} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 h-10 text-sm font-semibold hover:bg-muted"><ImageDown className="h-4 w-4" /> Image</button>
                <button onClick={async () => { const r = await shareReceipt(receipt!); if (r === "copied") _toast.success("Receipt details copied"); }} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 h-10 text-sm font-semibold hover:bg-muted"><Share2 className="h-4 w-4" /> Share</button>
              </div>
              <div className="mt-5 flex justify-center gap-2">
                <Link to="/applications" className="rounded-lg bg-saffron-gradient text-white px-4 h-10 inline-flex items-center text-sm font-semibold shadow-elev">My Applications</Link>
                <Link to="/services" className="rounded-lg border border-border bg-white px-4 h-10 inline-flex items-center text-sm font-semibold hover:bg-muted">Back to services</Link>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <PageHeader icon={<Plug className="h-5 w-5" />} title={svc.name} subtitle="Fill the form to request this service" />
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {allFields.map((f) => (
                  <div key={f.key} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
                    <label className="text-xs font-semibold text-foreground">{f.label}{f.required && <span className="text-rose-500"> *</span>}</label>
                    {f.type === "textarea" ? (
                      <textarea className={`${input} h-24 py-2`} placeholder={f.placeholder} value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
                    ) : f.type === "select" ? (
                      <select className={input} value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}>
                        <option value="">Select…</option>{(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : f.type === "checkbox" ? (
                      <label className="mt-1 flex items-center gap-2 text-sm"><input type="checkbox" checked={!!values[f.key]} onChange={(e) => setValues({ ...values, [f.key]: e.target.checked })} className="h-4 w-4 accent-[oklch(0.55_0.12_150)]" /> Yes</label>
                    ) : f.type === "file" ? (
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 h-9 text-xs font-semibold hover:bg-muted">
                          {uploadingKey === f.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} {values[f.key]?.__file ? "Replace file" : "Choose file"}
                          <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFile(f.key, e.target.files[0])} />
                        </label>
                        {values[f.key]?.name && <span className="text-xs text-india-green font-medium truncate max-w-[200px]">{values[f.key].name}</span>}
                      </div>
                    ) : (
                      <input type={f.type} className={input} placeholder={f.placeholder} value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
                    )}
                  </div>
                ))}
              </div>
              {(() => {
                const charge = Number(svc.service_charge || 0);
                const low = charge > 0 && balance != null && balance < charge;
                return (
                  <>
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Wallet className="h-4 w-4 text-india-green" /> Service charge <b className="text-foreground">₹{charge.toLocaleString("en-IN")}</b></span>
                      <span className="text-muted-foreground">Wallet balance: <b className={low ? "text-rose-600" : "text-india-green"}>{balance == null ? "…" : `₹${balance.toLocaleString("en-IN")}`}</b></span>
                    </div>
                    {low && <p className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">Insufficient wallet balance to apply. <Link to="/wallet" className="rounded-lg bg-india-green px-3 py-1 text-white">Add funds</Link></p>}
                    <Button onClick={() => submitForm(allFields)} disabled={submitting || low} className="mt-3 bg-india-green text-white">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Submit request</Button>
                  </>
                );
              })()}
            </div>
          )
        )}


        {svc.service_type === "inlink" && svc.redirect_url && (
          <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-soft">
            <ExternalLink className="mx-auto h-10 w-10 text-india-green" />
            <p className="mt-3 font-bold">This service opens on the provider's website</p>
            <p className="mt-1 text-sm text-muted-foreground">It launches in a new browser tab. If it didn't open automatically, use the button below.</p>
            <a href={svc.redirect_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-india-green px-4 h-11 text-sm font-semibold text-white hover:bg-india-green/90">Open {svc.name} <ExternalLink className="h-4 w-4" /></a>
          </div>
        )}
      </div>
    </RetailerShell>
  );
}
