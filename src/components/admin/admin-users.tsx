import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Users, Search, Loader2, RefreshCw, UserPlus, Eye, X, Check, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

type U = {
  id: string; email: string; display_name: string; department: string | null; designation: string | null;
  employee_code: string | null; phone: string | null; skills: string | null; experience: string | null; education: string | null;
  gender: string | null; dob: string | null; alt_phone: string | null; street_address: string | null; district: string | null; state: string | null; pincode: string | null;
  aadhaar_number: string | null; pan_number: string | null; bank_name: string | null; account_number: string | null; ifsc: string | null; upi_id: string | null;
  salary: number | null; rate_per_call: number | null; languages: string[] | null; emergency_contact_name: string | null; emergency_contact_phone: string | null;
  video_kyc_path: string | null; sow_path: string | null; sow_signed_date: string | null; sow_status: string | null;
  is_active: boolean; created_at: string; roles: string[];
};
const ALL_ROLES = ["admin", "accountant", "qc", "operator", "telecaller", "distributor", "master-distributor", "bde", "dro", "tro", "manager", "hr_staff", "employee", "retailer"];
const roleColor: Record<string, string> = {
  admin: "bg-rose-100 text-rose-700", accountant: "bg-emerald-100 text-emerald-700", qc: "bg-indigo-100 text-indigo-700",
  telecaller: "bg-orange-100 text-orange-700", retailer: "bg-sky-100 text-sky-700",
};

function genPwd() { return "Bo" + Math.random().toString(36).slice(2, 8) + "@" + Math.floor(Math.random() * 90 + 10); }

export function AdminUsers() {
  const [rows, setRows] = useState<U[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [detail, setDetail] = useState<U | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const blankAdd = { email: "", password: "", name: "", role: "telecaller", status: "active", department: "", designation: "", employee_code: "",
    gender: "", dob: "", qualification: "", experience: "", phone: "", alt_phone: "", street_address: "", district: "", state: "", pincode: "",
    aadhaar_number: "", pan_number: "", bank_name: "", account_number: "", ifsc: "", upi_id: "", salary: "", rate_per_call: "",
    emergency_contact_name: "", emergency_contact_phone: "", skills: "", sow_signed_date: "", sow_status: "pending" };
  const [add, setAdd] = useState<Record<string, string>>({ ...blankAdd });
  const [langs, setLangs] = useState<string[]>([]);
  const [kycFile, setKycFile] = useState<File | null>(null);
  const [sowFile, setSowFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_list_users");
      if (error) { toast.error("Failed to load users", { description: error.message }); setRows([]); return; }
      setRows((data as U[]) ?? []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); ensureStaffSession().then((ok) => { if (ok) load(); }); }, []);

  const filtered = useMemo(() => rows
    .filter((u) => roleFilter === "all" ? true : u.roles.includes(roleFilter))
    .filter((u) => {
      if (!q.trim()) return true; const s = q.toLowerCase();
      return [u.email, u.display_name, u.department, u.employee_code].filter(Boolean).some((v) => String(v).toLowerCase().includes(s));
    }), [rows, q, roleFilter]);

  const toggleActive = async (u: U) => {
    const { error } = await supabase.from("profiles").update({ is_active: !u.is_active }).eq("id", u.id);
    if (error) { toast.error(error.message); return; }
    toast.success(u.is_active ? "User deactivated" : "User activated");
    await load(); setDetail((d) => d && d.id === u.id ? { ...d, is_active: !u.is_active } : d);
  };
  const [distId, setDistId] = useState("");
  const assignDistributor = async (u: U) => {
    if (!distId) { toast.error("Select a distributor"); return; }
    const { error } = await supabase.rpc("set_retailer_distributor", { p_retailer: u.id, p_distributor: distId });
    if (error) { toast.error("Failed", { description: error.message }); return; }
    toast.success("Retailer mapped to distributor"); setDistId("");
  };
  const setRole = async (u: U, role: string, addRole: boolean) => {
    const { error } = await supabase.rpc("admin_set_user_role", { target: u.id, _role: role, _add: addRole });
    if (error) { toast.error(error.message); return; }
    await load();
    setDetail((d) => d && d.id === u.id ? { ...d, roles: addRole ? [...new Set([...d.roles, role])] : d.roles.filter((r) => r !== role) } : d);
  };
  const uploadStaffDoc = async (uid: string, kind: string, file: File) => {
    const ext = (file.name.split(".").pop() || "bin").toLowerCase();
    const path = `${uid}/${kind}-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("staff-docs").upload(path, file, { upsert: false, contentType: file.type || undefined });
    if (error) { toast.error(`${kind} upload failed`, { description: error.message }); return null; }
    return path;
  };
  const createStaff = async () => {
    if (!add.email || !add.password || !add.name) { toast.error("Name, email and password are required"); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("create_staff_account", { _email: add.email, _password: add.password, _name: add.name, _role: add.role, _department: add.department || null, _designation: add.designation || null, _employee_code: add.employee_code || null, _phone: add.phone || null, _skills: add.skills || null, _experience: add.experience || null, _education: add.qualification || null });
      if (error) { toast.error("Create failed", { description: error.message }); return; }
      const uid = (data as any)?.id as string | undefined;
      if (uid) {
        const videoPath = kycFile ? await uploadStaffDoc(uid, "video-kyc", kycFile) : null;
        const sowPath = sowFile ? await uploadStaffDoc(uid, "sow", sowFile) : null;
        await supabase.from("profiles").update({
          gender: add.gender || null, dob: add.dob || null, alt_phone: add.alt_phone || null,
          street_address: add.street_address || null, district: add.district || null, state: add.state || null, pincode: add.pincode || null,
          aadhaar_number: add.aadhaar_number || null, pan_number: add.pan_number || null,
          bank_name: add.bank_name || null, account_number: add.account_number || null, ifsc: add.ifsc || null, upi_id: add.upi_id || null,
          salary: add.salary ? Number(add.salary) : null, rate_per_call: add.rate_per_call ? Number(add.rate_per_call) : null,
          languages: langs.length ? langs : null, emergency_contact_name: add.emergency_contact_name || null, emergency_contact_phone: add.emergency_contact_phone || null,
          is_active: add.status !== "inactive", video_kyc_path: videoPath, sow_path: sowPath,
          sow_signed_date: add.sow_signed_date || null, sow_status: add.sow_status || null,
        }).eq("id", uid);
      }
      toast.success("Staff account created");
      setShowAdd(false); setAdd({ ...blankAdd }); setLangs([]); setKycFile(null); setSowFile(null);
      await load();
    } finally { setBusy(false); }
  };
  const [edit, setEdit] = useState<Record<string, string> | null>(null);
  const [editLangs, setEditLangs] = useState<string[]>([]);
  const [editKyc, setEditKyc] = useState<File | null>(null);
  const [editSow, setEditSow] = useState<File | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const openDetail = (u: U) => {
    setDetail(u);
    setEdit({
      phone: u.phone ?? "", skills: u.skills ?? "", experience: u.experience ?? "", education: u.education ?? "",
      department: u.department ?? "", designation: u.designation ?? "", employee_code: u.employee_code ?? "",
      gender: u.gender ?? "", dob: u.dob ?? "", alt_phone: u.alt_phone ?? "", street_address: u.street_address ?? "",
      district: u.district ?? "", state: u.state ?? "", pincode: u.pincode ?? "", aadhaar_number: u.aadhaar_number ?? "",
      pan_number: u.pan_number ?? "", bank_name: u.bank_name ?? "", account_number: u.account_number ?? "", ifsc: u.ifsc ?? "",
      upi_id: u.upi_id ?? "", salary: u.salary != null ? String(u.salary) : "", rate_per_call: u.rate_per_call != null ? String(u.rate_per_call) : "",
      emergency_contact_name: u.emergency_contact_name ?? "", emergency_contact_phone: u.emergency_contact_phone ?? "",
      sow_signed_date: u.sow_signed_date ?? "", sow_status: u.sow_status ?? "pending",
    });
    setEditLangs(u.languages ?? []); setEditKyc(null); setEditSow(null);
  };
  const viewStaffDoc = async (path: string) => { const { data } = await supabase.storage.from("staff-docs").createSignedUrl(path, 3600); if (data) window.open(data.signedUrl, "_blank"); };
  const saveProfile = async (u: U) => {
    if (!edit) return;
    setSavingProfile(true);
    try {
      const videoPath = editKyc ? await uploadStaffDoc(u.id, "video-kyc", editKyc) : (u.video_kyc_path ?? null);
      const sowPath = editSow ? await uploadStaffDoc(u.id, "sow", editSow) : (u.sow_path ?? null);
      const payload: any = {
        phone: edit.phone || null, skills: edit.skills || null, experience: edit.experience || null, education: edit.education || null,
        department: edit.department || null, designation: edit.designation || null, employee_code: edit.employee_code || null,
        gender: edit.gender || null, dob: edit.dob || null, alt_phone: edit.alt_phone || null, street_address: edit.street_address || null,
        district: edit.district || null, state: edit.state || null, pincode: edit.pincode || null, aadhaar_number: edit.aadhaar_number || null,
        pan_number: edit.pan_number || null, bank_name: edit.bank_name || null, account_number: edit.account_number || null, ifsc: edit.ifsc || null,
        upi_id: edit.upi_id || null, salary: edit.salary ? Number(edit.salary) : null, rate_per_call: edit.rate_per_call ? Number(edit.rate_per_call) : null,
        languages: editLangs.length ? editLangs : null, emergency_contact_name: edit.emergency_contact_name || null, emergency_contact_phone: edit.emergency_contact_phone || null,
        sow_signed_date: edit.sow_signed_date || null, sow_status: edit.sow_status || null, video_kyc_path: videoPath, sow_path: sowPath,
      };
      const { error } = await supabase.from("profiles").update(payload).eq("id", u.id);
      if (error) return toast.error("Save failed", { description: error.message });
      toast.success("Staff profile updated");
      setRows((rs) => rs.map((x) => x.id === u.id ? { ...x, ...payload } : x));
      setDetail((d) => d ? { ...d, ...payload } : d); setEditKyc(null); setEditSow(null);
    } finally { setSavingProfile(false); }
  };
  const input = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30";
  const isBasic = add.role === "distributor" || add.role === "retailer";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-lg bg-muted px-3 h-9 flex-1 min-w-[220px]">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input className="bg-transparent flex-1 text-sm outline-none" placeholder="Search name, email, dept, code…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="h-9 rounded-lg border border-border bg-card px-2 text-sm" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="all">All roles</option>{ALL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button>
        <Button size="sm" className="bg-india-green text-white" onClick={() => setShowAdd(true)}><UserPlus className="h-4 w-4" /> Add staff</Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr><th className="px-3 py-2.5">User</th><th className="px-3 py-2.5">Roles</th><th className="px-3 py-2.5">Department</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5">Joined</th><th className="px-3 py-2.5 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="px-3 py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></td></tr>
              : filtered.length === 0 ? <tr><td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">No users found.</td></tr>
              : filtered.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="px-3 py-3"><div className="font-semibold">{u.display_name}</div><div className="text-xs text-muted-foreground">{u.email}{u.employee_code ? " · " + u.employee_code : ""}</div></td>
                <td className="px-3 py-3"><div className="flex flex-wrap gap-1">{u.roles.length ? u.roles.map((r) => <span key={r} className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${roleColor[r] ?? "bg-slate-100 text-slate-700"}`}>{r}</span>) : <span className="text-xs text-muted-foreground">—</span>}</div></td>
                <td className="px-3 py-3 text-muted-foreground">{u.department || "—"}</td>
                <td className="px-3 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${u.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{u.is_active ? "Active" : "Inactive"}</span></td>
                <td className="px-3 py-3 text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString("en-IN")}</td>
                <td className="px-3 py-3 text-right"><Button size="sm" variant="outline" className="h-8" onClick={() => openDetail(u)}><Eye className="h-3.5 w-3.5" /> View</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{detail?.display_name}</DialogTitle><DialogDescription>{detail?.email}</DialogDescription></DialogHeader>
          {detail && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Info label="Joined" v={new Date(detail.created_at).toLocaleString("en-IN")} />
                <Info label="Status" v={detail.is_active ? "Active" : "Inactive"} />
              </div>
              {edit && (
                <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-saffron">Basic Information</p>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <div><label className="text-[11px] font-semibold text-muted-foreground">Gender</label><select className={input} value={edit.gender} onChange={(e) => setEdit({ ...edit, gender: e.target.value })}><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select></div>
                    <div><label className="text-[11px] font-semibold text-muted-foreground">Date of Birth</label><input type="date" className={input} value={edit.dob} onChange={(e) => setEdit({ ...edit, dob: e.target.value })} /></div>
                    <div><label className="text-[11px] font-semibold text-muted-foreground">Qualification</label><input className={input} value={edit.education} onChange={(e) => setEdit({ ...edit, education: e.target.value })} placeholder="e.g. B.Com, MBA" /></div>
                    <div><label className="text-[11px] font-semibold text-muted-foreground">Experience</label><input className={input} value={edit.experience} onChange={(e) => setEdit({ ...edit, experience: e.target.value })} placeholder="e.g. 3 years" /></div>
                    <div className="sm:col-span-2"><label className="text-[11px] font-semibold text-muted-foreground">Skills</label><textarea rows={2} className={input + " h-auto py-2"} value={edit.skills} onChange={(e) => setEdit({ ...edit, skills: e.target.value })} placeholder="e.g. AEPS, KYC verification" /></div>
                  </div>

                  <p className="pt-1 text-xs font-bold uppercase tracking-wider text-saffron">Contact & Address</p>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <div><label className="text-[11px] font-semibold text-muted-foreground">Phone</label><input className={input} value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} placeholder="Phone" /></div>
                    <div><label className="text-[11px] font-semibold text-muted-foreground">Alternate Phone</label><input className={input} value={edit.alt_phone} onChange={(e) => setEdit({ ...edit, alt_phone: e.target.value })} placeholder="Alt phone" /></div>
                    <div className="sm:col-span-2"><label className="text-[11px] font-semibold text-muted-foreground">Street Address</label><input className={input} value={edit.street_address} onChange={(e) => setEdit({ ...edit, street_address: e.target.value })} placeholder="House/Flat, Street, Area" /></div>
                    <div><label className="text-[11px] font-semibold text-muted-foreground">District</label><input className={input} value={edit.district} onChange={(e) => setEdit({ ...edit, district: e.target.value })} placeholder="District" /></div>
                    <div><label className="text-[11px] font-semibold text-muted-foreground">State</label><input className={input} value={edit.state} onChange={(e) => setEdit({ ...edit, state: e.target.value })} placeholder="State" /></div>
                    <div><label className="text-[11px] font-semibold text-muted-foreground">Pincode</label><input className={input} value={edit.pincode} onChange={(e) => setEdit({ ...edit, pincode: e.target.value })} placeholder="Pincode" /></div>
                  </div>

                  {!(detail.roles.includes("distributor") || detail.roles.includes("retailer")) && <>
                  <p className="pt-1 text-xs font-bold uppercase tracking-wider text-saffron">Identity & Bank</p>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <div><label className="text-[11px] font-semibold text-muted-foreground">Aadhaar Number</label><input className={input} value={edit.aadhaar_number} onChange={(e) => setEdit({ ...edit, aadhaar_number: e.target.value })} placeholder="XXXX XXXX XXXX" /></div>
                    <div><label className="text-[11px] font-semibold text-muted-foreground">PAN Number</label><input className={input} value={edit.pan_number} onChange={(e) => setEdit({ ...edit, pan_number: e.target.value.toUpperCase() })} placeholder="ABCDE1234F" /></div>
                    <div><label className="text-[11px] font-semibold text-muted-foreground">Bank Name</label><input className={input} value={edit.bank_name} onChange={(e) => setEdit({ ...edit, bank_name: e.target.value })} placeholder="e.g. SBI" /></div>
                    <div><label className="text-[11px] font-semibold text-muted-foreground">Account Number</label><input className={input} value={edit.account_number} onChange={(e) => setEdit({ ...edit, account_number: e.target.value })} placeholder="Account number" /></div>
                    <div><label className="text-[11px] font-semibold text-muted-foreground">IFSC Code</label><input className={input} value={edit.ifsc} onChange={(e) => setEdit({ ...edit, ifsc: e.target.value.toUpperCase() })} placeholder="SBIN0001234" /></div>
                    <div><label className="text-[11px] font-semibold text-muted-foreground">UPI ID</label><input className={input} value={edit.upi_id} onChange={(e) => setEdit({ ...edit, upi_id: e.target.value })} placeholder="name@upi" /></div>
                  </div>

                  <p className="pt-1 text-xs font-bold uppercase tracking-wider text-saffron">Role & Compensation</p>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <div><label className="text-[11px] font-semibold text-muted-foreground">Department</label><input className={input} value={edit.department} onChange={(e) => setEdit({ ...edit, department: e.target.value })} placeholder="Department" /></div>
                    <div><label className="text-[11px] font-semibold text-muted-foreground">Designation</label><input className={input} value={edit.designation} onChange={(e) => setEdit({ ...edit, designation: e.target.value })} placeholder="Designation" /></div>
                    <div><label className="text-[11px] font-semibold text-muted-foreground">Employee Code</label><input className={input} value={edit.employee_code} onChange={(e) => setEdit({ ...edit, employee_code: e.target.value })} placeholder="Code" /></div>
                    <div><label className="text-[11px] font-semibold text-muted-foreground">Salary (₹/month)</label><input type="number" className={input} value={edit.salary} onChange={(e) => setEdit({ ...edit, salary: e.target.value })} placeholder="18000" /></div>
                    <div><label className="text-[11px] font-semibold text-muted-foreground">Rate Per Call (₹)</label><input type="number" className={input} value={edit.rate_per_call} onChange={(e) => setEdit({ ...edit, rate_per_call: e.target.value })} placeholder="5" /></div>
                  </div>

                  <p className="pt-1 text-xs font-bold uppercase tracking-wider text-saffron">Languages Known</p>
                  <div className="flex flex-wrap gap-1.5">
                    {LANGS.map((l) => { const on = editLangs.includes(l); return <button key={l} type="button" onClick={() => setEditLangs((pp) => on ? pp.filter((x) => x !== l) : [...pp, l])} className={`rounded-full px-3 h-8 text-xs font-semibold transition ${on ? "bg-india-green text-white" : "border border-border bg-card hover:bg-muted"}`}>{l}</button>; })}
                  </div>

                  <p className="pt-1 text-xs font-bold uppercase tracking-wider text-saffron">Emergency Contact</p>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <div><label className="text-[11px] font-semibold text-muted-foreground">Contact Name</label><input className={input} value={edit.emergency_contact_name} onChange={(e) => setEdit({ ...edit, emergency_contact_name: e.target.value })} placeholder="Name (Relation)" /></div>
                    <div><label className="text-[11px] font-semibold text-muted-foreground">Contact Phone</label><input className={input} value={edit.emergency_contact_phone} onChange={(e) => setEdit({ ...edit, emergency_contact_phone: e.target.value })} placeholder="+91 XXXXX XXXXX" /></div>
                  </div>

                  <p className="pt-1 text-xs font-bold uppercase tracking-wider text-saffron">Video KYC & SOW</p>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground">Video KYC</label>
                      <div className="flex items-center gap-2">
                        <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border bg-card px-2.5 h-9 text-xs font-semibold hover:bg-muted">Choose<input type="file" className="hidden" onChange={(e) => setEditKyc(e.target.files?.[0] ?? null)} /></label>
                        {editKyc ? <span className="truncate text-xs text-india-green">{editKyc.name}</span> : detail.video_kyc_path ? <button onClick={() => viewStaffDoc(detail.video_kyc_path!)} className="text-xs font-semibold text-india-green hover:underline">View current</button> : <span className="text-xs text-muted-foreground">None</span>}
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground">SOW Agreement</label>
                      <div className="flex items-center gap-2">
                        <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border bg-card px-2.5 h-9 text-xs font-semibold hover:bg-muted">Choose<input type="file" className="hidden" onChange={(e) => setEditSow(e.target.files?.[0] ?? null)} /></label>
                        {editSow ? <span className="truncate text-xs text-india-green">{editSow.name}</span> : detail.sow_path ? <button onClick={() => viewStaffDoc(detail.sow_path!)} className="text-xs font-semibold text-india-green hover:underline">View current</button> : <span className="text-xs text-muted-foreground">None</span>}
                      </div>
                    </div>
                    <div><label className="text-[11px] font-semibold text-muted-foreground">SOW Signed Date</label><input type="date" className={input} value={edit.sow_signed_date} onChange={(e) => setEdit({ ...edit, sow_signed_date: e.target.value })} /></div>
                    <div><label className="text-[11px] font-semibold text-muted-foreground">SOW Status</label><select className={input} value={edit.sow_status} onChange={(e) => setEdit({ ...edit, sow_status: e.target.value })}><option value="pending">Pending</option><option value="signed">Signed</option><option value="verified">Verified</option></select></div>
                  </div>
                  </>}

                  <Button size="sm" className="mt-1 bg-india-green text-white" disabled={savingProfile} onClick={() => saveProfile(detail)}>{savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save profile</Button>
                </div>
              )}
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Roles</p>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_ROLES.map((r) => {
                    const on = detail.roles.includes(r);
                    return <button key={r} onClick={() => setRole(detail, r, !on)}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 transition ${on ? "bg-india-green text-white ring-india-green" : "bg-card text-muted-foreground ring-border hover:bg-muted"}`}>
                      {on ? "✓ " : "+ "}{r}</button>;
                  })}
                </div>
              </div>
              {detail.roles.includes("retailer") && (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Assign to Distributor</p>
                  <div className="flex gap-2">
                    <select className="h-9 flex-1 rounded-lg border border-border bg-background px-2 text-sm" value={distId} onChange={(e) => setDistId(e.target.value)}>
                      <option value="">Select distributor</option>
                      {rows.filter((x) => x.roles.includes("distributor")).map((x) => <option key={x.id} value={x.id}>{x.display_name} ({x.email})</option>)}
                    </select>
                    <Button size="sm" className="bg-india-green text-white" onClick={() => assignDistributor(detail)}>Map</Button>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            {detail && <Button variant="outline" className={detail.is_active ? "text-rose-600" : "text-emerald-700"} onClick={() => toggleActive(detail)}>
              {detail.is_active ? "Deactivate" : "Activate"}</Button>}
            <Button onClick={() => setDetail(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add staff */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-saffron" /> Add New User</DialogTitle><DialogDescription>Distributor & Retailer need only basic details; staff roles show the full profile.</DialogDescription></DialogHeader>

          <Sec title="Role & Status">
            <F label="Role *"><select className={input} value={add.role} onChange={(e) => setAdd({ ...add, role: e.target.value })}>{ALL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</select></F>
            <F label="Status"><select className={input} value={add.status} onChange={(e) => setAdd({ ...add, status: e.target.value })}><option value="active">Active</option><option value="inactive">Inactive</option></select></F>
          </Sec>

          <Sec title="Basic Information">
            <F label="Full Name *"><input className={input} placeholder="Enter full name" value={add.name} onChange={(e) => setAdd({ ...add, name: e.target.value })} /></F>
            {!isBasic && <>
            <F label="Gender"><select className={input} value={add.gender} onChange={(e) => setAdd({ ...add, gender: e.target.value })}><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select></F>
            <F label="Date of Birth"><input type="date" className={input} value={add.dob} onChange={(e) => setAdd({ ...add, dob: e.target.value })} /></F>
            <F label="Qualification"><input className={input} placeholder="e.g. B.Com, MBA" value={add.qualification} onChange={(e) => setAdd({ ...add, qualification: e.target.value })} /></F>
            <F label="Experience"><input className={input} placeholder="e.g. 2 years" value={add.experience} onChange={(e) => setAdd({ ...add, experience: e.target.value })} /></F>
            </>}
          </Sec>

          <Sec title="Account & Login">
            <F label="Email *"><input className={input} placeholder="user@mail.com" value={add.email} onChange={(e) => setAdd({ ...add, email: e.target.value })} /></F>
            <F label="Temporary Password *"><div className="flex gap-2"><input className={input} placeholder="Password" value={add.password} onChange={(e) => setAdd({ ...add, password: e.target.value })} /><Button type="button" variant="outline" onClick={() => setAdd({ ...add, password: genPwd() })}>Gen</Button></div></F>
          </Sec>

          <Sec title="Contact Details">
            <F label="Phone"><input className={input} placeholder="+91 98765 XXXXX" value={add.phone} onChange={(e) => setAdd({ ...add, phone: e.target.value })} /></F>
            <F label="Alternate Phone"><input className={input} placeholder="+91 87654 XXXXX" value={add.alt_phone} onChange={(e) => setAdd({ ...add, alt_phone: e.target.value })} /></F>
          </Sec>

          <Sec title="Address">
            <F label="Street Address" full><input className={input} placeholder="House/Flat, Street, Area" value={add.street_address} onChange={(e) => setAdd({ ...add, street_address: e.target.value })} /></F>
            <F label="District"><input className={input} placeholder="District" value={add.district} onChange={(e) => setAdd({ ...add, district: e.target.value })} /></F>
            <F label="State"><input className={input} placeholder="State" value={add.state} onChange={(e) => setAdd({ ...add, state: e.target.value })} /></F>
            <F label="Pincode"><input className={input} placeholder="110001" value={add.pincode} onChange={(e) => setAdd({ ...add, pincode: e.target.value })} /></F>
          </Sec>

          {!isBasic && <Sec title="Identity Documents">
            <F label="Aadhaar Number"><input className={input} placeholder="XXXX XXXX XXXX" value={add.aadhaar_number} onChange={(e) => setAdd({ ...add, aadhaar_number: e.target.value })} /></F>
            <F label="PAN Number"><input className={input} placeholder="ABCDE1234F" value={add.pan_number} onChange={(e) => setAdd({ ...add, pan_number: e.target.value.toUpperCase() })} /></F>
          </Sec>}

          {!isBasic && <Sec title="Bank & Payment">
            <F label="Bank Name"><input className={input} placeholder="e.g. SBI, HDFC" value={add.bank_name} onChange={(e) => setAdd({ ...add, bank_name: e.target.value })} /></F>
            <F label="Account Number"><input className={input} placeholder="Account number" value={add.account_number} onChange={(e) => setAdd({ ...add, account_number: e.target.value })} /></F>
            <F label="IFSC Code"><input className={input} placeholder="SBIN0001234" value={add.ifsc} onChange={(e) => setAdd({ ...add, ifsc: e.target.value.toUpperCase() })} /></F>
            <F label="UPI ID"><input className={input} placeholder="name@upi" value={add.upi_id} onChange={(e) => setAdd({ ...add, upi_id: e.target.value })} /></F>
          </Sec>}

          {!isBasic && <Sec title="Compensation">
            <F label="Salary (₹/month)"><input className={input} type="number" placeholder="18000" value={add.salary} onChange={(e) => setAdd({ ...add, salary: e.target.value })} /></F>
            <F label="Rate Per Call (₹)"><input className={input} type="number" placeholder="5" value={add.rate_per_call} onChange={(e) => setAdd({ ...add, rate_per_call: e.target.value })} /></F>
            <F label="Designation"><input className={input} placeholder="Designation" value={add.designation} onChange={(e) => setAdd({ ...add, designation: e.target.value })} /></F>
            <F label="Employee Code"><input className={input} placeholder="Code" value={add.employee_code} onChange={(e) => setAdd({ ...add, employee_code: e.target.value })} /></F>
          </Sec>}

          {!isBasic && <div className="mt-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Languages Known</p>
            <div className="flex flex-wrap gap-1.5">
              {LANGS.map((l) => { const on = langs.includes(l); return <button key={l} type="button" onClick={() => setLangs((p) => on ? p.filter((x) => x !== l) : [...p, l])} className={`rounded-full px-3 h-8 text-xs font-semibold transition ${on ? "bg-india-green text-white" : "border border-border bg-card hover:bg-muted"}`}>{l}</button>; })}
            </div>
          </div>}

          {!isBasic && <Sec title="Emergency Contact">
            <F label="Contact Name"><input className={input} placeholder="Name (Relation)" value={add.emergency_contact_name} onChange={(e) => setAdd({ ...add, emergency_contact_name: e.target.value })} /></F>
            <F label="Contact Phone"><input className={input} placeholder="+91 XXXXX XXXXX" value={add.emergency_contact_phone} onChange={(e) => setAdd({ ...add, emergency_contact_phone: e.target.value })} /></F>
          </Sec>}

          {!isBasic && <div className="mt-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Video KYC & SOW Agreement</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Uploader label="Video KYC" hint="Self-recorded verification clip" file={kycFile} onPick={setKycFile} />
              <Uploader label="SOW Agreement" hint="Signed scope of work document" file={sowFile} onPick={setSowFile} />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <F label="Signed Date"><input type="date" className={input} value={add.sow_signed_date} onChange={(e) => setAdd({ ...add, sow_signed_date: e.target.value })} /></F>
              <F label="Status"><select className={input} value={add.sow_status} onChange={(e) => setAdd({ ...add, sow_status: e.target.value })}><option value="pending">Pending</option><option value="signed">Signed</option><option value="verified">Verified</option></select></F>
            </div>
          </div>}

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setShowAdd(false)}><X className="h-4 w-4" /> Cancel</Button>
            <Button className="bg-india-green text-white" onClick={createStaff} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Create user</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const LANGS = ["Hindi", "English", "Kannada", "Tamil", "Telugu", "Malayalam", "Marathi", "Gujarati", "Bengali", "Punjabi", "Odia", "Assamese", "Urdu"];

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 border-t border-border pt-3 first:mt-0 first:border-0 first:pt-0">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-saffron">{title}</p>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}
function F({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return <div className={full ? "sm:col-span-2" : ""}><label className="mb-1 block text-xs font-semibold text-foreground">{label}</label>{children}</div>;
}
function Uploader({ label, hint, file, onPick }: { label: string; hint: string; file: File | null; onPick: (f: File | null) => void }) {
  return (
    <label className="flex cursor-pointer flex-col gap-1 rounded-xl border-2 border-dashed border-border bg-card p-4 text-center hover:border-india-green">
      <span className="text-sm font-bold text-foreground">{label}</span>
      <span className="text-[11px] text-muted-foreground">{hint}</span>
      <span className="mt-2 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-india-green">{file ? file.name : "Click to upload"}</span>
      <input type="file" className="hidden" onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
    </label>
  );
}
function Info({ label, v }: { label: string; v: unknown }) {
  return <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p><p className="font-semibold">{v ? String(v) : "—"}</p></div>;
}
