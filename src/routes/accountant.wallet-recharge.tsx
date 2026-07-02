import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { AccountantShell } from "@/components/accountant/accountant-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { WalletRecharge } from "@/components/accountant/wallet-recharge";

export const Route = createFileRoute("/accountant/wallet-recharge")({
  head: () => ({ meta: [{ title: "Wallet Recharge — BharatOne Accountant" }] }),
  component: () => (
    <AccountantShell>
      <div className="space-y-5">
        <PageHeader icon={<Wallet className="h-5 w-5" />} title="Wallet Recharge" subtitle="Recharge a retailer's wallet directly with a generated Wallet Recharge ID." />
        <WalletRecharge />
      </div>
    </AccountantShell>
  ),
});
