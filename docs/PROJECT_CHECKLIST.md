# BharatOne — Project Status Checklist

Legend: ✅ Done · 🟡 Partial (foundation built) · 🔴 Not started
"Dependency to start" = what is needed before the item can be completed/started.

---

## A. Core Platform (functional MVP) — all ✅

| # | Module | Status | Notes |
|---|--------|--------|-------|
| A1 | Public website + services catalogue | ✅ | Live |
| A2 | Retailer registration (New + Old JSKO) | ✅ | Multi-step, data retained on Back |
| A3 | KYC capture (PAN/Aadhaar, selfie, video, shop photos, GPS) | ✅ | Selfie/video retained on return |
| A4 | Duplicate-registration prevention (email/phone) | ✅ | DB trigger |
| A5 | Role portals: Retailer, Distributor, Admin, Accountant, QC, Telecaller, Operator | ✅ | Role-based access |
| A6 | Approval workflow (payment verify → QC → approval, doc re-upload) | ✅ | Multi-stage |
| A7 | KYC approval ID logic (Old JSKO keeps ID; New from JSKO821) + login by JSKO ID | ✅ | Live |
| A8 | Service applications, operator mapping, lifecycle | ✅ | Live |
| A9 | Wallet, ledger, transactions, recharges, refunds | ✅ | Live |
| A10 | Support tickets, notifications, notice board, in-app chat, feedback | ✅ | Live |
| A11 | Admin configuration (users, catalog, settings, categories) | ✅ | Live |

---

## B. Enterprise Gap-Analysis Items (client's 20)

### ✅ Done (8)

| # | Item | What was delivered |
|---|------|--------------------|
| 5 | Audit & Compliance | `audit_log`, `admin_audit_logs`, `registration_events`, triggers |
| 6 | Queue System | Postgres `pgmq` queue + processor + cron (tested) |
| 7 | Scheduler / Cron Jobs | `pg_cron`: daily metrics snapshot + OTP cleanup + job processor |
| 10 | Search Service | `global_search` RPC + Admin → Global Search page |
| 13 | HRMS | Employees + Attendance + Leave module (Admin → HRMS) |
| 15 | Business Intelligence Dashboard | Admin → Platform Analytics (cards + 30-day trend) |
| 19 | Admin Configuration Modules | User mgmt, notice board, catalog, settings, categories |
| 20 | Analytics Platform | Analytics summary + daily metric snapshots |

### 🟡 Partial — foundation built, completion has a dependency (7)

| # | Item | Built so far | Dependency to complete |
|---|------|--------------|------------------------|
| 1 | API Gateway | Supabase auto JWT-secured gateway | **Ops decision** — provision dedicated gateway (Kong/cloud) at scale |
| 2 | Notification Service | Email + in-app live; Notification Center + SMS/WhatsApp/Push scaffold | **Client:** SMS/WhatsApp/Push provider account + keys |
| 3 | Payment Service | Wallet/ledger + manual UTR verification | **Client:** payment-gateway merchant account + keys (Razorpay/PayU) |
| 4 | Banking Middleware | AEPS scaffold (data model, gateway, screen, guide) | **Client:** AEPS/DMT/BBPS/mATM provider + sponsor-bank onboarding + keys |
| 11 | Document Verification | Manual QC + OCR scaffold + Verify buttons in QC | **Client:** OCR / PAN-Aadhaar validation API key |
| 17 | Security Layer | RLS, secrets, encryption, **Staff MFA/2FA (done)** | **Ops:** dedicated WAF (Cloudflare/AWS) |
| 18 | AI Services | Rule-based fraud engine (done) + rule-based chatbot + OCR scaffold | **Client:** AI/LLM + ML-fraud + OCR provider keys |

### 🔴 Not started (5)

| # | Item | Type | Dependency to start |
|---|------|------|---------------------|
| 8 | Monitoring & Logging | Ops + light code | Choose stack (Sentry/Grafana/Datadog); I can wire Sentry now if approved |
| 9 | Redis Cache | Infrastructure | Provision managed Redis (Upstash/ElastiCache) — needed only at scale |
| 12 | CRM Module (full) | Feature build | None — I can build unassisted (partial CRM exists via support/telecaller) |
| 14 | Franchise Management (full) | Feature build | None — I can build unassisted (distributor hierarchy exists) |
| 16 | Disaster Recovery & Backup | Ops | Define RPO/RTO; set up cross-region + restore drills |

---

## C. What can proceed right now, and how

**No dependency — I can build immediately**
- CRM Module (#12) — lead/contact pipeline, history, campaigns.
- Franchise Management (#14) — commission hierarchy, territories, payouts.
- Monitoring (#8) — wire in Sentry error tracking (code-only part).
- Polish: route real events through notification dispatcher; upgrade 2FA login prompt to a modal.

**Blocked on client-provided provider keys/accounts**
- Payment gateway (#3), Banking rails incl. AEPS go-live (#4), OCR/Aadhaar validation (#11), SMS/WhatsApp/Push (#2), AI/LLM + ML fraud (#18).

**Ops / infrastructure decisions (provision at scale)**
- Dedicated API Gateway (#1), Redis (#9), WAF (#17), full Monitoring/APM (#8), Disaster Recovery (#16).

---

*Summary: 11 core modules + 8 enterprise items done. Of the remaining 12, only 4 are code work I can do unassisted (CRM, Franchise, Sentry wiring, polish); 5 need client-provided API keys; 5 are scale-time infrastructure.*
