import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bell, BriefcaseBusiness, CalendarCheck, ChartNoAxesCombined, ChevronDown,
  ClipboardList, FileChartColumn, GraduationCap, LayoutDashboard, LogOut,
  Menu, Search, UserPlus, UsersRound, WalletCards, X,
} from "lucide-react";
import { BharatOneLogo } from "@/components/bharatone-logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV = [
  { label: "HR Dashboard", icon: LayoutDashboard, anchor: "overview" },
  { label: "Employees", icon: UsersRound, anchor: "employees" },
  { label: "Attendance", icon: CalendarCheck, anchor: "attendance" },
  { label: "Leave Management", icon: ClipboardList, anchor: "leave" },
  { label: "Recruitment", icon: BriefcaseBusiness, anchor: "recruitment" },
  { label: "Onboarding", icon: UserPlus, anchor: "onboarding" },
  { label: "Payroll", icon: WalletCards, anchor: "payroll" },
  { label: "Performance", icon: ChartNoAxesCombined, anchor: "performance" },
  { label: "Training", icon: GraduationCap, anchor: "onboarding" },
  { label: "Reports", icon: FileChartColumn, anchor: "reports" },
];

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (
    <div className="flex h-full flex-col bg-navy text-hr-foreground">
      <div className="border-b border-hr-foreground/10 p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-card p-1.5 shadow-elev"><BharatOneLogo size="sm" /></div>
          <div><p className="text-sm font-extrabold">BharatOne HR</p><p className="text-[10px] text-hr-foreground/60">People Operations</p></div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-widest text-hr-foreground/40">Workspace</p>
        <ul className="space-y-1">
          {NAV.map((item, index) => {
            const Icon = item.icon;
            const active = index === 0 && pathname === "/hr/dashboard";
            return (
              <li key={item.label}>
                <a href={`#${item.anchor}`} onClick={onNavigate} className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${active ? "bg-hr text-hr-foreground" : "text-hr-foreground/70 hover:bg-hr-foreground/10 hover:text-hr-foreground"}`}>
                  <Icon className="h-4 w-4" /><span>{item.label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-hr-foreground/10 p-3">
        <Button variant="ghost" className="w-full justify-start text-hr-foreground/70 hover:bg-hr-foreground/10 hover:text-hr-foreground" onClick={() => { try { localStorage.removeItem("bharatone:auth"); } catch {} navigate({ to: "/login" }); }}>
          <LogOut /> Sign out
        </Button>
      </div>
    </div>
  );
}

export function HrShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex h-screen overflow-hidden bg-hr-soft/40">
      <aside className="hidden h-screen w-64 shrink-0 lg:block"><Sidebar /></aside>
      {open && <div className="fixed inset-0 z-50 flex lg:hidden"><div className="absolute inset-0 bg-navy/60" onClick={() => setOpen(false)} /><aside className="relative w-72"><Button variant="ghost" size="icon" aria-label="Close menu" className="absolute right-2 top-2 z-10 text-hr-foreground" onClick={() => setOpen(false)}><X /></Button><Sidebar onNavigate={() => setOpen(false)} /></aside></div>}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-card/90 px-4 backdrop-blur lg:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}><Menu /></Button>
            <div className="hidden h-10 max-w-lg flex-1 items-center gap-2 rounded-xl bg-muted px-3 md:flex"><Search className="h-4 w-4 text-muted-foreground" /><input className="w-full bg-transparent text-sm outline-none" placeholder="Search employees, candidates, documents…" /></div>
          </div>
          <Button variant="outline" size="icon" className="relative"><Bell /><span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">6</span></Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline" className="h-10 gap-2 px-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-hr text-xs font-bold text-hr-foreground">AR</span><span className="hidden text-left md:block"><span className="block text-xs font-bold">Ananya Rao</span><span className="block text-[9px] text-muted-foreground">HR Manager</span></span><ChevronDown /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end"><DropdownMenuItem>HR Manager · Corporate</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onClick={() => { try { localStorage.removeItem("bharatone:auth"); } catch {} }}>Sign out</DropdownMenuItem></DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}