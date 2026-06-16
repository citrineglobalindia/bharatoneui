# BharatOne UI — Deployment & Backend Guide

This document describes how the BharatOne UI app is wired to its backend (Supabase)
and how it is deployed (GitHub → Vercel), plus common operational tasks.

---

## 1. Architecture at a glance

| Layer      | Service  | Identifier |
| ---------- | -------- | ---------- |
| Frontend   | Vercel   | project `bharatoneui` → https://bharatoneui.vercel.app |
| Source     | GitHub   | `citrineglobalindia/bharatoneui` (branch `main`) |
| Backend    | Supabase | project `grgfodievkckwefubjyj` (org *barathone*, region `ap-northeast-1` / Tokyo) |

Deploy flow: **push to `main` → Vercel auto-builds → live**.

---

## 2. Environment variables

The app reads Supabase config from these variables. The `VITE_`-prefixed ones are
inlined into the client bundle at build time; the non-prefixed ones are read by the
SSR / auth-middleware code.

```
SUPABASE_PROJECT_ID=grgfodievkckwefubjyj
SUPABASE_URL=https://grgfodievkckwefubjyj.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_enA4AfrLac7QqefI3j56EQ_J-VF72en

VITE_SUPABASE_PROJECT_ID=grgfodievkckwefubjyj
VITE_SUPABASE_URL=https://grgfodievkckwefubjyj.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_enA4AfrLac7QqefI3j56EQ_J-VF72en
```

These live in two places and **must match**:

1. **`.env`** in the repo root (used for local dev and as the build default).
2. **Vercel → Project Settings → Environment Variables** (Production). If Vercel has
   these set, they **override** the repo `.env` at build time. After changing them,
   trigger a redeploy (Deployments → ⋯ → Redeploy).

> The publishable key is safe to expose publicly — it only grants access allowed by
> Row Level Security. Never put the **service_role key** or the **database password**
> in the repo or client.

---

## 3. Backend schema

The complete schema lives in
`supabase/migrations/20260616063532_bharatone_complete_backend.sql` and is idempotent
(safe to re-run). It creates:

- **Enum** `public.app_role`: `hr_staff`, `manager`, `employee`, `admin`
- **Tables**
  - `public.profiles` — one row per user (FK → `auth.users`), auto-created on signup
  - `public.user_roles` — role assignments (FK → `auth.users`)
  - `public.admin_audit_logs` — immutable audit trail
- **Functions**
  - `private.is_admin(uuid)` — used by RLS policies
  - `public.has_role(uuid, app_role)` — generic role check
  - `public.handle_new_user()` — provisions a profile + default `employee` role on signup
  - `public.set_updated_at()` — keeps `profiles.updated_at` fresh
- **Triggers**: signup provisioning, `updated_at`, audit-log immutability
- **RLS**: enabled on all tables. Users can read their own profile/roles; only admins
  can write roles or view all profiles and audit logs.

### Applying the schema to a fresh project
Open the Supabase **SQL Editor → New query**, paste the migration file, and **Run**.

---

## 4. User & role management

### Create a user
**Supabase Dashboard → Authentication → Users → Add user → Create new user**, tick
**Auto Confirm User**. The signup trigger automatically creates their profile and gives
them the default `employee` role.

> Note: Supabase normalizes emails (lowercase, dots may be stripped for gmail). Always
> look up users by the stored email.

### Promote a user to admin
Run in the SQL Editor (replace the email):

```sql
insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role
from auth.users
where lower(email) = lower('person@example.com')
on conflict (user_id, role) do nothing;
```

### Remove a role
```sql
delete from public.user_roles ur
using auth.users u
where ur.user_id = u.id
  and lower(u.email) = lower('person@example.com')
  and ur.role = 'manager';
```

### Current admin
- `sadanns123@gmail.com` — has `admin` (change its password after first login).

---

## 5. Deploying changes

1. Commit and push to `main`:
   ```bash
   git add -A && git commit -m "your message" && git push origin main
   ```
2. Vercel auto-builds. Watch **Vercel → Deployments**.
3. For DB changes, add a new file to `supabase/migrations/` and run it in the
   Supabase SQL Editor (or via the Supabase CLI).

---

## 6. Security checklist

- [ ] Database password rotated after any sharing (Settings → Database → Reset).
- [ ] Admin account password changed from the initial value.
- [ ] Any GitHub Personal Access Tokens used for one-off pushes are revoked.
- [ ] Service-role key is never committed or shipped to the client.
- [ ] RLS stays enabled on every table holding user data.

---

*Last updated: 2026-06-16.*
