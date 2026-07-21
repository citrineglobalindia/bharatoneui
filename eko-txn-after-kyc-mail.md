Subject: AePS Fingpay — transactions after successful Daily KYC returning issuer-bank declines — please confirm (user_code 38520007)

Hi Eko team,

As requested, here are the complete technical details of what we send after KYC and the responses we receive. Summary: our agent's Daily KYC now SUCCEEDS (1713), and subsequent transactions reach the bank switch and return proper TIDs — but they are declined with customer-bank-side reasons. We need you to confirm these are genuine issuer responses and not any block on the Fingpay/merchant side.

---------------------------------------------------------------
1) DAILY KYC — SUCCESS
---------------------------------------------------------------
API: PUT https://api.eko.in:25002/ekoicici/v3/user/collection/aeps-fingpay/kyc/biometric/daily
Headers: developer_key, x-developer-key, secret-key (base64 HMAC-SHA256 of timestamp using base64(access_key)), secret-key-timestamp, content-type: application/json
Body fields: initiator_id, user_code, aadhar (RSA PKCS#1 v1.5 encrypted with the Eko production public key, base64), customer_id (agent mobile), latlong, piddata (device PID XML: Data type="X", fType=2, mc present, no wadh), bank_code

Result on 21-Jul-2026 16:37:32 IST (our ref BHOKYC1784632050372593):
{"response_status_id":0, "response_type_id":1713, "message":"KYC sucess", "status":0}
NPCI confirmation email was also received by the agent. So KYC and biometric handling on our side are working.

---------------------------------------------------------------
2) TRANSACTIONS AFTER THAT KYC — DECLINED BY THE CUSTOMER'S BANK
---------------------------------------------------------------
API called (same agent, user_code 38520007, same day, after the successful KYC):
POST https://api.eko.in:25002/ekoicici/v3/customer/collection/aeps-fingpay/mini-statement/{customer_mobile}
POST https://api.eko.in:25002/ekoicici/v3/customer/collection/aeps-fingpay/balance-enquiry/{customer_mobile}
Headers: same as above (developer_key, x-developer-key, secret-key, secret-key-timestamp, content-type: application/json)
Body fields: initiator_id, user_code=38520007, client_ref_id, bank_code, aadhar (RSA PKCS#1 v1.5 encrypted, base64), latlong, piddata (customer PID XML: Data type="X", fType=2, mc present, no wadh)

Attempts and full responses:

a. 16:40:26 IST — Mini Statement — bank KARB — our ref BHO1784632226433344 — TID 3570044344
   {"response_status_id":1, "response_type_id":1528, "message":"Transaction Fail", "data":{"comment":"Customer Bank account is Frozen or Frozen Account"}}

b. 16:40:55 IST — Mini Statement — bank KARB — our ref BHO1784632255861643 — TID 3570044352
   Same response: "Customer Bank account is Frozen or Frozen Account"

c. 16:51:11 IST — Mini Statement — bank UBIN — our ref BHO1784632871705510 — TID 3570044727
   {"response_status_id":1, "response_type_id":1528, "message":"Transaction Fail", "data":{"comment":"AePS debit transactions are disabled by customer bank"}}

d. 16:51:39 IST — Mini Statement — bank UBIN — our ref BHO1784632899318181 — TID 3570044735
   Same response: "AePS debit transactions are disabled by customer bank"

e. 16:59:54 IST — Balance Enquiry — bank KARB — our ref BHO1784633394897955 — TID 3570045001
   {"response_status_id":1, "response_type_id":1467, "message":"Transaction Fail", "data":{"comment":"Customer Bank account is Frozen or Frozen Account"}}

---------------------------------------------------------------
3) WHAT WE NEED FROM YOU
---------------------------------------------------------------
1. Every attempt above received a proper Fingpay TID, so the requests are reaching the switch. Please confirm these comments ("Customer Bank account is Frozen", "AePS debit transactions are disabled by customer bank") are genuine issuer-bank responses for those customer accounts — i.e. the accounts are frozen / not AePS-enabled at their banks — and NOT any restriction on our merchant (user_code 38520007) or on our initiator.
2. If they are issuer responses, we will treat this as customer-account state (and test with an active, AePS-enabled account). Please confirm nothing further is needed in our request format.
3. If anything IS wrong or pending on the merchant/initiator side, please state exactly what to change.

Thanks,
BharatOne team
