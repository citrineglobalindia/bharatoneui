import { createFileRoute } from "@tanstack/react-router";
import { ReportServiceCatalog } from "@/components/regional/report-views";
import { DRO_CONFIG } from "@/components/regional/regional-shell";
import { DISTRICT_RETAILERS } from "@/components/regional/regional-mock-data";

export const Route = createFileRoute("/dro/catalog")({
  head: () => ({
    meta: [
      { title: "DRO Services Directory — BharatOne" },
      { name: "description", content: "All services offered across the district." },
    ],
  }),
  component: () => <ReportServiceCatalog cfg={DRO_CONFIG} rows={DISTRICT_RETAILERS} district />,
});
