import { createFileRoute } from "@tanstack/react-router";
import { LifeBuoy } from "lucide-react";
import { RegionalShell, TRO_CONFIG } from "@/components/regional/regional-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { SupportCenter } from "@/components/support-center";
export const Route = createFileRoute("/tro/support")({
  head: () => ({ meta: [{ title: "Support — BharatOne TRO" }] }),
  component: () => (<RegionalShell cfg={TRO_CONFIG}><div className="space-y-5"><PageHeader icon={<LifeBuoy className="h-5 w-5" />} title="Support" subtitle="Reach our team or raise a ticket." /><SupportCenter /></div></RegionalShell>),
});
