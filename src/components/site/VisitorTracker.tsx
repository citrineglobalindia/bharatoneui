import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { trackVisit } from "@/lib/tracking";

/**
 * Mount once (we mount it inside PageShell). Subscribes to router state changes
 * so SPA navigations are tracked too — not just initial loads.
 */
export function VisitorTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    // Skip admin paths so internal use doesn't pollute visitor stats
    if (pathname.startsWith("/admin")) return;
    trackVisit(pathname);
  }, [pathname]);
  return null;
}
