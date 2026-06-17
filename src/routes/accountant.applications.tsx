import { createFileRoute } from "@tanstack/react-router";
import { Receipt } from "lucide-react";
import { AccountantShell } from "@/components/accountant/accountant-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { ServiceApplicationsView } from "@/components/admin/service-applications-view";

export const Route = createFileRoute("/accountant/applications")({
  head: () => ({ meta: [{ title: "Application Transactions — BharatOne Accountant" }] }),
  component: () => (
    <AccountantShell>
      <div className="space-y-5">
        <PageHeader icon={<Receipt className="h-5 w-5" />} title="Application Transactions" subtitle="Review service applications and approve their transactions." />
        <ServiceApplicationsView />
      </div>
    </AccountantShell>
  ),
});
