import { createFileRoute } from "@tanstack/react-router";
import { Recruitment } from "@/components/hr/recruitment";
import { HrShell } from "@/components/hr/hr-shell";

export const Route = createFileRoute("/hr/recruitment")({
  head: () => ({
    meta: [
      { title: "Recruitment — BharatOne HR" },
      { name: "description", content: "Job openings and the candidate pipeline." },
    ],
  }),
  component: () => (
    <HrShell><div className="mx-auto max-w-[1800px]"><Recruitment /></div></HrShell>
  ),
});
