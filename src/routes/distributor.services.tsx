import { createFileRoute } from "@tanstack/react-router";
import { DistributorShell } from "@/components/distributor/distributor-shell";
import { DistributorServicesReal } from "@/components/distributor/distributor-real";
export const Route = createFileRoute("/distributor/services")({
  head: () => ({ meta: [{ title: "Services Live — BharatOne Distributor" }] }),
  component: () => (<DistributorShell><DistributorServicesReal /></DistributorShell>),
});
