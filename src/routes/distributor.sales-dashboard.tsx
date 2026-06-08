import { createFileRoute } from "@tanstack/react-router";
import { DistributorSalesDashboard } from "@/components/distributor/distributor-views";

export const Route = createFileRoute("/distributor/sales-dashboard")({
  head: () => ({
    meta: [
      { title: "Distributor Sales Dashboard — BharatOne" },
      { name: "description", content: "Sales performance overview: transactions, business volume, commission and retailer insights." },
    ],
  }),
  component: DistributorSalesDashboard,
});
