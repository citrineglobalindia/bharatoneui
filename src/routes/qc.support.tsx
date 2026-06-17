import { createFileRoute } from "@tanstack/react-router";
import { LifeBuoy } from "lucide-react";
import { QcShell } from "@/components/qc/qc-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { SupportCenter } from "@/components/support-center";

export const Route = createFileRoute("/qc/support")({
  head: () => ({ meta: [{ title: "Support — QC Portal" }] }),
  component: () => (
    <QcShell>
      <div className="space-y-5">
        <PageHeader icon={<LifeBuoy className="h-5 w-5" />} title="Support" subtitle="Reach our team or raise a ticket." />
        <SupportCenter />
      </div>
    </QcShell>
  ),
});
