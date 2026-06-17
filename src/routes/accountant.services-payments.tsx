import { createFileRoute } from "@tanstack/react-router";
import { Receipt } from "lucide-react";
import { AccountantShell } from "@/components/accountant/accountant-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { ApplicationLedger } from "@/components/admin/application-ledger";

export const Route = createFileRoute("/accountant/services-payments")({
  head: () => ({ meta: [{ title: "Services Payments — BharatOne Accountant" }] }),
  component: () => (
    <AccountantShell>
      <div className="space-y-5">
        <PageHeader icon={<Receipt className="h-5 w-5" />} title="Services Payments" subtitle="All service application payments — verify the payment and approve the transaction." />
        <ApplicationLedger />
      </div>
    </AccountantShell>
  ),
});
