import { createFileRoute } from "@tanstack/react-router";
import { Bell, Settings as SettingsIcon, User } from "lucide-react";
import { QcShell } from "@/components/qc/qc-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { AccountSettings } from "@/components/account/account-settings";

export const Route = createFileRoute("/qc/change-password")({
  head: () => ({ meta: [{ title: "Change Password — BharatOne" }] }),
  component: Page,
});

function Page() {
  return (
    <QcShell>
      <div className="space-y-5">
        <PageHeader icon={<SettingsIcon className="h-5 w-5" />} title="Change Password" subtitle="Update your password" />
        <AccountSettings />
      </div>
    </QcShell>
  );
}
