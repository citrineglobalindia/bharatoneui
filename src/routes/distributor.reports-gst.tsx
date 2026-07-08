import { createFileRoute } from "@tanstack/react-router";
import { DistributorShell } from "@/components/distributor/distributor-shell";
import { DistributorGstReports } from "@/components/distributor/distributor-gst-reports";

export const Route = createFileRoute("/distributor/reports-gst")({
  head: () => ({ meta: [{ title: "GST & Transaction Reports — BharatOne Distributor" }] }),
  component: () => (<DistributorShell><DistributorGstReports /></DistributorShell>),
});
