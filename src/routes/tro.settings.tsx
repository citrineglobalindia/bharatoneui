import { createFileRoute } from "@tanstack/react-router";
import { Settings as SettingsIcon } from "lucide-react";
import { RegionalShell, TRO_CONFIG } from "@/components/regional/regional-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { AccountSettings } from "@/components/account/account-settings";

/**
 * TRO had a profile page but no settings page. Two-factor is mandatory for the
 * role, so there needs to be somewhere to set it up and to move it to a new
 * phone. No TRO account exists yet — the first one created lands on a portal
 * that already has this.
 */
export const Route = createFileRoute("/tro/settings")({
  head: () => ({ meta: [{ title: "Settings — TRO Portal" }] }),
  component: Page,
});

function Page() {
  return (
    <RegionalShell cfg={TRO_CONFIG}>
      <div className="space-y-5">
        <PageHeader icon={<SettingsIcon className="h-5 w-5" />} title="Settings" subtitle="Your account, security and notification settings" />
        <AccountSettings />
      </div>
    </RegionalShell>
  );
}
