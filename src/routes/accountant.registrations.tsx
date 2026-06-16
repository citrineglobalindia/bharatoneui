import { createFileRoute } from "@tanstack/react-router";
import { ReceiptText } from "lucide-react";
import { AccountantShell } from "@/components/accountant/accountant-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { RegistrationsReview } from "@/components/registrations/registrations-review";

export const Route = createFileRoute("/accountant/registrations")({
  head: () => ({ meta: [{ title: "Registration Payments — BharatOne Accountant" }] }),
  component: RegistrationsPage,
});

function RegistrationsPage() {
  return (
    <AccountantShell>
      <div className="space-y-5">
        <PageHeader
          icon={<ReceiptText className="h-5 w-5" />}
          title="Registration Payments"
          subtitle="Verify whether the registration fee was received, then pass to QC and Admin."
        />
        <RegistrationsReview />
      </div>
    </AccountantShell>
  );
}
