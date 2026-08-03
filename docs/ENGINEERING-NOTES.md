# BharatOne — Engineering Notes

Running memory of hard-won facts, decisions and gotchas. **Read this before touching AePS or BBPS.**
Update it whenever something non-obvious is learned, especially anything that cost time to discover.

Last updated: 21 July 2026

For AePS, sections 3 and 8 are superseded in part by **section 9**, which is the current state.

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

## 8. AePS daily KYC (1714) — both staged fixes now resolved (20 Jul 2026, closed 21 Jul)

> **Status as of 21 Jul 2026: this section is history, not a to-do list.** Both fixes below have
> been actioned and one of them was *reverted*. Do not re-apply Fix 1. See section 9.

Both came from Eko's **live** docs (https://eps.eko.in/docs/aeps-daily-auth) and a direct request
from Eko support.

### Fix 1 — send `client_ref_id` — **APPLIED, THEN REVERTED. Do not re-add.**
Eko support asked for it: *"We need client_ref_id (unique transaction reference of your system).
This will help identify the request being made with what payload."*

We added it. It made things worse. With `client_ref_id` in the body, agent 38520005 began returning
`{"message":"No key for Response"}` — an undocumented shape with no status field at all — instead of
a well-formed `1714`. Eko's live spec lists exactly seven body parameters for this endpoint and
`client_ref_id` is not one of them; sending an eighth appears to break their payload matching.

Current behaviour (`supabase/functions/aeps-2fa/index.ts`): we **generate and log** the reference
locally to `aeps_kyc_attempts` so it can be quoted to Eko support, and we **do not send it** in the
request body. This is deliberate. The five `client_ref_id` values quoted in the escalation were
captured this way.

### Fix 2 — send the body as JSON, not form-encoded — **APPLIED AND LIVE**
Eko's live Daily KYC reference specifies `content-type: application/json`. The older AePS Partner
API **PDF** showed `--data-urlencode`, which the original code followed via `ekoForm`.

Done. `supabase/functions/aeps/index.ts` action `kyc_daily` now calls `ekoJson(...)`
(see line ~426), and the dedicated `aeps-2fa` function sends JSON throughout.
**It did not fix 1714.**

### Documented 1714 causes (from their live docs — worth knowing)
1. KYC failed — no reason returned
2. **Invalid biometric data — check the `wadh` value in the PID block**
3. Bank eKYC pending — re-run Send OTP → Verify OTP → Biometric

Cause 2 was our working hypothesis. It has since been effectively ruled out from our side: the
`wadh` we send matches Eko's own reference capture page byte for byte, and UIDAI independently
confirmed the biometric authenticates (agent 38520004, 17 Jul 18:58:08 IST, ICICI-deployed device,
UIDAI response code `bf219d4b17d64d9b969be90d209cdcb4`).

### Deploy note
The AePS edge function must be uploaded in full; a partial/placeholder upload took it down for
~2 minutes on 18 Jul. Deploy the complete file, then verify with one daily-auth attempt and read the
`aeps` response in DevTools.

---

## 9. AePS 2FA — where it actually stands (21 Jul 2026)

Daily KYC has **never succeeded once**, for any agent, across ~12 attempts. Every adjacent endpoint
works. The blocker is now escalated to Eko and we are waiting on them — see
`eko-daily-kyc-escalation.md` in the repo root for the full technical write-up sent to their team.

### What we fixed on our side since 18 Jul

**`b9913ff` — rebuilt the one-time eKYC chain to Eko's EPS spec.** The original implementation was
materially incomplete, which is the most plausible reason daily KYC never had a valid session to
build on:

- Verify OTP was missing `customer_id`, encrypted `aadhar`, `reference_tid` and `latlong` — all
  required by the spec.
- Biometric eKYC was missing `customer_id`, `bank_code`, `otp_ref_id` and `reference_tid`, so the
  fingerprint was never bound to the OTP session.
- The `otp_ref_id` and `reference_tid` returned by each step were never captured or carried forward.
  They are now persisted on `aeps_agents` as `kyc_otp_ref` / `kyc_ref_tid`.
- Endpoints were `/user/aeps-fingpay/kyc/*` form-encoded; the spec is
  `/user/collection/aeps-fingpay/kyc/*` with `application/json`.

**`e478e81` — eKYC completion no longer counts as the day's 2FA.** We were setting
`last_daily_kyc_at` on eKYC success, so the UI believed 2FA was done and sent the agent straight to
a transaction — which Fingpay then rejected with `1467` "Please do 2fa before initiating
transaction". Daily biometric KYC is a **separate mandatory step**. We now leave
`last_daily_kyc_at` untouched on eKYC so the UI walks the agent through Daily KYC first.

### Deployed versions (verified 21 Jul)

| Function | Version | Deployed | Matches |
|---|---|---|---|
| `aeps` | v44 | 21 Jul 05:27 UTC | `e478e81` |
| `aeps-2fa` | v2 | 20 Jul 11:20 UTC | `b9913ff` — content verified identical |

Note the `aeps-2fa` deploy timestamp *precedes* its commit timestamp: it was deployed for testing on
20 Jul and committed on 21 Jul. The deployed source is byte-identical to the committed file. This is
not a stale deploy — check content, not timestamps, before redeploying.

### Why this is now Eko's to answer

The same single capture routine — identical `PidOptions`, device and `wadh` — produces a PID block
their **Biometric eKYC** endpoint accepts and their **Daily KYC** endpoint rejects. For agent
38520006 the two calls were 90 minutes apart on the same day, same device, same operator: eKYC
succeeded, daily KYC failed.

Three agents returned three *different* reasons to identical client behaviour within eight minutes
on 20 Jul (`Transaction Not Completed` / `Authentication Failed. Invalid Biometric data.` /
`Please complete bank eKYC to process the transaction.`), which points at per-agent state on their
side rather than a client defect. Note that `Transaction Not Completed`, `No key for Response` and
`1467` appear **nowhere** in Eko's documentation, and `346` — returned by 38520004 — is documented
on their own Send OTP page as "AePS Fingpay service not activated for this agent", despite their
team confirming activation verbally.

### Open asks with Eko

Server logs for the five quoted `client_ref_id` values; raw `GET /user/account/services` for all
three agents showing service_code `43` status; confirmation that Daily KYC is enabled on initiator
`9611151671`; an explanation of the eKYC/Daily-KYC contradiction; the full `response_type_id` table;
and confirmation of whether a non-zero E-value balance is required (our balance is ₹0 and their docs
do not list it as a prerequisite for a non-financial call).

**Lesson:** when a partner's support team asks for an undocumented parameter, add it behind a flag
and be ready to pull it. Fix 1 above was requested by Eko support directly and still broke the
endpoint worse than before.

## 10. E-Store — four defects, two of which had already cost something (3 Aug 2026)

The E-Store looked more finished than it was. The catalogue, cart, checkout,
admin console and GST invoices were all real and all working. What was missing
was everything that happens when something goes slightly wrong, and that is
where the money was.

### Stock was reserved and never released

`estore_place_order` deducted stock the moment the order row was written. That
part is right — it is what stops two retailers buying the last unit at the same
moment. What was missing was an expiry. Nothing ever gave the stock back unless
an administrator explicitly cancelled the order, and nobody ever did.

The evidence was unambiguous because the stock ledger was unbroken: it started
at 20 and stepped down to 3 across thirteen `order` movements with no manual
adjustment anywhere in it. One of those orders was paid. The other twelve had
quietly eaten **16 units** over three weeks. The product looked nearly sold out
and one more order would have hit `OUT_OF_STOCK` on a shelf with nineteen
cookers on it.

Reservations now carry a 45-minute `reserved_until`. `estore_expire_reservations`
runs every five minutes and releases anything past it. The 16 units are back.

Forty-five minutes rather than fifteen: a retailer fetching a card from another
room, or switching to a UPI app and waiting for a bank OTP, routinely takes
longer than a quarter of an hour, and the webhook wins over the sweeper anyway.

### A paid order could vanish

Confirmation depended entirely on the retailer's own browser calling back after
Razorpay's popup closed. A closed tab, a locked phone, a dropped mobile
connection in the two seconds between the bank confirming and the callback
firing — and the money left their account with nothing on our side to show for
it. The order sat at "awaiting payment" until its reservation lapsed.

`estore-webhook` is the missing server-to-server callback. Both it and the
browser path now go through `estore_confirm_payment`, which is idempotent, so
whichever arrives second changes nothing.

Two details that matter:

- The signature is checked over the **raw bytes** of the body. Parsing the JSON
  and re-serialising it changes key order and whitespace, and every signature
  fails.
- The comparison is constant-time. A short-circuiting `===` leaks the expected
  signature one byte at a time to anyone willing to measure.

The function is deployed with `verify_jwt` off, because Razorpay has no Supabase
token. That makes the signature check the only thing between the open internet
and "this order is paid", which is why it happens before anything in the payload
is read, and why a missing `RAZORPAY_WEBHOOK_SECRET` returns 503 rather than
falling through.

**Still to do by hand:** register the endpoint in the Razorpay dashboard
(Settings → Webhooks) for `payment.captured`, `order.paid` and `payment.failed`,
and set `RAZORPAY_WEBHOOK_SECRET` to the same value. Until then the webhook
correctly refuses every request.

### The charge did not match the invoice

`Math.round(Number(order.total))` — whole rupees — then multiplied by 100 in the
browser. An order of Rs 11.80 was charged Rs 12. Every order carrying GST was
off by up to fifty paise in a direction the customer could see on their card
statement. Now sent in paise, and the browser uses the server's `amount_paise`
rather than multiplying again.

### Only an administrator could cancel

A retailer who changed their mind had no way to say so, so the order and its
stock sat there until expiry. `estore_cancel_my_order` releases it immediately.

### The awkward case: payment after expiry

Rare but real, and it has to be decided rather than ignored. If the stock is
still there it is taken again and the order confirms normally. If it has since
been sold, the order is confirmed anyway, marked `needs_attention`, and an
administrator is notified — taking the money and shipping nothing is not
acceptable, and neither is overselling. Both branches are covered by the
rehearsal below.

### What was newly built

- **Store & Fulfilment portal** (`store_staff`, `/store-login`). Order queues,
  packing slips, stock receipt, low-stock alerting. Deliberately narrow: the
  RPCs behind it do not return margin or commission columns at all. A packing
  bench is not the place to learn what everyone in the chain earns.
- **Delivery agents.** The table and the "assign to agent" control had existed
  since the E-Store was built, but nothing could ever create an agent, so the
  table was empty and the control was a dead end.
- **Returns.** requested → approved → received → refunded. Stock goes back only
  at `received`, because approving a return is a promise and the goods may still
  be on a lorry.

Returns and agents are single components used by both the Store portal and the
administrator's E-Store tab. Two implementations would drift, and the one that
drifted would be the one that forgot to restock.

### How it was verified

A full rehearsal — place, pay by webhook, confirm again from the browser,
confirm, pack, refuse to dispatch without a tracking number, dispatch, deliver,
settle, request a return, over-claim, approve, receive, refund — run inside a
single transaction that raises at the end so the whole thing rolls back. Nothing
persisted; the trace came back as the exception message. A second block covered
retailer cancellation, double cancellation, the sweeper, and both branches of
late payment. Every assertion held, including the three that were meant to fail:
shipping without tracking, cancelling from the store portal, and returning more
units than were bought.

## 11. Money transfer, and the BBPS blockage that is not a bug (3 Aug 2026)

### The /money-transfer page was lying

It rendered three invented beneficiaries (Suresh Kumar, Anitha R., Mohan Lal,
with made-up account numbers), stat cards reading "Today's Transfers ₹20,700"
that were typed-in literals, and a Send button whose entire implementation was:

    onSubmit={(e) => { e.preventDefault(); toast.success(`${mode} transfer initiated`); }}

No API call. No database write. A retailer could have filled in a customer's
beneficiary details, pressed Send, read "IMPS transfer initiated" and told the
customer their money was on its way. It was linked from the services catalogue.
It is gone.

### What the rail actually is

Eko's DMT is the **Fino** rail at `/customer/payment/dmt-fino`, and reading their
OpenAPI specification corrected two assumptions that had already been coded:

**There is no IMPS / NEFT / RTGS choice.** Initiate Transfer takes
`initiator_id`, `recipient_id`, `amount`, `customer_id`, `otp`, `otp_ref_id` and
`client_ref_id`. That is the whole payload. The rail decides how the money goes.
The old mock's three-way toggle was decoration, and the commission slabs had to
lose their per-mode split as a result.

**A transfer spans two calls with a human in the middle.** Eko sends a one-time
password to the sender's phone (`POST /dmt-fino/otp`), and the transfer is only
submitted once the customer reads it back. So a transfer exists in the gap
between those calls. It lives at `awaiting_otp`, and — the important part — the
wallet is debited at the SECOND call, not the first. An OTP nobody reads back
costs nobody anything and is tidied up after fifteen minutes.

### The commercials were wrong in three ways

From Eko's published rate card:

- **The cap is ₹5,000 per transfer, not ₹25,000.** I had carried the RBI monthly
  per-sender limit across to the per-transaction limit. They are different
  numbers: ₹5,000 a transfer, ₹25,000 a month.
- **The customer fee is fixed by Eko** at 1% with a ₹10 minimum. Not ours to set.
- **Our commission is not a share of that fee.** Eko pays a fixed rupee amount
  per amount slab — ₹2.87 on a transfer up to ₹1,000, ₹36.77 on one of
  ₹4,501–5,000 — bearing no arithmetic relation to the 1% the customer paid.
  Modelling commission as a percentage of the fee would have paid retailers the
  wrong amount on every single transfer. `provider_commission` now holds Eko's
  figure and the shares are percentages of that.
- **Registering a sender costs ₹11 + GST**, once. Nothing was collecting it, so
  BharatOne would have absorbed it silently on every new customer. Now charged
  the same way the AePS daily biometric charge already is, and deliberately
  non-fatal: the customer is verified at the bank whether or not we managed to
  collect, and leaving the two out of step would be worse.

### BBPS: the blockage is real and it is not ours

Three real payments on 2 August, all to BESCOM consumer 6087911883, all rejected:

    status 208 — "utility.payment.failed  Amount entered does not match with
                  bill amount. Please try again"

The biller validates the amount against the bill on its own side. With Bill Fetch
unprovisioned the retailer cannot know that figure, so **BBPS is effectively
non-functional for electricity** — the highest-volume category. The earlier
assumption that a retailer could simply read the amount off the paper bill and
pay it was wrong for any biller that validates.

Two things were fixable without Eko, and are done: the form warns before payment
that many billers accept only the exact figure, and the rejection now says so
plainly instead of repeating Eko's "please try again", which is the one thing
that cannot work.

### The AePS failure rate is not a platform problem

56 of 70 AePS transactions failed, which looked alarming until the stored
responses were read:

| Eko status | Comment | Count |
|---|---|---|
| 1528 | "Biometrics Did not Match at UIDAI" | 33 |
| 1467 | "Customer Aadhaar number is not linked with Selected Bank" | 14 |
| 1464 | "Your transaction limit has been exhausted for selected Bank" | 5 |
| −1 | HTTP 404 "No Mapping Rule matched" | 4 |

Only the last four were ours — posting to the generic `aeps-fingpay` URL instead
of the per-operation path — and that was fixed on 21 July. The rest are
fingerprint quality, wrong bank selection and issuing-bank limits. The 1528 rate
is worth acting on, but with devices and agent training, not code.

### Two other things found while in here

- **The BBPS distributor was never paid.** `bbps_commission_slabs` has carried a
  `distributor_share` column since the table was created and
  `settle_bbps_commission` never read it. Any share configured would have been
  silently kept by the company. Fixed.
- **The deployed `bbps` edge function existed only on Supabase.** Neither its
  source nor its three migrations were in git, so a redeploy from a clean
  checkout would have lost BBPS entirely. Recovered to
  `supabase/functions/bbps/index.ts`.

### Commission rates are seeded but switched OFF

22 BBPS slabs and 17 DMT slabs, filled in from Eko's published card. The
commission figures are Eko's and are right. The **70% retailer share is not** —
it was copied from the AePS split already in `app_settings` as a starting point.
Nobody should start paying commission on a number chosen by whoever happened to
be writing the migration, so every slab is inactive and the admin screens say so
in as many words. Until they are switched on, bills and transfers still earn the
retailer nothing.
