// Accountant → Money Transfer.
//
// Every transfer takes money out of a retailer's wallet, so the accountant has
// to be able to see and export them. They get the monitor and nothing else: the
// master switch and the commission rates belong to an administrator.
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeftRight } from "lucide-react";
import { AccountantShell } from "@/components/accountant/accountant-shell";
import { DmtMonitor } from "@/components/admin/dmt-admin";

export const Route = createFileRoute("/accountant/money-transfer")({
  head: () => ({ meta: [{ title: "Money Transfer — BharatOne Accounts" }] }),
  component: () => (
    <AccountantShell>
      <div className="space-y-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-extrabold">
            <ArrowLeftRight className="h-5 w-5 text-india-green" /> Money Transfer
          </h1>
          <p className="text-sm text-muted-foreground">
            Every remittance sent from a retailer wallet, with the bank reference for reconciliation.
          </p>
        </div>
        <DmtMonitor />
      </div>
    </AccountantShell>
  ),
});
