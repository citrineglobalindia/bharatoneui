import { useEffect, useRef, useState } from "react";
import { Loader2, Upload, Trash2, Award as AwardIcon, Eye, EyeOff, ArrowUp, ArrowDown, FileImage } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Row = { id: string; name: string; logo_path: string; certificate_path: string | null; sort_order: number; is_active: boolean };

const publicUrl = (path: string) =>
  supabase.storage.from("gallery").getPublicUrl(path).data.publicUrl;

export function AwardsManager() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [certFile, setCertFile] = useState<File | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const certRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("awards").select("*").order("sort_order").order("created_at");
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const uploadTo = async (file: File) => {
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const path = `awards/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("gallery").upload(path, file, { contentType: file.type || undefined });
    if (error) throw error;
    return path;
  };

  const add = async () => {
    if (!name.trim()) { toast.error("Enter the award name"); return; }
    if (!logoFile) { toast.error("Choose a logo / award image"); return; }
    setBusy(true);
    try {
      const logo_path = await uploadTo(logoFile);
      const certificate_path = certFile ? await uploadTo(certFile) : null;
      const { error } = await supabase.from("awards").insert({
        name: name.trim(), logo_path, certificate_path, sort_order: rows.length,
      });
      if (error) { toast.error("Save failed", { description: error.message }); return; }
      toast.success("Award added");
      setName(""); setLogoFile(null); setCertFile(null);
      if (logoRef.current) logoRef.current.value = "";
      if (certRef.current) certRef.current.value = "";
      load();
    } catch (e) {
      toast.error("Upload failed", { description: e instanceof Error ? e.message : String(e) });
    } finally { setBusy(false); }
  };

  const toggle = async (r: Row) => {
    await supabase.from("awards").update({ is_active: !r.is_active }).eq("id", r.id);
    load();
  };
  const remove = async (r: Row) => {
    if (!confirm("Delete this award?")) return;
    const paths = [r.logo_path, r.certificate_path].filter(Boolean) as string[];
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
        <p className="mb-3 text-[11px] text-muted-foreground">Shows in the homepage "Awarded &amp; Recognized By" strip. Logo displays in the row; the optional certificate opens enlarged when clicked. Transparent PNG logos look best.</p>
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
              <label className="text-[11px] font-semibold text-muted-foreground">Certificate (optional)</label>
              <label className="mt-1 flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2 text-xs font-semibold hover:bg-muted">
                <FileImage className="h-4 w-4" /> {certFile ? "1 selected" : "Choose"}
                <input ref={certRef} type="file" accept="image/*" className="hidden" onChange={(e) => setCertFile(e.target.files?.[0] ?? null)} />
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
          <p className="py-6 text-center text-sm text-muted-foreground">No awards yet. The homepage shows the default awards until you add one.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((r, i) => (
              <div key={r.id} className={`flex items-center gap-3 rounded-xl border border-border p-3 ${r.is_active ? "" : "opacity-50"}`}>
                <div className="grid h-14 w-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted">
                  <img src={publicUrl(r.logo_path)} alt={r.name} className="max-h-full max-w-full object-contain" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{r.name}</p>
                  <p className="text-[11px] text-muted-foreground">{r.certificate_path ? "Certificate attached" : "No certificate"}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <button onClick={() => move(r, -1)} disabled={i === 0} className="rounded-md border border-border px-1.5 py-1 hover:bg-muted disabled:opacity-40" aria-label="Move up"><ArrowUp className="h-3 w-3" /></button>
                    <button onClick={() => move(r, 1)} disabled={i === rows.length - 1} className="rounded-md border border-border px-1.5 py-1 hover:bg-muted disabled:opacity-40" aria-label="Move down"><ArrowDown className="h-3 w-3" /></button>
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
