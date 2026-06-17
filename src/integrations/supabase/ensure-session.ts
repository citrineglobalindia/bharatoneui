import { supabase } from "./client";

// Staff demo logins are bridged to these real Supabase accounts. On reload the
// bridge (in login.tsx) doesn't re-run, so this restores the session if it was lost.
const REAL_ACCOUNTS: Record<string, { email: string; password: string }> = {
  admin: { email: "sadanns123@gmail.com", password: "Password@55" },
  accountant: { email: "accountant@bharatone.in", password: "Acct@1234" },
  qc: { email: "qc@bharatone.in", password: "QcCheck@12" },
  telecaller: { email: "telecaller@bharatone.in", password: "Tele@1234" },
  operator: { email: "operator@bharatone.in", password: "Operator@123" },
};

function storedRole(): string | undefined {
  try {
    return JSON.parse(localStorage.getItem("bharatone:auth") || "{}").role;
  } catch {
    return undefined;
  }
}

// Returns true if a Supabase session is available (existing or restored).
export async function ensureStaffSession(): Promise<boolean> {
  try {
    const { data } = await withTimeout(supabase.auth.getSession(), 6000);
    if (data?.session) return true;
    const role = storedRole();
    const acct = role ? REAL_ACCOUNTS[role] : undefined;
    if (!acct) return false;
    const { error } = await withTimeout(supabase.auth.signInWithPassword(acct), 8000);
    return !error;
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
