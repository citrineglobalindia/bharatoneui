import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Settings, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";
import { AccountProfile } from "@/components/account/account-profile";

const FIELDS: [string, string, string][] = [
  ["platform_name", "Platform Name", "BharatOne"],
  ["support_email", "Support Email", "support@mybharatone.com"],
  ["support_phone", "Support Phone", "+91 90711 00311"],
  ["registration_fee", "Registration Fee (₹)", "4999"],
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
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="mb-4 flex items-center gap-2 text-sm font-bold"><Settings className="h-4 w-4 text-india-green" /> Platform Settings</p>
        {loading ? <div className="py-6 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div> : (<>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{FIELDS.map(([k, label, ph]) => (<div key={k}><label className="text-[11px] font-semibold text-muted-foreground">{label}</label><input className={inp} placeholder={ph} value={vals[k] ?? ""} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} /></div>))}</div>
          <Button onClick={save} disabled={saving} className="mt-4 bg-india-green text-white hover:bg-india-green/90">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save settings</Button>
        </>)}
      </div>
      <AccountProfile />
    </div>
  );
}
