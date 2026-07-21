import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Settings, Loader2, Check, QrCode, Upload, Trash2 } from "lucide-react";
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
