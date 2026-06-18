import { createFileRoute } from "@tanstack/react-router";
import { DistributorShell } from "@/components/distributor/distributor-shell";
import { DistributorRetailersReal } from "@/components/distributor/distributor-real";
export const Route = createFileRoute("/distributor/retailers/")({
  component: () => (<DistributorShell><DistributorRetailersReal /></DistributorShell>),
});
