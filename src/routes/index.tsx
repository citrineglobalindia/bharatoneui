import { createFileRoute } from "@tanstack/react-router";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, UserCheck, Store } from "lucide-react";
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
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-center px-6">
          <Link
            to="/login"
            aria-label="Go back"
            className="absolute left-6 inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <BharatOneLogo />
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
            onClick={() => navigate({ to: "/register", search: { type: "old" } })}
          />
          <OnboardingCard
            icon={<Store className="h-6 w-6" />}
            title="New Retailer Registration"
            description="For new retailers registering directly on BharatOne Portal."
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
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
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
