import { useEffect, useRef, useState } from "react";
import { Loader2, Upload, Trash2, Award as AwardIcon, Eye, EyeOff, ArrowUp, ArrowDown, FileImage, Plus, X, Images } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Row = { id: string; name: string; logo_path: string; certificate_path: string | null; photo_paths: string[] | null; sort_order: number; is_active: boolean };

const publicUrl = (path: string) =>
  supabase.storage.from("gallery").getPublicUrl(path).data.publicUrl;

const uploadTo = async (file: File) => {
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `awards/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("gallery").upload(path, file, { contentType: file.type || undefined });
  if (error) throw error;
  return path;
};

export function AwardsManager() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [busyRow, setBusyRow] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("awards").select("*").order("sort_order").order("created_at");
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!name.trim()) { toast.error("Enter the award name"); return; }
    if (!logoFile) { toast.error("Choose a logo / award image"); return; }
    setBusy(true);
    try {
      const logo_path = await uploadTo(logoFile);
      const photo_paths: string[] = [];
      for (const f of photoFiles) { if (f.type.startsWith("image/")) photo_paths.push(await uploadTo(f)); }
      const { error } = await supabase.from("awards").insert({
        name: name.trim(), logo_path, photo_paths, sort_order: rows.length,
      });
      if (error) { toast.error("Save failed", { description: error.message }); return; }
      toast.success("Award added");
      setName(""); setLogoFile(null); setPhotoFiles([]);
      if (logoRef.current) logoRef.current.value = "";
      if (photosRef.current) photosRef.current.value = "";
      load();
    } catch (e) {
      toast.error("Upload failed", { description: e instanceof Error ? e.message : String(e) });
    } finally { setBusy(false); }
  };

  const addPhotos = async (r: Row, files: FileList) => {
    setBusyRow(r.id);
    try {
      const added: string[] = [];
      for (const f of Array.from(files)) { if (f.type.startsWith("image/")) added.push(await uploadTo(f)); }
      const next = [...(r.photo_paths ?? []), ...added];
      const { error } = await supabase.from("awards").update({ photo_paths: next }).eq("id", r.id);
      if (error) { toast.error("Save failed", { description: error.message }); return; }
      toast.success(`${added.length} photo(s) added`);
      load();
    } catch (e) {
      toast.error("Upload failed", { description: e instanceof Error ? e.message : String(e) });
    } finally { setBusyRow(null); }
  };

  const removePhoto = async (r: Row, path: string) => {
    const next = (r.photo_paths ?? []).filter((p) => p !== path);
    await supabase.from("awards").update({ photo_paths: next }).eq("id", r.id);
    await supabase.storage.from("gallery").remove([path]);
    load();
  };

  const toggle = async (r: Row) => { await supabase.from("awards").update({ is_active: !r.is_active }).eq("id", r.id); load(); };
  const remove = async (r: Row) => {
    if (!confirm("Delete this award?")) return;
    const paths = [r.logo_path, r.certificate_path, ...(r.photo_paths ?? [])].filter(Boolean) as string[];
    if (paths.length) await supabase.storage.from("gallery").remove(paths);
    await supabase.from("awards").delete().eq("id", r.id);
    toast.success("Deleted");
    load();
  };
  const move = async (r: Row, dir: -1 | 1) => {
    const idx = rows.findIndex((x) => x.id === r.id);
    const swap = rows[idx + dir];
    if (!swap) return;
    await Promise.all([
      supabase.from("awards").update({ sort_order: swap.sort_order }).eq("id", r.id),
      supabase.from("awards").update({ sort_order: r.sort_order }).eq("id", swap.id),
    ]);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="mb-1 flex items-center gap-2 text-sm font-bold"><AwardIcon className="h-4 w-4 text-saffron" /> Add award / recognition</p>
        <p className="mb-3 text-[11px] text-muted-foreground">Shows in the homepage "Awarded &amp; Recognized By" strip. The logo displays in the row; the photos (you can add several) open as a gallery when clicked. Transparent PNG logos look best.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground">Award name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. ELEVATE 2025"
              className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground">Logo image *</label>
              <label className="mt-1 flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2 text-xs font-semibold hover:bg-muted">
                <FileImage className="h-4 w-4" /> {logoFile ? "1 selected" : "Choose"}
                <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground">Photos (multiple)</label>
              <label className="mt-1 flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2 text-xs font-semibold hover:bg-muted">
                <Images className="h-4 w-4" /> {photoFiles.length ? `${photoFiles.length} selected` : "Choose"}
                <input ref={photosRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => setPhotoFiles(e.target.files ? Array.from(e.target.files) : [])} />
              </label>
            </div>
          </div>
        </div>
        <div className="mt-3">
          <button onClick={add} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-saffron px-4 h-10 text-sm font-semibold text-white hover:bg-saffron/90 disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Add award
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="mb-3 text-sm font-bold">Awards ({rows.length})</p>
        {loading ? (
          <div className="grid h-24 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-saffron" /></div>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No awards yet. The homepage section stays hidden until you add one.</p>
        ) : (
          <div className="space-y-3">
            {rows.map((r, i) => {
              const photos = r.photo_paths ?? [];
              return (
                <div key={r.id} className={`rounded-xl border border-border p-3 ${r.is_active ? "" : "opacity-50"}`}>
                  <div className="flex items-center gap-3">
                    <div className="grid h-14 w-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted">
                      <img src={publicUrl(r.logo_path)} alt={r.name} className="max-h-full max-w-full object-contain" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{r.name}</p>
                      <p className="text-[11px] text-muted-foreground">{photos.length} photo{photos.length === 1 ? "" : "s"}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                      <button onClick={() => move(r, -1)} disabled={i === 0} className="rounded-md border border-border px-1.5 py-1 hover:bg-muted disabled:opacity-40" aria-label="Move up"><ArrowUp className="h-3 w-3" /></button>
                      <button onClick={() => move(r, 1)} disabled={i === rows.length - 1} className="rounded-md border border-border px-1.5 py-1 hover:bg-muted disabled:opacity-40" aria-label="Move down"><ArrowDown className="h-3 w-3" /></button>
                      <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-semibold hover:bg-muted">
                        {busyRow === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Add photos
                        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files?.length && addPhotos(r, e.target.files)} />
                      </label>
                      <button onClick={() => toggle(r)} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-semibold hover:bg-muted">
                        {r.is_active ? <><EyeOff className="h-3 w-3" /> Hide</> : <><Eye className="h-3 w-3" /> Show</>}
                      </button>
                      <button onClick={() => remove(r)} className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50">
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    </div>
                  </div>
                  {photos.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                      {photos.map((p) => (
                        <div key={p} className="group relative h-16 w-16 overflow-hidden rounded-lg border border-border bg-muted">
                          <img src={publicUrl(p)} alt="" className="h-full w-full object-cover" />
                          <button onClick={() => removePhoto(r, p)} aria-label="Remove photo" className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"><X className="h-3 w-3" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
