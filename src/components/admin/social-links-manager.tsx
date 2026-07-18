import { useEffect, useState } from "react";
import { Loader2, Save, Share2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SOCIALS } from "@/components/site/Footer";

type Row = { platform: string; url: string | null; is_active: boolean };

/**
 * CR-149 — lets an admin set the footer social media links without a code change.
 * Blank or inactive links simply disappear from the footer.
 */
export function SocialLinksManager() {
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await (supabase as any).from("social_links").select("platform, url, is_active");
    const map: Record<string, Row> = {};
    for (const s of SOCIALS) map[s.key] = { platform: s.key, url: "", is_active: true };
    for (const r of ((data as Row[]) ?? [])) map[r.platform] = r;
    setRows(map);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      const payload = SOCIALS.map((s) => ({
        platform: s.key,
        url: (rows[s.key]?.url ?? "").trim() || null,
        is_active: rows[s.key]?.is_active ?? true,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await (supabase as any).from("social_links").upsert(payload, { onConflict: "platform" });
      if (error) toast.error("Save failed", { description: error.message });
      else toast.success("Social links updated");
    } finally { setSaving(false); }
  };

  const set = (key: string, patch: Partial<Row>) =>
    setRows((r) => ({ ...r, [key]: { ...r[key], platform: key, ...patch } as Row }));

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <p className="mb-1 flex items-center gap-2 text-sm font-bold">
        <Share2 className="h-4 w-4 text-india-green" /> Social media links
      </p>
      <p className="mb-4 text-[11px] text-muted-foreground">
        These appear in the website footer. Leave a link blank (or untick it) to hide that icon.
      </p>

      {loading ? (
        <div className="grid h-24 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-india-green" /></div>
      ) : (
        <div className="space-y-3">
          {SOCIALS.map((s) => (
            <div key={s.key} className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted">
                <s.Icon className="h-4 w-4" />
              </span>
              <label className="w-28 shrink-0 text-xs font-semibold">{s.label}</label>
              <input
                value={rows[s.key]?.url ?? ""}
                onChange={(e) => set(s.key, { url: e.target.value })}
                placeholder={`https://…`}
                className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm"
              />
              <label className="flex shrink-0 items-center gap-1.5 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={rows[s.key]?.is_active ?? true}
                  onChange={(e) => set(s.key, { is_active: e.target.checked })}
                />
                Show
              </label>
            </div>
          ))}

          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-india-green px-4 h-10 text-sm font-semibold text-white hover:bg-india-green/90 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save links
          </button>
        </div>
      )}
    </div>
  );
}
