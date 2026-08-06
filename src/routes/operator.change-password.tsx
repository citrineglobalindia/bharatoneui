import { createFileRoute } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";
import { OperatorShell } from "@/components/operator/operator-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { AccountSettings } from "@/components/account/account-settings";

export const Route = createFileRoute("/operator/change-password")({
  head: () => ({ meta: [{ title: "Change Password — Operator Portal" }] }),
  component: () => (
    <OperatorShell>
      <div className="space-y-5">
        <PageHeader icon={<KeyRound className="h-5 w-5" />} title="Change Password" subtitle="Reset your password securely with an OTP" />
        <AccountSettings />
      </div>
    </OperatorShell>
  ),
});
