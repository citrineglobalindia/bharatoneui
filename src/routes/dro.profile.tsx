import { createFileRoute } from "@tanstack/react-router";
import { RegionalProfile } from "@/components/regional/regional-extras";
import { DRO_CONFIG } from "@/components/regional/regional-shell";

export const Route = createFileRoute("/dro/profile")({
  head: () => ({ meta: [{ title: "My Profile — DRO Portal" }] }),
  component: () => <RegionalProfile cfg={DRO_CONFIG} />,
});
