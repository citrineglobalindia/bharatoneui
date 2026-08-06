// Who is calling this edge function?
//
// Several functions are deployed with verify_jwt off, because some of them must
// answer unauthenticated callers (registration OTP, gateway callbacks). The
// trouble is that "verify_jwt off" is set per function, not per code path, so a
// function that only staff should ever reach was answering the open internet
// with nothing between the two.
//
// That was not theoretical. send-credentials took an email address, a name, a
// username, a password and a login URL from the request body and mailed them,
// from noreply@mybharatone.com, under the subject "Your BharatOne account is
// approved — login details inside". Anyone on the internet could aim it at any
// address, with any link. send-doc-request was the same shape: "Action needed:
// re-upload your KYC document(s)", with an attacker-supplied link, sent to a
// retailer from BharatOne's own domain. A phishing kit with our reputation
// attached and our mail server doing the sending.
//
// These helpers put the check back. Role lookup deliberately uses the service
// client rather than the has_role RPC: the caller's row-level permissions are
// not the question here, and going through RLS would tie sending an email to
// the caller's two-factor state, which is enforced in the app already.

// Note on the import path: functions in this repo import this as
// "../_shared/caller.ts", which is what `supabase functions deploy` expects.
// The live versions were deployed with a flattened bundle where it sits at
// "./_shared/caller.ts". Both resolve; if you redeploy from the CLI, the repo
// path is the correct one and nothing needs changing.

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

export type Caller = { id: string; email: string | null; roles: string[] };

/** The signed-in user behind this request, or null if there isn't one. */
export async function getCaller(req: Request): Promise<Caller | null> {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) return null;

  // The service key is also a bearer token. It is not a person, and treating it
  // as one would let anything holding it pass a staff check by accident.
  if (token === SERVICE_KEY || token === ANON_KEY) return null;

  const asUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await asUser.auth.getUser();
  if (error || !data?.user) return null;

  const svc = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: rows } = await svc.from("user_roles").select("role").eq("user_id", data.user.id);
  return {
    id: data.user.id,
    email: data.user.email ?? null,
    roles: ((rows ?? []) as { role: string }[]).map((r) => r.role),
  };
}

const STAFF = ["admin", "qc", "accountant", "telecaller", "operator", "hr_staff", "manager"];

/**
 * Returns the caller if they are a member of staff, otherwise a 401/403 to
 * return straight to the client. Deliberately vague to the caller: an endpoint
 * that distinguishes "no token" from "wrong role" tells an attacker which of
 * the two to work on.
 */
export async function requireStaff(
  req: Request,
  cors: Record<string, string>,
): Promise<{ caller: Caller } | { deny: Response }> {
  const caller = await getCaller(req);
  if (!caller || !caller.roles.some((r) => STAFF.includes(r))) {
    return {
      deny: new Response(JSON.stringify({ error: "Not authorised" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      }),
    };
  }
  return { caller };
}

/** Any signed-in user will do — used where the point is simply "not the public". */
export async function requireUser(
  req: Request,
  cors: Record<string, string>,
): Promise<{ caller: Caller } | { deny: Response }> {
  const caller = await getCaller(req);
  if (!caller) {
    return {
      deny: new Response(JSON.stringify({ error: "Not authorised" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      }),
    };
  }
  return { caller };
}
