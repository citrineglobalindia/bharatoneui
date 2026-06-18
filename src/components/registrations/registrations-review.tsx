import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ShieldCheck, CreditCard, CheckCircle2, Pencil, UserPlus, XCircle, Search, FileText, Copy, Loader2, RefreshCw, Eye, User, Building2, Landmark, Maximize2, X, ExternalLink, FileSearch, Banknote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession, withTimeout } from "@/integrations/supabase/ensure-session";
import { useAuth } from "@/hooks/use-auth";

export type RegRow = {
  id: string;
  application_id: string;
  registration_type: string;
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

const TABS = ["accountant_review", "qc_review", "telecaller", "approved", "rejected"] as const;
const TAB_LABEL: Record<string, string> = {
  accountant_review: "Accountant", qc_review: "QC", telecaller: "Telecaller", approved: "Approved", rejected: "Rejected",
};
const PRIMARY_TAB: Record<string, string> = {
  accountant: "accountant_review", qc: "qc_review", telecaller: "telecaller", admin: "accountant_review",
};

function typeLabel(t?: string) {
  if (t === "old") return "Old JSKO";
  if (t === "distributor") return "Distributor";
  return "Retailer";
}
function typeBadge(t?: string) {
  if (t === "old") return "bg-amber-100 text-amber-700";
  if (t === "distributor") return "bg-violet-100 text-violet-700";
  return "bg-emerald-100 text-emerald-700";
}
function statusPill(s: string) {
  const map: Record<string, string> = {
    accountant_review: "bg-amber-100 text-amber-700",
    qc_review: "bg-indigo-100 text-indigo-700",
    telecaller: "bg-orange-100 text-orange-700",
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-rose-100 text-rose-700",
    on_hold: "bg-slate-100 text-slate-700",
  };
  return map[s] ?? "bg-slate-100 text-slate-700";
}

export function RegistrationsReview() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<RegRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>("accountant_review");
  const [typeFilter, setTypeFilter] = useState<"all" | "new" | "old" | "distributor">("all");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [creds, setCreds] = useState<{ username: string; email: string; password: string } | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [detailUrls, setDetailUrls] = useState<Record<string, string>>({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [lightbox, setLightbox] = useState<{ url: string; kind: string; label: string } | null>(null);

  const startEdit = () => {
    setEditForm({
      first_name: detail.first_name ?? "", middle_name: detail.middle_name ?? "", surname: detail.surname ?? "",
      shop_name: detail.shop_name ?? "", email: detail.email ?? "", mobile: detail.mobile ?? "",
      payment_amount: detail.payment_amount ?? "", payment_utr: detail.payment_utr ?? "",
    });
    setEditMode(true);
  };
  const saveEdit = async () => {
    setSavingEdit(true);
    try {
      const payload: any = { ...editForm, payment_amount: editForm.payment_amount === "" ? null : Number(editForm.payment_amount) };
      const { error } = await supabase.from("retailer_registrations").update(payload).eq("id", detail.id);
      if (error) { toast.error("Save failed", { description: error.message }); return; }
      toast.success("Registration updated");
      setDetail((d: any) => ({ ...d, ...payload }));
      setEditMode(false); load();
    } finally { setSavingEdit(false); }
  };

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
      const { data, error } = await withTimeout(
        supabase
          .from("retailer_registrations")
          .select("id, application_id, registration_type, first_name, surname, shop_name, email, mobile, status, payment_verified, qc_verified, payment_amount, payment_utr, pan_doc_path, aadhaar_doc_path, shop_photo_path, selfie_path, payment_screenshot_path, created_at")
          .order("created_at", { ascending: false }),
      );
      if (error) {
        toast.error("Couldn't load registrations", {
          description: error.message.includes("JWT") || error.message.includes("auth")
            ? "Your session expired — please sign in again."
            : error.message,
        });
        setRows([]);
      } else {
        setRows((data as RegRow[]) ?? []);
      }
    } catch (e) {
      toast.error("Couldn't load registrations", { description: e instanceof Error ? e.message : String(e) });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); ensureStaffSession().then((ok) => { if (ok) load(); }); }, []);
  useEffect(() => { if (role && PRIMARY_TAB[role]) setTab(PRIMARY_TAB[role]); }, [role]);

  const filtered = useMemo(() => {
    return rows
      .filter((r) => r.status === tab)
      .filter((r) => !(role === "qc" && r.status === "accountant_review"))
      .filter((r) => typeFilter === "all" ? true : (r.registration_type || "new") === typeFilter)
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
  }, [rows, tab, query, typeFilter]);

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

  const acctApprove = (r: RegRow) =>
    run(r.id, () => supabase.rpc("verify_retailer_payment", { reg_id: r.id, received: true, notes: null }),
      "Payment verified — forwarded to QC");
  const acctReject = (r: RegRow) => {
    const reason = window.prompt("Reason for rejection (will be sent to Telecaller):");
    if (reason === null) return;
    run(r.id, () => supabase.rpc("verify_retailer_payment", { reg_id: r.id, received: false, notes: reason || "Payment not received" }),
      "Sent to Telecaller for follow-up");
  };
  const qcApprove = async (r: RegRow) => {
    const data = await run(r.id, () => supabase.rpc("verify_retailer_qc", { reg_id: r.id, verified: true, notes: null }),
      "Verified — retailer login created");
    if (data) setCreds(data as { username: string; email: string; password: string });
  };
  const qcReject = (r: RegRow) => {
    const reason = window.prompt("Reason for QC rejection (will be sent to Telecaller):");
    if (reason === null) return;
    run(r.id, () => supabase.rpc("verify_retailer_qc", { reg_id: r.id, verified: false, notes: reason || "Rejected by QC" }),
      "Sent to Telecaller for follow-up");
  };
  const reroute = (r: RegRow) =>
    run(r.id, () => supabase.rpc("route_to_accountant", { reg_id: r.id, notes: null }), "Re-sent to Accountant");

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

  const canAccountant = role === "accountant" || role === "admin";
  const canQc = role === "qc" || role === "admin";
  const canTele = role === "telecaller" || role === "admin";
  const visibleTabs = role === "qc" ? TABS.filter((t) => t !== "accountant_review")
    : role === "accountant" ? TABS.filter((t) => t !== "qc_review" && t !== "telecaller")
    : role === "telecaller" ? (["telecaller", "rejected"] as unknown as typeof TABS)
    : TABS;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {visibleTabs.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg px-3 h-9 text-sm font-semibold transition ${tab === t ? "bg-india-green text-white" : "bg-muted text-foreground hover:bg-muted/70"}`}>
            {TAB_LABEL[t]} {rows.filter((r) => r.status === t).length ? `(${rows.filter((r) => r.status === t).length})` : ""}
          </button>
        ))}
        <Button variant="outline" size="sm" className="ml-auto" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Type:</span>
        {([["all","All"],["new","Retailer"],["old","Old JSKO"],["distributor","Distributor"]] as [string,string][]).map(([k,label]) => (
          <button key={k} onClick={() => setTypeFilter(k as any)}
            className={`rounded-full px-3 h-7 text-xs font-semibold transition ${typeFilter === k ? "bg-saffron-gradient text-white" : "border border-border bg-card text-foreground hover:bg-muted"}`}>
            {label} {k !== "all" && rows.filter((r) => (r.registration_type || "new") === k).length ? `(${rows.filter((r) => (r.registration_type || "new") === k).length})` : ""}
          </button>
        ))}
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
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${typeBadge(r.registration_type)}`}>{typeLabel(r.registration_type)}</span>
                  <div className="mt-1 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("en-IN")}</div>
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
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${statusPill(r.status)}`}>{r.status.replace("_", " ")}</span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <Button size="sm" variant="outline" className="h-8" onClick={() => navigate({ to: "/review/$id", params: { id: r.id } })}>
                      <Eye className="h-3.5 w-3.5" /> View
                    </Button>
                    {(role === "admin" || canQc) && ["approved", "rejected", "telecaller"].includes(r.status) && (
                      <Button size="sm" variant="outline" className="h-8 text-indigo-600" disabled={busy === r.id} onClick={async () => { setBusy(r.id); const { error } = await supabase.rpc("resend_to_qc", { reg_id: r.id, notes: null }); setBusy(null); if (error) { toast.error(error.message); return; } toast.success("Sent for re-QC"); load(); }}>
                        {busy === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Re-QC
                      </Button>
                    )}
                    {role === "admin" && <>
                      <Button size="sm" variant="outline" className="h-8 text-india-green" onClick={() => { try { localStorage.setItem("bharatone:review-intent", "edit"); } catch {} navigate({ to: "/review/$id", params: { id: r.id } }); }}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" className="h-8" onClick={() => { try { localStorage.setItem("bharatone:review-intent", "assign"); } catch {} navigate({ to: "/review/$id", params: { id: r.id } }); }}>
                        <UserPlus className="h-3.5 w-3.5" /> Assign
                      </Button>
                    </>}
                    {r.status === "accountant_review" && canAccountant && (
                      <>
                        <Button size="sm" className="h-8 bg-india-green text-white" disabled={busy === r.id} onClick={() => acctApprove(r)}>
                          {busy === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />} Approve
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 text-rose-600" disabled={busy === r.id} onClick={() => acctReject(r)}>
                          <XCircle className="h-3.5 w-3.5" /> Reject
                        </Button>
                      </>
                    )}
                    {r.status === "qc_review" && canQc && (
                      <>
                        <Button size="sm" className="h-8 bg-saffron-gradient text-white" disabled={busy === r.id} onClick={() => qcApprove(r)}>
                          {busy === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Verify & Approve
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 text-rose-600" disabled={busy === r.id} onClick={() => qcReject(r)}>
                          <XCircle className="h-3.5 w-3.5" /> Reject
                        </Button>
                      </>
                    )}
                    {r.status === "telecaller" && canTele && (
                      <Button size="sm" className="h-8 bg-indigo-600 text-white" disabled={busy === r.id} onClick={() => reroute(r)}>
                        {busy === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Re-send to Accountant
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && (setDetail(null), setEditMode(false))}>
        <DialogContent className="max-h-[92vh] w-[min(980px,96vw)] overflow-y-auto p-0">
          {detailLoading || !detail || !detail.application_id ? (
            <div className="py-20 text-center text-muted-foreground"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>
          ) : (
            <>
              {/* Header banner */}
              <div className="relative overflow-hidden rounded-t-lg bg-gradient-to-r from-orange-50 via-white to-emerald-50 px-6 pb-5 pt-6">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-saffron-gradient text-lg font-extrabold text-white shadow-elev">
                    {(detail.first_name?.[0] ?? "") + (detail.surname?.[0] ?? "")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-xl font-extrabold leading-tight">{detail.first_name} {detail.middle_name || ""} {detail.surname}</h2>
                    <p className="font-mono text-xs text-muted-foreground">{detail.application_id}{detail.username ? " · " + detail.username : ""} · {detail.shop_name}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${typeBadge(detail.registration_type)}`}>{typeLabel(detail.registration_type)}</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusPill(detail.status)}`}>{detail.status.replace("_", " ")}</span>
                    {role === "admin" && !editMode && <button onClick={startEdit} className="mt-1 inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1 text-xs font-semibold hover:bg-muted"><Pencil className="h-3.5 w-3.5" /> Edit details</button>}
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-border bg-white/70 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Amount</p>
                    <p className="font-display text-base font-extrabold">{detail.payment_amount ? `₹${Number(detail.payment_amount).toLocaleString("en-IN")}` : "—"}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-white/70 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Payment</p>
                    <p className={`text-sm font-bold ${detail.payment_verified ? "text-emerald-600" : "text-amber-600"}`}>{detail.payment_verified ? "Verified" : "Pending"}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-white/70 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">QC</p>
                    <p className={`text-sm font-bold ${detail.qc_verified ? "text-emerald-600" : "text-amber-600"}`}>{detail.qc_verified ? "Verified" : "Pending"}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 px-6 py-5">
                {role === "admin" && editMode && (
                  <div className="rounded-xl border-2 border-india-green/30 bg-india-green/5 p-4">
                    <p className="mb-3 flex items-center gap-2 text-sm font-bold"><Pencil className="h-4 w-4 text-india-green" /> Edit registration (admin)</p>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {([["First name","first_name"],["Middle name","middle_name"],["Surname","surname"],["Shop name","shop_name"],["Email","email"],["Mobile","mobile"],["Payment amount","payment_amount"],["Payment UTR","payment_utr"]] as [string,string][]).map(([lbl,key]) => (
                        <div key={key}><label className="text-[11px] font-semibold text-muted-foreground">{lbl}</label>
                          <input className="h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30" value={editForm[key] ?? ""} onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })} /></div>
                      ))}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" onClick={saveEdit} disabled={savingEdit} className="bg-india-green text-white hover:bg-india-green/90">{savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Save changes</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditMode(false)}><X className="h-4 w-4" /> Cancel</Button>
                    </div>
                  </div>
                )}
                <div className="grid gap-4 md:grid-cols-2">
                  <DCard icon={<User className="h-4 w-4" />} title="Account">
                    <DField label="Email" value={detail.email} />
                    <DField label="Mobile" value={detail.mobile} />
                    <DField label="Email verified" value={detail.email_verified ? "Yes" : "No"} />
                    <DField label="Mobile verified" value={detail.mobile_verified ? "Yes" : "No"} />
                  </DCard>
                  <DCard icon={<User className="h-4 w-4" />} title="Personal">
                    <DField label="First name" value={detail.first_name} />
                    <DField label="Middle name" value={detail.middle_name} />
                    <DField label="Surname" value={detail.surname} />
                    <DField label="Date of birth" value={detail.dob} />
                  </DCard>
                </div>

                <DCard icon={<Building2 className="h-4 w-4" />} title="Business & Address">
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
                </DCard>

                <div className="grid gap-4 md:grid-cols-2">
                  <DCard icon={<Landmark className="h-4 w-4" />} title="Bank">
                    <DField label="Account holder" value={detail.bank_holder_name} />
                    <DField label="Bank" value={detail.bank_name} />
                    <DField label="Account number" value={detail.account_number} />
                    <DField label="IFSC" value={detail.ifsc} />
                    <DField label="Account type" value={detail.account_type} />
                  </DCard>
                  <DCard icon={<FileSearch className="h-4 w-4" />} title="KYC">
                    <DField label="PAN number" value={detail.pan_number} />
                    <DField label="Aadhaar number" value={detail.aadhaar_number} />
                    <DField label="Declaration agreed" value={detail.declaration_agreed ? "Yes" : "No"} />
                  </DCard>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <DCard icon={<Banknote className="h-4 w-4" />} title="Payment">
                    <DField label="Amount" value={detail.payment_amount ? `₹${Number(detail.payment_amount).toLocaleString("en-IN")}` : null} />
                    <DField label="UTR" value={detail.payment_utr} />
                    <DField label="Method" value={detail.payment_method} />
                    <DField label="Paid on" value={detail.payment_paid_on} />
                    <DField label="Payer name" value={detail.payer_name} />
                    <DField label="Payer bank" value={detail.payer_bank} />
                  </DCard>
                  <DCard icon={<ShieldCheck className="h-4 w-4" />} title="Verification">
                    <DField label="Payment verified" value={detail.payment_verified ? "Yes" : "No"} />
                    <DField label="Payment notes" value={detail.payment_verification_notes} />
                    <DField label="QC verified" value={detail.qc_verified ? "Yes" : "No"} />
                    <DField label="QC notes" value={detail.qc_notes} />
                  </DCard>
                </div>

                {/* Documents */}
                <div>
                  <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    <FileText className="h-4 w-4 text-india-green" /> Documents & Media
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {([
                      ["PAN Card", "pan", detail.pan_doc_path],
                      ["Aadhaar", "aadhaar", detail.aadhaar_doc_path],
                      ["Shop Photo", "shop", detail.shop_photo_path],
                      ["Police Verification", "police", detail.police_verification_path],
                      ["Selfie", "selfie", detail.selfie_path],
                      ["Video KYC", "video", detail.video_kyc_path],
                      ["Payment Receipt", "payment", detail.payment_screenshot_path],
                    ] as [string, string, string | null][]).map(([label, key, path]) => {
                      const url = detailUrls[key];
                      const kind = fileKind(path);
                      if (!url) return (
                        <div key={key} className="flex h-32 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-[11px] text-muted-foreground">
                          <FileText className="h-5 w-5 opacity-40" /> {label}<span className="text-[10px]">Not provided</span>
                        </div>
                      );
                      return (
                        <button key={key} type="button" onClick={() => setLightbox({ url, kind, label })}
                          className="group relative h-32 overflow-hidden rounded-xl border border-border bg-muted/40 text-left transition hover:border-india-green hover:shadow-elev">
                          {kind === "image" ? (
                            <img src={url} alt={label} className="h-full w-full object-cover" />
                          ) : kind === "video" ? (
                            <video src={url} className="h-full w-full object-cover" muted />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center"><FileText className="h-8 w-8 text-muted-foreground" /></div>
                          )}
                          <span className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1 text-[10px] font-semibold text-white">{label}</span>
                          <span className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-lg bg-black/55 text-white opacity-0 transition group-hover:opacity-100">
                            <Maximize2 className="h-3.5 w-3.5" />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <DialogFooter className="border-t border-border px-6 py-3">
                <Button variant="outline" onClick={() => setDetail(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Full-screen document / video viewer */}
      {lightbox && (
        <div className="fixed inset-0 z-[80] flex flex-col bg-black/90 backdrop-blur-sm" onClick={() => setLightbox(null)}>
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <span className="truncate text-sm font-semibold">{lightbox.label}</span>
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <a href={lightbox.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20">
                <ExternalLink className="h-3.5 w-3.5" /> Open in new tab
              </a>
              <button onClick={() => setLightbox(null)} className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20">
                <X className="h-3.5 w-3.5" /> Close
              </button>
            </div>
          </div>
          <div className="flex flex-1 items-center justify-center overflow-auto p-4" onClick={(e) => e.stopPropagation()}>
            {lightbox.kind === "image" ? (
              <img src={lightbox.url} alt={lightbox.label} className="max-h-full max-w-full object-contain" />
            ) : lightbox.kind === "video" ? (
              <video src={lightbox.url} controls autoPlay className="max-h-full max-w-full rounded-lg bg-black" />
            ) : (
              <iframe src={lightbox.url} title={lightbox.label} className="h-full w-full rounded-lg bg-white" />
            )}
          </div>
        </div>
      )}

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

function fileKind(path?: string | null): "image" | "video" | "pdf" | "other" {
  if (!path) return "other";
  const ext = path.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return "image";
  if (["webm", "mp4", "mov", "ogg", "m4v"].includes(ext)) return "video";
  if (ext === "pdf") return "pdf";
  return "other";
}
function DCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        <span className="grid h-6 w-6 place-items-center rounded-lg bg-india-green/10 text-india-green">{icon}</span>
        {title}
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">{children}</div>
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
