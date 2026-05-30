import { createFileRoute } from "@tanstack/react-router";
import { RegionalShell, DRO_CONFIG } from "@/components/regional/regional-shell";
import { FeedbackPanel } from "@/components/shared/support-feedback";

export const Route = createFileRoute("/dro/feedback")({
  head: () => ({ meta: [{ title: "Feedback — DRO Portal" }] }),
  component: () => (
    <RegionalShell cfg={DRO_CONFIG}>
      <FeedbackPanel accent="rose" />
    </RegionalShell>
  ),
});
