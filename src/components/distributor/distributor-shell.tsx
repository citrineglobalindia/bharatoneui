import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Network, Users, Grid3x3, Coins, LogOut, Menu, X,
  Search, Activity, ChevronDown, ShieldCheck, Bell, UserCircle2,
} from "lucide-react";
import { BharatOneLogo } from "@/components/bharatone-logo";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const DISTRIBUTOR = {
  portalName: "Distributor Portal",
  shortName: "Distributor",
  scope: "Bengaluru Zone",
  user: { name: "Karthik M", phone: "7259809887", role: "Distributor", initial: "K" },
  loginPath: "/distributor-login",
  basePath: "/distributor",
};

const NAV = [
  { label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, to: "/distributor/dashboard" },
  { label: "Network Map", icon: <Network className="h-4 w-4" />, to: "/distributor/network" },
  { label: "Retailers", icon: <Users className="h-4 w-4" />, to: "/distributor/retailers" },
  { label: "Services Live", icon: <Grid3x3 className="h-4 w-4" />, to: "/distributor/services" },
  { label: "Commissions", icon: <Coins className="h-4 w-4" />, to: "/distributor/commissions" },
];

function SidebarBody({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="flex h-full flex-col bg-slate-900 text-slate-100">
      <div className="relative px-4 py-4 border-b border-white/10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-600/30 via-cyan-600/15 to-transparent pointer-events-none" />
        <div className="relative flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 blur-md opacity-60" />
            <div className="relative rounded-xl bg-white p-1.5 ring-1 ring-white/20 shadow-lg">
              <BharatOneLogo size="sm" />
            </div>
          </div>
          <div className="leading-tight min-w-0 flex-1">
            <p className="text-sm font-bold text-white tracking-tight">{DISTRIBUTOR.portalName}</p>
            <p className="text-[10px] text-slate-400">{DISTRIBUTOR.scope}</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        <div>
          <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Network</p>
          <ul className="space-y-0.5">
            {NAV.map((it) => {
              const active = pathname === it.to;
              return (
                <li key={it.label}>
                  <Link
                    to={it.to}
                    onClick={onNavigate}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active ? "bg-sky-500/15 text-sky-200 ring-1 ring-sky-400/30" : "text-slate-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span className={active ? "text-sky-300" : "text-slate-400"}>{it.icon}</span>
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
              navigate({ to: DISTRIBUTOR.loginPath });
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
          <p className="text-[10px] text-slate-400 leading-tight">Network oversight access</p>
        </div>
      </div>
    </div>
  );
}

export function DistributorShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
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
            <div className="hidden lg:flex items-center gap-2 rounded-xl bg-slate-100/80 ring-1 ring-slate-200 px-3 h-10 max-w-md flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input placeholder="Search retailers, officers…" className="bg-transparent flex-1 text-sm outline-none placeholder:text-muted-foreground" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 rounded-xl border border-border bg-white px-3 h-10 shadow-soft">
              <Activity className="h-3.5 w-3.5 text-emerald-600" />
              <div className="leading-tight text-right min-w-[78px]" suppressHydrationWarning>
                <p className="font-mono text-[13px] font-bold tabular-nums text-slate-900">{mounted ? timeStr : "--:--:--"}</p>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{mounted ? `${dateStr} \u00B7 IST` : "IST"}</p>
              </div>
            </div>

            <button
              className="relative h-10 w-10 rounded-xl border border-border bg-white hover:bg-muted flex items-center justify-center shadow-soft"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4 text-slate-700" />
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-sky-500 text-white text-[10px] font-extrabold flex items-center justify-center ring-2 ring-white">4</span>
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 h-10 pl-1 pr-2 rounded-xl border border-border bg-white hover:bg-muted shadow-soft">
                  <div className="relative">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-600 text-white flex items-center justify-center text-xs font-extrabold">{DISTRIBUTOR.user.initial}</div>
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-sky-500 ring-2 ring-white" />
                  </div>
                  <div className="hidden md:block leading-tight text-left">
                    <p className="text-[11px] font-bold text-slate-900">{DISTRIBUTOR.user.name}</p>
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{DISTRIBUTOR.user.role} · On duty</p>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="px-2 py-2.5 flex items-center gap-2.5 border-b mb-1">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-600 text-white flex items-center justify-center font-extrabold">{DISTRIBUTOR.user.initial}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{DISTRIBUTOR.user.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{DISTRIBUTOR.user.phone}</p>
                    <span className="inline-block mt-0.5 text-[9px] font-bold bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded uppercase tracking-wider">{DISTRIBUTOR.user.role}</span>
                  </div>
                </div>
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Access</DropdownMenuLabel>
                <div className="px-2 py-1.5 text-[11px] text-muted-foreground flex items-center justify-between">
                  <span>Permission</span><span className="font-bold text-emerald-700">Network reports</span>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/distributor/dashboard" })}><UserCircle2 className="h-4 w-4" /> Dashboard</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-rose-600 focus:text-rose-700"
                  onClick={() => {
                    try { localStorage.removeItem("bharatone:auth"); } catch {}
                    navigate({ to: DISTRIBUTOR.loginPath });
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
