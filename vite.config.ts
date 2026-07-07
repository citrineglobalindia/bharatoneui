import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Disable Nitro's deploy plugin. Newer Nitro auto-detects the Vercel build
  // env (VERCEL=1) and emits the Vercel preset (.vercel/output/…) instead of
  // dist/server/server.js, which scripts/build-vercel.mjs consumes. Turning it
  // off keeps the plain TanStack Start server output that our custom Vercel
  // Build Output adapter expects — deterministic across dep upgrades.
  nitro: false,
  vite: {
    optimizeDeps: {
      include: ["@supabase/supabase-js"],
    },
  },
  tanstackStart: {
    server: { entry: "server" },
  },
});