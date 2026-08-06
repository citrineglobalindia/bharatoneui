import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { OperatorShell } from "@/components/operator/operator-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { AccountSettings } from "@/components/account/account-settings";

export const Route = createFileRoute("/operator/settings")({
  head: () => ({ meta: [{ title: "Settings — Operator Portal" }] }),
  component: () => (
    <OperatorShell>
      <div className="space-y-5">
        <PageHeader icon={<Settings className="h-5 w-5" />} title="Settings" subtitle="Manage your account and request profile changes" />
        <AccountSettings />
      </div>
    </OperatorShell>
  ),
});
