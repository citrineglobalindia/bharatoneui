import { createFileRoute } from "@tanstack/react-router";
import { PortalLogin, PORTAL_CONFIGS } from "@/components/portal-login";

export const Route = createFileRoute("/distributor-login")({
  head: () => ({
    meta: [
      { title: "Distributor Portal Login — BharatOne" },
      { name: "description", content: "Sign in to the BharatOne Distributor Portal." },
    ],
  }),
  component: () => <PortalLogin config={PORTAL_CONFIGS.distributor} />,
});