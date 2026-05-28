import { createFileRoute } from "@tanstack/react-router";
import { PortalLogin, PORTAL_CONFIGS } from "@/components/portal-login";

export const Route = createFileRoute("/qc-login")({
  head: () => ({
    meta: [
      { title: "QC Portal Login — BharatOne" },
      { name: "description", content: "Sign in to the BharatOne Quality Control Portal." },
    ],
  }),
  component: () => <PortalLogin config={PORTAL_CONFIGS.qc} />,
});