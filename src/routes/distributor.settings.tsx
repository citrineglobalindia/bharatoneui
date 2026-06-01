import { createFileRoute } from "@tanstack/react-router";
import { DistributorSettings } from "@/components/distributor/distributor-extras";

export const Route = createFileRoute("/distributor/settings")({
  head: () => ({ meta: [{ title: "Settings — Distributor Portal" }] }),
  component: DistributorSettings,
});
