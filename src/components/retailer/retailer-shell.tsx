import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  Banknote,
  FileCheck2,
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
  IdCard,
  Menu,
  X,
  Search,
  Smile, ChevronDown } from "lucide-react";
import { useCurrentUser } from "@/lib/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { BharatOneLogo } from "@/components/bharatone-logo";
import { NotificationsBell } from "@/components/retailer/notifications-bell";
import { ProfileMenu } from "@/components/retailer/profile-menu";
import { LanguageSwitch } from "@/components/retailer/language-switch";

type NavItem = { label: string; icon: React.ReactNode; to: string; children?: { label: string; to: string }[] };
type NavSection = { heading: string; items: NavItem[] };

const NAV: NavSection[] = [
  {
    heading: "Main",
    items: [
      { label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, to: "/dashboard" },
      { label: "KYC Docs", icon: <FileCheck2 className="h-4 w-4" />, to: "/video-kyc" },
    ],
  },
  {
    heading: "Services",
    items: [
      // Children are the admin-created FRONTEND categories, injected dynamically at render.
      { label: "My Services", icon: <Wrench className="h-4 w-4" />, to: "/services" },
      { label: "New Application", icon: <PlusCircle className="h-4 w-4" />, to: "/new-service-request" },
      { label: "My Applications", icon: <ClipboardList className="h-4 w-4" />, to: "/applications" },
    ],
  },
  {
    heading: "Finance",
    items: [
      { label: "Wallet", icon: <Wallet className="h-4 w-4" />, to: "/wallet", children: [
        { label: "My Wallet", to: "/wallet" },
        { label: "Recharges", to: "/wallet/recharges" },
        { label: "Ledger", to: "/wallet/ledger" },
        { label: "Deductions", to: "/wallet/deductions" },
        { label: "Mandatory Recoveries", to: "/wallet/mandatory-recoveries" },
        { label: "Refund Requests", to: "/wallet/refunds" },
      ] },
      { label: "AEPS Banking", icon: <Banknote className="h-4 w-4" />, to: "/aeps" },
      { label: "Transactions", icon: <ArrowLeftRight className="h-4 w-4" />, to: "/transactions" },
      { label: "Reports", icon: <BarChart3 className="h-4 w-4" />, to: "/reports" },
    ],
  },
  {
    heading: "Support",
    items: [
      { label: "Support Tickets", icon: <LifeBuoy className="h-4 w-4" />, to: "/support" },
      { label: "Feedback", icon: <Smile className="h-4 w-4" />, to: "/feedback" },
      { label: "Settings", icon: <Settings className="h-4 w-4" />, to: "/settings" },
    ],
  },
];

function SidebarBody({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const navigate = useNavigate();
  const me = useCurrentUser();
  const [openKey, setOpenKey] = useState<string | null>(null);
  // Admin-created frontend categories = the retailer "My Services" sub-menu (dynamic).
  const [frontCats, setFrontCats] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    let on = true;
    (async () => {
      const { data } = await (supabase as any)
        .from("service_categories").select("id,name")
        .or("kind.eq.frontend,kind.is.null").eq("is_active", true)
        .order("sort_order").order("name");
      if (on) setFrontCats((data as { id: string; name: string }[]) ?? []);
    })();
    return () => { on = false; };
  }, []);
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-4 border-b border-border">
        <BharatOneLogo size="md" />
      </div>
      <div className="px-4 py-3 border-b border-border flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-india-green/10 text-india-green flex items-center justify-center font-bold">{me.initials}</div>
        <div className="min-w-0">
          <p className="text-sm font-bold truncate">{me.name}</p>
          <p className="text-[11px] text-muted-foreground truncate">{me.email}</p>
          {me.phone && <p className="text-[11px] text-muted-foreground truncate">{/^\d{10}$/.test(me.phone) ? `+91 ${me.phone}` : me.phone}</p>}
          {me.jskoId && <span className="inline-block mt-0.5 text-[10px] font-semibold bg-india-green text-white px-1.5 py-0.5 rounded">JSKO ID: {me.jskoId}</span>}
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto nav-scroll px-2 py-3 space-y-4">
        {NAV.map((sec) => (
          <div key={sec.heading}>
            <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{sec.heading}</p>
            <ul className="space-y-0.5">
              {sec.items.map((it) => {
                const active = pathname === it.to;
                // "My Services" children = admin-created service categories (dynamic).
                const children = it.to === "/services" && frontCats.length
                  ? [{ label: "All Services", to: "/services" }, ...frontCats.map((c) => ({ label: c.name, to: `/services?cat=${c.id}` }))]
                  : it.children;
                if (children && children.length) {
                  const childActive = children.some((ch) => pathname === ch.to);
                  const expanded = openKey === it.to || (openKey === null && (childActive || pathname === it.to));
                  return (
                    <li key={it.to}>
                      <button type="button"
                        onClick={() => setOpenKey(expanded ? "" : it.to)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active || childActive ? "bg-saffron-gradient text-white shadow-elev" : "text-foreground/80 hover:bg-muted hover:text-foreground"}`}>
                        <span className={active || childActive ? "text-white" : "text-muted-foreground"}>{it.icon}</span>
                        <span className="truncate flex-1 text-left">{it.label}</span>
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""} ${active || childActive ? "text-white" : "text-muted-foreground"}`} />
                      </button>
                      {expanded && (
                        <ul className="mt-0.5 ml-4 space-y-0.5 border-l border-border pl-2">
                          {children.map((ch) => {
                            const [cpath, cqs] = ch.to.split("?");
                            const csearch = cqs ? Object.fromEntries(new URLSearchParams(cqs)) : undefined;
                            const ca = pathname === cpath && (!csearch || (typeof window !== "undefined" && window.location.search.includes(cqs ?? "")));
                            return (
                              <li key={ch.to}>
                                <Link to={cpath as never} search={csearch as never} onClick={onNavigate}
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] transition-colors ${ca ? "bg-india-green/10 text-india-green font-semibold" : "text-foreground/70 hover:bg-muted hover:text-foreground"}`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${ca ? "bg-india-green" : "bg-muted-foreground/40"}`} /> {ch.label}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                }
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
    <div className="h-screen overflow-hidden bg-muted/30 flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border bg-card h-screen sticky top-0">
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
            <GlobalSearch />
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitch />
            <NotificationsBell />
            <ProfileMenu />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}


const SEARCH_DESTS: { label: string; to: string; kw: string }[] = [
  { label: "Dashboard", to: "/dashboard", kw: "home overview" },
  { label: "KYC Documents", to: "/video-kyc", kw: "kyc aadhaar pan documents verification" },
  { label: "My Services", to: "/services", kw: "services partner redirect api" },
  { label: "New Application", to: "/new-service-request", kw: "apply new request backend service" },
  { label: "My Applications", to: "/applications", kw: "applications status track applied services" },
  { label: "Wallet", to: "/wallet", kw: "wallet balance add funds topup" },
  { label: "Recharges", to: "/wallet/recharges", kw: "recharge topup wallet credit" },
  { label: "Ledger", to: "/wallet/ledger", kw: "ledger statement balance service wise" },
  { label: "Deductions", to: "/wallet/deductions", kw: "deductions debit charges category" },
  { label: "Mandatory Recoveries", to: "/wallet/mandatory-recoveries", kw: "recovery mandatory company" },
  { label: "Refund Requests", to: "/wallet/refunds", kw: "refund request money back" },
  { label: "AEPS Banking", to: "/aeps", kw: "aeps aadhaar cash withdrawal balance banking biometric" },
  { label: "Transactions", to: "/transactions", kw: "transactions history wallet" },
  { label: "Reports", to: "/reports", kw: "reports analytics commission volume" },
  { label: "Support Tickets", to: "/support", kw: "support help ticket" },
  { label: "Feedback", to: "/feedback", kw: "feedback suggestion" },
  { label: "Settings", to: "/settings", kw: "settings password profile account" },
];

function GlobalSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = q.trim()
    ? SEARCH_DESTS.filter((d) => (d.label + " " + d.kw).toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8)
    : [];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); inputRef.current?.focus(); setOpen(true); }
    };
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDoc);
    return () => { window.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onDoc); };
  }, []);

  const go = (to: string) => { setOpen(false); setQ(""); navigate({ to }); };

  return (
    <div ref={ref} className="relative hidden lg:block">
      <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 h-9 w-[28rem] xl:w-[34rem]">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
            else if (e.key === "Enter" && results[active]) { e.preventDefault(); go(results[active].to); }
            else if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Search services, transactions, applications…"
          className="bg-transparent flex-1 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {open && q.trim() && (
        <div className="absolute left-0 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-card shadow-elev z-50">
          {results.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">No matches for “{q}”.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map((r, i) => (
                <li key={r.to}>
                  <button onMouseEnter={() => setActive(i)} onClick={() => go(r.to)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${i === active ? "bg-muted" : "hover:bg-muted/60"}`}>
                    <Search className="h-3.5 w-3.5 text-muted-foreground" /> <span className="font-medium">{r.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
