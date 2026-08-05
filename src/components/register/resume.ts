import { supabase } from "@/integrations/supabase/client";
import type { RegData } from "./registration-context";

/**
 * Resuming an abandoned registration.
 *
 * Before this existed, nothing was written server-side until the applicant
 * reached the final Submit. Someone who got as far as the KYC step and closed
 * the tab lost every field they had typed, and on returning was handed a blank
 * form with no acknowledgement that they had ever been here.
 *
 * What is kept is the typed data only. Documents are not persisted, so a
 * resumed applicant re-attaches PAN, Aadhaar, shop photos, the selfie and the
 * video. That is a deliberate limit, and the UI says so plainly rather than
 * letting someone reach the Submit button and discover it there.
 *
 * The password is never saved — not in the payload sent from here, and the RPC
 * strips it again on the way in.
 */

/** Draft-session token, valid 12 hours, minted once the email OTP is verified. */
let token: string | null = null;

export function getResumeToken(): string | null {
  return token;
}

export type SavedDraft = {
  current_step: number;
  furthest_step: number;
  registration_type: "new" | "old";
  mobile: string | null;
  data: Partial<RegData>;
  last_seen_at: string;
  created_at: string;
};

export type PriorApplication = {
  application_id: string;
  status: string;
  submitted_at: string;
  can_start_new: boolean;
  rejection_reason: string | null;
};

export type ResumeState = {
  draft: SavedDraft | null;
  application: PriorApplication | null;
};

/**
 * Fields worth carrying across a break. Deliberately excludes `password`, the
 * verification booleans (re-proved by the OTP the applicant just completed) and
 * anything file-shaped.
 */
const RESUMABLE: (keyof RegData)[] = [
  "firstName", "middleName", "surname", "dob", "personalValid",
  "shopName", "addressType", "buildingShopNo", "streetArea", "wardNumber", "landmark",
  "villageName", "gramPanchayat", "hobliName", "postOffice", "postOfficeName", "taluk",
  "city", "district", "state", "pincode", "latitude", "longitude", "bank",
  "panNumber", "aadhaarNumber",
  "declarationAgreed", "termsAgreed", "videoLat", "videoLng",
  "payment", "jskoId",
];

function pickResumable(data: RegData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of RESUMABLE) {
    const v = data[k];
    if (v !== undefined) out[k] = v;
  }
  return out;
}

/**
 * Called immediately after the email OTP is verified. Mints the session token
 * and returns anything already held for this email.
 *
 * A failure here is never fatal: if the lookup breaks, the applicant simply
 * gets the ordinary blank form rather than a broken page.
 */
export async function beginResume(email: string, mobile?: string): Promise<ResumeState> {
  try {
    const { data, error } = await supabase.rpc("registration_resume_begin", {
      _email: email,
      _mobile: mobile ?? null,
    });
    if (error) return { draft: null, application: null };
    const r = data as { token?: string; draft?: SavedDraft | null; application?: PriorApplication | null } | null;
    token = r?.token ?? null;
    return { draft: r?.draft ?? null, application: r?.application ?? null };
  } catch {
    return { draft: null, application: null };
  }
}

/** Save progress. Fire-and-forget — a save failure must never block the form. */
export async function saveDraft(
  step: number,
  data: RegData,
  type: "new" | "old",
): Promise<void> {
  if (!token) return;
  try {
    await supabase.rpc("registration_draft_save", {
      _token: token,
      _step: step,
      _data: pickResumable(data) as never,
      _mobile: data.mobile || null,
      _type: type,
    });
  } catch { /* progress saving is best-effort */ }
}

/** "Start again from the beginning." */
export async function discardDraft(): Promise<void> {
  if (!token) return;
  try {
    await supabase.rpc("registration_draft_discard", { _token: token });
  } catch { /* ignore */ }
}

/**
 * The step to drop a returning applicant on.
 *
 * Capped at the first step that needs a document, because documents are not
 * saved. Landing someone on the payment step with an empty file set would let
 * them reach Submit and fail there, having been told nothing.
 */
export function resumeStepFor(saved: number, firstFileStep: number): number {
  return Math.max(0, Math.min(saved, firstFileStep));
}

/** Human wording for a submitted application's workflow status. */
export function statusLabel(status: string): string {
  switch (status) {
    case "accountant_review": return "with our accounts team for payment verification";
    case "qc_review":         return "with our QC team for document verification";
    case "docs_requested":    return "waiting for you to re-upload documents";
    case "telecaller":        return "with our onboarding team";
    case "approved":          return "approved";
    case "active":            return "approved and active";
    case "completed":         return "completed";
    case "on_hold":           return "on hold";
    case "rejected":          return "rejected";
    default:                  return status.replace(/_/g, " ");
  }
}
