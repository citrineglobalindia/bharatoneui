import { createFileRoute } from "@tanstack/react-router";
import { Network } from "lucide-react";
import { AccountantShell } from "@/components/accountant/accountant-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { DistributorApplications } from "@/components/admin/distributor-applications";

export const Route = createFileRoute("/accountant/distributor-applications")({
  head: () => ({ meta: [{ title: "Distributor Applications — BharatOne Accountant" }] }),
  component: DistributorApplicationsPage,
});

function DistributorApplicationsPage() {
  return (
    <AccountantShell>
      <div className="space-y-5">
        <PageHeader
          icon={<Network className="h-5 w-5" />}
          title="Distributor Applications"
          subtitle="Self-registered distributors awaiting verification. Admin performs the final approval."
        />
        <DistributorApplications />
      </div>
    </AccountantShell>
  );
}
