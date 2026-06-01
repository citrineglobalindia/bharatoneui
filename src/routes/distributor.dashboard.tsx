import { createFileRoute } from "@tanstack/react-router";
import { DistributorDashboard } from "@/components/distributor/distributor-views";

export const Route = createFileRoute("/distributor/dashboard")({
  head: () => ({
    meta: [
      { title: "Distributor Dashboard — BharatOne" },
      { name: "description", content: "Distributor network oversight: DRO, TRO, retailers, services and commissions." },
    ],
  }),
  component: DistributorDashboard,
});
