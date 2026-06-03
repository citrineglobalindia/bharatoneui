import { createFileRoute } from "@tanstack/react-router";
import { RetailerActivityDetail } from "@/components/regional/retailer-activity-views";
import { DRO_CONFIG } from "@/components/regional/regional-shell";

export const Route = createFileRoute("/dro/retailers/$id")({
  head: () => ({
    meta: [
      { title: "Retailer Profile — DRO Portal" },
      { name: "description", content: "Complete retailer profile, transactions, service usage and wallet history." },
    ],
  }),
  component: () => <RetailerActivityDetail cfg={DRO_CONFIG} />,
});