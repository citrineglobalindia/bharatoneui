// Super Admin — client helpers.
//
// Nothing here decides anything. Every check below is a convenience for drawing
// the screen; the database decides who may do what, via private.is_super_admin(),
// which additionally requires a live second factor. If this file were edited to
// return true for everyone, the platform would still refuse.
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export type SuperState = {
  is_super: boolean;
  identity: boolean;
  expires_at: string | null;
};

let cached: { at: number; value: SuperState } | null = null;
const TTL_MS = 60_000;

export async function superState(force = false): Promise<SuperState> {
  if (!force && cached && Date.now() - cached.at < TTL_MS) return cached.value;
  try {
    const { data } = await db.rpc("super_session_state");
    const value: SuperState = data ?? { is_super: false, identity: false, expires_at: null };
    cached = { at: Date.now(), value };
    return value;
  } catch {
    return { is_super: false, identity: false, expires_at: null };
  }
}

export function clearSuperCache(): void { cached = null; }

/* ── module switches ──────────────────────────────────────────────────── */

// modules_state() returns ONLY the disabled ones, so the common case — nothing
// switched off — is an empty object rather than a list of forty trues.
let modCache: { at: number; off: Set<string> } | null = null;
const MOD_TTL_MS = 60_000;

export async function disabledModules(force = false): Promise<Set<string>> {
  if (!force && modCache && Date.now() - modCache.at < MOD_TTL_MS) return modCache.off;
  try {
    const { data } = await db.rpc("modules_state");
    const off = new Set(Object.keys((data as Record<string, boolean>) ?? {}));
    modCache = { at: Date.now(), off };
    return off;
  } catch {
    // If the check itself fails, leave everything switched on. A network blip
    // must not empty every menu in the platform.
    return new Set();
  }
}

export function clearModuleCache(): void { modCache = null; }
