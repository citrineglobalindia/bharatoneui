import { useEffect, useState } from "react";
import { Loader2, Upload, FileText, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Row = { id: string; form_path: string | null; form_name: string | null; sample_path: string | null; sample_name: string | null };

const dl = (path: string, name?: string | null) =>
  supabase.storage.from("gallery").getPublicUrl(path, { download: name || true }).data.publicUrl;

export function DistributorFormManager() {
  const [row, setRow] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"form" | "sample" | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("distributor_forms")
      .select("id, form_path, form_name, sample_path, sample_name")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setRow((data as Row) ?? null);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const upload = async (kind: "form" | "sample", file: File) => {
    if (file.type !== "application/pdf") { toast.error("Please choose a PDF file"); return; }
    setBusy(kind);
    try {
      const path = `forms/${kind}-${crypto.randomUUID()}.pdf`;
      const { error: upErr } = await supabase.storage.from("gallery").upload(path, file, { contentType: "application/pdf" });
      if (upErr) { toast.error("Upload failed", { description: upErr.message }); return; }
      const patch = kind === "form"
        ? { form_path: path, form_name: file.name }
        : { sample_path: path, sample_name: file.name };
      if (row) {
        const { error } = await supabase.from("distributor_forms").update(patch).eq("id", row.id);
        if (error) { toast.error("Save failed", { description: error.message }); return; }
      } else {
        const { error } = await supabase.from("distributor_forms").insert(patch);
        if (error) { toast.error("Save failed", { description: error.message }); return; }
      }
      toast.success(kind === "form" ? "Onboarding form updated" : "Sample form updated");
      load();
    } finally { setBusy(null); }
  };

  const clearFile = async (kind: "form" | "sample") => {
    if (!row) return;
    const path = kind === "form" ? row.form_path : row.sample_path;
    if (path) await supabase.storage.from("gallery").remove([path]);
    await supabase.from("distributor_forms").update(kind === "form" ? { form_path: null, form_name: null } : { sample_path: null, sample_name: null }).eq("id", row.id);
    toast.success("Removed");
    load();
  };

  const Slot = ({ kind, title, desc, path, name }: { kind: "form" | "sample"; title: string; desc: string; path: string | null; name: string | null }) => (
    <div className="rounded-xl border border-border p-4">
      <p className="flex items-center gap-2 text-sm font-bold"><FileText className="h-4 w-4 text-india-green" /> {title}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{desc}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-india-green px-3 h-9 text-sm font-semibold text-white hover:bg-india-green/90">
          {busy === kind ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {path ? "Replace PDF" : "Upload PDF"}
          <input type="file" accept="application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && upload(kind, e.target.files[0])} />
        </label>
        {path && (
          <>
            <a href={dl(path, name)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-9 text-sm font-semibold hover:bg-muted"><Download className="h-4 w-4" /> Download</a>
            <button onClick={() => clearFile(kind)} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 h-9 text-sm font-semibold text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /> Remove</button>
          </>
        )}
      </div>
      <p className="mt-2 truncate text-[11px] text-muted-foreground">{path ? (name || "Current file uploaded") : "No file uploaded yet."}</p>
    </div>
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <p className="mb-1 text-sm font-bold">Distributor onboarding form (download)</p>
      <p className="mb-3 text-[11px] text-muted-foreground">These PDFs appear as download buttons on the distributor registration page. PDF only.</p>
      {loading ? (
        <div className="grid h-20 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-india-green" /></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Slot kind="form" title="Onboarding form (to fill)" desc="The blank form applicants download and fill." path={row?.form_path ?? null} name={row?.form_name ?? null} />
          <Slot kind="sample" title="Sample form" desc="A filled example for reference." path={row?.sample_path ?? null} name={row?.sample_name ?? null} />
        </div>
      )}
    </div>
  );
}
