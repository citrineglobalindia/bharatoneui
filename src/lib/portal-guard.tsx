import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

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
 */
export function usePortalGuard(loginPath: string, allow: string[]): boolean {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    const deny = () => {
      if (!active) return;
      setReady(false);
      navigate({ to: loginPath as never, replace: true });
    };
    (async () => {
      // Restore an existing session if the tab lost it; never CREATES a session
      // for an anonymous visitor (ensureStaffSession returns false with no stored role).
      await ensureStaffSession();
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) return deny();
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      if (!active) return;
      const allowed = (roles ?? []).some((r: { role: string }) => allow.includes(r.role));
      if (allowed) setReady(true); else deny();
    })();
    // If the user signs out (or the session expires) while on the page, eject them.
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session?.user) deny();
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return ready;
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
