import { createFileRoute } from "@tanstack/react-router";
import { IdCards } from "@/components/hr/id-cards";
import { HrShell } from "@/components/hr/hr-shell";

export const Route = createFileRoute("/hr/id-cards")({
  head: () => ({
    meta: [
      { title: "ID Cards — BharatOne HR" },
      { name: "description", content: "Issue, print and cancel staff identity cards." },
    ],
  }),
  component: () => (
    <HrShell>
      <div className="mx-auto max-w-[1800px]">
        <IdCards />
      </div>
    </HrShell>
  ),
});
