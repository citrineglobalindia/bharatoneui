import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  FileCheck2,
  Wrench,
  Wallet,
  ArrowDownToLine,
  Banknote,
  BookOpenCheck,
  LogOut,
  Menu,
  LifeBuoy,
  Smile,
  X,
  Search,
  Bell,
  Activity,
  ChevronDown,
  UserCircle2,
  KeyRound,
  Settings,
  TrendingUp,
  Clock,
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
import {
  REGISTRATION_PAYMENTS,
  WALLET_REQUESTS,
  WITHDRAWALS,
  pendingCount,
} from "@/components/accountant/mock-data";

type NavItem = { label: string; icon: React.ReactNode; to: string; badge?: string };
type NavSection = { heading: string; items: NavItem[] };

const regPending = String(pendingCount(REGISTRATION_PAYMENTS));
const walPending = String(pendingCount(WALLET_REQUESTS));
const wdlPending = String(pendingCount(WITHDRAWALS));

const NAV: NavSection[] = [
  {
    heading: "Overview",
    items: [
      { label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, to: "/accountant/dashboard" },
    ],
  },
  {
    heading: "Approvals",
    items: [
      { label: "Registration Payments", icon: <FileCheck2 className="h-4 w-4" />, to: "/accountant/registrations", badge: regPending },
      { label: "Wallet Requests", icon: <Wallet className="h-4 w-4" />, to: "/accountant/wallet-requests", badge: walPending },
      { label: "Withdrawals", icon: <ArrowDownToLine className="h-4 w-4" />, to: "/accountant/withdrawals", badge: wdlPending },
    ],
  },
  {
    heading: "Finance",
    items: [
      { label: "Services & Commission", icon: <Wrench className="h-4 w-4" />, to: "/accountant/services" },
      { label: "Main Account Recharge", icon: <Banknote className="h-4 w-4" />, to: "/accountant/main-recharge" },
      { label: "Ledger", icon: <BookOpenCheck className="h-4 w-4" />, to: "/accountant/ledger" },
    ],
  },
  {
    heading: "Session",
    items: [
      { label: "Sign Out", icon: <LogOut className="h-4 w-4" />, to: "/accountant-login" },
    ],
  },
];

function SidebarBody({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="flex h-full flex-col bg-slate-900 text-slate-100">
      <div className="relative px-4 py-4 border-b border-white/10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/30 via-teal-600/15 to-transparent pointer-events-none" />
        <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-emerald-500/20 blur-2xl pointer-events-none" />
        <div className="relative flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 blur-md opacity-60" />
            <div className="relative rounded-xl bg-white p-1.5 ring-1 ring-white/20 shadow-lg">
              <BharatOneLogo size="sm" />
            </div>
          </div>
          <div className="leading-tight min-w-0 flex-1">
            <p className="text-sm font-bold text-white tracking-tight">Accountant Portal</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {NAV.map((sec) => (
          <div key={sec.heading}>
            <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">{sec.heading}</p>
            <ul className="space-y-0.5">
              {sec.items.map((it) => {
                const active = pathname === it.to;
                const isSignOut = it.label === "Sign Out";
                return (
                  <li key={it.label}>
                    {isSignOut ? (
                      <button
                        onClick={() => {
                          onNavigate?.();
                          try { localStorage.removeItem("bharatone:auth"); } catch {}
                          navigate({ to: "/accountant-login" });
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
                      >
                        <span className="text-rose-400">{it.icon}</span>
                        <span className="truncate flex-1">{it.label}</span>
                      </button>
                    ) : (
                      <Link
                        to={it.to}
                        onClick={onNavigate}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          active
                            ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/30"
                            : "text-slate-300 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <span className={active ? "text-emerald-300" : "text-slate-400"}>{it.icon}</span>
                        <span className="truncate flex-1">{it.label}</span>
                        {it.badge && it.badge !== "0" && (
                          <span className="text-[10px] font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded-full">
                            {it.badge}
                          </span>
                        )}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}

export function AccountantShell({ children }: { children: React.ReactNode }) {
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

  const totalPending =
    pendingCount(REGISTRATION_PAYMENTS) + pendingCount(WALLET_REQUESTS) + pendingCount(WITHDRAWALS);

  const notifications = [
    { id: 1, tone: "emerald", icon: <Wallet className="h-3.5 w-3.5" />, title: "New wallet recharge request", body: "Meera Pillai \u00B7 \u20B91,50,000 \u00B7 RTGS", time: "4m" },
    { id: 2, tone: "amber", icon: <ArrowDownToLine className="h-3.5 w-3.5" />, title: "Withdrawal awaiting approval", body: "BO-WDL-3311 \u00B7 \u20B995,000", time: "12m" },
    { id: 3, tone: "indigo", icon: <FileCheck2 className="h-3.5 w-3.5" />, title: "Registration payment to verify", body: "Harshitha N \u00B7 \u20B92,999", time: "20m" },
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
            <div className="hidden lg:flex items-center gap-2 rounded-xl bg-slate-100/80 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-emerald-400/40 focus-within:bg-white px-3 h-10 max-w-xl flex-1 transition-all">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Search by name, UTR, request ID, phone…"
                className="bg-transparent flex-1 text-sm outline-none placeholder:text-muted-foreground"
              />
              <kbd className="text-[10px] font-bold text-muted-foreground bg-white border border-border rounded px-1.5 py-0.5">⌘K</kbd>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden xl:flex items-stretch rounded-xl border border-border bg-white overflow-hidden shadow-soft">
              <div className="flex items-center gap-2 px-3 py-1.5 border-r border-border">
                <Clock className="h-3.5 w-3.5 text-amber-600" />
                <div className="leading-tight">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Pending</p>
                  <p className="text-xs font-extrabold text-slate-900">{totalPending} <span className="text-[10px] font-semibold text-amber-600">to act</span></p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                <div className="leading-tight">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Settled</p>
                  <p className="text-xs font-extrabold text-slate-900">98.6%</p>
                </div>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2 rounded-xl border border-border bg-white px-3 h-10 shadow-soft">
              <Activity className="h-3.5 w-3.5 text-emerald-600" />
              <div className="leading-tight text-right min-w-[78px]" suppressHydrationWarning>
                <p className="font-mono text-[13px] font-bold tabular-nums text-slate-900">{mounted ? timeStr : "--:--:--"}</p>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{mounted ? `${dateStr} \u00B7 IST` : "IST"}</p>
              </div>
            </div>

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
                <div className="px-3 py-2.5 border-b bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
                  <p className="text-xs font-bold">Notifications</p>
                  <p className="text-[10px] opacity-90">{notifications.length} new · approvals and payouts</p>
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
                  <button className="text-[11px] font-bold text-emerald-700 hover:underline">Mark all read</button>
                  <button className="text-[11px] font-bold text-slate-700 hover:underline">View all</button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 h-10 pl-1 pr-2 rounded-xl border border-border bg-white hover:bg-muted shadow-soft">
                  <div className="relative">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-xs font-extrabold">M</div>
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                  </div>
                  <div className="hidden md:block leading-tight text-left">
                    <p className="text-[11px] font-bold text-slate-900">Mahesh</p>
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Accountant · On duty</p>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="px-2 py-2.5 flex items-center gap-2.5 border-b mb-1">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-extrabold">M</div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">Mahesh</p>
                    <p className="text-[11px] text-muted-foreground truncate">8879789067</p>
                    <span className="inline-block mt-0.5 text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded uppercase tracking-wider">Accountant</span>
                  </div>
                </div>
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Account</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => navigate({ to: "/accountant/profile" })}><UserCircle2 className="h-4 w-4" /> My profile</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/accountant/change-password" })}><KeyRound className="h-4 w-4" /> Change password</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/accountant/settings" })}><Settings className="h-4 w-4" /> Portal settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 text-[11px] text-muted-foreground flex items-center justify-between">
                  <span>Approved today</span><span className="font-bold text-emerald-700">32 items</span>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-rose-600 focus:text-rose-700"
                  onClick={() => {
                    try { localStorage.removeItem("bharatone:auth"); } catch {}
                    navigate({ to: "/accountant-login" });
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
