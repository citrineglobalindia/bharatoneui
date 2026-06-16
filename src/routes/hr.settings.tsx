import { createFileRoute } from "@tanstack/react-router";
import { Settings as SettingsIcon } from "lucide-react";
import { HrShell } from "@/components/hr/hr-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { AccountSettings } from "@/components/account/account-settings";

export const Route = createFileRoute("/hr/settings")({
  head: () => ({ meta: [{ title: "Settings — BharatOne" }] }),
  component: Page,
});

function Page() {
  return (
    <HrShell>
      <div className="space-y-5">
        <PageHeader icon={<SettingsIcon className="h-5 w-5" />} title="Settings" subtitle="Account and notification settings" />
        <AccountSettings />
      </div>
    </HrShell>
  );
}
