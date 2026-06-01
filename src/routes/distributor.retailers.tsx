import { createFileRoute } from "@tanstack/react-router";
import { DistributorRetailers } from "@/components/distributor/distributor-views";

export const Route = createFileRoute("/distributor/retailers")({
  head: () => ({
    meta: [
      { title: "Retailers — Distributor Portal" },
      { name: "description", content: "All retailers mapped under your officers with daily service activity." },
    ],
  }),
  component: DistributorRetailers,
});
