import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";
import { DistributorShell } from "@/components/distributor/distributor-shell";
import { DistributorOfficersReal } from "@/components/distributor/distributor-real";
export const Route = createFileRoute("/distributor/officers")({
  head: () => ({ meta: [{ title: "Field Agents — BharatOne Distributor" }] }),
  component: Page,
});
function Page() {
  const matches = useMatches();
  const isChild = matches.some((m) => m.routeId.includes("officers/$id") || m.routeId.includes("officers.$id"));
  if (isChild) return <Outlet />;
  return (<DistributorShell><DistributorOfficersReal /></DistributorShell>);
}
