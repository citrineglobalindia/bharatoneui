import { createFileRoute } from "@tanstack/react-router";
import { User } from "lucide-react";
import { RegionalShell, TRO_CONFIG } from "@/components/regional/regional-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { AccountProfile } from "@/components/account/account-profile";

export const Route = createFileRoute("/tro/profile")({
  head: () => ({ meta: [{ title: "My Profile — BharatOne" }] }),
  component: Page,
});

function Page() {
  return (
    <RegionalShell cfg={TRO_CONFIG}>
      <div className="space-y-5">
        <PageHeader icon={<User className="h-5 w-5" />} title="My Profile" subtitle="Your account details" />
        <AccountProfile />
      </div>
    </RegionalShell>
  );
}
