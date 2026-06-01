import { createFileRoute } from "@tanstack/react-router";
import { DistributorServices } from "@/components/distributor/distributor-views";

export const Route = createFileRoute("/distributor/services")({
  head: () => ({
    meta: [
      { title: "Services Live — Distributor Portal" },
      { name: "description", content: "Daily, weekly and monthly service activity across the network." },
    ],
  }),
  component: DistributorServices,
});
