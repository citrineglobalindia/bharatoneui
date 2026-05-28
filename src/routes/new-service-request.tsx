import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PlusCircle, Send } from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { SectionCard, Field, Input, Select, PrimaryButton } from "@/components/retailer/section-card";

export const Route = createFileRoute("/new-service-request")({
  head: () => ({ meta: [{ title: "New Service Request — BharatOne" }] }),
  component: NewRequestPage,
});

function NewRequestPage() {
  return (
    <RetailerShell>
      <div className="space-y-5 max-w-3xl">
        <PageHeader icon={<PlusCircle className="h-5 w-5" />} title="New Service Request" subtitle="Request activation for a new service or business filing" />
        <SectionCard title="Request Details">
          <form onSubmit={(e) => { e.preventDefault(); toast.success("Request submitted. Our team will reach out shortly."); }} className="grid sm:grid-cols-2 gap-3">
            <Field label="Service">
              <Select>
                <option>GST Registration</option><option>PAN Application</option><option>Udyam / MSME</option>
                <option>FSSAI License</option><option>ITR Filing</option><option>Digital Signature</option>
                <option>Trade License</option><option>Shop Act</option>
              </Select>
            </Field>
            <Field label="Priority">
              <Select><option>Standard (3-5 days)</option><option>Express (24-48 hrs)</option></Select>
            </Field>
            <Field label="Applicant Name"><Input placeholder="Full name" /></Field>
            <Field label="Mobile"><Input placeholder="10-digit mobile" maxLength={10} /></Field>
            <Field label="Email"><Input type="email" placeholder="name@example.com" /></Field>
            <Field label="Business Name (if any)"><Input placeholder="Firm name" /></Field>
            <div className="sm:col-span-2">
              <Field label="Notes for our team">
                <textarea rows={4} className="w-full rounded-lg border border-input bg-background p-3 text-sm shadow-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-india-green/15 focus-visible:border-india-green" placeholder="Anything we should know…" />
              </Field>
            </div>
            <div className="sm:col-span-2 flex justify-end pt-2 border-t border-border">
              <PrimaryButton type="submit"><Send className="h-4 w-4" /> Submit Request</PrimaryButton>
            </div>
          </form>
        </SectionCard>
      </div>
    </RetailerShell>
  );
}