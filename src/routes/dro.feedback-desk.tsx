import { createFileRoute } from "@tanstack/react-router";
import { FeedbackResponseDesk } from "@/components/regional/feedback-response-views";
import { DRO_CONFIG } from "@/components/regional/regional-shell";

export const Route = createFileRoute("/dro/feedback-desk")({
  head: () => ({
    meta: [
      { title: "Feedback Response Desk — DRO Portal" },
      { name: "description", content: "Respond to feedback raised by retailers and taluk officers." },
    ],
  }),
  component: () => <FeedbackResponseDesk cfg={DRO_CONFIG} />,
});
