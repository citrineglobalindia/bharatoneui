import { createFileRoute } from "@tanstack/react-router";
import { RegionalProfile } from "@/components/regional/regional-extras";
import { TRO_CONFIG } from "@/components/regional/regional-shell";

export const Route = createFileRoute("/tro/profile")({
  head: () => ({ meta: [{ title: "My Profile — TRO Portal" }] }),
  component: () => <RegionalProfile cfg={TRO_CONFIG} />,
});
