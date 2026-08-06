import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ClipboardList, Loader2, Upload, ShieldCheck, RefreshCw, Maximize2, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

/**
 * The planning and status board, now served from a private bucket.
 *
 * It used to sit at /status/index.html — a 13 MB static file with 122 embedded
 * screenshots of every internal portal, handed out by the CDN to anyone who
 * requested the URL. It carried a sign-in box, but the box only hid a <div>:
 * unlock() in the console opened it, the password hash it compared against was
 * printed a few lines above in the same file, and the entire contents had
 * already been delivered to the browser before any of that ran.
 *
 * No amount of JavaScript inside a file can protect that file. So the file
 * moved into a bucket whose read policy is private.is_admin(), the check now
 * happens on the server before any bytes are sent, and because admin access
 * requires the second factor, the board inherits MFA without needing its own
 * idea of a login.
 *
 * Rendered in a sandboxed iframe from a blob: the board runs its own scripts to
 * pull live health figures, but a sandboxed frame gets an opaque origin, so it
 * cannot reach this page's session token.
 */

const BUCKET = "internal-board";
const OBJECT = "status-board.html";

export function StatusBoard() {
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [err, setErr] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    setState("loading"); setErr(null);
    // Listing first: a missing board and a refused download are different
    // problems and deserve different screens.
    const { data: listed, error: listErr } = await supabase.storage.from(BUCKET).list("", { search: OBJECT });
    if (listErr) { setErr(listErr.message); setState("error"); return; }
    const found = (listed ?? []).find((f) => f.name === OBJECT);
    if (!found) { setState("missing"); return; }
    setUpdatedAt((found as any).updated_at ?? (found as any).created_at ?? null);

    const { data, error } = await supabase.storage.from(BUCKET).download(OBJECT);
    if (error || !data) { setErr(error?.message ?? "Could not download the board"); setState("error"); return; }
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const blobUrl = URL.createObjectURL(new Blob([data], { type: "text/html" }));
    urlRef.current = blobUrl;
    setUrl(blobUrl);
    setState("ready");
  }, []);

  useEffect(() => {
    void load();
    return () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); };
  }, [load]);

  const upload = async (file: File) => {
    if (!/\.html?$/i.test(file.name)) { toast.error("That is not an HTML file"); return; }
    setUploading(true);
    setProgress(`Uploading ${(file.size / 1024 / 1024).toFixed(1)} MB…`);
    try {
      const { error } = await supabase.storage.from(BUCKET).upload(OBJECT, file, {
        upsert: true, contentType: "text/html", cacheControl: "60",
      });
      if (error) { toast.error("Upload failed", { description: error.message }); return; }
      toast.success("Status board updated");
      await load();
    } finally { setUploading(false); setProgress(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold">
            <ClipboardList className="h-5 w-5 text-india-green" /> Planning &amp; Status Board
          </h2>
          <p className="text-sm text-muted-foreground">
            Private to administrators. Served from storage, not from the public site.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={state === "loading"}>
            <RefreshCw className={`h-4 w-4 ${state === "loading" ? "animate-spin" : ""}`} /> Reload
          </Button>
          {url && (
            <Button variant="outline" size="sm" onClick={() => window.open(url, "_blank", "noopener")}>
              <Maximize2 className="h-4 w-4" /> Open full screen
            </Button>
          )}
          <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}
            className="bg-india-green text-white hover:bg-india-green/90">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {state === "missing" ? "Upload the board" : "Replace"}
          </Button>
          <input ref={fileRef} type="file" accept=".html,text/html" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} />
        </div>
      </div>

      <p className="flex items-center gap-1.5 rounded-xl bg-india-green/5 px-3 py-2 text-[11px] font-semibold text-india-green">
        <ShieldCheck className="h-3.5 w-3.5" />
        Only administrators who have entered their two-factor code can load this page.
        {updatedAt && <span className="font-normal text-muted-foreground"> · updated {new Date(updatedAt).toLocaleString("en-IN")}</span>}
      </p>

      {progress && <p className="text-xs text-muted-foreground">{progress}</p>}

      {state === "loading" && (
        <div className="grid h-72 place-items-center rounded-2xl border border-border bg-card">
          <div className="text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-india-green" />
            <p className="mt-2 text-xs text-muted-foreground">Fetching the board…</p>
          </div>
        </div>
      )}

      {state === "missing" && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-bold">The board has not been uploaded yet</p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
            It now lives in a private bucket rather than on the public website. Upload
            <code className="mx-1 rounded bg-muted px-1 py-0.5 font-mono">internal/status-board.html</code>
            from the project folder once, and it will appear here for administrators only.
          </p>
          <Button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="mt-4 bg-india-green text-white hover:bg-india-green/90">
            <Upload className="h-4 w-4" /> Choose the file
          </Button>
        </div>
      )}

      {state === "error" && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
          <p className="flex items-center gap-2 text-sm font-bold text-rose-700">
            <AlertTriangle className="h-4 w-4" /> Could not load the board
          </p>
          <p className="mt-1 text-xs text-rose-700">{err}</p>
          <p className="mt-2 text-[11px] text-rose-700/80">
            If this says the request was denied, check that you signed in as an administrator
            and completed the two-factor step this session.
          </p>
        </div>
      )}

      {state === "ready" && url && (
        <iframe
          title="BharatOne planning and status board"
          src={url}
          // allow-scripts without allow-same-origin: the board runs its own code
          // to fetch live health figures, but in an opaque origin, so it cannot
          // read this page's storage or session.
          sandbox="allow-scripts allow-popups"
          className="h-[80vh] w-full rounded-2xl border border-border bg-white"
        />
      )}
    </div>
  );
}
