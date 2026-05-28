import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { CheckCircle2, Fingerprint, Upload, ShieldCheck } from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { SectionCard, Field, Input, Select, PrimaryButton } from "@/components/retailer/section-card";

export const Route = createFileRoute("/aeps-activation")({
  head: () => ({ meta: [{ title: "AEPS Activation — BharatOne" }] }),
  component: AepsActivationPage,
});

const STEPS = [
  { n: 1, label: "Profile & KYC", done: true },
  { n: 2, label: "Bank Details", done: true },
  { n: 3, label: "Biometric Onboarding", done: false },
  { n: 4, label: "NPCI Approval", done: false },
];

function AepsActivationPage() {
  return (
    <RetailerShell>
      <div className="space-y-5 max-w-5xl">
        <PageHeader
          icon={<CheckCircle2 className="h-5 w-5" />}
          title="AEPS Activation"
          subtitle="Complete the onboarding to start AEPS withdrawals and Aadhaar Pay"
          badge={<span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-[11px] font-semibold">In Progress · Step 3 of 4</span>}
        />

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="grid grid-cols-4 gap-2">
            {STEPS.map((s) => (
              <div key={s.n} className="text-center">
                <div className={`h-10 w-10 mx-auto rounded-full flex items-center justify-center text-sm font-bold ${
                  s.done ? "bg-india-green text-white" : s.n === 3 ? "bg-saffron-gradient text-white" : "bg-muted text-muted-foreground"
                }`}>{s.done ? "✓" : s.n}</div>
                <p className="text-[11px] font-semibold mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="relative mt-3 h-1 rounded-full bg-muted overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-saffron-gradient" style={{ width: "62%" }} />
          </div>
        </div>

        <SectionCard title="Biometric Device Onboarding" description="Register your fingerprint scanner with NPCI for AEPS authentication">
          <form onSubmit={(e) => { e.preventDefault(); toast.success("Activation request submitted for review."); }} className="grid sm:grid-cols-2 gap-3">
            <Field label="Device Brand">
              <Select>
                <option>Morpho</option><option>Mantra</option><option>Startek</option><option>Precision</option>
              </Select>
            </Field>
            <Field label="Device Model"><Input placeholder="MSO 1300 E3" /></Field>
            <Field label="Device Serial Number"><Input placeholder="MSO-1300-XXXXXX" /></Field>
            <Field label="RD Service Version"><Input placeholder="v2.0.5" /></Field>
            <Field label="Operator Aadhaar (Yours)"><Input placeholder="XXXX XXXX XXXX" /></Field>
            <Field label="Operator PAN"><Input placeholder="ABCDE1234F" /></Field>
            <div className="sm:col-span-2">
              <Field label="Upload Device Invoice">
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-4">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Drop PDF/JPG · max 5 MB</p>
                </div>
              </Field>
            </div>
            <div className="sm:col-span-2 flex items-center justify-between pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Approval typically within 24-48 hours
              </p>
              <PrimaryButton type="submit"><Fingerprint className="h-4 w-4" /> Submit for Activation</PrimaryButton>
            </div>
          </form>
        </SectionCard>
      </div>
    </RetailerShell>
  );
}