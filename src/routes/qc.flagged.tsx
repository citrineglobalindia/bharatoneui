import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { QcShell } from "@/components/qc/qc-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { RegistrationsReview } from "@/components/registrations/registrations-review";
export const Route = createFileRoute("/qc/flagged")({
  head: () => ({ meta: [{ title: "Flagged Cases — QC Portal" }] }),
  component: () => (<QcShell><div className="space-y-5"><PageHeader icon={<ShieldCheck className="h-5 w-5" />} title="Flagged Cases" subtitle="Rejected and flagged registrations." /><RegistrationsReview /></div></QcShell>),
});
