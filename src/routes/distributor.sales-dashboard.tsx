import { createFileRoute } from "@tanstack/react-router";
import { DistributorShell } from "@/components/distributor/distributor-shell";
import { DistributorSalesDashboard } from "@/components/distributor/distributor-sales-dashboard";
export const Route = createFileRoute("/distributor/sales-dashboard")({
  head: () => ({ meta: [{ title: "Sales Dashboard — BharatOne Distributor" }] }),
  component: () => (<DistributorShell><DistributorSalesDashboard /></DistributorShell>),
});
