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
  employee_code: string | null; phone: string | null; skills: string | null; experience: string | null; education: string | null; is_active: boolean; created_at: string; roles: string[];
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
  const [add, setAdd] = useState({ email: "", password: "", name: "", role: "accountant", department: "", designation: "", employee_code: "", phone: "", skills: "", experience: "", education: "" });
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
  const createStaff = async () => {
    if (!add.email || !add.password || !add.name) { toast.error("Email, password and name are required"); return; }
    setBusy(true);
    try {
      const { error } = await supabase.rpc("create_staff_account", { _email: add.email, _password: add.password, _name: add.name, _role: add.role, _department: add.department || null, _designation: add.designation || null, _employee_code: add.employee_code || null, _phone: add.phone || null, _skills: add.skills || null, _experience: add.experience || null, _education: add.education || null });
      if (error) { toast.error("Create failed", { description: error.message }); return; }
      toast.success("Staff account created");
      setShowAdd(false); setAdd({ email: "", password: "", name: "", role: "accountant", department: "", designation: "", employee_code: "", phone: "", skills: "", experience: "", education: "" });
      await load();
    } finally { setBusy(false); }
  };
  const [edit, setEdit] = useState<{ phone: string; skills: string; experience: string; education: string; department: string; designation: string; employee_code: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const openDetail = (u: U) => { setDetail(u); setEdit({ phone: u.phone ?? "", skills: u.skills ?? "", experience: u.experience ?? "", education: u.education ?? "", department: u.department ?? "", designation: u.designation ?? "", employee_code: u.employee_code ?? "" }); };
  const saveProfile = async (u: U) => {
    if (!edit) return;
    setSavingProfile(true);
    const payload = { phone: edit.phone || null, skills: edit.skills || null, experience: edit.experience || null, education: edit.education || null, department: edit.department || null, designation: edit.designation || null, employee_code: edit.employee_code || null };
    const { error } = await supabase.from("profiles").update(payload).eq("id", u.id);
    setSavingProfile(false);
    if (error) return toast.error("Save failed", { description: error.message });
    toast.success("Staff profile updated");
    setRows((rs) => rs.map((x) => x.id === u.id ? { ...x, ...payload } : x));
    setDetail((d) => d ? { ...d, ...payload } : d);
  };
  const input = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30";

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
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{detail?.display_name}</DialogTitle><DialogDescription>{detail?.email}</DialogDescription></DialogHeader>
          {detail && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Info label="Joined" v={new Date(detail.created_at).toLocaleString("en-IN")} />
                <Info label="Status" v={detail.is_active ? "Active" : "Inactive"} />
              </div>
              {edit && (
                <div className="rounded-xl border border-border bg-muted/20 p-3">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Staff Profile</p>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <div><label className="text-[11px] font-semibold text-muted-foreground">Contact Number</label><input className={input} value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} placeholder="Phone number" /></div>
                    <div><label className="text-[11px] font-semibold text-muted-foreground">Employee Code</label><input className={input} value={edit.employee_code} onChange={(e) => setEdit({ ...edit, employee_code: e.target.value })} placeholder="Code" /></div>
                    <div><label className="text-[11px] font-semibold text-muted-foreground">Department</label><input className={input} value={edit.department} onChange={(e) => setEdit({ ...edit, department: e.target.value })} placeholder="Department" /></div>
                    <div><label className="text-[11px] font-semibold text-muted-foreground">Designation</label><input className={input} value={edit.designation} onChange={(e) => setEdit({ ...edit, designation: e.target.value })} placeholder="Designation" /></div>
                    <div className="sm:col-span-2"><label className="text-[11px] font-semibold text-muted-foreground">Education Qualification</label><input className={input} value={edit.education} onChange={(e) => setEdit({ ...edit, education: e.target.value })} placeholder="e.g. B.Com, MBA" /></div>
                    <div className="sm:col-span-2"><label className="text-[11px] font-semibold text-muted-foreground">Experience</label><input className={input} value={edit.experience} onChange={(e) => setEdit({ ...edit, experience: e.target.value })} placeholder="e.g. 3 years in banking ops" /></div>
                    <div className="sm:col-span-2"><label className="text-[11px] font-semibold text-muted-foreground">Skills</label><textarea rows={2} className={input + " h-auto py-2"} value={edit.skills} onChange={(e) => setEdit({ ...edit, skills: e.target.value })} placeholder="e.g. AEPS, KYC verification, customer support" /></div>
                  </div>
                  <Button size="sm" className="mt-3 bg-india-green text-white" disabled={savingProfile} onClick={() => saveProfile(detail)}>{savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save profile</Button>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-india-green" /> Create staff account</DialogTitle><DialogDescription>Creates a login with the chosen role.</DialogDescription></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className={input} placeholder="Full name *" value={add.name} onChange={(e) => setAdd({ ...add, name: e.target.value })} />
            <input className={input} placeholder="Email *" value={add.email} onChange={(e) => setAdd({ ...add, email: e.target.value })} />
            <div className="flex gap-2 sm:col-span-2">
              <input className={input} placeholder="Temporary password *" value={add.password} onChange={(e) => setAdd({ ...add, password: e.target.value })} />
              <Button type="button" variant="outline" onClick={() => setAdd({ ...add, password: genPwd() })}>Generate</Button>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground">Role *</label>
              <select className={input} value={add.role} onChange={(e) => setAdd({ ...add, role: e.target.value })}>{ALL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</select>
            </div>
            <input className={input} placeholder="Department" value={add.department} onChange={(e) => setAdd({ ...add, department: e.target.value })} />
            <input className={input} placeholder="Designation" value={add.designation} onChange={(e) => setAdd({ ...add, designation: e.target.value })} />
            <input className={input} placeholder="Employee / Agent code" value={add.employee_code} onChange={(e) => setAdd({ ...add, employee_code: e.target.value })} />
            <input className={input} placeholder="Contact number" value={add.phone} onChange={(e) => setAdd({ ...add, phone: e.target.value })} />
            <input className={input} placeholder="Education qualification" value={add.education} onChange={(e) => setAdd({ ...add, education: e.target.value })} />
            <input className={input} placeholder="Experience (e.g. 3 years)" value={add.experience} onChange={(e) => setAdd({ ...add, experience: e.target.value })} />
            <input className={input + " sm:col-span-2"} placeholder="Skills (comma separated)" value={add.skills} onChange={(e) => setAdd({ ...add, skills: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}><X className="h-4 w-4" /> Cancel</Button>
            <Button className="bg-india-green text-white" onClick={createStaff} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, v }: { label: string; v: unknown }) {
  return <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p><p className="font-semibold">{v ? String(v) : "—"}</p></div>;
}
