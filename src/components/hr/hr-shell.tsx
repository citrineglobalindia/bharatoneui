import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bell, BriefcaseBusiness, CalendarCheck, ChartNoAxesCombined, ChevronDown,
  ClipboardList, FileChartColumn, GraduationCap, Headphones, LayoutDashboard, LogOut,
  Menu, MessageSquareText, Search, Settings, UserPlus, UserRound, UsersRound, WalletCards, X,
} from "lucide-react";
import { BharatOneLogo } from "@/components/bharatone-logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV = [
  { label: "HR Dashboard", icon: LayoutDashboard, to: "/hr/dashboard" },
  { label: "Employees", icon: UsersRound, to: "/hr/employees" },
  { label: "Attendance", icon: CalendarCheck, to: "/hr/attendance" },
  { label: "Leave Management", icon: ClipboardList, to: "/hr/leave" },
  { label: "Recruitment", icon: BriefcaseBusiness, to: "/hr/recruitment" },
  { label: "Onboarding", icon: UserPlus, to: "/hr/onboarding" },
  { label: "Payroll", icon: WalletCards, to: "/hr/payroll" },
  { label: "Performance", icon: ChartNoAxesCombined, to: "/hr/performance" },
  { label: "Training", icon: GraduationCap, to: "/hr/training" },
  { label: "Reports", icon: FileChartColumn, to: "/hr/reports" },
];
const ACCOUNT_NAV = [
  { label: "My Profile", icon: UserRound, to: "/hr/profile" },
  { label: "Settings", icon: Settings, to: "/hr/settings" },
  { label: "Help & Support", icon: Headphones, to: "/hr/support" },
  { label: "Feedback", icon: MessageSquareText, to: "/hr/feedback" },
];

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (
    <div className="flex h-full flex-col bg-navy text-hr-foreground">
      <div className="border-b border-hr-foreground/10 p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-card p-1.5 shadow-elev"><BharatOneLogo size="sm" /></div>
          <div><p className="text-sm font-extrabold">BharatOne HR</p><p className="text-[10px] text-hr-foreground/60">People Operations</p></div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-3">
        <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-widest text-hr-foreground/40">Workspace</p>
        <ul className="space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to;
            return (
              <li key={item.label}>
                <Link to={item.to} onClick={onNavigate} className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${active ? "bg-hr text-hr-foreground" : "text-hr-foreground/70 hover:bg-hr-foreground/10 hover:text-hr-foreground"}`}>
                  <Icon className="h-4 w-4" /><span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="px-3 pb-2 pt-6 text-[10px] font-bold uppercase tracking-widest text-hr-foreground/40">Account & assistance</p>
        <ul className="space-y-1">{ACCOUNT_NAV.map((item) => { const Icon = item.icon; const active = pathname === item.to; return <li key={item.label}><Link to={item.to} onClick={onNavigate} className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition ${active ? "bg-hr text-hr-foreground shadow-lg shadow-navy" : "text-hr-foreground/65 hover:bg-hr-foreground/10 hover:text-hr-foreground"}`}><Icon className="h-4 w-4"/><span>{item.label}</span></Link></li>; })}</ul>
      </nav>
      <div className="border-t border-hr-foreground/10 p-3">
        <Button variant="ghost" className="w-full justify-start text-hr-foreground/70 hover:bg-hr-foreground/10 hover:text-hr-foreground" onClick={() => { localStorage.removeItem("bharatone:auth"); navigate({ to: "/hr-login", replace: true }); }}>
          <LogOut /> Sign out
        </Button>
      </div>
    </div>
  );
}

export function HrShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden h-screen w-72 shrink-0 lg:block"><Sidebar /></aside>
      {open && <div className="fixed inset-0 z-50 flex lg:hidden"><div className="absolute inset-0 bg-navy/60" onClick={() => setOpen(false)} /><aside className="relative w-72"><Button variant="ghost" size="icon" aria-label="Close menu" className="absolute right-2 top-2 z-10 text-hr-foreground" onClick={() => setOpen(false)}><X /></Button><Sidebar onNavigate={() => setOpen(false)} /></aside></div>}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-20 shrink-0 items-center justify-between gap-3 border-b border-border bg-card/90 px-4 backdrop-blur lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}><Menu /></Button>
             <div className="hidden h-11 max-w-2xl flex-1 items-center gap-2 rounded-2xl bg-muted px-4 md:flex"><Search className="h-4 w-4 text-muted-foreground" /><input className="w-full bg-transparent text-sm outline-none" placeholder="Search people, workflows, documents or reports…" /></div>
          </div>
          <Button variant="outline" size="icon" className="relative"><Bell /><span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">6</span></Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline" className="h-10 gap-2 px-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-hr text-xs font-bold text-hr-foreground">AR</span><span className="hidden text-left md:block"><span className="block text-xs font-bold">Ananya Rao</span><span className="block text-[9px] text-muted-foreground">HR Manager</span></span><ChevronDown /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end"><DropdownMenuItem asChild><Link to="/hr/profile">My profile</Link></DropdownMenuItem><DropdownMenuItem asChild><Link to="/hr/settings">Settings</Link></DropdownMenuItem><DropdownMenuItem asChild><Link to="/hr/support">Help & support</Link></DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onClick={() => { localStorage.removeItem("bharatone:auth"); navigate({ to: "/hr-login", replace: true }); }}>Sign out</DropdownMenuItem></DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}