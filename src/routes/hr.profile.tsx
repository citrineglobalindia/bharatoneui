import { createFileRoute } from "@tanstack/react-router";
import { User } from "lucide-react";
import { HrShell } from "@/components/hr/hr-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { AccountProfile } from "@/components/account/account-profile";

export const Route = createFileRoute("/hr/profile")({
  head: () => ({ meta: [{ title: "My Profile — BharatOne" }] }),
  component: Page,
});

function Page() {
  return (
    <HrShell>
      <div className="space-y-5">
        <PageHeader icon={<User className="h-5 w-5" />} title="My Profile" subtitle="Your account details" />
        <AccountProfile />
      </div>
    </HrShell>
  );
}
