import { useEffect, useRef, useState } from "react";
import { Loader2, Upload, Trash2, Heart } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Row = { id: string; image_path: string; tagline: string };

const publicUrl = (path: string) =>
  supabase.storage.from("gallery").getPublicUrl(path).data.publicUrl;

export function FooterInspirationManager() {
  const [row, setRow] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [tagline, setTagline] = useState("Inspired by Ratan Naval TATA");
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("footer_inspiration")
      .select("id, image_path, tagline")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const r = (data as Row) ?? null;
    setRow(r);
    if (r) setTagline(r.tagline);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const onUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file"); return; }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `footer/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("gallery").upload(path, file, { contentType: file.type || undefined });
      if (upErr) { toast.error("Upload failed", { description: upErr.message }); return; }
      // Deactivate any previous rows, then insert the new active one.
      await supabase.from("footer_inspiration").update({ is_active: false }).eq("is_active", true);
      const { error: insErr } = await supabase.from("footer_inspiration").insert({ image_path: path, tagline: tagline.trim() || "Inspired by" });
      if (insErr) { toast.error("Save failed", { description: insErr.message }); return; }
      toast.success("Footer photo updated");
      if (fileRef.current) fileRef.current.value = "";
      load();
    } finally { setUploading(false); }
  };

  const saveTagline = async () => {
    if (!row) return;
    const { error } = await supabase.from("footer_inspiration").update({ tagline: tagline.trim() || "Inspired by" }).eq("id", row.id);
    if (error) { toast.error("Save failed", { description: error.message }); return; }
    toast.success("Tagline saved");
    load();
  };

  const remove = async () => {
    if (!row) return;
    if (!confirm("Remove the footer photo?")) return;
    await supabase.storage.from("gallery").remove([row.image_path]);
    await supabase.from("footer_inspiration").delete().eq("id", row.id);
    toast.success("Removed");
    setRow(null);
    load();
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <p className="mb-1 flex items-center gap-2 text-sm font-bold"><Heart className="h-4 w-4 text-saffron" /> Footer "Inspired by" photo</p>
      <p className="mb-3 text-[11px] text-muted-foreground">Shows below the address in the website footer with the tagline underneath. Uploading a new photo replaces the current one.</p>

      {loading ? (
        <div className="grid h-24 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-saffron" /></div>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="w-full sm:w-56">
            <div className="overflow-hidden rounded-xl border border-border bg-muted">
              {row ? (
                <img src={publicUrl(row.image_path)} alt={row.tagline} className="h-40 w-full object-cover" />
              ) : (
                <div className="grid h-40 place-items-center text-xs text-muted-foreground">No photo yet</div>
              )}
            </div>
            {row && <p className="mt-2 text-center text-sm font-semibold italic text-muted-foreground">&ldquo;{row.tagline}&rdquo;</p>}
          </div>

          <div className="flex-1 space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground">Tagline</label>
              <input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="e.g. Inspired by Ratan Naval TATA"
                className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-saffron px-4 h-10 text-sm font-semibold text-white hover:bg-saffron/90">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {row ? "Replace photo" : "Upload photo"}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
              </label>
              {row && (
                <>
                  <button onClick={saveTagline} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 h-10 text-sm font-semibold hover:bg-muted">Save tagline</button>
                  <button onClick={remove} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-4 h-10 text-sm font-semibold text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /> Remove</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
