// BharatOne — platform access log (client side)
//
// Captures every movement on the platform and ships it to public.log_access_batch:
//   • every API call the app makes (method, endpoint, HTTP status, duration)
//   • every page a user opens
//   • sign-in / sign-out, including failed sign-in attempts
//   • unhandled JavaScript errors
//
// The IP address, device and signed-in user are resolved SERVER SIDE inside the RPC
// from the request headers — nothing identifying is trusted from the browser, so this
// cannot be spoofed by editing the page.
//
// Events are buffered and flushed in one batched call so full logging costs about one
// extra round trip every few seconds instead of one per request.

const SESSION_KEY = "bo_audit_sid";
const DEVICE_KEY = "bo_device_id";
const FLUSH_MS = 4000;
const MAX_BUFFER = 40;

export type AuditKind = "page" | "action" | "auth" | "api" | "error";

export type AuditEvent = {
  action: string;
  kind?: AuditKind;
  module?: string;
  route?: string;
  entity?: string;
  status?: "ok" | "fail" | "warn";
  latency?: number;
  detail?: Record<string, unknown>;
  at?: string;
};

/* ------------------------------------------------------------------ config */

const SUPABASE_URL =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_SUPABASE_URL) || "";
const SUPABASE_KEY =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY) ||
  "";

/** Endpoints that must never be logged, or the log would log itself for ever. */
const SILENT = [
  "/rpc/log_access",
  "/rpc/log_access_batch",
  "/rpc/record_site_visit",
  "/rpc/track",
  "/rpc/admin_access_log",
  "/rpc/admin_access_stats",
  "/rpc/admin_access_sessions",
  "/rpc/admin_access_facets",
  "/rpc/admin_health_log",
  "/rpc/public_health_log",
  "/rpc/public_health_log_stats",
  "/rpc/public_health_summary",
];

/** Route prefix → module key, so the log can be filtered per business area. */
const MODULE_BY_PREFIX: Array<[RegExp, string]> = [
  [/^\/aeps/, "aeps"],
  [/^\/bbps/, "bbps"],
  [/^\/estore/, "estore"],
  [/^\/wallet/, "wallet"],
  [/^\/register|^\/review/, "registration"],
  [/^\/support|^\/tickets/, "support"],
  [/^\/admin/, "admin"],
  [/^\/accountant/, "accountant"],
  [/^\/qc/, "qc"],
  [/^\/hr/, "hr"],
  [/^\/bde/, "bde"],
  [/^\/distributor/, "distributor"],
  [/^\/franchise/, "franchise"],
  [/^\/login|^\/.*-login|^\/logout/, "login"],
  [/^\/settings|^\/profile/, "profile"],
];

export function moduleForRoute(path: string): string {
  for (const [re, key] of MODULE_BY_PREFIX) if (re.test(path)) return key;
  return "website";
}

/** Turn a Supabase URL into something readable in the log. */
function describeRequest(url: string, method: string): { action: string; module: string } | null {
  let path = url;
  try {
    path = new URL(url, SUPABASE_URL || "http://x").pathname;
  } catch {
    /* keep raw */
  }
  if (SILENT.some((s) => path.includes(s))) return null;

  const rpc = path.match(/\/rest\/v1\/rpc\/([^/?]+)/);
  if (rpc) return { action: `RPC ${rpc[1]}`, module: "api" };

  const fn = path.match(/\/functions\/v1\/([^/?]+)/);
  if (fn) return { action: `FUNCTION ${fn[1]}`, module: "api" };

  const auth = path.match(/\/auth\/v1\/([^/?]+)/);
  if (auth) return { action: `AUTH ${auth[1]}`, module: "login" };

  const store = path.match(/\/storage\/v1\/object\/([^?]+)/);
  if (store) return { action: `${method} storage/${store[1]}`, module: "storage" };

  const table = path.match(/\/rest\/v1\/([^/?]+)/);
  if (table) return { action: `${method} ${table[1]}`, module: "api" };

  return { action: `${method} ${path}`, module: "api" };
}

/* ------------------------------------------------------------------ session */

export function auditSessionId(): string {
  if (typeof window === "undefined") return "server";
  try {
    let id = window.sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id =
        (crypto as any)?.randomUUID?.().slice(0, 18) ??
        Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      window.sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

/**
 * Stable identifier for this browser, kept in localStorage so it survives sign-out,
 * tab closes and restarts. Lets you follow one physical device across sessions and
 * across different accounts — which is what catches a shared or borrowed login.
 * (It is cleared if the user wipes site data; that is unavoidable in a browser.)
 */
export function deviceId(): string {
  if (typeof window === "undefined") return "server";
  try {
    let id = window.localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id =
        "d-" +
        ((crypto as any)?.randomUUID?.().replace(/-/g, "").slice(0, 20) ??
          Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
      window.localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return "no-storage";
  }
}

/** Browser timezone — a useful second signal for region alongside the geo-IP country. */
function timezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
}

/** Grab the current access token so the RPC can resolve auth.uid(). */
function accessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !/^sb-.*-auth-token$/.test(k)) continue;
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const t = parsed?.access_token ?? parsed?.currentSession?.access_token;
      if (t) return t as string;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/* ------------------------------------------------------------------ buffer */

let buffer: AuditEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let sending = false;

async function flush(useKeepalive = false): Promise<void> {
  if (typeof window === "undefined") return;
  if (sending || buffer.length === 0 || !SUPABASE_URL || !SUPABASE_KEY) return;

  const batch = buffer.slice(0, 200);
  buffer = buffer.slice(batch.length);
  sending = true;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${accessToken() ?? SUPABASE_KEY}`,
  };

  try {
    // Deliberately the raw fetch, not the audited one, so flushing is never logged.
    await originalFetch(`${SUPABASE_URL}/rest/v1/rpc/log_access_batch`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        p_events: batch,
        p_session: auditSessionId(),
        p_device: deviceId(),
        p_tz: timezone(),
      }),
      keepalive: useKeepalive,
    });
  } catch {
    /* logging must never surface an error to the user */
  } finally {
    sending = false;
  }
}

function schedule(): void {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    void flush();
  }, FLUSH_MS);
}

/** Queue one event. Safe to call from anywhere; never throws. */
export function logAccess(e: AuditEvent): void {
  if (typeof window === "undefined") return;
  try {
    buffer.push({
      kind: "action",
      status: "ok",
      route: window.location?.pathname,
      at: new Date().toISOString(),
      ...e,
    });
    if (buffer.length >= MAX_BUFFER) void flush();
    else schedule();
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ fetch wrapper */

const originalFetch: typeof fetch =
  typeof window !== "undefined" ? window.fetch.bind(window) : (globalThis.fetch as typeof fetch);

/**
 * Drop-in replacement for fetch handed to the Supabase client, so every single call
 * the app makes is recorded with its endpoint, HTTP status and duration.
 */
export const auditedFetch: typeof fetch = async (input, init) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : (input as Request).url;
  const method = (init?.method ?? (input as Request)?.method ?? "GET").toUpperCase();
  const t0 = Date.now();

  // For sign-in attempts, pull out the login id (never the password) so a failed
  // attempt shows who was being tried, from which IP.
  let attempted: string | undefined;
  if (/\/auth\/v1\/token/.test(url) && typeof init?.body === "string") {
    try {
      const b = JSON.parse(init.body);
      attempted = b?.email ?? b?.phone ?? undefined;
    } catch {
      /* not JSON */
    }
  }

  try {
    const res = await originalFetch(input as any, init);
    const desc = describeRequest(url, method);
    if (desc) {
      const failed = !res.ok;
      logAccess({
        kind: attempted ? "auth" : "api",
        module: desc.module,
        action: attempted ? (failed ? "Sign-in failed" : "Sign-in succeeded") : desc.action,
        status: failed ? "fail" : "ok",
        latency: Date.now() - t0,
        detail: {
          code: res.status,
          ...(failed ? { text: res.statusText } : {}),
          ...(attempted ? { login: attempted } : {}),
        },
      });
      if (failed && attempted) void flush();
    }
    return res;
  } catch (err) {
    const desc = describeRequest(url, method);
    if (desc) {
      logAccess({
        kind: "api",
        module: desc.module,
        action: desc.action,
        status: "fail",
        latency: Date.now() - t0,
        detail: { error: String((err as Error)?.message ?? err).slice(0, 200) },
      });
      void flush();
    }
    throw err;
  }
};

/* ------------------------------------------------------------------ page + auth + errors */

let lastRoute = "";

/**
 * Record that the user opened a page. Called on every route change.
 *
 * The label is built from the ROUTE, never from document.title: at the moment a route
 * change fires, the title still belongs to the previous page, so using it mislabels
 * every entry by one step. The real title is captured a tick later, into `detail`.
 */
export function logPageView(path: string, _title?: string): void {
  if (!path || path === lastRoute) return;
  const from = lastRoute;
  lastRoute = path;

  const settleTitle = () =>
    typeof document !== "undefined" ? document.title || undefined : undefined;

  setTimeout(() => {
    logAccess({
      kind: "page",
      module: moduleForRoute(path),
      route: path,
      action: `Opened ${path}`,
      detail: {
        title: settleTitle(),
        from: from || undefined,
        referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
      },
    });
  }, 0);
}

export function logAuthEvent(
  action: string,
  status: "ok" | "fail" = "ok",
  detail?: Record<string, unknown>,
): void {
  logAccess({ kind: "auth", module: "login", action, status, detail });
  void flush();
}

let started = false;

/** Wire up global capture. Safe to call more than once. */
export function startAudit(): void {
  if (started || typeof window === "undefined") return;
  started = true;

  window.addEventListener("error", (ev) => {
    logAccess({
      kind: "error",
      module: moduleForRoute(window.location.pathname),
      action: `JS error: ${String(ev.message).slice(0, 200)}`,
      status: "fail",
      detail: { source: ev.filename, line: ev.lineno, col: ev.colno },
    });
  });

  window.addEventListener("unhandledrejection", (ev) => {
    logAccess({
      kind: "error",
      module: moduleForRoute(window.location.pathname),
      action: `Unhandled rejection: ${String((ev as PromiseRejectionEvent).reason).slice(0, 200)}`,
      status: "fail",
    });
  });

  // Make sure nothing is lost when the tab closes.
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flush(true);
  });
  window.addEventListener("pagehide", () => void flush(true));
}

export default {
  logAccess,
  logPageView,
  logAuthEvent,
  startAudit,
  auditedFetch,
  auditSessionId,
  deviceId,
};
