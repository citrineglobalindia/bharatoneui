import { createFileRoute } from "@tanstack/react-router";
import { PortalLogin, PORTAL_CONFIGS } from "@/components/portal-login";

export const Route = createFileRoute("/dro-login")({
  head: () => ({
    meta: [
      { title: "DRO Portal Login — BharatOne" },
      { name: "description", content: "Sign in to the BharatOne District Regional Officer Portal." },
    ],
  }),
  component: () => <PortalLogin config={PORTAL_CONFIGS.dro} />,
});