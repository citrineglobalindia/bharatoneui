# Eko — latest Daily KYC (2FA) request & response, agent 38520005

**Last attempt:** 20 July 2026, 10:26:35 UTC (15:56 IST) · **Result:** `KYC Fail` (1714)
**Initiator ID:** 9611151671 · **Agent user_code:** 38520005 (Natesha H C)
**Environment:** Production — `https://api.eko.in:25002/ekoicici/v3`

---

## 1. Postman / cURL request

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
--data-urlencode 'piddata=<PidData XML, Mantra MFS110, captured seconds before the call>' \
--data-urlencode 'bank_code=HDFC'
```

PID capture settings: `fType="2"`, `format="0"`, `pidVer="2.0"`, `env="P"`,
`wadh="E0jzJ/P8UopUHAieZn8CKqS4WPMi5ZSYXgfnlfkWjrc="` (the value from Section 5.3 of your guide).
RD service returns `errCode="0"`, capture quality 50–70.

## 2. Response — Daily KYC (5.4)

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

## 3. Response — first-time eKYC (5.3), same agent, same session

```json
{
  "response_status_id": 1,
  "data": {
    "last_used_okekey": "",
    "reason": "You have already completed Bank eKYC. Please do daily KYC."
  },
  "response_type_id": 461,
  "message": "Failed!Please try after some time",
  "status": 461
}
```

## 4. The contradiction we need resolved

Your API tells us two things that cannot both be true:

- **5.3 (eKYC)** → *"You have already completed Bank eKYC. Please do daily KYC."*
- **5.4 (Daily KYC)** → *"KYC Fail"* (1714)

You are directing us to Daily KYC, and Daily KYC is rejecting the same agent.

Our system state for this agent: eKYC recorded complete at **2026-07-20 10:18:43 UTC**;
onboarding and AePS activation both successful and confirmed by your team.

## 5. What we need from you

1. Please check your **server logs for user_code 38520005 on 20 July 2026 between
   10:18 and 10:30 UTC** and tell us which specific validation returns 1714.
   Your guide (page 13) documents 1714 only as a *generic* KYC failure, and the response body
   returns just "Transaction Not Completed", so we cannot narrow it further from our side.
2. Is `bank_code` validated differently on 5.4 than on 5.3 — should it be the agent's
   **settlement** bank rather than the bank used at eKYC?
3. Was anything changed on this account after the successful eKYC on 18 July?

We have implemented Section 5.4 field-for-field and have been blocked for three days.
Please escalate to your AePS technical team.
