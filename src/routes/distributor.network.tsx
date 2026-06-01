import { createFileRoute } from "@tanstack/react-router";
import { DistributorNetwork } from "@/components/distributor/distributor-views";

export const Route = createFileRoute("/distributor/network")({
  head: () => ({
    meta: [
      { title: "Network Map — Distributor Portal" },
      { name: "description", content: "DRO to TRO to retailer hierarchy mapped under the distributor." },
    ],
  }),
  component: DistributorNetwork,
});
