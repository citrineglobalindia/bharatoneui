import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ShieldCheck, CreditCard, CheckCircle2, XCircle, Search, FileText, Copy, Loader2, RefreshCw, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type RegRow = {
  id: string;
  application_id: string;
  first_name: string;
  surname: string;
  shop_name: string;
  email: string;
  mobile: string;
  status: string;
  payment_verified: boolean;
  qc_verified: boolean;
  payment_amount: number | null;
  payment_utr: string | null;
  pan_doc_path: string | null;
  aadhaar_doc_path: string | null;
  shop_photo_path: string | null;
  selfie_path: string | null;
  payment_screenshot_path: string | null;
  created_at: string;
};

const TABS = ["under_review", "verified", "approved", "rejected"] as const;
const TAB_LABEL: Record<string, string> = {
  under_review: "Pending", verified: "Verified", approved: "Approved", rejected: "Rejected",
};

function statusPill(s: string) {
  const map: Record<string, string> = {
    under_review: "bg-amber-100 text-amber-700",
    verified: "bg-indigo-100 text-indigo-700",
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-rose-100 text-rose-700",
    on_hold: "bg-slate-100 text-slate-700",
  };
  return map[s] ?? "bg-slate-100 text-slate-700";
}

export function RegistrationsReview() {
  const { role } = useAuth();
  const [rows, setRows] = useState<RegRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>("under_review");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [creds, setCreds] = useState<{ username: string; email: string; password: string } | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [detailUrls, setDetailUrls] = useState<Record<string, string>>({});
  const [detailLoading, setDetailLoading] = useState(false);

  const openDetail = async (r: RegRow) => {
    setDetailLoading(true);
    setDetail({ id: r.id });
    try {
      const { data, error } = await supabase.from("retailer_registrations").select("*").eq("id", r.id).maybeSingle();
      if (error || !data) { toast.error("Could not load application"); setDetail(null); return; }
      setDetail(data);
      const fileCols: Record<string, string | null> = {
        pan: data.pan_doc_path, aadhaar: data.aadhaar_doc_path, shop: data.shop_photo_path,
        police: data.police_verification_path, selfie: data.selfie_path,
        video: data.video_kyc_path, payment: data.payment_screenshot_path,
      };
      const urls: Record<string, string> = {};
      for (const [k, path] of Object.entries(fileCols)) {
        if (path) {
          const { data: su } = await supabase.storage.from("retailer-kyc").createSignedUrl(path, 3600);
          if (su?.signedUrl) urls[k] = su.signedUrl;
        }
      }
      setDetailUrls(urls);
    } finally {
      setDetailLoading(false);
    }
  };

  async function load() {
    setLoading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        toast.error("Please sign in with your staff account to view registrations.");
        setRows([]);
        return;
      }
      const { data, error } = await supabase
        .from("retailer_registrations")
        .select("id, application_id, first_name, surname, shop_name, email, mobile, status, payment_verified, qc_verified, payment_amount, payment_utr, pan_doc_path, aadhaar_doc_path, shop_photo_path, selfie_path, payment_screenshot_path, created_at")
        .order("created_at", { ascending: false });
      if (error) toast.error("Failed to load", { description: error.message });
      setRows((data as RegRow[]) ?? []);
    } catch (e) {
      toast.error("Failed to load registrations", { description: e instanceof Error ? e.message : String(e) });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return rows
      .filter((r) => r.status === tab)
      .filter((r) => {
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return (
          r.application_id.toLowerCase().includes(q) ||
          (r.first_name + " " + r.surname).toLowerCase().includes(q) ||
          (r.shop_name ?? "").toLowerCase().includes(q) ||
          (r.mobile ?? "").includes(q) ||
          (r.email ?? "").toLowerCase().includes(q)
        );
      });
  }, [rows, tab, query]);

  async function run(id: string, fn: () => Promise<{ error: { message: string } | null; data?: unknown }>, okMsg: string) {
    setBusy(id);
    try {
      const { error, data } = await fn();
      if (error) { toast.error("Action failed", { description: error.message }); return null; }
      toast.success(okMsg);
      await load();
      return data;
    } finally { setBusy(null); }
  }

  const verifyPayment = (r: RegRow, received: boolean) =>
    run(r.id, () => supabase.rpc("verify_retailer_payment", { reg_id: r.id, received, notes: null }),
      received ? "Payment marked received" : "Payment marked not received");

  const verifyQc = (r: RegRow, verified: boolean) =>
    run(r.id, () => supabase.rpc("verify_retailer_qc", { reg_id: r.id, verified, notes: null }),
      verified ? "Retailer QC verified" : "QC verification cleared");

  const reject = (r: RegRow) => {
    const reason = window.prompt("Reason for rejection?");
    if (!reason) return;
    run(r.id, () => supabase.rpc("reject_retailer_registration", { reg_id: r.id, reason }), "Registration rejected");
  };

  const approve = async (r: RegRow) => {
    const data = await run(r.id, () => supabase.rpc("approve_retailer_registration", { reg_id: r.id }), "Retailer approved");
    if (data) setCreds(data as { username: string; email: string; password: string });
  };

  const viewDocs = async (r: RegRow) => {
    const items: { label: string; path: string }[] = [
      ["PAN", r.pan_doc_path], ["Aadhaar", r.aadhaar_doc_path], ["Shop photo", r.shop_photo_path],
      ["Selfie", r.selfie_path], ["Payment screenshot", r.payment_screenshot_path],
    ].filter(([, p]) => !!p).map(([label, p]) => ({ label: label as string, path: p as string }));
    if (!items.length) { toast.info("No documents uploaded"); return; }
    for (const it of items) {
      const { data } = await supabase.storage.from("retailer-kyc").createSignedUrl(it.path, 3600);
      if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    }
  };

  const canPay = role === "accountant" || role === "admin";
  const canQc = role === "qc" || role === "admin";
  const canApprove = role === "admin";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg px-3 h-9 text-sm font-semibold transition ${tab === t ? "bg-india-green text-white" : "bg-muted text-foreground hover:bg-muted/70"}`}>
            {TAB_LABEL[t]} {rows.filter((r) => r.status === t).length ? `(${rows.filter((r) => r.status === t).length})` : ""}
          </button>
        ))}
        <Button variant="outline" size="sm" className="ml-auto" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 h-9">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by ID, name, shop, mobile, email…"
          className="bg-transparent flex-1 text-sm outline-none placeholder:text-muted-foreground" />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5">Application</th>
              <th className="px-3 py-2.5">Retailer</th>
              <th className="px-3 py-2.5">Amount</th>
              <th className="px-3 py-2.5">Checks</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-3 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">No {TAB_LABEL[tab].toLowerCase()} registrations.</td></tr>
            ) : filtered.map((r) => (
              <tr key={r.id} className="border-t border-border align-top">
                <td className="px-3 py-3">
                  <div className="font-mono text-xs font-semibold">{r.application_id}</div>
                  <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("en-IN")}</div>
                </td>
                <td className="px-3 py-3">
                  <div className="font-semibold">{r.first_name} {r.surname}</div>
                  <div className="text-xs text-muted-foreground">{r.shop_name}</div>
                  <div className="text-xs text-muted-foreground">{r.mobile} · {r.email}</div>
                </td>
                <td className="px-3 py-3">
                  <div className="font-semibold">{r.payment_amount ? `₹${r.payment_amount.toLocaleString("en-IN")}` : "—"}</div>
                  <div className="text-xs text-muted-foreground">{r.payment_utr || ""}</div>
                </td>
                <td className="px-3 py-3">
                  <div className={`flex items-center gap-1 text-xs ${r.payment_verified ? "text-emerald-700" : "text-muted-foreground"}`}>
                    <CreditCard className="h-3.5 w-3.5" /> Payment {r.payment_verified ? "✓" : "—"}
                  </div>
                  <div className={`flex items-center gap-1 text-xs ${r.qc_verified ? "text-emerald-700" : "text-muted-foreground"}`}>
                    <ShieldCheck className="h-3.5 w-3.5" /> QC {r.qc_verified ? "✓" : "—"}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${statusPill(r.status)}`}>{r.status}</span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <Button size="sm" variant="outline" className="h-8" onClick={() => openDetail(r)}>
                      <Eye className="h-3.5 w-3.5" /> View
                    </Button>
                    {canPay && !r.payment_verified && r.status !== "approved" && r.status !== "rejected" && (
                      <Button size="sm" className="h-8 bg-india-green text-white" disabled={busy === r.id} onClick={() => verifyPayment(r, true)}>
                        {busy === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />} Mark Paid
                      </Button>
                    )}
                    {canQc && !r.qc_verified && r.status !== "approved" && r.status !== "rejected" && (
                      <Button size="sm" className="h-8 bg-indigo-600 text-white" disabled={busy === r.id} onClick={() => verifyQc(r, true)}>
                        {busy === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />} QC Verify
                      </Button>
                    )}
                    {canApprove && r.payment_verified && r.qc_verified && r.status !== "approved" && r.status !== "rejected" && (
                      <Button size="sm" className="h-8 bg-saffron-gradient text-white" disabled={busy === r.id} onClick={() => approve(r)}>
                        {busy === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Approve
                      </Button>
                    )}
                    {(canApprove || canQc || canPay) && r.status !== "approved" && r.status !== "rejected" && (
                      <Button size="sm" variant="outline" className="h-8 text-rose-600" disabled={busy === r.id} onClick={() => reject(r)}>
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[88vh] w-[min(900px,95vw)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-india-green" /> Application details
            </DialogTitle>
            <DialogDescription>Full information submitted by the applicant.</DialogDescription>
          </DialogHeader>
          {detailLoading || !detail || !detail.application_id ? (
            <div className="py-12 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>
          ) : (
            <div className="space-y-5 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-display text-lg font-bold">{detail.first_name} {detail.middle_name || ""} {detail.surname}</div>
                  <div className="font-mono text-xs text-muted-foreground">{detail.application_id}{detail.username ? " · " + detail.username : ""}</div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusPill(detail.status)}`}>{detail.status}</span>
              </div>

              <DSection title="Account">
                <DField label="Email" value={detail.email} />
                <DField label="Mobile" value={detail.mobile} />
                <DField label="Email verified" value={detail.email_verified ? "Yes" : "No"} />
                <DField label="Mobile verified" value={detail.mobile_verified ? "Yes" : "No"} />
              </DSection>

              <DSection title="Personal">
                <DField label="First name" value={detail.first_name} />
                <DField label="Middle name" value={detail.middle_name} />
                <DField label="Surname" value={detail.surname} />
                <DField label="Date of birth" value={detail.dob} />
              </DSection>

              <DSection title="Business & Address">
                <DField label="Shop / Business" value={detail.shop_name} />
                <DField label="Address type" value={detail.address_type} />
                <DField label="Building / Shop No" value={detail.building_shop_no} />
                <DField label="Street / Area" value={detail.street_area} />
                <DField label="Ward" value={detail.ward_number} />
                <DField label="Landmark" value={detail.landmark} />
                <DField label="Village" value={detail.village_name} />
                <DField label="Gram Panchayat" value={detail.gram_panchayat} />
                <DField label="Hobli" value={detail.hobli_name} />
                <DField label="Post Office" value={detail.post_office} />
                <DField label="Taluk" value={detail.taluk} />
                <DField label="City" value={detail.city} />
                <DField label="District" value={detail.district} />
                <DField label="State" value={detail.state} />
                <DField label="Pincode" value={detail.pincode} />
                <DField label="Location" value={detail.latitude && detail.longitude ? `${detail.latitude}, ${detail.longitude}` : null} />
              </DSection>

              <DSection title="Bank">
                <DField label="Account holder" value={detail.bank_holder_name} />
                <DField label="Bank" value={detail.bank_name} />
                <DField label="Account number" value={detail.account_number} />
                <DField label="IFSC" value={detail.ifsc} />
                <DField label="Account type" value={detail.account_type} />
              </DSection>

              <DSection title="KYC">
                <DField label="PAN number" value={detail.pan_number} />
                <DField label="Aadhaar number" value={detail.aadhaar_number} />
              </DSection>

              <DSection title="Payment">
                <DField label="Amount" value={detail.payment_amount ? `₹${Number(detail.payment_amount).toLocaleString("en-IN")}` : null} />
                <DField label="UTR" value={detail.payment_utr} />
                <DField label="Method" value={detail.payment_method} />
                <DField label="Paid on" value={detail.payment_paid_on} />
                <DField label="Payer name" value={detail.payer_name} />
                <DField label="Payer bank" value={detail.payer_bank} />
              </DSection>

              <DSection title="Verification">
                <DField label="Payment verified" value={detail.payment_verified ? "Yes" : "No"} />
                <DField label="Payment notes" value={detail.payment_verification_notes} />
                <DField label="QC verified" value={detail.qc_verified ? "Yes" : "No"} />
                <DField label="QC notes" value={detail.qc_notes} />
                <DField label="Declaration agreed" value={detail.declaration_agreed ? "Yes" : "No"} />
              </DSection>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Documents</p>
                <div className="flex flex-wrap gap-2">
                  {[["PAN","pan"],["Aadhaar","aadhaar"],["Shop photo","shop"],["Police verification","police"],["Selfie","selfie"],["Video KYC","video"],["Payment receipt","payment"]].map(([label,key]) => (
                    detailUrls[key as string] ? (
                      <a key={key as string} href={detailUrls[key as string]} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-india-green hover:bg-muted">
                        <FileText className="h-3.5 w-3.5" /> {label}
                      </a>
                    ) : (
                      <span key={key as string} className="inline-flex items-center gap-1 rounded-lg border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground">{label}: —</span>
                    )
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {["selfie","shop","payment"].map((k) => detailUrls[k] ? (
                    <img key={k} src={detailUrls[k]} alt={k} className="h-32 w-full rounded-lg border border-border object-cover" />
                  ) : null)}
                  {detailUrls.video ? (
                    <video key="v" src={detailUrls.video} controls className="h-32 w-full rounded-lg border border-border bg-black object-cover" />
                  ) : null}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetail(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!creds} onOpenChange={(o) => !o && setCreds(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600" /> Retailer approved</DialogTitle>
            <DialogDescription>Share these credentials with the retailer. The password is shown only once.</DialogDescription>
          </DialogHeader>
          {creds && (
            <div className="space-y-2 text-sm">
              {([["Retailer ID", creds.username], ["Email", creds.email], ["Password", creds.password]] as const).map(([label, val]) => (
                <div key={label} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-mono font-semibold">{val}</span>
                  <button className="text-india-green" onClick={() => { navigator.clipboard.writeText(val); toast.success("Copied"); }}>
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setCreds(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">{children}</div>
    </div>
  );
}
function DField({ label, value }: { label: string; value: unknown }) {
  const v = value === null || value === undefined || value === "" ? "—" : String(value);
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate font-medium text-foreground" title={v}>{v}</p>
    </div>
  );
}
