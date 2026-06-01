import { createFileRoute } from "@tanstack/react-router";
import { DistributorRetailerDetail } from "@/components/distributor/distributor-extras";

export const Route = createFileRoute("/distributor/retailers/$id")({
  head: () => ({ meta: [{ title: "Retailer Details — Distributor Portal" }] }),
  component: DistributorRetailerDetail,
});
