// A tiny in-memory cache for data that is fetched on every screen but hardly
// ever changes — the service catalogue that builds the retailer sidebar, for
// instance.
//
// Why this is needed: each portal route file renders its own <Shell>, so
// navigating from /wallet to /transactions unmounts one shell and mounts
// another. Every mount re-ran the shell's queries, so simply clicking around
// cost three round trips per click and the menu visibly rebuilt itself. The
// catalogue changes when an admin edits it, not while a retailer is browsing,
// so fetching it once per few minutes is plenty.
//
// This is a UI-latency cache only. It must never hold anything security
// sensitive: RLS in the database remains the authority on what a user may see.

type Entry = { at: number; value: unknown };

const store = new Map<string, Entry>();
const inFlight = new Map<string, Promise<unknown>>();

/** Default lifetime. Long enough to make navigation instant, short enough that
 *  an admin's change shows up without anyone being told to reload. */
export const DEFAULT_TTL_MS = 3 * 60 * 1000;

/**
 * Runs `fetcher` and remembers the result for `ttlMs`.
 *
 * Concurrent callers with the same key share one request, so several
 * components mounting together do not each fire their own copy.
 */
export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;

  const running = inFlight.get(key);
  if (running) return running as Promise<T>;

  const p = (async () => {
    try {
      const value = await fetcher();
      store.set(key, { at: Date.now(), value });
      return value;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, p);
  return p as Promise<T>;
}

/** Synchronous peek — lets a component render from cache on its first paint. */
export function peek<T>(key: string, ttlMs: number = DEFAULT_TTL_MS): T | undefined {
  const hit = store.get(key);
  return hit && Date.now() - hit.at < ttlMs ? (hit.value as T) : undefined;
}

/** Drop one key, or everything. Call on sign-out and after an admin edit. */
export function invalidate(key?: string): void {
  if (key) { store.delete(key); inFlight.delete(key); }
  else { store.clear(); inFlight.clear(); }
}
