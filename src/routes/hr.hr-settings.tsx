import { createFileRoute } from "@tanstack/react-router";
import { HrSettings } from "@/components/hr/hr-settings";
import { HrShell } from "@/components/hr/hr-shell";

/**
 * HR configuration — leave types, entitlements and the holiday calendar.
 * Distinct from /hr/settings, which is the signed-in person's own account settings.
 */
export const Route = createFileRoute("/hr/hr-settings")({
  head: () => ({
    meta: [
      { title: "HR Settings — BharatOne HR" },
      { name: "description", content: "Leave types, entitlements and the holiday calendar." },
    ],
  }),
  component: () => (
    <HrShell>
      <div className="mx-auto max-w-[1800px]">
        <HrSettings />
      </div>
    </HrShell>
  ),
});
