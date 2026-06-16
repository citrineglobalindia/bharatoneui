import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import { RegionalShell, TRO_CONFIG } from "@/components/regional/regional-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { FeedbackPanel } from "@/components/account/feedback-panel";

export const Route = createFileRoute("/tro/feedback")({
  head: () => ({ meta: [{ title: "Feedback — BharatOne" }] }),
  component: Page,
});

function Page() {
  return (
    <RegionalShell cfg={TRO_CONFIG}>
      <div className="space-y-5">
        <PageHeader icon={<MessageSquare className="h-5 w-5" />} title="Feedback" subtitle="Share suggestions or report issues" />
        <FeedbackPanel />
      </div>
    </RegionalShell>
  );
}
