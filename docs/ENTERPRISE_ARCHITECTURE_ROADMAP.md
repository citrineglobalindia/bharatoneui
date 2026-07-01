# BharatOne — Enterprise Architecture Roadmap

Response to the client's *Enterprise Architecture Gap Analysis* (20 components).
Each item is classed **Done ✅ / Partial 🟡 / Not yet 🔴**, with what exists and what remains.

## Implemented in this iteration

- **Scheduler / Cron Jobs** — `pg_cron` enabled. Jobs: `snapshot-daily-metrics` (00:05) and `cleanup-expired-otps` (02:15). Add more via `cron.schedule(...)`.
- **Business Intelligence / Analytics** — `admin_analytics_summary()` RPC + **Admin → Platform Analytics** page (metric cards + 30-day trend from the `daily_metrics` snapshot table).
- **Search Service** — `global_search()` RPC (Postgres, `pg_trgm` enabled) + **Admin → Global Search** page across registrations, applications, and services.
- **Notification Service (foundation)** — `notification_config` + `notification_log` tables and the `notify-dispatch` edge function. **Email + in-app are live**; SMS / WhatsApp / Push are scaffolded (implement `sendSms()` / `sendWhatsApp()` and set the provider keys + `notification_config.<channel>_active`).
- **Document Verification Engine (foundation)** — `ocr_config` + `document_verifications` tables and the `verify-document` edge function scaffold. Activate with an OCR/Aadhaar-PAN validation provider key + `ocr_config.active` and implement `callOcr()`.

## Already present before this iteration

- **Audit & Compliance ✅** — `audit_log`, `admin_audit_logs`, `registration_events`, DB triggers.
- **Admin Configuration Modules ✅** — user management, notice board, support categories, service catalog, app settings, operator mapping.
- **Security Layer 🟡** — Supabase secrets, HTTPS + at-rest encryption, Row-Level Security, role-based access. *Remaining:* staff MFA/2FA, dedicated WAF.
- **Banking Middleware 🟡** — AEPS scaffold (data model, gateway, screen, integration guide). *Remaining:* live AEPS + DMT/BBPS/mATM (need provider APIs).
- **CRM / Franchise / Monitoring / DR 🟡** — partial via support+telecaller, distributor hierarchy, platform logs, and managed backups respectively.

## Infrastructure items — plan (no code yet, by design)

These are platform/ops decisions that matter **at nationwide scale**; a managed Supabase + Vercel stack handles substantial load before they are required.

| Component | When it's needed | Recommended approach |
|-----------|------------------|----------------------|
| **API Gateway** | High traffic, many external consumers, per-partner rate limits | Front the API with a dedicated gateway (Kong / AWS API Gateway / Cloudflare) for routing, throttling, versioning. Today Supabase provides an auto JWT-secured gateway. |
| **Queue System** | Heavy async work (bulk notifications, settlements, webhooks) | Add a broker (SQS / RabbitMQ) or `pgmq`; move long jobs off the request path. |
| **Redis Cache** | Read-heavy hot paths, sessions, rate-limit counters | Managed Redis (Upstash / ElastiCache) for caching + counters. |
| **Monitoring & Logging** | Production SLAs | Add Sentry (errors) + an APM/metrics stack (Grafana/Datadog) with alerting on top of Supabase/Vercel logs. |
| **Disaster Recovery & Backup** | Business continuity | Formal RPO/RTO, cross-region replicas, and **tested** restore drills beyond default daily backups. |
| **WAF** | Public-internet threat surface | Cloudflare/AWS WAF in front of the app for OWASP protection + bot mitigation. |

## Provider-dependent items — need client-supplied APIs/keys

Scaffolded (or ready to scaffold) the same way as AEPS; they go live only once the client provides the provider onboarding and keys:

- **Payment Service** — payment gateway (Razorpay/PayU) for automated collection & settlement.
- **Banking rails** — DMT, BBPS, mATM (in addition to AEPS).
- **OCR / Document Verification** — PAN/Aadhaar validation provider.
- **SMS / WhatsApp / Push** — messaging providers (Twilio/Gupshup/WhatsApp Business, FCM).
- **AI Services** — OCR, ML fraud detection, AI chatbot.

## Feature modules (additive builds when prioritised)

- **HRMS** — attendance, leave, payroll (currently only staff/role management exists).
- **Full CRM** — lead pipeline, campaigns, contact history.
- **Franchise Management** — commission hierarchy, territories, payouts.

---

*Framing for the client: the functional core (registration/KYC, approvals, wallet/ledger, roles, audit, admin config, notifications) is in place. The gap items are mostly scaling infrastructure and provider integrations — additive, not rewrites.*
