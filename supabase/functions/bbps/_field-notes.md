# BBPS — what each service actually asks for

Captured from Eko's **live production** API on 2 August 2026, not from their
OpenAPI spec. The spec is wrong in two ways that matter:

1. It documents responses as `data.categories[]`. Production returns
   `param_attributes.list_elements[]` with entirely different field names.
2. It does not mention `billFetchResponse`, `fetchBill`, the per-field `regex`
   or the per-field `error_message` — all of which production sends and all of
   which the form needs.

Everything below was read from the live API, one category at a time.

## The three fields that are always there

| Field | Where it comes from |
|---|---|
| **Operator** | Chosen from the list for that category |
| **Customer's mobile number** | Typed by the retailer — Eko sends the confirmation here |
| **Amount** | Fetched from the biller, or typed for prepaid |

Everything else is per-biller and comes from Eko's `operator/{id}/parameters`
call. The label, the validation pattern and the error wording are all Eko's, so
the customer is told what the biller wants rather than what we guessed.

## Every category, as live today

| Category | Billers | Bill fetch | What the retailer types |
|---|---|---|---|
| Mobile Prepaid | 7 | no | Mobile Number (10 digits) |
| Mobile Postpaid | 7 | yes | Mobile Number (10 digits) |
| DTH | 5 | no | Customer Id (10 digits) |
| Electricity | 91 | yes | Consumer ID (11 digits) |
| Gas | 29 | yes | Customer ID (10 digits) |
| Broadband Postpaid | 98 | yes | Account Number / User Name (3–50 chars) |
| Landline Postpaid | 5 | yes | Landline Number with STD code (11 digits) |
| Water | 55 | yes | Connection ID (8–10 chars) |
| Cable TV | 4 | yes | Account / VC / MAC / VSC / RMN |
| LPG Cylinder | 3 | yes | Consumer Number **+ Distributor ID (dropdown)** |
| FASTag | 21 | yes | Vehicle Registration Number |
| Credit Card | 29 | yes | Registered Mobile **+ last 4 digits of card** |
| Loan | 312 | yes | Loan No (6–12 chars) |
| Insurance | 40 | yes | Policy No **+ DOB + Mobile + Email** |
| Education | 1912 | yes | RegNo **+ DOB** |
| Municipal Taxes | 42 | yes | Property Account No **+ Property Type (list)** |
| Municipal Services | 5 | yes | Shop ID |
| Tax | 2 | yes | Tenement No (15 chars) |
| Housing Society | 115 | yes | Unit No |
| Hospital | 6 | yes | Registered Mobile Number |
| Rental Payment | 5 | yes | Customer Id |
| Subscription | 19 | no | Name + Address 1 + Address 2 **+ Scheme (list)** |
| eChallan | 6 | no | *(no parameters returned)* |
| Agent Collection | 4 | no | *(no parameters returned)* |
| Clubs and Associations | 0 | — | no billers live |
| Fleet Card Recharge | 0 | — | no billers live |
| EV Recharge | 0 | — | no billers live |

## The Eko parameter names behind the labels

Multi-field billers do not send everything under `utility_acc_no`. Each extra
field carries its own name and all of them must be forwarded:

| Label | Eko parameter |
|---|---|
| The main account/consumer number | `utility_acc_no` |
| Registered Mobile Number (Credit Card) | `mobile_number` |
| Date of Birth (Insurance) | `birth_date` |
| Email Id (Insurance) | `email` |
| Mobile Number (Insurance) | `confirmation_mobile_no` |
| Distributor ID (LPG), Property Type, Scheme | `plan_name` |

## The bill enquiry uses a different parameter name

Eko's spec documents the bill enquiry as taking `operator_id`. Production
validates `phone_operator_code` and rejects the request without it, with the
generic message **"Please provide the value of the field"** and HTTP 200. The
field it is actually complaining about is named in `invalid_params`, which is
easy to miss because `message` never says it. Both names are now sent.

That single unread field cost an afternoon. The gateway now appends the named
field to any error, so the next one reads
`Please provide the value of the field (phone_operator_code)`.

## Bill fetch is not enabled on this account

Proven on 2 Aug 2026 against a **live, unpaid BESCOM bill** (account 6087911883,
issued 13 Jul, due 27 Jul, Rs 3,361) that PhonePe fetches successfully over
Bharat Connect at the same moment. Through Eko the same account returns:

    status 1468 — "Unable to fetch bill"

Ruled out first: the parameter names, `user_code`, `client_ref_id`,
`hc_channel`, the agent's latlong, the account number format, and the
possibility that the bill was already paid.

Eko's own operator list agrees: `billFetchResponse` is **0 on all 2,416
billers**, in every category. That is not a per-biller quirk, it is the
account's entitlement. Confusingly the operator *parameters* endpoint returns
`fetchBill: 1` for the same biller — the operator list is the one that matches
reality, so that is what the form trusts.

**What still works:** the retailer reads the amount off the customer's bill and
pays it directly. That is the whole flow minus the convenience of auto-fetch.

**To fix:** ask Eko to enable Bill Fetch / Bill Avenue on the merchant account.
When they do, `billFetchResponse` turns to 1 and the Fetch bill button appears
by itself, with no code change.

## Known problems on Eko's side

- **Education DOB pattern is over-escaped.** Eko sends
  `^([0-2][0-9]|(3)[0-1])(\\-)...`, which as a regular expression requires a
  literal backslash before each dash. A real date can never match it. The form
  therefore treats a pattern that rejects its own example as advisory rather
  than blocking, instead of making the field impossible to fill.
- **Three categories have no billers** (Clubs and Associations, Fleet Card
  Recharge, EV Recharge). They are hidden rather than shown as empty.
- **eChallan and Agent Collection return no parameters at all.** They need the
  account number only, so the form falls back to a single field.
