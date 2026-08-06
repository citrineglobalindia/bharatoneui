import { createFileRoute } from "@tanstack/react-router";
import { Settings as SettingsIcon } from "lucide-react";
import { RegionalShell, DRO_CONFIG } from "@/components/regional/regional-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { AccountSettings } from "@/components/account/account-settings";

/**
 * DRO had a profile page but no settings page, so there was nowhere to change a
 * password or manage two-factor authentication — despite the role being one
 * that two-factor is mandatory for.
 */
export const Route = createFileRoute("/dro/settings")({
  head: () => ({ meta: [{ title: "Settings — DRO Portal" }] }),
  component: Page,
});

function Page() {
  return (
    <RegionalShell cfg={DRO_CONFIG}>
      <div className="space-y-5">
        <PageHeader icon={<SettingsIcon className="h-5 w-5" />} title="Settings" subtitle="Your account, security and notification settings" />
        <AccountSettings />
      </div>
    </RegionalShell>
  );
}
