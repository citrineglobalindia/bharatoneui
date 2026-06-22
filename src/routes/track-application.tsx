import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  ShieldCheck,
  HelpCircle,
  Phone,
  Mail,
  Headphones,
  Sparkles,
  Copy,
  Download,
  RefreshCw,
} from "lucide-react";
import { BharatOneLogo } from "@/components/bharatone-logo";
import { LegalSocial } from "@/components/legal-social";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/track-application")({
  head: () => ({
    meta: [
      { title: "Track Application — BharatOne" },
      {
        name: "description",
        content:
          "Track your BharatOne registration application status. Check approval progress for Retailer, Distributor, and JSKO onboarding.",
      },
    ],
  }),
  component: TrackApplicationPage,
});

function TrackApplicationPage() {
  const [applicationId, setApplicationId] = useState("");
  const [mobile, setMobile] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "found" | "not-found">("idle");
  const [method, setMethod] = useState<"id" | "mobile">("id");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const value = method === "id" ? applicationId.trim() : mobile.trim();
    if (!value) return;
    setStatus("loading");
    // Simulate API call
    setTimeout(() => {
      if (
        (method === "id" && value.length >= 5) ||
        (method === "mobile" && value.length >= 10)
      ) {
        setStatus("found");
      } else {
        setStatus("not-found");
      }
    }, 1200);
  };

  return (
    <div className="relative min-h-screen bg-tricolor flex items-center justify-center px-3 py-4 sm:p-6 lg:p-10 overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-24 h-80 w-80 rounded-full bg-saffron-gradient opacity-15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-emerald-300/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full bg-india-green/5 blur-3xl"
      />

      <div className="relative w-full max-w-md md:max-w-3xl lg:max-w-5xl grid md:grid-cols-[1.1fr_1fr] gap-4 sm:gap-6 lg:gap-8 animate-in fade-in zoom-in-95 duration-500">
        {/* LEFT: Brand / Info panel */}
        <aside className="relative hidden md:flex flex-col justify-between rounded-3xl border border-border bg-gradient-to-br from-orange-50 via-white to-emerald-50 p-5 sm:p-6 lg:p-8 shadow-elev overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-saffron/10 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-india-green/10 blur-3xl"
          />

          <div className="relative">
            <a
              href="/login"
              className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </a>

            <div className="mt-5 flex flex-col items-center gap-4 text-center lg:gap-5">
              <div className="rounded-2xl bg-white/80 backdrop-blur border border-border p-3 lg:p-4 shadow-soft">
                <BharatOneLogo size="lg" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-india-green/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-india-green ring-1 ring-india-green/20">
                  <Sparkles className="h-3 w-3" />
                  Real-time Tracking
                </span>
                <h1 className="mt-3 font-display text-2xl lg:text-3xl font-bold leading-tight text-foreground">
                  Track Your JSKO <span className="text-india-green">Application</span>
                </h1>
                <p className="mt-2 text-xs lg:text-sm text-muted-foreground leading-relaxed">
                  Get instant updates on your BharatOne registration — from document
                  verification to final approval, all in one place.
                </p>
              </div>
            </div>

            <div className="mt-5 lg:mt-6 space-y-2.5 lg:space-y-3">
              <InfoRow icon={<ShieldCheck className="h-4 w-4" />} title="Secure & Verified" desc="End-to-end encrypted tracking with OTP verification." />
              <InfoRow icon={<Clock className="h-4 w-4" />} title="Live Status Updates" desc="See progress through every verification stage." />
              <InfoRow icon={<Headphones className="h-4 w-4" />} title="24×7 Support" desc="Stuck somewhere? Our team is just a call away." />
            </div>
          </div>

          <div className="relative mt-5 lg:mt-6 grid grid-cols-3 gap-2 lg:gap-3">
            <Stat value="2.4L+" label="Applications" />
            <Stat value="98%" label="Approval Rate" />
            <Stat value="48h" label="Avg. Time" />
          </div>
        </aside>

        {/* RIGHT: Form card */}
        <div className="relative flex flex-col rounded-3xl border border-border bg-card shadow-elev overflow-hidden">
          {/* Mobile header */}
          <div className="flex items-center gap-3 border-b border-border bg-gradient-to-r from-orange-50 to-emerald-50 px-4 sm:px-5 py-3 sm:py-4 md:hidden">
            <a
              href="/login"
              aria-label="Go back"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </a>
            <BharatOneLogo size="md" />
            <div className="ml-auto">
              <p className="text-xs font-semibold text-india-green">Track JSKO Application</p>
            </div>
          </div>

          <div className="p-5 sm:p-6 lg:p-8">
            <div className="hidden md:flex flex-col items-center text-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                System Online
              </span>
              <h2 className="font-display text-lg lg:text-xl font-bold text-foreground">Check Status</h2>
              <p className="text-xs lg:text-sm text-muted-foreground">Enter your details to view application progress.</p>
            </div>

            {/* Method tabs */}
            <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
              <button
                type="button"
                onClick={() => setMethod("id")}
                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                  method === "id"
                    ? "bg-white text-india-green shadow-soft"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileText className="h-3.5 w-3.5" /> Application Number
              </button>
              <button
                type="button"
                onClick={() => setMethod("mobile")}
                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                  method === "mobile"
                    ? "bg-white text-india-green shadow-soft"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Phone className="h-3.5 w-3.5" /> Mobile Number
              </button>
            </div>

            <form onSubmit={handleSearch} className="mt-5 space-y-4">
              {method === "id" ? (
                <div>
                  <label className="text-sm font-semibold text-foreground">Application Number</label>
                  <div className="mt-1.5 relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-india-green" />
                    <input
                      value={applicationId}
                      onChange={(e) => setApplicationId(e.target.value)}
                      className="h-11 sm:h-12 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm shadow-soft transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-india-green/15 focus-visible:border-india-green"
                      placeholder="e.g. BO-2025-AB12345"
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    Find your Application Number in the confirmation SMS or email.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="text-sm font-semibold text-foreground">Registered Mobile Number</label>
                  <div className="mt-1.5 relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-india-green" />
                    <input
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      inputMode="numeric"
                      className="h-11 sm:h-12 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm shadow-soft transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-india-green/15 focus-visible:border-india-green"
                      placeholder="+91 98XXX XXXXX"
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    Use the same mobile number you registered with.
                  </p>
                </div>
              )}

              <Button
                type="submit"
                disabled={status === "loading"}
                className="h-11 sm:h-12 w-full rounded-lg bg-india-green text-sm sm:text-base font-semibold text-white shadow-elev hover:bg-india-green/90 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70"
              >
                {status === "loading" ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Searching...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Search className="h-4 w-4" /> Track Application
                  </span>
                )}
              </Button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3 w-3 text-india-green" />
                Your data is encrypted and never shared.
              </div>
            </form>

            {/* Results */}
            {status === "found" && (
              <div className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 ring-4 ring-emerald-50">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-display text-base font-bold text-foreground">Application Found</h3>
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                            In Progress
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          ID: <span className="font-mono font-semibold text-foreground">{applicationId || "BO-2025-XX1234"}</span>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-white hover:bg-muted transition-colors"
                      title="Copy ID"
                    >
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>

                  <div className="mt-4 space-y-2.5">
                    <StatusStep label="Application Submitted" status="completed" />
                    <StatusStep label="Document Verification" status="completed" />
                    <StatusStep label="KYC Verification" status="in-progress" />
                    <StatusStep label="Final Approval" status="pending" />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-white/80 border border-emerald-200 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Submitted</p>
                      <p className="text-xs font-semibold text-foreground">22 May 2026</p>
                    </div>
                    <div className="rounded-lg bg-white/80 border border-emerald-200 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Expected</p>
                      <p className="text-xs font-semibold text-emerald-700">2–3 business days</p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted transition-colors">
                      <Download className="h-3.5 w-3.5" /> Download Receipt
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus("loading")}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted transition-colors"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Refresh
                    </button>
                  </div>
                </div>
              </div>
            )}

            {status === "not-found" && (
              <div className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="rounded-2xl border border-red-200 bg-red-50/60 p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                      <XCircle className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-bold text-foreground">Application Not Found</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        We could not find any application matching the provided details. Please double-check your input.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <a href="tel:18001234567" className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors">
                          <Phone className="h-3.5 w-3.5" /> Call Support
                        </a>
                        <a href="mailto:support@bharatone.in" className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors">
                          <Mail className="h-3.5 w-3.5" /> Email Us
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Help footer */}
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-dashed border-border bg-muted/40 p-3">
              <HelpCircle className="h-4 w-4 mt-0.5 text-india-green shrink-0" />
              <p className="text-xs text-muted-foreground">
                Need help finding your Application Number?{" "}
                <a href="mailto:support@mybharatone.com" className="font-semibold text-india-green hover:underline">
                  Contact support
                </a>
              </p>
            </div>
          </div>

          {/* Contact support */}
          <div className="border-t border-border px-5 sm:px-6 lg:px-8 py-5">
            <p className="text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">Contact Support</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <a href="tel:+919071100311" className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs sm:text-sm font-semibold text-foreground shadow-soft hover:bg-muted transition"><Phone className="h-4 w-4 shrink-0 text-india-green" /> +91 90711 00311</a>
              <a href="mailto:info@mybharatone.com" className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs sm:text-sm font-semibold text-foreground shadow-soft hover:bg-muted transition"><Mail className="h-4 w-4 shrink-0 text-india-green" /> <span className="truncate">info@mybharatone.com</span></a>
              <a href="mailto:support@mybharatone.com" className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs sm:text-sm font-semibold text-foreground shadow-soft hover:bg-muted transition"><Mail className="h-4 w-4 shrink-0 text-india-green" /> <span className="truncate">support@mybharatone.com</span></a>
            </div>
            <LegalSocial />
            <p className="mt-4 text-center text-[11px] text-muted-foreground">Copyright © 2026 <span className="font-semibold text-india-green">BharatOne Services &amp; Affiliates Pvt. Ltd.</span> All rights reserved.</p>
          </div>

          {/* Tricolor strip */}
          <div className="h-1.5 w-full bg-gradient-to-r from-saffron via-white to-india-green" />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-white/70 backdrop-blur border border-border p-3 shadow-soft">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-india-green/10 text-india-green">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground leading-tight">{title}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-white/80 backdrop-blur border border-border p-3 text-center shadow-soft">
      <p className="font-display text-lg font-bold text-india-green">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

function StatusStep({
  label,
  status,
}: {
  label: string;
  status: "completed" | "in-progress" | "pending";
}) {
  const icons = {
    completed: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
    "in-progress": <Loader2 className="h-4 w-4 text-india-green animate-spin" />,
    pending: <Clock className="h-4 w-4 text-muted-foreground" />,
  };

  const lineColors = {
    completed: "bg-emerald-200",
    "in-progress": "bg-india-green/30",
    pending: "bg-border",
  };

  const textColors = {
    completed: "text-emerald-700",
    "in-progress": "text-india-green font-semibold",
    pending: "text-muted-foreground",
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-6 w-6 items-center justify-center">{icons[status]}</div>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            status === "completed"
              ? "w-full bg-emerald-400"
              : status === "in-progress"
              ? "w-1/2 bg-india-green animate-pulse"
              : "w-0"
          }`}
        />
      </div>
      <span className={`text-xs ${textColors[status]}`}>{label}</span>
    </div>
  );
}
