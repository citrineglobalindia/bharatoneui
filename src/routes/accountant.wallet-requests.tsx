import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { AccountantShell } from "@/components/accountant/accountant-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { WalletAdmin } from "@/components/admin/wallet-admin";
import { RazorpayLedger } from "@/components/accountant/razorpay-ledger";

export const Route = createFileRoute("/accountant/wallet-requests")({
  head: () => ({ meta: [{ title: "Wallet Requests — BharatOne Accountant" }] }),
  component: () => (
    <AccountantShell>
      <div className="space-y-5">
        <PageHeader icon={<Wallet className="h-5 w-5" />} title="Wallet Requests & Payments" subtitle="Verify manual top-up requests, and reconcile online (Razorpay) payments." />
        <WalletAdmin />
        <RazorpayLedger />
      </div>
    </AccountantShell>
  ),
});
