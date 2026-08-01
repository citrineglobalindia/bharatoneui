import { createFileRoute } from "@tanstack/react-router";
import { EmployeeManagement } from "@/components/hr/employee-management";
import { HrShell } from "@/components/hr/hr-shell";

export const Route = createFileRoute("/hr/employees")({
  head: () => ({
    meta: [
      { title: "Employee Management — BharatOne HR" },
      { name: "description", content: "Staff directory, employment details and leave balances." },
    ],
  }),
  component: () => (
    <HrShell>
      <div className="mx-auto max-w-[1800px]">
        <EmployeeManagement />
      </div>
    </HrShell>
  ),
});
