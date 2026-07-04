-- ============================================================
-- LUMORA WOMEN — Schema v17: tables the app expects but the live
-- database is missing (verified 2026-07-03 via PostgREST: 404 on
-- rate_limits, audit_logs, products, settings).
--
-- WHY THIS MATTERS: the rate limiter FAILS CLOSED in production.
-- With rate_limits missing, every login, password reset, MFA code,
-- contact form, and checkout returns "Too many attempts" the moment
-- the app runs with NODE_ENV=production. Run this in the Supabase
-- SQL editor BEFORE launch.
--
-- Definitions are taken from supabase-schema-v3.sql / v4.sql, with
-- uuid defaults switched to gen_random_uuid() (built into Supabase,
-- no extension needed). Every statement is idempotent — safe to
-- re-run.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Rate limits (server-side sliding-window limiter)
--    Written by the service role key only. src/lib/rate-limit.ts
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

-- Purge old rows so the table can't grow unbounded.
create or replace function public.cleanup_rate_limits()
returns void as $$
  delete from public.rate_limits where created_at < now() - interval '2 hours';
$$ language sql security definer;

-- ────────────────────────────────────────────────────────────
-- 2. Audit logs (admin action trail) — src/lib/audit-log.ts
--    Inserts have been silently failing since launch of that code.
-- ────────────────────────────────────────────────────────────
create table if not exists public.audit_logs (
  id             uuid        primary key default gen_random_uuid(),
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
-- 3. Products (admin shop manager). The app hides the shop while
--    this table is absent; creating it (empty) changes nothing
--    publicly but makes the admin Shop section usable.
-- ────────────────────────────────────────────────────────────
create table if not exists public.products (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  category      text,
  price         numeric(10,2) not null default 0,
  sale_price    numeric(10,2),
  stock_status  text not null default 'in_stock'
                check (stock_status in ('in_stock','low_stock','out_of_stock','coming_soon')),
  images        text[] not null default '{}',
  published     boolean not null default false,
  created_at    timestamptz not null default now()
);

alter table public.products enable row level security;

drop policy if exists "Published products visible to all" on public.products;
create policy "Published products visible to all"
  on public.products for select using (published = true);

drop policy if exists "Admins full access to products" on public.products;
create policy "Admins full access to products"
  on public.products for all using (public.is_admin());

-- ────────────────────────────────────────────────────────────
-- 4. Settings (key/value store for admin preferences)
-- ────────────────────────────────────────────────────────────
create table if not exists public.settings (
  id             uuid primary key default gen_random_uuid(),
  setting_key    text not null unique,
  setting_value  jsonb,
  updated_at     timestamptz not null default now()
);

alter table public.settings enable row level security;

drop policy if exists "Admins manage settings" on public.settings;
create policy "Admins manage settings"
  on public.settings for all using (public.is_admin());

-- ────────────────────────────────────────────────────────────
-- 5. RECOMMENDED: schedule the rate-limit purge with pg_cron.
--    Enable the extension first: Dashboard → Database → Extensions
--    → pg_cron, then uncomment and run:
-- ────────────────────────────────────────────────────────────
-- create extension if not exists pg_cron;
-- select cron.schedule(
--   'cleanup-rate-limits',
--   '17 * * * *',
--   $$ select public.cleanup_rate_limits() $$
-- );
