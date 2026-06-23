import { useEffect, useRef, useState } from "react";
import { Loader2, Upload, Trash2, ImageIcon, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Row = { id: string; image_path: string; caption: string | null; sort_order: number; is_active: boolean };

const publicUrl = (path: string) =>
  supabase.storage.from("gallery").getPublicUrl(path).data.publicUrl;

export function GalleryManager() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("gallery_images").select("*").order("sort_order").order("created_at");
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const onUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("gallery").upload(path, file, { contentType: file.type || undefined });
      if (upErr) { toast.error("Upload failed", { description: upErr.message }); return; }
      const { error: insErr } = await supabase.from("gallery_images").insert({
        image_path: path, caption: caption.trim() || null, sort_order: rows.length,
      });
      if (insErr) { toast.error("Save failed", { description: insErr.message }); return; }
      toast.success("Image added to gallery");
      setCaption("");
      if (fileRef.current) fileRef.current.value = "";
      load();
    } finally { setUploading(false); }
  };

  const toggle = async (r: Row) => {
    await supabase.from("gallery_images").update({ is_active: !r.is_active }).eq("id", r.id);
    load();
  };
  const remove = async (r: Row) => {
    if (!confirm("Delete this gallery image?")) return;
    await supabase.storage.from("gallery").remove([r.image_path]);
    await supabase.from("gallery_images").delete().eq("id", r.id);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="mb-3 flex items-center gap-2 text-sm font-bold"><ImageIcon className="h-4 w-4 text-india-green" /> Add gallery image</p>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground">Caption (optional)</label>
            <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="e.g. Service Center Inauguration"
              className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </div>
          <label className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-india-green px-4 h-10 text-sm font-semibold text-white hover:bg-india-green/90">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload image
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="mb-3 text-sm font-bold">Gallery images ({rows.length})</p>
        {loading ? (
          <div className="grid h-32 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-india-green" /></div>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No images yet. Upload your first gallery photo above.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {rows.map((r) => (
              <div key={r.id} className={`overflow-hidden rounded-xl border border-border ${r.is_active ? "" : "opacity-50"}`}>
                <div className="aspect-[4/3] bg-muted">
                  <img src={publicUrl(r.image_path)} alt={r.caption ?? ""} className="h-full w-full object-cover" />
                </div>
                <div className="p-2">
                  <p className="truncate text-xs font-medium">{r.caption || "—"}</p>
                  <div className="mt-2 flex items-center gap-1.5">
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
