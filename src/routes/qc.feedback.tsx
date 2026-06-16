import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import { QcShell } from "@/components/qc/qc-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { FeedbackPanel } from "@/components/account/feedback-panel";

export const Route = createFileRoute("/qc/feedback")({
  head: () => ({ meta: [{ title: "Feedback — BharatOne" }] }),
  component: Page,
});

function Page() {
  return (
    <QcShell>
      <div className="space-y-5">
        <PageHeader icon={<MessageSquare className="h-5 w-5" />} title="Feedback" subtitle="Share suggestions, report issues, or tell us how we can improve" />
        <FeedbackPanel />
      </div>
    </QcShell>
  );
}
