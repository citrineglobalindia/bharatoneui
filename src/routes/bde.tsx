import { createFileRoute } from "@tanstack/react-router";
import { BdeWorkspace } from "@/components/business-development/bde-workspace";

export const Route = createFileRoute("/bde")({
  head: () => ({ meta: [
    { title: "Business Development CRM — BharatOne" },
    { name: "description", content: "Manage BharatOne partner leads, onboarding, territories, meetings and business development performance." },
    { property: "og:title", content: "Business Development CRM — BharatOne" },
    { property: "og:description", content: "A complete partner acquisition and business expansion workspace." },
  ] }),
  component: BdeWorkspace,
});