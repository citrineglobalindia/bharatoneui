import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Bell, Check, Mail, MessageSquare, Smartphone, BellRing } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

type Cfg = {
  email_active: boolean;
  sms_provider: string | null; sms_active: boolean;
  whatsapp_provider: string | null; whatsapp_active: boolean;
  push_active: boolean;
};
type Log = { id: string; channel: string; target: string | null; subject: string | null; status: string; error: string | null; created_at: string };

const statusTone: Record<string, string> = {
  sent: "bg-emerald-100 text-emerald-700", failed: "bg-rose-100 text-rose-700",
  queued: "bg-amber-100 text-amber-700", not_configured: "bg-slate-100 text-slate-600",
};
const chanIcon: Record<string, any> = { email: Mail, sms: MessageSquare, whatsapp: MessageSquare, push: BellRing, in_app: Bell };

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`relative h-6 w-11 rounded-full transition ${on ? "bg-india-green" : "bg-slate-300"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

export function NotificationCenter() {
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    await ensureStaffSession();
    const [{ data: c }, { data: l }] = await Promise.all([
      (supabase as any).from("notification_config").select("*").eq("id", 1).maybeSingle(),
      (supabase as any).from("notification_log").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setCfg((c as Cfg) ?? null);
    setLogs((l as Log[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const patch = (p: Partial<Cfg>) => setCfg((c) => (c ? { ...c, ...p } : c));
  const save = async () => {
    if (!cfg) return;
    setSaving(true);
    const { error } = await (supabase as any).from("notification_config").update(cfg).eq("id", 1);
    setSaving(false);
    if (error) return toast.error("Save failed", { description: error.message });
    toast.success("Notification settings saved");
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold"><Bell className="h-5 w-5 text-india-green" /> Notification Center</h2>
          <p className="text-sm text-muted-foreground">Channels and delivery log. Email &amp; in-app are live; SMS/WhatsApp/Push activate when a provider is connected.</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-9 text-sm font-semibold hover:bg-muted"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
      </div>

      {loading ? (
        <div className="grid h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-india-green" /></div>
      ) : cfg ? (
        <>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <p className="mb-3 text-sm font-bold">Channels</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
                <span className="flex items-center gap-2 text-sm font-semibold"><Mail className="h-4 w-4 text-india-green" /> Email <span className="text-[10px] font-normal text-emerald-600">live</span></span>
                <Toggle on={cfg.email_active} onClick={() => patch({ email_active: !cfg.email_active })} />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
                <span className="flex items-center gap-2 text-sm font-semibold"><MessageSquare className="h-4 w-4 text-sky-600" /> SMS</span>
                <div className="flex items-center gap-2">
                  <input value={cfg.sms_provider ?? ""} onChange={(e) => patch({ sms_provider: e.target.value })} placeholder="provider (e.g. Gupshup)" className="h-8 w-40 rounded-md border border-border bg-background px-2 text-xs outline-none" />
                  <Toggle on={cfg.sms_active} onClick={() => patch({ sms_active: !cfg.sms_active })} />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
                <span className="flex items-center gap-2 text-sm font-semibold"><MessageSquare className="h-4 w-4 text-emerald-600" /> WhatsApp</span>
                <div className="flex items-center gap-2">
                  <input value={cfg.whatsapp_provider ?? ""} onChange={(e) => patch({ whatsapp_provider: e.target.value })} placeholder="provider" className="h-8 w-40 rounded-md border border-border bg-background px-2 text-xs outline-none" />
                  <Toggle on={cfg.whatsapp_active} onClick={() => patch({ whatsapp_active: !cfg.whatsapp_active })} />
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
                <span className="flex items-center gap-2 text-sm font-semibold"><Smartphone className="h-4 w-4 text-violet-600" /> Push</span>
                <Toggle on={cfg.push_active} onClick={() => patch({ push_active: !cfg.push_active })} />
              </div>
            </div>
            <button onClick={save} disabled={saving} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-india-green px-4 h-10 text-sm font-bold text-white hover:bg-india-green/90 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save settings
            </button>
            <p className="mt-2 text-[11px] text-muted-foreground">Enabling SMS/WhatsApp only takes effect after the provider key is set and the send function is implemented.</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <p className="mb-3 text-sm font-bold">Delivery log ({logs.length})</p>
            {logs.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No notifications dispatched yet.</p>
            ) : (
              <div className="space-y-2">
                {logs.map((l) => {
                  const Icon = chanIcon[l.channel] ?? Bell;
                  return (
                    <div key={l.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="w-16 shrink-0 text-xs font-semibold capitalize">{l.channel}</span>
                      <span className="min-w-0 flex-1 truncate">{l.subject || l.target || "—"}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusTone[l.status] ?? "bg-slate-100 text-slate-600"}`}>{l.status.replace("_", " ")}</span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{new Date(l.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Notification config unavailable.</p>
      )}
    </div>
  );
}
