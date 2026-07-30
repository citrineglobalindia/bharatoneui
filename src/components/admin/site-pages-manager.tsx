import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FileText, Loader2, RefreshCw, Plus, Trash2, Save, Eye, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

type Page = {
  id: string; slug: string; title: string; subtitle: string | null; content: string;
  footer_group: string; show_in_footer: boolean; show_in_bottom_bar: boolean;
  sort_order: number; published: boolean; meta_description: string | null; updated_at: string;
};

const GROUPS = ["Company", "Services", "Legal", "Support"];
const blank = (): Partial<Page> => ({
  slug: "", title: "", subtitle: "", content: "", footer_group: "Company",
  show_in_footer: true, show_in_bottom_bar: false, sort_order: 100, published: true, meta_description: "",
});

/**
 * Admin-managed website pages. Anything created here appears on the public site
 * at /p/<slug> and (optionally) as a link in the footer — so Terms, Privacy,
 * Refund Policy and any new page can be added and edited without a developer.
 */
export function SitePagesManager() {
  const [rows, setRows] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState<Partial<Page> | null>(null);

  const load = async () => {
    setLoading(true);
    await ensureStaffSession();
    const { data, error } = await (supabase as any)
      .from("site_pages").select("*").order("footer_group").order("sort_order");
    if (error) toast.error("Could not load pages", { description: error.message });
    setRows((data as Page[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!edit) return;
    if (!edit.title?.trim()) return toast.error("Enter a page title");
    if (!edit.slug?.trim()) return toast.error("Enter a URL slug (e.g. terms)");
    setSaving(true);
    const payload = {
      slug: edit.slug, title: edit.title, subtitle: edit.subtitle || null, content: edit.content || "",
      footer_group: edit.footer_group || "Company", show_in_footer: !!edit.show_in_footer,
      show_in_bottom_bar: !!edit.show_in_bottom_bar, sort_order: Number(edit.sort_order) || 100,
      published: !!edit.published, meta_description: edit.meta_description || null,
    };
    const { error } = edit.id
      ? await (supabase as any).from("site_pages").update(payload).eq("id", edit.id)
      : await (supabase as any).from("site_pages").insert(payload);
    setSaving(false);
    if (error) return toast.error("Save failed", { description: error.message });
    toast.success(edit.id ? "Page updated" : "Page created");
    setEdit(null); load();
  };

  const remove = async (p: Page) => {
    if (!confirm(`Delete the page "${p.title}"? The public link /p/${p.slug} will stop working.`)) return;
    const { error } = await (supabase as any).from("site_pages").delete().eq("id", p.id);
    if (error) return toast.error("Delete failed", { description: error.message });
    toast.success("Page deleted"); load();
  };

  const togglePublish = async (p: Page) => {
    const { error } = await (supabase as any).from("site_pages").update({ published: !p.published }).eq("id", p.id);
    if (error) return toast.error("Could not update", { description: error.message });
    load();
  };

  const inp = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold"><FileText className="h-5 w-5 text-admin" /> Website Pages</h2>
          <p className="text-sm text-muted-foreground">Create and edit the pages linked in the website footer — Terms, Privacy, Refund Policy or any new page. Published pages appear at /p/&lt;slug&gt;.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-10 text-sm font-semibold hover:bg-muted">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button onClick={() => setEdit(blank())} className="inline-flex items-center gap-1.5 rounded-lg bg-india-green px-4 h-10 text-sm font-bold text-white hover:bg-india-green/90">
            <Plus className="h-4 w-4" /> New page
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-india-green" /></div>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">No pages yet. Create your first one.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5">Title</th>
                <th className="px-3 py-2.5">URL</th>
                <th className="px-3 py-2.5">Footer group</th>
                <th className="px-3 py-2.5">In footer</th>
                <th className="px-3 py-2.5">Order</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-3 py-2.5">
                    <div className="font-semibold">{p.title}</div>
                    {p.subtitle && <div className="text-[11px] text-muted-foreground line-clamp-1">{p.subtitle}</div>}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">/p/{p.slug}</td>
                  <td className="px-3 py-2.5">{p.footer_group}</td>
                  <td className="px-3 py-2.5 text-xs">
                    {p.show_in_footer ? <span className="text-india-green font-semibold">Yes</span> : <span className="text-muted-foreground">No</span>}
                    {p.show_in_bottom_bar && <span className="ml-1 text-[10px] text-muted-foreground">· bottom bar</span>}
                  </td>
                  <td className="px-3 py-2.5">{p.sort_order}</td>
                  <td className="px-3 py-2.5">
                    <button onClick={() => togglePublish(p)}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${p.published ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                      {p.published ? "Published" : "Draft"}
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <a href={`/p/${p.slug}`} target="_blank" rel="noreferrer" className="rounded-lg border border-border p-1.5 hover:bg-muted" title="View page"><Eye className="h-3.5 w-3.5" /></a>
                      <button onClick={() => setEdit(p)} className="rounded-lg border border-border px-2.5 py-1 text-xs font-semibold hover:bg-muted">Edit</button>
                      <button onClick={() => remove(p)} className="rounded-lg border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {edit && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/40 p-4" onClick={() => setEdit(null)}>
          <div className="mt-8 w-full max-w-3xl rounded-2xl bg-card p-5 shadow-elev" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-extrabold">{edit.id ? "Edit page" : "New page"}</h3>
              <button onClick={() => setEdit(null)} className="rounded-lg border border-border p-1.5 hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="sm:col-span-2"><span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Page title *</span>
                <input className={inp} value={edit.title ?? ""} placeholder="Terms & Conditions"
                  onChange={(e) => setEdit({ ...edit, title: e.target.value, slug: edit.id ? edit.slug : e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") })} />
              </label>
              <label><span className="mb-1 block text-[11px] font-semibold text-muted-foreground">URL slug *</span>
                <input className={inp} value={edit.slug ?? ""} placeholder="terms" onChange={(e) => setEdit({ ...edit, slug: e.target.value })} />
                <span className="mt-1 block text-[10px] text-muted-foreground">Public link: /p/{edit.slug || "…"}</span>
              </label>
              <label><span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Footer group</span>
                <select className={inp} value={edit.footer_group ?? "Company"} onChange={(e) => setEdit({ ...edit, footer_group: e.target.value })}>
                  {GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </label>
              <label className="sm:col-span-2"><span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Subtitle (shown under the page title)</span>
                <input className={inp} value={edit.subtitle ?? ""} onChange={(e) => setEdit({ ...edit, subtitle: e.target.value })} />
              </label>
              <label className="sm:col-span-2"><span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Content *</span>
                <textarea rows={14} className="w-full rounded-lg border border-border bg-background p-3 font-mono text-[13px] leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-india-green/30"
                  value={edit.content ?? ""} placeholder={"## Section heading\nYour paragraph text.\n\n- bullet point\n- another point"}
                  onChange={(e) => setEdit({ ...edit, content: e.target.value })} />
                <span className="mt-1 block text-[10px] text-muted-foreground">Use <b>## Heading</b> for section titles, <b>- item</b> for bullets, and blank lines between paragraphs.</span>
              </label>
              <label><span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Sort order</span>
                <input type="number" className={inp} value={edit.sort_order ?? 100} onChange={(e) => setEdit({ ...edit, sort_order: Number(e.target.value) })} />
              </label>
              <label><span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Meta description (SEO)</span>
                <input className={inp} value={edit.meta_description ?? ""} onChange={(e) => setEdit({ ...edit, meta_description: e.target.value })} />
              </label>
              <div className="sm:col-span-2 flex flex-wrap gap-4 rounded-lg bg-muted/40 p-3">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4" checked={!!edit.published} onChange={(e) => setEdit({ ...edit, published: e.target.checked })} /> Published (visible to the public)</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4" checked={!!edit.show_in_footer} onChange={(e) => setEdit({ ...edit, show_in_footer: e.target.checked })} /> Show link in footer</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4" checked={!!edit.show_in_bottom_bar} onChange={(e) => setEdit({ ...edit, show_in_bottom_bar: e.target.checked })} /> Also in bottom bar</label>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setEdit(null)} className="rounded-lg border border-border px-4 h-10 text-sm font-semibold hover:bg-muted">Cancel</button>
              <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-india-green px-4 h-10 text-sm font-bold text-white disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {edit.id ? "Save changes" : "Create page"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
