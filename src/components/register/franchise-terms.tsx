// BharatOne — Franchise Application Details & Terms
//
// Shown before a new retailer can start /register?type=new. The applicant must read
// the franchise details, refund policy and terms, then tick the declaration at the
// foot of the page. Modelled on the KarnatakaOne / GramOne franchisee terms gate.
//
// Acceptance is NOT remembered between visits — this is a per-application legal
// declaration, so anyone landing on /register?type=new is asked to read and accept it
// again. Every acceptance is written to the platform access log, which records who
// accepted, when, and from which IP and device — see src/lib/audit.ts.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  FileText,
  IndianRupee,
  ListChecks,
  RotateCcw,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { BharatOneLogo } from "@/components/bharatone-logo";
import { Button } from "@/components/ui/button";
import { logAccess } from "@/lib/audit";

/** Recorded against each acceptance in the audit log. */
export const FRANCHISE_TERMS_VERSION = "2026-07-30";

/**
 * One-shot hand-off token.
 *
 * Only used when the applicant accepts on the standalone /franchise-terms page and is
 * then forwarded to /register?type=new — without it they would be shown the very same
 * document twice in a row. /register consumes the token and immediately deletes it, so
 * it grants exactly one passage; coming back to the registration form later always
 * shows the terms again.
 */
const PASS_KEY = "bo_franchise_terms_pass";

export function grantFranchiseTermsPass(): void {
  try {
    window.sessionStorage.setItem(PASS_KEY, FRANCHISE_TERMS_VERSION);
  } catch {
    /* private browsing — the applicant simply accepts once more on /register */
  }
}

export function consumeFranchiseTermsPass(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const ok = window.sessionStorage.getItem(PASS_KEY) === FRANCHISE_TERMS_VERSION;
    if (ok) window.sessionStorage.removeItem(PASS_KEY);
    return ok;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ content */

const KEY_FEATURES = [
  "One-stop digital service centre for Government, Financial, Utility, Insurance, Travel and Citizen Services.",
  "Access to multiple G2C, B2C and G2B services through a single integrated portal.",
  "Transparent and standardized service delivery.",
  "Continuous technical support and regular training.",
  "Multiple income opportunities through commissions and service charges.",
  "Secure online dashboard for transactions, reports and wallet management.",
  "Regular addition of new services and digital solutions.",
  "Dedicated customer support.",
];

const RESPONSIBILITIES = [
  "Operate the BharatOne Centre during the prescribed business hours.",
  "Deliver services only through the authorized BharatOne Portal.",
  "Follow all operational guidelines issued by BharatOne.",
  "Charge customers only the approved service charges.",
  "Issue receipts for every transaction.",
  "Maintain confidentiality of customer information.",
  "Provide professional and quality customer service.",
  "Maintain BharatOne branding and service standards.",
  "Participate in training and awareness programs whenever required.",
  "Promote BharatOne services within the assigned operational area.",
];

const TERMINATION = [
  "Submission of false information or forged documents.",
  "Violation of BharatOne policies or operational guidelines.",
  "Misuse of the BharatOne Portal or services.",
  "Fraudulent or unauthorized transactions.",
  "Overcharging customers beyond approved rates.",
  "Repeated customer complaints.",
  "Illegal or unethical activities.",
  "Sharing login credentials or unauthorized system access.",
  "Long-term inactivity without prior approval.",
  "Failure to maintain BharatOne branding or service standards.",
];

const BRANDING = [
  "BharatOne Name Board",
  "Official BharatOne Logo",
  "Service Price List",
  "Centre ID Display",
  "Customer Information Board",
  "Promotional Posters and Marketing Materials",
  "Standardized Branding as instructed by the company",
];

const FRANCHISE_DETAILS = [
  "Franchise Registration Amount: ₹5,999/- (Non-Refundable).",
  "The Franchise Registration Amount shall be paid at the time of registration and is strictly non-refundable under any circumstances.",
  "Franchise activation is subject to successful document verification, approval by BharatOne, acceptance of the Franchise Agreement, and confirmation of payment.",
  "Charges applicable for various services, API integrations, value-added services and other operational requirements shall be levied separately, as applicable.",
  "Service charges may vary based on government regulations, service providers, operational costs and company policies, and are subject to revision from time to time without prior notice.",
];

const REFUND_ROWS: { k: string; v: string }[] = [
  { k: "Purpose", v: "Explains refunds, cancellations and reversals for BharatOne services." },
  {
    k: "Services covered",
    v: "AEPS, BBPS, DMT, PAN, Insurance, G2C, Recharge, Banking, Software, APIs, White Label, Franchise, Training and Digital Products.",
  },
  {
    k: "General refund policy",
    v: "Payments are final unless specifically eligible for refund under this policy or applicable law.",
  },
  {
    k: "Eligible refunds",
    v: "Duplicate payments, gateway failures, system errors, technical failures and accidental multiple payments — after verification.",
  },
  {
    k: "Non-refundable",
    v: "Successful transactions, government fees, subscriptions, API/setup charges, franchise fee ₹5,999, training, KYC, devices and legally non-refundable GST.",
  },
  {
    k: "Failed transactions",
    v: "Verified eligible failures will be refunded to the original payment method or the BharatOne Wallet.",
  },
  { k: "AEPS", v: "Subject to the NPCI / bank dispute process." },
  { k: "BBPS", v: "Successful bill payments cannot be cancelled." },
  { k: "DMT", v: "Successful transfers are irreversible." },
  { k: "Government services", v: "Government fees are generally non-refundable after submission." },
  {
    k: "Software & APIs",
    v: "Activation, customization and implementation charges are non-refundable once work starts.",
  },
  {
    k: "Franchise services",
    v: "Franchise fee, onboarding, branding, activation and training charges are non-refundable once delivered.",
  },
  { k: "Cancellation", v: "Possible only before processing begins." },
  {
    k: "Refund time",
    v: "UPI 3–5 days · Bank 5–7 days · Cards 5–10 days · Wallet within 24 hours after approval.",
  },
  {
    k: "Refund request",
    v: "Submit Transaction ID, date, mobile number, amount, service, reason and supporting documents to support@mybharatone.com.",
  },
  { k: "Fraud prevention", v: "Fraudulent claims will be rejected." },
  { k: "Investigation", v: "BharatOne may investigate disputes and seek documents." },
  { k: "Changes", v: "This policy may be updated at any time." },
  { k: "Governing law", v: "Laws of India. Jurisdiction: Hassan, Karnataka." },
];

const TERMS = [
  "The information furnished by me is true, complete and correct to the best of my knowledge.",
  "I shall abide by all the rules, regulations, policies and operational guidelines issued by BharatOne Services and Affiliates Pvt. Ltd.",
  "I understand that the BharatOne Franchise is a business opportunity and does not constitute employment or guarantee any fixed income or salary.",
  "My earnings are solely dependent on the services offered, business generated and my operational performance.",
  "I agree to maintain the quality standards, branding guidelines and customer service standards prescribed by BharatOne.",
  "I understand and accept that the Franchise Registration Amount of ₹5,999/- is strictly non-refundable.",
  "I understand that additional charges may be applicable for service activation, API integrations, value-added services, software enhancements or any other services introduced by BharatOne.",
  "I understand that failure to comply with BharatOne policies may result in suspension or permanent termination without any refund or compensation.",
  "I agree that the decision of BharatOne Services and Affiliates Pvt. Ltd. shall be final and binding.",
];

export const FRANCHISE_DECLARATION =
  "I have read all the documents pertaining to setting up of BharatOne centre under franchise model and I agree to all terms and conditions.";

/* ------------------------------------------------------------------ pieces */

function Section({
  icon: Icon,
  title,
  tone = "default",
  children,
}: {
  icon: React.ElementType;
  title: string;
  tone?: "default" | "warn";
  children: React.ReactNode;
}) {
  return (
    <section className="scroll-mt-24">
      <h2 className="flex items-center gap-2.5 text-base font-bold sm:text-lg">
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
            tone === "warn" ? "bg-destructive/10 text-destructive" : "bg-saffron/10 text-saffron"
          }`}
        >
          <Icon className="h-4 w-4" />
        </span>
        {title}
      </h2>
      <div className="mt-3 pl-0 sm:pl-[42px]">{children}</div>
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((t) => (
        <li key={t} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-india-green" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ page */

export function FranchiseTerms({ onAccept }: { onAccept: () => void }) {
  const [agreed, setAgreed] = useState(false);
  const [readToEnd, setReadToEnd] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  // The tick only unlocks once the applicant has actually reached the bottom —
  // this is a legal declaration, so it should not be possible to accept it blind.
  useEffect(() => {
    const el = endRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setReadToEnd(true);
      },
      { rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    logAccess({
      kind: "page",
      module: "registration",
      route: "/franchise-terms",
      action: "Opened franchise terms",
      detail: { version: FRANCHISE_TERMS_VERSION },
    });
  }, []);

  const proceed = () => {
    if (!agreed) return;
    logAccess({
      kind: "action",
      module: "registration",
      route: "/franchise-terms",
      action: "Accepted franchise terms and conditions",
      entity: FRANCHISE_TERMS_VERSION,
      detail: { declaration: FRANCHISE_DECLARATION, version: FRANCHISE_TERMS_VERSION },
    });
    onAccept();
  };

  const sections = useMemo(
    () =>
      [
        ["about", "About BharatOne"],
        ["features", "Key Features"],
        ["responsibilities", "Responsibilities"],
        ["termination", "Suspension / Termination"],
        ["branding", "Branding Standards"],
        ["franchise", "Franchise Details"],
        ["refund", "Refund & Cancellation"],
        ["terms", "Terms & Conditions"],
      ] as [string, string][],
    [],
  );

  return (
    <div className="min-h-screen bg-tricolor">
      <header className="sticky top-0 z-30 border-b border-border bg-card/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4 sm:px-6">
          <BharatOneLogo className="h-8 w-auto" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight">
              Franchise Application Details
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              Please read before starting your registration
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        {/* quick jump */}
        <nav className="mb-8 flex flex-wrap gap-2">
          {sections.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-saffron hover:text-foreground"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="space-y-9 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8">
          <div id="about">
            <Section icon={Building2} title="About BharatOne">
              <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                <p>
                  <strong className="text-foreground">
                    BharatOne Services and Affiliates Pvt. Ltd.
                  </strong>{" "}
                  is a digital citizen service platform committed to delivering
                  Government-to-Citizen (G2C), Business-to-Citizen (B2C), Government-to-Business
                  (G2B), financial, utility, insurance, travel and various digital services through
                  a single integrated platform.
                </p>
                <p>
                  BharatOne aims to establish a strong nationwide network of digitally empowered
                  service centres that bridge the gap between citizens and essential services using
                  modern technology and professional support.
                </p>
                <p>
                  The BharatOne operational model is managed by BharatOne Services and Affiliates
                  Pvt. Ltd., which authorizes franchise partners and provides technical support,
                  service integration, training, branding and operational assistance.
                </p>
                <p>
                  Franchise Partners establish and operate BharatOne Centres to deliver multiple
                  digital services directly to citizens while creating sustainable business
                  opportunities.
                </p>
              </div>
            </Section>
          </div>

          <div id="features">
            <Section icon={Sparkles} title="Key Features">
              <Bullets items={KEY_FEATURES} />
            </Section>
          </div>

          <div id="responsibilities">
            <Section icon={ListChecks} title="Responsibilities">
              <div className="mb-4 flex gap-3 rounded-xl border border-destructive/25 bg-destructive/5 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                <p className="text-sm leading-relaxed">
                  <strong className="text-destructive">Important:</strong> BharatOne Franchise is a
                  business opportunity and <strong>not a Government job</strong>. Income is
                  generated through commissions, service charges and business activities.{" "}
                  <strong>
                    BharatOne does not provide any fixed salary or guaranteed monthly income.
                  </strong>
                </p>
              </div>
              <Bullets items={RESPONSIBILITIES} />
            </Section>
          </div>

          <div id="termination">
            <Section icon={ShieldAlert} title="Franchise Suspension / Termination" tone="warn">
              <p className="mb-3 text-sm text-muted-foreground">
                A franchise may be suspended or terminated for any of the following:
              </p>
              <ul className="space-y-2">
                {TERMINATION.map((t) => (
                  <li
                    key={t}
                    className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm font-semibold text-foreground">
                The decision of BharatOne Services and Affiliates Pvt. Ltd. shall be final and
                binding.
              </p>
            </Section>
          </div>

          <div id="branding">
            <Section icon={BadgeCheck} title="Branding Standards">
              <div className="flex flex-wrap gap-2">
                {BRANDING.map((b) => (
                  <span
                    key={b}
                    className="rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium"
                  >
                    {b}
                  </span>
                ))}
              </div>
            </Section>
          </div>

          <div id="franchise">
            <Section icon={IndianRupee} title="Franchise Details">
              <div className="mb-4 rounded-xl border border-saffron/30 bg-saffron/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Franchise Registration Amount
                </p>
                <p className="mt-1 text-2xl font-extrabold text-foreground">
                  ₹5,999/-{" "}
                  <span className="text-sm font-bold text-destructive">(Non-Refundable)</span>
                </p>
              </div>
              <Bullets items={FRANCHISE_DETAILS} />
            </Section>
          </div>

          <div id="refund">
            <Section icon={RotateCcw} title="Refund & Cancellation Policy">
              <dl className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                {REFUND_ROWS.map((r) => (
                  <div
                    key={r.k}
                    className="grid gap-1 p-3 sm:grid-cols-[190px_1fr] sm:gap-4 sm:p-4"
                  >
                    <dt className="text-sm font-semibold">{r.k}</dt>
                    <dd className="text-sm leading-relaxed text-muted-foreground">{r.v}</dd>
                  </div>
                ))}
              </dl>
            </Section>
          </div>

          <div id="terms">
            <Section icon={FileText} title="Terms & Conditions">
              <ol className="space-y-3">
                {TERMS.map((t, i) => (
                  <li key={t} className="flex gap-3 text-sm leading-relaxed">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-bold">
                      {i + 1}
                    </span>
                    <span className="text-muted-foreground">{t}</span>
                  </li>
                ))}
              </ol>
            </Section>
          </div>

          <div ref={endRef} />
        </div>

        {/* ------------------------------------------------ declaration */}
        <div className="mt-6 rounded-2xl border-2 border-saffron/40 bg-card p-5 shadow-sm sm:p-6">
          <label
            htmlFor="franchise-agree"
            className={`flex cursor-pointer items-start gap-3.5 ${readToEnd ? "" : "opacity-60"}`}
          >
            <input
              id="franchise-agree"
              type="checkbox"
              checked={agreed}
              disabled={!readToEnd}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-india-green disabled:cursor-not-allowed"
            />
            <span className="text-sm font-semibold leading-relaxed">{FRANCHISE_DECLARATION}</span>
          </label>

          {!readToEnd && (
            <p className="mt-3 pl-[34px] text-xs text-muted-foreground">
              Please scroll through the full document above to enable this option.
            </p>
          )}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Your acceptance is recorded with the date, time and device used.
            </p>
            <Button size="lg" disabled={!agreed} onClick={proceed} className="w-full sm:w-auto">
              Agree &amp; Continue to Registration
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          BharatOne Services and Affiliates Private Limited · CIN: U81100KA2025PTC198087
        </p>
      </main>
    </div>
  );
}

export default FranchiseTerms;
