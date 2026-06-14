import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  optimizeDeps: {
    include: ["@supabase/supabase-js"],
  },
  tanstackStart: {
    server: { entry: "server" },
  },
});