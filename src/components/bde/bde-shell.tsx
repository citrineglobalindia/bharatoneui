import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bell, BriefcaseBusiness, ChevronDown,
  FileChartColumn, Headphones, LayoutDashboard, LogOut,
  Menu, MessageSquareText, Search, Settings, UserPlus, UserRound, UsersRound, X,
  TrendingUp, Target, Handshake
} from "lucide-react";
import { BharatOneLogo } from "@/components/bharatone-logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV = [
  { label: "BDE Dashboard", icon: LayoutDashboard, to: "/bde/dashboard" },
  { label: "Leads pipeline", icon: Target, to: "/bde/leads" },
  { label: "Merchant Onboarding", icon: UserPlus, to: "/bde/merchants" },
  { label: "Sales Performance", icon: TrendingUp, to: "/bde/performance" },
  { label: "Retailer Network", icon: UsersRound, to: "/bde/network" },
  { label: "Opportunities", icon: BriefcaseBusiness, to: "/bde/opportunities" },
  { label: "Reports", icon: FileChartColumn, to: "/bde/reports" },
];
const ACCOUNT_NAV = [
  { label: "My Profile", icon: UserRound, to: "/bde/profile" },
  { label: "Settings", icon: Settings, to: "/bde/settings" },
  { label: "Help & Support", icon: Headphones, to: "/bde/support" },
  { label: "Feedback", icon: MessageSquareText, to: "/bde/feedback" },
];

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (
    <div className="flex h-full flex-col bg-navy text-bd-foreground">
      <div className="border-b border-bd-foreground/10 p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-card p-1.5 shadow-elev"><BharatOneLogo size="sm" /></div>
          <div><p className="text-sm font-extrabold">BharatOne BDE</p><p className="text-[10px] text-bd-foreground/60">Business Development</p></div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto nav-scroll p-3">
        <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-widest text-bd-foreground/40">Sales Workspace</p>
        <ul className="space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to;
            return (
              <li key={item.label}>
                <Link to={item.to} onClick={onNavigate} className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${active ? "bg-bd text-bd-foreground" : "text-bd-foreground/70 hover:bg-bd-foreground/10 hover:text-bd-foreground"}`}>
                  <Icon className="h-4 w-4" /><span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="px-3 pb-2 pt-6 text-[10px] font-bold uppercase tracking-widest text-bd-foreground/40">Account & assistance</p>
        <ul className="space-y-1">{ACCOUNT_NAV.map((item) => { const Icon = item.icon; const active = pathname === item.to; return <li key={item.label}><Link to={item.to} onClick={onNavigate} className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition ${active ? "bg-bd text-bd-foreground shadow-lg shadow-navy" : "text-bd-foreground/65 hover:bg-bd-foreground/10 hover:text-bd-foreground"}`}><Icon className="h-4 w-4"/><span>{item.label}</span></Link></li>; })}</ul>
      </nav>
      <div className="border-t border-bd-foreground/10 p-3">
        <Button variant="ghost" className="w-full justify-start text-bd-foreground/70 hover:bg-bd-foreground/10 hover:text-bd-foreground" onClick={() => { localStorage.removeItem("bharatone:auth"); navigate({ to: "/bde-login", replace: true }); }}>
          <LogOut className="h-4 w-4 mr-2" /> Sign out
        </Button>
      </div>
    </div>
  );
}

export function BdeShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden h-screen w-72 shrink-0 lg:block"><Sidebar /></aside>
      {open && <div className="fixed inset-0 z-50 flex lg:hidden"><div className="absolute inset-0 bg-navy/60" onClick={() => setOpen(false)} /><aside className="relative w-72 h-full"><Button variant="ghost" size="icon" aria-label="Close menu" className="absolute right-2 top-2 z-10 text-bd-foreground" onClick={() => setOpen(false)}><X /></Button><Sidebar onNavigate={() => setOpen(false)} /></aside></div>}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-20 shrink-0 items-center justify-between gap-3 border-b border-border bg-card/90 px-4 backdrop-blur lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}><Menu /></Button>
             <div className="hidden h-11 max-w-2xl flex-1 items-center gap-2 rounded-2xl bg-muted px-4 md:flex"><Search className="h-4 w-4 text-muted-foreground" /><input className="w-full bg-transparent text-sm outline-none" placeholder="Search leads, merchants, or reports…" /></div>
          </div>
          <Button variant="outline" size="icon" className="relative"><Bell /><span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">4</span></Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline" className="h-10 gap-2 px-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-bd text-xs font-bold text-bd-foreground">VS</span><span className="hidden text-left md:block"><span className="block text-xs font-bold">Vikram Singh</span><span className="block text-[9px] text-muted-foreground">BDE Executive</span></span><ChevronDown /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end"><DropdownMenuItem asChild><Link to="/bde/profile">My profile</Link></DropdownMenuItem><DropdownMenuItem asChild><Link to="/bde/settings">Settings</Link></DropdownMenuItem><DropdownMenuItem asChild><Link to="/bde/support">Help & support</Link></DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onClick={() => { localStorage.removeItem("bharatone:auth"); navigate({ to: "/bde-login", replace: true }); }}>Sign out</DropdownMenuItem></DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
