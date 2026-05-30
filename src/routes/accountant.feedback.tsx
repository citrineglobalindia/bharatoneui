import { createFileRoute } from "@tanstack/react-router";
import { AccountantShell } from "@/components/accountant/accountant-shell";
import { FeedbackPanel } from "@/components/shared/support-feedback";

export const Route = createFileRoute("/accountant/feedback")({
  head: () => ({ meta: [{ title: "Feedback — Accountant Portal" }] }),
  component: () => (
    <AccountantShell>
      <FeedbackPanel accent="emerald" />
    </AccountantShell>
  ),
});
