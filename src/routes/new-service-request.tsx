import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { PlusCircle, Send, Loader2, CheckCircle2, IndianRupee } from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { SectionCard, Field, Input, Select, PrimaryButton } from "@/components/retailer/section-card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/new-service-request")({
  head: () => ({ meta: [{ title: "New Application — BharatOne" }] }),
  component: NewRequestPage,
});

type Cat = { id: string; name: string };
type Svc = { id: string; category_id: string; name: string; service_charge: number; retailer_commission: number };

function NewRequestPage() {
  const navigate = useNavigate();
  const [cats, setCats] = useState<Cat[]>([]);
  const [svcs, setSvcs] = useState<Svc[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ application_no: string } | null>(null);

  const [f, setF] = useState({
    full_name: "", father_name: "", gender: "", email: "", phone: "",
    address: "", aadhaar_number: "", pan_number: "", category_id: "", service_id: "",
  });
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    (async () => {
      const [c, s] = await Promise.all([
        supabase.from("service_categories").select("id,name").eq("is_active", true).order("sort_order").order("name"),
        supabase.from("catalog_services").select("id,category_id,name,service_charge,retailer_commission").eq("is_active", true).order("sort_order").order("name"),
      ]);
      setCats((c.data as Cat[]) ?? []);
      setSvcs((s.data as Svc[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const catServices = useMemo(() => svcs.filter((s) => s.category_id === f.category_id), [svcs, f.category_id]);
  const service = useMemo(() => svcs.find((s) => s.id === f.service_id), [svcs, f.service_id]);
  const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.full_name.trim()) return toast.error("Full name is required");
    if (!f.aadhaar_number.trim()) return toast.error("Aadhaar number is required");
    if (!f.category_id) return toast.error("Please select a category");
    if (!f.service_id) return toast.error("Please select a service");
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("submit_service_application", {
        payload: {
          full_name: f.full_name.trim(), father_name: f.father_name.trim(), gender: f.gender,
          email: f.email.trim(), phone: f.phone.trim(), address: f.address.trim(),
          aadhaar_number: f.aadhaar_number.trim(), pan_number: f.pan_number.trim().toUpperCase(),
          category_id: f.category_id, service_id: f.service_id,
        },
      });
      if (error) { toast.error("Submission failed", { description: error.message }); return; }
      const res = (data as any) ?? {};
      setDone({ application_no: res.application_no ?? "—" });
      toast.success("Application submitted", { description: `Reference ${res.application_no ?? ""}` });
    } finally { setSubmitting(false); }
  };

  if (done) {
    return (
      <RetailerShell>
        <div className="mx-auto max-w-xl space-y-5">
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
            <CheckCircle2 className="mx-auto h-14 w-14 text-india-green" />
            <h2 className="mt-3 text-xl font-extrabold">Application Submitted</h2>
            <p className="mt-1 text-sm text-muted-foreground">Your application has been received and is now under review.</p>
            <p className="mt-4 inline-block rounded-lg bg-muted px-4 py-2 font-mono text-sm font-bold">{done.application_no}</p>
            <div className="mt-6 flex justify-center gap-2">
              <PrimaryButton onClick={() => navigate({ to: "/applications" })}>View My Applications</PrimaryButton>
              <button onClick={() => { setDone(null); setF({ full_name: "", father_name: "", gender: "", email: "", phone: "", address: "", aadhaar_number: "", pan_number: "", category_id: "", service_id: "" }); }} className="rounded-lg border border-border px-4 text-sm font-semibold hover:bg-muted">New Application</button>
            </div>
          </div>
        </div>
      </RetailerShell>
    );
  }

  return (
    <RetailerShell>
      <div className="max-w-3xl space-y-5">
        <PageHeader icon={<PlusCircle className="h-5 w-5" />} title="New Application Form" subtitle="Apply for a service. Charges and commission are shown automatically." />
        <SectionCard title="Applicant Details">
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading services…</div>
          ) : (
            <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
              <Field label="Full Name *"><Input value={f.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="Applicant full name" /></Field>
              <Field label="Father's Name"><Input value={f.father_name} onChange={(e) => set("father_name", e.target.value)} placeholder="Father's name" /></Field>
              <Field label="Gender">
                <Select value={f.gender} onChange={(e) => set("gender", e.target.value)}>
                  <option value="">Select gender</option><option>Male</option><option>Female</option><option>Other</option>
                </Select>
              </Field>
              <Field label="Email"><Input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="name@example.com" /></Field>
              <Field label="Phone"><Input value={f.phone} onChange={(e) => set("phone", e.target.value.replace(/\D/g, ""))} maxLength={10} placeholder="10-digit mobile" /></Field>
              <Field label="Aadhaar Number *"><Input value={f.aadhaar_number} onChange={(e) => set("aadhaar_number", e.target.value.replace(/\D/g, ""))} maxLength={12} placeholder="12-digit Aadhaar" /></Field>
              <Field label="PAN Number"><Input value={f.pan_number} onChange={(e) => set("pan_number", e.target.value.toUpperCase())} maxLength={10} placeholder="ABCDE1234F" /></Field>
              <div className="sm:col-span-2">
                <Field label="Address"><textarea rows={2} value={f.address} onChange={(e) => set("address", e.target.value)} className="w-full rounded-lg border border-input bg-background p-3 text-sm shadow-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-india-green/15 focus-visible:border-india-green" placeholder="Full address" /></Field>
              </div>

              <Field label="Category *">
                <Select value={f.category_id} onChange={(e) => { set("category_id", e.target.value); set("service_id", ""); }}>
                  <option value="">Select category</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label="Service *">
                <Select value={f.service_id} onChange={(e) => set("service_id", e.target.value)} disabled={!f.category_id}>
                  <option value="">{f.category_id ? "Select service" : "Select category first"}</option>
                  {catServices.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </Field>

              <Field label="Service Charge"><Input readOnly value={service ? inr(service.service_charge) : "—"} className="bg-muted font-semibold" /></Field>
              <Field label="Commission Price"><Input readOnly value={service ? inr(service.retailer_commission) : "—"} className="bg-muted font-semibold text-india-green" /></Field>

              {service && (
                <div className="sm:col-span-2 flex items-center gap-2 rounded-lg bg-india-green/5 px-3 py-2 text-xs text-muted-foreground">
                  <IndianRupee className="h-3.5 w-3.5 text-india-green" /> Pay <b className="mx-1 text-foreground">{inr(service.service_charge)}</b> · You earn <b className="mx-1 text-india-green">{inr(service.retailer_commission)}</b> commission on completion.
                </div>
              )}

              <div className="sm:col-span-2 flex justify-end border-t border-border pt-3">
                <PrimaryButton type="submit" disabled={submitting}>{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Submit Application</PrimaryButton>
              </div>
            </form>
          )}
        </SectionCard>
      </div>
    </RetailerShell>
  );
}
