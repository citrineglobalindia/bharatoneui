# BharatOne — Eko AePS Integration: Blockers & Request for Eko

**Partner:** Citrine Global India / BharatOne
**initiator_id:** 9611151671
**Environment:** Production — `https://api.eko.in:25002/ekoicici/v3`
**Date:** 17 Jul 2026

We are integrating AePS (onboard → activate → eKYC → transactions). Onboarding and activation now pass most checks, but we are blocked on two issues that appear to be on Eko's side. Details, exact request/response logs, and two specific questions are below.

---

## Agents involved

| Agent (user_code) | Retailer | Mobile | State on Eko | Blocker |
|---|---|---|---|---|
| 38520001 | Syed Asim (RM001) | 7026977147 | onboarded, not activated | Activation fails: "Email Id is missing. Merchant address1 missing. Shop address missing." Profile appears to lack email + shop address. |
| 38520002 | Syed Asim (duplicate) | 7026977147 | activated | Activated during integration testing with placeholder KYC → eKYC fails "Aadhar/PAN/Merchant Name Not Matching" (461). To be dropped. |
| 38520003 | Ramya H R (jsko001) | 9071100311 | onboarded, not activated | Onboard succeeded with correct name/PAN/email. Activation fails: "Merchant address1 missing. Shop address missing" (1258). |

---

## Issue A — Activation cannot find the shop / merchant address

Agent **38520003** (Ramya H R) was onboarded successfully via `POST /v3/users/network/eps-agent` (name, PAN, DOB, email all accepted). Activation then fails.

**Activation request**
```
PUT https://api.eko.in:25002/ekoicici/v3/admin/network/agent/38520003/aeps-fingpay/activate
Content-Type: multipart/form-data

form-data = {
  "initiator_id": "9611151671",
  "devicenumber": "7258136",
  "modelname": "Mantra",
  "account": "6057523919",
  "ifsc": "IDIB000H006",
  "aadhar": "233376435369",
  "shop_type": "4215",
  "latlong": "13.0033,76.0954",
  "address_as_per_proof": { "line": "KR Puram", "address1": "KR Puram", "city": "Hassan", "state": "Karnataka", "pincode": "573201", "state_id": "29" },
  "office_address":       { "line": "KR Puram", "address1": "KR Puram", "city": "Hassan", "state": "Karnataka", "pincode": "573201", "state_id": "29" }
}
pan_card, aadhar_front, aadhar_back = <real JPG documents>
```

**Response**
```
HTTP 200
{
  "response_status_id": 1,
  "status": 1258,
  "message": "Aeps Registration Fail",
  "data": {
    "reason": "Mandatory parameters Merchant address1 is missing. Given Merchant address1 is not valid. Shop address is missing. Given shop address is not valid.",
    "user_code": "38520003",
    "initiator_id": "9611151671",
    "service_code": "43"
  }
}
```

**What we have already tried (all give the identical 1258 error):**
- Sending `address1` inside both `address_as_per_proof` and `office_address` (as above).
- Adding extra keys: `line1`, `line2`, `address2`, `area`, `landmark`, `district`.
- Different `state_id` values (23, 13, 16, 29).
- Re-onboarding the agent via `POST /v3/users/network/eps-agent` **and** via `PUT /v1/user/onboard` with a full `residence_address` — both return **"This user already exist"** and do not update the profile.

This indicates activation reads the shop/merchant address from the **onboarding profile**, and our onboard call is not populating it. Eko's public API reference for **Onboard User** lists `residence_address` only as "json — Residence Address of the agent" without specifying the required sub-fields.

### Question 1
In `POST /v3/users/network/eps-agent`, what exact `residence_address` (and any shop/office-address) fields must we send so that AePS activation finds **"Merchant address1"** and **"Shop address"**? Please share a complete working sample onboard body.

---

## Issue B — Duplicate / locked agents need a reset

- **38520001** and **38520002** are duplicates for the same retailer (mobile 7026977147), created during integration. 38520002 was activated with placeholder KYC and now fails eKYC with **461 "Aadhar/PAN/Merchant Name Not Matching."** 38520001 is missing email + shop address on its profile.
- **38520003** is onboarded but locked without a shop address (Issue A), and re-onboard will not update it.

Because re-onboarding an existing agent returns "This user already exist," we cannot correct any of these from the API.

### Question 2
Please **reset / de-register agents 38520001, 38520002, and 38520003** so we can re-onboard them cleanly with the correct structure (once Question 1 is answered).

Correct details for re-onboarding:
- **Syed Asim** — mobile 7026977147, PAN LUIPS8440M, Aadhaar 614465235203, A/C 581402010016706 (UBIN0558141), shop: BharatOne Head Office, K R Puram, Hassan, Karnataka 573201, email syedasimbharatone@gmail.com
- **Ramya H R** — mobile 9071100311, PAN EJNPR3389R, Aadhaar 233376435369, A/C 6057523919 (IDIB000H006), shop: Bharatone jsko001, KR Puram, Hassan, Karnataka 573201, email radhikaradhu301@gmail.com

---

## For reference — checks that now pass

- **Name vs PAN:** resolved. Eko expects `first_name` = given name and `last_name` = surname only (no middle initial). Example: PAN name "RAMYA H R" → first_name "RAMYA", last_name "R" → onboard success.
- **Email:** resolved by onboarding via `/v3/users/network/eps-agent` with a valid email.
- **Signature/auth, device serial, PAN, DOB:** all accepted.

The only remaining blockers are the two questions above.
