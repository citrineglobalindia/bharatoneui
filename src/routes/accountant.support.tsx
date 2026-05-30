import { createFileRoute } from "@tanstack/react-router";
import { AccountantShell } from "@/components/accountant/accountant-shell";
import { SupportPanel } from "@/components/shared/support-feedback";

export const Route = createFileRoute("/accountant/support")({
  head: () => ({ meta: [{ title: "Support — Accountant Portal" }] }),
  component: () => (
    <AccountantShell>
      <SupportPanel accent="emerald" />
    </AccountantShell>
  ),
});
