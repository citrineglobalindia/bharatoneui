import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, ShieldCheck, ArrowLeft, Loader2, KeyRound, CheckCircle2 } from "lucide-react";
import { BharatOneLogo } from "@/components/bharatone-logo";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset password — BharatOne" },
      { name: "description", content: "Reset your BharatOne account password securely via email OTP." },
    ],
  }),
  component: ForgotPasswordPage,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const target = email.trim().toLowerCase();
    if (!EMAIL_RE.test(target)) return toast.error("Enter a valid email address");
    setBusy(true);
    try {
      const { data: exists, error: exErr } = await supabase.rpc("password_reset_account_exists", { _email: target });
      if (exErr) return toast.error("Could not verify account", { description: exErr.message });
      if (!exists) {
        return toast.error("No account found", { description: "We couldn't find an account registered with that email." });
      }
      const { data, error } = await supabase.functions.invoke("send-otp", { body: { channel: "email", target } });
      if (error) return toast.error("Failed to send code", { description: error.message });
      setDevCode((data as any)?.dev_code ?? null);
      toast.success("Verification code sent", { description: `Check ${target} for a 6-digit code.` });
      setStep(2);
    } finally { setBusy(false); }
  };

  const verifyAndReset = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (code.trim().length !== 6) return toast.error("Enter the 6-digit code");
    if (pw.length < 6) return toast.error("Password must be at least 6 characters");
    if (pw !== pw2) return toast.error("Passwords do not match");
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("reset_password_with_otp", {
        _email: email.trim().toLowerCase(), _code: code.trim(), _new_password: pw,
      });
      if (error) return toast.error("Reset failed", { description: error.message });
      const res = data as any;
      if (!res?.ok) {
        const reason = res?.reason ?? "invalid_code";
        const msg = reason === "weak_password" ? "Password too weak"
          : reason === "no_account" ? "No account found for this email"
          : reason === "too_many_attempts" ? "Too many attempts — request a new code"
          : "Invalid or expired code";
        return toast.error(msg);
      }
      setStep(3);
      toast.success("Password updated");
    } finally { setBusy(false); }
  };

  return (
    <div className="relative min-h-screen bg-tricolor flex items-center justify-center p-3 sm:p-4">
      <div aria-hidden className="pointer-events-none absolute -top-32 -left-24 h-80 w-80 rounded-full bg-saffron-gradient opacity-15 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-emerald-300/20 blur-3xl" />

      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-elev overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        <div className="p-6">
          <div className="flex justify-center"><BharatOneLogo size="lg" /></div>
          <div className="mt-3 flex justify-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-india-green/10 text-india-green">
              <KeyRound className="h-6 w-6" />
            </span>
          </div>
          <h1 className="mt-3 text-center font-display text-xl font-extrabold text-foreground">Reset your password</h1>
          <p className="mt-1 text-center text-xs text-muted-foreground">
            For any BharatOne account — Retailer, Distributor, QC, Accountant, HR, DRO, TRO &amp; Admin.
          </p>

          <div className="mt-4 flex items-center justify-center gap-2 text-[11px] font-semibold">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <span className={`grid h-6 w-6 place-items-center rounded-full ${step >= s ? "bg-india-green text-white" : "bg-muted text-muted-foreground"}`}>{s}</span>
                {s < 3 && <span className={`h-0.5 w-8 ${step > s ? "bg-india-green" : "bg-muted"}`} />}
              </div>
            ))}
          </div>

          {step === 1 && (
            <form className="mt-5 space-y-3" onSubmit={sendCode}>
              <div>
                <label className="text-sm font-semibold text-foreground">Account Email</label>
                <div className="mt-1 relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-india-green" />
                  <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com"
                    className="h-10 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm shadow-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-india-green/15 focus-visible:border-india-green" />
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">We'll email a 6-digit verification code to confirm it's you.</p>
              </div>
              <Button type="submit" disabled={busy} className="h-10 w-full rounded-lg bg-india-green text-sm font-semibold text-white shadow-elev hover:bg-india-green/90">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Send code
              </Button>
            </form>
          )}

          {step === 2 && (
            <form className="mt-5 space-y-3" onSubmit={verifyAndReset}>
              {devCode && (
                <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                  Dev mode — your code is <span className="font-mono font-bold">{devCode}</span>
                </div>
              )}
              <div>
                <label className="text-sm font-semibold text-foreground">Verification Code</label>
                <div className="mt-1 relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-india-green" />
                  <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="6-digit code"
                    className="h-10 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm tracking-[0.3em] font-mono shadow-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-india-green/15 focus-visible:border-india-green" />
                </div>
                <button type="button" onClick={() => sendCode()} disabled={busy} className="mt-1.5 text-[11px] font-semibold text-india-green hover:underline">Resend code</button>
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground">New Password</label>
                <div className="mt-1 relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-india-green" />
                  <input value={pw} onChange={(e) => setPw(e.target.value)} type={showPw ? "text" : "password"} placeholder="At least 6 characters"
                    className="h-10 w-full rounded-lg border border-input bg-background pl-10 pr-10 text-sm shadow-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-india-green/15 focus-visible:border-india-green" />
                  <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground">Confirm New Password</label>
                <div className="mt-1 relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-india-green" />
                  <input value={pw2} onChange={(e) => setPw2(e.target.value)} type={showPw ? "text" : "password"} placeholder="Re-enter new password"
                    className="h-10 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm shadow-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-india-green/15 focus-visible:border-india-green" />
                </div>
              </div>
              <Button type="submit" disabled={busy} className="h-10 w-full rounded-lg bg-india-green text-sm font-semibold text-white shadow-elev hover:bg-india-green/90">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Verify &amp; reset password
              </Button>
            </form>
          )}

          {step === 3 && (
            <div className="mt-6 text-center">
              <div className="flex justify-center"><CheckCircle2 className="h-14 w-14 text-india-green" /></div>
              <p className="mt-3 font-bold text-foreground">Password updated successfully</p>
              <p className="mt-1 text-xs text-muted-foreground">You can now sign in with your new password.</p>
              <Button onClick={() => navigate({ to: "/login" })} className="mt-4 h-10 w-full rounded-lg bg-india-green text-sm font-semibold text-white shadow-elev hover:bg-india-green/90">
                Go to login
              </Button>
            </div>
          )}

          {step !== 3 && (
            <Link to="/login" className="mt-4 flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to login
            </Link>
          )}
        </div>
        <div className="h-1.5 w-full bg-gradient-to-r from-saffron via-white to-india-green" />
      </div>
    </div>
  );
}
