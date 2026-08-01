import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Auth guard for the signed-in portals.
 *
 * Portal pages (e.g. /qc/kyc-queue, /accountant/*, /distributor/*) previously
 * rendered for ANY visitor because the shells had no auth check — only the data
 * was RLS-protected, so an anonymous user still saw the full UI. This guard
 * blocks that: it requires a live Supabase session AND that the user holds one
 * of the allowed roles (verified against `user_roles`, never a localStorage
 * value), otherwise it redirects to the portal's login.
 *
 * Usage (call once, unconditionally, at the top of a portal Shell):
 *   const ready = usePortalGuard("/qc-login", ["qc", "admin"]);
 *   ...declare the rest of the shell's hooks...
 *   if (!ready) return <PortalAuthGate />;   // after all hooks
 *
 * ── Why the cache below exists ────────────────────────────────────────────
 * Every portal route file renders its own <Shell>, so moving from
 * /hr/dashboard to /hr/attendance UNMOUNTS one shell and MOUNTS another.
 * Without a cache that meant, on every single click: a getUser() call (which
 * goes over the network to the auth server), plus a user_roles select — and a
 * full-screen "Checking access…" spinner while both were in flight. Two round
 * trips is the difference between instant and a second of blank screen.
 *
 * The roles a user holds do not change while they are clicking around, so we
 * verify once and reuse the answer. The cache is dropped the moment they sign
 * out, the user changes, or ROLE_TTL_MS elapses — so a revoked role takes
 * effect quickly, and the database is the authority in any case: RLS refuses
 * the data even if the UI were fooled.
 */

type Verdict = { userId: string; roles: string[]; isSuper: boolean; at: number };

/** How long a verified set of roles is reused before being re-checked. */
const ROLE_TTL_MS = 5 * 60 * 1000;

let cache: Verdict | null = null;
/** De-duplicates concurrent lookups when several shells mount at once. */
let inFlight: Promise<Verdict | null> | null = null;

const fresh = (v: Verdict | null): boolean =>
  Boolean(v) && Date.now() - (v as Verdict).at < ROLE_TTL_MS;

/** Called on sign-out and by the login pages, so the next user is re-checked. */
export function clearPortalGuardCache(): void {
  cache = null;
  inFlight = null;
}

async function resolveVerdict(): Promise<Verdict | null> {
  // getSession() reads the token supabase-js already restored from
  // localStorage — no network. getUser(), which this used to call, is a
  // round trip to the auth server on every mount.
  const { data } = await supabase.auth.getSession();
  const userId = data?.session?.user?.id;
  if (!userId) return null;

  if (cache && fresh(cache) && cache.userId === userId) return cache;

  // The super admin holds no row in user_roles — the whole point is that the
  // role does not exist in the enum, so it cannot show up in an admin's role
  // list. Without asking separately, every portal guard would turn away the one
  // account that is meant to reach all of them.
  const [{ data: rows, error }, { data: sup }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", userId),
    (supabase as any).rpc("super_session_state"),
  ]);
  // A transient network failure must not sign a legitimate user out. If we
  // already knew their roles, keep trusting that until the TTL expires.
  if (error) return cache && cache.userId === userId ? cache : null;

  cache = {
    userId,
    roles: (rows ?? []).map((r: { role: string }) => r.role as string),
    isSuper: (sup as { is_super?: boolean } | null)?.is_super === true,
    at: Date.now(),
  };
  return cache;
}

function verdict(): Promise<Verdict | null> {
  if (!inFlight) {
    inFlight = resolveVerdict().finally(() => { inFlight = null; });
  }
  return inFlight;
}

export function usePortalGuard(loginPath: string, allow: string[]): boolean {
  const navigate = useNavigate();

  // If this user was already verified for this portal, start ready. That is
  // what removes the spinner between pages of the same portal.
  const [ready, setReady] = useState(
    () => Boolean(cache && fresh(cache) &&
      (cache.isSuper || cache.roles.some((r) => allow.includes(r)))),
  );
  const allowRef = useRef(allow);
  allowRef.current = allow;

  useEffect(() => {
    let active = true;

    const deny = () => {
      if (!active) return;
      clearPortalGuardCache();
      setReady(false);
      // Remember where they were headed so the login can return them there
      // instead of dropping everyone on a default dashboard.
      try {
        const here = window.location.pathname + window.location.search;
        if (here && !here.includes("-login") && here !== "/login") {
          sessionStorage.setItem("bo_after_login", here);
        }
      } catch { /* private mode — the redirect just falls back to default */ }
      navigate({ to: loginPath as never, replace: true });
    };

    void (async () => {
      const v = await verdict();
      if (!active) return;
      if (!v) return deny();
      // A verified super admin passes every portal guard. That is what "can
      // handle everything" means in practice — one account that can open any
      // portal without holding a row for each of their roles.
      if (v.isSuper || v.roles.some((r) => allowRef.current.includes(r))) setReady(true);
      else deny();
    })();

    // Eject the user if they sign out while on the page.
    //
    // Only SIGNED_OUT is treated as a denial. supabase-js also emits
    // INITIAL_SESSION on subscribe and TOKEN_REFRESHED in the background, and
    // those can arrive with a null session for a moment during a page reload —
    // acting on them is what used to bounce people out to a login (and from
    // there back to a dashboard) when they pressed refresh.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") { deny(); return; }
      if (event === "SIGNED_IN" && session?.user?.id !== cache?.userId) {
        clearPortalGuardCache();
      }
    });

    return () => { active = false; sub.subscription.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return ready;
}

/**
 * Where to send someone straight after they sign in, if we know.
 *
 * `within` is the destination the login would otherwise use. The remembered
 * path is only honoured if it sits under the same top-level section, so a
 * retailer who once hit /admin is never sent back there on their next sign-in.
 */
export function takeAfterLoginPath(within?: string): string | null {
  try {
    const p = sessionStorage.getItem("bo_after_login");
    if (!p) return null;
    sessionStorage.removeItem("bo_after_login");
    if (within) {
      const seg = "/" + within.replace(/^\//, "").split(/[/?]/)[0];
      if (p !== seg && !p.startsWith(seg + "/") && !p.startsWith(seg + "?")) return null;
    }
    return p;
  } catch { return null; }
}

/** Full-screen placeholder shown while the guard verifies the session. */
export function PortalAuthGate() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
        <p className="text-sm">Checking access…</p>
      </div>
    </div>
  );
}
