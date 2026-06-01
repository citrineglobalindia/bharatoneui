import { useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "@tanstack/react-router";
import { format, subDays, isAfter, isBefore, isSameDay, parseISO } from "date-fns";
import {
  AreaChart, Area, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";
import {
  Users, Building2, MapPinned, ArrowLeft, Phone, Store, Activity,
  Layers, Coins, IndianRupee, ChevronRight, ShieldCheck, Settings as SettingsIcon,
  Bell, Globe, Lock, Search, UserCog,
} from "lucide-react";
import { toast } from "sonner";
import { DistributorShell } from "@/components/distributor/distributor-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { StatCard } from "@/components/retailer/stat-card";
import {
  RETAILERS, OFFICERS, SERVICE_META, WEEKLY, inr, serviceTotal,
  retailerCommission, officerSummary,
} from "@/components/distributor/distributor-data";
import type { ServiceKey } from "@/components/distributor/distributor-data";

const HEX = "#0ea5e9";

/* ---------------- Officers (DRO / TRO) ---------------- */
export function DistributorOfficers() {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"all" | "DRO" | "TRO">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return OFFICERS.filter((o) => {
      if (role !== "all" && o.role !== role) return false;
      if (!q) return true;
      return [o.name, o.phone, o.scope, o.id].some((v) => v.toLowerCase().includes(q));
    });
  }, [query, role]);

  return (
    <DistributorShell>
      <div className="space-y-5">
        <PageHeader
          icon={<UserCog className="h-5 w-5" />}
          title="DRO & TRO Officers"
          subtitle="All district and taluk officers mapped under you. Open any officer for full details."
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 h-9 flex-1 min-w-[220px]">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search officer, scope, phone…" className="bg-transparent flex-1 text-sm outline-none" />
          </div>
          {(["all", "DRO", "TRO"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`h-9 rounded-lg border px-3 text-sm font-semibold capitalize ${role === r ? "bg-slate-900 text-white border-slate-900" : "bg-white border-border text-slate-700"}`}
            >
              {r === "all" ? "All" : r}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((o) => {
            const s = officerSummary(o.id);
            const isDro = o.role === "DRO";
            const parent = o.parentId ? OFFICERS.find((p) => p.id === o.parentId) : undefined;
            return (
              <Link
                key={o.id}
                to="/distributor/officers/$id"
                params={{ id: o.id }}
                className="rounded-xl border border-border bg-card p-4 shadow-soft hover:shadow-elev transition group"
              >
                <div className="flex items-center gap-3">
                  <div className={`h-11 w-11 rounded-xl text-white flex items-center justify-center font-extrabold ${isDro ? "bg-gradient-to-br from-rose-500 to-pink-600" : "bg-gradient-to-br from-amber-500 to-orange-600"}`}>{o.name[0]}</div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold flex items-center gap-1.5 truncate">{o.name}
                      <span className={`text-[9px] font-bold px-1 py-0.5 rounded uppercase ${isDro ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-800"}`}>{o.role}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate"><MapPinned className="h-3 w-3 shrink-0" />{o.scope}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-slate-700" />
                </div>
                {parent && <p className="text-[10px] text-muted-foreground mt-2">Reports to <span className="font-semibold text-slate-700">{parent.name}</span> (DRO)</p>}
                <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                  <div className="rounded-lg bg-muted/40 py-1.5"><p className="text-sm font-extrabold">{s.retailers}</p><p className="text-[9px] uppercase text-muted-foreground">Retailers</p></div>
                  <div className="rounded-lg bg-muted/40 py-1.5"><p className="text-sm font-extrabold">{s.services}</p><p className="text-[9px] uppercase text-muted-foreground">Services</p></div>
                  <div className="rounded-lg bg-muted/40 py-1.5"><p className="text-sm font-extrabold text-emerald-600">{inr(s.commission)}</p><p className="text-[9px] uppercase text-muted-foreground">Comm.</p></div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </DistributorShell>
  );
}

/* ---------------- Officer detail ---------------- */
export function DistributorOfficerDetail() {
  const { id } = useParams({ from: "/distributor/officers/$id" });
  const navigate = useNavigate();
  const officer = OFFICERS.find((o) => o.id === id);

  if (!officer) {
    return (
      <DistributorShell>
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="font-bold">Officer not found</p>
          <Link to="/distributor/officers" className="text-sky-600 text-sm font-semibold">Back to officers</Link>
        </div>
      </DistributorShell>
    );
  }

  const isDro = officer.role === "DRO";
  const s = officerSummary(officer.id);
  const parent = officer.parentId ? OFFICERS.find((p) => p.id === officer.parentId) : undefined;
  const childTros = OFFICERS.filter((o) => o.parentId === officer.id);
  const rets = RETAILERS.filter((r) => (isDro ? r.droId === officer.id : r.troId === officer.id));

  return (
    <DistributorShell>
      <div className="space-y-5">
        <button onClick={() => navigate({ to: "/distributor/officers" })} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> All officers
        </button>

        <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
          <div className={`px-5 py-5 border-b border-border bg-gradient-to-r ${isDro ? "from-rose-50" : "from-amber-50"} to-white flex flex-wrap items-center gap-4`}>
            <div className={`h-16 w-16 rounded-2xl text-white flex items-center justify-center text-2xl font-extrabold ${isDro ? "bg-gradient-to-br from-rose-500 to-pink-600" : "bg-gradient-to-br from-amber-500 to-orange-600"}`}>{officer.name[0]}</div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-extrabold flex items-center gap-2">{officer.name}
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${isDro ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-800"}`}>{officer.role}</span>
              </h1>
              <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{officer.scope}</span>
                <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{officer.phone}</span>
                <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" />{officer.id}</span>
              </p>
              {parent && <p className="text-[11px] text-muted-foreground mt-1">Reports to <Link to="/distributor/officers/$id" params={{ id: parent.id }} className="font-semibold text-sky-600">{parent.name}</Link> · DRO</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4">
            <StatCard label="Retailers" value={String(s.retailers)} delta={{ value: `${s.active} active`, positive: true }} icon={<Users className="h-5 w-5" />} tone="sky" />
            <StatCard label="Services Today" value={s.services.toLocaleString("en-IN")} icon={<Layers className="h-5 w-5" />} tone="violet" />
            <StatCard label="Commission" value={inr(s.commission)} icon={<Coins className="h-5 w-5" />} tone="green" />
            <StatCard label="Revenue" value={inr(s.revenue)} icon={<IndianRupee className="h-5 w-5" />} tone="saffron" />
          </div>
        </div>

        {isDro && childTros.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <h3 className="text-sm font-bold mb-3">TROs under {officer.name}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {childTros.map((t) => {
                const ts = officerSummary(t.id);
                return (
                  <Link key={t.id} to="/distributor/officers/$id" params={{ id: t.id }} className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2 hover:bg-muted/40">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center text-xs font-extrabold">{t.name[0]}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold truncate">{t.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{t.scope} · {ts.retailers} retailers</p>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-700">{inr(ts.commission)}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
          <div className="px-4 py-3 border-b border-border"><h3 className="text-sm font-bold">Mapped Retailers ({rets.length})</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2.5 font-bold">Retailer</th>
                  <th className="text-left px-3 py-2.5 font-bold">Taluk</th>
                  <th className="text-right px-3 py-2.5 font-bold">Services</th>
                  <th className="text-right px-4 py-2.5 font-bold">Commission</th>
                </tr>
              </thead>
              <tbody>
                {rets.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30 cursor-pointer" onClick={() => navigate({ to: "/distributor/retailers/$id", params: { id: r.id } })}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${r.active ? "bg-emerald-500" : "bg-slate-300"}`} />
                        <div className="leading-tight"><p className="font-semibold">{r.name}</p><p className="text-[11px] text-muted-foreground">{r.shop}</p></div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs">{r.taluk}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{serviceTotal(r)}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-emerald-700">{inr(retailerCommission(r))}</td>
                  </tr>
                ))}
                {rets.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No retailers mapped.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DistributorShell>
  );
}

/* ---------------- Retailer detail ---------------- */
export function DistributorRetailerDetail() {
  const { id } = useParams({ from: "/distributor/retailers/$id" });
  const navigate = useNavigate();
  const retailer = RETAILERS.find((r) => r.id === id);

  if (!retailer) {
    return (
      <DistributorShell>
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="font-bold">Retailer not found</p>
          <Link to="/distributor/retailers" className="text-sky-600 text-sm font-semibold">Back to retailers</Link>
        </div>
      </DistributorShell>
    );
  }

  const dro = OFFICERS.find((o) => o.id === retailer.droId);
  const tro = OFFICERS.find((o) => o.id === retailer.troId);
  const svc = SERVICE_META.map((s) => ({ key: s.key, label: s.label, color: s.color, count: retailer.today[s.key], commission: retailer.today[s.key] * s.rate }));

  return (
    <DistributorShell>
      <div className="space-y-5">
        <button onClick={() => navigate({ to: "/distributor/retailers" })} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> All retailers
        </button>

        <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
          <div className="px-5 py-5 border-b border-border bg-gradient-to-r from-sky-50 to-white flex flex-wrap items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white flex items-center justify-center text-2xl font-extrabold">{retailer.name[0]}</div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-extrabold flex items-center gap-2">{retailer.name}
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${retailer.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{retailer.active ? "Active" : "Inactive"}</span>
              </h1>
              <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                <span className="flex items-center gap-1"><Store className="h-3.5 w-3.5" />{retailer.shop}</span>
                <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{retailer.phone}</span>
                <span className="flex items-center gap-1"><MapPinned className="h-3.5 w-3.5" />{retailer.taluk}, {retailer.district}</span>
                <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" />{retailer.id}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
            <Link to="/distributor/officers/$id" params={{ id: retailer.droId }} className="flex items-center gap-3 rounded-lg border border-border bg-rose-50/40 px-3 py-2.5 hover:bg-rose-50">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 text-white flex items-center justify-center text-xs font-extrabold">{dro?.name[0]}</div>
              <div className="min-w-0 flex-1"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">District Officer (DRO)</p><p className="text-sm font-bold truncate">{dro?.name}</p><p className="text-[11px] text-muted-foreground truncate">{dro?.scope} · {dro?.phone}</p></div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link to="/distributor/officers/$id" params={{ id: retailer.troId }} className="flex items-center gap-3 rounded-lg border border-border bg-amber-50/40 px-3 py-2.5 hover:bg-amber-50">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center text-xs font-extrabold">{tro?.name[0]}</div>
              <div className="min-w-0 flex-1"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Taluk Officer (TRO)</p><p className="text-sm font-bold truncate">{tro?.name}</p><p className="text-[11px] text-muted-foreground truncate">{tro?.scope} · {tro?.phone}</p></div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Services Today" value={String(serviceTotal(retailer))} icon={<Layers className="h-5 w-5" />} tone="sky" />
          <StatCard label="This Week" value={retailer.week.toLocaleString("en-IN")} icon={<Activity className="h-5 w-5" />} tone="violet" />
          <StatCard label="This Month" value={retailer.month.toLocaleString("en-IN")} icon={<Activity className="h-5 w-5" />} tone="saffron" />
          <StatCard label="Commission Today" value={inr(retailerCommission(retailer))} icon={<Coins className="h-5 w-5" />} tone="green" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <h3 className="text-sm font-bold mb-3">Services Applied Today</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={svc}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="key" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {svc.map((m) => <Cell key={m.key} fill={m.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <h3 className="text-sm font-bold mb-3">Network Weekly Trend</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <AreaChart data={WEEKLY}>
                  <defs>
                    <linearGradient id="rdetail" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={HEX} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={HEX} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="services" stroke={HEX} fill="url(#rdetail)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
          <div className="px-4 py-3 border-b border-border"><h3 className="text-sm font-bold">Service Breakdown</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2.5 font-bold">Service</th>
                  <th className="text-right px-3 py-2.5 font-bold">Count Today</th>
                  <th className="text-right px-4 py-2.5 font-bold">Commission</th>
                </tr>
              </thead>
              <tbody>
                {svc.map((m) => (
                  <tr key={m.key} className="border-t border-border">
                    <td className="px-4 py-2.5"><span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: m.color }} />{m.label}</span></td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{m.count}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-emerald-700">{inr(m.commission)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DistributorShell>
  );
}

/* ---------------- Settings ---------------- */
function Toggle({ label, desc, on, onClick }: { label: string; desc: string; on: boolean; onClick: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div><p className="text-sm font-semibold">{label}</p><p className="text-[11px] text-muted-foreground">{desc}</p></div>
      <button onClick={onClick} className={`h-6 w-11 rounded-full transition-colors relative shrink-0 ${on ? "bg-sky-500" : "bg-slate-300"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

export function DistributorSettings() {
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [twoFa, setTwoFa] = useState(true);

  return (
    <DistributorShell>
      <div className="space-y-5 max-w-3xl">
        <PageHeader icon={<SettingsIcon className="h-5 w-5" />} title="Settings" subtitle="Manage your account preferences, notifications and security." />

        <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
          <h3 className="text-sm font-bold flex items-center gap-2 mb-1"><Bell className="h-4 w-4 text-sky-600" /> Notifications</h3>
          <div className="divide-y divide-border">
            <Toggle label="Email alerts" desc="Daily network summary to your email" on={emailAlerts} onClick={() => setEmailAlerts((v) => !v)} />
            <Toggle label="SMS alerts" desc="Critical alerts via SMS" on={smsAlerts} onClick={() => setSmsAlerts((v) => !v)} />
            <Toggle label="Weekly digest" desc="Consolidated weekly performance report" on={weeklyDigest} onClick={() => setWeeklyDigest((v) => !v)} />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
          <h3 className="text-sm font-bold flex items-center gap-2 mb-1"><Lock className="h-4 w-4 text-rose-600" /> Security</h3>
          <div className="divide-y divide-border">
            <Toggle label="Two-factor authentication" desc="Require OTP on every new login" on={twoFa} onClick={() => setTwoFa((v) => !v)} />
          </div>
          <button onClick={() => toast.success("Password reset link sent")} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-4 h-9 text-sm font-semibold hover:bg-muted">
            Change password
          </button>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
          <h3 className="text-sm font-bold flex items-center gap-2 mb-3"><Globe className="h-4 w-4 text-emerald-600" /> Preferences</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block"><span className="text-[11px] font-semibold text-muted-foreground">Language</span>
              <select className="mt-1 w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"><option>English</option><option>हिंदी</option><option>ಕನ್ನಡ</option></select>
            </label>
            <label className="block"><span className="text-[11px] font-semibold text-muted-foreground">Time zone</span>
              <select className="mt-1 w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"><option>IST (UTC+5:30)</option></select>
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={() => toast.success("Settings saved")} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 text-white px-5 h-10 text-sm font-semibold shadow-elev hover:bg-slate-800">Save changes</button>
        </div>
      </div>
    </DistributorShell>
  );
}

/* ---------------- Service Detail ---------------- */
const HOURS = ["8a", "9a", "10a", "11a", "12p", "1p", "2p", "3p", "4p", "5p", "6p", "7p"];
const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function DistributorServiceDetail() {
  const { key } = useParams({ from: "/distributor/services/$key" });
  const navigate = useNavigate();
  const meta = SERVICE_META.find((s) => s.key === (key as ServiceKey));

  const data = useMemo(() => {
    if (!meta) return null;
    const rows = RETAILERS.map((r) => ({
      r,
      count: r.today[meta.key],
      commission: r.today[meta.key] * meta.rate,
    }));
    const totalCount = rows.reduce((s, x) => s + x.count, 0);
    const totalComm = rows.reduce((s, x) => s + x.commission, 0);
    const seed = hashStr(meta.key);
    const timeline = HOURS.map((h, i) => {
      const v = (seed >> (i % 12)) & 7;
      const live = totalCount > 0 && v > 1;
      return { hour: h, status: live ? 1 : 0, txns: live ? (v + 1) * Math.max(1, Math.round(totalCount / 18)) : 0 };
    });
    const adoption = WEEK_DAYS.map((d, i) => ({
      day: d,
      shops: Math.max(0, Math.round((totalCount / 4) * (0.6 + ((seed >> i) & 3) * 0.18))),
    }));
    const ranked = [...rows].filter((x) => x.count > 0).sort((a, b) => b.commission - a.commission);
    const liveHours = timeline.filter((t) => t.status === 1).length;
    return { rows, totalCount, totalComm, timeline, adoption, ranked, liveHours };
  }, [meta]);

  if (!meta || !data) {
    return (
      <DistributorShell>
        <div className="p-8 text-center">
          <p className="text-sm text-muted-foreground">Service not found.</p>
          <button onClick={() => navigate({ to: "/distributor/services" })} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 text-white px-4 h-9 text-sm font-semibold">
            <ArrowLeft className="h-4 w-4" /> Back to services
          </button>
        </div>
      </DistributorShell>
    );
  }

  const oname = (id: string) => OFFICERS.find((o) => o.id === id)?.name ?? "—";
  const live = data.totalCount > 0;

  return (
    <DistributorShell>
      <div className="space-y-6">
        <button onClick={() => navigate({ to: "/distributor/services" })} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to services
        </button>

        <PageHeader
          icon={<Layers className="h-5 w-5" />}
          title={meta.label}
          subtitle={`Live status, adoption and commission for ${meta.key} across the network.`}
          badge={
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${live ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-slate-200 bg-slate-100 text-slate-500"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
              {live ? "Live now" : "Offline"}
            </span>
          }
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Txns Today" value={String(data.totalCount)} icon={<Activity className="h-5 w-5" />} tone="sky" />
          <StatCard label="Active Shops" value={String(data.ranked.length)} icon={<Store className="h-5 w-5" />} tone="violet" />
          <StatCard label="Rate / Txn" value={inr(meta.rate)} icon={<IndianRupee className="h-5 w-5" />} tone="saffron" />
          <StatCard label="Commission Today" value={inr(data.totalComm)} icon={<Coins className="h-5 w-5" />} tone="green" />
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
          <h3 className="text-sm font-bold mb-3">Live / Offline Timeline (Today)</h3>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {data.timeline.map((t) => (
              <div key={t.hour} className="flex flex-col items-center gap-1">
                <div
                  title={`${t.hour}: ${t.status ? `${t.txns} txns` : "offline"}`}
                  className={`h-9 w-9 rounded-md ${t.status ? "" : "bg-slate-200"}`}
                  style={t.status ? { background: meta.color } : undefined}
                />
                <span className="text-[10px] text-muted-foreground">{t.hour}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            <span className="font-semibold text-emerald-700">{data.liveHours} hrs live</span> · {HOURS.length - data.liveHours} hrs offline today
          </p>
          <div className="h-40 mt-3">
            <ResponsiveContainer>
              <BarChart data={data.timeline}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="txns" radius={[4, 4, 0, 0]} fill={meta.color} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <h3 className="text-sm font-bold mb-3">Adoption Trend (Shops / day)</h3>
            <div className="h-60">
              <ResponsiveContainer>
                <AreaChart data={data.adoption}>
                  <defs>
                    <linearGradient id="svc-adopt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={meta.color} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={meta.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="shops" stroke={meta.color} fill="url(#svc-adopt)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <h3 className="text-sm font-bold mb-2">Rate Card</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2.5">
                <span className="text-muted-foreground">Commission per transaction</span>
                <span className="font-bold">{inr(meta.rate)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2.5">
                <span className="text-muted-foreground">Transactions today</span>
                <span className="font-bold tabular-nums">{data.totalCount}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2.5">
                <span className="text-emerald-700 font-semibold">Total commission today</span>
                <span className="font-extrabold text-emerald-700">{inr(data.totalComm)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
          <div className="px-4 py-3 border-b border-border"><h3 className="text-sm font-bold">Commission Breakdown by Retailer</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2.5 font-bold">Retailer</th>
                  <th className="text-left px-3 py-2.5 font-bold">DRO / TRO</th>
                  <th className="text-right px-3 py-2.5 font-bold">Txns</th>
                  <th className="text-right px-3 py-2.5 font-bold">Rate</th>
                  <th className="text-right px-4 py-2.5 font-bold">Commission</th>
                </tr>
              </thead>
              <tbody>
                {data.ranked.map(({ r, count, commission }) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30 cursor-pointer" onClick={() => navigate({ to: "/distributor/retailers/$id", params: { id: r.id } })}>
                    <td className="px-4 py-2.5">
                      <p className="font-semibold">{r.name}</p>
                      <p className="text-[11px] text-muted-foreground">{r.shop}</p>
                    </td>
                    <td className="px-3 py-2.5 text-[11px] leading-tight">
                      <p className="font-semibold">{oname(r.droId)}</p>
                      <p className="text-muted-foreground">{oname(r.troId)}</p>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{count}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{inr(meta.rate)}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-emerald-700">{inr(commission)}</td>
                  </tr>
                ))}
                {data.ranked.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No live activity for this service today.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DistributorShell>
  );
}