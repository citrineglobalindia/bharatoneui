import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  User,
  Building2,
  Upload,
  Video,
  Camera,
  UserCheck,
  Lock,
  Mail,
  Phone,
  Search,
  AlertTriangle,
  ShieldCheck,
  Eye,
  EyeOff,
  MapPin,
  Navigation,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { BharatOneLogo } from "@/components/bharatone-logo";
import { Button } from "@/components/ui/button";
import { Stepper, type Step } from "@/components/register/stepper";
import { OldPortalStep } from "@/components/register/steps/old-portal";
import { AccountStep } from "@/components/register/steps/account";
import { PersonalStep } from "@/components/register/steps/personal";
import { BusinessStep } from "@/components/register/steps/business";
import { KycDocsStep } from "@/components/register/steps/kyc-docs";
import { VideoKycStep } from "@/components/register/steps/video-kyc";
import { SelfieStep } from "@/components/register/steps/selfie";
import { SuccessStep } from "@/components/register/steps/success";

const searchSchema = z.object({
  type: z.enum(["old", "new"]).optional().default("new"),
});

export const Route = createFileRoute("/register")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Registration — BharatOne Retailer Portal" },
      {
        name: "description",
        content:
          "Complete your BharatOne onboarding: account, personal details, business info, KYC, video verification and selfie.",
      },
    ],
  }),
  component: RegisterPage,
});

const newSteps: Step[] = [
  { key: "account", label: "Account", icon: UserCheck },
  { key: "personal", label: "Personal", icon: User },
  { key: "business", label: "Business", icon: Building2 },
  { key: "kyc", label: "KYC Docs", icon: Upload },
  { key: "video", label: "Video KYC", icon: Video },
  { key: "selfie", label: "Selfie & Submit", icon: Camera },
];

const oldSteps: Step[] = [
  { key: "portal", label: "JSKO Portal", icon: Lock },
  { key: "personal", label: "Personal", icon: User },
  { key: "business", label: "Business", icon: Building2 },
  { key: "kyc", label: "KYC Docs", icon: Upload },
  { key: "video", label: "Video KYC", icon: Video },
  { key: "selfie", label: "Selfie & Submit", icon: Camera },
];

function RegisterPage() {
  const { type } = Route.useSearch();
  const navigate = Route.useNavigate();
  const steps = type === "old" ? oldSteps : newSteps;
  const [current, setCurrent] = useState(0);
  const [done, setDone] = useState(false);

  const heading = type === "old" ? "Old JSKO Onboarding" : "New Retailer Registration";
  const subheading =
    type === "old"
      ? "Complete the steps below to migrate your existing JSKO account to the BharatOne portal."
      : "Complete the standard retailer registration with account, KYC, shop details, and location.";

  const next = () => setCurrent((c) => Math.min(c + 1, steps.length - 1));
  const prev = () => setCurrent((c) => Math.max(c - 1, 0));
  const submit = () => setDone(true);

  const StepBody = useMemo(() => {
    const key = steps[current].key;
    switch (key) {
      case "portal":
        return <OldPortalStep />;
      case "account":
        return <AccountStep />;
      case "personal":
        return <PersonalStep />;
      case "business":
        return <BusinessStep />;
      case "kyc":
        return <KycDocsStep />;
      case "video":
        return <VideoKycStep />;
      case "selfie":
        return <SelfieStep />;
      default:
        return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, type]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="relative mx-auto flex h-16 max-w-5xl items-center justify-center px-6">
          <Link
            to="/"
            aria-label="Go back"
            className="absolute left-6 inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <BharatOneLogo />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          JSKO / Retailer Registration
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose your onboarding type and complete the required verification steps.
        </p>

        <div className="mt-8 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">{heading}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{subheading}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              navigate({
                search: { type: type === "old" ? "new" : "old" },
              })
            }
          >
            Change Option
          </Button>
        </div>

        <div className="mt-6">
          <Stepper steps={steps} current={current} />
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
          {done ? (
            <SuccessStep />
          ) : (
            <>
              {StepBody}
              <div className="mt-8 flex items-center justify-between border-t border-border pt-5">
                <Button variant="outline" onClick={prev} disabled={current === 0}>
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                {current === steps.length - 1 ? (
                  <Button onClick={submit} className="bg-primary/70 hover:bg-primary">
                    Submit Application <CheckCircle2 className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={next} className="bg-primary/70 hover:bg-primary">
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// Re-export icons used across steps (avoid tree-shaking issues in dev)
export { Mail, Phone, Search, AlertTriangle, ShieldCheck, Eye, EyeOff, MapPin, Navigation, FileText };