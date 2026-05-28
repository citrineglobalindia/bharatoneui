import { Link, useNavigate } from "@tanstack/react-router";
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
  Bell,
  ChevronDown,
  IdCard,
} from "lucide-react";
import { BharatOneLogo } from "@/components/bharatone-logo";

type NavItem = { label: string; icon: React.ReactNode; to?: string };
type NavSection = { heading?: string; items: NavItem[] };

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
      { label: "AEPS", icon: <Banknote className="h-4 w-4" /> },
      { label: "AEPS Activation", icon: <CheckCircle2 className="h-4 w-4" /> },
      { label: "Money Transfer", icon: <ArrowLeftRight className="h-4 w-4" /> },
      { label: "Recharge", icon: <Smartphone className="h-4 w-4" /> },
      { label: "BBPS Bills", icon: <Receipt className="h-4 w-4" /> },
    ],
  },
  {
    heading: "Business Services",
    items: [
      { label: "GST Services", icon: <FileText className="h-4 w-4" /> },
      { label: "PAN Services", icon: <IdCard className="h-4 w-4" /> },
      { label: "Business Reg.", icon: <Building2 className="h-4 w-4" /> },
      { label: "Gov. Services", icon: <Globe className="h-4 w-4" /> },
      { label: "My Applications", icon: <ClipboardList className="h-4 w-4" /> },
      { label: "My Services", icon: <Wrench className="h-4 w-4" /> },
      { label: "New Service Request", icon: <PlusCircle className="h-4 w-4" /> },
    ],
  },
  {
    heading: "Finance",
    items: [
      { label: "Wallet", icon: <Wallet className="h-4 w-4" /> },
      { label: "Transactions", icon: <ArrowLeftRight className="h-4 w-4" /> },
      { label: "Reports", icon: <BarChart3 className="h-4 w-4" /> },
    ],
  },
  {
    heading: "Support",
    items: [
      { label: "Support Tickets", icon: <LifeBuoy className="h-4 w-4" /> },
      { label: "Settings", icon: <Settings className="h-4 w-4" /> },
    ],
  },
];

export function RetailerShell({
  activeLabel,
  children,
}: {
  activeLabel: string;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-muted/30 flex">
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border bg-card">
        <div className="px-4 py-4 border-b border-border">
          <BharatOneLogo size="md" />
        </div>
        <div className="px-4 py-3 border-b border-border flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-india-green/10 text-india-green flex items-center justify-center font-bold">D</div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">Demo Retailer</p>
            <p className="text-[11px] text-muted-foreground">9000000004</p>
            <span className="inline-block mt-0.5 text-[10px] font-semibold bg-india-green text-white px-1.5 py-0.5 rounded">Retailer</span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {NAV.map((sec) => (
            <div key={sec.heading}>
              {sec.heading && (
                <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{sec.heading}</p>
              )}
              <ul className="space-y-0.5">
                {sec.items.map((it) => {
                  const active = it.label === activeLabel;
                  const cls = `w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-saffron-gradient text-white shadow-elev"
                      : "text-foreground/80 hover:bg-muted hover:text-foreground"
                  }`;
                  const inner = (
                    <>
                      <span className={active ? "text-white" : "text-muted-foreground"}>{it.icon}</span>
                      <span className="truncate">{it.label}</span>
                    </>
                  );
                  return (
                    <li key={it.label}>
                      {it.to ? (
                        <Link to={it.to} className={cls}>{inner}</Link>
                      ) : (
                        <button className={cls}>{inner}</button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <button
          onClick={() => navigate({ to: "/login" })}
          className="m-3 flex items-center justify-center gap-2 rounded-lg bg-india-green/10 text-india-green px-3 py-2 text-sm font-semibold hover:bg-india-green/15"
        >
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4 lg:px-6">
          <BharatOneLogo size="sm" />
          <div className="flex items-center gap-3">
            <button className="relative h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-saffron" />
            </button>
            <button className="flex items-center gap-2 rounded-full hover:bg-muted pl-1 pr-2 py-1">
              <div className="h-7 w-7 rounded-full bg-india-green text-white text-xs font-bold flex items-center justify-center">D</div>
              <span className="text-sm font-semibold">Demo Retailer</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}