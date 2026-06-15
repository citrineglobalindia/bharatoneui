import { createFileRoute } from "@tanstack/react-router";
import { AdminWorkspace } from "@/components/admin/admin-workspace";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Command Center — BharatOne" },
      { name: "description", content: "BharatOne enterprise administration, network operations, finance, risk and platform intelligence." },
      { property: "og:title", content: "Admin Command Center — BharatOne" },
      { property: "og:description", content: "Real-time control and intelligence for the BharatOne network." },
    ],
  }),
  component: AdminWorkspace,
});