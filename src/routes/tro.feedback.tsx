import { createFileRoute } from "@tanstack/react-router";
import { RegionalShell, TRO_CONFIG } from "@/components/regional/regional-shell";
import { FeedbackPanel } from "@/components/shared/support-feedback";

export const Route = createFileRoute("/tro/feedback")({
  head: () => ({ meta: [{ title: "Feedback — TRO Portal" }] }),
  component: () => (
    <RegionalShell cfg={TRO_CONFIG}>
      <FeedbackPanel accent="amber" />
    </RegionalShell>
  ),
});
