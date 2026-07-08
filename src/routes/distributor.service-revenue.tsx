import { createFileRoute } from "@tanstack/react-router";
import { DistributorShell } from "@/components/distributor/distributor-shell";
import { DistributorServiceRevenue } from "@/components/distributor/distributor-service-revenue";

export const Route = createFileRoute("/distributor/service-revenue")({
  head: () => ({ meta: [{ title: "Service-wise Revenue — BharatOne Distributor" }] }),
  component: () => (<DistributorShell><DistributorServiceRevenue /></DistributorShell>),
});
