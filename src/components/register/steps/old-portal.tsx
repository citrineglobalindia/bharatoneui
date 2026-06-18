import { useEffect, useRef, useState } from "react";
import {
  Lock,
  Search,
  AlertTriangle,
  Mail,
  Phone,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  RefreshCw,
  PencilLine,
  KeyRound,
  XCircle,
  User,
} from "lucide-react";
import { Field, inputCls, Notice, StepHeader } from "../field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { OtpSuccessDialog, type OtpSuccessChannel } from "../otp-success-dialog";
import { useRegistration } from "../registration-context";
import { supabase } from "@/integrations/supabase/client";

type Stage = "lookup" | "fetched" | "otp" | "verified";
type Channel = "email" | "mobile";

type FetchedUser = {
  username: string;
  fullName: string;
  email: string;
  mobile: string;
};

const MOCK_OTP = "123456";
const RESEND_COOLDOWN = 30;

function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  const visible = user.slice(0, 2);
  return `${visible}${"•".repeat(Math.max(user.length - 2, 3))}@${domain}`;
}

function maskMobile(m: string) {
  const digits = m.replace(/\D/g, "");
  if (digits.length < 4) return m;
  return `+91 ••••• ${digits.slice(-4)}`;
}

export function OldPortalStep() {
  const { set: setReg } = useRegistration();
  const [stage, setStage] = useState<Stage>("lookup");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [user, setUser] = useState<FetchedUser | null>(null);

  // Both channels are mandatory — track each independently.
  const [emailOtp, setEmailOtp] = useState<string[]>(Array(6).fill(""));
  const [mobileOtp, setMobileOtp] = useState<string[]>(Array(6).fill(""));
  const [emailError, setEmailError] = useState<string | null>(null);
  const [mobileError, setMobileError] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [mobileVerified, setMobileVerified] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [verifyingMobile, setVerifyingMobile] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingMobile, setSendingMobile] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [mobileSent, setMobileSent] = useState(false);
  const [emailCooldown, setEmailCooldown] = useState(0);
  const [mobileCooldown, setMobileCooldown] = useState(0);
  const emailInputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const mobileInputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const [successOpen, setSuccessOpen] = useState(false);
  const [successChannel, setSuccessChannel] = useState<OtpSuccessChannel>("email");

  useEffect(() => {
    setReg({
      email: user?.email ?? "",
      mobile: user?.mobile ?? "",
      emailVerified,
      mobileVerified,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, emailVerified, mobileVerified]);

  useEffect(() => {
    if (emailCooldown <= 0) return;
    const t = setInterval(() => setEmailCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [emailCooldown]);

  useEffect(() => {
    if (mobileCooldown <= 0) return;
    const t = setInterval(() => setMobileCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [mobileCooldown]);

  const handleFetch = async () => {
    setLookupError(null);
    if (username.trim().length < 3) {
      setLookupError("Please enter a valid JSKO Username (min 3 characters).");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc("fetch_jsko_account", { p_username: username.trim() });
    setLoading(false);
    const res = (data as any) ?? {};
    if (error || !res.found) {
      setLookupError("No JSKO record found for this username. Please check with admin.");
      return;
    }
    const fetchedName = res.full_name as string;
    setUser({
      username: (res.username as string) ?? username.trim().toUpperCase(),
      fullName: fetchedName,
      email: res.email ?? "",
      mobile: res.mobile ?? "",
    });
    const parts = fetchedName.trim().split(/\s+/);
    setReg({
      firstName: parts[0] ?? "",
      middleName: parts.length > 2 ? parts.slice(1, -1).join(" ") : "",
      surname: parts.length > 1 ? parts[parts.length - 1] : "",
    });
    setStage("otp");
  };

  const sendOtp = async (ch: Channel) => {
    if (ch === "email") {
      if (!user?.email) { setEmailError("No email on record for this JSKO ID."); return; }
      if (sendingEmail) return;
      setEmailError(null);
      setSendingEmail(true);
      try {
        const { data, error } = await supabase.functions.invoke("send-otp", { body: { channel: "email", target: user.email } });
        if (error) {
          let msg = "Could not send the code. Please try again in a moment.";
          try { const ctx = (error as { context?: Response }).context; const body = ctx ? await ctx.json() : null; if (body?.error) msg = String(body.error); } catch { /* ignore */ }
          setEmailError(msg); return;
        }
        if ((data as { error?: string } | null)?.error) { setEmailError(String((data as { error?: string }).error)); return; }
        const devCode = (data as { dev_code?: string } | null)?.dev_code;
        if (devCode && /^[0-9]{6}$/.test(devCode)) setEmailOtp(devCode.split("")); else setEmailOtp(Array(6).fill(""));
        setEmailSent(true);
        setEmailCooldown(RESEND_COOLDOWN);
        setTimeout(() => emailInputsRef.current[0]?.focus(), 50);
      } catch (e) {
        setEmailError(e instanceof Error ? e.message : "Could not send the code. Please try again.");
      } finally {
        setSendingEmail(false);
      }
    } else {
      setSendingMobile(true);
      setMobileOtp(Array(6).fill(""));
      setMobileError(null);
      setMobileSent(true);
      setMobileCooldown(RESEND_COOLDOWN);
      setSendingMobile(false);
      setTimeout(() => mobileInputsRef.current[0]?.focus(), 50);
    }
  };

  const verifyChannel = async (ch: Channel) => {
    if (ch === "email") {
      const code = emailOtp.join("");
      if (code.length !== 6) {
        setEmailError("Please enter the complete 6-digit code.");
        return;
      }
      setVerifyingEmail(true);
      const { data: vd, error: ve } = await supabase.rpc("verify_registration_otp", { _target: user!.email, _channel: "email", _code: code });
      setVerifyingEmail(false);
      if (!ve && (vd as { verified?: boolean } | null)?.verified === true) {
        setEmailVerified(true);
        setEmailError(null);
        if (mobileVerified) {
          setStage("verified");
          setSuccessChannel("all");
        } else {
          setSuccessChannel("email");
        }
        setSuccessOpen(true);
      } else {
        setEmailError("Incorrect code. Please try again or resend.");
      }
    } else {
      const code = mobileOtp.join("");
      if (code.length !== 6) {
        setMobileError("Please enter the complete 6-digit code.");
        return;
      }
      setVerifyingMobile(true);
      await new Promise((r) => setTimeout(r, 700));
      setVerifyingMobile(false);
      if (code === MOCK_OTP) {
        setMobileVerified(true);
        setMobileError(null);
        if (emailVerified) {
          setStage("verified");
          setSuccessChannel("all");
        } else {
          setSuccessChannel("mobile");
        }
        setSuccessOpen(true);
      } else {
        setMobileError("Incorrect code. Please try again or resend.");
      }
    }
  };

  const resetAll = () => {
    setStage("lookup");
    setUser(null);
    setEmailOtp(Array(6).fill(""));
    setMobileOtp(Array(6).fill(""));
    setEmailError(null);
    setMobileError(null);
    setEmailVerified(false);
    setMobileVerified(false);
    setEmailSent(false);
    setMobileSent(false);
    setEmailCooldown(0);
    setMobileCooldown(0);
  };

  return (
    <>
    <div className="space-y-6">
      <StepHeader
        icon={<Lock className="h-5 w-5" />}
        title="Old JSKO Portal"
        description="Enter your JSKO Username to auto-fetch your registered details, then verify both your email and mobile via OTP to continue."
      />

      {/* Progress micro-strip */}
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider">
        <MiniStep label="Fetch" active={stage === "lookup"} done={stage !== "lookup"} />
        <Dash done={stage !== "lookup"} />
        <MiniStep
          label="Verify Email"
          active={stage === "otp" && !emailVerified}
          done={emailVerified}
        />
        <Dash done={emailVerified} />
        <MiniStep
          label="Verify Mobile"
          active={stage === "otp" && !mobileVerified}
          done={mobileVerified}
        />
      </div>

      {/* Stage 1 — lookup */}
      {stage === "lookup" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Notice tone="warn" title="⚠ Important Notice">
            Use the exact Username from your previous JSKO portal. Your registered email and mobile
            will be auto-fetched from legacy records.
          </Notice>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field label="Old JSKO Username" required className="flex-1">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-india-green" />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleFetch()}
                  className={`${inputCls} pl-10 uppercase`}
                  placeholder="e.g. JSKO101"
                  autoFocus
                />
              </div>
            </Field>
            <Button
              onClick={handleFetch}
              disabled={loading}
              className="h-12 bg-india-green text-white hover:bg-india-green/90 shadow-elev"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Fetching…
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" /> Fetch Details
                </>
              )}
            </Button>
          </div>
          {lookupError ? (
            <p className="flex items-center gap-1.5 text-xs font-medium text-red-600">
              <XCircle className="h-3.5 w-3.5" /> {lookupError}
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5" /> Make sure your username matches the legacy
              system records.
            </p>
          )}
        </div>
      )}

      {/* Stage 2 — dual OTP (both mandatory) */}
      {(stage === "otp" || stage === "verified") && user && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <FetchedUserCard user={user} onChange={resetAll} compact={stage === "verified"} />

          {/* Fetched details — shown clearly on screen */}
          <div className="rounded-2xl border border-india-green/30 bg-india-green/5 p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground"><CheckCircle2 className="h-4 w-4 text-india-green" /> Details fetched from JSKO records</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">JSKO Username</p><p className="font-semibold text-foreground">{user.username}</p></div>
              <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Full Name</p><p className="font-semibold text-foreground">{user.fullName}</p></div>
              <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Email</p><p className="font-semibold text-foreground break-all">{user.email || "—"}</p></div>
              <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Mobile</p><p className="font-semibold text-foreground">{user.mobile || "—"}</p></div>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">Verify the email and mobile below via OTP to continue your migration.</p>
          </div>

          {stage === "otp" && (
            <Notice tone="warn" title="Both verifications required">
              For your security, you must verify <span className="font-semibold">both</span> your
              registered email and mobile to proceed.
            </Notice>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <OtpCard
              channel="email"
              icon={<Mail className="h-4 w-4" />}
              title="Email Verification"
              target={maskEmail(user.email)}
              otp={emailOtp}
              setOtp={setEmailOtp}
              error={emailError}
              setError={setEmailError}
              verified={emailVerified}
              verifying={verifyingEmail}
              sent={emailSent}
              sending={sendingEmail}
              cooldown={emailCooldown}
              onSend={() => sendOtp("email")}
              onVerify={() => verifyChannel("email")}
              inputsRef={emailInputsRef}
            />
            <OtpCard
              channel="mobile"
              icon={<Phone className="h-4 w-4" />}
              title="Mobile Verification"
              target={maskMobile(user.mobile)}
              otp={mobileOtp}
              setOtp={setMobileOtp}
              error={mobileError}
              setError={setMobileError}
              verified={mobileVerified}
              verifying={verifyingMobile}
              sent={mobileSent}
              sending={sendingMobile}
              cooldown={mobileCooldown}
              onSend={() => sendOtp("mobile")}
              onVerify={() => verifyChannel("mobile")}
              inputsRef={mobileInputsRef}
            />
          </div>

          <p className="text-center text-[11px] text-muted-foreground">
            Demo OTP: <span className="font-mono font-semibold text-foreground">123456</span> (use
            for both)
          </p>
        </div>
      )}

      {/* Stage 4 — verified */}
      {stage === "verified" && user && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white p-4 sm:p-5">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 ring-4 ring-emerald-50">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-base font-bold text-foreground">
                Both verifications successful
              </h3>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                Your <span className="font-semibold text-foreground">email</span> and{" "}
                <span className="font-semibold text-foreground">mobile</span> have both been verified
                against the JSKO records. Click{" "}
                <span className="font-semibold text-foreground">Next</span> to continue with your
                personal details.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
    <OtpSuccessDialog
      open={successOpen}
      onOpenChange={setSuccessOpen}
      channel={successChannel}
      target={
        successChannel === "email"
          ? user?.email
          : successChannel === "mobile"
            ? maskMobile(user?.mobile ?? "")
            : undefined
      }
    />
    </>
  );
}

/* ----------------------------- Sub-components ----------------------------- */

function MiniStep({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ring-1 transition-colors",
        done
          ? "bg-india-green/10 text-india-green ring-india-green/30"
          : active
            ? "bg-saffron/10 text-saffron ring-saffron/30"
            : "bg-muted text-muted-foreground ring-border",
      )}
    >
      {done ? <CheckCircle2 className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {label}
    </span>
  );
}

function Dash({ done }: { done: boolean }) {
  return <span className={cn("h-px w-3 sm:w-5", done ? "bg-india-green/40" : "bg-border")} />;
}

function FetchedUserCard({
  user,
  onChange,
  compact = false,
}: {
  user: FetchedUser;
  onChange: () => void;
  compact?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50/70 via-white to-orange-50/40 p-3 sm:p-4 shadow-soft">
      <div className="flex items-start gap-3 min-w-0">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-india-green text-white shadow-elev">
          <CheckCircle2 className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-sm sm:text-base font-bold text-foreground leading-tight truncate">
              {user.fullName}
            </p>
            <span className="rounded-full bg-india-green/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-india-green ring-1 ring-india-green/20">
              {user.username}
            </span>
          </div>
          {!compact && (
            <div className="mt-1.5 grid gap-1 sm:grid-cols-2 text-[12px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 truncate">
                <Mail className="h-3.5 w-3.5 text-india-green shrink-0" />
                <span className="truncate">{maskEmail(user.email)}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-india-green shrink-0" />
                {maskMobile(user.mobile)}
              </span>
            </div>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onChange}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-india-green hover:bg-india-green/10 transition-colors shrink-0"
      >
        <PencilLine className="h-3 w-3" /> Change
      </button>
    </div>
  );
}

function OtpCard({
  channel,
  icon,
  title,
  target,
  otp,
  setOtp,
  error,
  setError,
  verified,
  verifying,
  sent,
  cooldown,
  onSend,
  onVerify,
  inputsRef,
  sending,
}: {
  channel: Channel;
  icon: React.ReactNode;
  title: string;
  target: string;
  otp: string[];
  setOtp: (v: string[]) => void;
  error: string | null;
  setError: (v: string | null) => void;
  verified: boolean;
  verifying: boolean;
  sent: boolean;
  sending?: boolean;
  cooldown: number;
  onSend: () => void;
  onVerify: () => void;
  inputsRef: React.MutableRefObject<Array<HTMLInputElement | null>>;
}) {
  const handleChange = (i: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = digit;
    setOtp(next);
    setError(null);
    if (digit && i < 5) inputsRef.current[i + 1]?.focus();
  };
  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) inputsRef.current[i - 1]?.focus();
    if (e.key === "ArrowLeft" && i > 0) inputsRef.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < 5) inputsRef.current[i + 1]?.focus();
  };
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    e.preventDefault();
    const next = Array(6).fill("");
    text.split("").forEach((c, i) => (next[i] = c));
    setOtp(next);
    inputsRef.current[Math.min(text.length, 5)]?.focus();
  };

  return (
    <div
      className={cn(
        "rounded-2xl border-2 bg-background/60 p-4 sm:p-5 shadow-soft transition-all",
        verified
          ? "border-emerald-300 bg-gradient-to-br from-emerald-50/80 to-white"
          : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <span
            className={cn(
              "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
              verified ? "bg-emerald-100 text-emerald-600" : "bg-india-green/10 text-india-green",
            )}
          >
            {verified ? <CheckCircle2 className="h-4 w-4" /> : icon}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-[14px] sm:text-[15px] font-bold text-foreground">
                {title}
              </h3>
              <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-600 ring-1 ring-red-200">
                Required
              </span>
            </div>
            <p className="text-[12px] text-muted-foreground truncate">{target}</p>
          </div>
        </div>
        {verified && (
          <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-200">
            <CheckCircle2 className="h-3 w-3" /> Verified
          </span>
        )}
      </div>

      {!verified && !sent && (
        <>
          <Button
            onClick={onSend}
            disabled={!!sending}
            className="mt-4 h-11 w-full bg-india-green text-white hover:bg-india-green/90 shadow-elev"
          >
            {sending ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : <><KeyRound className="h-4 w-4" /> Send OTP to {channel === "email" ? "Email" : "Mobile"}</>}
          </Button>
          {error && (
            <p className="mt-2 flex items-center justify-center gap-1.5 text-xs font-semibold text-red-600">
              <XCircle className="h-3.5 w-3.5" /> {error}
            </p>
          )}
        </>
      )}

      {!verified && sent && (
        <>
          <div className="mt-4 flex justify-center gap-1.5 sm:gap-2">
            {otp.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputsRef.current[i] = el;
                }}
                value={d}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKey(i, e)}
                onPaste={handlePaste}
                inputMode="numeric"
                maxLength={1}
                aria-label={`${title} digit ${i + 1}`}
                className={cn(
                  "h-11 w-9 sm:h-12 sm:w-10 rounded-lg border-2 bg-background text-center font-display text-lg font-bold text-foreground shadow-soft transition focus-visible:outline-none",
                  error
                    ? "border-red-400 focus-visible:ring-4 focus-visible:ring-red-500/15"
                    : d
                      ? "border-india-green focus-visible:ring-4 focus-visible:ring-india-green/20"
                      : "border-input focus-visible:border-india-green focus-visible:ring-4 focus-visible:ring-india-green/15",
                )}
              />
            ))}
          </div>

          {error && (
            <p className="mt-2 flex items-center justify-center gap-1.5 text-xs font-semibold text-red-600">
              <XCircle className="h-3.5 w-3.5" /> {error}
            </p>
          )}

          <div className="mt-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onSend}
              disabled={cooldown > 0}
              className={cn(
                "inline-flex items-center gap-1 text-[12px] font-semibold transition-colors",
                cooldown > 0
                  ? "text-muted-foreground cursor-not-allowed"
                  : "text-india-green hover:underline",
              )}
            >
              <RefreshCw className="h-3 w-3" />
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
            </button>
            <Button
              onClick={onVerify}
              disabled={verifying || otp.join("").length !== 6}
              size="sm"
              className="h-9 bg-india-green text-white hover:bg-india-green/90"
            >
              {verifying ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verifying…
                </>
              ) : (
                <>
                  <ShieldCheck className="h-3.5 w-3.5" /> Verify
                </>
              )}
            </Button>
          </div>
        </>
      )}

      {verified && (
        <p className="mt-3 text-[12px] text-emerald-700 font-medium">
          Successfully verified against JSKO records.
        </p>
      )}
    </div>
  );
}