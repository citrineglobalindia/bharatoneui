// Super Admin sign-in — an email code AND an SMS code, both required.
//
// There is no password on this account at all. Both codes are checked on the
// server before any session exists, and the SMS factor is recorded in the
// database, which is what actually grants the powers. An email code on its own
// gets you a signed-in browser with no more rights than a stranger.
//
// The page never confirms whether an address is the super admin's. Wrong email,
// wrong code and expired code all produce the same words.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, Loader2, ArrowLeft, Mail, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BharatOneLogo } from "@/components/bharatone-logo";
import { clearSuperCache } from "@/lib/super-admin";

export const Route = createFileRoute("/super-login")({
  head: () => ({
    meta: [
      { title: "Sign in — BharatOne" },
      // Nothing about this page should be discoverable or indexed.
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SuperLogin,
});

const inp =
  "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-india-green";
const code =
  "h-12 w-full rounded-lg border border-border bg-background px-3 text-center text-lg font-bold tracking-[0.4em] tabular-nums outline-none focus:border-india-green";

function SuperLogin() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<"email" | "codes">("email");
  const [email, setEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [masked, setMasked] = useState("");
  const [busy, setBusy] = useState(false);

  const start = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return toast.error("Enter a valid email address");
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("super-admin-auth", {
      body: { step: "start", email: email.trim().toLowerCase() },
    });
    setBusy(false);
    if (error || !(data as any)?.ok) {
      return toast.error((data as any)?.message ?? "Could not send the codes. Try again in a moment.");
    }
    setMasked((data as any).masked_phone ?? "");
    setStage("codes");
    toast.success("Two codes sent", {
      description: "One to your email, one by SMS. Both are needed.",
    });
  };

  const verify = async () => {
    if (emailCode.replace(/\D/g, "").length < 4 || smsCode.replace(/\D/g, "").length < 4) {
      return toast.error("Enter both codes");
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("super-admin-auth", {
      body: {
        step: "verify",
        email: email.trim().toLowerCase(),
        email_code: emailCode.trim(),
        sms_code: smsCode.trim(),
      },
    });
    if (error || !(data as any)?.ok) {
      setBusy(false);
      return toast.error((data as any)?.message ?? "Those codes were not accepted.");
    }

    // Exchange the one-time token for a session. The second factor was already
    // recorded server-side, so this cannot be used on its own.
    const { error: sErr } = await supabase.auth.verifyOtp({
      type: "email",
      token_hash: (data as any).token_hash,
    });
    setBusy(false);
    if (sErr) return toast.error("Could not open the session", { description: sErr.message });

    clearSuperCache();
    toast.success("Signed in");
    navigate({ to: "/super" as never, replace: true });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-tricolor p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-elev">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-center">
          <div className="flex justify-center"><BharatOneLogo size="md" className="brightness-0 invert" /></div>
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
            <ShieldCheck className="h-3.5 w-3.5" /> Restricted
          </div>
          <h1 className="mt-3 text-xl font-extrabold text-white">Sign in</h1>
          <p className="mt-1 text-xs text-white/70">
            This account uses two codes. There is no password.
          </p>
        </div>

        <div className="space-y-4 p-6">
          {stage === "email" ? (
            <>
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Email address
                </span>
                <input className={inp} type="email" autoComplete="username" value={email}
                       placeholder="you@example.com"
                       onChange={(e) => setEmail(e.target.value)}
                       onKeyDown={(e) => e.key === "Enter" && start()} />
              </label>
              <button onClick={start} disabled={busy}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 text-sm font-bold text-white disabled:opacity-60">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {busy ? "Sending…" : "Send codes"}
              </button>
            </>
          ) : (
            <>
              <p className="rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                A code has been emailed to <strong>{email}</strong> and another sent by SMS
                {masked ? <> to <strong>{masked}</strong></> : null}. Both are needed to continue.
              </p>

              <label className="block">
                <span className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" /> Email code
                </span>
                <input className={code} inputMode="numeric" autoComplete="one-time-code" maxLength={8}
                       value={emailCode} onChange={(e) => setEmailCode(e.target.value)} />
              </label>

              <label className="block">
                <span className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  <Smartphone className="h-3.5 w-3.5" /> SMS code
                </span>
                <input className={code} inputMode="numeric" autoComplete="one-time-code" maxLength={8}
                       value={smsCode} onChange={(e) => setSmsCode(e.target.value)}
                       onKeyDown={(e) => e.key === "Enter" && verify()} />
              </label>

              <button onClick={verify} disabled={busy}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 text-sm font-bold text-white disabled:opacity-60">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {busy ? "Checking…" : "Verify and continue"}
              </button>

              <button onClick={() => { setStage("email"); setEmailCode(""); setSmsCode(""); }}
                className="inline-flex w-full items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-3.5 w-3.5" /> Start again
              </button>
            </>
          )}

          <p className="text-center text-[10px] text-muted-foreground">
            Access is limited to one nominated account and every action is recorded.
          </p>
        </div>
      </div>
    </div>
  );
}
