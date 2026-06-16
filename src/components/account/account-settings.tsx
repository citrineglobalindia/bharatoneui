import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { Lock, Loader2, Save, LogOut, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isPasswordValid } from "@/components/register/password-field";
import { supabase } from "@/integrations/supabase/client";

export function AccountSettings() {
  const navigate = useNavigate();
  const [pwd, setPwd] = useState(""); const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState(() => { try { return JSON.parse(localStorage.getItem("bharatone:notif-prefs") || '{"inapp":true,"email":true}'); } catch { return { inapp: true, email: true }; } });

  const savePrefs = (p: any) => { setPrefs(p); try { localStorage.setItem("bharatone:notif-prefs", JSON.stringify(p)); } catch {} toast.success("Preferences saved"); };

  const changePassword = async () => {
    if (!isPasswordValid(pwd)) { toast.error("Password must be 8+ chars with upper, lower, number & special character"); return; }
    if (pwd !== confirm) { toast.error("Passwords do not match"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwd });
      if (error) { toast.error("Could not change password", { description: error.message }); return; }
      toast.success("Password updated"); setPwd(""); setConfirm("");
    } finally { setSaving(false); }
  };
  const signOut = async () => { await supabase.auth.signOut(); try { localStorage.removeItem("bharatone:auth"); } catch {} navigate({ to: "/login" }); };
  const input = "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30";

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="mb-4 flex items-center gap-2 text-sm font-bold"><Lock className="h-4 w-4 text-india-green" /> Change password</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="text-xs font-semibold text-muted-foreground">New password</label><input type="password" className={input} value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="New password" autoComplete="new-password" /></div>
          <div><label className="text-xs font-semibold text-muted-foreground">Confirm password</label><input type="password" className={input} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter" autoComplete="new-password" /></div>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">Must include uppercase, lowercase, a number and a special character (8+ chars).</p>
        <Button onClick={changePassword} disabled={saving} className="mt-4 bg-india-green text-white">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Update password</Button>
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
