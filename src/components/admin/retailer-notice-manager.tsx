import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Bell, Check, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";
import { Button } from "@/components/ui/button";

type Item = { label: string; text: string };
type Notice = {
  id: number;
  title: string;
  greeting: string;
  intro: string;
  items: Item[];
  footer: string;
  is_active: boolean;
};

const input =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30";

const EMPTY: Notice = { id: 1, title: "Important Notice from BharatOne", greeting: "Dear Retailer,", intro: "", items: [], footer: "", is_active: true };

export function RetailerNoticeManager() {
  const [n, setN] = useState<Notice>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    await ensureStaffSession();
    const { data, error } = await supabase.from("retailer_dashboard_notice").select("*").eq("id", 1).maybeSingle();
    if (error) toast.error("Failed to load notice", { description: error.message });
    if (data) {
      const d = data as any;
      setN({ id: 1, title: d.title ?? "", greeting: d.greeting ?? "", intro: d.intro ?? "", items: Array.isArray(d.items) ? d.items : [], footer: d.footer ?? "", is_active: !!d.is_active });
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const patch = (p: Partial<Notice>) => setN((x) => ({ ...x, ...p }));
  const patchItem = (i: number, p: Partial<Item>) => setN((x) => ({ ...x, items: x.items.map((it, idx) => idx === i ? { ...it, ...p } : it) }));
  const addItem = () => setN((x) => ({ ...x, items: [...x.items, { label: "", text: "" }] }));
  const removeItem = (i: number) => setN((x) => ({ ...x, items: x.items.filter((_, idx) => idx !== i) }));

  const save = async () => {
    setBusy(true);
    try {
      const ok = await ensureStaffSession();
      if (!ok) { toast.error("Session expired", { description: "Please sign in again as admin and retry." }); return; }
      const clean = n.items.filter((it) => (it.label + it.text).trim());
      const { error } = await supabase.from("retailer_dashboard_notice").update({
        title: n.title.trim(), greeting: n.greeting.trim(), intro: n.intro.trim(),
        items: clean, footer: n.footer.trim(), is_active: n.is_active, updated_at: new Date().toISOString(),
      }).eq("id", 1);
      if (error) { toast.error("Save failed", { description: error.message }); return; }
      toast.success("Notice updated — visible on retailer dashboards");
      setN((x) => ({ ...x, items: clean }));
    } finally { setBusy(false); }
  };

  if (loading) return <div className="grid h-40 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-india-green" /></div>;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-bold"><Bell className="h-4 w-4 text-india-green" /> Retailer Dashboard Notice</p>
          <button onClick={() => patch({ is_active: !n.is_active })} className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-[11px] font-semibold hover:bg-muted">
            {n.is_active ? <><Eye className="h-3 w-3 text-india-green" /> Shown</> : <><EyeOff className="h-3 w-3" /> Hidden</>}
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground">Title</label>
            <input value={n.title} onChange={(e) => patch({ title: e.target.value })} className={input} />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground">Greeting</label>
            <input value={n.greeting} onChange={(e) => patch({ greeting: e.target.value })} className={input} />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground">Intro line</label>
            <textarea rows={2} value={n.intro} onChange={(e) => patch({ intro: e.target.value })} className={input + " h-auto py-2"} />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-[11px] font-semibold text-muted-foreground">Guideline points</label>
              <button onClick={addItem} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-semibold hover:bg-muted"><Plus className="h-3 w-3" /> Add point</button>
            </div>
            <div className="space-y-2">
              {n.items.length === 0 && <p className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">No points yet. Click “Add point”.</p>}
              {n.items.map((it, i) => (
                <div key={i} className="rounded-xl border border-border p-3">
                  <div className="flex items-center gap-2">
                    <input value={it.label} onChange={(e) => patchItem(i, { label: e.target.value })} placeholder="Bold label (e.g. Timings)" className={input + " max-w-[40%]"} />
                    <input value={it.text} onChange={(e) => patchItem(i, { text: e.target.value })} placeholder="Description" className={input} />
                    <button onClick={() => removeItem(i)} className="shrink-0 rounded-md border border-rose-200 p-2 text-rose-600 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-muted-foreground">Footer note</label>
            <textarea rows={2} value={n.footer} onChange={(e) => patch({ footer: e.target.value })} className={input + " h-auto py-2"} />
          </div>

          <Button className="bg-india-green text-white" onClick={save} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save notice
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="mb-3 text-sm font-bold">Preview</p>
        {!n.is_active && <p className="mb-2 text-[11px] font-semibold text-amber-600">Hidden — retailers will not see this notice.</p>}
        <p className="flex items-center gap-2 text-sm font-bold"><span className="grid h-7 w-7 place-items-center rounded-lg bg-saffron/10 text-saffron"><Bell className="h-4 w-4" /></span> {n.title}</p>
        {n.greeting && <p className="mt-3 text-sm font-semibold">{n.greeting}</p>}
        {n.intro && <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{n.intro}</p>}
        <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
          {n.items.map((it, i) => <li key={i}>{it.label && <b className="text-foreground">{it.label}</b>}{it.label ? " — " : ""}{it.text}</li>)}
        </ul>
        {n.footer && <p className="mt-3 text-[11px] text-muted-foreground leading-relaxed">{n.footer}</p>}
      </div>
    </div>
  );
}
