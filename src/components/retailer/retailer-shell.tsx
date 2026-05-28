import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutDashboard,
  Video,
  Banknote,
  CheckCircle2,
  ArrowLeftRight,
  Smartphone,
  Receipt,
  FileText,
  Building2,
  Globe,
  ClipboardList,
  Wrench,
  PlusCircle,
  Wallet,
  BarChart3,
  LifeBuoy,
  Settings,
  LogOut,
  ChevronDown,
  IdCard,
  Menu,
  X,
  Search,
} from "lucide-react";
import { BharatOneLogo } from "@/components/bharatone-logo";
import { NotificationsBell } from "@/components/retailer/notifications-bell";

type NavItem = { label: string; icon: React.ReactNode; to: string };
type NavSection = { heading: string; items: NavItem[] };

const NAV: NavSection[] = [
  {
    heading: "Main",
    items: [
      { label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, to: "/dashboard" },
      { label: "Video KYC", icon: <Video className="h-4 w-4" />, to: "/video-kyc" },
    ],
  },
  {
    heading: "Financial Services",
    items: [
      { label: "AEPS", icon: <Banknote className="h-4 w-4" />, to: "/aeps" },
      { label: "AEPS Activation", icon: <CheckCircle2 className="h-4 w-4" />, to: "/aeps-activation" },
      { label: "Money Transfer", icon: <ArrowLeftRight className="h-4 w-4" />, to: "/money-transfer" },
      { label: "Recharge", icon: <Smartphone className="h-4 w-4" />, to: "/recharge" },
      { label: "BBPS Bills", icon: <Receipt className="h-4 w-4" />, to: "/bbps" },
    ],
  },
  {
    heading: "Business Services",
    items: [
      { label: "GST Services", icon: <FileText className="h-4 w-4" />, to: "/gst" },
      { label: "PAN Services", icon: <IdCard className="h-4 w-4" />, to: "/pan" },
      { label: "Business Reg.", icon: <Building2 className="h-4 w-4" />, to: "/business-reg" },
      { label: "Gov. Services", icon: <Globe className="h-4 w-4" />, to: "/gov-services" },
      { label: "My Applications", icon: <ClipboardList className="h-4 w-4" />, to: "/applications" },
      { label: "My Services", icon: <Wrench className="h-4 w-4" />, to: "/services" },
      { label: "New Service Request", icon: <PlusCircle className="h-4 w-4" />, to: "/new-service-request" },
    ],
  },
  {
    heading: "Finance",
    items: [
      { label: "Wallet", icon: <Wallet className="h-4 w-4" />, to: "/wallet" },
      { label: "Transactions", icon: <ArrowLeftRight className="h-4 w-4" />, to: "/transactions" },
      { label: "Reports", icon: <BarChart3 className="h-4 w-4" />, to: "/reports" },
    ],
  },
  {
    heading: "Support",
    items: [
      { label: "Support Tickets", icon: <LifeBuoy className="h-4 w-4" />, to: "/support" },
      { label: "Settings", icon: <Settings className="h-4 w-4" />, to: "/settings" },
    ],
  },
];

function SidebarBody({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-4 border-b border-border">
        <BharatOneLogo size="md" />
      </div>
      <div className="px-4 py-3 border-b border-border flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-india-green/10 text-india-green flex items-center justify-center font-bold">H</div>
        <div className="min-w-0">
          <p className="text-sm font-bold truncate">Harshitha</p>
          <p className="text-[11px] text-muted-foreground">9876789876</p>
          <span className="inline-block mt-0.5 text-[10px] font-semibold bg-india-green text-white px-1.5 py-0.5 rounded">Retailer</span>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {NAV.map((sec) => (
          <div key={sec.heading}>
            <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{sec.heading}</p>
            <ul className="space-y-0.5">
              {sec.items.map((it) => {
                const active = pathname === it.to;
                return (
                  <li key={it.to}>
                    <Link
                      to={it.to}
                      onClick={onNavigate}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        active
                          ? "bg-saffron-gradient text-white shadow-elev"
                          : "text-foreground/80 hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <span className={active ? "text-white" : "text-muted-foreground"}>{it.icon}</span>
                      <span className="truncate">{it.label}</span>
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
          navigate({ to: "/login" });
        }}
        className="m-3 flex items-center justify-center gap-2 rounded-lg bg-india-green/10 text-india-green px-3 py-2 text-sm font-semibold hover:bg-india-green/15"
      >
        <LogOut className="h-4 w-4" /> Sign Out
      </button>
    </div>
  );
}

export function RetailerShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border bg-card">
        <SidebarBody pathname={pathname} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 bg-card border-r border-border animate-in slide-in-from-left duration-200">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarBody pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 bg-card border-b border-border flex items-center justify-between gap-3 px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden h-9 w-9 rounded-lg hover:bg-muted flex items-center justify-center"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="lg:hidden">
              <BharatOneLogo size="sm" />
            </div>
            <div className="hidden lg:flex items-center gap-2 rounded-lg bg-muted/60 px-3 h-9 w-80">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Search services, transactions, applications…"
                className="bg-transparent flex-1 text-sm outline-none placeholder:text-muted-foreground"
              />
              <kbd className="text-[10px] font-bold text-muted-foreground bg-background border border-border rounded px-1.5 py-0.5">⌘K</kbd>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationsBell />
            <button className="flex items-center gap-2 rounded-full hover:bg-muted pl-1 pr-2 py-1">
              <div className="h-7 w-7 rounded-full bg-india-green text-white text-xs font-bold flex items-center justify-center">H</div>
              <span className="hidden sm:inline text-sm font-semibold">Harshitha</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}