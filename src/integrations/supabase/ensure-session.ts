import { supabase } from "./client";

// Returns true if a live Supabase session exists (restored from storage by
// supabase-js if the tab was reloaded). This must NEVER create a session:
// the old demo bridge signed into shared staff accounts with credentials
// hardcoded in the bundle, which let anyone open a portal URL with no login.
export async function ensureStaffSession(): Promise<boolean> {
  try {
    const { data } = await withTimeout(supabase.auth.getSession(), 6000);
    return Boolean(data?.session);
  } catch {
    return false;
  }
}

export function withTimeout<T>(p: PromiseLike<T>, ms = 12000): Promise<T> {
  return Promise.race([
    Promise.resolve(p),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Request timed out")), ms)),
  ]);
}
