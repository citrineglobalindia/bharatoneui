import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Shield,
  Eye,
  FileLock,
  Link as LinkIcon,
  Lock,
  FileText,
  MessageCircle,
  Phone,
  Copyright,
  Globe,
  Server,
  Mail,
} from "lucide-react";
import { BharatOneLogo } from "@/components/bharatone-logo";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — BharatOne" },
      {
        name: "description",
        content:
          "Read the Privacy Policy for BharatOne Services and Affiliates Pvt. Ltd. Learn how we collect, use, and protect your personal information.",
      },
    ],
  }),
  component: PrivacyPolicyPage,
});

const SECTIONS = [
  {
    icon: <Eye className="h-5 w-5" />,
    title: "Privacy Policy",
    content:
      "BharatOne Services and Affiliates Pvt. Ltd. are committed to protecting the privacy of users who visit our website. We do not automatically collect any personal information that can identify you individually (such as name, phone number, or email address), unless you voluntarily provide it to us.",
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: "Use of Personal Information",
    content:
      "If you choose to provide personal information through any form, service registration, or email, it will be used strictly to respond to your query or provide the service you requested. We do not share, sell, or distribute personal information to third parties, unless required by law or for delivering services with your consent.",
  },
  {
    icon: <Copyright className="h-5 w-5" />,
    title: "Copyright Policy",
    content:
      "All content published on the BharatOne Services website is the property of BharatOne Services and Affiliates Pvt. Ltd. unless otherwise stated. You may reproduce material from this website free of charge with prior written permission. However, this must be done accurately, without derogatory context, and with proper acknowledgment of the source. Permission does not extend to any third-party material identified as such. For content owned by other copyright holders, users must obtain permission directly from them.",
  },
  {
    icon: <LinkIcon className="h-5 w-5" />,
    title: "Hyperlinking Policy",
    content:
      "Our website may contain links to external websites for user convenience. BharatOne Services and Affiliates Pvt. Ltd. are not responsible for the content or reliability of linked websites and do not endorse any views expressed therein. We do not guarantee that links will remain active at all times and are not liable for any broken or outdated links.",
  },
  {
    icon: <Server className="h-5 w-5" />,
    title: "Security Policy",
    content:
      "To ensure site security and availability to all users, our systems use commercial-grade software to monitor traffic and detect unauthorized activity. Unauthorized attempts to alter or upload content, or otherwise damage this site, are strictly prohibited and punishable under the Information Technology Act, 2000 and other applicable Indian laws.",
  },
  {
    icon: <FileLock className="h-5 w-5" />,
    title: "Data Retention",
    content:
      "We retain logs of traffic for analysis and security purposes, which are regularly reviewed and deleted according to our internal data retention policies. We do not retain personal information longer than necessary to fulfill the purpose for which it was collected.",
  },
  {
    icon: <Lock className="h-5 w-5" />,
    title: "Security Measures",
    content:
      "We employ industry-standard security measures to protect your information from unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.",
  },
  {
    icon: <Globe className="h-5 w-5" />,
    title: "Cookies & Tracking",
    content:
      "We may use cookies and similar tracking technologies to enhance your browsing experience, analyze site traffic, and understand user interactions. You can set your browser to refuse cookies, but this may limit your use of certain features on our website.",
  },
  {
    icon: <Mail className="h-5 w-5" />,
    title: "Contact for Privacy Concerns",
    content:
      "If you have any questions, concerns, or requests regarding your personal data or this Privacy Policy, please contact us at support@bharatone.in. We will respond to your inquiry within a reasonable timeframe.",
  },
];

function PrivacyPolicyPage() {
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
            Privacy{" "}
            <span className="bg-saffron-gradient bg-clip-text text-transparent">
              Policy
            </span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm sm:text-base text-muted-foreground mx-auto">
            Your privacy is important to us. Learn how BharatOne Services collects, uses, and protects your personal information.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Last updated: May 27, 2026
          </p>
        </div>

        {/* Intro Card */}
        <div className="mt-8 rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-soft animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-saffron-gradient text-white shadow-elev">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-foreground">
                Our Commitment to You
              </h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                BharatOne Services and Affiliates Pvt. Ltd. are committed to protecting the privacy
                of users who visit our website. We believe in transparency, security, and respect
                for your personal data. This Privacy Policy outlines how we handle information
                collected through our services.
              </p>
            </div>
          </div>
        </div>

        {/* Privacy Sections */}
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
              Questions About Our Privacy Policy?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              If you have any questions or concerns about this Privacy Policy, please contact us.
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
