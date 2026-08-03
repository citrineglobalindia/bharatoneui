import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import { useEffect } from "react";
import appCss from "../styles.css?url";
import { Toaster } from "sonner";
import { LiveChatWidget } from "@/components/live-chat-widget";
import { startAudit, logPageView, logAuthEvent } from "@/lib/audit";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  // Auto-recover from stale chunk / dynamic-import failures that happen right after
  // a new deploy (old cached page requests JS chunk hashes that no longer exist).
  // Reload once so the browser fetches the fresh build.
  useEffect(() => {
    const msg = String((error as any)?.message || error || "");
    const isChunkError = /dynamically imported module|Loading chunk|ChunkLoadError|Failed to fetch|Importing a module script failed|error loading dynamically imported module/i.test(msg)
      || (error as any)?.name === "ChunkLoadError";
    if (isChunkError) {
      try {
        if (!sessionStorage.getItem("bo:chunk-reloaded")) {
          sessionStorage.setItem("bo:chunk-reloaded", "1");
          window.location.reload();
          return;
        }
      } catch { /* ignore */ }
    } else {
      try { sessionStorage.removeItem("bo:chunk-reloaded"); } catch { /* ignore */ }
    }
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      // Suppress the browser's Google Translate banner/toolbar — the app has native EN/Kannada.
      { name: "google", content: "notranslate" },
      // Site identity.
      //
      // These were the scaffolding tool's defaults and were still shipping on the
      // live site: the author was credited to the builder, twitter:site pointed at
      // its handle, and the share image was a screenshot of a preview deployment
      // hosted on a third party's storage bucket. Anyone sharing mybharatone.com
      // got a preview card fetched from someone else's server, over a URL we do
      // not control and which can disappear without notice. The description was
      // the generic placeholder and said nothing about what BharatOne does.
      { title: "BharatOne" },
      {
        name: "description",
        content:
          "BharatOne — assisted banking and citizen services for Indian retailers. AePS banking, bill payments, money transfer, government services and merchant onboarding from a single retail counter.",
      },
      { name: "author", content: "BharatOne Services and Affiliates Private Limited" },
      { property: "og:site_name", content: "BharatOne" },
      { property: "og:title", content: "BharatOne — Banking and citizen services for every Indian retailer" },
      {
        property: "og:description",
        content:
          "AePS banking, bill payments, money transfer, government services and merchant onboarding — delivered through a network of retail agents across India.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://mybharatone.com" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "BharatOne — Banking and citizen services for every Indian retailer" },
      {
        name: "twitter:description",
        content:
          "AePS banking, bill payments, money transfer, government services and merchant onboarding — delivered through a network of retail agents across India.",
      },
      // Served from our own domain. A share image on somebody else's bucket is a
      // dependency nobody is watching until the day the card renders blank.
      { property: "og:image", content: "https://mybharatone.com/favicon-192.png" },
      { name: "twitter:image", content: "https://mybharatone.com/favicon-192.png" },
    ],
    links: [
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/favicon-192.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Sora:wght@500;600;700;800&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

/** Public marketing pages — these render their own <Chatbot /> bubble. */
const PUBLIC_PATHS = new Set([
  "/", "/about", "/careers", "/citizen-services", "/contact",
  "/gallery", "/privacy", "/schemes", "/terms",
]);

/**
 * Feeds the platform access log at /logs: one entry per page opened, plus sign-in
 * and sign-out events. The IP and device behind each entry are resolved server-side.
 */
function useAccessAudit(pathname: string) {
  useEffect(() => {
    startAudit();
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") {
        logAuthEvent("Signed in", "ok", { email: session?.user?.email ?? undefined });
      } else if (event === "SIGNED_OUT") {
        logAuthEvent("Signed out", "ok");
      } else if (event === "PASSWORD_RECOVERY") {
        logAuthEvent("Started password recovery", "ok");
      } else if (event === "USER_UPDATED") {
        logAuthEvent("Account details updated", "ok");
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    logPageView(pathname, typeof document !== "undefined" ? document.title : undefined);
  }, [pathname]);
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  // Re-key on pathname so each navigation cross-fades. Single-page workspaces
  // (admin panels, register steps) use internal state / query params, so their
  // pathname is stable and they stay mounted.
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useAccessAudit(pathname);

  // CR-150 — the public marketing pages carry their own Chatbot bubble. Rendering
  // the portal Live Chat widget there too stacked two buttons in the same corner
  // and blocked page content, so it is limited to the signed-in portal pages.
  const isPublicPage = PUBLIC_PATHS.has(pathname.replace(/\/+$/, "") || "/");

  return (
    <QueryClientProvider client={queryClient}>
      <div key={pathname} className="animate-in fade-in duration-200">
        <Outlet />
      </div>
      {!isPublicPage && <LiveChatWidget />}
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
