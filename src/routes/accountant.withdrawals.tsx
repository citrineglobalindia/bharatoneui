import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpFromLine } from "lucide-react";
import { AccountantShell } from "@/components/accountant/accountant-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { WithdrawalsAdmin } from "@/components/admin/withdrawals-admin";

export const Route = createFileRoute("/accountant/withdrawals")({
  head: () => ({ meta: [{ title: "Withdrawals — BharatOne Accountant" }] }),
  component: () => (
    <AccountantShell>
      <div className="space-y-5">
        <PageHeader icon={<ArrowUpFromLine className="h-5 w-5" />} title="Withdrawals" subtitle="Process retailer payout requests." />
        <WithdrawalsAdmin />
      </div>
    </AccountantShell>
  ),
});
