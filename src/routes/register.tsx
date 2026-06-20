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
  Loader2,
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
import { SuccessStep, type SubmissionInfo } from "@/components/register/steps/success";
import { PaymentStep } from "@/components/register/steps/payment";
import { DistributorEntityStep } from "@/components/register/steps/distributor-entity";
import { DistributorSinglePage, type DistributorFormData } from "@/components/register/distributor-single";
import {
  RegistrationProvider,
  useRegistration,
} from "@/components/register/registration-context";
import { validateBankDetails } from "@/components/register/bank-details";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({
  type: z.enum(["old", "new", "distributor"]).optional().default("new"),
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
  { key: "selfie", label: "Selfie & Submit", icon: Camera },
];

function RegisterPage() {
  return (
    <RegistrationProvider>
      <RegisterFlow />
    </RegistrationProvider>
  );
}

async function uploadFile(folder: string, label: string, file: File | undefined) {
  if (!file) return undefined;
  const ext = (file.name?.split(".").pop() || "bin").toLowerCase();
  const path = `${folder}/${label}.${ext}`;
  const { error } = await supabase.storage
    .from("retailer-kyc")
    .upload(path, file, { upsert: false, contentType: file.type || undefined });
  if (error) throw new Error(`Upload failed (${label}): ${error.message}`);
  return path;
}

function RegisterFlow() {
  const { type } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data, files, set } = useRegistration();
  const steps = type === "old" ? oldSteps : newSteps;
  const [current, setCurrent] = useState(0);
  const [done, setDone] = useState(false);
  const [submission, setSubmission] = useState<SubmissionInfo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const heading =
    type === "old"
      ? "Old JSKO Onboarding"
      : type === "distributor"
        ? "Distributor"
        : "New JSKO Retailer Registration";
  const amount: number | null = type === "distributor" ? 2500000 : type === "old" ? null : 4999;
  const subheading =
    type === "old"
      ? "Complete the steps below to migrate your existing JSKO account to the BharatOne portal."
      : type === "distributor"
        ? "Register as an authorised BharatOne distributor — verify your firm, GST and territory details."
        : "Complete the standard retailer registration with account, KYC, shop details, and location.";

  const next = () => setCurrent((c) => Math.min(c + 1, steps.length - 1));
  const prev = () => setCurrent((c) => Math.max(c - 1, 0));

  const submitDistributor = async (d: DistributorFormData, formFile: File) => {
    setSubmitting(true);
    setError(null);
    try {
      const folder =
        "distributor/" +
        (typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : String(Date.now()));
      const formDocPath = await uploadFile(folder, "onboarding-form", formFile);

      const payload = {
        distributor_name: d.distributorName,
        proprietor_name: d.proprietorName,
        company_name: d.companyName,
        gst_number: d.gstNumber,
        dob: d.dob,
        gender: d.gender,
        mobile: d.mobile,
        alt_mobile: d.altMobile,
        email: d.email,
        pan_number: d.panNumber,
        ifsc: d.ifsc,
        bank_name: d.bankName,
        account_number: d.accountNumber,
        address_line: d.addressLine,
        state: d.state,
        district: d.district,
        group_name: d.groupName,
        form_doc_path: formDocPath,
        password: d.password,
      };

      const { data: res, error: rpcErr } = await supabase.rpc(
        "submit_distributor_registration",
        { payload },
      );
      if (rpcErr) throw new Error(rpcErr.message);
      const r = res as unknown as { application_id: string; transaction_id: string };

      setSubmission({
        applicationId: r.application_id,
        transactionId: r.transaction_id,
        utr: "—",
        amount: amount != null ? `₹${amount.toLocaleString("en-IN")}` : "—",
        submittedAt: new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
        plan: heading,
      });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const folder =
        (typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : String(Date.now()));
      const [pan, aadhaar, shopPhoto, police, selfie, paymentScreenshot, videoKyc] = await Promise.all([
        uploadFile(folder, "pan", files.pan),
        uploadFile(folder, "aadhaar", files.aadhaar),
        uploadFile(folder, "shop-photo", files.shopPhoto),
        uploadFile(folder, "police", files.police),
        uploadFile(folder, "selfie", files.selfie),
        uploadFile(folder, "payment-screenshot", files.paymentScreenshot),
        uploadFile(folder, "video-kyc", files.video),
      ]);

      const payload = {
        registration_type: type,
        email: data.email,
        mobile: data.mobile,
        email_verified: data.emailVerified,
        mobile_verified: data.mobileVerified,
        first_name: data.firstName,
        middle_name: data.middleName,
        surname: data.surname,
        dob: data.dob,
        password: data.password,
        shop_name: data.shopName,
        address_type: data.addressType,
        building_shop_no: data.buildingShopNo,
        street_area: data.streetArea,
        ward_number: data.wardNumber,
        landmark: data.landmark,
        village_name: data.villageName,
        gram_panchayat: data.gramPanchayat,
        hobli_name: data.hobliName,
        post_office: data.postOffice,
        post_office_name: data.postOfficeName,
        taluk: data.taluk,
        city: data.city,
        district: data.district,
        state: data.state,
        pincode: data.pincode,
        latitude: data.latitude,
        longitude: data.longitude,
        bank_holder_name: data.bank.holderName,
        bank_name: data.bank.bankName,
        account_number: data.bank.accountNumber,
        ifsc: data.bank.ifsc,
        account_type: data.bank.accountType,
        pan_number: data.panNumber,
        aadhaar_number: data.aadhaarNumber,
        pan_doc_path: pan,
        aadhaar_doc_path: aadhaar,
        shop_photo_path: shopPhoto,
        police_verification_path: police,
        selfie_path: selfie,
        declaration_agreed: data.declarationAgreed,
        video_kyc_path: videoKyc,
        video_kyc_lat: data.videoLat,
        video_kyc_lng: data.videoLng,
        payment_amount: amount,
        payment_utr: data.payment.utr,
        payment_method: data.payment.method,
        payment_paid_on: data.payment.paidOn,
        payer_name: data.payment.payerName,
        payer_bank: data.payment.payerBank,
        payer_account: data.payment.payerAccount,
        payment_remarks: data.payment.remarks,
        payment_screenshot_path: paymentScreenshot,
      };

      const { data: res, error: rpcErr } = await supabase.rpc(
        "submit_retailer_registration",
        { payload },
      );
      if (rpcErr) { if (String(rpcErr.message).includes("LOCATION_TOO_CLOSE")) throw new Error("This location already has an existing agent nearby. Please change your shop location and try again."); throw new Error(rpcErr.message); }
      const r = res as unknown as { application_id: string; transaction_id: string };

      setSubmission({
        applicationId: r.application_id,
        transactionId: r.transaction_id,
        utr: data.payment.utr || "—",
        amount: amount != null ? `₹${amount.toLocaleString("en-IN")}` : "—",
        submittedAt: new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
        plan: heading,
      });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const StepBody = useMemo(() => {
    const key = steps[current].key;
    switch (key) {
      case "portal":
        return <OldPortalStep />;
      case "account":
        return <AccountStep />;
      case "personal":
        return type === "distributor" ? <DistributorEntityStep /> : <PersonalStep />;
      case "business":
        return <BusinessStep />;
      case "kyc":
        return <KycDocsStep />;
      case "video":
        return <VideoKycStep />;
      case "payment":
        return (
          <PaymentStep
            value={data.payment}
            onChange={(v) => set({ payment: v })}
            planLabel={heading}
            amount={amount ?? 0}
          />
        );
      case "selfie":
        return <SelfieStep />;
      default:
        return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, type, data.payment]);

  const currentKey = steps[current].key;
  const accountVerified = data.emailVerified && data.mobileVerified;

  const pin6 = /^\d{6}$/.test(data.pincode);
  const addrOk =
    data.addressType === "urban"
      ? !!(data.buildingShopNo && data.city && data.district && data.state && pin6)
      : !!(
          data.buildingShopNo &&
          data.villageName &&
          data.gramPanchayat &&
          data.hobliName &&
          data.postOffice &&
          data.taluk &&
          data.district &&
          data.state &&
          pin6
        );
  const bankOk = Object.keys(validateBankDetails(data.bank)).length === 0;
  const panOk = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(data.panNumber);
  const aadhaarOk = /^\d{12}$/.test(data.aadhaarNumber);

  const stepValid: Record<string, boolean> = {
    portal: data.emailVerified && data.mobileVerified,
    account: accountVerified,
    personal: data.personalValid,
    business: !!data.shopName.trim() && addrOk && bankOk,
    kyc: !!files.pan && !!files.aadhaar && !!files.shopPhoto && panOk && aadhaarOk,
    video: data.declarationAgreed && !!files.video,
    payment: data.payment.utr.trim().length > 0 && !!files.paymentScreenshot,
    selfie: !!files.selfie,
  };
  const blockNext = currentKey in stepValid ? !stepValid[currentKey] : false;

  const blockMsg =
    currentKey === "account" || currentKey === "portal"
      ? "Verify email & mobile OTP to continue"
      : currentKey === "business"
        ? "Fill shop name, address, pincode (6 digits) and valid bank details"
        : currentKey === "kyc"
          ? "Upload PAN, Aadhaar & shop photo and enter valid PAN/Aadhaar numbers"
          : currentKey === "video"
            ? "Accept the declaration and record a 15s+ video to continue"
            : currentKey === "payment"
              ? "Enter the UTR and upload the payment screenshot"
              : currentKey === "selfie"
                ? "Capture your selfie to submit"
                : "Complete the required fields to continue";

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
          <BharatOneLogo size="lg" />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-5 sm:py-10 pb-28 sm:pb-12">
        <h1 className="font-display text-[22px] sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
          {type === "distributor" ? "Distributor" : type === "old" ? "JSKO" : "New Retailer"}{" "}
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
            onClick={() => navigate({ to: "/" })}
          >
            Change Option
          </Button>
        </div>

        <div className="mt-5 sm:mt-6">
          {type !== "distributor" && <Stepper steps={steps} current={current} />}
        </div>

        <div className={type === "distributor" ? "mt-4 sm:mt-6" : "mt-4 sm:mt-6 rounded-2xl border border-border bg-card p-4 sm:p-6 md:p-8 shadow-elev"}>
          {done && submission ? (
            <SuccessStep info={submission} />
          ) : type === "distributor" ? (
            <DistributorSinglePage onSubmit={submitDistributor} submitting={submitting} error={error} />
          ) : (
            <>
              {StepBody}
              {error && (
                <div className="mt-5 flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div className="mt-7 grid grid-cols-2 gap-3 border-t border-border pt-5 sm:flex sm:items-center sm:justify-between">
                <Button
                  variant="outline"
                  onClick={prev}
                  disabled={current === 0 || submitting}
                  className="h-12 rounded-xl text-[15px] sm:h-10 sm:text-sm sm:w-auto"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                {current === steps.length - 1 ? (
                  <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center">
                    {blockNext && (
                      <span className="text-[11px] font-medium text-amber-700">{blockMsg}</span>
                    )}
                    <Button
                      onClick={submit}
                      disabled={submitting || blockNext}
                      className="h-12 rounded-xl bg-saffron-gradient text-[15px] font-semibold shadow-elev hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed sm:h-10 sm:text-sm sm:w-auto"
                    >
                      {submitting ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
                      ) : (
                        <>Submit <CheckCircle2 className="h-4 w-4" /></>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center">
                    {blockNext && (
                      <span className="text-[11px] font-medium text-amber-700">
                        {blockMsg}
                      </span>
                    )}
                    <Button
                      onClick={next}
                      disabled={blockNext}
                      className="h-12 rounded-xl bg-saffron-gradient text-[15px] font-semibold shadow-elev hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed sm:h-10 sm:text-sm sm:w-auto"
                    >
                      Next <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
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
