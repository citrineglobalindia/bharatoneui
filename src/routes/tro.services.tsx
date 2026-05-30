import { createFileRoute } from "@tanstack/react-router";
import { ReportServices } from "@/components/regional/report-views";
import { TRO_CONFIG } from "@/components/regional/regional-shell";
import { TALUK_RETAILERS } from "@/components/regional/regional-mock-data";

export const Route = createFileRoute("/tro/services")({
  head: () => ({
    meta: [
      { title: "TRO Service Analytics — BharatOne" },
      { name: "description", content: "Taluk service-wise counts and analytics." },
    ],
  }),
  component: () => <ReportServices cfg={TRO_CONFIG} rows={TALUK_RETAILERS} district={false} />,
});