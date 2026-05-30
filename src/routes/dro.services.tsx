import { createFileRoute } from "@tanstack/react-router";
import { ReportServices } from "@/components/regional/report-views";
import { DRO_CONFIG } from "@/components/regional/regional-shell";
import { DISTRICT_RETAILERS } from "@/components/regional/regional-mock-data";

export const Route = createFileRoute("/dro/services")({
  head: () => ({
    meta: [
      { title: "DRO Service Analytics — BharatOne" },
      { name: "description", content: "District service-wise counts and analytics." },
    ],
  }),
  component: () => <ReportServices cfg={DRO_CONFIG} rows={DISTRICT_RETAILERS} district />,
});