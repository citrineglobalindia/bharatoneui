import { createFileRoute } from "@tanstack/react-router";
import { IdCard } from "lucide-react";
import { QcShell } from "@/components/qc/qc-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { JskoManager } from "@/components/admin/jsko-manager";
export const Route = createFileRoute("/qc/jsko")({
  head: () => ({ meta: [{ title: "Old JSKO IDs — QC Portal" }] }),
  component: () => (<QcShell><div className="space-y-5"><PageHeader icon={<IdCard className="h-5 w-5" />} title="Old JSKO IDs" subtitle="Manage legacy JSKO IDs used in Old JSKO onboarding." /><JskoManager /></div></QcShell>),
});
