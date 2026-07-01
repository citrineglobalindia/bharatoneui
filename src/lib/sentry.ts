// Error monitoring — activates only when VITE_SENTRY_DSN is set (no-op otherwise).
// Set the DSN in your Vercel/host env vars to turn on error + performance tracking.
export async function initSentry() {
  if (typeof window === "undefined") return;
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;
  try {
    // @ts-ignore optional dependency, resolved at build time when installed
    const Sentry = await import("@sentry/react");
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
    });
  } catch (e) {
    console.warn("Sentry init skipped:", e);
  }
}
