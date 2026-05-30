import { createFileRoute } from "@tanstack/react-router";
import { ReportRetailers } from "@/components/regional/report-views";
import { TRO_CONFIG } from "@/components/regional/regional-shell";
import { TALUK_RETAILERS } from "@/components/regional/regional-mock-data";

export const Route = createFileRoute("/tro/retailers")({
  head: () => ({
    meta: [
      { title: "TRO Retailer Activity — BharatOne" },
      { name: "description", content: "Taluk retailer daily service activity report." },
    ],
  }),
  component: () => <ReportRetailers cfg={TRO_CONFIG} rows={TALUK_RETAILERS} district={false} />,
});