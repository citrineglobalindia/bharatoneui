import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  PieChart,
  Grid3x3,
  LogOut,
  Menu,
  X,
  Search,
  Activity,
  ChevronDown,
  MapPin,
  ShieldCheck,
  LifeBuoy,
  Smile,
  Bell,
  UserCircle2,
} from "lucide-react";
import { MessageSquare, CalendarClock } from "lucide-react";
import { BharatOneLogo } from "@/components/bharatone-logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type RegionalAccent = "rose" | "amber";

export interface RegionalConfig {
  accent: RegionalAccent;
  portalName: string;
  shortName: string;
  scope: string;
  user: { name: string; phone: string; role: string; initial: string };
  loginPath: string;
  basePath: string;
}

const ACCENT: Record<RegionalAccent, { grad: string; ring: string; soft: string; text: string; chip: string; activeBg: string; activeText: string; activeRing: string; dot: string }> = {
  rose: {
    grad: "from-rose-500 to-pink-600",
    ring: "ring-rose-400/30",
    soft: "from-rose-600/30 via-pink-600/15",
    text: "text-rose-300",
    chip: "bg-rose-100 text-rose-700",
    activeBg: "bg-rose-500/15",
    activeText: "text-rose-200",
    activeRing: "ring-rose-400/30",
    dot: "bg-rose-500",
  },
  amber: {
    grad: "from-amber-500 to-orange-600",
    ring: "ring-amber-400/30",
    soft: "from-amber-600/30 via-orange-600/15",
    text: "text-amber-300",
    chip: "bg-amber-100 text-amber-800",
    activeBg: "bg-amber-500/15",
    activeText: "text-amber-200",
    activeRing: "ring-amber-400/30",
    dot: "bg-amber-500",
  },
};

function navItems(base: string) {
  return [
    { label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, to: `${base}/dashboard` },
    { label: "Retailer Activity", icon: <Users className="h-4 w-4" />, to: `${base}/retailers` },
    { label: "Services", icon: <Grid3x3 className="h-4 w-4" />, to: `${base}/catalog` },
    { label: "Service Analytics", icon: <PieChart className="h-4 w-4" />, to: `${base}/services` },
    { label: "Feedback Desk", icon: <MessageSquare className="h-4 w-4" />, to: `${base}/feedback-desk` },
    { label: "Attendance", icon: <CalendarClock className="h-4 w-4" />, to: `${base}/attendance` },
  ];
}

function helpItems(base: string) {
  return [
    { label: "Support", icon: <LifeBuoy className="h-4 w-4" />, to: `${base}/support` },
    { label: "Feedback", icon: <Smile className="h-4 w-4" />, to: `${base}/feedback` },
  ];
}

function SidebarBody({ cfg, pathname, onNavigate }: { cfg: RegionalConfig; pathname: string; onNavigate?: () => void }) {
  const navigate = useNavigate();
  const a = ACCENT[cfg.accent];
  const items = navItems(cfg.basePath);
  const help = helpItems(cfg.basePath);
  return (
    <div className="flex h-full flex-col bg-slate-900 text-slate-100">
      <div className="relative px-4 py-4 border-b border-white/10 overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${a.soft} to-transparent pointer-events-none`} />
        <div className="relative flex items-center gap-3">
          <div className="relative shrink-0">
            <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${a.grad} blur-md opacity-60`} />
            <div className="relative rounded-xl bg-white p-1.5 ring-1 ring-white/20 shadow-lg">
              <BharatOneLogo size="sm" />
            </div>
          </div>
          <div className="leading-tight min-w-0 flex-1">
            <p className="text-sm font-bold text-white tracking-tight">{cfg.portalName}</p>
            <p className="text-[10px] text-slate-400">{cfg.scope}</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto nav-scroll px-2 py-3 space-y-4">
        <div>
          <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Reports</p>
          <ul className="space-y-0.5">
            {items.map((it) => {
              const active = pathname === it.to;
              return (
                <li key={it.label}>
                  <Link
                    to={it.to}
                    onClick={onNavigate}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active ? `${a.activeBg} ${a.activeText} ring-1 ${a.activeRing}` : "text-slate-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span className={active ? a.text : "text-slate-400"}>{it.icon}</span>
                    <span className="truncate flex-1">{it.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
        <div>
          <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Help</p>
          <ul className="space-y-0.5">
            {help.map((it) => {
              const active = pathname === it.to;
              return (
                <li key={it.label}>
                  <Link
                    to={it.to}
                    onClick={onNavigate}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active ? `${a.activeBg} ${a.activeText} ring-1 ${a.activeRing}` : "text-slate-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span className={active ? a.text : "text-slate-400"}>{it.icon}</span>
                    <span className="truncate flex-1">{it.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
        <div>
          <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Session</p>
          <button
            onClick={() => {
              onNavigate?.();
              try { localStorage.removeItem("bharatone:auth"); } catch {}
              navigate({ to: cfg.loginPath });
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
          >
            <LogOut className="h-4 w-4 text-rose-400" />
            <span className="truncate flex-1 text-left">Sign Out</span>
          </button>
        </div>
      </nav>
      <div className="px-3 py-3 border-t border-white/10">
        <div className="flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <p className="text-[10px] text-slate-400 leading-tight">Read-only reporting access</p>
        </div>
      </div>
    </div>
  );
}

export function RegionalShell({ cfg, children }: { cfg: RegionalConfig; children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const a = ACCENT[cfg.accent];
  const [now, setNow] = useState(() => new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const dateStr = now.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" });

  return (
    <div className="h-screen overflow-hidden bg-slate-50 flex">
      <aside className="hidden lg:flex w-64 shrink-0 flex-col h-screen sticky top-0">
        <SidebarBody cfg={cfg} pathname={pathname} />
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
            <SidebarBody cfg={cfg} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
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
            <div className="hidden lg:flex items-center gap-2 rounded-xl bg-slate-100/80 ring-1 ring-slate-200 px-3 h-10 max-w-md flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Search retailers, taluks…"
                className="bg-transparent flex-1 text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 rounded-xl border border-border bg-white px-3 h-10 shadow-soft">
              <MapPin className={`h-3.5 w-3.5 ${a.text === "text-rose-300" ? "text-rose-600" : "text-amber-600"}`} />
              <div className="leading-tight">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Scope</p>
                <p className="text-xs font-extrabold text-slate-900">{cfg.scope}</p>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2 rounded-xl border border-border bg-white px-3 h-10 shadow-soft">
              <Activity className="h-3.5 w-3.5 text-emerald-600" />
              <div className="leading-tight text-right min-w-[78px]" suppressHydrationWarning>
                <p className="font-mono text-[13px] font-bold tabular-nums text-slate-900">{mounted ? timeStr : "--:--:--"}</p>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{mounted ? `${dateStr} \u00B7 IST` : "IST"}</p>
              </div>
            </div>

            <button
              onClick={() => navigate({ to: `${cfg.basePath}/notifications` })}
              className="relative h-10 w-10 rounded-xl border border-border bg-white hover:bg-muted flex items-center justify-center shadow-soft"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4 text-slate-700" />
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center ring-2 ring-white">3</span>
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 h-10 pl-1 pr-2 rounded-xl border border-border bg-white hover:bg-muted shadow-soft">
                  <div className="relative">
                    <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${a.grad} text-white flex items-center justify-center text-xs font-extrabold`}>{cfg.user.initial}</div>
                    <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ${a.dot} ring-2 ring-white`} />
                  </div>
                  <div className="hidden md:block leading-tight text-left">
                    <p className="text-[11px] font-bold text-slate-900">{cfg.user.name}</p>
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{cfg.user.role} · On duty</p>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="px-2 py-2.5 flex items-center gap-2.5 border-b mb-1">
                  <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${a.grad} text-white flex items-center justify-center font-extrabold`}>{cfg.user.initial}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{cfg.user.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{cfg.user.phone}</p>
                    <span className={`inline-block mt-0.5 text-[9px] font-bold ${a.chip} px-1.5 py-0.5 rounded uppercase tracking-wider`}>{cfg.user.role}</span>
                  </div>
                </div>
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Access</DropdownMenuLabel>
                <div className="px-2 py-1.5 text-[11px] text-muted-foreground flex items-center justify-between">
                  <span>Permission</span><span className="font-bold text-emerald-700">View reports</span>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: `${cfg.basePath}/profile` })}><UserCircle2 className="h-4 w-4" /> My profile</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: `${cfg.basePath}/notifications` })}><Bell className="h-4 w-4" /> Notifications</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-rose-600 focus:text-rose-700"
                  onClick={() => {
                    try { localStorage.removeItem("bharatone:auth"); } catch {}
                    navigate({ to: cfg.loginPath });
                  }}
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

export const DRO_CONFIG: RegionalConfig = {
  accent: "rose",
  portalName: "DRO Portal",
  shortName: "DRO",
  scope: "Bengaluru Urban District",
  user: { name: "Kavya", phone: "8974532567", role: "DRO", initial: "K" },
  loginPath: "/dro-login",
  basePath: "/dro",
};

export const TRO_CONFIG: RegionalConfig = {
  accent: "amber",
  portalName: "TRO Portal",
  shortName: "TRO",
  scope: "Anekal Taluk",
  user: { name: "Navya", phone: "8974532566", role: "TRO", initial: "N" },
  loginPath: "/tro-login",
  basePath: "/tro",
};