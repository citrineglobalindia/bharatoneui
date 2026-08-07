import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Settings, Loader2, Check, QrCode, Upload, Trash2, Wrench, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";
import { AccountProfile } from "@/components/account/account-profile";

const FIELDS: [string, string, string][] = [
  ["platform_name", "Platform Name", "BharatOne"],
  ["support_email", "Support Email", "support@mybharatone.com"],
  ["support_phone", "Support Phone", "+91 90711 00311"],
  ["registration_fee", "Retailer Registration Fee (₹)", "20060"],
  ["retailer_radius_km", "Retailer Radius (km)", "2"],
];

export function SystemSettings() {
  const [vals, setVals] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  async function load() { setLoading(true); try { await ensureStaffSession(); const { data } = await supabase.from("app_settings").select("key,value"); const m: Record<string, string> = {}; ((data as any[]) ?? []).forEach((r) => (m[r.key] = r.value)); setVals(m); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  const save = async () => {
    setSaving(true);
    try { for (const [k] of FIELDS) { await supabase.rpc("set_app_setting", { p_key: k, p_value: vals[k] ?? "" }); } toast.success("Settings saved"); }
    finally { setSaving(false); }
  };
  const inp = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30";

  // Wallet payment QR — retailers see this on Wallet > Add Funds and pay it
  // via UPI before filing a manual top-up request for accountant verification.
  const [uploadingQr, setUploadingQr] = useState(false);
  const qrUrl = (vals["wallet_qr_url"] ?? "").trim();
  const uploadQr = async (file: File) => {
    if (!/^image\//.test(file.type)) return toast.error("Upload an image (PNG/JPG) of the QR code");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5 MB");
    setUploadingQr(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `wallet-qr/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("gallery").upload(path, file, { contentType: file.type });
      if (upErr) return toast.error("Upload failed", { description: upErr.message });
      const url = supabase.storage.from("gallery").getPublicUrl(path).data.publicUrl;
      const { error } = await supabase.rpc("set_app_setting", { p_key: "wallet_qr_url", p_value: url });
      if (error) return toast.error("Could not save the QR", { description: error.message });
      setVals((v) => ({ ...v, wallet_qr_url: url }));
      toast.success("Payment QR updated", { description: "Retailers now see it on Wallet → Add Funds." });
    } finally { setUploadingQr(false); }
  };
  const removeQr = async () => {
    const { error } = await supabase.rpc("set_app_setting", { p_key: "wallet_qr_url", p_value: "" });
    if (error) return toast.error("Could not remove the QR", { description: error.message });
    setVals((v) => ({ ...v, wallet_qr_url: "" }));
    toast.success("Payment QR removed");
  };

  return (
    <div className="space-y-5">
      <MaintenanceSwitch />

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="mb-4 flex items-center gap-2 text-sm font-bold"><Settings className="h-4 w-4 text-india-green" /> Platform Settings</p>
        {loading ? <div className="py-6 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div> : (<>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{FIELDS.map(([k, label, ph]) => (<div key={k}><label className="text-[11px] font-semibold text-muted-foreground">{label}</label><input className={inp} placeholder={ph} value={vals[k] ?? ""} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} /></div>))}</div>
          <Button onClick={save} disabled={saving} className="mt-4 bg-india-green text-white hover:bg-india-green/90">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save settings</Button>
        </>)}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="mb-1 flex items-center gap-2 text-sm font-bold"><QrCode className="h-4 w-4 text-india-green" /> Wallet Payment QR</p>
        <p className="mb-4 text-[11px] text-muted-foreground">Shown to retailers on Wallet → Add Funds. They scan &amp; pay via UPI, submit the transaction details and receipt, and the accountant verifies before crediting the wallet.</p>
        <div className="flex flex-wrap items-center gap-4">
          {qrUrl ? (
            <img src={qrUrl} alt="Current wallet payment QR" className="h-40 w-40 rounded-xl border border-border bg-white object-contain" />
          ) : (
            <div className="grid h-40 w-40 place-items-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">No QR set</div>
          )}
          <div className="flex flex-col gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-india-green px-4 h-10 text-sm font-semibold text-white hover:bg-india-green/90">
              {uploadingQr ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {qrUrl ? "Replace QR" : "Upload QR"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadQr(e.target.files[0])} />
            </label>
            {qrUrl && (
              <Button variant="outline" className="h-10 text-rose-600" onClick={removeQr}><Trash2 className="h-4 w-4" /> Remove QR</Button>
            )}
            <p className="max-w-xs text-[11px] text-muted-foreground">PNG or JPG, under 5 MB. Use the UPI QR from your bank or payment app.</p>
          </div>
        </div>
      </div>

      <AccountProfile />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Maintenance mode                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Take the site off the air, and put it back, from one button.
 *
 * Sits at the top of System Settings on purpose: this is the control somebody
 * reaches for when something is going wrong, and hunting for it is not what you
 * want to be doing at that moment.
 *
 * Turning it ON asks for confirmation. Turning it OFF does not — getting the
 * business back should never be behind an extra click.
 */
function MaintenanceSwitch() {
  const [on, setOn] = useState<boolean | null>(null);
  const [msg, setMsg] = useState("");
  const [bypass, setBypass] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    await ensureStaffSession();
    const { data } = await supabase.from("app_settings").select("key,value")
      .in("key", ["maintenance_mode", "maintenance_message", "maintenance_bypass_emails"]);
    const m: Record<string, string> = {};
    for (const r of (data as { key: string; value: string }[]) ?? []) m[r.key] = r.value;
    setOn(m.maintenance_mode === "on");
    setMsg(m.maintenance_message ?? "");
    setBypass(m.maintenance_bypass_emails ?? "");
  };

  // Saved on blur rather than behind its own button: this is a field somebody
  // edits in the same breath as pausing the site, and a second Save to forget
  // is a second way to be surprised later.
  const saveBypass = async () => {
    const { error } = await supabase.rpc("set_app_setting", {
      p_key: "maintenance_bypass_emails", p_value: bypass.trim(),
    });
    if (error) { toast.error("Could not save", { description: error.message }); return; }
    toast.success("Maintenance access list saved");
  };
  useEffect(() => { void load(); }, []);

  const flip = async (next: boolean) => {
    if (next && !confirm(
      "Put the site into maintenance mode?\n\n" +
      "Visitors, retailers and all non-admin staff will see the maintenance page " +
      "instead of the site. Administrators can carry on working, and you can turn " +
      "it off again from this same button.",
    )) return;

    setBusy(true);
    try {
      const { error } = await (supabase as any).rpc("admin_set_maintenance", {
        _on: next, _message: msg.trim() || null,
      });
      if (error) { toast.error("Could not change maintenance mode", { description: error.message }); return; }
      setOn(next);
      toast.success(next ? "Site is now in maintenance mode" : "Site is back online", {
        description: next ? "Only administrators can reach it." : "Everyone can reach it again.",
      });
    } finally { setBusy(false); }
  };

  if (on === null) {
    return (
      <div className="grid h-24 place-items-center rounded-2xl border border-border bg-card shadow-soft">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border p-5 shadow-soft ${on ? "border-amber-300 bg-amber-50" : "border-border bg-card"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`grid h-11 w-11 place-items-center rounded-xl ${on ? "bg-amber-200 text-amber-800" : "bg-india-green/10 text-india-green"}`}>
            {on ? <Wrench className="h-5 w-5" /> : <Globe className="h-5 w-5" />}
          </span>
          <div>
            <p className="text-sm font-bold">
              {on ? "The site is in maintenance mode" : "The site is live"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {on
                ? "Everyone except administrators sees the maintenance page."
                : "Everyone can reach the site normally."}
            </p>
          </div>
        </div>
        <Button
          onClick={() => flip(!on)}
          disabled={busy}
          className={on ? "bg-india-green text-white hover:bg-india-green/90" : "bg-amber-600 text-white hover:bg-amber-700"}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : on ? <Globe className="h-4 w-4" /> : <Wrench className="h-4 w-4" />}
          {on ? "Bring the site back online" : "Pause the site"}
        </Button>
      </div>

      <label className="mt-4 block text-[11px] font-semibold text-muted-foreground">
        Message shown to visitors
      </label>
      <textarea
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        rows={2}
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30"
        placeholder="We are carrying out scheduled maintenance and will be back shortly."
      />
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        Saved when you use the button above. The login pages stay open while maintenance is on,
        so you can always get back in.
      </p>

      <label className="mt-4 block text-[11px] font-semibold text-muted-foreground">
        Who can still use the site while it is paused
      </label>
      <input
        value={bypass}
        onChange={(e) => setBypass(e.target.value)}
        onBlur={saveBypass}
        placeholder="name@example.com, another@example.com"
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-india-green/30"
      />
      <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
        Comma separated. Everyone else — including other administrators — sees the maintenance
        page. Saved when you click away from the box. If you ever empty this by mistake, the
        way back is one row in the SQL editor:
        <code className="ml-1 rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
          update public.app_settings set value = &apos;off&apos; where key = &apos;maintenance_mode&apos;;
        </code>
      </p>
    </div>
  );
}
