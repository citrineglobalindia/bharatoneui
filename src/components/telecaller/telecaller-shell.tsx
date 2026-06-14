import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  BarChart3, Bell, ChevronDown, ClipboardList, Gauge, Headphones,
  LogOut, Menu, MessageCircle, PhoneCall, Search, Settings, Target, X,
} from "lucide-react";
import { BharatOneLogo } from "@/components/bharatone-logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV = [
  { label: "Command Center", icon: Gauge, to: "/telecaller" },
  { label: "Lead Workspace", icon: ClipboardList, to: "/telecaller" },
  { label: "Call Queue", icon: PhoneCall, to: "/telecaller" },
  { label: "Follow-ups", icon: MessageCircle, to: "/telecaller" },
  { label: "Performance", icon: BarChart3, to: "/telecaller" },
  { label: "Call Scripts", icon: Headphones, to: "/telecaller" },
] as const;

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (
    <div className="flex h-full flex-col bg-navy text-hr-foreground">
      <div className="border-b border-hr-foreground/10 p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-card p-1.5 shadow-elev"><BharatOneLogo size="sm" /></div>
          <div><p className="text-sm font-extrabold">BharatOne Calls</p><p className="text-[10px] text-hr-foreground/60">Telecaller CRM</p></div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-3">
        <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-widest text-hr-foreground/40">Sales workspace</p>
        <ul className="space-y-1">
          {NAV.map((item, index) => {
            const Icon = item.icon;
            const active = pathname === item.to && index === 0;
            return <li key={item.label}><Link to={item.to} onClick={onNavigate} className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${active ? "bg-hr text-hr-foreground" : "text-hr-foreground/70 hover:bg-hr-foreground/10 hover:text-hr-foreground"}`}><Icon className="h-4 w-4" /><span>{item.label}</span></Link></li>;
          })}
        </ul>
      </nav>
      <div className="border-t border-hr-foreground/10 p-3">
        <Button variant="ghost" className="w-full justify-start text-hr-foreground/70 hover:bg-hr-foreground/10 hover:text-hr-foreground" onClick={() => { localStorage.removeItem("bharatone:auth"); navigate({ to: "/telecaller-login", replace: true }); }}><LogOut /> Sign out</Button>
      </div>
    </div>
  );
}

export function TelecallerShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden h-screen w-72 shrink-0 lg:block"><Sidebar /></aside>
      {open && <div className="fixed inset-0 z-50 flex lg:hidden"><div className="absolute inset-0 bg-navy/60" onClick={() => setOpen(false)} /><aside className="relative w-72"><Button variant="ghost" size="icon" aria-label="Close menu" className="absolute right-2 top-2 z-10 text-hr-foreground" onClick={() => setOpen(false)}><X /></Button><Sidebar onNavigate={() => setOpen(false)} /></aside></div>}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-20 shrink-0 items-center justify-between gap-3 border-b border-border bg-card/90 px-4 backdrop-blur lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-3"><Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}><Menu /></Button><div className="hidden h-11 max-w-2xl flex-1 items-center gap-2 rounded-2xl bg-muted px-4 md:flex"><Search className="h-4 w-4 text-muted-foreground" /><input className="w-full bg-transparent text-sm outline-none" placeholder="Search leads, phone numbers or services…" /></div></div>
          <Button variant="outline" size="icon" className="relative"><Bell /><span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">9</span></Button>
          <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="h-10 gap-2 px-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-hr text-xs font-bold text-hr-foreground">AK</span><span className="hidden text-left md:block"><span className="block text-xs font-bold">Arjun Kumar</span><span className="block text-[9px] text-muted-foreground">Telecaller Executive</span></span><ChevronDown /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem><Target /> My targets</DropdownMenuItem><DropdownMenuItem><Settings /> Settings</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onClick={() => { localStorage.removeItem("bharatone:auth"); navigate({ to: "/telecaller-login", replace: true }); }}>Sign out</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}