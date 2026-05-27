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
import { Field, inputCls, Notice, SectionCard, StepHeader } from "../field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  const [emailSent, setEmailSent] = useState(false);
  const [mobileSent, setMobileSent] = useState(false);
  const [emailCooldown, setEmailCooldown] = useState(0);
  const [mobileCooldown, setMobileCooldown] = useState(0);
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

  const handleFetch = async () => {
    setLookupError(null);
    if (username.trim().length < 3) {
      setLookupError("Please enter a valid JSKO Username (min 3 characters).");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    setLoading(false);
    // Mock: any username works; "notfound" simulates a miss
    if (username.trim().toLowerCase() === "notfound") {
      setLookupError("No JSKO record found for this username. Please double-check.");
      return;
    }
    setUser({
      username: username.trim().toUpperCase(),
      fullName: "Ramesh Kumar Sharma",
      email: "ramesh.sharma@example.com",
      mobile: "9845098450",
    });
    setStage("otp");
  };

  const sendOtp = (ch: Channel) => {
    if (ch === "email") {
      setEmailOtp(Array(6).fill(""));
      setEmailError(null);
      setEmailSent(true);
      setEmailCooldown(RESEND_COOLDOWN);
      setTimeout(() => emailInputsRef.current[0]?.focus(), 50);
    } else {
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
      if (code.length !== 6) {
        setEmailError("Please enter the complete 6-digit code.");
        return;
      }
      setVerifyingEmail(true);
      await new Promise((r) => setTimeout(r, 700));
      setVerifyingEmail(false);
      if (code === MOCK_OTP) {
        setEmailVerified(true);
        setEmailError(null);
        if (mobileVerified) setStage("verified");
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
        if (emailVerified) setStage("verified");
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
    <div className="space-y-6">
      <StepHeader
        icon={<Lock className="h-5 w-5" />}
        title="Old JSKO Portal"
        description="Enter your JSKO Username to auto-fetch your registered details, then verify BOTH your email and mobile via OTP to continue."
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

function ChannelOption({
  icon,
  title,
  value,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center justify-between gap-3 rounded-xl border-2 border-dashed border-india-green/30 bg-india-green/5 p-3.5 text-left transition-all hover:border-india-green hover:bg-india-green/10 hover:-translate-y-0.5"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-india-green text-white shadow-elev">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">{title}</p>
          <p className="text-[12px] text-muted-foreground truncate">{value}</p>
        </div>
      </div>
      <span className="text-[11px] font-bold uppercase tracking-wider text-india-green opacity-0 group-hover:opacity-100 transition-opacity">
        Send OTP →
      </span>
    </button>
  );
}