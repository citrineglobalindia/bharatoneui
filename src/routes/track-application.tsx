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
} from "lucide-react";
import { BharatOneLogo } from "@/components/bharatone-logo";
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicationId.trim() && !mobile.trim()) return;
    setStatus("loading");
    // Simulate API call
    setTimeout(() => {
      // Mock result — in production this would query the backend
      if (applicationId.trim().length >= 5 || mobile.trim().length >= 10) {
        setStatus("found");
      } else {
        setStatus("not-found");
      }
    }, 1200);
  };

  return (
    <div className="relative min-h-screen bg-tricolor flex items-center justify-center p-3 sm:p-6 lg:p-10 overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-24 h-80 w-80 rounded-full bg-saffron-gradient opacity-15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-emerald-300/20 blur-3xl"
      />

      <div className="relative w-full max-w-xl flex flex-col rounded-3xl border border-border bg-card shadow-elev overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-border bg-gradient-to-r from-orange-50 to-emerald-50 px-6 py-4">
          <a
            href="/login"
            aria-label="Go back"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </a>
          <div className="flex items-center gap-3">
            <BharatOneLogo size="sm" />
            <div>
              <h1 className="font-display text-lg font-bold text-foreground">
                Track Application
              </h1>
              <p className="text-xs text-muted-foreground">Check your registration status</p>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-10">
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-foreground">Application ID</label>
              <div className="mt-1.5 relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-india-green" />
                <input
                  value={applicationId}
                  onChange={(e) => setApplicationId(e.target.value)}
                  className="h-12 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm shadow-soft transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-india-green/15 focus-visible:border-india-green"
                  placeholder="Enter Application ID"
                />
              </div>
            </div>

            <div className="relative my-3 flex items-center">
              <div className="flex-grow border-t border-border" />
              <span className="mx-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                OR
              </span>
              <div className="flex-grow border-t border-border" />
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground">Registered Mobile Number</label>
              <div className="mt-1.5 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-india-green" />
                <input
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="h-12 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm shadow-soft transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-india-green/15 focus-visible:border-india-green"
                  placeholder="+91 98XXX XXXXX"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={status === "loading"}
              className="h-12 w-full rounded-lg bg-india-green text-base font-semibold text-white shadow-elev hover:bg-india-green/90 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70"
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
          </form>

          {/* Results */}
          {status === "found" && (
            <div className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold text-foreground">Application Found</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Application ID: <span className="font-mono font-semibold text-foreground">{applicationId || "N/A"}</span>
                    </p>
                    <div className="mt-3 space-y-2">
                      <StatusStep label="Application Submitted" status="completed" />
                      <StatusStep label="Document Verification" status="completed" />
                      <StatusStep label="KYC Verification" status="in-progress" />
                      <StatusStep label="Final Approval" status="pending" />
                    </div>
                    <div className="mt-4 rounded-lg bg-white/80 border border-emerald-200 px-3 py-2">
                      <p className="text-xs text-emerald-700 font-medium flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        Expected completion: 2-3 business days
                      </p>
                    </div>
                  </div>
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
                      We could not find any application matching the provided details. Please double-check your Application ID or mobile number.
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      If you just submitted your application, please wait 24 hours for it to appear in our system.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tricolor strip */}
        <div className="h-1.5 w-full bg-gradient-to-r from-saffron via-white to-india-green" />
      </div>
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
