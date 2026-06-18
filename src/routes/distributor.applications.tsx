import { createFileRoute } from "@tanstack/react-router";
import { DistributorShell } from "@/components/distributor/distributor-shell";
import { DistributorApplicationsReal } from "@/components/distributor/distributor-real";
export const Route = createFileRoute("/distributor/applications")({
  head: () => ({ meta: [{ title: "Applications — BharatOne Distributor" }] }),
  component: () => (<DistributorShell><DistributorApplicationsReal /></DistributorShell>),
});
