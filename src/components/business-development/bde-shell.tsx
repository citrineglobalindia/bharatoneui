import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  BadgeIndianRupee, BarChart3, Bell, BriefcaseBusiness, CalendarDays, ChevronDown,
  ClipboardList, FileChartColumn, FileCheck2, Gauge, Gift, LogOut, MapPinned, Menu,
  Search, Target, UserRound, X,
} from "lucide-react";
import { BharatOneLogo } from "@/components/bharatone-logo";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const NAV = [
  { id: "dashboard", label: "BD Dashboard", icon: Gauge },
  { id: "leads", label: "Lead Management", icon: ClipboardList },
  { id: "pipeline", label: "Onboarding Pipeline", icon: BriefcaseBusiness },
  { id: "activities", label: "Daily Activities", icon: Target },
  { id: "territory", label: "Territory", icon: MapPinned },
  { id: "meetings", label: "Meetings", icon: CalendarDays },
  { id: "documents", label: "Documents", icon: FileCheck2 },
  { id: "performance", label: "Performance", icon: BarChart3 },
  { id: "incentives", label: "Incentives", icon: Gift },
  { id: "reports", label: "Reports", icon: FileChartColumn },
] as const;

function Sidebar({ active, onSelect, close }: { active: string; onSelect: (id: string) => void; close?: () => void }) {
  const navigate = useNavigate();
  return <div className="flex h-full flex-col bg-navy text-bd-foreground">
    <div className="border-b border-bd-foreground/10 p-5"><div className="flex items-center gap-3"><span className="rounded-xl bg-card p-1.5 shadow-elev"><BharatOneLogo size="sm" /></span><div><p className="text-sm font-extrabold">BharatOne Growth</p><p className="text-[10px] text-bd-foreground/60">Partner acquisition CRM</p></div></div></div>
    <nav className="flex-1 overflow-y-auto nav-scroll p-3"><p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-widest text-bd-foreground/40">Business development</p><ul className="space-y-1">{NAV.map((item) => { const Icon = item.icon; return <li key={item.id}><Button variant="ghost" onClick={() => { onSelect(item.id); close?.(); }} className={`w-full justify-start ${active === item.id ? "bg-bd text-bd-foreground hover:bg-bd/90 hover:text-bd-foreground" : "text-bd-foreground/70 hover:bg-bd-foreground/10 hover:text-bd-foreground"}`}><Icon />{item.label}</Button></li>; })}</ul></nav>
    <div className="border-t border-bd-foreground/10 p-3"><Button variant="ghost" className="w-full justify-start text-bd-foreground/70 hover:bg-bd-foreground/10 hover:text-bd-foreground" onClick={() => { localStorage.removeItem("bharatone:auth"); navigate({ to: "/bde-login", replace: true }); }}><LogOut />Sign out</Button></div>
  </div>;
}

export function BdeShell({ children, active, onSelect }: { children: React.ReactNode; active: string; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  return <div className="flex h-screen overflow-hidden bg-background">
    <aside className="hidden h-screen w-72 shrink-0 lg:block"><Sidebar active={active} onSelect={onSelect} /></aside>
    {open && <div className="fixed inset-0 z-50 flex lg:hidden"><div className="absolute inset-0 bg-navy/60" onClick={() => setOpen(false)} /><aside className="relative w-72"><Button variant="ghost" size="icon" className="absolute right-2 top-2 z-10 text-bd-foreground" onClick={() => setOpen(false)}><X /></Button><Sidebar active={active} onSelect={onSelect} close={() => setOpen(false)} /></aside></div>}
    <div className="flex min-w-0 flex-1 flex-col"><header className="flex h-20 shrink-0 items-center gap-3 border-b border-border bg-card/90 px-4 backdrop-blur lg:px-8"><Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)}><Menu /></Button><div className="hidden h-11 max-w-2xl flex-1 items-center gap-2 rounded-2xl bg-muted px-4 md:flex"><Search className="h-4 w-4 text-muted-foreground" /><input className="w-full bg-transparent text-sm outline-none" placeholder="Search lead, center, territory or meeting…" /></div><div className="flex-1 md:hidden" /><Button variant="outline" size="icon" className="relative"><Bell /><span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">7</span></Button><DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="h-10 gap-2 px-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-bd text-xs font-bold text-bd-foreground">RK</span><span className="hidden text-left md:block"><span className="block text-xs font-bold">Rahul Kumar</span><span className="block text-[9px] text-muted-foreground">BD Executive · Bengaluru</span></span><ChevronDown /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => onSelect("performance")}><UserRound />My performance</DropdownMenuItem><DropdownMenuItem onClick={() => onSelect("incentives")}><BadgeIndianRupee />My incentives</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onClick={() => { localStorage.removeItem("bharatone:auth"); navigate({ to: "/bde-login", replace: true }); }}>Sign out</DropdownMenuItem></DropdownMenuContent></DropdownMenu></header><main className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</main></div>
  </div>;
}