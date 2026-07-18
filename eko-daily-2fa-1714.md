# Daily KYC (Section 5.4) returning 1714 "KYC Fail" — agent 38520005

**Initiator ID:** 9611151671 · **Agent user_code:** 38520005 · **Environment:** Production
**Reference:** AePS Partner API Integration Guide v3, Section 5.4 (page 12)

We have implemented Section 5.4 exactly as documented. Section 5.3 (first-time Biometric eKYC)
**succeeds** for this agent using the same device, fingerprint, Aadhaar and bank_code.
Section 5.4 fails every time.

## Compliance with Section 5.4

| Guide requirement (5.4) | What we send | Match |
|---|---|---|
| `PUT /user/collection/aeps-fingpay/kyc/biometric/daily` | Same | Yes |
| `Content-Type: application/x-www-form-urlencoded` | Same | Yes |
| `initiator_id` | `9611151671` | Yes |
| `user_code` | `38520005` | Yes |
| `aadhar` — RSA-encrypted (Appendix A) | RSA PKCS#1 v1.5, base64. Plain value ends `8377` | Yes |
| `customer_id` | `9611156458` | Yes |
| `latlong` | `13.010451,76.108328` | Yes |
| `piddata` — PID block from RD service | Full `<PidData>` XML, Mantra MFS110, captured seconds before the call | Yes |
| `bank_code` — from Get Bank List | `HDFC` (same code used in the successful 5.3 call) | Yes |
| WADH per the Section 5.3 note | `E0jzJ/P8UopUHAieZn8CKqS4WPMi5ZSYXgfnlfkWjrc=` | Yes |

Headers are signed identically to our onboarding, activation and eKYC calls, all of which succeed:
`developer_key`, `secret-key` = base64(HMAC-SHA256(message = timestamp, key = base64(auth_key))),
`secret-key-timestamp` = epoch milliseconds.

## Request

```
PUT https://api.eko.in:25002/ekoicici/v3/user/collection/aeps-fingpay/kyc/biometric/daily

Headers:
  developer_key:        <developer key>
  secret-key:           <HMAC signature>
  secret-key-timestamp: <epoch ms>
  Content-Type:         application/x-www-form-urlencoded

Body (urlencoded):
  initiator_id = 9611151671
  user_code    = 38520005
  aadhar       = <RSA PKCS#1 v1.5, base64>
  customer_id  = 9611156458
  latlong      = 13.010451,76.108328
  piddata      = <PidData ...> ... </PidData>
  bank_code    = HDFC
```

## Response

```json
{
  "response_status_id": 1,
  "data": {
    "reason": "Transaction Not Completed",
    "comment": "Transaction Not Completed"
  },
  "response_type_id": 1714,
  "message": "KYC Fail",
  "status": 1714
}
```

## Why we cannot resolve this from the guide

- Page 12 documents the "OTP steps skipped" failure as **461 — "Merchant is Inactive or Invalid
  Details"**. We are not receiving 461.
- Page 13 labels **1714** as *"Error — KYC Fail (generic)"*. The guide itself describes this code as
  generic and does not list the conditions that produce it.
- The response body returns only "Transaction Not Completed", which names no failed validation.

Section 5.3 succeeded for this agent at 05:16 UTC on 18 July 2026 with the same credentials, device
and bank_code. Section 5.4 has failed on every attempt since, and a repeat of 5.3 now also fails.
Nothing changed in our code between the successful and failing calls.

## What we need from Eko

1. Please check your server logs for `user_code 38520005` on 18 July 2026 and tell us **which
   specific validation returns 1714**. Only your side can see this.
2. Did anything change on this account after the successful eKYC at 05:16 UTC on 18 July 2026?
3. Is `bank_code` validated differently on 5.4 than on 5.3? Must it match the agent's settlement
   bank rather than the bank used at eKYC?

We have followed the document. Pointing us back to it cannot resolve a code the document itself
defines as generic — we need the log detail behind it.
