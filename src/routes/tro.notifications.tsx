import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { RegionalShell, TRO_CONFIG } from "@/components/regional/regional-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { NotificationsList } from "@/components/account/notifications-list";

export const Route = createFileRoute("/tro/notifications")({
  head: () => ({ meta: [{ title: "Notifications — BharatOne" }] }),
  component: Page,
});

function Page() {
  return (
    <RegionalShell cfg={TRO_CONFIG}>
      <div className="space-y-5">
        <PageHeader icon={<Bell className="h-5 w-5" />} title="Notifications" subtitle="Your alerts and updates" />
        <NotificationsList />
      </div>
    </RegionalShell>
  );
}
