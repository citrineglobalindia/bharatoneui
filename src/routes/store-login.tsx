import { createFileRoute } from "@tanstack/react-router";
import { PortalLogin, PORTAL_CONFIGS } from "@/components/portal-login";

export const Route = createFileRoute("/store-login")({
  head: () => ({
    meta: [
      { title: "Store Portal Login — BharatOne" },
      { name: "description", content: "Secure sign in for BharatOne store and fulfilment staff." },
    ],
  }),
  component: () => <PortalLogin config={PORTAL_CONFIGS.store} />,
});
