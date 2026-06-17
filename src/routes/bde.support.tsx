import { createFileRoute } from "@tanstack/react-router";
import { LifeBuoy } from "lucide-react";
import { BdeShell } from "@/components/bde/bde-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { SupportCenter } from "@/components/support-center";
export const Route = createFileRoute("/bde/support")({
  head: () => ({ meta: [{ title: "Support — BharatOne BDE" }] }),
  component: () => (<BdeShell><div className="space-y-5"><PageHeader icon={<LifeBuoy className="h-5 w-5" />} title="Support" subtitle="Reach our team or raise a ticket." /><SupportCenter /></div></BdeShell>),
});
