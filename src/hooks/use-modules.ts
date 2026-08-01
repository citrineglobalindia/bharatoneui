// Which modules are switched on, for drawing menus.
//
// This hides menu entries. It is NOT the security boundary — the RPCs behind
// each module do their own checking. A module switched off here is switched off
// because the super admin decided the company should not be using it, which is
// a different concern from who is allowed to use it.
import { useEffect, useState } from "react";
import { disabledModules } from "@/lib/super-admin";

export function useDisabledModules(): { off: Set<string>; ready: boolean } {
  const [off, setOff] = useState<Set<string>>(() => new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let on = true;
    disabledModules().then((s) => { if (on) { setOff(s); setReady(true); } });
    return () => { on = false; };
  }, []);

  return { off, ready };
}

/** Convenience for a nav array: drop anything whose module key is switched off. */
export function visibleItems<T extends { moduleKey?: string }>(
  items: T[], off: Set<string>,
): T[] {
  return items.filter((i) => !i.moduleKey || !off.has(i.moduleKey));
}
