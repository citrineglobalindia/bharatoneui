import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  FileCheck2, IdCard, Camera, Video, CheckCircle2, Clock, AlertTriangle, ShieldCheck, XCircle,
  Building2, FileText, Eye, Loader2, Landmark, type LucideIcon,
} from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { StatCard } from "@/components/retailer/stat-card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/video-kyc")({
  head: () => ({
    meta: [
      { title: "KYC Documents — BharatOne" },
      { name: "description", content: "View your submitted KYC documents and verification status." },
    ],
  }),
  component: KycDocsPage,
});

type DocDef = { key: string; pathKey: string; label: string; description: string; icon: LucideIcon };
const DOC_DEFS: DocDef[] = [
  { key: "aadhaar", pathKey: "aadhaar_doc_path", label: "Aadhaar Card", description: "Identity proof", icon: IdCard },
  { key: "pan", pathKey: "pan_doc_path", label: "PAN Card", description: "Permanent Account Number", icon: IdCard },
  { key: "selfie", pathKey: "selfie_path", label: "Live Selfie", description: "Face match & liveness", icon: Camera },
  { key: "video", pathKey: "video_kyc_path", label: "Video KYC", description: "Declaration video", icon: Video },
  { key: "shop", pathKey: "shop_photo_path", label: "Shop / Premises Photo", description: "Geo-tagged shop front", icon: Building2 },
  { key: "police", pathKey: "police_verification_path", label: "Police Verification", description: "Verification certificate", icon: ShieldCheck },
];

type Reg = Record<string, any> | null;

const kindOf = (path?: string | null) => {
  if (!path) return "none";
  const e = path.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(e)) return "image";
  if (["mp4", "webm", "mov", "ogg"].includes(e)) return "video";
  if (e === "pdf") return "pdf";
  return "file";
};

function statusFor(docStatus: string | undefined, regStatus: string) {
  if (docStatus === "approved") return { label: "Verified", tone: "ok" as const };
  if (docStatus === "rejected") return { label: "Rejected", tone: "bad" as const };
  if (regStatus === "approved") return { label: "Verified", tone: "ok" as const };
  if (["qc_review", "accountant_review"].includes(regStatus)) return { label: "In Review", tone: "info" as const };
  if (["telecaller", "rejected"].includes(regStatus)) return { label: "Needs attention", tone: "warn" as const };
  return { label: "Pending", tone: "muted" as const };
}
const TONE: Record<string, string> = {
  ok: "bg-emerald-100 text-emerald-700", bad: "bg-rose-100 text-rose-700",
  info: "bg-sky-100 text-sky-700", warn: "bg-amber-100 text-amber-700", muted: "bg-slate-100 text-slate-600",
};

function KycDocsPage() {
  const [reg, setReg] = useState<Reg>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let on = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) { if (on) setLoading(false); return; }
      const { data } = await supabase.from("retailer_registrations").select("*").eq("auth_user_id", u.user.id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!on) return;
      setReg(data as Reg);
      if (data) {
        const map: Record<string, string> = {};
        await Promise.all(DOC_DEFS.map(async (d) => {
          const p = (data as any)[d.pathKey];
          if (!p) return;
          const { data: su } = await supabase.storage.from("retailer-kyc").createSignedUrl(p, 3600);
          if (su?.signedUrl) map[d.key] = su.signedUrl;
        }));
        if (on) setUrls(map);
      }
      setLoading(false);
    })();
    return () => { on = false; };
  }, []);

  const docReviews: Record<string, any> = (reg as any)?.doc_reviews || {};
  const regStatus: string = (reg as any)?.status || "";
  const present = DOC_DEFS.filter((d) => !!(reg as any)?.[d.pathKey]);
  const verified = present.filter((d) => statusFor(docReviews[d.key]?.status, regStatus).label === "Verified").length;
  const pending = present.length - verified;

  return (
    <RetailerShell>
      <div className="space-y-5">
        <PageHeader icon={<FileCheck2 className="h-5 w-5" />} title="KYC Documents" subtitle="The documents you submitted during registration and their verification status." />

        {loading ? (
          <div className="grid place-items-center rounded-2xl border border-border bg-card p-12 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : !reg ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <FileCheck2 className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-bold">No registration found for this account</p>
            <p className="mt-1 text-sm text-muted-foreground">Your KYC documents appear here once your registration is on file.</p>
          </div>
        ) : (
          <>
            {/* Overall status */}
            <div className={`flex flex-wrap items-center gap-3 rounded-2xl border p-4 ${regStatus === "approved" ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
              <span className={`grid h-11 w-11 place-items-center rounded-xl ${regStatus === "approved" ? "bg-emerald-200/70 text-emerald-700" : "bg-amber-200/70 text-amber-700"}`}>
                {regStatus === "approved" ? <CheckCircle2 className="h-5 w-5" /> : regStatus === "rejected" ? <XCircle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
              </span>
              <div className="min-w-0">
                <p className="font-bold text-foreground">
                  {regStatus === "approved" ? "KYC Verified" : regStatus === "rejected" ? "KYC Rejected" : "KYC Under Review"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Application {(reg as any).application_id} · {present.length} documents submitted · {verified} verified{pending ? ` · ${pending} pending` : ""}
                </p>
              </div>
              <span className={`ml-auto rounded-full px-3 py-1 text-xs font-bold ${regStatus === "approved" ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"}`}>
                {(regStatus || "pending").replace(/_/g, " ").toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label="Submitted" value={String(present.length)} icon={<FileText className="h-5 w-5" />} tone="sky" />
              <StatCard label="Verified" value={String(verified)} icon={<CheckCircle2 className="h-5 w-5" />} tone="green" />
              <StatCard label="Pending" value={String(pending)} icon={<Clock className="h-5 w-5" />} tone="saffron" />
              <StatCard label="Account" value={(reg as any).status === "approved" ? "Active" : "Pending"} icon={<ShieldCheck className="h-5 w-5" />} tone="violet" />
            </div>

            {/* Document grid */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {DOC_DEFS.map((d) => {
                const path = (reg as any)[d.pathKey];
                const url = urls[d.key];
                const kind = kindOf(path);
                const st = statusFor(docReviews[d.key]?.status, regStatus);
                const Icon = d.icon;
                return (
                  <div key={d.key} className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
                    <div className="relative grid h-40 place-items-center bg-muted/40">
                      {!path ? (
                        <div className="flex flex-col items-center gap-1 text-muted-foreground"><AlertTriangle className="h-7 w-7" /><span className="text-xs">Not submitted</span></div>
                      ) : kind === "image" && url ? (
                        <img src={url} alt={d.label} className="h-full w-full object-cover" />
                      ) : kind === "video" && url ? (
                        <video src={url} className="h-full w-full object-cover" muted />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-muted-foreground"><FileText className="h-9 w-9" /><span className="text-xs uppercase">{kind}</span></div>
                      )}
                      <span className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${TONE[st.tone]}`}>{st.label}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 p-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-india-green/10 text-india-green"><Icon className="h-4 w-4" /></span>
                        <div className="min-w-0"><p className="truncate text-sm font-bold">{d.label}</p><p className="truncate text-[11px] text-muted-foreground">{d.description}</p></div>
                      </div>
                      {url && <a href={url} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-2.5 h-8 text-[11px] font-semibold text-india-green hover:bg-muted"><Eye className="h-3.5 w-3.5" /> View</a>}
                    </div>
                    {docReviews[d.key]?.notes && <p className="border-t border-border px-3 py-2 text-[11px] text-rose-600">Note: {docReviews[d.key].notes}</p>}
                  </div>
                );
              })}
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
              Need to update a document? Please contact support and our team will re-open your KYC.
              <Link to="/support" className="ml-1 font-semibold text-india-green hover:underline">Go to Support →</Link>
            </div>
          </>
        )}
      </div>
    </RetailerShell>
  );
}
