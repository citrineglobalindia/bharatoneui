import { createFileRoute } from "@tanstack/react-router";
import { PortalLogin, PORTAL_CONFIGS } from "@/components/portal-login";

export const Route = createFileRoute("/master-distributor-login")({
  head: () => ({
    meta: [
      { title: "Master Distributor Portal Login — BharatOne" },
      { name: "description", content: "Sign in to the BharatOne Master Distributor Portal." },
    ],
  }),
  component: () => <PortalLogin config={PORTAL_CONFIGS["master-distributor"]} />,
});