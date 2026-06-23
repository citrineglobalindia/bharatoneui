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
          <a
            href="https://mybharatone.com/"
            aria-label="Go back"
            className="absolute left-3 sm:left-6 inline-flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </a>
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
