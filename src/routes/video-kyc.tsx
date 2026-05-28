import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  FileCheck2,
  IdCard,
  Landmark,
  ScrollText,
  Building2,
  Camera,
  Video,
  Upload,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Eye,
  Download,
  ShieldCheck,
  XCircle,
  Sparkles,
  Lock,
  type LucideIcon,
} from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { StatCard } from "@/components/retailer/stat-card";
import { SectionCard } from "@/components/retailer/section-card";

export const Route = createFileRoute("/video-kyc")({
  head: () => ({
    meta: [
      { title: "KYC Documents — BharatOne" },
      { name: "description", content: "Manage retailer KYC documents, selfie, and Video KYC." },
    ],
  }),
  component: KycDocsPage,
});

type Status = "Verified" | "In Review" | "Pending" | "Rejected";

type Doc = {
  id: string;
  label: string;
  description: string;
  category: "Identity" | "Address" | "Business" | "Bank" | "Biometric";
  icon: LucideIcon;
  status: Status;
  required: boolean;
  number?: string;
  file?: string;
  uploadedAt?: string;
  expiresAt?: string;
  rejectionReason?: string;
};

const SEED: Doc[] = [
  {
    id: "aadhaar",
    label: "Aadhaar Card",
    description: "Front & back · masked first 8 digits",
    category: "Identity",
    icon: IdCard,
    status: "Verified",
    required: true,
    number: "XXXX XXXX 4892",
    file: "aadhaar_front_back.pdf",
    uploadedAt: "12 Feb 2026",
  },
  {
    id: "pan",
    label: "PAN Card",
    description: "Permanent Account Number issued by Income Tax",
    category: "Identity",
    icon: IdCard,
    status: "Verified",
    required: true,
    number: "AXBPH•••7K",
    file: "pan_card.jpg",
    uploadedAt: "12 Feb 2026",
  },
  {
    id: "selfie",
    label: "Live Selfie",
    description: "Face match against Aadhaar photo · liveness checked",
    category: "Biometric",
    icon: Camera,
    status: "Verified",
    required: true,
    file: "selfie_2026-02-12.jpg",
    uploadedAt: "12 Feb 2026",
  },
  {
    id: "video-kyc",
    label: "Video KYC",
    description: "15s declaration video with Aadhaar/PAN held in hand",
    category: "Biometric",
    icon: Video,
    status: "In Review",
    required: true,
    file: "video_kyc_2026-05-26.mp4",
    uploadedAt: "26 May 2026",
  },
  {
    id: "address",
    label: "Address Proof",
    description: "Voter ID / Driving License / Utility bill (< 3 months)",
    category: "Address",
    icon: ScrollText,
    status: "Verified",
    required: true,
    file: "electricity_bill_apr.pdf",
    uploadedAt: "12 Feb 2026",
  },
  {
    id: "shop",
    label: "Shop / Premises Photo",
    description: "Geo-tagged photo of shop front with signboard",
    category: "Business",
    icon: Building2,
    status: "Verified",
    required: true,
    file: "shop_front_geo.jpg",
    uploadedAt: "13 Feb 2026",
  },
  {
    id: "gst",
    label: "GSTIN Certificate",
    description: "GST registration certificate (if applicable)",
    category: "Business",
    icon: FileCheck2,
    status: "Pending",
    required: false,
  },
  {
    id: "bank",
    label: "Bank Proof",
    description: "Cancelled cheque or first page of passbook",
    category: "Bank",
    icon: Landmark,
    status: "Rejected",
    required: true,
    file: "cheque_sbi.jpg",
    uploadedAt: "20 May 2026",
    rejectionReason: "Account holder name does not match Aadhaar. Re-upload clear copy.",
  },
];

const STATUS_STYLE: Record<Status, { chip: string; ring: string; dot: string; icon: LucideIcon }> = {
  Verified: { chip: "bg-emerald-100 text-emerald-700 border-emerald-200", ring: "ring-emerald-200", dot: "bg-emerald-500", icon: CheckCircle2 },
  "In Review": { chip: "bg-sky-100 text-sky-700 border-sky-200", ring: "ring-sky-200", dot: "bg-sky-500", icon: Clock },
  Pending: { chip: "bg-amber-100 text-amber-800 border-amber-200", ring: "ring-amber-200", dot: "bg-amber-500", icon: Upload },
  Rejected: { chip: "bg-rose-100 text-rose-700 border-rose-200", ring: "ring-rose-200", dot: "bg-rose-500", icon: XCircle },
};

const FILTERS = ["All", "Identity", "Address", "Business", "Bank", "Biometric"] as const;

function KycDocsPage() {
  const [docs, setDocs] = useState<Doc[]>(SEED);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  const counts = useMemo(() => {
    const verified = docs.filter((d) => d.status === "Verified").length;
    const pending = docs.filter((d) => d.status === "Pending").length;
    const review = docs.filter((d) => d.status === "In Review").length;
    const rejected = docs.filter((d) => d.status === "Rejected").length;
    const required = docs.filter((d) => d.required).length;
    const completedRequired = docs.filter((d) => d.required && d.status === "Verified").length;
    const pct = Math.round((completedRequired / required) * 100);
    return { verified, pending, review, rejected, required, completedRequired, pct };
  }, [docs]);

  const visible = docs.filter((d) => filter === "All" || d.category === filter);

  function markUploaded(id: string) {
    setDocs((xs) => xs.map((d) => (d.id === id ? { ...d, status: "In Review", file: `${id}_upload.pdf`, uploadedAt: "Just now", rejectionReason: undefined } : d)));
    toast.success("Document uploaded · sent for review");
  }

  function reupload(id: string) {
    markUploaded(id);
  }

  return (
    <RetailerShell>
      <div className="space-y-5">
        <PageHeader
          icon={<FileCheck2 className="h-5 w-5" />}
          title="KYC Documents"
          subtitle="Identity, address, business and biometric verification for your retailer account"
          badge={
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-0.5 text-[11px] font-semibold">
              <ShieldCheck className="h-3 w-3" /> RBI / UIDAI compliant
            </span>
          }
          actions={
            <button
              onClick={() => toast.success("KYC pack downloaded")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-muted"
            >
              <Download className="h-3.5 w-3.5" /> Download KYC Pack
            </button>
          }
        />

        {/* Progress hero */}
        <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-saffron/10 blur-3xl" />
          <div className="relative grid lg:grid-cols-[1fr_auto] gap-5 items-center">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-saffron" />
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">KYC Completion</p>
              </div>
              <p className="mt-1 font-display text-3xl font-extrabold">
                {counts.completedRequired}<span className="text-muted-foreground">/{counts.required}</span> required documents verified
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {counts.rejected > 0
                  ? `${counts.rejected} document needs your attention.`
                  : counts.review > 0
                  ? `${counts.review} document under review — usually approved within 2 hours.`
                  : "Great! Your retailer KYC is fully compliant."}
              </p>

              <div className="mt-4 h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-saffron-gradient transition-all duration-700"
                  style={{ width: `${counts.pct}%` }}
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-[11px] font-semibold text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> {counts.verified} Verified</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sky-500" /> {counts.review} In Review</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /> {counts.pending} Pending</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-500" /> {counts.rejected} Rejected</span>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <RingProgress value={counts.pct} />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Identity" value="2/2" icon={<IdCard className="h-5 w-5" />} tone="green" />
          <StatCard label="Address" value="1/1" icon={<ScrollText className="h-5 w-5" />} tone="sky" />
          <StatCard label="Business" value="1/2" icon={<Building2 className="h-5 w-5" />} tone="violet" />
          <StatCard label="Biometric" value="1/2" icon={<Camera className="h-5 w-5" />} tone="rose" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                filter === f
                  ? "bg-saffron-gradient text-white border-transparent"
                  : "bg-card border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Documents grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {visible.map((doc) => (
            <DocCard key={doc.id} doc={doc} onUpload={() => markUploaded(doc.id)} onReupload={() => reupload(doc.id)} />
          ))}
        </div>

        {/* Footer note */}
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3">
          <Lock className="h-5 w-5 text-emerald-700 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-emerald-900">Bank-grade encryption</p>
            <p className="text-xs text-emerald-900/80 mt-0.5">
              All documents are encrypted at rest using AES-256 and stored in audited Indian data centres in line with RBI, UIDAI and PMLA guidelines. Only verified compliance officers can access your records.
            </p>
          </div>
        </section>
      </div>
    </RetailerShell>
  );
}

function DocCard({ doc, onUpload, onReupload }: { doc: Doc; onUpload: () => void; onReupload: () => void }) {
  const S = STATUS_STYLE[doc.status];
  const Icon = doc.icon;
  return (
    <article className={`group relative overflow-hidden rounded-2xl border border-border bg-card shadow-soft hover:shadow-elev transition`}>
      <div className={`absolute inset-x-0 top-0 h-1 ${S.dot}`} />
      <div className="p-4 flex gap-4">
        <div className={`h-12 w-12 shrink-0 rounded-xl bg-saffron/10 text-saffron flex items-center justify-center ring-4 ${S.ring}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm truncate">{doc.label}</h3>
                {doc.required && <span className="text-[10px] font-bold text-rose-600">REQUIRED</span>}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{doc.description}</p>
            </div>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${S.chip}`}>
              <S.icon className="h-3 w-3" /> {doc.status}
            </span>
          </div>

          {doc.number && (
            <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-mono bg-muted px-2 py-0.5 rounded">
              {doc.number}
            </p>
          )}

          {doc.file ? (
            <div className="mt-3 rounded-lg border border-border bg-muted/30 p-2.5 flex items-center gap-2">
              <div className="h-8 w-8 rounded-md bg-saffron-gradient text-white text-[10px] font-bold flex items-center justify-center">
                {doc.file.split(".").pop()?.toUpperCase().slice(0, 3)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate">{doc.file}</p>
                <p className="text-[10px] text-muted-foreground">Uploaded {doc.uploadedAt}</p>
              </div>
              <button className="h-7 w-7 rounded-md hover:bg-muted flex items-center justify-center" title="Preview">
                <Eye className="h-3.5 w-3.5" />
              </button>
              <button className="h-7 w-7 rounded-md hover:bg-muted flex items-center justify-center" title="Download">
                <Download className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="mt-3 rounded-lg border border-dashed border-border bg-muted/20 p-3 text-center">
              <Upload className="h-4 w-4 mx-auto text-muted-foreground" />
              <p className="text-[11px] text-muted-foreground mt-1">No file uploaded yet</p>
            </div>
          )}

          {doc.status === "Rejected" && doc.rejectionReason && (
            <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 p-2 flex gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-rose-700 mt-0.5 shrink-0" />
              <p className="text-[11px] text-rose-900">{doc.rejectionReason}</p>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {doc.status === "Pending" && (
              <button
                onClick={onUpload}
                className="inline-flex items-center gap-1.5 rounded-lg bg-saffron-gradient text-white px-3 py-1.5 text-xs font-semibold shadow-elev hover:scale-[1.02] transition"
              >
                <Upload className="h-3.5 w-3.5" /> {doc.id === "video-kyc" ? "Record Video" : doc.id === "selfie" ? "Capture Selfie" : "Upload"}
              </button>
            )}
            {doc.status === "Rejected" && (
              <button
                onClick={onReupload}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-rose-700"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Re-upload
              </button>
            )}
            {doc.status === "In Review" && (
              <span className="text-[11px] text-sky-700 font-semibold inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Auto-verifying… usually under 2 hrs
              </span>
            )}
            {doc.status === "Verified" && (
              <span className="text-[11px] text-emerald-700 font-semibold inline-flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Verified by BharatOne Compliance
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function RingProgress({ value }: { value: number }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const off = c - (c * value) / 100;
  return (
    <div className="relative h-32 w-32">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} className="fill-none stroke-muted" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={r}
          className="fill-none"
          stroke="url(#kyc-grad)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
        />
        <defs>
          <linearGradient id="kyc-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FF7A00" />
            <stop offset="100%" stopColor="#FF3D7F" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-extrabold">{value}%</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Complete</span>
      </div>
    </div>
  );
}