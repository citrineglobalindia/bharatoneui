import { createFileRoute } from "@tanstack/react-router";
import { DistributorReports } from "@/components/distributor/distributor-reports";

export const Route = createFileRoute("/distributor/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Analytics — Distributor Portal" },
      { name: "description", content: "Distributor commission, service and network performance reports." },
    ],
  }),
  component: DistributorReports,
});
