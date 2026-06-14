import { createFileRoute } from "@tanstack/react-router";
import { PortalLogin, PORTAL_CONFIGS } from "@/components/portal-login";

export const Route = createFileRoute("/telecaller-login")({
  head: () => ({
    meta: [
      { title: "Telecaller Portal Login — BharatOne" },
      { name: "description", content: "Sign in to the BharatOne telecaller lead and activation workspace." },
      { property: "og:title", content: "Telecaller Portal Login — BharatOne" },
      { property: "og:description", content: "Access lead assignment, follow-ups and performance monitoring." },
    ],
  }),
  component: () => <PortalLogin config={PORTAL_CONFIGS.telecaller} />,
});