import { createFileRoute } from "@tanstack/react-router";
import { DistributorShell } from "@/components/distributor/distributor-shell";
import { DistributorSalesReal } from "@/components/distributor/distributor-real";
export const Route = createFileRoute("/distributor/reports")({
  head: () => ({ meta: [{ title: "Reports — BharatOne Distributor" }] }),
  component: () => (<DistributorShell><DistributorSalesReal /></DistributorShell>),
});
