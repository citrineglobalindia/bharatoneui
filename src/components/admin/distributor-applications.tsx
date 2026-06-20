import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Search,
  Loader2,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  FileText,
  ExternalLink,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  Landmark,
  IdCard,
  Hash,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession, withTimeout } from "@/integrations/supabase/ensure-session";
import { useAuth } from "@/hooks/use-auth";

type DistRow = {
  id: string;
  application_id: string;
  distributor_name: string;
  proprietor_name: string | null;
  company_name: string | null;
  gst_number: string | null;
  dob: string | null;
  gender: string | null;
  mobile: string;
  alt_mobile: string | null;
  email: string;
  pan_number: string | null;
  ifsc: string | null;
  bank_name: string | null;
  account_number: string | null;
  address_line: string | null;
  state: string | null;
  district: string | null;
  group_name: string | null;
  form_doc_path: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
};

const TABS = ["under_review", "approved", "rejected"] as const;
const TAB_LABEL: Record<string, string> = {
  under_review: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

function statusPill(s: string) {
  const map: Record<string, string> = {
    under_review: "bg-amber-100 text-amber-700",
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-rose-100 text-rose-700",
  };
  return map[s] ?? "bg-slate-100 text-slate-700";
}

export function DistributorApplications() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [rows, setRows] = useState<DistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>("under_review");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [detail, setDetail] = useState<DistRow | null>(null);
  const [formUrl, setFormUrl] = useState<string | null>(null);
  const [formState, setFormState] = useState<"none" | "loading" | "ready" | "error">("none");
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [creds, setCreds] = useState<{ username: string; email: string; password: string } | null>(
    null,
  );

  async function load() {
    setLoading(true);
    try {
      await ensureStaffSession();
      const { data, error } = await withTimeout(
        supabase
          .from("distributor_registrations")
          .select(
            "id, application_id, distributor_name, proprietor_name, company_name, gst_number, dob, gender, mobile, alt_mobile, email, pan_number, ifsc, bank_name, account_number, address_line, state, district, group_name, form_doc_path, status, rejection_reason, created_at",
          )
          .order("created_at", { ascending: false }),
      );
      if (error) {
        toast.error("Could not load applications", { description: error.message });
        return;
      }
      setRows((data ?? []) as DistRow[]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const openDetail = async (r: DistRow) => {
    setDetail(r);
    setFormUrl(null);
    setRejecting(false);
    setRejectReason("");
    if (!r.form_doc_path) {
      setFormState("none");
      return;
    }
    setFormState("loading");
    try {
      const { data: su, error } = await supabase.storage
        .from("retailer-kyc")
        .createSignedUrl(r.form_doc_path, 3600);
      if (error || !su?.signedUrl) {
        setFormState("error");
        return;
      }
      setFormUrl(su.signedUrl);
      setFormState("ready");
    } catch {
      setFormState("error");
    }
  };

  const approve = async (id: string) => {
    setBusy(id);
    try {
      const { data, error } = await supabase.rpc("approve_distributor_registration", {
        reg_id: id,
      });
      if (error) {
        toast.error("Approve failed", { description: error.message });
        return;
      }
      const res = data as unknown as {
        username?: string;
        email?: string;
        password?: string | null;
      };
      setDetail(null);
      if (res?.password) {
        // fallback case: a temporary password was generated — surface it to copy
        setCreds({ username: res.username ?? "", email: res.email ?? "", password: res.password });
      } else {
        toast.success("Distributor approved", {
          description: res?.username
            ? `Login ID ${res.username} — they sign in with their registered password.`
            : undefined,
        });
      }
      load();
    } finally {
      setBusy(null);
    }
  };

  const reject = async (id: string) => {
    if (!rejectReason.trim()) {
      toast.error("Enter a rejection reason");
      return;
    }
    setBusy(id);
    try {
      const { error } = await supabase.rpc("reject_distributor_registration", {
        reg_id: id,
        reason: rejectReason.trim(),
      });
      if (error) {
        toast.error("Reject failed", { description: error.message });
        return;
      }
      toast.success("Distributor rejected");
      setDetail(null);
      load();
    } finally {
      setBusy(null);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => r.status === tab)
      .filter(
        (r) =>
          !q ||
          r.distributor_name?.toLowerCase().includes(q) ||
          r.company_name?.toLowerCase().includes(q) ||
          r.application_id?.toLowerCase().includes(q) ||
          r.email?.toLowerCase().includes(q) ||
          r.mobile?.includes(q),
      );
  }, [rows, tab, query]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const t of TABS) c[t] = rows.filter((r) => r.status === t).length;
    return c;
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-foreground">Distributor Applications</h2>
          <p className="text-xs text-muted-foreground">
            Self-registered distributors awaiting verification and approval.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              tab === t
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {TAB_LABEL[t]} ({counts[t] ?? 0})
          </button>
        ))}
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, company, ID…"
            className="h-9 w-56 rounded-lg border border-input bg-background pl-8 pr-3 text-sm shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-muted/40 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              <tr>
                {["Application", "Distributor", "Company", "Contact", "Status", ""].map((h) => (
                  <th key={h} className="px-4 py-2.5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No {TAB_LABEL[tab].toLowerCase()} distributor applications.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="text-[13px] transition hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono font-semibold">{r.application_id}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{r.distributor_name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {r.proprietor_name || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3">{r.company_name || "—"}</td>
                    <td className="px-4 py-3">
                      <p>{r.mobile}</p>
                      <p className="text-[11px] text-muted-foreground">{r.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-bold ${statusPill(r.status)}`}
                      >
                        {TAB_LABEL[r.status] ?? r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => openDetail(r)}>
                        <Eye className="h-4 w-4" /> View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {detail.distributor_name}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusPill(detail.status)}`}
                  >
                    {TAB_LABEL[detail.status] ?? detail.status}
                  </span>
                </DialogTitle>
                <DialogDescription className="font-mono">{detail.application_id}</DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 sm:grid-cols-2">
                <Detail
                  icon={<User className="h-3.5 w-3.5" />}
                  label="Proprietor"
                  value={detail.proprietor_name}
                />
                <Detail
                  icon={<Building2 className="h-3.5 w-3.5" />}
                  label="Company / Firm"
                  value={detail.company_name}
                />
                <Detail
                  icon={<Hash className="h-3.5 w-3.5" />}
                  label="GST Number"
                  value={detail.gst_number}
                />
                <Detail label="Date of Birth" value={detail.dob} />
                <Detail label="Gender" value={detail.gender} />
                <Detail
                  icon={<Phone className="h-3.5 w-3.5" />}
                  label="Mobile"
                  value={detail.mobile}
                />
                <Detail
                  icon={<Phone className="h-3.5 w-3.5" />}
                  label="Alternate Mobile"
                  value={detail.alt_mobile}
                />
                <Detail
                  icon={<Mail className="h-3.5 w-3.5" />}
                  label="Email"
                  value={detail.email}
                />
                <Detail
                  icon={<IdCard className="h-3.5 w-3.5" />}
                  label="PAN"
                  value={detail.pan_number}
                />
                <Detail
                  icon={<Landmark className="h-3.5 w-3.5" />}
                  label="IFSC"
                  value={detail.ifsc}
                />
                <Detail label="Bank Name" value={detail.bank_name} />
                <Detail label="Account Number" value={detail.account_number} />
                <Detail
                  icon={<MapPin className="h-3.5 w-3.5" />}
                  label="Address"
                  value={[detail.address_line, detail.district, detail.state]
                    .filter(Boolean)
                    .join(", ")}
                  className="sm:col-span-2"
                />
                <Detail label="Group" value={detail.group_name} />
              </div>

              <div className="mt-1 rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-xs font-semibold text-foreground">Onboarding Form</p>
                {formState === "ready" && formUrl ? (
                  <a
                    href={formUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    <FileText className="h-4 w-4" /> View submitted PDF{" "}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : formState === "loading" ? (
                  <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Generating secure link…
                  </p>
                ) : formState === "error" ? (
                  <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-rose-600">
                    <AlertTriangle className="h-3 w-3" /> Form file unavailable — it may not have
                    been uploaded or has been removed.
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">No form uploaded.</p>
                )}
              </div>

              {detail.status === "rejected" && detail.rejection_reason && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  <span className="font-semibold">Rejection reason: </span>
                  {detail.rejection_reason}
                </div>
              )}

              {isAdmin && detail.status === "under_review" && (
                <>
                  {rejecting && (
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Reason for rejection…"
                      rows={2}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
                    />
                  )}
                  <DialogFooter className="gap-2">
                    {rejecting ? (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => setRejecting(false)}
                          disabled={busy === detail.id}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => reject(detail.id)}
                          disabled={busy === detail.id}
                        >
                          {busy === detail.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                          Confirm Reject
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => setRejecting(true)}
                          disabled={busy === detail.id}
                        >
                          <XCircle className="h-4 w-4" /> Reject
                        </Button>
                        <Button
                          onClick={() => approve(detail.id)}
                          disabled={busy === detail.id}
                          className="bg-saffron-gradient"
                        >
                          {busy === detail.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          Approve
                        </Button>
                      </>
                    )}
                  </DialogFooter>
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!creds} onOpenChange={(o) => !o && setCreds(null)}>
        <DialogContent className="max-w-md">
          {creds && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Distributor approved
                </DialogTitle>
                <DialogDescription>
                  A temporary password was generated. Share these credentials securely — they won't
                  be shown again.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                {[
                  { label: "Login ID", value: creds.username },
                  { label: "Email", value: creds.email },
                  { label: "Temporary password", value: creds.password },
                ].map((c) => (
                  <div
                    key={c.label}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {c.label}
                      </p>
                      <p className="truncate font-mono text-sm text-foreground">{c.value}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard?.writeText(c.value);
                        toast.success(`${c.label} copied`);
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button onClick={() => setCreds(null)}>Done</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Detail({
  icon,
  label,
  value,
  className,
}: {
  icon?: React.ReactNode;
  label: string;
  value?: string | null;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-0.5 text-sm text-foreground">{value || "—"}</p>
    </div>
  );
}
