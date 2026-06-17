import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  BarChart3, Bell, ChevronDown, ClipboardList, Gauge, Headphones,
  FileBarChart, LogOut, Menu, MessageCircle, PhoneCall, Search, Settings, Target, UserRound, X,
} from "lucide-react";
import { BharatOneLogo } from "@/components/bharatone-logo";
import { useCurrentUser } from "@/lib/use-current-user";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV = [
  { id: "command", label: "Work Overview", icon: Gauge },
  { id: "leads", label: "Assigned Applications", icon: ClipboardList },
  { id: "calls", label: "Call Queue", icon: PhoneCall },
  { id: "followups", label: "Follow-ups", icon: MessageCircle },
  { id: "performance", label: "Performance", icon: BarChart3 },
  { id: "reports", label: "Reports", icon: FileBarChart },
  { id: "script", label: "Call Scripts", icon: Headphones },
  { id: "profile", label: "My Profile", icon: UserRound },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

function Sidebar({ activeSection, onSelect, onNavigate }: { activeSection: string; onSelect: (section: string) => void; onNavigate?: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="flex h-full flex-col bg-navy text-hr-foreground">
      <div className="border-b border-hr-foreground/10 p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-card p-1.5 shadow-elev"><BharatOneLogo size="sm" /></div>
          <div><p className="text-sm font-extrabold">BharatOne Calls</p><p className="text-[10px] text-hr-foreground/60">Service application desk</p></div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto nav-scroll p-3">
        <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-widest text-hr-foreground/40">Service operations</p>
        <ul className="space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return <li key={item.label}><button type="button" onClick={() => { onSelect(item.id); onNavigate?.(); }} className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition ${active ? "bg-hr text-hr-foreground" : "text-hr-foreground/70 hover:bg-hr-foreground/10 hover:text-hr-foreground"}`}><Icon className="h-4 w-4" /><span>{item.label}</span></button></li>;
          })}
        </ul>
      </nav>
      <div className="border-t border-hr-foreground/10 p-3">
        <Button variant="ghost" className="w-full justify-start text-hr-foreground/70 hover:bg-hr-foreground/10 hover:text-hr-foreground" onClick={() => { localStorage.removeItem("bharatone:auth"); navigate({ to: "/telecaller-login", replace: true }); }}><LogOut /> Sign out</Button>
      </div>
    </div>
  );
}

export function TelecallerShell({ children, activeSection, onSectionChange }: { children: React.ReactNode; activeSection: string; onSectionChange: (section: string) => void }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const me = useCurrentUser();
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden h-screen w-72 shrink-0 lg:block"><Sidebar activeSection={activeSection} onSelect={onSectionChange} /></aside>
      {open && <div className="fixed inset-0 z-50 flex lg:hidden"><div className="absolute inset-0 bg-navy/60" onClick={() => setOpen(false)} /><aside className="relative w-72"><Button variant="ghost" size="icon" aria-label="Close menu" className="absolute right-2 top-2 z-10 text-hr-foreground" onClick={() => setOpen(false)}><X /></Button><Sidebar activeSection={activeSection} onSelect={onSectionChange} onNavigate={() => setOpen(false)} /></aside></div>}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-20 shrink-0 items-center justify-between gap-3 border-b border-border bg-card/90 px-4 backdrop-blur lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-3"><Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}><Menu /></Button><div className="hidden h-11 max-w-2xl flex-1 items-center gap-2 rounded-2xl bg-muted px-4 md:flex"><Search className="h-4 w-4 text-muted-foreground" /><input className="w-full bg-transparent text-sm outline-none" placeholder="Search application ID, retailer or customer…" /></div></div>
          <Button variant="outline" size="icon" className="relative"><Bell /><span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">9</span></Button>
          <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="h-10 gap-2 px-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-hr text-xs font-bold text-hr-foreground">{me.initials}</span><span className="hidden text-left md:block"><span className="block text-xs font-bold">{me.name}</span><span className="block text-[9px] text-muted-foreground">{me.role || "Telecaller"}</span></span><ChevronDown /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => onSectionChange("performance")}><Target /> My targets</DropdownMenuItem><DropdownMenuItem onClick={() => onSectionChange("profile")}><UserRound /> My profile</DropdownMenuItem><DropdownMenuItem onClick={() => onSectionChange("settings")}><Settings /> Settings</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onClick={() => { localStorage.removeItem("bharatone:auth"); navigate({ to: "/telecaller-login", replace: true }); }}>Sign out</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}