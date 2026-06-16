import { createFileRoute } from "@tanstack/react-router";
import { Bell, Settings as SettingsIcon, User } from "lucide-react";
import { AccountantShell } from "@/components/accountant/accountant-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { AccountProfile } from "@/components/account/account-profile";

export const Route = createFileRoute("/accountant/profile")({
  head: () => ({ meta: [{ title: "My Profile — BharatOne" }] }),
  component: Page,
});

function Page() {
  return (
    <AccountantShell>
      <div className="space-y-5">
        <PageHeader icon={<User className="h-5 w-5" />} title="My Profile" subtitle="Your account details" />
        <AccountProfile />
      </div>
    </AccountantShell>
  );
}
