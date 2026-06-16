import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCheck } from "lucide-react";
import { QcShell } from "@/components/qc/qc-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { RegistrationsReview } from "@/components/registrations/registrations-review";

export const Route = createFileRoute("/qc/kyc-queue")({
  head: () => ({ meta: [{ title: "KYC Queue — QC Portal" }] }),
  component: KycQueuePage,
});

function KycQueuePage() {
  return (
    <QcShell>
      <div className="space-y-5">
        <PageHeader
          icon={<ClipboardCheck className="h-5 w-5" />}
          title="KYC Verification Queue"
          subtitle="Verify retailer KYC documents. Verified + paid applications go to Admin for approval."
        />
        <RegistrationsReview />
      </div>
    </QcShell>
  );
}
