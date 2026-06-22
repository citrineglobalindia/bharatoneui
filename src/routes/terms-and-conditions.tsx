import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  FileText,
  ShieldAlert,
  UserCheck,
  CreditCard,
  Copyright,
  ExternalLink,
  AlertTriangle,
  Ban,
  RefreshCw,
  Gavel,
  Landmark,
  MessageCircle,
  Phone,
  Mail,
} from "lucide-react";
import { BharatOneLogo } from "@/components/bharatone-logo";

export const Route = createFileRoute("/terms-and-conditions")({
  head: () => ({
    meta: [
      { title: "Terms and Conditions — BharatOne" },
      {
        name: "description",
        content:
          "Read the Terms and Conditions for BharatOne Services and Affiliates Pvt. Ltd. Understand our policies, user responsibilities, and legal terms.",
      },
    ],
  }),
  component: TermsPage,
});

const SECTIONS = [
  {
    icon: <Landmark className="h-5 w-5" />,
    title: "Nature of Services",
    content:
      "BharatOne Services and Affiliates Pvt. Ltd. offers assistance in accessing various Indian government schemes, subsidies, certifications, and application services. We are not a government agency. All services provided are consultancy/support-based and do not guarantee approval or success of applications.",
  },
  {
    icon: <UserCheck className="h-5 w-5" />,
    title: "Eligibility",
    content:
      "You must be at least 18 years old and legally capable of entering into binding contracts to use our services.",
  },
  {
    icon: <ShieldAlert className="h-5 w-5" />,
    title: "Acceptable Use",
    content:
      "You agree to use the website only for lawful purposes. You may not: misrepresent your identity or provide false information; attempt to gain unauthorized access to the Site or our systems; or use the Site for any fraudulent or harmful activity.",
  },
  {
    icon: <CreditCard className="h-5 w-5" />,
    title: "Payments & Refunds",
    content:
      "Certain services may be subject to fees. All applicable charges will be disclosed before any payment is made. Payments are non-refundable once a service has been initiated.",
  },
  {
    icon: <Copyright className="h-5 w-5" />,
    title: "Intellectual Property",
    content:
      "All content on the Site, including text, graphics, logos, and software, is the property of BharatOne and protected under applicable intellectual property laws. You may not copy, reproduce, or distribute any material from this website without written permission.",
  },
  {
    icon: <ExternalLink className="h-5 w-5" />,
    title: "Third-Party Links",
    content:
      "Our Site may contain links to third-party websites. We are not responsible for the content, privacy policies, or practices of any third-party sites or services.",
  },
  {
    icon: <AlertTriangle className="h-5 w-5" />,
    title: "Disclaimer",
    content:
      "Our services are offered on a best-effort basis. While we aim to provide accurate and updated information, we do not guarantee the completeness, accuracy, or timeliness of any information or results.",
  },
  {
    icon: <Ban className="h-5 w-5" />,
    title: "Limitation of Liability",
    content:
      "BharatOne Services and Affiliates Pvt. Ltd. shall not be held liable for any indirect, incidental, special, or consequential damages arising out of your use or inability to use our services.",
  },
  {
    icon: <Gavel className="h-5 w-5" />,
    title: "Termination",
    content:
      "We may terminate or suspend your access to our services without notice if you breach these Terms or engage in any unlawful activity.",
  },
  {
    icon: <RefreshCw className="h-5 w-5" />,
    title: "Modifications",
    content:
      "We reserve the right to update or change these Terms at any time. Your continued use of the Site after any changes constitutes your acceptance of the new Terms.",
  },
  {
    icon: <FileText className="h-5 w-5" />,
    title: "Governing Law",
    content:
      "These Terms are governed by the laws of India. Any disputes will be subject to the jurisdiction of courts in Karnataka, India.",
  },
];

function TermsPage() {
  return (
    <div className="relative min-h-screen bg-tricolor overflow-hidden">
      {/* Ambient decoration */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-24 h-72 w-72 rounded-full bg-saffron-gradient opacity-15 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-40 -left-24 h-64 w-64 rounded-full bg-emerald-300/20 blur-2xl"
      />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="relative mx-auto flex min-h-20 max-w-5xl items-center justify-center px-4 sm:px-6 py-3">
          <Link
            to="/login"
            aria-label="Go back"
            className="absolute left-3 sm:left-6 inline-flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <BharatOneLogo size="xl" />
        </div>
      </header>

      <main className="relative mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-14">
        {/* Title Section */}
        <div className="text-center animate-in fade-in slide-in-from-bottom-3 duration-500">
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-[1.05]">
            Terms and{" "}
            <span className="bg-saffron-gradient bg-clip-text text-transparent">
              Conditions
            </span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm sm:text-base text-muted-foreground mx-auto">
            Please read these terms carefully before using BharatOne services.
            By accessing our platform, you agree to be bound by these terms.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Last updated: May 27, 2026
          </p>
        </div>

        {/* Intro Card */}
        <div className="mt-8 rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-soft animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-saffron-gradient text-white shadow-elev">
              <Gavel className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-foreground">
                Agreement to Terms
              </h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                These Terms and Conditions constitute a legally binding agreement made between
                you and BharatOne Services and Affiliates Pvt. Ltd. concerning your access to
                and use of our website and services. By accessing or using our services, you
                agree that you have read, understood, and agree to be bound by these Terms.
                If you do not agree with all of these Terms, you are expressly prohibited from
                using our services.
              </p>
            </div>
          </div>
        </div>

        {/* Terms Sections */}
        <div className="mt-6 space-y-4">
          {SECTIONS.map((section, index) => (
            <div
              key={section.title}
              className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-soft transition-all hover:shadow-elev hover:-translate-y-0.5 animate-in fade-in slide-in-from-bottom-3 fill-mode-both duration-500"
              style={{ animationDelay: `${150 + index * 80}ms` }}
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-100 to-emerald-100 text-saffron">
                  {section.icon}
                </div>
                <div>
                  <h3 className="font-display text-base sm:text-lg font-bold text-foreground">
                    {index + 1}. {section.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                    {section.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Contact Section */}
        <div className="mt-8 rounded-2xl border border-border bg-gradient-to-br from-orange-50 via-white to-emerald-50 p-6 sm:p-8 shadow-soft animate-in fade-in slide-in-from-bottom-3 duration-500">
          <div className="text-center">
            <h2 className="font-display text-xl font-bold text-foreground">
              Questions About Our Terms?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              If you have any questions or concerns about these Terms and Conditions, please contact us.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <a href="tel:+919071100311" className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs sm:text-sm font-semibold text-foreground shadow-soft hover:bg-muted transition"><Phone className="h-4 w-4 shrink-0 text-india-green" /> +91 90711 00311</a>
              <a href="mailto:info@mybharatone.com" className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs sm:text-sm font-semibold text-foreground shadow-soft hover:bg-muted transition"><Mail className="h-4 w-4 shrink-0 text-india-green" /> <span className="truncate">info@mybharatone.com</span></a>
              <a href="mailto:support@mybharatone.com" className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs sm:text-sm font-semibold text-foreground shadow-soft hover:bg-muted transition"><Mail className="h-4 w-4 shrink-0 text-india-green" /> <span className="truncate">support@mybharatone.com</span></a>
            </div>
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="mailto:support@mybharatone.com"
                className="inline-flex items-center gap-2 rounded-lg bg-india-green px-5 py-2.5 text-sm font-semibold text-white shadow-elev hover:bg-india-green/90 transition-all"
              >
                <MessageCircle className="h-4 w-4" /> Contact Support
              </a>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground shadow-soft hover:bg-muted transition-all"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Login
              </Link>
            </div>
          </div>
        </div>

        {/* Copyright Footer */}
        <div className="mt-8 text-center text-xs text-muted-foreground pb-8">
          <p>
            Copyright © 2026{" "}
            <span className="text-india-green font-semibold">
              BharatOne Services & Affiliates Pvt. Ltd.
            </span>{" "}
            All rights reserved.
          </p>
        </div>
      </main>

      {/* Tricolor strip */}
      <div className="fixed bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-saffron via-white to-india-green" />
    </div>
  );
}
