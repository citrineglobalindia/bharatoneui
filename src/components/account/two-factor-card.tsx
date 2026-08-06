import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ShieldCheck, ShieldAlert, Loader2, Smartphone, Copy, Trash2, KeyRound, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { OtpBoxes, SuccessSeal } from "@/components/auth/two-factor-dialog";
import {
  beginEnroll, clearUnverifiedFactors, myMfaRequirement, removeFactor, verifyLoginCode,
  type MfaRequirement,
} from "@/lib/mfa";
import { supabase } from "@/integrations/supabase/client";

/**
 * Two-factor authentication, as a card the user can act on from Settings.
 *
 * Staff could be *forced* into an authenticator by the login gate but had
 * nowhere to look at it afterwards: no way to check whether it was on, no way
 * to move it to a new phone before wiping the old one, and — in HR Settings —
 * a decorative tile that read "Two-factor auth · Enabled via authenticator" on
 * an account that had never enrolled. A security screen that states something
 * false is worse than no screen, because people stop checking.
 *
 * Everything here is read live from the auth server and from
 * my_mfa_requirement(), so it says what is actually true of this account.
 */
export function TwoFactorCard() {
  const [req, setReq] = useState<MfaRequirement | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"view" | "enroll" | "done">("view");
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [state, setState] = useState<"idle" | "checking" | "error" | "success">("idle");
  const [codeErr, setCodeErr] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const code = digits.join("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.auth.getSession();
    if (!data?.session) { setReq(null); setLoading(false); return; }
    setReq(await myMfaRequirement());
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const start = async () => {
    setStarting(true);
    setCodeErr(null);
    setDigits(["", "", "", "", "", ""]);
    // Drop any half-finished attempt, or the auth server refuses a second one
    // and the panel dead-ends on an enrolment that can never be completed.
    await clearUnverifiedFactors();
    const r = await beginEnroll();
    setStarting(false);
    if ("error" in r) { toast.error("Couldn't start setup", { description: r.error }); return; }
    setFactorId(r.factorId); setQr(r.qr); setSecret(r.secret); setStep("enroll");
  };

  const submit = useCallback(async () => {
    if (!factorId || code.length !== 6 || state === "checking" || state === "success") return;
    setState("checking"); setCodeErr(null);
    const r = await verifyLoginCode(factorId, code);
    if ("ok" in r) {
      setState("success");
      window.setTimeout(async () => { setStep("done"); await load(); }, 1250);
      return;
    }
    setCodeErr(r.error);
    setState("error");
    window.setTimeout(() => { setDigits(["", "", "", "", "", ""]); setState("idle"); }, 520);
  }, [factorId, code, state, load]);

  useEffect(() => { if (code.length === 6 && state === "idle") void submit(); }, [code, state, submit]);

  const turnOff = async () => {
    if (!req) return;
    if (req.required) {
      toast.error("Your role requires two-factor authentication", {
        description: "It cannot be switched off. To move it to a new phone, ask an administrator to reset it.",
      });
      return;
    }
    const { data } = await supabase.auth.mfa.listFactors();
    const f = (data?.totp ?? [])[0];
    if (!f) return;
    if (!confirm("Turn off two-factor authentication for your account?")) return;
    const r = await removeFactor(f.id);
    if ("error" in r) { toast.error(r.error); return; }
    toast.success("Two-factor authentication turned off");
    await load();
  };

  if (loading) {
    return (
      <div className="grid h-28 place-items-center rounded-2xl border border-border bg-card shadow-soft">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!req) return null;

  const on = req.enrolled;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`grid h-11 w-11 place-items-center rounded-xl ${on ? "bg-india-green/10 text-india-green" : "bg-amber-100 text-amber-700"}`}>
            {on ? <ShieldCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
          </span>
          <div>
            <p className="text-sm font-bold">
              Two-factor authentication is {on ? "on" : "off"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {on
                ? "Every sign-in asks for the 6-digit code from your authenticator app."
                : req.required
                  ? "Your role handles money or personal data, so this is required."
                  : "Optional for your role, but recommended."}
            </p>
          </div>
        </div>
        {on && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-india-green/10 px-2.5 py-1 text-[11px] font-bold text-india-green">
            <Smartphone className="h-3 w-3" /> Authenticator app
          </span>
        )}
      </div>

      {step === "done" && (
        <div className="mt-4 rounded-xl border border-india-green/30 bg-india-green/5 p-3 text-center text-[11px] font-semibold text-india-green">
          Set up. Keep the app on your phone — you will need it at every sign-in.
        </div>
      )}

      {step === "view" && !on && (
        <Button onClick={start} disabled={starting} className="mt-4 h-10 bg-india-green text-white hover:bg-india-green/90">
          {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Turn on two-factor
        </Button>
      )}

      {step !== "enroll" && on && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {req.required ? (
            <p className="rounded-lg bg-muted/60 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
              Required for your role, so it cannot be switched off here. Changing phone?
              Ask an administrator to reset it from User Management, then set it up again.
            </p>
          ) : (
            <Button variant="outline" onClick={turnOff} className="h-9 border-rose-200 text-rose-600 hover:bg-rose-50">
              <Trash2 className="h-3.5 w-3.5" /> Turn off
            </Button>
          )}
        </div>
      )}

      {step === "enroll" && (
        <div className="mt-4 rounded-xl border border-india-green/30 bg-india-green/5 p-4">
          {state === "success" ? (
            <SuccessSeal label="Two-factor is on" sub="You will need your app at every sign-in." />
          ) : (
            <>
              <div className="mb-3 flex items-start justify-between gap-3">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  1. Install Google Authenticator, Microsoft Authenticator or Authy.
                  2. Scan this code. 3. Enter the six digits it shows.
                  <br />
                  It will be saved as <b className="text-foreground">BharatOne</b>.
                </p>
                <button
                  onClick={() => { setStep("view"); setQr(""); setSecret(""); setFactorId(null); }}
                  aria-label="Cancel setup"
                  className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-black/5 hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-wrap items-start gap-5">
                {qr && (
                  <img src={qr} alt="Two-factor QR code" className="h-40 w-40 rounded-lg border border-border bg-white p-1" />
                )}
                <div className="min-w-[230px] flex-1 space-y-3">
                  {secret && (
                    <div className="rounded-lg bg-card p-2.5">
                      <p className="text-[11px] font-semibold text-muted-foreground">Can&apos;t scan? Enter this key:</p>
                      <div className="mt-1 flex items-center gap-2">
                        <code className="flex-1 break-all font-mono text-[11px]">{secret}</code>
                        <button
                          onClick={() => { navigator.clipboard?.writeText(secret); toast.success("Key copied"); }}
                          aria-label="Copy key"
                          className="shrink-0 text-muted-foreground hover:text-foreground"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                  <OtpBoxes digits={digits} setDigits={setDigits} disabled={state === "checking"} state={state} />
                  <div className="flex min-h-[18px] items-center justify-center">
                    {state === "checking" ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking your code…
                      </span>
                    ) : codeErr ? (
                      <span className="text-center text-[11px] font-semibold text-rose-600">{codeErr}</span>
                    ) : null}
                  </div>
                  <Button
                    onClick={submit}
                    disabled={code.length !== 6 || state === "checking"}
                    className="h-10 w-full bg-india-green text-white hover:bg-india-green/90"
                  >
                    <KeyRound className="h-4 w-4" /> Verify and turn on
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
