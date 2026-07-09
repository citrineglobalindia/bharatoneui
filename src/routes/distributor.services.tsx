import { createFileRoute } from "@tanstack/react-router";
import { DistributorShell } from "@/components/distributor/distributor-shell";
import { DistributorServicesReal } from "@/components/distributor/distributor-real";
export const Route = createFileRoute("/distributor/services")({
  head: () => ({ meta: [{ title: "Services Live — BharatOne Distributor" }] }),
  validateSearch: (s: Record<string, unknown>): { sc?: string } => ({ sc: typeof s.sc === "string" ? s.sc : undefined }),
  component: ServicesLive,
});

function ServicesLive() {
  const { sc } = Route.useSearch();
  return (<DistributorShell><DistributorServicesReal initialSc={sc} /></DistributorShell>);
}
