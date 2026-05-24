import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, UserCheck, Store } from "lucide-react";

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
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-center px-6">
          <button
            type="button"
            aria-label="Go back"
            className="absolute left-6 inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-[3px]">
              <span className="block h-[6px] w-10 -skew-x-[20deg] rounded-[2px] bg-[oklch(0.68_0.18_45)]" />
              <span className="block h-[6px] w-10 -skew-x-[20deg] rounded-[2px] bg-[oklch(0.55_0.15_150)]" />
            </div>
            <div className="leading-none">
              <div className="text-xl font-extrabold tracking-tight text-foreground">
                BharatOne<sup className="text-[10px]">®</sup>
              </div>
              <div className="mt-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
                For Serving Indian Citizens
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          JSKO / Retailer Registration
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose your onboarding type and complete the required verification steps.
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <OnboardingCard
            icon={<UserCheck className="h-6 w-6" />}
            title="Old JSKO Onboarding"
            description="For existing JSKO users from the old portal."
          />
          <OnboardingCard
            icon={<Store className="h-6 w-6" />}
            title="New Retailer Registration"
            description="For new retailers registering directly on BharatOne Portal."
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
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      className="group rounded-xl border border-border bg-card p-6 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-md"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        {icon}
      </div>
      <h2 className="mt-6 text-lg font-bold text-foreground">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </button>
  );
}
