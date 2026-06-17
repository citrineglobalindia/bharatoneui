import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { AccountantShell } from "@/components/accountant/accountant-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { WalletAdmin } from "@/components/admin/wallet-admin";

export const Route = createFileRoute("/accountant/wallet-requests")({
  head: () => ({ meta: [{ title: "Wallet Requests — BharatOne Accountant" }] }),
  component: () => (
    <AccountantShell>
      <div className="space-y-5">
        <PageHeader icon={<Wallet className="h-5 w-5" />} title="Wallet Requests" subtitle="Verify retailer top-up requests or top-up a wallet directly." />
        <WalletAdmin />
      </div>
    </AccountantShell>
  ),
});
