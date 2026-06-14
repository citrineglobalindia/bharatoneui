import { createFileRoute } from "@tanstack/react-router";
import { PortalLogin, PORTAL_CONFIGS } from "@/components/portal-login";

export const Route = createFileRoute("/bde-login")({
  head: () => ({ meta: [
    { title: "Business Development Login — BharatOne" },
    { name: "description", content: "Sign in to the BharatOne Business Development Executive portal." },
    { property: "og:title", content: "Business Development Login — BharatOne" },
    { property: "og:description", content: "Access partner acquisition, onboarding and performance tools." },
  ] }),
  component: () => <PortalLogin config={PORTAL_CONFIGS.bde} />,
});