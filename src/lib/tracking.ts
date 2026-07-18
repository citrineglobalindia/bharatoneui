// Lightweight, privacy-friendly visitor tracking for the public website.
// Stores only a random session id + path (no IP, no personal data) via a
// SECURITY DEFINER RPC. Powers the "Total Website Visitors" live statistic.
import { supabase } from "@/integrations/supabase/client";

const KEY = "bo_sid";

export function getSessionId(): string {
  if (typeof window === "undefined") return "server";
  try {
    let id = window.sessionStorage.getItem(KEY);
    if (!id) {
      id = crypto?.randomUUID?.() ?? String(Date.now()) + Math.random().toString(36).slice(2);
      window.sessionStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

export function getConversationId(): string { return getSessionId(); }

export function trackVisit(path?: string): void {
  if (typeof window === "undefined") return;
  const sid = getSessionId();
  if (sid === "server") return;
  void (supabase as any)
    .rpc("record_site_visit", { _session_id: sid, _path: path ?? window.location.pathname })
    .then(() => undefined, () => undefined);
}

export function trackChatMessage(_role?: string, _text?: string): void {}

export default { getSessionId, getConversationId, trackVisit, trackChatMessage };
