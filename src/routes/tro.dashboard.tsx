import { createFileRoute } from "@tanstack/react-router";
import { ReportDashboard } from "@/components/regional/report-views";
import { TRO_CONFIG } from "@/components/regional/regional-shell";
import { TALUK_RETAILERS } from "@/components/regional/regional-mock-data";

export const Route = createFileRoute("/tro/dashboard")({
  head: () => ({
    meta: [
      { title: "TRO Dashboard — BharatOne" },
      { name: "description", content: "Taluk-level retailer service reports and analytics." },
    ],
  }),
  component: () => <ReportDashboard cfg={TRO_CONFIG} rows={TALUK_RETAILERS} district={false} />,
});