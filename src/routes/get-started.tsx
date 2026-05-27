import { createFileRoute } from "@tanstack/react-router";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  UserCheck,
  Store,
  ArrowRight,
  ShieldCheck,
  Truck,
  Sparkles,
  Clock,
  Users,
  Facebook,
  Youtube,
  Instagram,
  AtSign,
} from "lucide-react";
import { BharatOneLogo } from "@/components/bharatone-logo";

export const Route = createFileRoute("/get-started")({
  head: () => ({
    meta: [
      { title: "JSKO / Retailer Registration — BharatOne" },
      {
        name: "description",
        content:
          "Choose your onboarding type and complete the required verification steps on BharatOne.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  return (
    <div className="relative min-h-screen overflow-hidden bg-tricolor">
      {/* Ambient decoration (static, low blur for perf) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-24 h-72 w-72 rounded-full bg-saffron-gradient opacity-15 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-40 -left-24 h-64 w-64 rounded-full bg-emerald-300/20 blur-2xl"
      />

      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="relative mx-auto flex h-16 max-w-5xl items-center justify-center px-4 sm:px-6">
          <Link
            to="/login"
            aria-label="Go back"
            className="absolute left-3 sm:left-6 inline-flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <BharatOneLogo size="lg" />
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-14">
        <div className="text-center sm:text-left animate-in fade-in slide-in-from-bottom-3 duration-500">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent bg-white/80 backdrop-blur px-3 py-1.5 text-xs font-semibold text-saffron shadow-soft">
            <Sparkles className="h-3.5 w-3.5" /> JSKO Onboarding Portal
          </div>
          <h1 className="font-display mt-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-[1.05]">
            Welcome to{" "}
            <span className="bg-saffron-gradient bg-clip-text text-transparent">
              BharatOne
            </span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm sm:text-base text-muted-foreground sm:mx-0 mx-auto">
            Choose your onboarding type below. Each path takes about{" "}
            <span className="font-semibold text-foreground">5–7 minutes</span> with secure
            KYC and video verification.
          </p>
        </div>

        <div className="mt-7 sm:mt-10 grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <OnboardingCard
            delay={120}
            icon={<UserCheck className="h-6 w-6" />}
            title="Old JSKO Onboarding"
            description="Migrate your existing JSKO account from the legacy portal."
            badge="Migrate"
            badgeTone="emerald"
            accent="from-amber-400 to-orange-500"
            onClick={() => navigate({ to: "/register", search: { type: "old" } })}
          />
          <OnboardingCard
            delay={240}
            icon={<Store className="h-6 w-6" />}
            title="New Retailer Registration"
            description="For new retailers registering directly on the BharatOne portal."
            badge="Most popular"
            badgeTone="saffron"
            featured
            accent="from-orange-500 to-rose-500"
            onClick={() => navigate({ to: "/register", search: { type: "new" } })}
          />
          <OnboardingCard
            delay={360}
            icon={<Truck className="h-6 w-6" />}
            title="Distributor Onboarding"
            description="Register as an authorised BharatOne distributor with GST & territory."
            badge="New"
            badgeTone="blue"
            accent="from-emerald-500 to-teal-600"
            onClick={() => navigate({ to: "/register", search: { type: "distributor" } })}
          />
        </div>

        {/* Trust strip */}
        <div className="mt-8 sm:mt-12 grid gap-3 sm:grid-cols-3">
          <TrustItem
            icon={<ShieldCheck className="h-4 w-4" />}
            title="Encrypted KYC"
            note="256-bit secure transit"
          />
          <TrustItem
            icon={<Clock className="h-4 w-4" />}
            title="Under 7 minutes"
            note="Average completion"
          />
          <TrustItem
            icon={<Users className="h-4 w-4" />}
            title="50,000+ partners"
            note="Onboarded across India"
          />
        </div>

        {/* Footer */}
        <div className="mt-10 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-border pt-4 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3 justify-center sm:justify-start">
            <Link to="/terms-and-conditions" className="hover:text-foreground">Terms & Condition</Link>
            <span className="text-border">|</span>
            <Link to="/privacy-policy" className="hover:text-foreground">Privacy Policy</Link>
          </div>
          <div className="flex items-center gap-3 justify-center text-muted-foreground">
            <a href="https://www.instagram.com/bharatone__official?igsh=MXgxeXdyZXZzenQ2ZQ==" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:text-foreground transition-colors"><Instagram className="h-4 w-4" /></a>
            <a href="https://www.facebook.com/share/14ehHxTsSc7/" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="hover:text-foreground transition-colors"><Facebook className="h-4 w-4" /></a>
            <a href="https://youtube.com/@bharatone-n3m5m?si=nm29R-B94J0EpnJb" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="hover:text-foreground transition-colors"><Youtube className="h-4 w-4" /></a>
            <a href="https://www.threads.com/@bharatone__official" target="_blank" rel="noopener noreferrer" aria-label="Threads" className="hover:text-foreground transition-colors"><AtSign className="h-4 w-4" /></a>
          </div>
          <div className="text-center sm:text-right">
            Copyright © 2026 <span className="text-india-green font-semibold">BharatOne Services & Affiliates Pvt. Ltd.</span> All rights reserved.
          </div>
        </div>
      </main>
    </div>
  );
}

function OnboardingCard({
  icon,
  title,
  description,
  badge,
  badgeTone = "emerald",
  accent = "from-orange-500 to-rose-500",
  featured = false,
  delay = 0,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  badgeTone?: "emerald" | "saffron" | "blue";
  accent?: string;
  featured?: boolean;
  delay?: number;
  onClick?: () => void;
}) {
  const badgeCls =
    badgeTone === "saffron"
      ? "bg-saffron-gradient text-white"
      : badgeTone === "blue"
        ? "bg-blue-100 text-blue-700"
        : "bg-emerald-100 text-emerald-700";
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ animationDelay: `${delay}ms` }}
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card p-6 sm:p-7 text-left shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-elev animate-in fade-in slide-in-from-bottom-4 fill-mode-both duration-500 ${
        featured
          ? "border-saffron/40 ring-1 ring-saffron/20"
          : "border-border hover:border-saffron/40"
      }`}
    >
      <div
        aria-hidden
        className={`absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br ${accent} opacity-10 blur-2xl transition-opacity duration-300 group-hover:opacity-25`}
      />
      <div className="relative flex items-start justify-between">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white shadow-elev transition-transform duration-200 group-hover:scale-105`}
        >
          {icon}
        </div>
        {badge && (
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${badgeCls}`}
          >
            {badge}
          </span>
        )}
      </div>
      <h2 className="font-display mt-6 text-lg sm:text-xl font-bold text-foreground">
        {title}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <div className="mt-auto pt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-saffron transition-transform group-hover:translate-x-1">
        Continue <ArrowRight className="h-4 w-4" />
      </div>
    </button>
  );
function ThreadsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.2 0C6.4 0 3.3 3.5 3.3 8.6c0 4.1 1.7 6.7 4.6 6.7.8 0 1.4-.3 1.8-.8.3-.4.5-.9.6-1.4.1-.4.1-.7.1-1.1v-.5h-.5c-.8 0-1.4-.2-1.9-.6-.4-.4-.6-.9-.6-1.6 0-.7.3-1.3.7-1.7.5-.4 1.1-.6 1.9-.6.8 0 1.4.2 1.9.6.4.4.6.9.6 1.6v4.3c0 2.4-.6 4.2-1.7 5.4-1.2 1.3-3 1.9-5.3 1.9-2.5 0-4.4-.8-5.7-2.4C1.1 17.9.5 15.7.5 13c0-3 .9-5.5 2.6-7.4C4.8 3.7 7.2 2.7 10 2.7c2.9 0 5.2.9 6.8 2.6 1.6 1.7 2.4 4 2.4 6.9 0 3.2-.7 5.6-2.1 7.3-1.3 1.6-3.3 2.4-5.8 2.4-1.5 0-2.7-.4-3.6-1.1-.9-.7-1.4-1.7-1.5-2.9l-.1-.9h2l.1.6c.1.7.4 1.2.9 1.6.5.4 1.2.6 2 .6 1.6 0 2.8-.5 3.6-1.4.9-1 1.3-2.5 1.3-4.6v-.8c-.4.5-.9.8-1.5 1-.6.2-1.3.3-2 .3-2 0-3.6-.7-4.7-2-1.1-1.3-1.7-3.1-1.7-5.3 0-2.3.6-4.1 1.8-5.4C9.1 1.6 10.5 1 12.2 1c1.2 0 2.3.3 3.2 1l.6.5V2.6c0-.4.1-.7.4-1 .3-.3.6-.4 1-.4s.7.1 1 .4c.3.3.4.6.4 1v11.3c0 2.7-.8 4.9-2.3 6.5-1.5 1.6-3.6 2.4-6.2 2.4-3 0-5.3-.9-6.9-2.6C1.8 18.5 1 16.2 1 13.1c0-3.4 1-6.2 3-8.2C5.9 3 8.5 2 11.5 2c3.2 0 5.8 1 7.6 3.1 1.8 2 2.7 4.7 2.7 8 0 3.5-.8 6.2-2.4 8.2-1.6 2-3.9 3-6.9 3-1.8 0-3.3-.5-4.4-1.4-1.1-1-1.7-2.3-1.8-4l-.1-1.2h2l.1.8c.1 1.1.5 1.9 1.2 2.5.7.5 1.7.8 2.9.8 2.1 0 3.7-.7 4.8-2 1.1-1.3 1.7-3.2 1.7-5.5V11c-.5.6-1.1 1-1.8 1.3-.7.3-1.5.4-2.3.4-2.2 0-3.9-.7-5-2.1-1.1-1.4-1.7-3.2-1.7-5.4 0-2.3.6-4 1.9-5.2C10.3 2.2 11.7 1.6 13.4 1.6c1.3 0 2.4.3 3.3.9l.5.4V3c0-.3.1-.5.3-.7.2-.2.4-.3.7-.3.3 0 .5.1.7.3.2.2.3.4.3.7v10.5c0 2.3-.7 4.1-2 5.5-1.3 1.3-3.1 2-5.3 2-2.6 0-4.6-.8-5.9-2.3-1.3-1.5-1.9-3.6-1.9-6.1 0-2.7.8-4.9 2.3-6.6 1.5-1.7 3.5-2.5 5.9-2.5 1.6 0 3 .4 4.1 1.2l.4.3V4.8c-.4-.4-.9-.7-1.5-.9-.6-.2-1.3-.3-2-.3-1.7 0-3.1.5-4.1 1.5-1 1-1.5 2.3-1.5 3.9 0 1.7.5 3 1.4 4 .9 1 2.2 1.5 3.8 1.5.9 0 1.7-.2 2.3-.5.6-.3 1.1-.8 1.4-1.4V9.2c-.3-.3-.7-.5-1.1-.6-.4-.1-.9-.2-1.4-.2-1.1 0-2 .3-2.6 1-.6.6-.9 1.5-.9 2.5 0 1 .3 1.8.9 2.4.6.6 1.4.9 2.4.9.6 0 1.1-.1 1.5-.4.4-.2.7-.6.9-1 .2-.4.2-.8.2-1.2v-.4h-.3c-.5 0-.9-.1-1.2-.4-.3-.3-.5-.7-.5-1.2 0-.5.2-.9.5-1.2.3-.3.7-.4 1.2-.4s.9.1 1.2.4c.3.3.5.7.5 1.2v4.5c0 1.8-.5 3.2-1.4 4.2-.9 1-2.2 1.5-3.9 1.5-2 0-3.5-.6-4.5-1.8-1-1.2-1.5-2.8-1.5-4.7 0-2 .5-3.6 1.6-4.8 1.1-1.2 2.5-1.8 4.3-1.8 1 0 1.9.2 2.6.6.7.4 1.3.9 1.7 1.6V8.5c-.3-.2-.6-.3-1-.4-.4-.1-.8-.1-1.2-.1-1.4 0-2.6.4-3.4 1.2-.8.8-1.2 1.9-1.2 3.2 0 1.3.4 2.3 1.1 3.1.7.7 1.7 1.1 2.9 1.1.7 0 1.3-.1 1.8-.4.5-.3.8-.7 1-1.2.2-.5.3-1 .3-1.5v-.2h-.2c-.4 0-.7-.1-.9-.3-.2-.2-.3-.5-.3-.9 0-.4.1-.7.3-.9.2-.2.5-.3.9-.3.4 0 .7.1.9.3.2.2.3.5.3.9v3.6c0 1.4-.4 2.5-1.1 3.3-.7.8-1.8 1.2-3.2 1.2-1.6 0-2.9-.5-3.8-1.5-.9-1-1.3-2.3-1.3-3.9 0-1.7.4-3 1.3-4 0 0 0 0 0 0" />
    </svg>
  );
}

function TrustItem({
  icon,
  title,
  note,
}: {
  icon: React.ReactNode;
  title: string;
  note: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-soft">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-saffron-gradient text-white">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground leading-tight">{title}</p>
        <p className="text-xs text-muted-foreground">{note}</p>
      </div>
    </div>
  );
}
