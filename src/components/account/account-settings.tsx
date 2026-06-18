import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { Lock, Loader2, Save, LogOut, Bell, Mail, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isPasswordValid } from "@/components/register/password-field";
import { supabase } from "@/integrations/supabase/client";

type Method = "quick" | "email";

export function AccountSettings() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>("");
  const [method, setMethod] = useState<Method>("email");
  const [pwd, setPwd] = useState(""); const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState(""); const [codeSent, setCodeSent] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState(() => { try { return JSON.parse(localStorage.getItem("bharatone:notif-prefs") || '{"inapp":true,"email":true}'); } catch { return { inapp: true, email: true }; } });

  useEffect(() => { (async () => { const { data } = await supabase.auth.getUser(); setEmail(data?.user?.email || ""); })(); }, []);

  const savePrefs = (p: any) => { setPrefs(p); try { localStorage.setItem("bharatone:notif-prefs", JSON.stringify(p)); } catch {} toast.success("Preferences saved"); };

  // Quick change — works while you have an active session.
  const quickChange = async () => {
    if (!isPasswordValid(pwd)) { toast.error("Password must be 8+ chars with upper, lower, number & special character"); return; }
    if (pwd !== confirm) { toast.error("Passwords do not match"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwd });
      if (error) { toast.error("Could not change password", { description: error.message }); return; }
      toast.success("Password updated"); setPwd(""); setConfirm("");
    } finally { setSaving(false); }
  };

  // Email-verified reset — emails a 6-digit code, then resets via RPC.
  const sendCode = async () => {
    if (!email) { toast.error("No email on this account"); return; }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", { body: { channel: "email", target: email } });
      if (error) { toast.error("Failed to send code", { description: error.message }); return; }
      setDevCode((data as any)?.dev_code ?? null);
      setCodeSent(true);
      toast.success("Verification code sent", { description: `Check ${email}.` });
    } finally { setSending(false); }
  };
  const emailReset = async () => {
    if (code.trim().length !== 6) { toast.error("Enter the 6-digit code"); return; }
    if (!isPasswordValid(pwd)) { toast.error("Password must be 8+ chars with upper, lower, number & special character"); return; }
    if (pwd !== confirm) { toast.error("Passwords do not match"); return; }
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc("reset_password_with_otp", { _email: email, _code: code.trim(), _new_password: pwd });
      if (error) { toast.error("Reset failed", { description: error.message }); return; }
      const res = data as any;
      if (!res?.ok) {
        const r = res?.reason;
        toast.error(r === "weak_password" ? "Password too weak" : r === "too_many_attempts" ? "Too many attempts — request a new code" : "Invalid or expired code");
        return;
      }
      toast.success("Password updated"); setPwd(""); setConfirm(""); setCode(""); setCodeSent(false); setDevCode(null);
    } finally { setSaving(false); }
  };

  const signOut = async () => { await supabase.auth.signOut(); try { localStorage.removeItem("bharatone:auth"); } catch {} navigate({ to: "/login" }); };
  const input = "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30";
  const tab = (m: Method, label: string, icon: React.ReactNode) => (
    <button type="button" onClick={() => setMethod(m)}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 h-9 text-xs font-semibold transition ${method === m ? "bg-india-green text-white shadow-soft" : "border border-border bg-background text-muted-foreground hover:text-foreground"}`}>
      {icon} {label}
    </button>
  );

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-bold"><Lock className="h-4 w-4 text-india-green" /> Change password</p>
          <div className="flex gap-2">{tab("email", "Verify by email", <ShieldCheck className="h-3.5 w-3.5" />)}{tab("quick", "Quick change", <Zap className="h-3.5 w-3.5" />)}</div>
        </div>

        {method === "email" && email && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-india-green/30 bg-india-green/5 px-3 py-2 text-xs font-medium text-india-green">
            <Mail className="h-3.5 w-3.5" /> A 6-digit code will be sent to <span className="font-bold">{email}</span> to confirm this change.
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="text-xs font-semibold text-muted-foreground">New password</label><input type="password" className={input} value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="New password" autoComplete="new-password" /></div>
          <div><label className="text-xs font-semibold text-muted-foreground">Confirm password</label><input type="password" className={input} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter" autoComplete="new-password" /></div>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">Must include uppercase, lowercase, a number and a special character (8+ chars).</p>

        {method === "quick" ? (
          <Button onClick={quickChange} disabled={saving} className="mt-4 bg-india-green text-white">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Update password</Button>
        ) : !codeSent ? (
          <Button onClick={sendCode} disabled={sending || !email} className="mt-4 bg-india-green text-white">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Send verification code</Button>
        ) : (
          <div className="mt-4 space-y-3">
            {devCode && <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">Dev mode — your code is <span className="font-mono font-bold">{devCode}</span></div>}
            <div className="sm:max-w-xs">
              <label className="text-xs font-semibold text-muted-foreground">Verification code</label>
              <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="6-digit code" className={input + " font-mono tracking-[0.3em]"} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={emailReset} disabled={saving} className="bg-india-green text-white">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Verify &amp; update password</Button>
              <Button variant="outline" onClick={sendCode} disabled={sending}>Resend code</Button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="mb-4 flex items-center gap-2 text-sm font-bold"><Bell className="h-4 w-4 text-india-green" /> Notification preferences</p>
        <label className="flex items-center justify-between border-b border-border py-2 text-sm"><span>In-app notifications</span><input type="checkbox" checked={prefs.inapp} onChange={(e) => savePrefs({ ...prefs, inapp: e.target.checked })} className="h-4 w-4 accent-[oklch(0.55_0.12_150)]" /></label>
        <label className="flex items-center justify-between py-2 text-sm"><span>Email notifications</span><input type="checkbox" checked={prefs.email} onChange={(e) => savePrefs({ ...prefs, email: e.target.checked })} className="h-4 w-4 accent-[oklch(0.55_0.12_150)]" /></label>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="mb-3 text-sm font-bold">Session</p>
        <Button variant="outline" className="text-rose-600" onClick={signOut}><LogOut className="h-4 w-4" /> Sign out</Button>
      </div>
    </div>
  );
}
