import { createFileRoute } from "@tanstack/react-router";
import { DistributorShell } from "@/components/distributor/distributor-shell";
import { DistributorCommissionsReal } from "@/components/distributor/distributor-real";
export const Route = createFileRoute("/distributor/commissions")({
  head: () => ({ meta: [{ title: "Commissions — BharatOne Distributor" }] }),
  component: () => (<DistributorShell><DistributorCommissionsReal /></DistributorShell>),
});
