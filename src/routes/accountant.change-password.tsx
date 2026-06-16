import { createFileRoute } from "@tanstack/react-router";
import { Bell, Settings as SettingsIcon, User } from "lucide-react";
import { AccountantShell } from "@/components/accountant/accountant-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { AccountSettings } from "@/components/account/account-settings";

export const Route = createFileRoute("/accountant/change-password")({
  head: () => ({ meta: [{ title: "Change Password — BharatOne" }] }),
  component: Page,
});

function Page() {
  return (
    <AccountantShell>
      <div className="space-y-5">
        <PageHeader icon={<SettingsIcon className="h-5 w-5" />} title="Change Password" subtitle="Update your password" />
        <AccountSettings />
      </div>
    </AccountantShell>
  );
}
