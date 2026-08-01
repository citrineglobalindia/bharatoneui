import { createFileRoute } from "@tanstack/react-router";
import { HrPolicies } from "@/components/hr/policies";
import { HrShell } from "@/components/hr/hr-shell";

export const Route = createFileRoute("/hr/policies")({
  head: () => ({
    meta: [
      { title: "Policies — BharatOne HR" },
      { name: "description", content: "Company policies, versions and staff acknowledgements." },
    ],
  }),
  component: () => (
    <HrShell>
      <div className="mx-auto max-w-[1800px]">
        <HrPolicies />
      </div>
    </HrShell>
  ),
});
