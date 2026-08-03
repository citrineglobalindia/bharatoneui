# BharatOne → Eko EPS · service enablement request

**Merchant:** BHARATONE SERVICES AND AFFILIATES PRIVATE LIMITED
**Initiator ID:** 9611151671
**Environment:** production — `https://api.eko.in/ekoicici/v3` (BBPS), `https://api.eko.in:25002/ekoicici/v3` (AePS)
**Agent user codes referenced:** 38520005, 38520006, 38520007
**Prepared:** 3 August 2026

Three requests below. Each one carries the exact endpoint, the parameters we
send, and your own response. Nothing here is a guess — every response quoted was
captured from production.

> Authentication headers are omitted throughout. We send `developer_key`,
> `x-developer-key`, `secret-key` (base64 HMAC-SHA256 of the timestamp, keyed on
> base64 of the auth key) and `secret-key-timestamp` on every call, and they are
> accepted — every request below returned HTTP 200 from your gateway.

---

## 1. Please enable **Bill Fetch / Bill Avenue** on this account

This is the one that is stopping live business today.

### 1a. The enquiry itself

**Request**

```
GET https://api.eko.in/ekoicici/v3/customer/payment/bbps/bill
      ?initiator_id=9611151671
      &utility_acc_no=6087911883
      &confirmation_mobile_no=<customer 10-digit mobile>
      &sender_name=<retailer display name>
      &phone_operator_code=56
      &operator_id=56
      &source_ip=<agent public IP>
      &latlong=12.9716,77.5946
```

Operator 56 = **Bangalore Electricity Supply Company (BESCOM)**.

**Response**

```json
{ "status": 1468, "message": "Unable to fetch bill", "response_status_id": 1 }
```

Tested on 2 August 2026 against a **live, unpaid BESCOM bill** — consumer number
6087911883, issued 13 July, due 27 July, ₹3,361. A consumer app fetched the same
bill successfully over Bharat Connect at the same moment, so the bill exists and
is fetchable at the biller.

Before contacting you we ruled out: the parameter names, `user_code`,
`client_ref_id`, `hc_channel`, the agent's latlong, and the consumer number
format.

### 1b. Your operator list says the same thing

**Request**

```
GET https://api.eko.in/ekoicici/v3/customer/payment/bbps/operators
      ?initiator_id=9611151671&category=<each category in turn>
```

**Finding:** `billFetchResponse` is **`0` on all 2,416 billers**, in every
category, without exception. That is not a per-biller quirk — it reads like the
entitlement is off at the account level.

Note a contradiction on your side that cost us time: the operator *parameters*
endpoint returns `fetchBill: 1` for the very same biller.

```
GET https://api.eko.in/ekoicici/v3/customer/payment/bbps/operator/56/parameters
      ?initiator_id=9611151671
→ param_attributes.fetchBill = 1
```

The operator list is the one that matches reality, so that is the flag our form
trusts. Please confirm which of the two is authoritative.

### 1c. Why this blocks payment entirely, not just convenience

We assumed a retailer could simply read the amount off the customer's paper bill
and pay it directly. For BESCOM that is not true — the biller validates the
amount server-side and rejects anything that is not the exact bill figure.

**Request**

```
POST https://api.eko.in/ekoicici/v3/customer/payment/bbps
Content-Type: application/json

{
  "initiator_id": "9611151671",
  "client_ref_id": "BBP1785693346115235",
  "utility_acc_no": "6087911883",
  "confirmation_mobile_no": "<customer mobile>",
  "sender_name": "<retailer display name>",
  "phone_operator_code": "56",
  "operator_id": "56",
  "amount": "20",
  "source_ip": "<agent public IP>",
  "latlong": "12.9716,77.5946"
}
```

**Response**

```json
{
  "data": { "tid": "3571860412", "last_used_okekey": "" },
  "status": 208,
  "message": "utility.payment.failed  Amount entered does not match with bill amount. Please try again",
  "response_type_id": 208,
  "response_status_id": 1
}
```

Three such attempts, all rejected identically:

| Time (UTC, 2 Aug 2026) | client_ref_id | tid | Amount | Result |
|---|---|---|---|---|
| 17:54:04 | BBP1785693244027227 | 3571860381 | ₹20 | status 208, refunded to the retailer |
| 17:55:39 | BBP1785693338814981 | 3571860409 | ₹20 | status 208, refunded to the retailer |
| 17:55:46 | BBP1785693346115235 | 3571860412 | ₹20 | status 208, refunded to the retailer |

So with fetch disabled, a biller that validates the amount cannot be paid at all
unless the retailer happens to type the figure to the paisa. **BBPS is
effectively non-functional on this account for electricity, which is the highest
volume category.**

**What we need:** Bill Fetch / Bill Avenue enabled on initiator 9611151671, and
confirmation of whether it is enabled per-account or per-category.

---

## 2. Please enable **Domestic Money Transfer** (the Fino rail)

The integration is finished and tested against your published specification. We
are not asking for documentation — we have built to it. We are asking for the
service to be switched on.

**What we have implemented**, all eight calls on
`https://api.eko.in/ekoicici/v3`:

| Step | Call |
|---|---|
| Sender profile | `GET /customer/payment/dmt-fino/sender/{customer_id}?initiator_id=&user_code=` |
| Onboard sender | `POST /customer/payment/dmt-fino/sender/{customer_id}` — `name`, `dob`, `residence_address` |
| Sender eKYC | `PUT /customer/payment/dmt-fino/sender/{customer_id}/otp` — `aadhar`, `piddata` |
| Validate eKYC OTP | `PUT /customer/payment/dmt-fino/sender/{customer_id}/otp/verify` — `otp`, `otp_ref_id`, `kyc_request_id` |
| Recipients | `GET /customer/payment/dmt-fino/sender/{customer_id}/recipients` |
| Add recipient | `POST /customer/payment/dmt-fino/sender/{customer_id}/recipient` — `recipient_mobile`, `recipient_name`, `ifsc`, `account` |
| Transaction OTP | `POST /customer/payment/dmt-fino/otp` — `recipient_id`, `amount`, `customer_id` |
| Initiate transfer | `POST /customer/payment/dmt-fino` — `recipient_id`, `amount`, `customer_id`, `otp`, `otp_ref_id`, `client_ref_id` |

We have also built to your published commercials: a **1% customer fee with a
₹10 minimum**, a **one-time ₹11 + GST sender registration charge**, a **₹5,000
per-transfer cap**, and your seventeen commission slabs from ₹2.87 up to ₹36.77.
The biometric eKYC uses the same RD-service devices our agents already use for
AePS.

**Please confirm and enable:**

1. **The DMT service on initiator 9611151671.**
2. **The per-agent activation code.** AePS Fund Settlement is service 39, called
   as `PUT /admin/network/agent/{user_code}/service/39/activate`. Please tell us
   the equivalent code for DMT, or confirm that no per-agent activation is
   required.
3. **Whether the ₹5,000 per-transfer cap and the ₹25,000 monthly per-sender cap
   are both enforced at your end**, so we can match our checks to yours rather
   than guess.
4. **Any onboarding, RBI or PPI compliance step** that has to be completed first.
   Send it and we will complete it straight away.

Until this is enabled, the money-transfer screen tells our retailers plainly that
the service is not yet available rather than taking a transfer that cannot go
anywhere.

---

## 3. **AePS Aadhaar Pay** — is it available on this account?

Your specification documents the `aeps-fingpay` endpoints as one path per
operation:

```
POST https://api.eko.in:25002/ekoicici/v3/customer/collection/aeps-fingpay/cash-withdrawl/{customer_mobile}
POST https://api.eko.in:25002/ekoicici/v3/customer/collection/aeps-fingpay/balance-enquiry/{customer_mobile}
POST https://api.eko.in:25002/ekoicici/v3/customer/collection/aeps-fingpay/mini-statement/{customer_mobile}
```

with body:

```json
{
  "initiator_id": "9611151671",
  "user_code": "38520005",
  "client_ref_id": "BHO...",
  "bank_code": "UBIN",
  "aadhar": "<RSA/PKCS#1 encrypted Aadhaar>",
  "latlong": "...",
  "piddata": "<PID block>",
  "amount": "1000"
}
```

All three work. **We can find no `aeps-fingpay` path for Aadhaar Pay** (service
type 5), so that option is not offered to our retailers. Please confirm whether
Aadhaar Pay is supported on this account and, if so, the endpoint.

---

## Not a support issue — recorded here so you know we have checked

We have 70 AePS transactions on this account, 56 of which failed. We looked at
every one and they are **customer-side or device-side, not gateway problems**.
No action needed from you.

| Your status | Your comment | Count | Our reading |
|---|---|---|---|
| 1528 | "Biometrics Did not Match at UIDAI. Please try again!" | 33 | Fingerprint capture quality |
| 1467 | "Customer Aadhaar number is not linked with Selected Bank" | 14 | Wrong bank chosen by the operator |
| 1464 | "Your transaction limit has been exhausted for selected Bank" | 5 | Issuing bank limit |
| — | HTTP 404 "No Mapping Rule matched" | 4 | **Our bug, already fixed.** We were posting to the generic `/customer/collection/aeps-fingpay` URL instead of the per-operation path. Last occurrence 21 July 2026. |

The 1528 rate is high enough that we are reviewing our fingerprint devices and
retraining agents. If you have guidance on RD-service versions or device models
that produce better UIDAI match rates on your stack, we would welcome it.

---

## Summary of what we are asking for

1. **Enable Bill Fetch / Bill Avenue** on initiator 9611151671 — currently
   blocking live BBPS transactions.
2. **Enable Domestic Money Transfer** and send the endpoint specification,
   service activation code and limits.
3. **Confirm whether AePS Aadhaar Pay is available**, and its endpoint if so.

Happy to get on a call. We can reproduce any of the above on request and can
supply full request and response logs for any `client_ref_id` listed.
