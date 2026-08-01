import { createFileRoute } from "@tanstack/react-router";
import { Onboarding } from "@/components/hr/onboarding";
import { HrShell } from "@/components/hr/hr-shell";

export const Route = createFileRoute("/hr/onboarding")({
  head: () => ({
    meta: [
      { title: "Onboarding — BharatOne HR" },
      { name: "description", content: "New joiner checklists, created automatically on hire." },
    ],
  }),
  component: () => (
    <HrShell><div className="mx-auto max-w-[1800px]"><Onboarding /></div></HrShell>
  ),
});
