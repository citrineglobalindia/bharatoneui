import { createFileRoute } from "@tanstack/react-router";
import { PortalLogin, PORTAL_CONFIGS } from "@/components/portal-login";

export const Route = createFileRoute("/admin-login")({
  head: () => ({
    meta: [
      { title: "Admin Portal Login — BharatOne" },
      { name: "description", content: "Sign in to the BharatOne Administrator Portal." },
    ],
  }),
  component: () => <PortalLogin config={PORTAL_CONFIGS.admin} />,
});