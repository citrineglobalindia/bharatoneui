/**
 * Services temporarily hidden from the public website.
 *
 * Listed here by their exact title. Anything in this list disappears from the
 * homepage services grid, the /citizen-services page and the footer's Services
 * column — without deleting any of the content, so bringing a service back is a
 * one-line change: remove it from this array.
 *
 * Hidden on 30 Jul 2026 at the client's request, pending go-live of the live
 * banking and bill-payment rails.
 */
export const HIDDEN_SERVICES: string[] = [
  "Banking & AEPS",
  "Bill Payments (BBPS)",
];

export const isServiceHidden = (title: string): boolean =>
  HIDDEN_SERVICES.some((h) => h.toLowerCase() === title.trim().toLowerCase());

/** Filter helper for any list of objects carrying a `title`. */
export function withoutHiddenServices<T extends { title: string }>(list: T[]): T[] {
  return list.filter((s) => !isServiceHidden(s.title));
}
