import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell, ChevronDown, ClipboardList, Headphones, LayoutDashboard, LogOut, Menu,
  MessageSquareText, Settings, UserRound, X, KeyRound,
} from "lucide-react";
import { usePortalGuard, PortalAuthGate } from "@/lib/portal-guard";
import { BharatOneLogo } from "@/components/bharatone-logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/use-current-user";

/**
 * Chrome for the operator portal.
 *
 * The operator console was the one staff surface with no shell at all — a bare
 * page with a logout button, no sidebar, and none of the account plumbing every
 * other role already had. Notifications, profile, settings, support and
 * feedback all reuse the same role-generic components the QC and accountant
 * portals mount; nothing here is operator-specific except the nav.
 */

const NAV = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/operator/dashboard" },
  { label: "Applications", icon: ClipboardList, to: "/operator" },
  { label: "Notifications", icon: Bell, to: "/operator/notifications" },
];
const ACCOUNT_NAV = [
  { label: "My Profile", icon: UserRound, to: "/operator/profile" },
  { label: "Settings", icon: Settings, to: "/operator/settings" },
  { label: "Change Password", icon: KeyRound, to: "/operator/change-password" },
  { label: "Help & Support", icon: Headphones, to: "/operator/support" },
  { label: "Feedback", icon: MessageSquareText, to: "/operator/feedback" },
];

function Sidebar({ onNavigate, onLogout }: { onNavigate?: () => void; onLogout: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const item = (it: { label: string; icon: any; to: string }) => {
    const Icon = it.icon;
    const active = pathname === it.to || pathname === it.to + "/";
    return (
      <li key={it.label}>
        <Link to={it.to as never} onClick={onNavigate}
          className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-saffron-gradient text-white shadow-elev" : "text-foreground/80 hover:bg-muted hover:text-foreground"}`}>
          <Icon className={`h-4 w-4 ${active ? "text-white" : "text-muted-foreground"}`} />
          <span>{it.label}</span>
        </Link>
      </li>
    );
  };
  return (
    <div className="flex h-full flex-col border-r border-border bg-card">
      <div className="border-b border-border p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-card p-1 shadow-soft"><BharatOneLogo size="sm" /></div>
          <div>
            <p className="font-display text-sm font-extrabold">Operator Console</p>
            <p className="text-[10px] text-muted-foreground">Service applications</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto nav-scroll p-3">
        <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Workspace</p>
        <ul className="space-y-0.5">{NAV.map(item)}</ul>
        <p className="px-3 pb-1.5 pt-5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Account & assistance</p>
        <ul className="space-y-0.5">{ACCOUNT_NAV.map(item)}</ul>
      </nav>
      <div className="border-t border-border p-3">
        <Button variant="ghost" className="w-full justify-start text-foreground/70 hover:bg-muted" onClick={onLogout}>
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </Button>
      </div>
    </div>
  );
}

export function OperatorShell({ children }: { children: React.ReactNode }) {
  // The guard lives here so every operator page is covered once; the pages
  // themselves carry no auth code, same as the QC and accountant wrappers.
  const ready = usePortalGuard("/login", ["operator", "admin"]);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const navigate = useNavigate();
  const me = useCurrentUser();

  // Real unread count off the notifications table (RLS scopes it to this user).
  // Other shells hard-code a badge number; a bell that always says "4" is worse
  // than no bell.
  useEffect(() => {
    if (!ready) return;
    let on = true;
    (async () => {
      try {
        const { count } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("read", false);
        if (on) setUnread(count ?? 0);
      } catch { /* ignore */ }
    })();
    return () => { on = false; };
  }, [ready]);

  const logout = () => {
    try { localStorage.removeItem("bharatone:auth"); } catch { /* ignore */ }
    void supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  if (!ready) return <PortalAuthGate />;

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      <aside className="hidden h-screen w-64 shrink-0 lg:block"><Sidebar onLogout={logout} /></aside>
      {open && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-foreground/50" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-64 bg-card">
            <Button variant="ghost" size="icon" aria-label="Close menu" className="absolute right-2 top-2 z-10" onClick={() => setOpen(false)}><X /></Button>
            <Sidebar onNavigate={() => setOpen(false)} onLogout={logout} />
          </aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 shadow-soft lg:px-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}><Menu /></Button>
            <p className="hidden text-sm font-semibold text-muted-foreground sm:block">Service applications assigned to you</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to={"/operator/notifications" as never} aria-label="Notifications"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-muted">
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9 gap-2 px-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-india-green/10 text-[10px] font-extrabold text-india-green">{me.initials}</span>
                  <span className="hidden text-left md:block">
                    <span className="block text-xs font-bold">{me.name}</span>
                    <span className="block text-[9px] text-muted-foreground">{me.role || "Operator"}</span>
                  </span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild><Link to={"/operator/profile" as never}>My profile</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to={"/operator/settings" as never}>Settings</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to={"/operator/change-password" as never}>Change password</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to={"/operator/support" as never}>Help &amp; support</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
