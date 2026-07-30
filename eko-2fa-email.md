# Email to Eko — AePS Daily KYC (2FA) failing with 1714

**Subject:** AePS Daily KYC returning 1714 "KYC Fail" — agent 38520005 (initiator 9611151671)

---

Hi Team,

As requested, here is the Postman request and the exact response for the Daily KYC (2FA) failure.

**Account details**

- Initiator ID: 9611151671
- Agent user_code: 38520005 (Natesha H C)
- Environment: Production — https://api.eko.in:25002/ekoicici/v3
- Date observed: 18 July 2026

---

## 1. Request (Postman / cURL)

```
curl --location --request PUT \
'https://api.eko.in:25002/ekoicici/v3/user/collection/aeps-fingpay/kyc/biometric/daily' \
--header 'developer_key: <our developer key>' \
--header 'secret-key: <base64(HMAC-SHA256(message = timestamp, key = base64(auth_key)))>' \
--header 'secret-key-timestamp: <epoch milliseconds>' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--data-urlencode 'initiator_id=9611151671' \
--data-urlencode 'user_code=38520005' \
--data-urlencode 'aadhar=<RSA PKCS#1 v1.5 encrypted, base64 — plain value ends 8377>' \
--data-urlencode 'customer_id=9611156458' \
--data-urlencode 'latlong=13.010451,76.108328' \
--data-urlencode 'piddata=<PidData XML from Mantra MFS110 RD service>' \
--data-urlencode 'bank_code=HDFC'
```

The PID block is captured with `fType="2"`, `format="0"`, `pidVer="2.0"`, `env="P"` and
`wadh="E0jzJ/P8UopUHAieZn8CKqS4WPMi5ZSYXgfnlfkWjrc="` (the value given in Section 5.3 of your
integration guide). The RD service returns `errCode="0"` with a capture quality of 50–70, and the
call is made within seconds of capture.

## 2. Response

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

## 3. What works and what does not

| Step | Endpoint | Result |
|---|---|---|
| Onboard agent | POST /v3/users/network/eps-agent | Success |
| Activate AePS | PUT /v3/admin/network/agent/38520005/aeps-fingpay/activate | Success (confirmed by your team) |
| eKYC — Send OTP | POST /v3/user/collection/aeps-fingpay/kyc/otp | Success |
| eKYC — Verify OTP | PUT /v3/user/collection/aeps-fingpay/kyc/otp/verify | Success |
| eKYC — Biometric (5.3) | PUT /v3/user/collection/aeps-fingpay/kyc/biometric | **Success at 05:16 UTC, 18 Jul 2026** |
| **Daily KYC (5.4)** | PUT /v3/user/collection/aeps-fingpay/kyc/biometric/daily | **Fails — 1714** |

The same credentials, signing method, RSA encryption, biometric device, fingerprint and
`bank_code` are used across all of the above. Only the Daily KYC call fails. A repeat of the
Section 5.3 eKYC call now also returns 1714, having succeeded earlier the same day.

We have made no code changes between the successful and failing calls.

## 4. What we need

Your integration guide (page 13) documents 1714 as a **generic** KYC failure, and the response body
returns only "Transaction Not Completed", which does not identify the failed validation.

1. Please check your server logs for user_code **38520005** on **18 July 2026** and tell us which
   specific validation returns 1714.
2. Did anything change on this account after the successful eKYC at 05:16 UTC on 18 July 2026?
3. Is `bank_code` validated differently on the Daily KYC call than on the first-time eKYC call —
   should it be the agent's settlement bank rather than the bank used at eKYC?

We have followed Section 5.4 exactly. Without the log detail behind the generic code we cannot
narrow this further from our side.

Thanks,
BharatOne Technical Team
