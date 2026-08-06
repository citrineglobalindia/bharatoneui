import { createFileRoute } from "@tanstack/react-router";
import { User } from "lucide-react";
import { OperatorShell } from "@/components/operator/operator-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { AccountProfile } from "@/components/account/account-profile";

export const Route = createFileRoute("/operator/profile")({
  head: () => ({ meta: [{ title: "My Profile — Operator Portal" }] }),
  component: () => (
    <OperatorShell>
      <div className="space-y-5">
        <PageHeader icon={<User className="h-5 w-5" />} title="My Profile" subtitle="Your account details" />
        <AccountProfile />
      </div>
    </OperatorShell>
  ),
});
