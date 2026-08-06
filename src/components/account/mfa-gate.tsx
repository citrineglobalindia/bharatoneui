import { useEffect, useState } from "react";
import { toast } from "sonner";
import { KeyRound, Loader2, ShieldCheck, Smartphone, Copy, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  beginEnroll, clearUnverifiedFactors, firstVerifiedFactorId, verifyCode,
} from "@/lib/mfa";

/**
 * The full-screen stop shown when a staff member owes a second factor.
 *
 * Two situations, one component:
 *  - "challenge": they have an authenticator and must enter this session's code.
 *  - "enroll":    their role requires a factor and they have none yet.
 *
 * There is deliberately no "skip" or "remind me later". A control that can be
 * postponed indefinitely is not a control, and the roles this applies to are
 * the ones that move money and read personal data.
 */
export function MfaGate({ mode, onPassed }: { mode: "challenge" | "enroll"; onPassed: () => void }) {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [starting, setStarting] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let on = true;
    (async () => {
      if (mode === "challenge") {
        const id = await firstVerifiedFactorId();
        if (!on) return;
        setFactorId(id); setStarting(false);
        if (!id) setErr("No authenticator found on this account. Ask an administrator to reset your two-factor setup.");
        return;
      }
      // Enrolment: drop any half-finished attempt first, or Supabase refuses
      // to issue a second factor and the screen dead-ends.
      await clearUnverifiedFactors();
      const r = await beginEnroll();
      if (!on) return;
      setStarting(false);
      if ("error" in r) { setErr(r.error); return; }
      setFactorId(r.factorId); setQr(r.qr); setSecret(r.secret);
    })();
    return () => { on = false; };
  }, [mode]);

  const submit = async () => {
    if (!factorId) return;
    if (!/^\d{6}$/.test(code.trim())) return toast.error("Enter the 6-digit code from your app");
    setBusy(true);
    try {
      const r = await verifyCode(factorId, code);
      if ("error" in r) {
        setCode("");
        return toast.error("That code was not accepted", { description: r.error });
      }
      toast.success(mode === "enroll" ? "Two-factor authentication is on" : "Verified");
      onPassed();
    } finally { setBusy(false); }
  };

  const signOut = async () => {
    try { localStorage.removeItem("bharatone:auth"); } catch { /* ignore */ }
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="grid min-h-screen place-items-center bg-muted/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-elev">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-india-green/10 text-india-green">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display text-lg font-extrabold">
              {mode === "enroll" ? "Set up two-factor authentication" : "Two-factor verification"}
            </p>
            <p className="text-xs text-muted-foreground">
              {mode === "enroll"
                ? "Your role handles money or personal data, so an authenticator app is required."
                : "Enter the current code from your authenticator app."}
            </p>
          </div>
        </div>

        {starting ? (
          <div className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : err ? (
          <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{err}</div>
        ) : (
          <>
            {mode === "enroll" && (
              <div className="mt-5 space-y-3">
                <p className="text-sm text-muted-foreground">
                  1. Install Google Authenticator, Microsoft Authenticator or Authy.
                  2. Scan this code. 3. Enter the six digits it shows.
                </p>
                <p className="rounded-lg bg-muted/60 px-2.5 py-2 text-[11px] text-muted-foreground">
                  It will be saved in your app as <b className="text-foreground">BharatOne</b>. If an
                  older entry shows a different name, delete it — only this one will work.
                </p>
                {qr && (
                  <div className="flex justify-center rounded-xl border border-border bg-white p-3">
                    <img src={qr} alt="Two-factor QR code" className="h-44 w-44" />
                  </div>
                )}
                {secret && (
                  <div className="rounded-lg bg-muted/60 p-2.5">
                    <p className="text-[11px] font-semibold text-muted-foreground">Can&apos;t scan? Enter this key manually:</p>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="flex-1 break-all font-mono text-xs">{secret}</code>
                      <button onClick={() => { navigator.clipboard?.writeText(secret); toast.success("Key copied"); }}
                        className="shrink-0 text-muted-foreground hover:text-foreground" aria-label="Copy key">
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <label className="mt-5 block text-[11px] font-semibold text-muted-foreground">
              <Smartphone className="mr-1 inline h-3.5 w-3.5" /> Six-digit code
            </label>
            <input
              inputMode="numeric"
              autoFocus
              maxLength={6}
              className="mt-1 h-12 w-full rounded-xl border border-border bg-background text-center font-mono text-2xl tracking-[0.4em] outline-none focus-visible:ring-2 focus-visible:ring-india-green/30"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            />
            <Button onClick={submit} disabled={busy || code.length !== 6}
              className="mt-3 h-11 w-full bg-india-green text-white hover:bg-india-green/90">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              {mode === "enroll" ? "Turn on two-factor" : "Verify and continue"}
            </Button>
          </>
        )}

        <button onClick={signOut}
          className="mt-4 flex w-full items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
        <p className="mt-3 text-center text-[10px] text-muted-foreground">
          Lost your phone? An administrator can reset your authenticator from User Management.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Boundary                                                                  */
/* ------------------------------------------------------------------------ */

import { useRouterState } from "@tanstack/react-router";
import { myMfaRequirement, needsChallenge } from "@/lib/mfa";

/** Paths a signed-in user may still browse without settling their second factor. */
const OPEN_PREFIXES = [
  "/", "/about", "/gallery", "/schemes", "/careers", "/contact", "/citizen-services",
  "/privacy", "/terms", "/refund-policy", "/services", "/p/", "/register", "/get-started",
  "/franchise-terms", "/track-application", "/verify/", "/reupload-docs/", "/forgot-password",
];
const isOpenPath = (p: string) =>
  OPEN_PREFIXES.some((x) => (x.endsWith("/") ? p.startsWith(x) : p === x)) || p.includes("-login") || p === "/login";

/**
 * Wraps the whole application. If the signed-in user owes a second factor, the
 * app is replaced by the gate until they settle it.
 *
 * Placed at the root rather than inside each portal shell on purpose: there are
 * eight shells and more will be added, and a control that has to be remembered
 * in eight places is one that will eventually be forgotten in the ninth.
 */
export function StaffMfaBoundary({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mode, setMode] = useState<"ok" | "challenge" | "enroll" | "unknown">("unknown");

  const recheck = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data?.session?.user?.id) { setMode("ok"); return; }
    if (await needsChallenge()) { setMode("challenge"); return; }
    const req = await myMfaRequirement();
    setMode(!req.required || req.enrolled ? "ok" : "enroll");
  };

  useEffect(() => {
    let on = true;
    void (async () => { await recheck(); if (!on) return; })();
    const { data: sub } = supabase.auth.onAuthStateChange((e) => {
      if (e === "SIGNED_IN" || e === "SIGNED_OUT") void recheck();
    });
    return () => { on = false; sub.subscription.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Never hold up the public site, the login pages or the registration flow —
  // and never flash the gate before the check has actually run.
  if (mode === "unknown" || mode === "ok" || isOpenPath(pathname)) return <>{children}</>;
  return <MfaGate mode={mode} onPassed={() => { void recheck(); }} />;
}
