import { createFileRoute } from "@tanstack/react-router";
import { DistributorShell } from "@/components/distributor/distributor-shell";
import { DistributorSalesReal } from "@/components/distributor/distributor-real";
export const Route = createFileRoute("/distributor/sales-dashboard")({
  head: () => ({ meta: [{ title: "Sales Dashboard — BharatOne Distributor" }] }),
  component: () => (<DistributorShell><DistributorSalesReal /></DistributorShell>),
});
