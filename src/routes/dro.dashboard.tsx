import { createFileRoute } from "@tanstack/react-router";
import { ReportDashboard } from "@/components/regional/report-views";
import { DRO_CONFIG } from "@/components/regional/regional-shell";
import { DISTRICT_RETAILERS } from "@/components/regional/regional-mock-data";

export const Route = createFileRoute("/dro/dashboard")({
  head: () => ({
    meta: [
      { title: "DRO Dashboard — BharatOne" },
      { name: "description", content: "District-level retailer service reports and analytics." },
    ],
  }),
  component: () => <ReportDashboard cfg={DRO_CONFIG} rows={DISTRICT_RETAILERS} district />,
});