import { useMemo, useState } from "react";
import { BadgeCheck, Ban, Download, Eye, KeyRound, MoreHorizontal, Pencil, Plus, RotateCcw, Search, UserCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { downloadCsv } from "@/lib/admin-actions";
import { cn } from "@/lib/utils";

type UserStatus = "Active" | "Invited" | "Review" | "Suspended";
type ManagedUser = { id: string; name: string; email: string; role: string; department: string; status: UserStatus; verified: boolean; lastActive: string };
type UserDraft = Pick<ManagedUser, "name" | "email" | "role" | "department">;

const INITIAL_USERS: ManagedUser[] = [
  { id: "USR-41028", name: "Anita Rao", email: "anita.rao@bharatone.in", role: "Distributor", department: "Network", status: "Active", verified: true, lastActive: "Now" },
  { id: "USR-41027", name: "Vikram Singh", email: "vikram.singh@bharatone.in", role: "Retailer", department: "Sales", status: "Active", verified: true, lastActive: "3 min ago" },
  { id: "USR-41026", name: "Neha Patel", email: "neha.patel@bharatone.in", role: "BDE", department: "Growth", status: "Review", verified: false, lastActive: "18 min ago" },
  { id: "USR-41025", name: "Arjun Kumar", email: "arjun.kumar@bharatone.in", role: "Retailer", department: "Sales", status: "Suspended", verified: true, lastActive: "2 hours ago" },
  { id: "USR-41024", name: "Sara Khan", email: "sara.khan@bharatone.in", role: "Accountant", department: "Finance", status: "Active", verified: true, lastActive: "Yesterday" },
];
const EMPTY_DRAFT: UserDraft = { name: "", email: "", role: "Retailer", department: "Sales" };
const ROLES = ["Retailer", "Distributor", "BDE", "Accountant", "KYC Reviewer", "Regional Manager"];
const DEPARTMENTS = ["Sales", "Network", "Growth", "Finance", "Compliance", "Operations"];

function StatusPill({ status }: { status: UserStatus }) {
  return <span className={cn("rounded-full px-2 py-1 text-[9px] font-extrabold", status === "Active" ? "bg-admin-success-soft text-admin-success" : status === "Suspended" ? "bg-admin-danger-soft text-admin-danger" : "bg-admin-warning-soft text-admin-warning")}>{status}</span>;
}

export function UserManagementWorkflow() {
  const [users, setUsers] = useState(INITIAL_USERS);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"All" | UserStatus>("All");
  const [draft, setDraft] = useState<UserDraft>(EMPTY_DRAFT);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inspected, setInspected] = useState<ManagedUser | null>(null);
  const [pendingStatus, setPendingStatus] = useState<{ user: ManagedUser; status: UserStatus } | null>(null);
  const [events, setEvents] = useState(["User directory reviewed", "USR-41025 access suspended", "USR-41028 role confirmed"]);

  const filtered = useMemo(() => users.filter((user) => {
    const matches = `${user.id} ${user.name} ${user.email} ${user.role} ${user.department}`.toLowerCase().includes(query.toLowerCase());
    return matches && (status === "All" || user.status === status);
  }), [query, status, users]);
  const addEvent = (event: string) => setEvents((current) => [event, ...current].slice(0, 6));
  const openCreate = () => { setEditingId(null); setDraft(EMPTY_DRAFT); setEditorOpen(true); };
  const openEdit = (user: ManagedUser) => { setEditingId(user.id); setDraft({ name: user.name, email: user.email, role: user.role, department: user.department }); setEditorOpen(true); };
  const saveUser = () => {
    if (!draft.name.trim() || !draft.email.includes("@")) { toast.error("Enter a valid name and email address"); return; }
    if (editingId) {
      setUsers((current) => current.map((user) => user.id === editingId ? { ...user, ...draft } : user));
      addEvent(`${editingId} profile and role updated`);
      toast.success("User updated");
    } else {
      const id = `USR-${41029 + users.length}`;
      setUsers((current) => [{ id, ...draft, status: "Invited", verified: false, lastActive: "Never" }, ...current]);
      addEvent(`${id} invited as ${draft.role}`);
      toast.success("Invitation sent", { description: draft.email });
    }
    setEditorOpen(false);
  };
  const changeStatus = () => {
    if (!pendingStatus) return;
    setUsers((current) => current.map((user) => user.id === pendingStatus.user.id ? { ...user, status: pendingStatus.status } : user));
    addEvent(`${pendingStatus.user.id} access changed to ${pendingStatus.status}`);
    toast.success(`Access changed to ${pendingStatus.status}`);
    setPendingStatus(null);
  };
  const resetPassword = (user: ManagedUser) => { addEvent(`Password reset requested for ${user.id}`); toast.success("Password reset link sent", { description: user.email }); };

  const activeCount = users.filter((user) => user.status === "Active").length;
  const verifiedCount = users.filter((user) => user.verified).length;
  return <div className="space-y-5">
    <section className="overflow-hidden rounded-2xl border border-border bg-admin-panel text-admin-panel-foreground shadow-elev">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between lg:p-6">
        <div><p className="text-[9px] font-extrabold uppercase tracking-[0.22em] text-admin">Identity command</p><h2 className="mt-2 font-display text-2xl font-extrabold">User Management</h2><p className="mt-2 max-w-2xl text-xs text-admin-panel-foreground/55">Manage identity lifecycle, role assignment, verification, invitations and access enforcement.</p></div>
        <div className="flex gap-2"><Button variant="outline" size="sm" className="border-admin-panel-foreground/15 bg-admin-panel-foreground/5 text-admin-panel-foreground hover:bg-admin-panel-foreground/10 hover:text-admin-panel-foreground" onClick={() => { downloadCsv("user-directory.csv", ["ID", "Name", "Email", "Role", "Department", "Status"], filtered.map((user) => [user.id, user.name, user.email, user.role, user.department, user.status])); toast.success("User directory exported"); }}><Download /> Export</Button><Button size="sm" className="bg-admin text-admin-foreground hover:bg-admin/90" onClick={openCreate}><Plus /> Add user</Button></div>
      </div>
      <div className="grid grid-cols-2 border-t border-admin-panel-foreground/10 lg:grid-cols-4">{[
        ["Total users", users.length, Users], ["Active access", activeCount, UserCheck], ["Verified", verifiedCount, BadgeCheck], ["Needs attention", users.length - activeCount, Ban],
      ].map(([label, value, Icon]) => { const MetricIcon = Icon as typeof Users; return <div key={String(label)} className="border-r border-admin-panel-foreground/10 p-4 last:border-r-0"><div className="flex items-center justify-between"><p className="text-[9px] font-bold uppercase tracking-wider text-admin-panel-foreground/40">{label as string}</p><MetricIcon className="h-4 w-4 text-admin-panel-foreground/35" /></div><p className="mt-2 font-display text-2xl font-extrabold">{value as number}</p></div>; })}</div>
    </section>

    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <div className="grid gap-3 border-b border-border p-4 md:grid-cols-[minmax(0,1fr)_180px]"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" placeholder="Search name, ID, email or role…" /></div><Select value={status} onValueChange={(value) => setStatus(value as "All" | UserStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["All", "Active", "Invited", "Review", "Suspended"].map((item) => <SelectItem key={item} value={item}>{item === "All" ? "All access states" : item}</SelectItem>)}</SelectContent></Select></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left"><thead className="bg-muted/45 text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground"><tr>{["Identity", "Role & team", "Verification", "Access", "Last active", ""].map((head, index) => <th key={`${head}-${index}`} className="px-4 py-3">{head}</th>)}</tr></thead><tbody className="divide-y divide-border">{filtered.map((user) => <tr key={user.id} className="text-[11px] hover:bg-muted/30">
          <td className="px-4 py-3"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-admin-soft font-extrabold text-admin">{user.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span><div><p className="font-extrabold">{user.name}</p><p className="text-[9px] text-muted-foreground">{user.id} · {user.email}</p></div></div></td>
          <td className="px-4 py-3"><p className="font-bold">{user.role}</p><p className="text-[9px] text-muted-foreground">{user.department}</p></td><td className="px-4 py-3"><span className={cn("text-[9px] font-bold", user.verified ? "text-admin-success" : "text-admin-warning")}>{user.verified ? "✓ Verified" : "○ Pending"}</span></td><td className="px-4 py-3"><StatusPill status={user.status} /></td><td className="px-4 py-3 text-muted-foreground">{user.lastActive}</td>
          <td className="px-4 py-3"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => setInspected(user)}><Eye /> View profile</DropdownMenuItem><DropdownMenuItem onClick={() => openEdit(user)}><Pencil /> Edit user</DropdownMenuItem><DropdownMenuItem onClick={() => resetPassword(user)}><KeyRound /> Reset password</DropdownMenuItem>{user.status === "Invited" && <DropdownMenuItem onClick={() => { addEvent(`Invitation resent to ${user.email}`); toast.success("Invitation resent"); }}><RotateCcw /> Resend invite</DropdownMenuItem>}<DropdownMenuSeparator />{user.status === "Suspended" ? <DropdownMenuItem onClick={() => setPendingStatus({ user, status: "Active" })}><UserCheck /> Restore access</DropdownMenuItem> : <DropdownMenuItem className="text-destructive" onClick={() => setPendingStatus({ user, status: "Suspended" })}><Ban /> Suspend access</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu></td>
        </tr>)}</tbody></table></div><div className="border-t border-border px-4 py-3 text-[9px] text-muted-foreground">Showing {filtered.length} of {users.length} users</div>
      </div>
      <aside className="rounded-2xl border border-border bg-card p-4 shadow-soft"><h3 className="text-sm font-extrabold">Access activity</h3><p className="mt-1 text-[10px] text-muted-foreground">Latest administration events</p><div className="mt-4 space-y-3">{events.map((event, index) => <div key={`${event}-${index}`} className="flex gap-3"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-admin" /><div><p className="text-[10px] font-semibold leading-relaxed">{event}</p><p className="mt-1 text-[8px] text-muted-foreground">{index === 0 ? "Just now" : `${index * 8} min ago`} · Super Admin</p></div></div>)}</div></aside>
    </section>

    <Dialog open={editorOpen} onOpenChange={setEditorOpen}><DialogContent><DialogHeader><DialogTitle>{editingId ? "Edit user" : "Invite a new user"}</DialogTitle><DialogDescription>{editingId ? "Update profile information and organizational access." : "Create an identity and send a secure activation invitation."}</DialogDescription></DialogHeader><div className="grid gap-4 py-2"><div className="grid gap-2"><Label htmlFor="managed-name">Full name</Label><Input id="managed-name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /></div><div className="grid gap-2"><Label htmlFor="managed-email">Work email</Label><Input id="managed-email" type="email" value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} /></div><div className="grid grid-cols-2 gap-3"><div className="grid gap-2"><Label>Role</Label><Select value={draft.role} onValueChange={(role) => setDraft((current) => ({ ...current, role }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ROLES.map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-2"><Label>Department</Label><Select value={draft.department} onValueChange={(department) => setDraft((current) => ({ ...current, department }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DEPARTMENTS.map((department) => <SelectItem key={department} value={department}>{department}</SelectItem>)}</SelectContent></Select></div></div></div><DialogFooter><Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button><Button onClick={saveUser}>{editingId ? "Save changes" : "Send invitation"}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={Boolean(inspected)} onOpenChange={(open) => !open && setInspected(null)}><DialogContent><DialogHeader><DialogTitle>{inspected?.name}</DialogTitle><DialogDescription>{inspected?.id} · Full identity and access profile</DialogDescription></DialogHeader>{inspected && <div className="grid grid-cols-2 gap-3 text-xs">{[["Email", inspected.email], ["Role", inspected.role], ["Department", inspected.department], ["Access", inspected.status], ["Verification", inspected.verified ? "Verified" : "Pending"], ["Last active", inspected.lastActive]].map(([label, value]) => <div key={label} className="rounded-xl bg-muted/50 p-3"><p className="text-[9px] uppercase text-muted-foreground">{label}</p><p className="mt-1 font-bold">{value}</p></div>)}</div>}<DialogFooter><Button variant="outline" onClick={() => inspected && resetPassword(inspected)}>Reset password</Button><Button onClick={() => { if (inspected) openEdit(inspected); setInspected(null); }}>Edit user</Button></DialogFooter></DialogContent></Dialog>
    <AlertDialog open={Boolean(pendingStatus)} onOpenChange={(open) => !open && setPendingStatus(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{pendingStatus?.status === "Suspended" ? "Suspend user access?" : "Restore user access?"}</AlertDialogTitle><AlertDialogDescription>{pendingStatus?.status === "Suspended" ? `${pendingStatus.user.name} will immediately lose access to assigned modules. Their data and history will be retained.` : `${pendingStatus?.user.name} will regain access using their existing role.`}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className={pendingStatus?.status === "Suspended" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""} onClick={changeStatus}>Confirm change</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}