import { createFileRoute } from "@tanstack/react-router";
import { TelecallerModule } from "@/components/hr/telecaller-module";

export const Route = createFileRoute("/hr/telecaller")({
  head: () => ({
    meta: [
      { title: "Telecaller CRM — BharatOne HR" },
      { name: "description", content: "Manage BharatOne leads, call outcomes, follow-ups, activations and telecaller performance." },
      { property: "og:title", content: "Telecaller CRM — BharatOne HR" },
      { property: "og:description", content: "Lead assignment, follow-up reminders, daily KPIs and telecaller performance in one workspace." },
    ],
  }),
  component: TelecallerModule,
});