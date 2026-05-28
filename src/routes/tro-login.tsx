import { createFileRoute } from "@tanstack/react-router";
import { PortalLogin, PORTAL_CONFIGS } from "@/components/portal-login";

export const Route = createFileRoute("/tro-login")({
  head: () => ({
    meta: [
      { title: "TRO Portal Login — BharatOne" },
      { name: "description", content: "Sign in to the BharatOne Taluk Regional Officer Portal." },
    ],
  }),
  component: () => <PortalLogin config={PORTAL_CONFIGS.tro} />,
});