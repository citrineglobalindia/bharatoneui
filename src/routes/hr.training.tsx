import { createFileRoute } from "@tanstack/react-router";
import { Training } from "@/components/hr/training";
import { HrShell } from "@/components/hr/hr-shell";

export const Route = createFileRoute("/hr/training")({
  head: () => ({
    meta: [
      { title: "Training — BharatOne HR" },
      { name: "description", content: "Course catalogue, enrolments and completion tracking." },
    ],
  }),
  component: () => (
    <HrShell>
      <div className="mx-auto max-w-[1800px]">
        <Training />
      </div>
    </HrShell>
  ),
});
