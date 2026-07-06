import { useEffect, useRef, useState } from "react";
import { Loader2, Upload, Trash2, Images, Eye, EyeOff, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Row = { id: string; image_path: string; caption: string | null; sort_order: number; is_active: boolean };

const publicUrl = (path: string) =>
  supabase.storage.from("gallery").getPublicUrl(path).data.publicUrl;

export function HeroManager() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("hero_images").select("*").order("sort_order").order("created_at");
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const onUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file"); return; }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `hero/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("gallery").upload(path, file, { contentType: file.type || undefined });
      if (upErr) { toast.error("Upload failed", { description: upErr.message }); return; }
      const { error: insErr } = await supabase.from("hero_images").insert({
        image_path: path, caption: caption.trim() || null, sort_order: rows.length,
      });
      if (insErr) { toast.error("Save failed", { description: insErr.message }); return; }
      toast.success("Hero image added");
      setCaption("");
      if (fileRef.current) fileRef.current.value = "";
      load();
    } finally { setUploading(false); }
  };

  const toggle = async (r: Row) => {
    await supabase.from("hero_images").update({ is_active: !r.is_active }).eq("id", r.id);
    load();
  };
  const remove = async (r: Row) => {
    if (!confirm("Delete this hero image?")) return;
    await supabase.storage.from("gallery").remove([r.image_path]);
    await supabase.from("hero_images").delete().eq("id", r.id);
    toast.success("Deleted");
    load();
  };
  const move = async (r: Row, dir: -1 | 1) => {
    const idx = rows.findIndex((x) => x.id === r.id);
    const swap = rows[idx + dir];
    if (!swap) return;
    await Promise.all([
      supabase.from("hero_images").update({ sort_order: swap.sort_order }).eq("id", r.id),
      supabase.from("hero_images").update({ sort_order: r.sort_order }).eq("id", swap.id),
    ]);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="mb-1 flex items-center gap-2 text-sm font-bold"><Images className="h-4 w-4 text-saffron" /> Add homepage hero image</p>
        <p className="mb-3 text-[11px] text-muted-foreground">Add unlimited images — the homepage hero shows them as an auto-scrolling carousel. Landscape images (about 4:3 / 16:10) look best.</p>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground">Caption / alt text (optional)</label>
            <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="e.g. Citizens using BharatOne services"
              className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </div>
          <label className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-saffron px-4 h-10 text-sm font-semibold text-white hover:bg-saffron/90 disabled:opacity-60">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload image
            <input ref={fileRef} type="file" accept="image/*" disabled={uploading} className="hidden" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="mb-3 text-sm font-bold">Hero images ({rows.length})</p>
        {loading ? (
          <div className="grid h-32 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-saffron" /></div>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No hero images yet. The homepage shows the default image until you add one.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {rows.map((r, i) => (
              <div key={r.id} className={`overflow-hidden rounded-xl border border-border ${r.is_active ? "" : "opacity-50"}`}>
                <div className="aspect-[4/3] bg-muted">
                  <img src={publicUrl(r.image_path)} alt={r.caption ?? ""} className="h-full w-full object-cover" />
                </div>
                <div className="p-2">
                  <p className="truncate text-xs font-medium">{r.caption || "—"}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <button onClick={() => move(r, -1)} disabled={i === 0} className="inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-1 text-[11px] font-semibold hover:bg-muted disabled:opacity-40" aria-label="Move up"><ArrowUp className="h-3 w-3" /></button>
                    <button onClick={() => move(r, 1)} disabled={i === rows.length - 1} className="inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-1 text-[11px] font-semibold hover:bg-muted disabled:opacity-40" aria-label="Move down"><ArrowDown className="h-3 w-3" /></button>
                    <button onClick={() => toggle(r)} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-semibold hover:bg-muted">
                      {r.is_active ? <><EyeOff className="h-3 w-3" /> Hide</> : <><Eye className="h-3 w-3" /> Show</>}
                    </button>
                    <button onClick={() => remove(r)} className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50">
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
