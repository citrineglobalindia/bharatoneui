import { createFileRoute } from "@tanstack/react-router";
import { Attendance } from "@/components/hr/attendance";
import { HrShell } from "@/components/hr/hr-shell";

export const Route = createFileRoute("/hr/attendance")({
  head: () => ({
    meta: [
      { title: "Attendance — BharatOne HR" },
      { name: "description", content: "Monthly attendance, with holidays and approved leave filled in automatically." },
    ],
  }),
  component: () => (
    <HrShell>
      <div className="mx-auto max-w-[1800px]">
        <Attendance />
      </div>
    </HrShell>
  ),
});
