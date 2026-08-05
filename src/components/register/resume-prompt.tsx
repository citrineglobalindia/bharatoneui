import { motion } from "framer-motion";
import { History, RotateCcw, ArrowRight, FileClock, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { statusLabel, type PriorApplication, type SavedDraft } from "./resume";

function when(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function daysAgo(iso: string): string {
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return "";
  const n = Math.floor((Date.now() - d) / 86_400_000);
  if (n <= 0) return "earlier today";
  if (n === 1) return "yesterday";
  return `${n} days ago`;
}

/**
 * Shown once the applicant has proved their email, when we are already holding
 * something for them: an unfinished draft, a submitted application, or both.
 *
 * The choice is always theirs. Nothing resumes automatically — someone whose
 * circumstances changed (new shop, new bank) needs the clean start more than
 * they need their old answers back.
 */
export function ResumePrompt({
  draft,
  application,
  stepLabels,
  resumeStep,
  onContinue,
  onStartOver,
  busy,
}: {
  draft: SavedDraft | null;
  application: PriorApplication | null;
  stepLabels: string[];
  resumeStep: number;
  onContinue: () => void;
  onStartOver: () => void;
  busy?: boolean;
}) {
  // A submitted application that is still moving through review blocks a second
  // one. Filing twice is not something an applicant would knowingly do, and it
  // puts two records of the same person in front of your reviewers.
  const blocking = application && !application.can_start_new;

  if (blocking) {
    const done = ["approved", "active", "completed"].includes(application.status);
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-6 shadow-soft"
      >
        <div className="flex items-start gap-4">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${done ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
            {done ? <CheckCircle2 className="h-5 w-5" /> : <FileClock className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-semibold">
              You have already applied
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Application <span className="font-semibold text-foreground">{application.application_id}</span> was
              submitted on {when(application.submitted_at)} and is currently{" "}
              <span className="font-medium text-foreground">{statusLabel(application.status)}</span>.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              There is nothing more for you to do here. Applying a second time would create a
              duplicate record and slow your review down rather than speed it up.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={() => { window.location.href = `/track-application?id=${encodeURIComponent(application.application_id)}`; }}>
                Track my application <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => { window.location.href = "/contact"; }}>
                Contact support
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!draft) return null;

  const savedLabel = stepLabels[Math.min(draft.furthest_step, stepLabels.length - 1)] ?? "";
  const landLabel = stepLabels[Math.min(resumeStep, stepLabels.length - 1)] ?? "";
  // Documents are not kept with a draft, so anyone who had gone past the point
  // where uploads start will be put back at that step. Say so here rather than
  // letting them find out at the Submit button.
  const rewound = resumeStep < draft.furthest_step;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-6 shadow-soft"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--saffron)]/10 text-[var(--saffron)]">
          <History className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-semibold">Welcome back — you have an unfinished registration</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            You last worked on this {daysAgo(draft.last_seen_at)} and had reached{" "}
            <span className="font-medium text-foreground">
              step {Math.min(draft.furthest_step, stepLabels.length - 1) + 1} of {stepLabels.length} — {savedLabel}
            </span>
            . Your details are saved and will be filled in for you.
          </p>

          {application?.can_start_new && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Your earlier application {application.application_id} was not approved
                {application.rejection_reason ? ` — ${application.rejection_reason}` : ""}. You are welcome to apply again.
              </span>
            </div>
          )}

          {rewound && (
            <div className="mt-4 rounded-xl border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
              Your uploaded documents are not saved with a draft, so you will pick up at{" "}
              <span className="font-medium text-foreground">{landLabel}</span> and attach them again.
              Everything you typed is kept.
            </div>
          )}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button onClick={onContinue} disabled={busy} className="sm:flex-1">
              Continue where I stopped <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={onStartOver} disabled={busy} className="sm:flex-1">
              <RotateCcw className="mr-1.5 h-4 w-4" /> Start again from the beginning
            </Button>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Starting again permanently deletes the saved details above.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
