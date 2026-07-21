import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FileUp, Loader2, CheckCircle2, Clock, AlertTriangle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type DocReq = {
  id: string; doc_label: string; note: string | null; status: string;
  file_path: string | null; remarks: string | null; created_at: string;
};

/**
 * Documents the QC team has asked this retailer to (re)upload.
 * requested/rejected -> show an Upload button; uploaded -> "under QC review";
 * verified -> green tick. Uploads go to the retailer-kyc bucket under the
 * retailer's own folder, then submit_kyc_doc_request attaches the file and
 * notifies QC.
 */
export function QcDocRequestsCard() {
  const [rows, setRows] = useState<DocReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const targetReq = useRef<DocReq | null>(null);

  const load = async () => {
    const { data } = await (supabase as any)
      .from("kyc_doc_requests")
      .select("id, doc_label, note, status, file_path, remarks, created_at")
      .order("created_at", { ascending: false });
    setRows((data as DocReq[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const pickFile = (r: DocReq) => { targetReq.current = r; fileInput.current?.click(); };

  const onFile = async (f: File | undefined) => {
    const r = targetReq.current;
    if (!f || !r) return;
    if (f.size > 50 * 1024 * 1024) return toast.error("File too large", { description: "Maximum size is 50 MB." });
    setUploading(r.id);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) return toast.error("Please sign in again");
      const ext = (f.name.split(".").pop() || "bin").toLowerCase();
      const path = `${u.user.id}/qc-request-${r.id}-${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("retailer-kyc").upload(path, f, { upsert: false, contentType: f.type || undefined });
      if (upErr) return toast.error("Upload failed", { description: upErr.message });
      const { data, error } = await (supabase as any).rpc("submit_kyc_doc_request", { _id: r.id, _path: path });
      if (error) return toast.error("Could not submit the document", { description: error.message });
      if (!(data as any)?.ok) return toast.error("Could not submit the document");
      toast.success(`${r.doc_label} uploaded`, { description: "The QC team will verify it shortly." });
      await load();
    } finally {
      setUploading(null);
      targetReq.current = null;
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const view = async (r: DocReq) => {
    if (!r.file_path) return;
    const { data } = await supabase.storage.from("retailer-kyc").createSignedUrl(r.file_path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const chip = (r: DocReq) => {
    switch (r.status) {
      case "requested": return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700"><Clock className="h-3 w-3" /> Upload needed</span>;
      case "uploaded": return <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-700"><Loader2 className="h-3 w-3 animate-spin" /> Under QC review</span>;
      case "verified": return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Verified</span>;
      default: return <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700"><AlertTriangle className="h-3 w-3" /> Rejected — re-upload</span>;
    }
  };

  if (loading || rows.length === 0) return null;
  const open = rows.filter((r) => r.status !== "verified").length;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 shadow-soft">
      <p className="mb-1 flex items-center gap-2 text-sm font-bold">
        <FileUp className="h-4 w-4 text-amber-600" /> Documents requested by QC
        {open > 0 && <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">{open} pending</span>}
      </p>
      <p className="mb-3 text-[11px] text-muted-foreground">The QC team needs these documents from you. Uploads are verified by QC before they count.</p>
      <input ref={fileInput} type="file" accept="image/jpeg,image/png,application/pdf" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{r.doc_label}</p>
              {r.note && <p className="text-[11px] text-muted-foreground">Note from QC: {r.note}</p>}
              {r.status === "rejected" && r.remarks && <p className="text-[11px] font-medium text-rose-600">Rejection reason: {r.remarks}</p>}
            </div>
            {chip(r)}
            {r.file_path && r.status !== "requested" && (
              <Button size="sm" variant="outline" className="h-8" onClick={() => view(r)}><Eye className="h-3.5 w-3.5" /> View</Button>
            )}
            {(r.status === "requested" || r.status === "rejected") && (
              <Button size="sm" onClick={() => pickFile(r)} disabled={uploading === r.id} className="h-8 bg-india-green text-white">
                {uploading === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />} Upload
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
