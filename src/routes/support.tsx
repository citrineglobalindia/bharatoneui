import { createFileRoute } from "@tanstack/react-router";
import { LifeBuoy } from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { SupportCenter } from "@/components/support-center";

export const Route = createFileRoute("/support")({
  head: () => ({ meta: [{ title: "Support — BharatOne" }] }),
  component: () => (
    <RetailerShell>
      <div className="space-y-5">
        <PageHeader icon={<LifeBuoy className="h-5 w-5" />} title="Support" subtitle="Reach our team or raise a ticket — we usually respond within minutes." />
        <SupportCenter />
      </div>
    </RetailerShell>
  ),
});
