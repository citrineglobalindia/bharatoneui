import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { Lock, Loader2, Save, LogOut, Bell, Mail, ShieldCheck, Zap, Eye, EyeOff, User, Phone, IdCard, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isPasswordValid } from "@/components/register/password-field";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/use-current-user";

type Method = "quick" | "email";

export function AccountSettings() {
  const navigate = useNavigate();
  const me = useCurrentUser();
  const [email, setEmail] = useState<string>("");
  const [uid, setUid] = useState<string>("");
  const [method, setMethod] = useState<Method>("email");
  const [pwd, setPwd] = useState(""); const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState(""); const [codeSent, setCodeSent] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [prefs, setPrefs] = useState(() => { try { return JSON.parse(localStorage.getItem("bharatone:notif-prefs") || '{"inapp":true,"email":true}'); } catch { return { inapp: true, email: true }; } });

  // --- profile (mobile number + JSKO ID) ---
  const [phone, setPhone] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);
  const [jskoRequested, setJskoRequested] = useState(false);
  const [requestingJsko, setRequestingJsko] = useState(false);

  useEffect(() => { (async () => {
    const { data } = await supabase.auth.getUser();
    const u = data?.user;
    setEmail(u?.email || "");
    if (!u) return;
    setUid(u.id);
    try { setJskoRequested(localStorage.getItem(`bharatone:jsko-requested:${u.id}`) === "1"); } catch {}
    const { data: p } = await supabase.from("profiles").select("phone").eq("id", u.id).maybeSingle();
    setPhone(String((p as any)?.phone ?? "").replace(/\D/g, "").slice(-10));
  })(); }, []);

  const savePhone = async () => {
    const digits = phone.replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(digits)) { toast.error("Enter a valid 10-digit mobile number"); return; }
    setSavingPhone(true);
    try {
      // Cast: the generated DB types predate the profiles.phone column (verified live).
      const { error } = await (supabase as any).from("profiles").update({ phone: digits }).eq("id", uid);
      if (error) { toast.error("Could not save the mobile number", { description: error.message }); return; }
      // The sidebar reads bharatone:auth first — sync it so the change shows immediately.
      try { const a = JSON.parse(localStorage.getItem("bharatone:auth") || "{}"); localStorage.setItem("bharatone:auth", JSON.stringify({ ...a, phone: digits })); } catch {}
      toast.success("Mobile number updated", { description: "It may take one refresh to appear everywhere." });
    } finally { setSavingPhone(false); }
  };

  const isRetailer = /retailer/i.test(me.role);
  const hasJsko = !!me.jskoId?.trim();
  const requestJsko = async () => {
    setRequestingJsko(true);
    try {
      const who = [me.name, email, phone ? `+91 ${phone}` : ""].filter(Boolean).join(" · ");
      const { error } = await supabase.rpc("notify_roles", {
        _roles: ["admin"], _type: "jsko_request", _title: "JSKO ID requested",
        _body: `Retailer ${who} has requested a JSKO ID to be generated for their account.`,
        _link: "/admin", _entity_type: "retailer", _entity_id: uid,
      } as any);
      if (error) { toast.error("Could not send the request", { description: error.message }); return; }
      setJskoRequested(true);
      try { localStorage.setItem(`bharatone:jsko-requested:${uid}`, "1"); } catch {}
      toast.success("Request sent to the admin team", { description: "You will be notified once your JSKO ID is generated." });
    } finally { setRequestingJsko(false); }
  };

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
        <p className="mb-4 flex items-center gap-2 text-sm font-bold"><User className="h-4 w-4 text-india-green" /> Profile</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Mobile number</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input inputMode="numeric" maxLength={10} value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="10-digit mobile number" className={input + " pl-9"} />
              </div>
              <Button onClick={savePhone} disabled={savingPhone || !uid} className="h-11 bg-india-green text-white">
                {savingPhone ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
              </Button>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Shown on your profile and used for AEPS and service updates.</p>
          </div>
          {isRetailer && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground">JSKO ID</label>
              <div className="flex h-11 items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 h-9 text-sm font-bold ${hasJsko ? "bg-india-green/10 text-india-green" : "bg-muted text-muted-foreground"}`}>
                  <IdCard className="h-4 w-4" /> {me.jskoId?.trim() || "Nill"}
                </span>
                {!hasJsko && (
                  jskoRequested ? (
                    <span className="text-xs font-semibold text-amber-700">Request sent — waiting for the admin team</span>
                  ) : (
                    <Button onClick={requestJsko} disabled={requestingJsko || !uid} variant="outline" className="h-9">
                      {requestingJsko ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Request JSKO ID
                    </Button>
                  )
                )}
              </div>
              {!hasJsko && !jskoRequested && <p className="mt-1 text-[11px] text-muted-foreground">No JSKO ID yet — ask the admin team to generate one for you.</p>}
            </div>
          )}
        </div>
      </div>

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
          <div><label className="text-xs font-semibold text-muted-foreground">New password</label><div className="relative"><input type={showPw ? "text" : "password"} className={input + " pr-10"} value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="New password" autoComplete="new-password" /><button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
          <div><label className="text-xs font-semibold text-muted-foreground">Confirm password</label><div className="relative"><input type={showPw ? "text" : "password"} className={input + " pr-10"} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter" autoComplete="new-password" /><button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
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
