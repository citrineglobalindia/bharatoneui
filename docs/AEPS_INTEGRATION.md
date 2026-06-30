# AEPS Integration Guide

This portal is **pre-wired for AEPS**. The data model, commission settlement, an
Edge Function gateway, and a retailer screen are already in place. When your AEPS
API arrives from the sponsor bank / aggregator, integration is a small, contained
set of changes — you do **not** rebuild anything.

> **Golden rule:** AEPS calls happen **only** in the Edge Function (server side).
> API keys, encryption keys, and the Aadhaar auth chain must never touch the browser.

---

## What already exists

### 1. Database (`public` schema)

- **`aeps_transactions`** — one row per AEPS request (audit trail). Columns:
  `agent_id, operation, aadhaar_last4, bank_iin, amount, status, provider,
  provider_ref, rrn, stan, message, commission, commission_settled, response, …`
  - Only the **last 4 digits** of Aadhaar are stored. Never store full Aadhaar or biometrics.
  - RLS: an agent sees their own rows; admin + accountant see all. Writes happen
    only through the Edge Function (service role).
- **`aeps_provider_config`** — single config row (id = 1):
  `provider_name, base_url, merchant_id, sandbox, active, commission_config (jsonb)`.
  No secrets live here.
- **`aeps_settle_commission(p_txn uuid)`** — credits the agent's wallet with the
  configured commission on a successful txn, via the existing `_wallet_move`
  helper. Idempotent.

### 2. Edge Function — `aeps`

`supabase/functions/aeps/index.ts`. It authenticates the agent, checks role
(retailer/operator/admin), validates input, records a transaction, and (once
configured) calls the provider and settles commission. Until configured it
returns `status: "not_configured"` and logs the attempt.

### 3. Retailer screen — `/aeps`

`src/routes/aeps.tsx`. Operation picker (Balance Enquiry, Cash Withdrawal, Mini
Statement, Aadhaar Pay), Aadhaar + bank + amount, a fingerprint-capture button
(placeholder for the RD-service device), and a live list of the agent's AEPS
transactions. Linked from the retailer sidebar under **Finance → AEPS Banking**.

---

## Go-live checklist (when you receive the API)

1. **Add the secrets** — Supabase Dashboard → Edge Functions → Secrets:
   - `AEPS_BASE_URL`, `AEPS_API_KEY`, `AEPS_MERCHANT_ID`, `AEPS_ENC_KEY`
     (exact set depends on the provider).

2. **Implement `callProvider()`** in `supabase/functions/aeps/index.ts` — the only
   place with a `TODO`. Encrypt the RD-service PID block per the provider spec,
   sign the payload, POST to their endpoint, and map their response to
   `{ ok, rrn, providerRef, message, raw }`. Redeploy the function.

3. **Wire the biometric device** in `src/routes/aeps.tsx` — replace the simulated
   "Capture fingerprint" button with the RD-service call (Mantra / Morpho /
   Startek) that produces the encrypted PID block, and send it in the
   `pidBlock` field of the invoke body. Send the **full** Aadhaar (currently only
   the last 4 are sent for the skeleton).

4. **Configure the provider row + commissions:**
   ```sql
   update public.aeps_provider_config set
     provider_name = '<provider>',
     base_url      = '<https://...>',
     merchant_id   = '<merchant id>',
     sandbox       = true,            -- false for production
     active        = true,
     commission_config = '{"cash_withdrawal": 4, "aadhaar_pay": 3, "balance_enquiry": 0, "mini_statement": 0}'::jsonb
   where id = 1;
   ```

5. **Test in UAT** against the provider's sandbox + test Aadhaar/devices, run their
   full test-case suite, then submit for sponsor-bank / aggregator certification.

6. **Switch to production** keys, set `sandbox = false`, and build the daily
   **reconciliation** (match `aeps_transactions` against the provider's settlement
   file) plus a dispute/refund flow before opening to real agents.

---

## Compliance reminders

- **Server-side only** — keys and PID encryption stay in the Edge Function.
- **Never persist** biometrics or full Aadhaar; mask to last 4 everywhere.
- **Data localization (RBI)** — payment data must reside in India. The Supabase
  project is currently in `ap-northeast-1` (Tokyo); confirm the region requirement
  with the sponsor bank before certification.
- **Audit + 2FA** — every transaction is logged; add a second factor on the agent
  action for cash operations.

---

## Request / response shape

**Frontend → Edge Function** (`supabase.functions.invoke("aeps", { body })`):
```json
{ "operation": "cash_withdrawal", "aadhaarLast4": "9797", "bankIin": "508505", "amount": 500, "pidBlock": "<encrypted PID>" }
```

**Edge Function → Frontend:**
```json
{ "status": "success | failed | not_configured", "txnId": "<uuid>", "rrn": "...", "message": "..." }
```
