import { useEffect, useMemo, useState } from "react";
import { sanitizeMobile } from "@/lib/phone";
import { toast } from "sonner";
import { Users, Search, Loader2, RefreshCw, UserPlus, Eye, X, Check, ShieldCheck, Trash2, AlertTriangle, KeyRound, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";
import { useSort, SortTh, useColumnFilters, FilterTh } from "@/components/ui/sortable";

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

// CR-51: User Management modules — each tab scopes the list to a role group.
type Module = { key: string; label: string; roles: string[]; defaultRole: string };
const MODULES: Module[] = [
  { key: "all", label: "All Users", roles: ALL_ROLES, defaultRole: "telecaller" },
  { key: "retailer", label: "Retailer (JSKO) Staff", roles: ["retailer"], defaultRole: "retailer" },
  { key: "office", label: "Office Staff", roles: ["operator", "hr_staff", "manager", "accountant", "qc", "telecaller", "bde", "employee", "admin"], defaultRole: "operator" },
  { key: "dro", label: "DRO Staff", roles: ["dro"], defaultRole: "dro" },
  { key: "tro", label: "TRO Staff", roles: ["tro"], defaultRole: "tro" },
  { key: "distributor", label: "Distributor Staff", roles: ["distributor", "master-distributor"], defaultRole: "distributor" },
];

function genPwd() { return "Bo" + Math.random().toString(36).slice(2, 8) + "@" + Math.floor(Math.random() * 90 + 10); }

export function AdminUsers() {
  const [rows, setRows] = useState<U[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [detail, setDetail] = useState<U | null>(null);
  const [reg, setReg] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const blankAdd = { email: "", username: "", password: "", name: "", role: "telecaller", status: "active", department: "", designation: "", employee_code: "",
    gender: "", dob: "", qualification: "", experience: "", phone: "", alt_phone: "", street_address: "", district: "", state: "", pincode: "",
    aadhaar_number: "", pan_number: "", bank_name: "", account_number: "", ifsc: "", upi_id: "", salary: "", rate_per_call: "",
    emergency_contact_name: "", emergency_contact_phone: "", skills: "", sow_signed_date: "", sow_status: "pending" };
  const [add, setAdd] = useState<Record<string, string>>({ ...blankAdd });
  const [langs, setLangs] = useState<string[]>([]);
  const [kycFile, setKycFile] = useState<File | null>(null);
  const [sowFile, setSowFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [moduleKey, setModuleKey] = useState("all");
  const activeModule = MODULES.find((m) => m.key === moduleKey) ?? MODULES[0];
  const [confirmDel, setConfirmDel] = useState<U | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetPw, setResetPw] = useState<{ id: string; email: string; password: string; emailed: boolean } | null>(null);

  const resetPassword = async (u: U) => {
    if (!confirm(`Reset password for ${u.display_name || u.email}?\n\nA new password will be generated and emailed to ${u.email}.`)) return;
    setResetting(true);
    try {
      const { data, error } = await (supabase.rpc as any)("admin_reset_user_password", { target: u.id, new_password: null });
      if (error) { toast.error("Reset failed", { description: error.message }); return; }
      const r = data as any;
      let emailed = false;
      try {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const { error: mailErr } = await supabase.functions.invoke("send-password-reset", { body: { email: r.email, name: r.name, password: r.password, loginUrl: origin + "/login" } });
        emailed = !mailErr;
        if (mailErr) toast.warning("Password reset, but the email couldn't be sent", { description: "Share the new password with the user manually." });
        else toast.success("Password reset — new password emailed", { description: r.email });
      } catch { toast.warning("Password reset, but email failed", { description: "Share the new password manually." }); }
      setResetPw({ id: u.id, email: r.email, password: r.password, emailed });
    } finally { setResetting(false); }
  };

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_list_users");
      if (error) { toast.error("Failed to load users", { description: error.message }); setRows([]); return; }
      setRows((data as U[]) ?? []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); ensureStaffSession().then((ok) => { if (ok) load(); }); }, []);

  const inModule = (u: U, m: Module) => m.key === "all" ? true : u.roles.some((r) => m.roles.includes(r));
  const moduleCount = (m: Module) => rows.filter((u) => inModule(u, m)).length;
  const filtered = useMemo(() => rows
    .filter((u) => inModule(u, activeModule))
    .filter((u) => roleFilter === "all" ? true : u.roles.includes(roleFilter))
    .filter((u) => {
      if (!q.trim()) return true; const s = q.toLowerCase();
      return [u.email, u.display_name, u.department, u.employee_code].filter(Boolean).some((v) => String(v).toLowerCase().includes(s));
    }), [rows, q, roleFilter, moduleKey]);

  const toggleActive = async (u: U) => {
    const { error } = await supabase.from("profiles").update({ is_active: !u.is_active }).eq("id", u.id);
    if (error) { toast.error(error.message); return; }
    toast.success(u.is_active ? "User deactivated" : "User activated");
    await load(); setDetail((d) => d && d.id === u.id ? { ...d, is_active: !u.is_active } : d);
  };
  const [distId, setDistId] = useState("");
  const [curDist, setCurDist] = useState<{ id: string; name: string } | null>(null);
  const [mapBusy, setMapBusy] = useState(false);
  const assignDistributor = async (u: U) => {
    if (!distId) { toast.error("Select a distributor"); return; }
    setMapBusy(true);
    try {
      const { error } = await supabase.rpc("set_retailer_distributor", { p_retailer: u.id, p_distributor: distId });
      if (error) { toast.error("Could not map", { description: error.message }); return; }
      const dp = rows.find((x) => x.id === distId);
      setCurDist({ id: distId, name: dp ? `${dp.display_name} (${dp.email})` : distId });
      toast.success("Retailer mapped to distributor"); setDistId("");
    } finally { setMapBusy(false); }
  };
  const unlinkDistributor = async (u: U) => {
    if (!confirm("Unlink this retailer from its current distributor? You can then map it to a new one.")) return;
    setMapBusy(true);
    try {
      const { error } = await supabase.rpc("unlink_retailer_distributor", { p_retailer: u.id });
      if (error) { toast.error("Unlink failed", { description: error.message }); return; }
      setCurDist(null); toast.success("Unlinked from distributor");
    } finally { setMapBusy(false); }
  };
  // Load the retailer's current distributor mapping whenever the detail opens.
  useEffect(() => {
    const u = detail;
    if (!u || !(u.roles.includes("retailer") || u.roles.includes("tro") || u.roles.includes("dro"))) { setCurDist(null); return; }
    let on = true;
    (async () => {
      const { data } = await supabase.from("profiles").select("distributor_id").eq("id", u.id).maybeSingle();
      if (!on) return;
      const did = (data as any)?.distributor_id;
      if (!did) { setCurDist(null); return; }
      const dp = rows.find((x) => x.id === did);
      setCurDist({ id: did, name: dp ? `${dp.display_name} (${dp.email})` : did });
    })();
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail?.id]);
  const setRole = async (u: U, role: string, addRole: boolean) => {
    const { error } = await supabase.rpc("admin_set_user_role", { target: u.id, _role: role, _add: addRole });
    if (error) { toast.error(error.message); return; }
    await load();
    setDetail((d) => d && d.id === u.id ? { ...d, roles: addRole ? [...new Set([...d.roles, role])] : d.roles.filter((r) => r !== role) } : d);
  };
  const deleteUser = async (u: U) => {
    setDeleting(true);
    try {
      const { error } = await (supabase.rpc as any)("admin_delete_user", { target: u.id });
      if (error) { toast.error("Delete failed", { description: error.message }); return; }
      toast.success("User deleted permanently");
      setConfirmDel(null); setDetail(null);
      setRows((rs) => rs.filter((x) => x.id !== u.id));
      await load();
    } finally { setDeleting(false); }
  };
  const uploadStaffDoc = async (uid: string, kind: string, file: File) => {
    const ext = (file.name.split(".").pop() || "bin").toLowerCase();
    const path = `${uid}/${kind}-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("staff-docs").upload(path, file, { upsert: false, contentType: file.type || undefined });
    if (error) { toast.error(`${kind} upload failed`, { description: error.message }); return null; }
    return path;
  };
  const createStaff = async () => {
    const uname = add.username.trim();
    if (!uname || !add.password || !add.name.trim()) { toast.error("Username, full name and password are required"); return; }
    if (!isBasic) {
      const missing: string[] = [];
      if (!add.gender) missing.push("Gender");
      if (!add.dob) missing.push("Date of Birth");
      if (!/^\d{10}$/.test(add.phone)) missing.push("Phone (10 digits)");
      if (!add.street_address.trim()) missing.push("Street Address");
      if (!/^\d{12}$/.test(add.aadhaar_number)) missing.push("Aadhaar Number (12 digits)");
      if (!add.bank_name.trim()) missing.push("Bank Name");
      if (!add.account_number.trim()) missing.push("Account Number");
      if (!add.ifsc.trim()) missing.push("IFSC Code");
      if (missing.length) { toast.error("Please complete required fields", { description: missing.join(", ") }); return; }
    }
    // Username → login email. A plain username maps to a synthetic address so
    // Supabase (email-based auth) can store it; staff sign in with the username.
    const loginEmail = uname.includes("@")
      ? uname.toLowerCase()
      : `${uname.toLowerCase().replace(/[^a-z0-9._-]/g, "")}@staff.bharatone.app`;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("create_staff_account", { _email: loginEmail, _password: add.password, _name: add.name, _role: add.role, _department: add.department || null, _designation: null, _employee_code: null, _phone: add.phone || null, _skills: add.skills || null, _experience: null, _education: add.qualification || null });
      if (error) { toast.error("Create failed", { description: error.message }); return; }
      const uid = (data as any)?.id as string | undefined;
      if (uid) {
        await supabase.from("profiles").update({
          gender: add.gender || null, dob: add.dob || null,
          street_address: add.street_address || null, district: add.district || null, state: add.state || null, pincode: add.pincode || null,
          aadhaar_number: add.aadhaar_number || null, pan_number: add.pan_number || null,
          bank_name: add.bank_name || null, account_number: add.account_number || null, ifsc: add.ifsc || null,
          languages: langs.length ? langs : null, emergency_contact_name: add.emergency_contact_name || null, emergency_contact_phone: add.emergency_contact_phone || null,
          is_active: true, sow_signed_date: add.sow_signed_date || null,
        }).eq("id", uid);
      }
      toast.success("User created", { description: `Login username: ${uname}` });
      setShowAdd(false); setAdd({ ...blankAdd }); setLangs([]);
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
    // Retailers/distributors keep their real data in the registration record — load it and
    // fill any blank profile fields from it (blank-if-blank).
    setReg(null);
    if (u.roles.includes("retailer") || u.roles.includes("distributor")) {
      (async () => {
        await ensureStaffSession();
        const { data } = await (supabase as any).rpc("admin_retailer_registration", { _uid: u.id });
        setReg(data ?? null);
        if (!data) return;
        const rg = data as any;
        const addr = [rg.building_shop_no, rg.street_area, rg.village_name, rg.gram_panchayat, rg.hobli_name, rg.city].filter(Boolean).join(", ");
        setEdit((prev) => prev ? {
          ...prev,
          phone: prev.phone || rg.mobile || "",
          dob: prev.dob || (rg.dob ?? ""),
          aadhaar_number: prev.aadhaar_number || (rg.aadhaar_number ?? ""),
          pan_number: prev.pan_number || (rg.pan_number ?? ""),
          bank_name: prev.bank_name || (rg.bank_name ?? ""),
          account_number: prev.account_number || (rg.account_number ?? ""),
          ifsc: prev.ifsc || (rg.ifsc ?? ""),
          district: prev.district || (rg.district ?? ""),
          state: prev.state || (rg.state ?? ""),
          pincode: prev.pincode || (rg.pincode ?? ""),
          street_address: prev.street_address || addr,
          employee_code: prev.employee_code || rg.username || rg.jsko_id || "",
        } : prev);
      })();
    }
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

  const acc = (u: any, key: string) => {
    switch (key) {
      case "name": return u.display_name || "";
      case "email": return u.email || "";
      case "roles": return (u.roles || []).join(",");
      case "dept": return u.department || "";
      case "status": return u.is_active ? 1 : 0;
      case "joined": return new Date(u.created_at).getTime();
      case "jsko": return u.employee_code || "";
      case "mobile": return u.phone || "";
      default: return "";
    }
  };
  const cf = useColumnFilters<any>();
  const colFiltered = useMemo(() => cf.apply(filtered, acc), [filtered, cf.filters]);
  const { sorted, sort, toggle } = useSort(colFiltered, acc);
  const isRetailer = moduleKey === "retailer";
  const colCount = 7 + (isRetailer ? 2 : 0);

  const downloadCsv = (headers: string[], rows: (string | number)[][], name: string) => {
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${name}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };
  const exportCsv = async () => {
    if (isRetailer) {
      // Full 29-column retailer (JSKO) export — identity/location/PAN/wallet filled; transaction columns blank.
      await ensureStaffSession();
      const { data, error } = await (supabase as any).rpc("admin_retailer_export");
      if (error) { toast.error("Export failed", { description: String(error.message || "").includes("NOT_ADMIN") ? "Please sign in with your admin account." : error.message }); return; }
      const list = (data as any[]) ?? [];
      if (!list.length) { toast.error("Nothing to export"); return; }
      const headers = ["Sl.no", "Date & Time", "User Name", "OLD JSKO ID", "New JSKO ID", "Full Name", "Phone Number", "Email ID", "Pan Number", "District", "Taluka", "Hobli", "Gram Panchayat", "Opening Wallet", "CR amount", "DR Amount", "Closing Wallet", "Type", "Service Amount", "SP Amount", "Deduction Amount", "GST", "TDS", "Reference Table", "Reference Id", "Order Id", "Tracking id", "Service Department", "Service Remarks"];
      const rows = list.map((r, i) => [
        i + 1,
        r.created_at ? new Date(r.created_at).toLocaleString("en-IN") : "",
        r.user_name ?? "", r.old_jsko_id ?? "", r.new_jsko_id ?? "", r.full_name ?? "",
        r.phone ?? "", r.email ?? "", r.pan_number ?? "", r.district ?? "", r.taluk ?? "", r.hobli_name ?? "", r.gram_panchayat ?? "",
        "", "", "", r.closing_wallet ?? "",
        "", "", "", "", "", "", "", "", "", "", "", "",
      ]);
      downloadCsv(headers, rows, "Retailer_JSKO_Staff");
      return;
    }
    if (!sorted.length) { toast.error("Nothing to export"); return; }
    const headers = ["Name", "Email", "JSKO ID / Code", "Mobile Number", "Roles", "Department", "Status", "Joined"];
    const rows = sorted.map((u: any) => [u.display_name || "", u.email || "", u.employee_code || "", u.phone || "", (u.roles || []).join(" "), u.department || "", u.is_active ? "Active" : "Inactive", new Date(u.created_at).toLocaleDateString("en-IN")]);
    downloadCsv(headers, rows, activeModule.label.replace(/[^a-z0-9]+/gi, "_"));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-border bg-card p-1.5">
        {MODULES.map((m) => {
          const on = m.key === moduleKey;
          return (
            <button key={m.key} onClick={() => { setModuleKey(m.key); setRoleFilter("all"); }}
              className={`flex items-center gap-1.5 rounded-lg px-3 h-9 text-xs font-semibold transition ${on ? "bg-india-green text-white" : "text-muted-foreground hover:bg-muted"}`}>
              {m.label}
              <span className={`rounded-full px-1.5 text-[10px] font-bold ${on ? "bg-white/25" : "bg-muted-foreground/10"}`}>{moduleCount(m)}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-lg bg-muted px-3 h-9 flex-1 min-w-[220px]">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input className="bg-transparent flex-1 text-sm outline-none" placeholder="Search name, email, dept, code…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="h-9 rounded-lg border border-border bg-card px-2 text-sm" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="all">{moduleKey === "all" ? "All roles" : "All roles in module"}</option>{activeModule.roles.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={!sorted.length}><Download className="h-4 w-4" /> Export</Button>
        <Button size="sm" className="bg-india-green text-white" onClick={() => { setAdd({ ...blankAdd, role: activeModule.defaultRole }); setLangs([]); setKycFile(null); setSowFile(null); setShowAdd(true); }}><UserPlus className="h-4 w-4" /> Add user</Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr><SortTh className="px-3 py-2.5" label="User" sortKey="name" sort={sort} onSort={toggle} /><SortTh className="px-3 py-2.5" label="Email" sortKey="email" sort={sort} onSort={toggle} />{isRetailer && <><SortTh className="px-3 py-2.5" label="JSKO ID" sortKey="jsko" sort={sort} onSort={toggle} /><SortTh className="px-3 py-2.5" label="Mobile" sortKey="mobile" sort={sort} onSort={toggle} /></>}<SortTh className="px-3 py-2.5" label="Roles" sortKey="roles" sort={sort} onSort={toggle} /><SortTh className="px-3 py-2.5" label="Department" sortKey="dept" sort={sort} onSort={toggle} /><SortTh className="px-3 py-2.5" label="Status" sortKey="status" sort={sort} onSort={toggle} /><SortTh className="px-3 py-2.5" label="Joined" sortKey="joined" sort={sort} onSort={toggle} /><th className="px-3 py-2.5 text-right">Actions</th></tr>
            <tr className="bg-muted/30">
              <FilterTh className="px-2 pb-2" filterKey="name" filters={cf.filters} setFilter={cf.setFilter} optionsFor={cf.optionsFor} />
              <FilterTh className="px-2 pb-2" filterKey="email" filters={cf.filters} setFilter={cf.setFilter} optionsFor={cf.optionsFor} />
              {isRetailer && <><FilterTh className="px-2 pb-2" filterKey="jsko" filters={cf.filters} setFilter={cf.setFilter} optionsFor={cf.optionsFor} /><FilterTh className="px-2 pb-2" filterKey="mobile" filters={cf.filters} setFilter={cf.setFilter} optionsFor={cf.optionsFor} /></>}
              <FilterTh className="px-2 pb-2" filterKey="roles" filters={cf.filters} setFilter={cf.setFilter} optionsFor={cf.optionsFor} />
              <FilterTh className="px-2 pb-2" filterKey="dept" filters={cf.filters} setFilter={cf.setFilter} optionsFor={cf.optionsFor} />
              <FilterTh className="px-2 pb-2" filterKey="status" filters={cf.filters} setFilter={cf.setFilter} optionsFor={cf.optionsFor} />
              <FilterTh className="px-2 pb-2" filterKey="joined" filters={cf.filters} setFilter={cf.setFilter} optionsFor={cf.optionsFor} />
              <th className="px-2 pb-2" />
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={colCount} className="px-3 py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></td></tr>
              : sorted.length === 0 ? <tr><td colSpan={colCount} className="px-3 py-10 text-center text-muted-foreground">No users found.</td></tr>
              : sorted.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="px-3 py-3 font-semibold">{u.display_name}</td>
                <td className="px-3 py-3 text-sm text-muted-foreground"><span className="break-all">{u.email}</span></td>
                {isRetailer && <><td className="px-3 py-3 font-mono text-xs">{u.employee_code || "—"}</td><td className="px-3 py-3 text-muted-foreground">{u.phone ? (/^\d{10}$/.test(u.phone) ? `+91 ${u.phone}` : u.phone) : "—"}</td></>}
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

              {reg && (
                <div className="space-y-2 rounded-xl border border-india-green/30 bg-india-green/5 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-india-green">From registration {reg.status ? `· ${reg.status}` : ""}</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <Info label="Full Name" v={[reg.first_name, reg.middle_name, reg.surname].filter(Boolean).join(" ")} />
                    <Info label="Mobile" v={reg.mobile} />
                    <Info label="Shop Name" v={reg.shop_name} />
                    <Info label="JSKO ID" v={reg.jsko_id} />
                    <Info label="PAN" v={reg.pan_number} />
                    <Info label="Aadhaar" v={reg.aadhaar_number} />
                  </div>
                </div>
              )}
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
                    <div><label className="text-[11px] font-semibold text-muted-foreground">Phone</label><input className={input} value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: sanitizeMobile(e.target.value) })} inputMode="numeric" maxLength={10} placeholder="Phone" /></div>
                    <div><label className="text-[11px] font-semibold text-muted-foreground">Alternate Phone</label><input className={input} value={edit.alt_phone} onChange={(e) => setEdit({ ...edit, alt_phone: sanitizeMobile(e.target.value) })} inputMode="numeric" maxLength={10} placeholder="Alt phone" /></div>
                    <div className="sm:col-span-2"><label className="text-[11px] font-semibold text-muted-foreground">Street Address</label><input className={input} value={edit.street_address} onChange={(e) => setEdit({ ...edit, street_address: e.target.value })} placeholder="House/Flat, Street, Area" /></div>
                    <div><label className="text-[11px] font-semibold text-muted-foreground">District</label><input className={input} value={edit.district} onChange={(e) => setEdit({ ...edit, district: e.target.value })} placeholder="District" /></div>
                    <div><label className="text-[11px] font-semibold text-muted-foreground">State</label><input className={input} value={edit.state} onChange={(e) => setEdit({ ...edit, state: e.target.value })} placeholder="State" /></div>
                    <div><label className="text-[11px] font-semibold text-muted-foreground">Pincode</label><input className={input} value={edit.pincode} onChange={(e) => setEdit({ ...edit, pincode: e.target.value })} placeholder="Pincode" /></div>
                    {(detail.roles.includes("retailer") || detail.roles.includes("distributor")) && <div><label className="text-[11px] font-semibold text-muted-foreground">JSKO ID / Code</label><input className={input} value={edit.employee_code} onChange={(e) => setEdit({ ...edit, employee_code: e.target.value })} placeholder="JSKO ID" /></div>}
                  </div>

                  <p className="pt-1 text-xs font-bold uppercase tracking-wider text-saffron">Identity & Bank</p>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <div><label className="text-[11px] font-semibold text-muted-foreground">Aadhaar Number</label><input className={input} value={edit.aadhaar_number} onChange={(e) => setEdit({ ...edit, aadhaar_number: e.target.value.replace(/\D/g, "").slice(0, 12) })} inputMode="numeric" maxLength={12} placeholder="XXXX XXXX XXXX" /></div>
                    <div><label className="text-[11px] font-semibold text-muted-foreground">PAN Number</label><input className={input} value={edit.pan_number} onChange={(e) => setEdit({ ...edit, pan_number: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10) })} maxLength={10} placeholder="ABCDE1234F" /></div>
                    <div><label className="text-[11px] font-semibold text-muted-foreground">Bank Name</label><input className={input} value={edit.bank_name} onChange={(e) => setEdit({ ...edit, bank_name: e.target.value })} placeholder="e.g. SBI" /></div>
                    <div><label className="text-[11px] font-semibold text-muted-foreground">Account Number</label><input className={input} value={edit.account_number} onChange={(e) => setEdit({ ...edit, account_number: e.target.value })} placeholder="Account number" /></div>
                    <div><label className="text-[11px] font-semibold text-muted-foreground">IFSC Code</label><input className={input} value={edit.ifsc} onChange={(e) => setEdit({ ...edit, ifsc: e.target.value.toUpperCase() })} placeholder="SBIN0001234" /></div>
                    <div><label className="text-[11px] font-semibold text-muted-foreground">UPI ID</label><input className={input} value={edit.upi_id} onChange={(e) => setEdit({ ...edit, upi_id: e.target.value })} placeholder="name@upi" /></div>
                  </div>

                  {!(detail.roles.includes("distributor") || detail.roles.includes("retailer")) && <>
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
                    <div><label className="text-[11px] font-semibold text-muted-foreground">Contact Phone</label><input className={input} value={edit.emergency_contact_phone} onChange={(e) => setEdit({ ...edit, emergency_contact_phone: sanitizeMobile(e.target.value) })} inputMode="numeric" maxLength={10} placeholder="+91 XXXXX XXXXX" /></div>
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
              {(detail.roles.includes("retailer") || detail.roles.includes("tro") || detail.roles.includes("dro")) && (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Map to Distributor (Retailer / TRO / DRO)</p>
                  {curDist ? (
                    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                      <span className="text-sm text-emerald-800">Mapped to <b>{curDist.name}</b></span>
                      <Button size="sm" variant="outline" className="ml-auto text-rose-600" disabled={mapBusy} onClick={() => unlinkDistributor(detail)}>{mapBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Unlink</Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <select className="h-9 flex-1 rounded-lg border border-border bg-background px-2 text-sm" value={distId} onChange={(e) => setDistId(e.target.value)}>
                        <option value="">Select distributor</option>
                        {rows.filter((x) => x.roles.includes("distributor")).map((x) => <option key={x.id} value={x.id}>{x.display_name} ({x.email})</option>)}
                      </select>
                      <Button size="sm" className="bg-india-green text-white" disabled={mapBusy} onClick={() => assignDistributor(detail)}>{mapBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Map</Button>
                    </div>
                  )}
                  <p className="mt-1 text-[11px] text-muted-foreground">A retailer can be mapped to only one distributor at a time. Unlink first to move it to a different distributor.</p>
                </div>
              )}
            </div>
          )}
          {detail && resetPw && resetPw.id === detail.id && (
            <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm">
              <p className="font-semibold text-emerald-800">Password reset {resetPw.emailed ? "— emailed to the user" : "(email not sent — share manually)"}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded-md border border-emerald-300 bg-white px-2 py-1 font-mono text-sm">{resetPw.password}</span>
                <button onClick={() => { try { navigator.clipboard.writeText(resetPw.password); toast.success("Copied"); } catch {} }} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-semibold hover:bg-muted"><Copy className="h-3.5 w-3.5" /> Copy</button>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {detail && <Button variant="outline" className="text-indigo-600" disabled={resetting} onClick={() => resetPassword(detail)}>{resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Reset password</Button>}
              {detail && <Button variant="outline" className={detail.is_active ? "text-rose-600" : "text-emerald-700"} onClick={() => toggleActive(detail)}>
                {detail.is_active ? "Deactivate" : "Activate"}</Button>}
              {detail && !detail.roles.includes("admin") && <Button variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => setConfirmDel(detail)}><Trash2 className="h-4 w-4" /> Delete</Button>}
            </div>
            <Button onClick={() => { setDetail(null); setResetPw(null); }}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add staff */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-saffron" /> Add New User</DialogTitle><DialogDescription>Distributor & Retailer need only basic details; staff roles show the full profile.</DialogDescription></DialogHeader>

          <Sec title="Role">
            <F label="Role *"><select className={input} value={add.role} onChange={(e) => setAdd({ ...add, role: e.target.value })}>{(moduleKey === "all" ? ALL_ROLES : activeModule.roles).map((r) => <option key={r} value={r}>{r}</option>)}</select></F>
          </Sec>

          <Sec title="Basic Information">
            <F label="Full Name *"><input className={input} placeholder="Enter full name" value={add.name} onChange={(e) => setAdd({ ...add, name: e.target.value })} /></F>
            {!isBasic && <>
            <F label="Gender *"><select className={input} value={add.gender} onChange={(e) => setAdd({ ...add, gender: e.target.value })}><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select></F>
            <F label="Date of Birth *"><input type="date" className={input} value={add.dob} onChange={(e) => setAdd({ ...add, dob: e.target.value })} /></F>
            <F label="Qualification"><input className={input} placeholder="e.g. B.Com, MBA" value={add.qualification} onChange={(e) => setAdd({ ...add, qualification: e.target.value })} /></F>
            </>}
          </Sec>

          <Sec title="Account & Login">
            <F label="Username *"><input className={input} autoComplete="off" placeholder="e.g. operator_ravi" value={add.username} onChange={(e) => setAdd({ ...add, username: e.target.value })} /></F>
            <F label="Password *"><input className={input} type="text" autoComplete="new-password" placeholder="Set a password" value={add.password} onChange={(e) => setAdd({ ...add, password: e.target.value })} /></F>
          </Sec>

          <Sec title="Contact Details">
            <F label="Phone *"><input className={input} placeholder="+91 98765 XXXXX" value={add.phone} onChange={(e) => setAdd({ ...add, phone: sanitizeMobile(e.target.value) })} inputMode="numeric" maxLength={10} /></F>
          </Sec>

          <Sec title="Address">
            <F label="Street Address *" full><input className={input} placeholder="House/Flat, Street, Area" value={add.street_address} onChange={(e) => setAdd({ ...add, street_address: e.target.value })} /></F>
            <F label="District"><input className={input} placeholder="District" value={add.district} onChange={(e) => setAdd({ ...add, district: e.target.value })} /></F>
            <F label="State"><input className={input} placeholder="State" value={add.state} onChange={(e) => setAdd({ ...add, state: e.target.value })} /></F>
            <F label="Pincode"><input className={input} placeholder="110001" value={add.pincode} onChange={(e) => setAdd({ ...add, pincode: e.target.value })} /></F>
          </Sec>

          {!isBasic && <Sec title="Identity Documents">
            <F label="Aadhaar Number *"><input className={input} placeholder="XXXX XXXX XXXX" value={add.aadhaar_number} onChange={(e) => setAdd({ ...add, aadhaar_number: e.target.value.replace(/\D/g, "").slice(0, 12) })} inputMode="numeric" maxLength={12} /></F>
            <F label="PAN Number"><input className={input} placeholder="ABCDE1234F" value={add.pan_number} onChange={(e) => setAdd({ ...add, pan_number: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10) })} maxLength={10} /></F>
          </Sec>}

          {!isBasic && <Sec title="Bank & Payment">
            <F label="Bank Name *"><input className={input} placeholder="e.g. SBI, HDFC" value={add.bank_name} onChange={(e) => setAdd({ ...add, bank_name: e.target.value })} /></F>
            <F label="Account Number *"><input className={input} placeholder="Account number" value={add.account_number} onChange={(e) => setAdd({ ...add, account_number: e.target.value })} /></F>
            <F label="IFSC Code *"><input className={input} placeholder="SBIN0001234" value={add.ifsc} onChange={(e) => setAdd({ ...add, ifsc: e.target.value.toUpperCase() })} /></F>
          </Sec>}

          {!isBasic && <div className="mt-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Languages Known</p>
            <div className="flex flex-wrap gap-1.5">
              {LANGS.map((l) => { const on = langs.includes(l); return <button key={l} type="button" onClick={() => setLangs((p) => on ? p.filter((x) => x !== l) : [...p, l])} className={`rounded-full px-3 h-8 text-xs font-semibold transition ${on ? "bg-india-green text-white" : "border border-border bg-card hover:bg-muted"}`}>{l}</button>; })}
            </div>
          </div>}

          {!isBasic && <Sec title="Emergency Contact">
            <F label="Contact Name"><input className={input} placeholder="Name (Relation)" value={add.emergency_contact_name} onChange={(e) => setAdd({ ...add, emergency_contact_name: e.target.value })} /></F>
            <F label="Contact Phone"><input className={input} placeholder="+91 XXXXX XXXXX" value={add.emergency_contact_phone} onChange={(e) => setAdd({ ...add, emergency_contact_phone: sanitizeMobile(e.target.value) })} inputMode="numeric" maxLength={10} /></F>
          </Sec>}

          {!isBasic && <Sec title="Documentation">
            <F label="Signed Date"><input type="date" className={input} value={add.sow_signed_date} onChange={(e) => setAdd({ ...add, sow_signed_date: e.target.value })} /></F>
          </Sec>}

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setShowAdd(false)}><X className="h-4 w-4" /> Cancel</Button>
            <Button className="bg-india-green text-white" onClick={createStaff} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Create user</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm permanent delete */}
      <Dialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600"><AlertTriangle className="h-5 w-5" /> Delete user permanently</DialogTitle>
            <DialogDescription>
              This permanently removes <span className="font-semibold text-foreground">{confirmDel?.display_name}</span> ({confirmDel?.email}), their login, profile and role assignments. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDel(null)} disabled={deleting}>Cancel</Button>
            <Button className="bg-rose-600 text-white hover:bg-rose-700" onClick={() => confirmDel && deleteUser(confirmDel)} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete permanently
            </Button>
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
