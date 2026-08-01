import { createFileRoute } from "@tanstack/react-router";
import { HrReports } from "@/components/hr/hr-reports";
import { HrShell } from "@/components/hr/hr-shell";

export const Route = createFileRoute("/hr/reports")({
  head: () => ({
    meta: [
      { title: "Reports — BharatOne HR" },
      { name: "description", content: "Staff, leave and attendance reports with CSV export." },
    ],
  }),
  component: () => (
    <HrShell>
      <div className="mx-auto max-w-[1800px]">
        <HrReports />
      </div>
    </HrShell>
  ),
});
