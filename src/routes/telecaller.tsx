import { createFileRoute } from "@tanstack/react-router";
import { TelecallerModule } from "@/components/telecaller/telecaller-module";

export const Route = createFileRoute("/telecaller")({
  head: () => ({
    meta: [
      { title: "Telecaller CRM — BharatOne" },
      { name: "description", content: "Manage BharatOne leads, calls, follow-ups, activations and telecaller performance." },
      { property: "og:title", content: "Telecaller CRM — BharatOne" },
      { property: "og:description", content: "A dedicated workspace for lead assignment, call outcomes, reminders and performance." },
    ],
  }),
  component: TelecallerModule,
});