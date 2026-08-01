import { createFileRoute } from "@tanstack/react-router";
import { HrDashboard } from "@/components/hr/hr-dashboard";
import { HrShell } from "@/components/hr/hr-shell";

export const Route = createFileRoute("/hr/dashboard")({
  head: () => ({
    meta: [
      { title: "HR Dashboard — BharatOne HR" },
      { name: "description", content: "Headcount, approvals awaiting action, leave today and upcoming dates." },
    ],
  }),
  component: () => (
    <HrShell>
      <div className="mx-auto max-w-[1800px]">
        <HrDashboard />
      </div>
    </HrShell>
  ),
});
