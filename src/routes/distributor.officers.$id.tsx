import { createFileRoute } from "@tanstack/react-router";
import { DistributorOfficerDetail } from "@/components/distributor/distributor-extras";

export const Route = createFileRoute("/distributor/officers/$id")({
  head: () => ({ meta: [{ title: "Officer Details — Distributor Portal" }] }),
  component: DistributorOfficerDetail,
});
