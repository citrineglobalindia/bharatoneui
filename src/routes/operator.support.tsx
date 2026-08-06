import { createFileRoute } from "@tanstack/react-router";
import { LifeBuoy } from "lucide-react";
import { OperatorShell } from "@/components/operator/operator-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { SupportCenter } from "@/components/support-center";

export const Route = createFileRoute("/operator/support")({
  head: () => ({ meta: [{ title: "Support — Operator Portal" }] }),
  component: () => (
    <OperatorShell>
      <div className="space-y-5">
        <PageHeader icon={<LifeBuoy className="h-5 w-5" />} title="Support" subtitle="Reach our team or raise a ticket." />
        <SupportCenter />
      </div>
    </OperatorShell>
  ),
});
