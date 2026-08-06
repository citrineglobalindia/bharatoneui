// BharatOne Store & Fulfilment portal shell.
//
// Warehouse staff. Deliberately the narrowest portal on the platform: five
// screens, all of them about getting a box to a door. There is no wallet, no
// commission and no retailer network — packing a parcel should not come with
// the ability to change what anybody earns, so the RPCs behind these screens
// simply do not return those columns.
//
// It does now carry Settings. That was originally left out on the same
// reasoning, but "no settings" also meant no password change and nowhere to set
// up two-factor authentication, which store_staff is required to hold. Narrow
// is the point; unreachable is a different thing.
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { usePortalGuard, PortalAuthGate } from "@/lib/portal-guard";
import { useDisabledModules } from "@/hooks/use-modules";
import {
  LayoutDashboard, PackageCheck, Boxes, RotateCcw, Bike, LogOut, Menu, X, SlidersHorizontal,
} from "lucide-react";
import { BharatOneLogo } from "@/components/bharatone-logo";
import { Button } from "@/components/ui/button";

const NAV = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/store/dashboard" },
  { label: "Orders", icon: PackageCheck, to: "/store/orders", moduleKey: "store.orders" },
  { label: "Inventory", icon: Boxes, to: "/store/inventory", moduleKey: "store.inventory" },
  { label: "Returns", icon: RotateCcw, to: "/store/returns", moduleKey: "store.returns" },
  { label: "Delivery agents", icon: Bike, to: "/store/agents", moduleKey: "store.agents" },
  // Deliberately no moduleKey: an account screen must not be something an
  // administrator can switch off, or two-factor becomes unreachable.
  { label: "Settings", icon: SlidersHorizontal, to: "/store/settings" },
];

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { off } = useDisabledModules();
  const nav = NAV.filter((i) => !i.moduleKey || !off.has(i.moduleKey));
  return (
    <div className="flex h-full flex-col bg-navy text-white">
      <div className="border-b border-white/10 p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-card p-1.5 shadow-elev"><BharatOneLogo size="sm" /></div>
          <div>
            <p className="text-sm font-extrabold">BharatOne Store</p>
            <p className="text-[10px] text-white/60">Packing &amp; dispatch</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto nav-scroll p-3">
        <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-widest text-white/40">Workspace</p>
        <ul className="space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to;
            return (
              <li key={item.label}>
                <Link to={item.to} onClick={onNavigate}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                    active ? "bg-violet-600 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"}`}>
                  <Icon className="h-4 w-4" /><span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-white/10 p-3">
        <Button variant="ghost" className="w-full justify-start text-white/70 hover:bg-white/10 hover:text-white"
          onClick={() => { localStorage.removeItem("bharatone:auth"); navigate({ to: "/store-login", replace: true }); }}>
          <LogOut /> Sign out
        </Button>
      </div>
    </div>
  );
}

export function StoreShell({ children }: { children: React.ReactNode }) {
  const ready = usePortalGuard("/store-login", ["store_staff", "admin"]);
  const [open, setOpen] = useState(false);
  if (!ready) return <PortalAuthGate />;
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden h-screen w-64 shrink-0 lg:block"><Sidebar /></aside>
      {open && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-navy/60" onClick={() => setOpen(false)} />
          <aside className="relative w-64">
            <Button variant="ghost" size="icon" aria-label="Close menu"
              className="absolute right-2 top-2 z-10 text-white" onClick={() => setOpen(false)}><X /></Button>
            <Sidebar onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card/90 px-4 backdrop-blur lg:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}><Menu /></Button>
          <div className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5 text-violet-600" />
            <span className="text-sm font-extrabold">Store &amp; Fulfilment</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
