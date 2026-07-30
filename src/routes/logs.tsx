import { createFileRoute } from "@tanstack/react-router";
import { PlatformLogs } from "@/components/admin/platform-logs";

export const Route = createFileRoute("/logs")({
  head: () => ({
    meta: [
      { title: "Platform Logs — BharatOne" },
      { name: "robots", content: "noindex, nofollow" },
      {
        name: "description",
        content: "Server-side access log: every request, page view, sign-in and error with originating IP.",
      },
    ],
  }),
  component: PlatformLogs,
});
