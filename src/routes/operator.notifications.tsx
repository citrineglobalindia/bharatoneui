import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { OperatorShell } from "@/components/operator/operator-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { NotificationsList } from "@/components/account/notifications-list";

export const Route = createFileRoute("/operator/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Operator Portal" }] }),
  component: () => (
    <OperatorShell>
      <div className="space-y-5">
        <PageHeader icon={<Bell className="h-5 w-5" />} title="Notifications" subtitle="Updates on applications assigned to you" />
        <NotificationsList />
      </div>
    </OperatorShell>
  ),
});
