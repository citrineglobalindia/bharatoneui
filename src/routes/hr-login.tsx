import { createFileRoute } from "@tanstack/react-router";
import { PortalLogin, PORTAL_CONFIGS } from "@/components/portal-login";

export const Route = createFileRoute("/hr-login")({
  head: () => ({
    meta: [
      { title: "HR Portal Login — BharatOne" },
      { name: "description", content: "Secure sign in for BharatOne HR staff and managers." },
    ],
  }),
  component: () => <PortalLogin config={PORTAL_CONFIGS.hr} />,
});