import { createFileRoute } from "@tanstack/react-router";
import { BdeShell } from "@/components/bde/bde-shell";

export const Route = createFileRoute("/bde/leads")({
  component: () => (
    <BdeShell>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h1 className="text-2xl font-bold font-display uppercase tracking-widest text-bd mb-2">leads</h1>
        <p className="text-muted-foreground">This module is currently under development.</p>
      </div>
    </BdeShell>
  ),
});
