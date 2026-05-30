import { createFileRoute } from "@tanstack/react-router";
import { QcShell } from "@/components/qc/qc-shell";
import { FeedbackPanel } from "@/components/shared/support-feedback";

export const Route = createFileRoute("/qc/feedback")({
  head: () => ({ meta: [{ title: "Feedback — Reviewer Portal" }] }),
  component: () => (
    <QcShell>
      <FeedbackPanel accent="indigo" />
    </QcShell>
  ),
});
