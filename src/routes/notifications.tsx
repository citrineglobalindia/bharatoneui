import { createFileRoute } from "@tanstack/react-router";
import { Bell, Settings as SettingsIcon, User } from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { NotificationsList } from "@/components/account/notifications-list";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — BharatOne" }] }),
  component: Page,
});

function Page() {
  return (
    <RetailerShell>
      <div className="space-y-5">
        <PageHeader icon={<Bell className="h-5 w-5" />} title="Notifications" subtitle="View all your alerts and updates" />
        <NotificationsList />
      </div>
    </RetailerShell>
  );
}
