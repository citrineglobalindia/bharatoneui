import { supabase } from "@/integrations/supabase/client";

/**
 * Slows down password guessing through our own login forms.
 *
 * Scope, stated plainly: this sits in front of OUR forms. Somebody calling the
 * auth interface directly does not pass through it — the control for that is
 * the rate limit configured in the Supabase dashboard. This is the layer that
 * stops the ordinary case, a credential-stuffing run against the website, and
 * it is not a substitute for the other.
 *
 * Every call is best-effort. If the throttle itself is unreachable, sign-in
 * proceeds: a broken counter must never become the reason nobody can work.
 */

export type Gate = { allowed: boolean; message?: string; retryAfter?: number };

/** Ask before attempting. A refusal here means we never send the password. */
export async function checkLoginAllowed(identifier: string): Promise<Gate> {
  try {
    const { data, error } = await (supabase.rpc as any)("login_gate", { _identifier: identifier });
    if (error || !data) return { allowed: true };
    const d = data as { allowed?: boolean; message?: string; retry_after?: number };
    return { allowed: d.allowed !== false, message: d.message, retryAfter: d.retry_after };
  } catch {
    return { allowed: true };
  }
}

/**
 * Record a rejected password.
 *
 * Called only for a genuine credential rejection — not for a restricted
 * account, a captcha mismatch or a network failure. Counting those would lock
 * people out for reasons that have nothing to do with guessing.
 */
export async function noteLoginFailure(identifier: string): Promise<void> {
  try { await (supabase.rpc as any)("note_login_failure", { _identifier: identifier }); } catch { /* best effort */ }
}

/** Clear the counter once they get in. */
export async function noteLoginSuccess(identifier: string): Promise<void> {
  try { await (supabase.rpc as any)("note_login_success", { _identifier: identifier }); } catch { /* best effort */ }
}
