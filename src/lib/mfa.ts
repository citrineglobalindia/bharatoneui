import { supabase } from "@/integrations/supabase/client";

/**
 * Two-factor authentication for staff.
 *
 * Uses Supabase's own TOTP support rather than a hand-rolled scheme — the
 * secret, the QR payload, the 30-second window and the replay protection are
 * all handled by the auth server, and the second factor is bound into the
 * session's assurance level (aal1 -> aal2) rather than being a flag the
 * browser could set for itself.
 *
 * Who must enrol is decided by the DATABASE (my_mfa_requirement reads the
 * mfa_required_roles setting), never by the client, so a modified browser
 * cannot declare itself exempt.
 */

export type MfaRequirement = {
  required: boolean;
  enrolled: boolean;
  factors: number;
  roles: string[];
};

export async function myMfaRequirement(): Promise<MfaRequirement> {
  try {
    const { data, error } = await (supabase.rpc as any)("my_mfa_requirement");
    if (error || !data) return { required: false, enrolled: false, factors: 0, roles: [] };
    const d = data as Partial<MfaRequirement>;
    return {
      required: !!d.required,
      enrolled: !!d.enrolled,
      factors: Number(d.factors ?? 0),
      roles: (d.roles as string[]) ?? [],
    };
  } catch {
    // Never lock people out because a status check failed.
    return { required: false, enrolled: false, factors: 0, roles: [] };
  }
}

/**
 * Where this session stands.
 *
 * `current` is what the session has proved so far; `next` is what it COULD
 * reach. next === "aal2" while current === "aal1" means: this account has a
 * verified factor and has not yet presented it.
 */
export async function assuranceLevel(): Promise<{ current: string | null; next: string | null }> {
  try {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    return { current: data?.currentLevel ?? null, next: data?.nextLevel ?? null };
  } catch {
    return { current: null, next: null };
  }
}

/** True when the signed-in user still owes a TOTP code for this session. */
export async function needsChallenge(): Promise<boolean> {
  const { current, next } = await assuranceLevel();
  return next === "aal2" && current === "aal1";
}

/**
 * What the authenticator app displays above the code.
 *
 * Left unset, Supabase derives this from the project's Site URL — which was
 * still http://localhost:3000, so staff saw "localhost:3000" in Google
 * Authenticator next to a code guarding real money. Setting it here means the
 * label is a property of the application, not of a dashboard field somebody
 * has to remember to change.
 */
const MFA_ISSUER = "BharatOne";

/** Start enrolment; returns the QR (an SVG data URI) and the manual key. */
export async function beginEnroll(): Promise<{ factorId: string; qr: string; secret: string } | { error: string }> {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    issuer: MFA_ISSUER,
    // Shown as the account line under the issuer. A date is more useful than a
    // repeat of the brand when somebody re-enrols after losing a phone.
    friendlyName: `BharatOne · ${new Date().toISOString().slice(0, 10)}`,
  });
  if (error) return { error: error.message };
  return {
    factorId: data.id,
    qr: (data as any).totp?.qr_code ?? "",
    secret: (data as any).totp?.secret ?? "",
  };
}

/** Finish enrolment (or satisfy a login challenge) with a 6-digit code. */
export async function verifyCode(factorId: string, code: string): Promise<{ ok: true } | { error: string }> {
  const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
  if (chErr) return { error: chErr.message };
  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: ch.id,
    code: code.replace(/\D/g, ""),
  });
  if (error) return { error: error.message };
  return { ok: true };
}

/** The verified factor to challenge at sign-in, if any. */
export async function firstVerifiedFactorId(): Promise<string | null> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) return null;
  const totp = (data?.totp ?? []).find((f: any) => f.status === "verified") ?? (data?.totp ?? [])[0];
  return totp?.id ?? null;
}

/** Remove a factor. Only meaningful for a user who is not required to hold one. */
export async function removeFactor(factorId: string): Promise<{ ok: true } | { error: string }> {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) return { error: error.message };
  return { ok: true };
}

/** Any pending (started but never verified) enrolment, so retries do not pile up. */
export async function clearUnverifiedFactors(): Promise<void> {
  try {
    const { data } = await supabase.auth.mfa.listFactors();
    for (const f of (data?.totp ?? []) as any[]) {
      if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
  } catch { /* best effort */ }
}
