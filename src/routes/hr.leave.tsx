import { createFileRoute } from "@tanstack/react-router";
import { LeaveManagement } from "@/components/hr/leave-management";
import { HrShell } from "@/components/hr/hr-shell";

export const Route = createFileRoute("/hr/leave")({
  head: () => ({
    meta: [
      { title: "Leave Management — BharatOne HR" },
      { name: "description", content: "Apply for leave, approve requests and track balances." },
    ],
  }),
  component: () => (
    <HrShell>
      <div className="mx-auto max-w-[1800px]">
        <LeaveManagement />
      </div>
    </HrShell>
  ),
});
