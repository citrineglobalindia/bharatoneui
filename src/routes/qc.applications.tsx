import { createFileRoute } from "@tanstack/react-router";
import { Receipt } from "lucide-react";
import { QcShell } from "@/components/qc/qc-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { ServiceApplicationsView } from "@/components/admin/service-applications-view";

export const Route = createFileRoute("/qc/applications")({
  head: () => ({ meta: [{ title: "Application Transactions — QC Portal" }] }),
  component: () => (
    <QcShell>
      <div className="space-y-5">
        <PageHeader icon={<Receipt className="h-5 w-5" />} title="Application Transactions" subtitle="Review service applications and verify their transactions." />
        <ServiceApplicationsView />
      </div>
    </QcShell>
  ),
});
