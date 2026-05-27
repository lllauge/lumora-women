-- ============================================================
-- LUMORA WOMEN — Database Schema v4 (security hardening)
-- Run this AFTER supabase-schema-v3.sql in the Supabase SQL editor.
-- Every statement is idempotent — safe to re-run.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Rate limits table (server-side sliding window limiter)
--    Rows are written by the service role key only.
--    A nightly cleanup job (or manual run) should purge old rows.
-- ────────────────────────────────────────────────────────────
create table if not exists public.rate_limits (
  id         bigserial primary key,
  key        text        not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_rate_limits_lookup
  on public.rate_limits(key, created_at);

alter table public.rate_limits enable row level security;
-- No policies = zero client access. Service role key only.

-- Cleanup function — call this daily via Supabase CRON or manually.
create or replace function public.cleanup_rate_limits()
returns void as $$
  delete from public.rate_limits where created_at < now() - interval '2 hours';
$$ language sql security definer;

-- ────────────────────────────────────────────────────────────
-- 2. Audit logs table
--    All admin actions are recorded here via the service role key.
--    No client can read or write this table.
-- ────────────────────────────────────────────────────────────
create table if not exists public.audit_logs (
  id             uuid        primary key default uuid_generate_v4(),
  admin_user_id  uuid        references auth.users(id) on delete set null,
  action         text        not null,
  table_name     text,
  record_id      text,
  old_values     jsonb,
  new_values     jsonb,
  ip_address     text,
  created_at     timestamptz not null default now()
);

create index if not exists idx_audit_logs_admin
  on public.audit_logs(admin_user_id, created_at desc);

create index if not exists idx_audit_logs_table
  on public.audit_logs(table_name, created_at desc);

alter table public.audit_logs enable row level security;
-- No policies = zero client access. Service role key only.

-- ────────────────────────────────────────────────────────────
-- 3. Add TOTP secret column to users table
--    Stores the admin's speakeasy base32 TOTP secret (nullable).
--    When null, TOTP step is skipped (initial setup mode).
-- ────────────────────────────────────────────────────────────
alter table public.users
  add column if not exists totp_secret text;

-- ────────────────────────────────────────────────────────────
-- 4. Email verification: add email_confirmed_at helper column
--    Supabase tracks this in auth.users.email_confirmed_at.
--    We surface it via the existing is_admin() helper; no extra
--    column needed here — just query auth.users.email_confirmed_at
--    in server actions that require verified email.
-- ────────────────────────────────────────────────────────────

-- ────────────────────────────────────────────────────────────
-- 5. Tighten email_subscribers RLS
--    The old "Anyone can subscribe" policy allowed direct client
--    inserts. We remove it and route all writes through the
--    server-side admin client instead.
-- ────────────────────────────────────────────────────────────
drop policy if exists "Anyone can subscribe" on public.email_subscribers;

-- No insert policy = zero client writes. Subscribe action uses service role.

-- ────────────────────────────────────────────────────────────
-- 6. Tighten enrollments RLS
--    Remove direct client insert; enrollment happens server-side.
-- ────────────────────────────────────────────────────────────
drop policy if exists "Users can insert own enrollments" on public.enrollments;

-- Enrollment is only granted via service role (webhook, free-course action).

-- ────────────────────────────────────────────────────────────
-- 7. Orders: only service role can insert
--    The existing "Service role can insert orders" policy uses
--    `with check (true)` which allows authenticated clients too.
--    Replace with a stricter check.
-- ────────────────────────────────────────────────────────────
drop policy if exists "Service role can insert orders" on public.orders;
-- No insert policy = zero client writes. Webhook uses service role.

-- ────────────────────────────────────────────────────────────
-- SUPABASE DASHBOARD SETTINGS (must be done manually)
-- ────────────────────────────────────────────────────────────
-- 1. Authentication → Settings → Enable email confirmations: ON
--    (requires users to verify email before signing in)
--
-- 2. Authentication → Settings → Enable rate limiting: ON
--    (Supabase built-in brute force protection)
--
-- 3. Authentication → Settings → Session length: 604800 (7 days for students)
--    For admin 8-hour session, this is enforced at the application layer.
