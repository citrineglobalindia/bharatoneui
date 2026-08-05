/**
 * One definition of what a service application's status means.
 *
 * This existed in four places — operator.tsx, application-ledger.tsx,
 * service-applications-view.tsx and applications.tsx — and they had already
 * drifted. Every staff screen read `approved` as "Waiting for Approval"; the
 * retailer's own page read the same row as "Completed". The applicant was being
 * told their application was finished while the operator looking at it saw it
 * still waiting.
 *
 * The retailer sees exactly what the operator set. Nothing is interpreted
 * differently on the way out.
 */

/** Every status any surface can write. There is no CHECK constraint on the
 *  column, so this list is the only thing keeping them honest. */
export type ApplicationStatus =
  | "submitted"
  | "on_process"
  | "in_progress"
  | "waiting_approval"
  | "on_delay"
  | "approved"
  | "completed"
  | "rejected";

export const APPLICATION_STATUS_LABEL: Record<string, string> = {
  submitted: "New",
  on_process: "On Process",
  in_progress: "On Process",
  waiting_approval: "Waiting for Approval",
  on_delay: "On Delay",
  approved: "Waiting for Approval",
  completed: "Completed",
  rejected: "Rejected",
};

export const APPLICATION_STATUS_TONE: Record<string, string> = {
  submitted: "bg-saffron/10 text-saffron",
  on_process: "bg-amber-500/10 text-amber-600",
  in_progress: "bg-amber-500/10 text-amber-600",
  waiting_approval: "bg-sky-500/10 text-sky-600",
  on_delay: "bg-orange-600/10 text-orange-700",
  approved: "bg-sky-500/10 text-sky-600",
  completed: "bg-india-green/10 text-india-green",
  rejected: "bg-rose-500/10 text-rose-600",
};

export function statusLabelOf(status: string): string {
  return APPLICATION_STATUS_LABEL[status] ?? status.replace(/_/g, " ");
}

/** The four stages drawn on the retailer's progress tracker. */
export const PIPELINE = ["New", "On Process", "Waiting for Approval", "Completed"] as const;

/**
 * Where a status sits on that tracker.
 *
 * The old code did `STEPS.indexOf(status)` against a four-item array and floored
 * `-1` to `0`. Anything off that list — `on_delay` above all, which the operator
 * can set with a button — collapsed the tracker back to stage one. The retailer
 * saw an "On Delay" badge in the table and then a progress bar claiming the
 * application had not moved since submission.
 *
 * `on_delay` is not a stage, it is a stall during processing: it holds its place
 * on the bar and is called out separately.
 */
const STAGE_INDEX: Record<string, number> = {
  submitted: 0,
  on_process: 1,
  in_progress: 1,
  on_delay: 1,
  waiting_approval: 2,
  approved: 2,
  completed: 3,
};

export type Progress = {
  /** 0-3 index into PIPELINE. */
  index: number;
  /** Rejected is terminal and off the pipeline entirely. */
  rejected: boolean;
  /** Operator has flagged it as stalled. */
  delayed: boolean;
  done: boolean;
};

export function applicationProgress(status: string): Progress {
  if (status === "rejected") return { index: 0, rejected: true, delayed: false, done: false };
  return {
    index: STAGE_INDEX[status] ?? 0,
    rejected: false,
    delayed: status === "on_delay",
    done: status === "completed",
  };
}

/** Commission is earned on completion. `approved` is NOT completion — every
 *  staff screen reads it as "Waiting for Approval". */
export const isEarned = (status: string) => status === "completed";

/** Anything not finished one way or the other is still in flight. */
export const isOpen = (status: string) => !["completed", "rejected"].includes(status);
