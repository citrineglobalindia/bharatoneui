import { createFileRoute } from "@tanstack/react-router";
import { RegionalNotifications } from "@/components/regional/regional-extras";
import { DRO_CONFIG } from "@/components/regional/regional-shell";

export const Route = createFileRoute("/dro/notifications")({
  head: () => ({ meta: [{ title: "Notifications — DRO Portal" }] }),
  component: () => <RegionalNotifications cfg={DRO_CONFIG} />,
});
