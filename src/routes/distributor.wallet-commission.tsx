import { createFileRoute } from "@tanstack/react-router";
import { DistributorShell } from "@/components/distributor/distributor-shell";
import { DistributorWalletCommission } from "@/components/distributor/distributor-wallet-commission";

export const Route = createFileRoute("/distributor/wallet-commission")({
  head: () => ({ meta: [{ title: "Wallet & Commission Reports — BharatOne Distributor" }] }),
  component: () => (<DistributorShell><DistributorWalletCommission /></DistributorShell>),
});
