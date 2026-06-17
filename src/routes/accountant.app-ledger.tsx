import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { AccountantShell } from "@/components/accountant/accountant-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { ApplicationLedger } from "@/components/admin/application-ledger";

export const Route = createFileRoute("/accountant/app-ledger")({
  head: () => ({ meta: [{ title: "Application Ledger — BharatOne Accountant" }] }),
  component: () => (
    <AccountantShell>
      <div className="space-y-5">
        <PageHeader icon={<Wallet className="h-5 w-5" />} title="Application Ledger" subtitle="Service application amounts and commissions. Verify each payment." />
        <ApplicationLedger />
      </div>
    </AccountantShell>
  ),
});
