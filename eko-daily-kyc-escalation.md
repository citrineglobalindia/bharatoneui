# Email to Eko — AePS Daily KYC (2FA) has never succeeded

**Subject:** ESCALATION — AePS Daily KYC failing for all agents, initiator 9611151671 (4 days blocked)

**To:** Eko AePS technical / integration team

---

Hi Team,

We have been blocked for four days on the AePS Daily KYC (2FA) endpoint. Every other
endpoint in the flow works. Daily KYC has **never succeeded once**, for any agent.

Below is the full request, the PID configuration, and every response, so this can be
diagnosed without a further round trip.

**Account:** initiator_id `9611151671` · Production `https://api.eko.in:25002/ekoicici/v3`
**Agents:** 38520004, 38520005, 38520006 — all onboarded and AePS-activated (confirmed by your team)

---

## 1. What works, and what does not

| Step | Endpoint | Result |
|---|---|---|
| Onboard agent | `POST /v3/users/network/eps-agent` | Success |
| Activate AePS | `PUT /v3/admin/network/agent/{user_code}/aeps-fingpay/activate` | Success |
| eKYC — Send OTP | `POST /v3/user/collection/aeps-fingpay/kyc/otp` | Success |
| eKYC — Verify OTP | `PUT /v3/user/collection/aeps-fingpay/kyc/otp/verify` | Success |
| eKYC — Biometric | `PUT /v3/user/collection/aeps-fingpay/kyc/biometric` | **Success** for all three agents |
| **Daily KYC** | `PUT /v3/user/collection/aeps-fingpay/kyc/biometric/daily` | **Never succeeded — 0 of ~12 attempts** |
| Any transaction | balance enquiry / mini statement | Fails: 1467 / 1528 "Please do 2fa before initiating transaction" |

For agent 38520004 we hold a UIDAI "Aadhaar Authentication Successful" notification for
the eKYC biometric performed on 17 July 2026 at 18:58:08 IST, via a device deployed by
ICICI Bank Limited (UIDAI response code `bf219d4b17d64d9b969be90d209cdcb4`). **This
confirms our PID capture is well-formed and authenticates successfully at UIDAI.**

---

## 2. The core contradiction

Our application uses **one single capture routine** for both endpoints — identical
`PidOptions`, identical device, identical wadh (section 5). With that identical capture:

- Your **Biometric eKYC** endpoint **accepts** it. All three agents completed eKYC, and for
  38520004 UIDAI independently confirmed the authentication succeeded.
- Your **Daily KYC** endpoint **rejects** it, for agent 38520005, as
  `1714` "Authentication Failed. Invalid Biometric data."

For agent 38520006 the two calls were 90 minutes apart on the same day, same device, same
operator: eKYC succeeded at 09:43 UTC, Daily KYC failed at 11:34 UTC.

Please explain how a PID block produced by one capture routine can be valid for one of
your endpoints and invalid for the other.

---

## 3. Three agents, three different reasons, same minute

All three calls below were made by identical client code within eight minutes, using the
same device model and the same request shape. Only `user_code` differed.

| Time (UTC, 20 Jul 2026) | user_code | bank_code | client_ref_id | `data.reason` returned |
|---|---|---|---|---|
| 11:42:24 | 38520004 | HDFC | BHOKYC1784547744735219 | `Transaction Not Completed` |
| 11:42:19 | 38520005 | HDFC | BHOKYC1784547737760156 | `Authentication Failed. Invalid Biometric data.` |
| 11:41:39 | 38520004 | HDFC | BHOKYC1784547699321586 | `Transaction Not Completed` |
| 11:34:11 | 38520006 | CNRB | BHOKYC1784547250806283 | `Please complete bank eKYC to process the transaction.` |
| 11:26:57 | 38520004 | HDFC | BHOKYC1784546817626969 | `Transaction Not Completed` |

Earlier the same day, 38520004 returned `response_type_id: 346`, and 38520005 returned
`{"message":"No key for Response"}` with no status field at all.

Three different server-side answers to identical client behaviour indicates **per-agent
state on your side**, not a client defect.

Note also:

- `Transaction Not Completed` appears nowhere in your documentation.
- `{"message":"No key for Response"}` appears nowhere in your documentation.
- `1467` appears nowhere in your documentation.
- `346` is documented on your Send OTP page as **"AePS Fingpay service not activated for
  this agent"** — yet your team has confirmed activation verbally for 38520004.

---

## 4. Our exact request

```
PUT https://api.eko.in:25002/ekoicici/v3/user/collection/aeps-fingpay/kyc/biometric/daily
```

**Headers**

```
developer_key:        <our developer key>
secret-key:           base64(HMAC-SHA256(message = timestamp, key = base64(auth_key)))
secret-key-timestamp: <epoch milliseconds>
content-type:         application/json
```

**Body** — exactly the seven parameters your specification lists, nothing more:

```json
{
  "initiator_id": "9611151671",
  "user_code": "38520005",
  "aadhar": "<RSA PKCS#1 v1.5 encrypted with the Eko public key, base64>",
  "customer_id": "9611156458",
  "latlong": "13.010451,76.108332",
  "piddata": "<PidData XML, captured seconds before the call>",
  "bank_code": "HDFC"
}
```

We previously sent `client_ref_id` in this body at your support team's request. Your
specification does not list it for this endpoint, and while it was present your API
returned `{"message":"No key for Response"}`. We have removed it.

---

## 5. PID capture — confirming the wadh, as requested

You asked us to confirm whether the `wadh` is being passed. **It is**, and it is the value
you specified. This is the exact `PidOptions` XML our application sends to the RD service:

```xml
<?xml version="1.0"?>
<PidOptions ver="1.0">
  <Opts fCount="1" fType="2" iCount="0" pCount="0" format="0"
        pidVer="2.0" timeout="20000" posh="UNKNOWN" env="P"
        wadh="E0jzJ/P8UopUHAieZn8CKqS4WPMi5ZSYXgfnlfkWjrc=" />
</PidOptions>
```

Every attribute is identical to your own **All Device Data.html** reference capture page,
except `timeout` (we allow 20s instead of 10s for the operator to place their finger).

Please note: the `wadh` is **not echoed back inside the returned PID block** — the RD
service folds it into the signature rather than reproducing it as an attribute. Neither
you nor we can read it out of `piddata`. The `<Opts>` element above is the only place it
can be verified, and it is correct.

**PID block we transmit** (verified on every attempt):

- `Data type="X"` (XML, not Protobuf)
- `fType="2"`
- `mc` present in `DeviceInfo`
- RD service `errCode="0"`
- Capture quality 50–70
- Device: Mantra MFS110
- Length ~14,600–15,800 characters
- Transmitted within seconds of capture

---

## 6. Responses received

**Most common — 38520004:**

```json
{
  "response_status_id": 1,
  "data": { "reason": "Transaction Not Completed", "comment": "Transaction Not Completed" },
  "response_type_id": 1714,
  "message": "KYC Fail",
  "status": 1714
}
```

**38520005:**

```json
{
  "response_status_id": 1,
  "data": { "reason": "Authentication Failed. Invalid Biometric data.", "comment": "" },
  "response_type_id": 1714,
  "message": "KYC Fail",
  "status": 1714
}
```

**38520006 (eKYC completed successfully on your endpoint 90 minutes earlier):**

```json
{
  "response_status_id": 1,
  "data": { "reason": "Please complete bank eKYC to process the transaction.", "comment": "" },
  "response_type_id": 1714,
  "message": "KYC Fail",
  "status": 1714
}
```

**Earlier response, 38520005 — undocumented shape, no status field:**

```json
{ "message": "No key for Response" }
```

**Transactions, all agents:**

```json
{
  "data": { "comment": "Please do 2fa before initiating transaction" },
  "status": 1467,
  "message": "Transaction Fail",
  "response_type_id": 1467,
  "response_status_id": 1
}
```

---

## 7. What we need from you

1. **Server logs for the five `client_ref_id` values in section 3** — please tell us which
   specific validation fails for each, and why the same code path returns three different
   reasons for three agents.

2. **Raw `GET /user/account/services` output for 38520004, 38520005 and 38520006.** We need
   to see service_code `43` with its `status`, `status_desc` and `verification_status` for
   each agent — not a verbal confirmation that activation is done. Agent 38520004 is
   returning `346`, which your own documentation defines as service-not-activated.

3. **Confirm whether the Daily KYC endpoint is enabled on initiator 9611151671.** It has
   never returned `1713` for any agent, on any day, while every adjacent endpoint works.

4. **Explain the eKYC / Daily KYC contradiction** in section 2 — the same PID block accepted
   by one endpoint and rejected by the other.

5. **Publish or send us the `response_type_id` table**, including `1467` and the meaning of
   `Transaction Not Completed`, neither of which appears in your documentation.

6. **Confirm whether a non-zero E-value balance is required for Daily KYC.** Our balance is
   currently ₹0. Your documentation does not list this as a prerequisite and Daily KYC is
   non-financial, but we want it ruled out explicitly.

We have implemented your specification field for field, our PID options match your own
reference capture page byte for byte, and UIDAI confirms our biometric authenticates.
We have exhausted what we can diagnose from our side.

Please escalate this to your AePS technical team today. We have retailers onboarded and
waiting, and this has been open for four days.

Thanks,

**BharatOne — Technical Team**
