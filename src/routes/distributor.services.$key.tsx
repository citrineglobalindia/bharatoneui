import { createFileRoute } from "@tanstack/react-router";
import { DistributorServiceDetail } from "@/components/distributor/distributor-extras";

export const Route = createFileRoute("/distributor/services/$key")({
  head: () => ({ meta: [{ title: "Service Details — Distributor Portal" }] }),
  component: DistributorServiceDetail,
});
