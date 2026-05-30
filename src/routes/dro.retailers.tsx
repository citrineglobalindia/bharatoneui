import { createFileRoute } from "@tanstack/react-router";
import { ReportRetailers } from "@/components/regional/report-views";
import { DRO_CONFIG } from "@/components/regional/regional-shell";
import { DISTRICT_RETAILERS } from "@/components/regional/regional-mock-data";

export const Route = createFileRoute("/dro/retailers")({
  head: () => ({
    meta: [
      { title: "DRO Retailer Activity — BharatOne" },
      { name: "description", content: "District-wide retailer daily service activity report." },
    ],
  }),
  component: () => <ReportRetailers cfg={DRO_CONFIG} rows={DISTRICT_RETAILERS} district />,
});