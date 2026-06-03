import { createFileRoute } from "@tanstack/react-router";
import { FeedbackResponseDesk } from "@/components/regional/feedback-response-views";
import { TRO_CONFIG } from "@/components/regional/regional-shell";

export const Route = createFileRoute("/tro/feedback-desk")({
  head: () => ({
    meta: [
      { title: "Feedback Response Desk — TRO Portal" },
      { name: "description", content: "Respond to feedback raised by retailers." },
    ],
  }),
  component: () => <FeedbackResponseDesk cfg={TRO_CONFIG} />,
});
