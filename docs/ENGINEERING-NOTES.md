# BharatOne — Engineering Notes

Running memory of hard-won facts, decisions and gotchas. **Read this before touching AePS or BBPS.**
Update it whenever something non-obvious is learned, especially anything that cost time to discover.

Last updated: 18 July 2026

---

## 1. Architecture

- Frontend: React + TanStack Router + Tailwind. Deploys to Vercel from `main` automatically.
- Backend: Supabase — Postgres (RLS + SECURITY DEFINER RPCs), Edge Functions (Deno), Storage.
- Banking partner: **Eko** (`ekoicici/v3`), production base `https://api.eko.in:25002/ekoicici`.
- Static-IP relay (for IP-whitelisted calls): `https://eko-relay.mybharatone.com/ekoicici`
  — AWS Mumbai, Elastic IP `3.6.233.114`, Caddy → Node proxy.
  Caddy strips underscores from headers, hence we send both `developer_key` and `x-developer-key`.

### Pushing code
The workspace has no SSH key. Push through the clone at `/tmp/bo_p41`, which has an HTTPS token
remote: copy changed files there, `npm run build`, commit, `git push origin HEAD:main`.

### Known noise
The generated Supabase types file is stale — `gallery_images`, `hero_images`, `awards`,
`testimonials`, `social_links`, `bbps_*` are missing from it. Files touching those show `tsc`
errors but **build and run fine**. Use `(supabase as any)` for new tables. Regenerating types
would clear this up and is worth doing at some point.

---

## 2. Eko integration — facts that cost time to learn

### Auth (all Eko calls)
```
developer_key         = <static key>
secret-key            = base64(HMAC-SHA256(message = timestamp, key = base64(auth_key)))
secret-key-timestamp  = epoch milliseconds
```
Same scheme for AePS and BBPS. Reuse `ekoHeaders()` in `supabase/functions/aeps/index.ts`.

### initiator_id = 9611151671
`7411913356` is **wrong** — Eko confirmed this. Every successful call uses 9611151671.

### Onboarding (`POST /v3/users/network/eps-agent`)
- Must include `email` and `shop_name`, or activation later fails.
- `first_name` = given name, `last_name` = **surname only**. Including a middle name/initial
  returns error 1428 "Name not matched". (Tested empirically — do not "fix" this again.)

### Activation (`PUT /v3/admin/network/agent/{user_code}/aeps-fingpay/activate`)
- multipart/form-data with a **single field literally named `form-data`** holding a JSON string
  of all params, plus `pan_card` / `aadhar_front` / `aadhar_back` files.
- Files must be JPG/JPEG/PDF, under 1 MB. **PNG is rejected.**
- Address must be a full real address. Short addresses → 5009 / 5036 / 1258.

### Never hard-code lookups
- `get-states` — Karnataka = **12** (not the obvious guess; wrong value caused activation failures)
- `get-Mcc-Category` — shop_type, e.g. 5411 Groceries
- `GET /v3/tools/reference/banks?initiator_id=&user_code=` — 934 banks, codes like SBIN/HDFC

### Aadhaar encryption
RSA **PKCS#1 v1.5**, base64. Hand-rolled in Deno in the aeps function (`rsaEncryptPkcs1`).

### WADH for PID capture
`E0jzJ/P8UopUHAieZn8CKqS4WPMi5ZSYXgfnlfkWjrc=`
Confirmed by the Partner API guide, Section 5.3 note. **Applies to agent eKYC and daily KYC too.**
An attempt to omit it for agent-side captures did not help and was reverted — don't repeat it.

### Eko error codes seen
| Code | Meaning |
|---|---|
| 1258 | Registration failed / missing fields |
| 1290 | Onboard success |
| 1295 | Service already exists |
| 1307 | User already exists |
| 1428 | Name not matched |
| 461 | Identity mismatch / generic failure / OTP steps skipped |
| 1467, 1528 | Do 2FA first |
| 5009, 5036 | Merchant address1 / shop address invalid |
| 1713 | Daily KYC success |
| **1714** | **KYC Fail — the guide itself (p13) calls this generic** |

---

## 3. AePS — current state (18 July 2026)

Flow: Onboard → Activate → eKYC (Send OTP → Verify OTP → Biometric) → **Daily KYC each day** → Transact.

| Agent | user_code | State |
|---|---|---|
| Ramya H R | 38520003 | activated |
| Natesha H C | 38520005 | onboarded, activated, eKYC done — **daily 2FA failing** |
| Syed | 38520001 / 38520002 | duplicate codes, need an Eko reset |

### OPEN BLOCKER — daily 2FA returns 1714
`PUT /v3/user/collection/aeps-fingpay/kyc/biometric/daily` returns
`{response_status_id: 1, status: 1714, message: "KYC Fail", reason: "Transaction Not Completed"}`.

Verified: our request matches the guide's Section 5.4 **field for field**. Section 5.3 (eKYC)
succeeded for the same agent at 05:16 UTC on 18 Jul with the same device, fingerprint, Aadhaar
and bank_code (`HDFC`). Since then 5.4 fails, and a repeat of 5.3 also fails.

**Two hypotheses were tested and both failed — do not retry them blindly:**
1. Removing the WADH from agent-side captures. No change. Reverted.
2. Suspecting `bank_code` on the daily call. Guide confirms it is required. Unresolved.

**Blocked on Eko.** They must check server logs for user_code 38520005 and say which validation
returns 1714. Diagnostic document: `eko-daily-2fa-1714.md` in the repo root.

Workaround shipped: "Authentication failing? Re-run full eKYC" button on the daily gate —
`kyc_biometric` also stamps `last_daily_kyc_at`. Currently also failing.

### Other AePS notes
- E-value float must be topped up in the Eko portal or everything returns "Insufficient balance".
- There is **no documented API for our own E-value balance**. The admin card tries three guessed
  URLs and honestly reports "unavailable" if none answer. The cash-withdrawal response *does*
  return the agent balance as `data.balance` (distinct from `data.customer_balance`) — capture
  that once transactions run, it is the document-backed source.
- Geolocation is mandatory (`getLatLongStrict`), NPCI requirement.
- Aadhaar Pay was removed — not part of Eko's AePS product.

---

## 4. BBPS (Bharat Connect) — in progress

Endpoints (from https://eps.eko.in/docs): `bbps-activate-service`, `bbps-get-categories`,
`bbps-get-locations`, `bbps-get-operators`, `bbps-get-operator-parameters`, `bbps-fetch-bill`,
`bbps-pay-bill`, `bbps-transaction-status`, `bbps-operator-code-circle`.
Same auth scheme as AePS.

**Decisions:** bills are funded from the **retailer wallet** (debit before pay, auto-refund on
failure). Launch with Mobile Prepaid, Electricity, DTH, Gas, Broadband; expand after.

**Built (18 Jul 2026):**
- Migrations `bbps_core`, `bbps_wallet_and_commission`, `bbps_admin_rpcs`.
- Tables `bbps_transactions`, `bbps_commission_slabs`.
- RPCs: `bbps_my_transactions`, `bbps_debit_wallet`, `bbps_refund_wallet`,
  `settle_bbps_commission`, `admin_list_bbps`, `admin_resolve_bbps`, `is_bbps_staff`.
  The three money-moving ones are **revoked from `authenticated`** — service role only.
- Edge function **`bbps`** (separate from `aeps`, deliberately — smaller blast radius).
  Actions: config, activate, categories, operators, operator_params, fetch_bill, pay_bill, status.
- Retailer screen `src/routes/bbps.tsx` (replaced the old mock-data version).
- Admin panel `src/components/admin/bbps-admin.tsx`, nav item **Finance → Bill Payments**.

**Money flow — important:** wallet is debited *before* calling Eko. Failure → automatic refund.
**Timeout → money stays held**, row goes to `pending_reconciliation`, and an admin must check the
biller's portal and click Paid or Refund. Never auto-refund a timeout — the biller may have been
paid.

**Real endpoints — from Eko's OpenAPI spec `https://eps.eko.in/openapi.json`, not guessed.**
Base differs from AePS: **`https://api.eko.in/ekoicici/v3`** (no `:25002` port);
sandbox `https://staging.eko.in/ekoapi/v3`. Override with `EKO_BBPS_BASE_URL`.

| Purpose | Method + path |
|---|---|
| Categories | `GET /customer/payment/bbps/categories` |
| Operators | `GET /customer/payment/bbps/operators` (query `category`, `location`) |
| Operator params | `GET /customer/payment/bbps/operator/{operator_id}/parameters` |
| Fetch bill | `GET /customer/payment/bbps/bill` |
| Pay bill | `POST /customer/payment/bbps` (JSON body) |
| Operator by mobile | `GET /customer/payment/bbps/recharge/{customer_mobile}/operator` |

Required fields on fetch **and** pay: `initiator_id`, `utility_acc_no`,
`confirmation_mobile_no`, `sender_name`, `operator_id`, `source_ip`, `latlong`
(+ `amount` and `client_ref_id` on pay). `billfetchresponse` from the fetch step
should be echoed back on pay. **There is no `user_code` in BBPS** — unlike AePS.

`source_ip` is taken server-side from `x-forwarded-for`; `latlong` comes from the browser with the
agent's stored shop location as fallback. `sender_name` is the retailer's display name.

**Lesson:** my first cut of this function invented plausible paths (`/billpayments/...`) and every
one was wrong. The OpenAPI spec and the Postman collection at
`https://eps.eko.in/agent/eps.postman_collection.json` are machine-readable — fetch those first
instead of guessing from a docs index.

---

## 5. Lessons

- **Do not guess at partner API semantics.** Two guesses on the 1714 error cost days and fixed
  nothing. When the partner's own docs don't cover it, ask them for logs rather than iterating.
- **Never deploy an edge function with placeholder content.** Doing so took the AePS function down
  for ~2 minutes. Always deploy full file content; keep a working copy of the source.
- `.catch()` chained on a Supabase query builder inside `Promise.all` throws — builders are
  thenables without `.catch`. This silently killed a loader and hid the whole AePS wallet UI.
  Use independent sequential `try/catch` blocks.
- When a UI element "doesn't appear", check the **parent's** render condition before blaming cache.
- Two chat widgets were mounted globally and stacked in the same corner; the portal Live Chat is
  now limited to signed-in portal pages, public pages keep their own Chatbot.

---

## 6. Handling personal data

PAN and Aadhaar are handled only for the specific onboarding that requires them. The admin Users
tab masks both by default behind an explicit reveal toggle. Never put keys or full Aadhaar numbers
into chat, documents shared externally, or this file — Supabase secrets only.

---

## 7. Storage — URGENT finding (18 Jul 2026)

Supabase free tier exceeded: **4.56 GB used of 1 GB**. Grace period ends **21 Jul 2026**, after
which requests return HTTP 402 and the portal stops working.

The **database is only 46 MB (9%)** — this is entirely a file-storage problem.

| Bucket | Files | Size |
|---|---|---|
| **retailer-kyc** | 2,049 | **4,533 MB** |
| gallery | 16 | 32 MB |
| service-logos | 82 | 15 MB |
| everything else | ~95 | < 20 MB |

`retailer-kyc` averages **2.2 MB per file** (largest 50 MB) — raw phone-camera photos of PAN,
Aadhaar and shop fronts uploaded at full resolution. A legible KYC photo needs ~150–250 KB, so the
same 2,049 files would be ~400 MB compressed, back inside the free tier.

**Fix, in order:**
1. Upgrade to Pro ($25/mo, 100 GB) to remove the deadline — do not compress under outage pressure.
2. Compress client-side before upload: resize to ~1600px, JPEG quality 80. Stops the bleeding.
3. One-off batch job to re-compress the existing 2,049 files.

Cloudflare R2 (~$0.015/GB, no egress fees) is only worth it at much larger scale — at 400 MB
compressed you are inside Supabase's free allowance anyway.

**Lesson:** no size limit or compression was ever applied to KYC uploads. Any new upload path
should cap file size and compress images before they reach Storage.

---

## 8. AePS daily KYC (1714) — TWO STAGED FIXES, not yet deployed (20 Jul 2026)

Both come from Eko's **live** docs (https://eps.eko.in/docs/aeps-daily-auth) and a direct request
from Eko support. Neither is a guess. Deploy these together, then retest agent 38520005.

### Fix 1 — send `client_ref_id` (Eko explicitly asked for this)
Eko support: *"We need client_ref_id (unique transaction reference of your system). This will help
identify the request being made with what payload."*

We currently send **no** client_ref_id on `kyc_daily`, so Eko cannot locate our calls in their logs
— which is why every support round trip has stalled. Add a unique id per call, store it on
`aeps_agents` (or a new `aeps_kyc_log` table) so it can be quoted to Eko afterwards:

```ts
const clientRefId = `BHOKYC${Date.now()}${Math.floor(Math.random()*900+100)}`;
// include client_ref_id: clientRefId in the daily KYC payload, and persist it
```

### Fix 2 — send the body as JSON, not form-encoded
Eko's live Daily KYC reference specifies `content-type: application/json` and shows a JSON example
body. The older AePS Partner API **PDF** showed `--data-urlencode` (form), which is what the current
code follows via `ekoForm`. Their docs list *"Invalid biometric data — check the wadh value in the
PID block"* as a 1714 cause; a form-encoded body parsed as JSON would mangle the PID XML and present
exactly that way.

Change in `supabase/functions/aeps/index.ts`, action `kyc_daily`:
`ekoForm(...)` → **`ekoJson(...)`** (same URL, same fields).
A patched copy is staged at `outputs/aeps_index.ts` with this change already applied.

### Documented 1714 causes (from their live docs — worth knowing)
1. KYC failed — no reason returned
2. **Invalid biometric data — check the `wadh` value in the PID block**
3. Bank eKYC pending — re-run Send OTP → Verify OTP → Biometric

Our `data.reason` is "Transaction Not Completed" (not the bank-eKYC message), and eKYC is confirmed
complete by their own 461 response — so **cause 2 is the live candidate**.

### Deploy note
The AePS edge function must be uploaded in full; a partial/placeholder upload took it down for
~2 minutes on 18 Jul. Deploy the complete file, then verify with one daily-auth attempt and read the
`aeps` response in DevTools.
