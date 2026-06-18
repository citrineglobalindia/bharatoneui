import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { DistributorShell } from "@/components/distributor/distributor-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { AccountProfile } from "@/components/account/account-profile";
import { AccountSettings } from "@/components/account/account-settings";
export const Route = createFileRoute("/distributor/settings")({
  head: () => ({ meta: [{ title: "Settings — BharatOne Distributor" }] }),
  component: () => (<DistributorShell><div className="space-y-5"><PageHeader icon={<Settings className="h-5 w-5" />} title="Settings" subtitle="Manage your profile and preferences." /><AccountProfile /><AccountSettings /></div></DistributorShell>),
});
