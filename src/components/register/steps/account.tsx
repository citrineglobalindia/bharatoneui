import { useEffect, useRef, useState } from "react";
import { sanitizeMobile } from "@/lib/phone";
import {
  UserCheck,
  Mail,
  Phone,
  ShieldCheck,
  KeyRound,
  Loader2,
  CheckCircle2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { inputCls, Notice, SectionCard, StepHeader } from "../field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { OtpSuccessDialog, type OtpSuccessChannel } from "../otp-success-dialog";
import { useRegistration } from "../registration-context";
import { supabase } from "@/integrations/supabase/client";

const MOCK_OTP = "123456";
const RESEND_COOLDOWN = 30;

type Channel = "email" | "mobile";

export function AccountStep() {
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");

  const [emailOtp, setEmailOtp] = useState<string[]>(Array(6).fill(""));
  const [mobileOtp, setMobileOtp] = useState<string[]>(Array(6).fill(""));
  const [emailSent, setEmailSent] = useState(false);
  const [mobileSent, setMobileSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [mobileVerified, setMobileVerified] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [verifyingMobile, setVerifyingMobile] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailNote, setEmailNote] = useState<string | null>(null);
  const [mobileError, setMobileError] = useState<string | null>(null);
  const [emailCooldown, setEmailCooldown] = useState(0);
  const [mobileCooldown, setMobileCooldown] = useState(0);

  const [successOpen, setSuccessOpen] = useState(false);
  const [successChannel, setSuccessChannel] = useState<OtpSuccessChannel>("email");

  const emailInputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const mobileInputsRef = useRef<Array<HTMLInputElement | null>>([]);

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

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validMobile = /^[6-9]\d{9}$/.test(mobile);

  const sendOtp = async (ch: Channel) => {
    if (ch === "email") {
      if (!validEmail) {
        setEmailError("Enter a valid email address first.");
        return;
      }
      setEmailError(null);
      setEmailNote(null);
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { channel: "email", target: email },
      });
      if (error) {
        let msg = "Could not send the code. Please try again in a moment.";
        try {
          const ctx = (error as { context?: Response }).context;
          const body = ctx ? await ctx.json() : null;
          if (body?.error) {
            msg = String(body.error).includes("only send testing emails")
              ? "Email sending is in test mode — it only works for the Resend owner email right now. Verify a domain to send to anyone."
              : String(body.error);
          }
        } catch { /* keep default */ }
        setEmailError(msg);
        return;
      }
      const devCode = (data as { dev_code?: string } | null)?.dev_code;
      if (devCode && /^[0-9]{6}$/.test(devCode)) {
        setEmailOtp(devCode.split(""));
        setEmailNote(`Test mode: code auto-filled (${devCode}). Verify a domain in Resend to email real users.`);
      } else {
        setEmailOtp(Array(6).fill(""));
      }
      setEmailSent(true);
      setEmailCooldown(RESEND_COOLDOWN);
      setTimeout(() => emailInputsRef.current[0]?.focus(), 50);
    } else {
      if (!validMobile) {
        setMobileError("Enter a valid 10-digit mobile number first.");
        return;
      }
      setMobileOtp(Array(6).fill(""));
      setMobileError(null);
      setMobileSent(true);
      setMobileCooldown(RESEND_COOLDOWN);
      setTimeout(() => mobileInputsRef.current[0]?.focus(), 50);
    }
  };

  const verifyChannel = async (ch: Channel) => {
    if (ch === "email") {
      const code = emailOtp.join("");
      if (code.length !== 6) return setEmailError("Please enter the complete 6-digit code.");
      setVerifyingEmail(true);
      const { data, error } = await supabase.rpc("verify_registration_otp", {
        _target: email,
        _channel: "email",
        _code: code,
      });
      setVerifyingEmail(false);
      const ok = !error && (data as { verified?: boolean } | null)?.verified === true;
      if (ok) {
        setEmailVerified(true);
        setEmailError(null);
        if (mobileVerified) {
          setSuccessChannel("all");
        } else {
          setSuccessChannel("email");
        }
        setSuccessOpen(true);
      } else setEmailError("Incorrect or expired code. Please try again or resend.");
    } else {
      const code = mobileOtp.join("");
      if (code.length !== 6) return setMobileError("Please enter the complete 6-digit code.");
      setVerifyingMobile(true);
      await new Promise((r) => setTimeout(r, 700));
      setVerifyingMobile(false);
      if (code === MOCK_OTP) {
        setMobileVerified(true);
        setMobileError(null);
        if (emailVerified) {
          setSuccessChannel("all");
        } else {
          setSuccessChannel("mobile");
        }
        setSuccessOpen(true);
      } else setMobileError("Incorrect code. Please try again or resend.");
    }
  };

  const { set: setReg } = useRegistration();
  useEffect(() => {
    setReg({ email, mobile, emailVerified, mobileVerified });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, mobile, emailVerified, mobileVerified]);

  return (
    <>
    <div className="space-y-6">
      <StepHeader
        icon={<UserCheck className="h-5 w-5" />}
        title="Account Details"
        description="Enter your email and mobile number, then verify both via OTP to continue."
      />
      <Notice title="Auto-generated username">
        Your username will be created automatically (e.g. <b>RET00000100</b>) after successful registration.
      </Notice>

      <SectionCard title="Email ID" icon={<Mail className="h-4 w-4" />}>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className={inputCls} autoComplete="off"
            type="email"
            placeholder="yourname@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailVerified(false);
              setEmailSent(false);
              setEmailError(null);
            }}
            disabled={emailVerified}
          />
          {!emailVerified && (
            <Button
              type="button"
              onClick={() => sendOtp("email")}
              disabled={!validEmail || (emailSent && emailCooldown > 0)}
              className="h-12 shrink-0 bg-india-green text-white hover:bg-india-green/90"
            >
              {emailSent ? (
                emailCooldown > 0 ? (
                  <><RefreshCw className="h-4 w-4" /> Resend in {emailCooldown}s</>
                ) : (
                  <><RefreshCw className="h-4 w-4" /> Resend OTP</>
                )
              ) : (
                <><KeyRound className="h-4 w-4" /> Send OTP</>
              )}
            </Button>
          )}
          {emailVerified && (
            <span className="inline-flex h-12 shrink-0 items-center gap-1.5 rounded-xl bg-emerald-100 px-3 text-xs font-bold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-200">
              <CheckCircle2 className="h-4 w-4" /> Verified
            </span>
          )}
        </div>

        {emailSent && !emailVerified && (
          <OtpRow
            label="email"
            otp={emailOtp}
            setOtp={setEmailOtp}
            error={emailError}
            setError={setEmailError}
            verifying={verifyingEmail}
            onVerify={() => verifyChannel("email")}
            inputsRef={emailInputsRef}
          />
        )}

        {emailError && !emailSent && !emailVerified && (
          <p className="mt-2 text-[12px] font-medium text-red-600">{emailError}</p>
        )}
        {emailNote && !emailVerified && (
          <p className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[12px] font-medium text-amber-800">{emailNote}</p>
        )}
        {!emailSent && !emailVerified && (
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            📧 We'll send a 6-digit verification code to this email.
          </p>
        )}
      </SectionCard>

      <SectionCard title="Mobile Number" icon={<Phone className="h-4 w-4" />}>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex gap-2 flex-1">
            <div className="inline-flex h-12 shrink-0 items-center justify-center rounded-xl border border-input bg-muted px-3 text-sm font-semibold text-foreground">
              +91
            </div>
            <input
              className={inputCls} autoComplete="off"
              placeholder="10 digit mobile number"
              maxLength={10}
              inputMode="numeric"
              value={mobile}
              onChange={(e) => {
                setMobile(sanitizeMobile(e.target.value));
                setMobileVerified(false);
                setMobileSent(false);
                setMobileError(null);
              }}
              disabled={mobileVerified}
            />
          </div>
          {!mobileVerified && (
            <Button
              type="button"
              onClick={() => sendOtp("mobile")}
              disabled={!validMobile || (mobileSent && mobileCooldown > 0)}
              className="h-12 shrink-0 bg-india-green text-white hover:bg-india-green/90"
            >
              {mobileSent ? (
                mobileCooldown > 0 ? (
                  <><RefreshCw className="h-4 w-4" /> Resend in {mobileCooldown}s</>
                ) : (
                  <><RefreshCw className="h-4 w-4" /> Resend OTP</>
                )
              ) : (
                <><KeyRound className="h-4 w-4" /> Send OTP</>
              )}
            </Button>
          )}
          {mobileVerified && (
            <span className="inline-flex h-12 shrink-0 items-center gap-1.5 rounded-xl bg-emerald-100 px-3 text-xs font-bold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-200">
              <CheckCircle2 className="h-4 w-4" /> Verified
            </span>
          )}
        </div>

        {mobileSent && !mobileVerified && (
          <OtpRow
            label="mobile"
            otp={mobileOtp}
            setOtp={setMobileOtp}
            error={mobileError}
            setError={setMobileError}
            verifying={verifyingMobile}
            onVerify={() => verifyChannel("mobile")}
            inputsRef={mobileInputsRef}
          />
        )}

        {!mobileSent && !mobileVerified && (
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            📱 We'll send a 6-digit verification code to this mobile.
          </p>
        )}
      </SectionCard>

      {emailVerified && mobileVerified ? (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white p-4">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 ring-4 ring-emerald-50">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </span>
          <div>
            <h3 className="font-display text-sm font-bold text-foreground">Both verifications successful</h3>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Your email and mobile have been verified. Click <span className="font-semibold text-foreground">Next</span> to continue.
            </p>
          </div>
        </div>
      ) : (
        <p className="text-center text-[11px] text-muted-foreground">
          Mobile demo OTP: <span className="font-mono font-semibold text-foreground">123456</span> (email is live)
        </p>
      )}
    </div>
    <OtpSuccessDialog
      open={successOpen}
      onOpenChange={setSuccessOpen}
      channel={successChannel}
      target={
        successChannel === "email"
          ? email
          : successChannel === "mobile"
            ? `+91 ${mobile}`
            : undefined
      }
    />
    </>
  );
}

function OtpRow({
  label,
  otp,
  setOtp,
  error,
  setError,
  verifying,
  onVerify,
  inputsRef,
}: {
  label: string;
  otp: string[];
  setOtp: (v: string[]) => void;
  error: string | null;
  setError: (v: string | null) => void;
  verifying: boolean;
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
    <div className="mt-2 rounded-xl border-2 border-dashed border-india-green/30 bg-india-green/5 p-3 animate-in fade-in slide-in-from-top-1 duration-300">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-india-green mb-2">
        Enter the 6-digit code sent to your {label}
      </p>
      <div className="flex justify-center gap-1.5 sm:gap-2">
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
            aria-label={`${label} OTP digit ${i + 1}`}
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
      <div className="mt-3 flex justify-end">
        <Button
          onClick={onVerify}
          disabled={verifying || otp.join("").length !== 6}
          size="sm"
          className="h-9 bg-india-green text-white hover:bg-india-green/90"
        >
          {verifying ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Verifying…</>
          ) : (
            <><ShieldCheck className="h-3.5 w-3.5" /> Verify</>
          )}
        </Button>
      </div>
    </div>
  );
}