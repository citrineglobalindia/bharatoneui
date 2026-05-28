import { createFileRoute } from "@tanstack/react-router";
import { PortalLogin, PORTAL_CONFIGS } from "@/components/portal-login";

export const Route = createFileRoute("/accountant-login")({
  head: () => ({
    meta: [
      { title: "Accountant Portal Login — BharatOne" },
      { name: "description", content: "Sign in to the BharatOne Accountant Portal." },
    ],
  }),
  component: () => <PortalLogin config={PORTAL_CONFIGS.accountant} />,
});