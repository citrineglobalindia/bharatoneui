import { createFileRoute } from "@tanstack/react-router";
import { AdminWorkspace } from "@/components/admin/admin-workspace";

export const Route = createFileRoute("/admin")({
  // ?m= carries which admin module is open, so refresh and Back/Forward keep
  // your place. Without validateSearch the router would strip it on navigate.
  validateSearch: (search: Record<string, unknown>): { m?: string } => ({
    m: typeof search.m === "string" && search.m ? search.m : undefined,
  }),
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