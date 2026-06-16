import { createFileRoute } from "@tanstack/react-router";
import { Bell, Settings as SettingsIcon, User } from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { AccountSettings } from "@/components/account/account-settings";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — BharatOne" }] }),
  component: Page,
});

function Page() {
  return (
    <RetailerShell>
      <div className="space-y-5">
        <PageHeader icon={<SettingsIcon className="h-5 w-5" />} title="Settings" subtitle="Manage your account and preferences" />
        <AccountSettings />
      </div>
    </RetailerShell>
  );
}
