import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, ShieldAlert, Smartphone, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

type Factor = { id: string; status: string; friendly_name?: string | null };

export function StaffSecurity() {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  async function load() {
    setLoading(true);
    await ensureStaffSession();
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors(((data?.all ?? []) as any[]).map((f) => ({ id: f.id, status: f.status, friendly_name: f.friendly_name })));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const verified = factors.filter((f) => f.status === "verified");
  const isProtected = verified.length > 0;

  const startEnroll = async () => {
    setEnrolling(true); setCode("");
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `BharatOne ${Date.now()}` });
    if (error) { toast.error("Couldn't start 2FA setup", { description: error.message }); setEnrolling(false); return; }
    setFactorId(data.id);
    setQr((data as any).totp?.qr_code ?? null);
    setSecret((data as any).totp?.secret ?? null);
  };

  const verify = async () => {
    if (!factorId || code.trim().length < 6) { toast.error("Enter the 6-digit code from your authenticator app"); return; }
    setVerifying(true);
    const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
    if (chErr) { toast.error(chErr.message); setVerifying(false); return; }
    const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: ch.id, code: code.trim() });
    setVerifying(false);
    if (error) { toast.error("Invalid code — try again", { description: error.message }); return; }
    toast.success("Two-factor authentication enabled");
    setEnrolling(false); setQr(null); setSecret(null); setFactorId(null); setCode("");
    load();
  };

  const removeFactor = async (id: string) => {
    if (!confirm("Disable two-factor authentication for this account?")) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    if (error) { toast.error(error.message); return; }
    toast.success("2FA removed");
    load();
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-extrabold"><ShieldCheck className="h-5 w-5 text-india-green" /> Security &amp; Two-Factor Authentication</h2>
        <p className="text-sm text-muted-foreground">Add an extra layer of security to your staff account using an authenticator app (TOTP).</p>
      </div>

      {loading ? (
        <div className="grid h-32 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-india-green" /></div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center gap-3">
            <span className={`grid h-11 w-11 place-items-center rounded-xl ${isProtected ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              {isProtected ? <ShieldCheck className="h-6 w-6" /> : <ShieldAlert className="h-6 w-6" />}
            </span>
            <div>
              <p className="font-bold">{isProtected ? "Two-factor authentication is ON" : "Two-factor authentication is OFF"}</p>
              <p className="text-xs text-muted-foreground">{isProtected ? "You'll be asked for a code from your app at login." : "Recommended for admin and staff accounts."}</p>
            </div>
          </div>

          {isProtected && (
            <div className="mt-4 space-y-2">
              {verified.map((f) => (
                <div key={f.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                  <span className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-india-green" /> Authenticator app {f.friendly_name ? `· ${f.friendly_name}` : ""}</span>
                  <button onClick={() => removeFactor(f.id)} className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /> Remove</button>
                </div>
              ))}
            </div>
          )}

          {!isProtected && !enrolling && (
            <button onClick={startEnroll} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-india-green px-4 h-10 text-sm font-bold text-white hover:bg-india-green/90"><ShieldCheck className="h-4 w-4" /> Enable 2FA</button>
          )}

          {enrolling && (
            <div className="mt-4 rounded-xl border border-india-green/30 bg-india-green/5 p-4">
              <p className="mb-3 text-sm font-semibold">Scan this QR in Google Authenticator / Authy, then enter the 6-digit code:</p>
              <div className="flex flex-wrap items-start gap-5">
                {qr && <img src={qr} alt="2FA QR code" className="h-40 w-40 rounded-lg border border-border bg-white p-1" />}
                <div className="space-y-3">
                  {secret && <p className="text-xs text-muted-foreground">Or enter this key manually:<br /><span className="font-mono text-sm text-foreground">{secret}</span></p>}
                  <input
                    value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    inputMode="numeric" placeholder="123456"
                    className="h-11 w-40 rounded-lg border border-border bg-background px-3 text-lg tracking-widest outline-none focus-visible:ring-2 focus-visible:ring-india-green/30"
                  />
                  <div className="flex gap-2">
                    <button onClick={verify} disabled={verifying} className="inline-flex items-center gap-2 rounded-lg bg-india-green px-4 h-10 text-sm font-bold text-white hover:bg-india-green/90 disabled:opacity-50">
                      {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Verify &amp; enable
                    </button>
                    <button onClick={() => { setEnrolling(false); setQr(null); setSecret(null); setFactorId(null); }} className="rounded-lg border border-border px-4 h-10 text-sm font-semibold hover:bg-muted">Cancel</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
