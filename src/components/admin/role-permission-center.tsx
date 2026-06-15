import { useMemo, useState } from "react";
import {
  BadgeIndianRupee, Building2, CheckCircle2, ClipboardCheck, Headphones,
  Landmark, LayoutGrid, Lock, Network, Search, ShieldCheck, Store, Truck,
  UserCog, Users, Wallet, XCircle, type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { downloadCsv } from "@/lib/admin-actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Perm = "view" | "create" | "edit" | "approve" | "delete";
const PERMS: { key: Perm; label: string }[] = [
  { key: "view", label: "View" },
  { key: "create", label: "Create" },
  { key: "edit", label: "Edit" },
  { key: "approve", label: "Approve" },
  { key: "delete", label: "Delete" },
];

const MODULES = [
  "Dashboard", "Transactions", "Wallet", "KYC", "Retailers", "Reports",
  "Settlements", "Support", "Services", "Settings",
] as const;
type ModuleName = (typeof MODULES)[number];

type Role = {
  id: string;
  name: string;
  portal: string;
  icon: LucideIcon;
  tone: "admin" | "success" | "warning" | "danger";
  users: number;
  active: boolean;
  scope: string;
  modules: Record<ModuleName, boolean>;
  perms: Record<ModuleName, Partial<Record<Perm, boolean>>>;
};

const all = (v: boolean) => MODULES.reduce((acc, m) => ({ ...acc, [m]: v }), {} as Record<ModuleName, boolean>);
const permFor = (mods: Record<ModuleName, boolean>, set: Perm[]): Record<ModuleName, Partial<Record<Perm, boolean>>> =>
  MODULES.reduce((acc, m) => ({ ...acc, [m]: mods[m] ? set.reduce((p, k) => ({ ...p, [k]: true }), {}) : {} }), {} as Record<ModuleName, Partial<Record<Perm, boolean>>>);

const mods = (on: ModuleName[]) => MODULES.reduce((acc, m) => ({ ...acc, [m]: on.includes(m) }), {} as Record<ModuleName, boolean>);

function buildRole(p: Omit<Role, "perms"> & { permSet: Perm[] }): Role {
  const { permSet, ...rest } = p;
  return { ...rest, perms: permFor(rest.modules, permSet) };
}

const INITIAL_ROLES: Role[] = [
  buildRole({ id: "RL-01", name: "Super Admin", portal: "Admin", icon: ShieldCheck, tone: "admin", users: 4, active: true, scope: "Full system", modules: all(true), permSet: ["view", "create", "edit", "approve", "delete"] }),
  buildRole({ id: "RL-02", name: "Retailer", portal: "Retailer", icon: Store, tone: "success", users: 8412, active: true, scope: "Own outlet", modules: mods(["Dashboard", "Transactions", "Wallet", "Services", "Support", "Reports"]), permSet: ["view", "create"] }),
  buildRole({ id: "RL-03", name: "Distributor", portal: "Distributor", icon: Network, tone: "admin", users: 612, active: true, scope: "Network", modules: mods(["Dashboard", "Transactions", "Wallet", "Retailers", "Reports", "Settlements", "Support"]), permSet: ["view", "create", "edit"] }),
  buildRole({ id: "RL-04", name: "Master Distributor", portal: "Distributor", icon: Building2, tone: "admin", users: 84, active: true, scope: "Region", modules: mods(["Dashboard", "Transactions", "Wallet", "Retailers", "Reports", "Settlements", "Services", "Support"]), permSet: ["view", "create", "edit", "approve"] }),
  buildRole({ id: "RL-05", name: "Business Dev (BDE)", portal: "Field", icon: Users, tone: "warning", users: 146, active: true, scope: "Leads & merchants", modules: mods(["Dashboard", "Retailers", "Reports", "Support"]), permSet: ["view", "create", "edit"] }),
  buildRole({ id: "RL-06", name: "HR Staff", portal: "Operations", icon: UserCog, tone: "warning", users: 22, active: true, scope: "People ops", modules: mods(["Dashboard", "Reports", "Settings", "Support"]), permSet: ["view", "create", "edit", "approve"] }),
  buildRole({ id: "RL-07", name: "QC Reviewer", portal: "Operations", icon: ClipboardCheck, tone: "warning", users: 38, active: true, scope: "KYC queue", modules: mods(["Dashboard", "KYC", "Reports"]), permSet: ["view", "approve"] }),
  buildRole({ id: "RL-08", name: "Accountant", portal: "Finance", icon: Landmark, tone: "success", users: 18, active: true, scope: "Ledgers", modules: mods(["Dashboard", "Wallet", "Settlements", "Reports"]), permSet: ["view", "edit", "approve"] }),
  buildRole({ id: "RL-09", name: "Regional Officer (DRO/TRO)", portal: "Field", icon: Truck, tone: "warning", users: 96, active: true, scope: "Territory", modules: mods(["Dashboard", "Retailers", "Services", "Reports", "Support"]), permSet: ["view", "create", "edit"] }),
  buildRole({ id: "RL-10", name: "Telecaller", portal: "Support", icon: Headphones, tone: "danger", users: 54, active: false, scope: "Applications", modules: mods(["Dashboard", "Support", "Services"]), permSet: ["view", "create"] }),
];

const PORTAL_TONES: Record<Role["tone"], string> = {
  admin: "bg-admin-soft text-admin",
  success: "bg-admin-success-soft text-admin-success",
  warning: "bg-admin-warning-soft text-admin-warning",
  danger: "bg-admin-danger-soft text-admin-danger",
};

export function RolePermissionCenter() {
  const [roles, setRoles] = useState<Role[]>(INITIAL_ROLES);
  const [tab, setTab] = useState("directory");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>(INITIAL_ROLES[1].id);

  const filtered = useMemo(() => {
    const t = query.trim().toLowerCase();
    if (!t) return roles;
    return roles.filter((r) => r.name.toLowerCase().includes(t) || r.portal.toLowerCase().includes(t));
  }, [roles, query]);

  const selected = roles.find((r) => r.id === selectedId) ?? roles[0];
  const stats = useMemo(() => ({
    portals: new Set(roles.map((r) => r.portal)).size,
    roles: roles.length,
    active: roles.filter((r) => r.active).length,
    users: roles.reduce((s, r) => s + r.users, 0),
  }), [roles]);

  const toggleActive = (id: string) => {
    setRoles((prev) => prev.map((r) => r.id === id ? { ...r, active: !r.active } : r));
    const r = roles.find((x) => x.id === id);
    toast.success(`${r?.name} ${r?.active ? "disabled" : "enabled"}`);
  };

  const toggleModule = (id: string, m: ModuleName) => {
    setRoles((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      const on = !r.modules[m];
      return {
        ...r,
        modules: { ...r.modules, [m]: on },
        perms: { ...r.perms, [m]: on ? { view: true } : {} },
      };
    }));
  };

  const togglePerm = (id: string, m: ModuleName, p: Perm) => {
    setRoles((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      if (!r.modules[m]) return r;
      const current = r.perms[m]?.[p] ?? false;
      return { ...r, perms: { ...r.perms, [m]: { ...r.perms[m], [p]: !current } } };
    }));
  };

  const exportMatrix = () => {
    const headers = ["Role", "Portal", "Module", ...PERMS.map((p) => p.label)];
    const rows = roles.flatMap((r) => MODULES.filter((m) => r.modules[m]).map((m) =>
      [r.name, r.portal, m, ...PERMS.map((p) => (r.perms[m]?.[p.key] ? "Yes" : "No"))]));
    downloadCsv("role-permission-matrix.csv", headers, rows);
    toast.success("Permission matrix exported");
  };

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Connected portals", value: String(stats.portals), icon: LayoutGrid },
          { label: "Defined roles", value: String(stats.roles), icon: ShieldCheck },
          { label: "Active roles", value: String(stats.active), icon: CheckCircle2 },
          { label: "Total users", value: stats.users.toLocaleString("en-IN"), icon: Users },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <div className="flex items-start justify-between"><span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">{s.label}</span><span className="grid h-9 w-9 place-items-center rounded-xl bg-admin-soft text-admin"><Icon className="h-4 w-4" /></span></div>
              <p className="mt-3 font-display text-2xl font-extrabold tracking-tight">{s.value}</p>
            </div>
          );
        })}
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="directory">Role & portal directory</TabsTrigger>
            <TabsTrigger value="modules">Module control</TabsTrigger>
            <TabsTrigger value="matrix">Permissions matrix</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3"><Search className="h-4 w-4 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search roles…" className="h-9 w-44 border-0 bg-transparent px-0 focus-visible:ring-0" /></div>
          <Button size="sm" className="bg-admin text-admin-foreground hover:bg-admin/90" onClick={exportMatrix}>Export matrix</Button>
        </div>
      </div>

      {tab === "directory" && (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => {
            const Icon = r.icon;
            const moduleCount = MODULES.filter((m) => r.modules[m]).length;
            return (
              <div key={r.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-elev">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className={cn("grid h-11 w-11 place-items-center rounded-xl", PORTAL_TONES[r.tone])}><Icon className="h-5 w-5" /></span>
                    <div><p className="text-sm font-extrabold">{r.name}</p><p className="text-[10px] font-semibold text-muted-foreground">{r.portal} portal · {r.scope}</p></div>
                  </div>
                  <Switch checked={r.active} onCheckedChange={() => toggleActive(r.id)} />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-muted/50 py-2"><p className="font-display text-lg font-extrabold">{r.users.toLocaleString("en-IN")}</p><p className="text-[9px] font-bold uppercase text-muted-foreground">Users</p></div>
                  <div className="rounded-lg bg-muted/50 py-2"><p className="font-display text-lg font-extrabold">{moduleCount}</p><p className="text-[9px] font-bold uppercase text-muted-foreground">Modules</p></div>
                  <div className="rounded-lg bg-muted/50 py-2"><p className={cn("font-display text-lg font-extrabold", r.active ? "text-admin-success" : "text-admin-danger")}>{r.active ? "On" : "Off"}</p><p className="text-[9px] font-bold uppercase text-muted-foreground">Status</p></div>
                </div>
                <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => { setSelectedId(r.id); setTab("modules"); }}><Lock className="h-3.5 w-3.5" /> Configure access</Button>
              </div>
            );
          })}
        </section>
      )}

      {tab === "modules" && (
        <section className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className="space-y-1.5 rounded-2xl border border-border bg-card p-2 shadow-soft">
            {roles.map((r) => {
              const Icon = r.icon;
              return (
                <button key={r.id} onClick={() => setSelectedId(r.id)} className={cn("flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition", selectedId === r.id ? "bg-admin text-admin-foreground" : "hover:bg-muted")}>
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold">{r.name}</span><span className={cn("block text-[9px]", selectedId === r.id ? "text-admin-foreground/70" : "text-muted-foreground")}>{r.portal}</span></span>
                  {!r.active && <span className="text-[8px] font-extrabold uppercase opacity-70">off</span>}
                </button>
              );
            })}
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-soft lg:p-5">
            <div className="flex items-center justify-between">
              <div><h2 className="text-sm font-extrabold">{selected.name} · module access</h2><p className="text-[10px] text-muted-foreground">Toggle which modules this role can reach in its portal</p></div>
              <span className={cn("rounded-full px-2.5 py-1 text-[9px] font-extrabold", PORTAL_TONES[selected.tone])}>{MODULES.filter((m) => selected.modules[m]).length}/{MODULES.length} enabled</span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {MODULES.map((m) => (
                <div key={m} className={cn("flex items-center justify-between rounded-xl border px-3 py-2.5", selected.modules[m] ? "border-admin/30 bg-admin-soft/40" : "border-border bg-muted/30")}>
                  <span className="text-xs font-bold">{m}</span>
                  <Switch checked={selected.modules[m]} onCheckedChange={() => toggleModule(selected.id, m)} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {tab === "matrix" && (
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
          <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
            <div><h2 className="text-sm font-extrabold">{selected.name} · permissions matrix</h2><p className="text-[10px] text-muted-foreground">Granular view / create / edit / approve / delete per module</p></div>
            <div className="w-48"><select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-muted/50 px-2 text-xs font-semibold outline-none">{roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead className="bg-muted/40 text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground"><tr><th className="px-4 py-2.5">Module</th>{PERMS.map((p) => <th key={p.key} className="px-4 py-2.5 text-center">{p.label}</th>)}</tr></thead>
              <tbody className="divide-y divide-border">
                {MODULES.map((m) => {
                  const enabled = selected.modules[m];
                  return (
                    <tr key={m} className={cn("text-[11px]", enabled ? "hover:bg-muted/30" : "opacity-40")}>
                      <td className="px-4 py-3 font-bold">{m}{!enabled && <span className="ml-1.5 text-[9px] font-semibold text-muted-foreground">(module off)</span>}</td>
                      {PERMS.map((p) => {
                        const on = selected.perms[m]?.[p.key] ?? false;
                        return (
                          <td key={p.key} className="px-4 py-3 text-center">
                            <button disabled={!enabled} onClick={() => togglePerm(selected.id, m, p.key)} className="grid place-items-center mx-auto disabled:cursor-not-allowed">
                              {on ? <CheckCircle2 className="h-4 w-4 text-admin-success" /> : <XCircle className="h-4 w-4 text-muted-foreground/40" />}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

export const ROLE_PORTAL_ICONS = { BadgeIndianRupee, Wallet };