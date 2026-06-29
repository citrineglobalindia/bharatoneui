import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Upload, Loader2, CheckCircle2, ShieldCheck, FileCheck2, AlertTriangle } from "lucide-react";
import { BharatOneLogo } from "@/components/bharatone-logo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reupload-docs/$token")({
  head: () => ({ meta: [{ title: "Re-upload Documents — BharatOne" }] }),
  component: ReuploadPage,
});

const LABEL: Record<string, string> = { selfie: "Selfie", shop: "Outside Shop Photo", shop_inside: "Inside Shop Photo", passport: "Passport Size Photo", aadhaar: "Aadhaar Card", pan: "PAN Card", police: "Police Verification", video: "Video KYC" };

function ReuploadPage() {
  const { token } = Route.useParams();
  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState<string[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [allDone, setAllDone] = useState(false);

  async function load() {
    const { data } = await supabase.rpc("get_doc_request", { _token: token });
    setInfo(data ?? null);
    setDone(((data as any)?.done as string[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [token]);

  const upload = async (key: string, file: File) => {
    if (file.size > 50 * 1024 * 1024) return toast.error("File too large", { description: "Maximum size is 50 MB." });
    setBusyKey(key);
    try {
      const ext = (file.name.split(".").pop() || "bin").toLowerCase();
      const path = `reupload/${token}/${key}-${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("retailer-kyc").upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (upErr) return toast.error("Upload failed", { description: upErr.message });
      const { data, error } = await supabase.rpc("submit_doc_reupload", { _token: token, _key: key, _path: path });
      if (error) return toast.error("Could not submit", { description: error.message });
      toast.success(`${LABEL[key] || key} uploaded`);
      setDone((d) => [...new Set([...d, key])]);
      if ((data as any)?.all_done) setAllDone(true);
    } finally { setBusyKey(null); }
  };

  if (loading) return <div className="grid min-h-screen place-items-center bg-tricolor"><Loader2 className="h-6 w-6 animate-spin text-india-green" /></div>;

  if (!info || (info.status !== "docs_requested" && !allDone)) {
    return (
      <div className="grid min-h-screen place-items-center bg-tricolor p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-elev">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
          <p className="mt-3 font-bold">This link is no longer active</p>
          <p className="mt-1 text-sm text-muted-foreground">The document request may already be completed or the link has expired. Please contact support if you need help.</p>
          <Link to="/login" className="mt-4 inline-block rounded-lg bg-india-green px-4 py-2 text-sm font-semibold text-white">Go to BharatOne</Link>
        </div>
      </div>
    );
  }

  const keys: string[] = info.keys ?? [];

  return (
    <div className="min-h-screen bg-tricolor p-4">
      <div className="mx-auto max-w-xl">
        <div className="mb-4 flex justify-center pt-4"><BharatOneLogo size="lg" /></div>
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-elev">
          <div className="flex items-center gap-3 border-b border-border bg-gradient-to-r from-india-green/5 to-transparent p-5">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-india-green/10 text-india-green"><FileCheck2 className="h-6 w-6" /></span>
            <div><p className="font-display text-lg font-extrabold">Re-upload Documents</p><p className="text-xs text-muted-foreground">{info.name} · {info.application_id}</p></div>
          </div>

          {allDone ? (
            <div className="p-8 text-center">
              <CheckCircle2 className="mx-auto h-14 w-14 text-india-green" />
              <p className="mt-3 font-display text-lg font-extrabold">All documents re-uploaded</p>
              <p className="mt-1 text-sm text-muted-foreground">Your application has been sent back to our QC team for approval. You'll be notified once it's reviewed.</p>
            </div>
          ) : (
            <div className="space-y-4 p-5">
              {info.note && <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"><b>Note from QC:</b> {info.note}</div>}
              <p className="text-sm text-muted-foreground">Please re-upload the document(s) below. Any file format up to 50 MB.</p>
              <div className="space-y-2.5">
                {keys.map((k) => {
                  const isDone = done.includes(k);
                  return (
                    <div key={k} className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 ${isDone ? "border-emerald-200 bg-emerald-50" : "border-border bg-card"}`}>
                      <span className="flex items-center gap-2 font-semibold">{isDone ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Upload className="h-5 w-5 text-india-green" />} {LABEL[k] || k}</span>
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-india-green px-3 h-9 text-sm font-semibold text-white hover:bg-india-green/90">
                        {busyKey === k ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {isDone ? "Replace" : "Upload"}
                        <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && upload(k, e.target.files[0])} />
                      </label>
                    </div>
                  );
                })}
              </div>
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5 text-india-green" /> Secure upload · once all documents are uploaded, your application returns to QC automatically.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
