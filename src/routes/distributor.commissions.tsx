import { createFileRoute } from "@tanstack/react-router";
import { DistributorCommissions } from "@/components/distributor/distributor-views";

export const Route = createFileRoute("/distributor/commissions")({
  head: () => ({
    meta: [
      { title: "Commissions — Distributor Portal" },
      { name: "description", content: "Commission earned across services and retailers in your network." },
    ],
  }),
  component: DistributorCommissions,
});
