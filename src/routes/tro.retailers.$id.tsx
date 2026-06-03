import { createFileRoute } from "@tanstack/react-router";
import { RetailerActivityDetail } from "@/components/regional/retailer-activity-views";
import { TRO_CONFIG } from "@/components/regional/regional-shell";

export const Route = createFileRoute("/tro/retailers/$id")({
  head: () => ({
    meta: [
      { title: "Retailer Profile — TRO Portal" },
      { name: "description", content: "Complete retailer profile, transactions, service usage and wallet history." },
    ],
  }),
  component: () => <RetailerActivityDetail cfg={TRO_CONFIG} />,
});