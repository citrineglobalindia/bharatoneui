import { createFileRoute } from "@tanstack/react-router";
import { DistributorShell } from "@/components/distributor/distributor-shell";
import { DistributorDashboardReal } from "@/components/distributor/distributor-real";
export const Route = createFileRoute("/distributor/dashboard")({
  head: () => ({ meta: [{ title: "Distributor Dashboard — BharatOne" }] }),
  component: () => (<DistributorShell><DistributorDashboardReal /></DistributorShell>),
});
