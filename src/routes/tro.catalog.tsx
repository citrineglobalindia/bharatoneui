import { createFileRoute } from "@tanstack/react-router";
import { ReportServiceCatalog } from "@/components/regional/report-views";
import { TRO_CONFIG } from "@/components/regional/regional-shell";
import { TALUK_RETAILERS } from "@/components/regional/regional-mock-data";

export const Route = createFileRoute("/tro/catalog")({
  head: () => ({
    meta: [
      { title: "TRO Services Directory — BharatOne" },
      { name: "description", content: "All services offered across the taluk." },
    ],
  }),
  component: () => <ReportServiceCatalog cfg={TRO_CONFIG} rows={TALUK_RETAILERS} district={false} />,
});
