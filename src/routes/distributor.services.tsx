import { createFileRoute } from "@tanstack/react-router";
import { DistributorShell } from "@/components/distributor/distributor-shell";
import { DistributorServicesReal } from "@/components/distributor/distributor-real";
export const Route = createFileRoute("/distributor/services")({
  head: () => ({ meta: [{ title: "Services Live — BharatOne Distributor" }] }),
  validateSearch: (s: Record<string, unknown>): { cat?: string } => ({ cat: typeof s.cat === "string" ? s.cat : undefined }),
  component: ServicesLive,
});

function ServicesLive() {
  const { cat } = Route.useSearch();
  return (<DistributorShell><DistributorServicesReal initialCat={cat} /></DistributorShell>);
}
