import { createFileRoute } from "@tanstack/react-router";
import { DistributorShell } from "@/components/distributor/distributor-shell";
import { FeedbackPanel } from "@/components/shared/support-feedback";

export const Route = createFileRoute("/distributor/feedback")({
  head: () => ({ meta: [{ title: "Feedback — Distributor Portal" }] }),
  component: () => (
    <DistributorShell>
      <FeedbackPanel accent="indigo" />
    </DistributorShell>
  ),
});
