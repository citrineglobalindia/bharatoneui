import { createFileRoute } from "@tanstack/react-router";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, UserCheck, Store, ArrowRight, ShieldCheck } from "lucide-react";
import { BharatOneLogo } from "@/components/bharatone-logo";

export const Route = createFileRoute("/")({
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
    <div className="min-h-screen bg-tricolor">
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="relative mx-auto flex h-16 max-w-5xl items-center justify-center px-4 sm:px-6">
          <Link
            to="/login"
            aria-label="Go back"
            className="absolute left-3 sm:left-6 inline-flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <BharatOneLogo />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-14">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent bg-white/80 backdrop-blur px-3 py-1.5 text-xs font-semibold text-saffron shadow-soft">
          <ShieldCheck className="h-3.5 w-3.5" /> Onboarding Portal
        </div>
        <h1 className="font-display mt-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-[1.05]">
          JSKO / Retailer{" "}
          <span className="bg-saffron-gradient bg-clip-text text-transparent">Registration</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm sm:text-base text-muted-foreground">
          Choose your onboarding type and complete the required verification steps.
        </p>

        <div className="mt-8 sm:mt-10 grid gap-4 sm:gap-6 sm:grid-cols-2">
          <OnboardingCard
            icon={<UserCheck className="h-6 w-6" />}
            title="Old JSKO Onboarding"
            description="For existing JSKO users from the old portal."
            badge="Migrate"
            onClick={() => navigate({ to: "/register", search: { type: "old" } })}
          />
          <OnboardingCard
            icon={<Store className="h-6 w-6" />}
            title="New Retailer Registration"
            description="For new retailers registering directly on BharatOne Portal."
            badge="Start fresh"
            onClick={() => navigate({ to: "/register", search: { type: "new" } })}
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
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-7 text-left shadow-soft transition-all hover:-translate-y-1 hover:border-saffron/40 hover:shadow-elev"
    >
      <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-saffron-gradient opacity-0 blur-2xl transition-opacity group-hover:opacity-20" />
      <div className="flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-saffron-gradient text-white shadow-elev">
          {icon}
        </div>
        {badge && (
          <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-india-green">
            {badge}
          </span>
        )}
      </div>
      <h2 className="font-display mt-6 text-lg sm:text-xl font-bold text-foreground">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <div className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-saffron transition-transform group-hover:translate-x-0.5">
        Continue <ArrowRight className="h-4 w-4" />
      </div>
    </button>
  );
}
