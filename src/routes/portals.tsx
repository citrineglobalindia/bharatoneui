import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Building2,
  Calculator,
  ClipboardCheck,
  Crown,
  Map,
  MapPin,
  Store,
  Truck,
} from "lucide-react";
import { BharatOneLogo } from "@/components/bharatone-logo";

export const Route = createFileRoute("/portals")({
  head: () => ({
    meta: [
      { title: "Choose your Portal — BharatOne" },
      { name: "description", content: "Sign in to your BharatOne portal: Retailer, Distributor, QC, Accountant, Admin, DRO or TRO." },
    ],
  }),
  component: PortalsPage,
});

const PORTALS = [
  { to: "/login", name: "Retailer", desc: "AEPS, DMT, Recharge, BBPS", icon: Store, accent: "text-india-green", ring: "ring-india-green/30" },
  { to: "/distributor-login", name: "Distributor", desc: "Manage retailers & stock", icon: Truck, accent: "text-sky-600", ring: "ring-sky-500/30" },
  { to: "/master-distributor-login", name: "Master Distributor", desc: "Oversee distributor network", icon: Building2, accent: "text-violet-600", ring: "ring-violet-500/30" },
  { to: "/qc-login", name: "Quality Control", desc: "KYC & application reviews", icon: ClipboardCheck, accent: "text-indigo-600", ring: "ring-indigo-500/30" },
  { to: "/accountant-login", name: "Accountant", desc: "Settlements & ledgers", icon: Calculator, accent: "text-india-green", ring: "ring-india-green/30" },
  { to: "/admin-login", name: "Administrator", desc: "Master network control", icon: Crown, accent: "text-saffron", ring: "ring-saffron/30" },
  { to: "/dro-login", name: "District Officer (DRO)", desc: "District-level oversight", icon: Map, accent: "text-rose-600", ring: "ring-rose-500/30" },
  { to: "/tro-login", name: "Taluk Officer (TRO)", desc: "Taluk field operations", icon: MapPin, accent: "text-amber-700", ring: "ring-amber-500/30" },
] as const;

function PortalsPage() {
  return (
    <div className="min-h-screen bg-tricolor flex items-center justify-center p-4">
      <div className="w-full max-w-5xl rounded-2xl border border-border bg-card shadow-elev p-6 sm:p-8">
        <div className="flex flex-col items-center text-center">
          <BharatOneLogo size="lg" />
          <h1 className="font-display mt-3 text-2xl sm:text-3xl font-extrabold text-foreground">
            Choose your <span className="text-saffron">Portal</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-xl">
            Select the portal that matches your role to sign in.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PORTALS.map((p) => {
            const Icon = p.icon;
            return (
              <Link
                key={p.to}
                to={p.to}
                className="group flex flex-col items-start gap-3 rounded-xl border border-border bg-white p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elev"
              >
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-white ring-2 ${p.ring}`}>
                  <Icon className={`h-5 w-5 ${p.accent}`} />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{p.desc}</p>
                </div>
                <span className={`mt-auto inline-flex items-center gap-1 text-xs font-semibold ${p.accent} group-hover:translate-x-0.5 transition-transform`}>
                  Sign in <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            );
          })}
        </div>

        <div className="mt-6 h-1.5 w-full rounded-full bg-gradient-to-r from-saffron via-white to-india-green" />
      </div>
    </div>
  );
}