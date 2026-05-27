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

  const [channel, setChannel] = useState<Channel>("email");
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [otpError, setOtpError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

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
    setStage("fetched");
  };

  const sendOtp = async (selected: Channel) => {
    setChannel(selected);
    setOtp(Array(6).fill(""));
    setOtpError(null);
    setStage("otp");
    setCooldown(RESEND_COOLDOWN);
    // simulate dispatch — focus first OTP cell
    setTimeout(() => inputsRef.current[0]?.focus(), 50);
  };

  const resendOtp = () => {
    if (cooldown > 0) return;
    setOtp(Array(6).fill(""));
    setOtpError(null);
    setCooldown(RESEND_COOLDOWN);
    inputsRef.current[0]?.focus();
  };

  const handleOtpChange = (i: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = digit;
    setOtp(next);
    setOtpError(null);
    if (digit && i < 5) inputsRef.current[i + 1]?.focus();
  };

  const handleOtpKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
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

  const verifyOtp = async () => {
    const code = otp.join("");
    if (code.length !== 6) {
      setOtpError("Please enter the complete 6-digit code.");
      return;
    }
    setVerifying(true);
    await new Promise((r) => setTimeout(r, 800));
    setVerifying(false);
    if (code === MOCK_OTP) {
      setStage("verified");
    } else {
      setOtpError("Incorrect code. Please try again or resend.");
    }
  };

  const resetAll = () => {
    setStage("lookup");
    setUser(null);
    setOtp(Array(6).fill(""));
    setOtpError(null);
    setCooldown(0);
  };

  return (
    <div className="space-y-6">
      <StepHeader
        icon={<Lock className="h-5 w-5" />}
        title="Old JSKO Portal"
        description="Enter your JSKO Username to auto-fetch your registered details, then verify your email or mobile via OTP to continue."
      />

      {/* Progress micro-strip */}
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider">
        <MiniStep label="Fetch" active={stage === "lookup"} done={stage !== "lookup"} />
        <Dash done={stage !== "lookup"} />
        <MiniStep
          label="Choose Channel"
          active={stage === "fetched"}
          done={stage === "otp" || stage === "verified"}
        />
        <Dash done={stage === "otp" || stage === "verified"} />
        <MiniStep label="Verify OTP" active={stage === "otp"} done={stage === "verified"} />
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

      {/* Stage 2 — fetched, choose channel */}
      {stage === "fetched" && user && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <FetchedUserCard user={user} onChange={resetAll} />
          <SectionCard title="Send verification code to" icon={<ShieldCheck className="h-4 w-4" />}>
            <p className="text-[13px] text-muted-foreground">
              Choose where you'd like to receive your 6-digit OTP. We'll match it against your old
              JSKO records.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <ChannelOption
                icon={<Mail className="h-5 w-5" />}
                title="Email"
                value={maskEmail(user.email)}
                onClick={() => sendOtp("email")}
              />
              <ChannelOption
                icon={<Phone className="h-5 w-5" />}
                title="Mobile (SMS)"
                value={maskMobile(user.mobile)}
                onClick={() => sendOtp("mobile")}
              />
            </div>
          </SectionCard>
        </div>
      )}

      {/* Stage 3 — OTP */}
      {stage === "otp" && user && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <FetchedUserCard user={user} onChange={resetAll} compact />

          <div className="rounded-2xl border border-border bg-background/60 p-4 sm:p-5 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-india-green/10 text-india-green">
                  <KeyRound className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="font-display text-[15px] sm:text-base font-bold text-foreground">
                    Enter the 6-digit OTP
                  </h3>
                  <p className="text-[12px] text-muted-foreground">
                    Code sent to{" "}
                    <span className="font-semibold text-foreground">
                      {channel === "email" ? maskEmail(user.email) : maskMobile(user.mobile)}
                    </span>{" "}
                    · expires in 10 minutes.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStage("fetched")}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-india-green hover:bg-india-green/10 transition-colors"
              >
                <PencilLine className="h-3 w-3" /> Change channel
              </button>
            </div>

            <div className="mt-4 flex justify-center gap-2 sm:gap-3">
              {otp.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => (inputsRef.current[i] = el)}
                  value={d}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKey(i, e)}
                  onPaste={handlePaste}
                  inputMode="numeric"
                  maxLength={1}
                  aria-label={`Digit ${i + 1}`}
                  className={cn(
                    "h-12 w-10 sm:h-14 sm:w-12 rounded-xl border-2 bg-background text-center font-display text-xl font-bold text-foreground shadow-soft transition focus-visible:outline-none",
                    otpError
                      ? "border-red-400 focus-visible:border-red-500 focus-visible:ring-4 focus-visible:ring-red-500/15"
                      : d
                        ? "border-india-green focus-visible:ring-4 focus-visible:ring-india-green/20"
                        : "border-input focus-visible:border-india-green focus-visible:ring-4 focus-visible:ring-india-green/15",
                  )}
                />
              ))}
            </div>

            {otpError && (
              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-red-600">
                <XCircle className="h-3.5 w-3.5" /> {otpError}
              </p>
            )}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-[12px] text-muted-foreground">
                Didn't receive the code?{" "}
                <button
                  type="button"
                  onClick={resendOtp}
                  disabled={cooldown > 0}
                  className={cn(
                    "inline-flex items-center gap-1 font-semibold transition-colors",
                    cooldown > 0
                      ? "text-muted-foreground cursor-not-allowed"
                      : "text-india-green hover:underline",
                  )}
                >
                  <RefreshCw className={cn("h-3 w-3", cooldown === 0 && "")} />
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
                </button>
                {channel === "email" && (
                  <>
                    {" · "}
                    <button
                      type="button"
                      onClick={() => sendOtp("mobile")}
                      className="font-semibold text-india-green hover:underline"
                    >
                      Try SMS instead
                    </button>
                  </>
                )}
                {channel === "mobile" && (
                  <>
                    {" · "}
                    <button
                      type="button"
                      onClick={() => sendOtp("email")}
                      className="font-semibold text-india-green hover:underline"
                    >
                      Try Email instead
                    </button>
                  </>
                )}
              </div>
              <Button
                onClick={verifyOtp}
                disabled={verifying || otp.join("").length !== 6}
                className="h-11 bg-india-green text-white hover:bg-india-green/90 shadow-elev"
              >
                {verifying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Verifying…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" /> Verify OTP
                  </>
                )}
              </Button>
            </div>

            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Demo OTP: <span className="font-mono font-semibold text-foreground">123456</span>
            </p>
          </div>
        </div>
      )}

      {/* Stage 4 — verified */}
      {stage === "verified" && user && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <FetchedUserCard user={user} onChange={resetAll} compact />
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white p-4 sm:p-5">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 ring-4 ring-emerald-50">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-base font-bold text-foreground">
                Verification successful
              </h3>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                Your{" "}
                <span className="font-semibold text-foreground">
                  {channel === "email" ? "email" : "mobile"}
                </span>{" "}
                has been verified against the JSKO records. Click{" "}
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