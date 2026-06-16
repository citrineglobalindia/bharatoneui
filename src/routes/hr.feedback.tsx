import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import { HrShell } from "@/components/hr/hr-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { FeedbackPanel } from "@/components/account/feedback-panel";

export const Route = createFileRoute("/hr/feedback")({
  head: () => ({ meta: [{ title: "Feedback — BharatOne" }] }),
  component: Page,
});

function Page() {
  return (
    <HrShell>
      <div className="space-y-5">
        <PageHeader icon={<MessageSquare className="h-5 w-5" />} title="Feedback" subtitle="Share suggestions or report issues" />
        <FeedbackPanel />
      </div>
    </HrShell>
  );
}
