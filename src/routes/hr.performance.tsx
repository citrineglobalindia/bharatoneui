import { createFileRoute } from "@tanstack/react-router";
import { Performance } from "@/components/hr/performance";
import { HrShell } from "@/components/hr/hr-shell";

export const Route = createFileRoute("/hr/performance")({
  head: () => ({
    meta: [
      { title: "Performance — BharatOne HR" },
      { name: "description", content: "Annual review cycles, goals and appraisals." },
    ],
  }),
  component: () => (
    <HrShell>
      <div className="mx-auto max-w-[1800px]">
        <Performance />
      </div>
    </HrShell>
  ),
});
