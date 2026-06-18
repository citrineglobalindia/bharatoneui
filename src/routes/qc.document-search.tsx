import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { QcShell } from "@/components/qc/qc-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { RegistrationsReview } from "@/components/registrations/registrations-review";
export const Route = createFileRoute("/qc/document-search")({
  head: () => ({ meta: [{ title: "Document Search — QC Portal" }] }),
  component: () => (<QcShell><div className="space-y-5"><PageHeader icon={<ShieldCheck className="h-5 w-5" />} title="Document Search" subtitle="Search across all retailer registrations and documents." /><RegistrationsReview /></div></QcShell>),
});
