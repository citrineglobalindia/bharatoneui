import { createFileRoute } from "@tanstack/react-router";
import { Banknote } from "lucide-react";
import { AccountantShell } from "@/components/accountant/accountant-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { Payouts } from "@/components/admin/aeps-admin";
import { AepsBankChanges } from "@/components/admin/aeps-bank-changes";

export const Route = createFileRoute("/accountant/aeps-payouts")({
  head: () => ({ meta: [{ title: "AEPS Payouts — BharatOne Accountant" }] }),
  component: () => (
    <AccountantShell>
      <div className="space-y-5">
        <PageHeader
          icon={<Banknote className="h-5 w-5" />}
          title="AEPS Payouts"
          subtitle="Approve retailer AEPS wallet withdrawals and record the bank UTR."
        />
        <Payouts />
        <AepsBankChanges />
      </div>
    </AccountantShell>
  ),
});
