import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ClipboardCheck,
  ShieldCheck,
  FileSearch,
  AlertTriangle,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  Bell,
  Activity,
  Timer,
  TrendingUp,
  CheckCircle2,
  ChevronDown,
  Moon,
  Sun,
  HelpCircle,
  UserCircle2,
  KeyRound,
  ShieldAlert,
} from "lucide-react";
import { BharatOneLogo } from "@/components/bharatone-logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavItem = { label: string; icon: React.ReactNode; to: string; badge?: string };
type NavSection = { heading: string; items: NavItem[] };

const NAV: NavSection[] = [
  {
    heading: "Overview",
    items: [
      { label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, to: "/qc/dashboard" },
    ],
  },
  {
    heading: "KYC Operations",
    items: [
      { label: "Review Queue", icon: <ClipboardCheck className="h-4 w-4" />, to: "/qc/kyc-queue", badge: "12" },
      { label: "Document Search", icon: <FileSearch className="h-4 w-4" />, to: "/qc/document-search" },
      { label: "Flagged Cases", icon: <AlertTriangle className="h-4 w-4" />, to: "/qc/flagged", badge: "3" },
      { label: "Approved", icon: <ShieldCheck className="h-4 w-4" />, to: "/qc/approved" },
    ],
  },
  {
    heading: "Insights",
    items: [
      { label: "Reviewers", icon: <Users className="h-4 w-4" />, to: "/qc/reviewers" },
      { label: "Reports", icon: <BarChart3 className="h-4 w-4" />, to: "/qc/reports" },
      { label: "Settings", icon: <Settings className="h-4 w-4" />, to: "/qc/settings" },
    ],
  },
  {
    heading: "Session",
    items: [
      {
        label: "Sign Out",
        icon: <LogOut className="h-4 w-4" />,
        to: "/qc-login",
      },
    ],
  },
];

function SidebarBody({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="flex h-full flex-col bg-slate-900 text-slate-100">
      <div className="px-4 py-4 border-b border-white/10 flex items-center gap-2">
        <div className="rounded-lg bg-white p-1.5">
          <BharatOneLogo size="sm" />
        </div>
        <div className="leading-tight">
          <p className="text-[10px] uppercase tracking-widest text-indigo-300 font-bold">Quality Control</p>
          <p className="text-xs font-semibold">Portal</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {NAV.map((sec) => (
          <div key={sec.heading}>
            <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">{sec.heading}</p>
            <ul className="space-y-0.5">
              {sec.items.map((it) => {
                const active = pathname === it.to;
                return (
                  <li key={it.label}>
                    <Link
                      to={it.to}
                      onClick={onNavigate}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        active
                          ? "bg-indigo-500/15 text-indigo-200 ring-1 ring-indigo-400/30"
                          : "text-slate-300 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <span className={active ? "text-indigo-300" : "text-slate-400"}>{it.icon}</span>
                      <span className="truncate flex-1">{it.label}</span>
                      {it.badge && (
                        <span className="text-[10px] font-bold bg-indigo-500 text-white px-1.5 py-0.5 rounded-full">
                          {it.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <button
        onClick={() => {
          onNavigate?.();
          try { localStorage.removeItem("bharatone:auth"); } catch {}
          navigate({ to: "/qc-login" });
        }}
        className="m-3 flex items-center justify-center gap-2 rounded-lg bg-white/5 text-slate-200 px-3 py-2 text-sm font-semibold hover:bg-white/10"
      >
        <LogOut className="h-4 w-4" /> Sign Out
      </button>
    </div>
  );
}

export function QcShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [now, setNow] = useState(() => new Date());
  const [mounted, setMounted] = useState(false);
  const [dense, setDense] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const dateStr = now.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" });

  const notifications = [
    { id: 1, tone: "rose", icon: <ShieldAlert className="h-3.5 w-3.5" />, title: "High-risk case flagged", body: "BO-KYC-24087 · face match 62%", time: "2m" },
    { id: 2, tone: "amber", icon: <Timer className="h-3.5 w-3.5" />, title: "SLA breach in 8 min", body: "BO-KYC-24073 awaiting reviewer", time: "8m" },
    { id: 3, tone: "indigo", icon: <ClipboardCheck className="h-3.5 w-3.5" />, title: "5 new submissions", body: "Auto-assigned to your queue", time: "14m" },
    { id: 4, tone: "emerald", icon: <CheckCircle2 className="h-3.5 w-3.5" />, title: "Approval acknowledged", body: "BO-KYC-24061 · synced to core", time: "1h" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="hidden lg:flex w-64 shrink-0 flex-col">
        <SidebarBody pathname={pathname} />
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 animate-in slide-in-from-left duration-200">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 h-8 w-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white z-10"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarBody pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 bg-white/85 backdrop-blur-md border-b border-border flex items-center justify-between gap-3 px-4 lg:px-6 sticky top-0 z-30 shadow-[0_1px_0_0_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden h-9 w-9 rounded-lg hover:bg-muted flex items-center justify-center"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden lg:flex items-center gap-2 rounded-xl bg-slate-100/80 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-indigo-400/40 focus-within:bg-white px-3 h-10 max-w-xl flex-1 transition-all">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Search KYC ID, name, PAN, Aadhaar last-4, IFSC…"
                className="bg-transparent flex-1 text-sm outline-none placeholder:text-muted-foreground"
              />
              <kbd className="text-[10px] font-bold text-muted-foreground bg-white border border-border rounded px-1.5 py-0.5">⌘K</kbd>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Live KPI strip */}
            <div className="hidden xl:flex items-stretch rounded-xl border border-border bg-white overflow-hidden shadow-soft">
              <div className="flex items-center gap-2 px-3 py-1.5 border-r border-border">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <div className="leading-tight">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Queue</p>
                  <p className="text-xs font-extrabold text-slate-900">12 <span className="text-[10px] font-semibold text-emerald-600">live</span></p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 border-r border-border">
                <Timer className="h-3.5 w-3.5 text-amber-600" />
                <div className="leading-tight">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Avg SLA</p>
                  <p className="text-xs font-extrabold text-slate-900">04:38</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-indigo-600" />
                <div className="leading-tight">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Approval</p>
                  <p className="text-xs font-extrabold text-slate-900">92.4%</p>
                </div>
              </div>
            </div>

            {/* Live clock */}
            <div className="hidden md:flex items-center gap-2 rounded-xl border border-border bg-white px-3 h-10 shadow-soft">
              <Activity className="h-3.5 w-3.5 text-indigo-600" />
              <div className="leading-tight text-right min-w-[78px]" suppressHydrationWarning>
                <p className="font-mono text-[13px] font-bold tabular-nums text-slate-900">{mounted ? timeStr : "--:--:--"}</p>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{mounted ? `${dateStr} · IST` : "IST"}</p>
              </div>
            </div>

            {/* Theme + density */}
            <button
              onClick={() => setDark((v) => !v)}
              className="hidden md:flex h-10 w-10 rounded-xl border border-border bg-white hover:bg-muted items-center justify-center shadow-soft"
              aria-label="Toggle theme"
              title="Toggle theme"
            >
              {dark ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-slate-600" />}
            </button>
            <button
              onClick={() => setDense((v) => !v)}
              className={`hidden md:flex h-10 px-2.5 rounded-xl border border-border items-center gap-1 text-[10px] font-bold uppercase tracking-wider shadow-soft ${
                dense ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 hover:bg-muted"
              }`}
              title="Toggle density"
            >
              {dense ? "Dense" : "Cozy"}
            </button>

            {/* Help */}
            <button
              className="hidden md:flex h-10 w-10 rounded-xl border border-border bg-white hover:bg-muted items-center justify-center shadow-soft"
              aria-label="Help"
              title="Reviewer playbook"
            >
              <HelpCircle className="h-4 w-4 text-slate-600" />
            </button>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="relative h-10 w-10 rounded-xl border border-border bg-white hover:bg-muted flex items-center justify-center shadow-soft"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4 text-slate-700" />
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center ring-2 ring-white">
                    {notifications.length}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-0 overflow-hidden">
                <div className="px-3 py-2.5 border-b bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
                  <p className="text-xs font-bold">Notifications</p>
                  <p className="text-[10px] opacity-90">{notifications.length} new · queue alerts and approvals</p>
                </div>
                <ul className="max-h-80 overflow-y-auto">
                  {notifications.map((n) => (
                    <li key={n.id} className="px-3 py-2.5 border-b last:border-0 hover:bg-muted/50 cursor-pointer">
                      <div className="flex items-start gap-2">
                        <span
                          className={`mt-0.5 h-6 w-6 rounded-lg flex items-center justify-center text-white ${
                            n.tone === "rose" ? "bg-rose-500" :
                            n.tone === "amber" ? "bg-amber-500" :
                            n.tone === "indigo" ? "bg-indigo-500" : "bg-emerald-500"
                          }`}
                        >
                          {n.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-bold truncate">{n.title}</p>
                            <span className="text-[10px] text-muted-foreground shrink-0">{n.time}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">{n.body}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="px-3 py-2 border-t bg-muted/30 flex justify-between">
                  <button className="text-[11px] font-bold text-indigo-700 hover:underline">Mark all read</button>
                  <button className="text-[11px] font-bold text-slate-700 hover:underline">View all</button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 h-10 pl-1 pr-2 rounded-xl border border-border bg-white hover:bg-muted shadow-soft">
                  <div className="relative">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center text-xs font-extrabold">Q</div>
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                  </div>
                  <div className="hidden md:block leading-tight text-left">
                    <p className="text-[11px] font-bold text-slate-900">QC Reviewer</p>
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Lvl 2 · On shift</p>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="px-2 py-2.5 flex items-center gap-2.5 border-b mb-1">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center font-extrabold">Q</div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">QC Reviewer</p>
                    <p className="text-[11px] text-muted-foreground truncate">qc.admin · 9845224260</p>
                    <span className="inline-block mt-0.5 text-[9px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded uppercase tracking-wider">Level 2 Reviewer</span>
                  </div>
                </div>
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Account</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => navigate({ to: "/qc/profile" })}><UserCircle2 className="h-4 w-4" /> My profile</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/qc/change-password" })}><KeyRound className="h-4 w-4" /> Change password</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/qc/settings" })}><Settings className="h-4 w-4" /> Portal settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Session</DropdownMenuLabel>
                <div className="px-2 py-1.5 text-[11px] text-muted-foreground flex items-center justify-between">
                  <span>Shift started</span><span className="font-mono font-bold text-slate-900">09:00</span>
                </div>
                <div className="px-2 pb-2 text-[11px] text-muted-foreground flex items-center justify-between">
                  <span>Reviewed today</span><span className="font-bold text-emerald-700">47 cases</span>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-rose-600 focus:text-rose-700"
                  onClick={() => {
                    try { localStorage.removeItem("bharatone:auth"); } catch {}
                    navigate({ to: "/qc-login" });
                  }}
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className={`flex-1 overflow-y-auto ${dense ? "p-3 lg:p-4 text-[13px]" : "p-4 lg:p-6"}`}>{children}</main>
      </div>
    </div>
  );
}