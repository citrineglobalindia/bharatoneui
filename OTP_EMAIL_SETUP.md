# Email OTP — Setup Guide (Resend)

The database (OTP table + `issue_registration_otp` / `verify_registration_otp`) is already
live, and the registration form's **email** step now calls the real `send-otp` function and
verifies through the database. It will start working the moment you finish the 3 steps below.
(The **mobile** OTP is still the demo code `123456` until you do SMS + DLT later.)

## Step 1 — Create a Resend account & API key
1. Sign up at https://resend.com (free tier is plenty to start).
2. **API Keys → Create API Key** → copy it (starts with `re_...`).
3. Sending address:
   - **Quick test:** you can send using `onboarding@resend.dev`, but Resend only delivers
     test emails to the address you signed up with. Fine for verifying the wiring.
   - **Production:** **Domains → Add Domain**, add the DNS records Resend shows you
     (SPF/DKIM). Once verified, use e.g. `noreply@yourdomain.com`.

## Step 2 — Deploy the edge function
The function code is in the repo at `supabase/functions/send-otp/index.ts`.

**Option A — Supabase CLI** (run locally where the repo is):
```bash
supabase login
supabase link --project-ref grgfodievkckwefubjyj
supabase functions deploy send-otp --no-verify-jwt
```
> `--no-verify-jwt` is required: registrants are anonymous, so the function must accept
> calls without a logged-in user.

**Option B — Lovable:** since your project is Lovable-managed, you can add/deploy the
`send-otp` edge function from Lovable's Supabase/backend panel using the same file.

## Step 3 — Set the secrets
The function needs your Resend key + sender. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
are provided automatically by Supabase — do **not** set those.

**CLI:**
```bash
supabase secrets set RESEND_API_KEY="re_xxxxxxxx" OTP_FROM_EMAIL="BharatOne <noreply@yourdomain.com>"
```
**Dashboard:** Edge Functions → Manage secrets → add `RESEND_API_KEY` and `OTP_FROM_EMAIL`.

## How it works
- Form calls `supabase.functions.invoke("send-otp", { body: { channel:"email", target: email }})`.
- The function asks the DB for a fresh 6-digit code (`issue_registration_otp`, stored hashed,
  10-min expiry, max 5/15min) and emails it via Resend.
- Form verifies with `supabase.rpc("verify_registration_otp", { _target, _channel:"email", _code })`
  (max 5 attempts; one-time use).

## Test
1. Open `/register?type=new`, enter an email you can access, click **Send OTP**.
2. Check inbox, enter the code → should show **Verified**.
3. If it fails: Supabase → Edge Functions → `send-otp` → **Logs** shows the error (usually a
   missing/invalid `RESEND_API_KEY` or an unverified sender domain).

## Later: SMS OTP (India)
SMS needs an SMS provider (e.g. MSG91/Twilio) **and** TRAI **DLT** registration: a registered
sender ID + pre-approved template. Once you have that, the same pattern applies — a `send-sms-otp`
function that calls `issue_registration_otp(target, 'mobile')` and sends via the provider.
