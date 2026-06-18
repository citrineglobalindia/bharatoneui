import { createFileRoute } from "@tanstack/react-router";
import { DistributorShell } from "@/components/distributor/distributor-shell";
import { RetailerMap } from "@/components/admin/retailer-map";
export const Route = createFileRoute("/distributor/network")({
  head: () => ({ meta: [{ title: "Network Map — BharatOne Distributor" }] }),
  component: () => (<DistributorShell><RetailerMap scope="distributor" /></DistributorShell>),
});
