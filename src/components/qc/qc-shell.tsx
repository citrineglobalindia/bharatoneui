import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
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
} from "lucide-react";
import { BharatOneLogo } from "@/components/bharatone-logo";

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
      { label: "Document Search", icon: <FileSearch className="h-4 w-4" />, to: "/qc/kyc-queue" },
      { label: "Flagged Cases", icon: <AlertTriangle className="h-4 w-4" />, to: "/qc/kyc-queue", badge: "3" },
      { label: "Approved", icon: <ShieldCheck className="h-4 w-4" />, to: "/qc/kyc-queue" },
    ],
  },
  {
    heading: "Insights",
    items: [
      { label: "Reviewers", icon: <Users className="h-4 w-4" />, to: "/qc/dashboard" },
      { label: "Reports", icon: <BarChart3 className="h-4 w-4" />, to: "/qc/dashboard" },
      { label: "Settings", icon: <Settings className="h-4 w-4" />, to: "/qc/dashboard" },
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
      <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
        <div className="relative">
          <div className="h-10 w-10 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold">Q</div>
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-slate-900" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold truncate">QC Reviewer</p>
          <p className="text-[11px] text-slate-400">qc.admin</p>
          <span className="inline-block mt-0.5 text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded">Level 2 · Verified</span>
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
        <header className="h-14 bg-white border-b border-border flex items-center justify-between gap-3 px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden h-9 w-9 rounded-lg hover:bg-muted flex items-center justify-center"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden lg:flex items-center gap-2 rounded-lg bg-slate-100 px-3 h-9 w-96">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Search by KYC ID, name, PAN, Aadhaar last-4…"
                className="bg-transparent flex-1 text-sm outline-none placeholder:text-muted-foreground"
              />
              <kbd className="text-[10px] font-bold text-muted-foreground bg-white border border-border rounded px-1.5 py-0.5">⌘K</kbd>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live · 12 in queue
            </span>
            <button className="relative h-9 w-9 rounded-lg hover:bg-muted flex items-center justify-center" aria-label="Notifications">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500" />
            </button>
            <div className="h-8 w-8 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-bold">Q</div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}