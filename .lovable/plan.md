## Goal

Create two new read-only reporting portals — **DRO (District Regional Officer)** and **TRO (Taluk Regional Officer)** — each with a beautiful analytics dashboard. Both roles can ONLY view reports (no approvals, no edits). Set their login credentials.

## Credentials to set (in `src/components/portal-login.tsx` → `PORTAL_CONFIGS`)

```text
DRO  → username 8974532567  password Password@66  name "Kavya"  redirect /dro/dashboard
TRO  → username 8974532566  password Password@66  name "Navya"  redirect /tro/dashboard
```

(The existing `dro-login.tsx` / `tro-login.tsx` routes already wire these configs, so only the config values + redirects change.)

## Scope per role

**DRO — District level** (oversees multiple taluks/retailers across a district):
- KPI cards: Total Retailers, Active Today, Daily Services count, Daily Revenue.
- Charts: daily services trend (area), service-mix breakdown (donut/bar by AEPS/Recharge/BBPS/PAN/GST etc.), top taluks by volume (bar).
- Tables: District-wise retailer list with what each retailer is applying daily + per-retailer service counts; sortable + searchable + filter by taluk.
- Export to CSV.

**TRO — Taluk level** (same idea, narrower scope = single taluk's retailers):
- KPI cards: Taluk Retailers, Active Today, Services Today, Revenue Today.
- Charts: services trend, service-mix, top retailers in the taluk.
- Table: retailer-wise daily applied services + counts; searchable.
- Export to CSV.

Both are **view-only** — no approve/reject/edit buttons anywhere.

## Files to create

Shared shells + mock data (mirrors the accountant pattern):
- `src/components/regional/regional-mock-data.ts` — retailers, daily service activity, taluk/district aggregations, weekly trend, helper `inr`, service-count builders.
- `src/components/dro/dro-shell.tsx` — sidebar + header (rose accent, "Kavya · DRO"), report-only nav (Dashboard, District Reports, Retailer Activity, Service Analytics, Sign Out).
- `src/components/tro/tro-shell.tsx` — sidebar + header (amber accent, "Navya · TRO"), report-only nav.

DRO routes:
- `src/routes/dro.dashboard.tsx` — KPI cards + charts overview.
- `src/routes/dro.retailers.tsx` — district-wide retailer activity table + filters + CSV export.
- `src/routes/dro.services.tsx` — service analytics (counts, mix, trends).

TRO routes:
- `src/routes/tro.dashboard.tsx` — KPI cards + charts overview.
- `src/routes/tro.retailers.tsx` — taluk retailer activity table + CSV export.
- `src/routes/tro.services.tsx` — service analytics.

## Files to edit

- `src/components/portal-login.tsx` — update DRO + TRO demo credentials, display names, and `redirectTo`.

## Technical notes

- Reuse existing primitives: `PageHeader`, `StatCard`, `StatusBadge`, recharts (already in deps), lucide icons, `sonner`.
- Follow the AccountantShell layout structure (responsive sidebar, mobile drawer, header clock/notifications), recolored per role accent.
- All data is mock/in-memory (consistent with current portals — no backend).
- Route tree auto-generates; no manual `routeTree.gen.ts` edits needed.
- Colors via existing Tailwind tokens/utility classes already used across portals.

## Out of scope

No backend/auth wiring beyond the existing localStorage demo login, no approval actions for these roles.
