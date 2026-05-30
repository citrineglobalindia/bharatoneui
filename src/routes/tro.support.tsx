import { createFileRoute } from "@tanstack/react-router";
import { RegionalShell, TRO_CONFIG } from "@/components/regional/regional-shell";
import { SupportPanel } from "@/components/shared/support-feedback";

export const Route = createFileRoute("/tro/support")({
  head: () => ({ meta: [{ title: "Support — TRO Portal" }] }),
  component: () => (
    <RegionalShell cfg={TRO_CONFIG}>
      <SupportPanel accent="amber" />
    </RegionalShell>
  ),
});
