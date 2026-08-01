import { createFileRoute } from "@tanstack/react-router";
import { SuperConsole } from "@/components/super/super-console";

export const Route = createFileRoute("/super")({
  head: () => ({
    meta: [
      { title: "Console — BharatOne" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SuperConsole,
});
