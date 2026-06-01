import { createFileRoute } from "@tanstack/react-router";
import { DistributorShell } from "@/components/distributor/distributor-shell";
import { SupportPanel } from "@/components/shared/support-feedback";

export const Route = createFileRoute("/distributor/support")({
  head: () => ({ meta: [{ title: "Help & Support — Distributor Portal" }] }),
  component: () => (
    <DistributorShell>
      <SupportPanel accent="indigo" />
    </DistributorShell>
  ),
});
