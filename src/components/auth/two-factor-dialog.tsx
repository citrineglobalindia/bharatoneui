import { useCallback, useEffect, useRef, useState } from "react";
import { ShieldCheck, Loader2, Smartphone, X, HelpCircle } from "lucide-react";
import { BharatOneLogo } from "@/components/bharatone-logo";

/**
 * The two-factor step at sign-in.
 *
 * This used to be `window.prompt()`. That dialog is drawn by the browser, so it
 * carried the bare hostname ("mybharatone.com says…") above a plain text box —
 * indistinguishable from the prompt any other site, or any injected script, can
 * raise. For the one screen in the product whose entire job is proving identity,
 * an unbranded system box is the wrong thing to train staff to trust. It also
 * blocks the main thread, cannot show whether the code was wrong without a
 * second dialog, and has no way to say "your code is about to expire".
 *
 * So: our own dialog, carrying our own logo, six boxes that auto-advance and
 * accept a paste, a live countdown to the next 30-second code window, inline
 * retry on a wrong code, and a success seal before the portal opens.
 *
 * Used imperatively so the three sign-in forms don't each need dialog state:
 *
 *   const passed = await askTwoFactor({ account: email, verify });
 *
 * `<TwoFactorHost />` is mounted once at the root. If it somehow isn't mounted,
 * askTwoFactor falls back to the old prompt rather than dead-ending a login.
 */

export type TwoFactorVerify = (code: string) => Promise<{ ok: true } | { error: string }>;

export type TwoFactorRequest = {
  /** Shown under the heading — usually the address they signed in with. */
  account?: string;
  title?: string;
  subtitle?: string;
  verify: TwoFactorVerify;
};

type PendingRequest = TwoFactorRequest & { resolve: (passed: boolean) => void };

let publish: ((r: PendingRequest | null) => void) | null = null;

/**
 * Open the dialog and resolve true only once `verify` has accepted a code.
 * Resolves false if the person cancels — the caller is expected to sign out.
 */
export function askTwoFactor(req: TwoFactorRequest): Promise<boolean> {
  if (!publish) {
    // Host not mounted. Better a plain prompt than a login that goes nowhere.
    const code = window.prompt("Two-factor authentication: enter the 6-digit code from your authenticator app");
    if (!code) return Promise.resolve(false);
    return req.verify(code.replace(/\D/g, "")).then((r) => "ok" in r);
  }
  return new Promise<boolean>((resolve) => {
    publish!({ ...req, resolve });
  });
}

/* -------------------------------------------------------------------------- */
/* Shared pieces (also used by the staff enrolment gate)                       */
/* -------------------------------------------------------------------------- */

const KEYFRAMES = `
@keyframes bo2fa-shake {
  0%,100% { transform: translateX(0); }
  15% { transform: translateX(-7px); }
  30% { transform: translateX(6px); }
  45% { transform: translateX(-4px); }
  60% { transform: translateX(3px); }
  80% { transform: translateX(-1px); }
}
@keyframes bo2fa-pop {
  0% { transform: scale(0.4); opacity: 0; }
  60% { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes bo2fa-draw { to { stroke-dashoffset: 0; } }
@keyframes bo2fa-ripple {
  0% { transform: scale(0.6); opacity: 0.55; }
  100% { transform: scale(2.1); opacity: 0; }
}
@keyframes bo2fa-rise {
  0% { transform: translateY(8px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}
@keyframes bo2fa-sheen {
  0% { transform: translateX(-120%); }
  100% { transform: translateX(220%); }
}
.bo2fa-shake { animation: bo2fa-shake .45s cubic-bezier(.36,.07,.19,.97); }
.bo2fa-pop { animation: bo2fa-pop .38s cubic-bezier(.34,1.56,.64,1) both; }
.bo2fa-rise { animation: bo2fa-rise .34s ease-out both; }
.bo2fa-draw { stroke-dasharray: 36; stroke-dashoffset: 36; animation: bo2fa-draw .38s .16s ease-out forwards; }
.bo2fa-ripple { animation: bo2fa-ripple .9s ease-out forwards; }
.bo2fa-sheen { animation: bo2fa-sheen 1.5s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .bo2fa-shake, .bo2fa-pop, .bo2fa-rise, .bo2fa-draw, .bo2fa-ripple, .bo2fa-sheen { animation: none !important; }
  .bo2fa-draw { stroke-dashoffset: 0; }
}
`;

function Keyframes() {
  return <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />;
}

/** Seconds left in the current 30-second TOTP window. */
function useTotpWindow() {
  const [left, setLeft] = useState(() => 30 - (Math.floor(Date.now() / 1000) % 30));
  useEffect(() => {
    const t = window.setInterval(() => setLeft(30 - (Math.floor(Date.now() / 1000) % 30)), 250);
    return () => window.clearInterval(t);
  }, []);
  return left;
}

/**
 * The countdown a TOTP dialog should always have had. Most "invalid code"
 * reports are a code typed just as its window rolled over; showing the roll-over
 * lets people wait two seconds instead of retyping the same stale digits.
 */
function WindowRing({ seconds }: { seconds: number }) {
  const c = 2 * Math.PI * 9;
  const low = seconds <= 5;
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
      <svg viewBox="0 0 24 24" className="h-5 w-5 -rotate-90">
        <circle cx="12" cy="12" r="9" fill="none" strokeWidth="2.5" className="stroke-border" />
        <circle
          cx="12" cy="12" r="9" fill="none" strokeWidth="2.5" strokeLinecap="round"
          className={low ? "stroke-rose-500" : "stroke-india-green"}
          style={{ strokeDasharray: c, strokeDashoffset: c * (1 - seconds / 30), transition: "stroke-dashoffset .25s linear" }}
        />
      </svg>
      <span className={low ? "text-rose-600" : undefined}>
        {low ? `New code in ${seconds}s — wait for it` : `Code changes in ${seconds}s`}
      </span>
    </span>
  );
}

/**
 * Six boxes rather than one field. Auto-advances, accepts a pasted code in any
 * box, backspaces into the previous box when the current one is already empty,
 * and never lets a non-digit through.
 */
export function OtpBoxes({
  digits, setDigits, disabled, state,
}: {
  digits: string[];
  setDigits: (d: string[]) => void;
  disabled?: boolean;
  state: "idle" | "checking" | "error" | "success";
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (state === "error") refs.current[0]?.focus();
  }, [state]);

  const focusAt = (i: number) => refs.current[Math.max(0, Math.min(5, i))]?.focus();

  const write = (i: number, ch: string) => {
    const next = [...digits];
    next[i] = ch;
    setDigits(next);
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const pasted = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const next = Array.from({ length: 6 }, (_, k) => pasted[k] ?? "");
    setDigits(next);
    focusAt(Math.min(pasted.length, 5));
  };

  const tone =
    state === "error" ? "border-rose-400 bg-rose-50 text-rose-700 focus-visible:ring-rose-200"
    : state === "success" ? "border-india-green bg-india-green/5 text-india-green"
    : "border-input bg-background focus-visible:ring-india-green/25 focus-visible:border-india-green";

  return (
    <div className={`flex justify-center gap-2 ${state === "error" ? "bo2fa-shake" : ""}`} onPaste={onPaste}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          value={digits[i] ?? ""}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${i + 1} of 6`}
          disabled={disabled}
          autoFocus={i === 0}
          onChange={(e) => {
            const ch = e.target.value.replace(/\D/g, "").slice(-1);
            write(i, ch);
            if (ch) focusAt(i + 1);
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace") {
              e.preventDefault();
              if (digits[i]) write(i, "");
              else { write(i - 1 < 0 ? 0 : i - 1, ""); focusAt(i - 1); }
            } else if (e.key === "ArrowLeft") { e.preventDefault(); focusAt(i - 1); }
            else if (e.key === "ArrowRight") { e.preventDefault(); focusAt(i + 1); }
          }}
          className={`h-14 w-11 rounded-xl border text-center font-mono text-2xl font-bold shadow-soft outline-none transition-all focus-visible:ring-4 disabled:opacity-60 sm:w-12 ${tone}`}
        />
      ))}
    </div>
  );
}

/** The green seal shown once a code is accepted, before the portal opens. */
export function SuccessSeal({ label = "Verified", sub }: { label?: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center py-4">
      <Keyframes />
      <div className="relative grid h-24 w-24 place-items-center">
        <span className="bo2fa-ripple absolute inset-0 rounded-full bg-india-green/25" />
        <span className="bo2fa-ripple absolute inset-0 rounded-full bg-india-green/20" style={{ animationDelay: ".18s" }} />
        <span className="bo2fa-pop grid h-20 w-20 place-items-center rounded-full bg-india-green shadow-elev">
          <svg viewBox="0 0 40 40" className="h-11 w-11">
            <path
              d="M11 20.5 L17.5 27 L29 14"
              fill="none" stroke="white" strokeWidth="3.6"
              strokeLinecap="round" strokeLinejoin="round"
              className="bo2fa-draw"
            />
          </svg>
        </span>
      </div>
      <p className="bo2fa-rise mt-4 font-display text-xl font-extrabold text-foreground" style={{ animationDelay: ".22s" }}>
        {label}
      </p>
      {sub && (
        <p className="bo2fa-rise mt-1 text-xs text-muted-foreground" style={{ animationDelay: ".3s" }}>
          {sub}
        </p>
      )}
      <div className="bo2fa-rise mt-4 h-1 w-40 overflow-hidden rounded-full bg-muted" style={{ animationDelay: ".36s" }}>
        <span className="bo2fa-sheen block h-full w-1/2 rounded-full bg-gradient-to-r from-transparent via-india-green to-transparent" />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* The dialog                                                                  */
/* -------------------------------------------------------------------------- */

function Dialog({ req, close }: { req: PendingRequest; close: () => void }) {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [state, setState] = useState<"idle" | "checking" | "error" | "success">("idle");
  const [err, setErr] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [help, setHelp] = useState(false);
  const seconds = useTotpWindow();
  const code = digits.join("");
  const busy = state === "checking" || state === "success";

  const cancel = useCallback(() => {
    if (busy) return;
    req.resolve(false);
    close();
  }, [busy, req, close]);

  const submit = useCallback(async () => {
    if (code.length !== 6 || busy) return;
    setState("checking");
    setErr(null);
    const r = await req.verify(code);
    if ("ok" in r) {
      setState("success");
      // Let the seal play before the portal replaces the screen.
      window.setTimeout(() => { req.resolve(true); close(); }, 1150);
      return;
    }
    setAttempts((n) => n + 1);
    setErr(r.error);
    setState("error");
    window.setTimeout(() => {
      setDigits(["", "", "", "", "", ""]);
      setState("idle");
    }, 520);
  }, [code, busy, req, close]);

  // Six digits in means they are done typing — asking for a button press too is
  // a step with no purpose.
  useEffect(() => { if (code.length === 6 && state === "idle") void submit(); }, [code, state, submit]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") cancel(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [cancel]);

  return (
    <div
      className="fixed inset-0 z-[200] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Two-factor verification"
      onMouseDown={(e) => { if (e.target === e.currentTarget) cancel(); }}
    >
      <Keyframes />
      <div className="w-full max-w-[400px] overflow-hidden rounded-2xl border border-border bg-card shadow-elev animate-in fade-in zoom-in-95 duration-300">
        {/* Tricolor rule — the same identity mark the portals carry, so this
            dialog is visibly ours and not the browser's. */}
        <div className="h-1.5 w-full bg-gradient-to-r from-saffron via-white to-india-green" />

        <div className="relative bg-gradient-to-br from-orange-50 via-white to-emerald-50 px-6 pb-5 pt-5 text-center">
          {!busy && (
            <button
              onClick={cancel}
              aria-label="Cancel sign-in"
              className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-black/5 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <div className="flex justify-center">
            <BharatOneLogo size="md" />
          </div>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-india-green/30 bg-india-green/10 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-india-green">
            <ShieldCheck className="h-3 w-3" /> Secure sign-in
          </span>
        </div>

        <div className="px-6 pb-6 pt-5">
          {state === "success" ? (
            <SuccessSeal label="Verified" sub="Opening your portal…" />
          ) : (
            <>
              <h2 className="text-center font-display text-lg font-extrabold text-foreground">
                {req.title ?? "Two-factor verification"}
              </h2>
              <p className="mt-1 text-center text-xs leading-relaxed text-muted-foreground">
                {req.subtitle ?? "Open your authenticator app and enter the 6-digit code shown for BharatOne."}
              </p>
              {req.account && (
                <p className="mt-2 truncate text-center text-[11px] font-semibold text-foreground/70">
                  <Smartphone className="mr-1 inline h-3 w-3" /> {req.account}
                </p>
              )}

              <div className="mt-5">
                <OtpBoxes digits={digits} setDigits={setDigits} disabled={busy} state={state} />
              </div>

              <div className="mt-3 flex min-h-[20px] items-center justify-center">
                {state === "checking" ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking your code…
                  </span>
                ) : err ? (
                  <span className="text-[11px] font-semibold text-rose-600">{err}</span>
                ) : (
                  <WindowRing seconds={seconds} />
                )}
              </div>

              {attempts >= 2 && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-[11px] leading-relaxed text-amber-800">
                  Two codes rejected. Check that your phone's clock is set to update
                  automatically — a phone running a minute fast or slow makes every
                  code look wrong.
                </div>
              )}

              <button
                type="button"
                onClick={() => setHelp((v) => !v)}
                className="mx-auto mt-4 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground transition hover:text-foreground"
              >
                <HelpCircle className="h-3.5 w-3.5" /> Lost your phone?
              </button>
              {help && (
                <p className="mt-2 rounded-xl bg-muted/60 p-2.5 text-center text-[11px] leading-relaxed text-muted-foreground">
                  Nobody can sign in on your behalf. Ask an administrator to reset your
                  authenticator from User Management, then set it up again on your new phone.
                </p>
              )}

              <button
                onClick={cancel}
                className="mt-4 w-full text-center text-[11px] font-semibold text-muted-foreground transition hover:text-foreground"
              >
                Cancel and return to sign-in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Mounted once at the root so any sign-in form can call askTwoFactor(). */
export function TwoFactorHost() {
  const [req, setReq] = useState<PendingRequest | null>(null);

  useEffect(() => {
    publish = setReq;
    return () => { publish = null; };
  }, []);

  if (!req) return null;
  return <Dialog req={req} close={() => setReq(null)} />;
}
