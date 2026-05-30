import { createFileRoute } from "@tanstack/react-router";
import { RegionalNotifications } from "@/components/regional/regional-extras";
import { TRO_CONFIG } from "@/components/regional/regional-shell";

export const Route = createFileRoute("/tro/notifications")({
  head: () => ({ meta: [{ title: "Notifications — TRO Portal" }] }),
  component: () => <RegionalNotifications cfg={TRO_CONFIG} />,
});
