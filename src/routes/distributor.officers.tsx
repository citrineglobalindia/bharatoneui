import { createFileRoute } from "@tanstack/react-router";
import { DistributorOfficers } from "@/components/distributor/distributor-extras";

export const Route = createFileRoute("/distributor/officers")({
  head: () => ({
    meta: [
      { title: "Officers — Distributor Portal" },
      { name: "description", content: "DRO and TRO officers mapped under your distributor network." },
    ],
  }),
  component: DistributorOfficers,
});
