import { createFileRoute } from "@tanstack/react-router";
import { QcShell } from "@/components/qc/qc-shell";
import { SupportPanel } from "@/components/shared/support-feedback";

export const Route = createFileRoute("/qc/support")({
  head: () => ({ meta: [{ title: "Support — Reviewer Portal" }] }),
  component: () => (
    <QcShell>
      <SupportPanel accent="indigo" />
    </QcShell>
  ),
});
