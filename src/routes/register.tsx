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
  CreditCard,
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
import { SuccessStep, buildSubmission, type SubmissionInfo } from "@/components/register/steps/success";
import { PaymentStep, type PaymentData } from "@/components/register/steps/payment";

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
  { key: "payment", label: "Payment", icon: CreditCard },
  { key: "selfie", label: "Selfie & Submit", icon: Camera },
];

const oldSteps: Step[] = [
  { key: "portal", label: "JSKO Portal", icon: Lock },
  { key: "personal", label: "Personal", icon: User },
  { key: "business", label: "Business", icon: Building2 },
  { key: "kyc", label: "KYC Docs", icon: Upload },
  { key: "video", label: "Video KYC", icon: Video },
  { key: "payment", label: "Payment", icon: CreditCard },
  { key: "selfie", label: "Selfie & Submit", icon: Camera },
];

function RegisterPage() {
  const { type } = Route.useSearch();
  const navigate = Route.useNavigate();
  const steps = type === "old" ? oldSteps : newSteps;
  const [current, setCurrent] = useState(0);
  const [done, setDone] = useState(false);
  const [payment, setPayment] = useState<PaymentData>({ utr: "" });
  const [submission, setSubmission] = useState<SubmissionInfo | null>(null);

  const heading = type === "old" ? "Old JSKO Onboarding" : "New Retailer Registration";
  const subheading =
    type === "old"
      ? "Complete the steps below to migrate your existing JSKO account to the BharatOne portal."
      : "Complete the standard retailer registration with account, KYC, shop details, and location.";

  const next = () => setCurrent((c) => Math.min(c + 1, steps.length - 1));
  const prev = () => setCurrent((c) => Math.max(c - 1, 0));
  const submit = () => {
    setSubmission(buildSubmission(payment.utr, heading));
    setDone(true);
  };

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
      case "payment":
        return <PaymentStep value={payment} onChange={setPayment} planLabel={heading} />;
      case "selfie":
        return <SelfieStep />;
      default:
        return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, type, payment]);

  return (
    <div className="min-h-screen bg-tricolor">
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="relative mx-auto flex h-16 max-w-5xl items-center justify-center px-4 sm:px-6">
          <Link
            to="/"
            aria-label="Go back"
            className="absolute left-3 sm:left-6 inline-flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <BharatOneLogo />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-5 sm:py-10 pb-28 sm:pb-12">
        <h1 className="font-display text-[22px] sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
          JSKO / Retailer{" "}
          <span className="bg-saffron-gradient bg-clip-text text-transparent">Registration</span>
        </h1>
        <p className="mt-1.5 text-[13px] sm:text-sm text-muted-foreground">
          Choose your onboarding type and complete the required verification steps.
        </p>

        <div className="mt-5 sm:mt-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="font-display text-base sm:text-xl font-bold text-foreground leading-tight">{heading}</h2>
            <p className="mt-1 text-[13px] sm:text-sm leading-relaxed text-muted-foreground">{subheading}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="self-start rounded-lg h-8 text-xs"
            onClick={() =>
              navigate({
                search: { type: type === "old" ? "new" : "old" },
              })
            }
          >
            Change Option
          </Button>
        </div>

        <div className="mt-5 sm:mt-6">
          <Stepper steps={steps} current={current} />
        </div>

        <div className="mt-4 sm:mt-6 rounded-2xl border border-border bg-card p-4 sm:p-6 md:p-8 shadow-elev">
          {done && submission ? (
            <SuccessStep info={submission} />
          ) : (
            <>
              {StepBody}
              <div className="mt-7 grid grid-cols-2 gap-3 border-t border-border pt-5 sm:flex sm:items-center sm:justify-between">
                <Button
                  variant="outline"
                  onClick={prev}
                  disabled={current === 0}
                  className="h-12 rounded-xl text-[15px] sm:h-10 sm:text-sm sm:w-auto"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                {current === steps.length - 1 ? (
                  <Button
                    onClick={submit}
                    className="h-12 rounded-xl bg-saffron-gradient text-[15px] font-semibold shadow-elev hover:opacity-95 sm:h-10 sm:text-sm sm:w-auto"
                  >
                    Submit <CheckCircle2 className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={next}
                    className="h-12 rounded-xl bg-saffron-gradient text-[15px] font-semibold shadow-elev hover:opacity-95 sm:h-10 sm:text-sm sm:w-auto"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          🛡 Secured by BharatOne · All KYC data is encrypted in transit
        </p>
      </main>
    </div>
  );
}

// Re-export icons used across steps (avoid tree-shaking issues in dev)
export { Mail, Phone, Search, AlertTriangle, ShieldCheck, Eye, EyeOff, MapPin, Navigation, FileText };