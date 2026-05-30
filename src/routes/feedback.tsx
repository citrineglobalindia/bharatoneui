import { createFileRoute } from "@tanstack/react-router";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { FeedbackPanel } from "@/components/shared/support-feedback";

export const Route = createFileRoute("/feedback")({
  head: () => ({ meta: [{ title: "Feedback — BharatOne" }] }),
  component: () => (
    <RetailerShell>
      <FeedbackPanel accent="green" />
    </RetailerShell>
  ),
});
