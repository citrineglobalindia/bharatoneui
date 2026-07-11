import { createFileRoute } from "@tanstack/react-router";
import { CreditCard } from "lucide-react";
import { AccountantShell } from "@/components/accountant/accountant-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { RazorpayLedger } from "@/components/accountant/razorpay-ledger";

export const Route = createFileRoute("/accountant/razorpay-payments")({
  head: () => ({ meta: [{ title: "Razorpay Payments — BharatOne Accountant" }] }),
  component: () => (
    <AccountantShell>
      <div className="space-y-5">
        <PageHeader icon={<CreditCard className="h-5 w-5" />} title="Razorpay Payments" subtitle="Reconcile online (Razorpay) payments — verify and credit retailer wallets." />
        <RazorpayLedger />
      </div>
    </AccountantShell>
  ),
});
