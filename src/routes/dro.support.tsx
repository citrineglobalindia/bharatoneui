import { createFileRoute } from "@tanstack/react-router";
import { RegionalShell, DRO_CONFIG } from "@/components/regional/regional-shell";
import { SupportPanel } from "@/components/shared/support-feedback";

export const Route = createFileRoute("/dro/support")({
  head: () => ({ meta: [{ title: "Support — DRO Portal" }] }),
  component: () => (
    <RegionalShell cfg={DRO_CONFIG}>
      <SupportPanel accent="rose" />
    </RegionalShell>
  ),
});
