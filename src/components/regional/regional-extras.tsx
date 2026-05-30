import { useState } from "react";
import { toast } from "sonner";
import {
  Bell, Mail, Phone, MapPin, ShieldCheck, BadgeCheck, Building2, CalendarDays, Clock,
  TrendingUp, Users, Layers, Activity, AlertTriangle, CheckCircle2, Info, Filter, Camera, Save,
} from "lucide-react";
import { RegionalShell, type RegionalConfig } from "@/components/regional/regional-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { StatCard } from "@/components/retailer/stat-card";

const accentTone = (cfg: RegionalConfig): "rose" | "saffron" => (cfg.accent === "rose" ? "rose" : "saffron");
const accentBtn = (cfg: RegionalConfig) => (cfg.accent === "rose" ? "bg-rose-600 hover:bg-rose-700" : "bg-amber-600 hover:bg-amber-700");
const accentGrad = (cfg: RegionalConfig) => (cfg.accent === "rose" ? "from-rose-500 to-pink-600" : "from-amber-500 to-orange-600");
const accentSoft = (cfg: RegionalConfig) => (cfg.accent === "rose" ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-amber-50 text-amber-800 border-amber-200");

/* ---------------- Profile ---------------- */
export function RegionalProfile({ cfg }: { cfg: RegionalConfig }) {
  const [name, setName] = useState(cfg.user.name);
  const [phone, setPhone] = useState(cfg.user.phone);
  const [email, setEmail] = useState(`${cfg.user.name.toLowerCase()}@bharatone.in`);
  const inputCls = "w-full rounded-lg border border-input bg-background px-3 h-10 text-sm shadow-soft outline-none focus-visible:ring-4 focus-visible:ring-slate-300/40";

  return (
    <RegionalShell cfg={cfg}>
      <div className="space-y-6">
        <PageHeader
          icon={<BadgeCheck className="h-5 w-5" />}
          title="My Profile"
          subtitle={`Your ${cfg.user.role} account and regional assignment.`}
          badge={<span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${accentSoft(cfg)}`}><ShieldCheck className="h-3 w-3" /> Verified Officer</span>}
        />

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Identity card */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-soft text-center">
            <div className="relative inline-block">
              <div className={`h-24 w-24 rounded-2xl bg-gradient-to-br ${accentGrad(cfg)} text-white flex items-center justify-center text-4xl font-extrabold mx-auto`}>{cfg.user.initial}</div>
              <button className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-white border border-border shadow-elev flex items-center justify-center hover:bg-muted" aria-label="Change photo">
                <Camera className="h-4 w-4 text-slate-600" />
              </button>
            </div>
            <h3 className="mt-3 text-lg font-extrabold">{cfg.user.name}</h3>
            <p className="text-sm text-muted-foreground">{cfg.user.role} · {cfg.shortName}</p>
            <div className="mt-4 space-y-2 text-left">
              <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground" /> {cfg.user.phone}</div>
              <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted-foreground" /> {email}</div>
              <div className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-muted-foreground" /> {cfg.scope}</div>
              <div className="flex items-center gap-2 text-sm"><Building2 className="h-4 w-4 text-muted-foreground" /> BharatOne Network</div>
            </div>
          </div>

          {/* Editable details */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 shadow-soft">
            <h3 className="text-sm font-bold mb-4">Account Details</h3>
            <form
              onSubmit={(e) => { e.preventDefault(); toast.success("Profile updated successfully"); }}
              className="grid sm:grid-cols-2 gap-4"
            >
              <div><label className="text-xs font-semibold text-slate-600">Full Name</label><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></div>
              <div><label className="text-xs font-semibold text-slate-600">Phone</label><input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} /></div>
              <div><label className="text-xs font-semibold text-slate-600">Email</label><input value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} /></div>
              <div><label className="text-xs font-semibold text-slate-600">Role</label><input value={cfg.user.role} disabled className={`${inputCls} bg-muted text-muted-foreground`} /></div>
              <div className="sm:col-span-2"><label className="text-xs font-semibold text-slate-600">Region of Assignment</label><input value={cfg.scope} disabled className={`${inputCls} bg-muted text-muted-foreground`} /></div>
              <div className="sm:col-span-2">
                <button type="submit" className={`h-10 px-5 rounded-lg text-white text-sm font-bold shadow-elev ${accentBtn(cfg)} flex items-center gap-1.5`}><Save className="h-4 w-4" /> Save Changes</button>
              </div>
            </form>
          </div>
        </div>

        {/* Officer stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Tenure" value="2.4 yrs" delta={{ value: "since Jan 2024", positive: true }} icon={<CalendarDays className="h-5 w-5" />} tone={accentTone(cfg)} />
          <StatCard label="Reports Viewed" value="1,284" delta={{ value: "this quarter", positive: true }} icon={<Layers className="h-5 w-5" />} tone="violet" />
          <StatCard label="Retailers Tracked" value="312" delta={{ value: "in region", positive: true }} icon={<Users className="h-5 w-5" />} tone="green" />
          <StatCard label="Last Active" value="Just now" delta={{ value: "online", positive: true }} icon={<Clock className="h-5 w-5" />} tone="sky" />
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Access & Permissions</h3>
          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            {[
              { label: "View Reports", on: true },
              { label: "Export Data", on: true },
              { label: "Retailer Activity", on: true },
              { label: "Approve Requests", on: false },
              { label: "Edit Records", on: false },
              { label: "Manage Users", on: false },
            ].map((p) => (
              <div key={p.label} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <span className="font-medium">{p.label}</span>
                {p.on ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <span className="text-[11px] font-bold text-muted-foreground">Restricted</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </RegionalShell>
  );
}

/* ---------------- Notifications ---------------- */
type Notif = { id: number; type: "alert" | "info" | "success" | "trend"; title: string; body: string; time: string; unread: boolean };

const baseNotifs = (scope: string): Notif[] => [
  { id: 1, type: "trend", title: "Daily services up 12.4%", body: `Service volume across ${scope} rose vs the weekly average.`, time: "8m ago", unread: true },
  { id: 2, type: "alert", title: "Retailer inactivity flagged", body: "3 retailers reported zero transactions today.", time: "32m ago", unread: true },
  { id: 3, type: "success", title: "Weekly report ready", body: "Your region's weekly performance report has been generated.", time: "1h ago", unread: true },
  { id: 4, type: "info", title: "New retailer onboarded", body: "Arjun Net World joined the network in your region.", time: "3h ago", unread: false },
  { id: 5, type: "trend", title: "AEPS is top service", body: "AEPS leads service mix at 27% of today's volume.", time: "5h ago", unread: false },
  { id: 6, type: "info", title: "System maintenance", body: "Scheduled maintenance on Sunday 2:00–3:00 AM IST.", time: "1d ago", unread: false },
];

const TYPE_META: Record<Notif["type"], { icon: React.ReactNode; cls: string; label: string }> = {
  alert: { icon: <AlertTriangle className="h-4 w-4" />, cls: "bg-amber-500", label: "Alert" },
  info: { icon: <Info className="h-4 w-4" />, cls: "bg-sky-500", label: "Info" },
  success: { icon: <CheckCircle2 className="h-4 w-4" />, cls: "bg-emerald-500", label: "Success" },
  trend: { icon: <TrendingUp className="h-4 w-4" />, cls: "bg-violet-500", label: "Trend" },
};

export function RegionalNotifications({ cfg }: { cfg: RegionalConfig }) {
  const [items, setItems] = useState<Notif[]>(() => baseNotifs(cfg.scope));
  const [filter, setFilter] = useState<"all" | "unread" | Notif["type"]>("all");

  const unread = items.filter((i) => i.unread).length;
  const filtered = items.filter((i) => {
    if (filter === "all") return true;
    if (filter === "unread") return i.unread;
    return i.type === filter;
  });

  const markAll = () => { setItems((p) => p.map((i) => ({ ...i, unread: false }))); toast.success("All marked as read"); };
  const toggle = (id: number) => setItems((p) => p.map((i) => (i.id === id ? { ...i, unread: false } : i)));

  const chips: { key: typeof filter; label: string }[] = [
    { key: "all", label: "All" }, { key: "unread", label: `Unread (${unread})` },
    { key: "alert", label: "Alerts" }, { key: "trend", label: "Trends" }, { key: "success", label: "Reports" }, { key: "info", label: "Info" },
  ];

  return (
    <RegionalShell cfg={cfg}>
      <div className="space-y-5">
        <PageHeader
          icon={<Bell className="h-5 w-5" />}
          title="Notifications"
          subtitle={`Activity and alerts across ${cfg.scope}.`}
          actions={
            <button onClick={markAll} className={`h-9 px-4 rounded-lg text-white text-sm font-semibold shadow-elev ${accentBtn(cfg)}`}>Mark all read</button>
          }
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Unread" value={String(unread)} delta={{ value: "need attention", positive: false }} icon={<Bell className="h-5 w-5" />} tone={accentTone(cfg)} />
          <StatCard label="Alerts" value={String(items.filter((i) => i.type === "alert").length)} delta={{ value: "active", positive: false }} icon={<AlertTriangle className="h-5 w-5" />} tone="violet" />
          <StatCard label="Reports" value={String(items.filter((i) => i.type === "success").length)} delta={{ value: "ready", positive: true }} icon={<CheckCircle2 className="h-5 w-5" />} tone="green" />
          <StatCard label="Total" value={String(items.length)} delta={{ value: "last 7 days", positive: true }} icon={<Activity className="h-5 w-5" />} tone="sky" />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {chips.map((c) => (
            <button
              key={c.key as string}
              onClick={() => setFilter(c.key)}
              className={`h-8 px-3 rounded-full text-xs font-semibold border transition ${filter === c.key ? `${accentBtn(cfg)} text-white border-transparent` : "bg-white border-border text-slate-700 hover:bg-muted"}`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden divide-y divide-border">
          {filtered.map((n) => {
            const m = TYPE_META[n.type];
            return (
              <button key={n.id} onClick={() => toggle(n.id)} className={`w-full text-left px-4 py-3.5 flex items-start gap-3 hover:bg-muted/40 transition ${n.unread ? "bg-slate-50/60" : ""}`}>
                <span className={`mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center text-white shrink-0 ${m.cls}`}>{m.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold truncate">{n.title}</p>
                    {n.unread && <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />}
                    <span className="ml-auto text-[11px] text-muted-foreground shrink-0">{n.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && <div className="px-4 py-10 text-center text-sm text-muted-foreground">No notifications in this filter.</div>}
        </div>
      </div>
    </RegionalShell>
  );
}
