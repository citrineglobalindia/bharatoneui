import { createFileRoute } from "@tanstack/react-router";
import { Settings as SettingsIcon } from "lucide-react";
import { StoreShell } from "@/components/store/store-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { AccountSettings } from "@/components/account/account-settings";

/**
 * The Store portal had no account screen at all — five operational pages and
 * no way to change a password or set up two-factor. store_staff is inside the
 * two-factor policy, so the first person given the role would have been forced
 * to enrol at login with nowhere to manage it afterwards.
 */
export const Route = createFileRoute("/store/settings")({
  head: () => ({ meta: [{ title: "Settings — Store Portal" }] }),
  component: Page,
});

function Page() {
  return (
    <StoreShell>
      <div className="space-y-5">
        <PageHeader icon={<SettingsIcon className="h-5 w-5" />} title="Settings" subtitle="Your account, security and notification settings" />
        <AccountSettings />
      </div>
    </StoreShell>
  );
}
