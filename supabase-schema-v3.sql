-- ============================================================
-- LUMORA WOMEN — Database Schema v3 (additive)
-- Run this AFTER supabase-schema-v2.sql in the Supabase SQL editor.
-- Every statement is idempotent — safe to re-run.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Blog post scheduling
-- ────────────────────────────────────────────────────────────
alter table public.blog_posts add column if not exists published_at timestamptz;
alter table public.blog_posts add column if not exists scheduled_at timestamptz;

-- Quick lookup for the cron / on-demand publisher
create index if not exists idx_blog_posts_scheduled
  on public.blog_posts(scheduled_at)
  where published = false;

-- ────────────────────────────────────────────────────────────
-- 2. Email subscriber source (where the signup came from)
-- ────────────────────────────────────────────────────────────
alter table public.email_subscribers
  add column if not exists source text default 'website';

-- ────────────────────────────────────────────────────────────
-- 3. Products (admin shop manager)
-- ────────────────────────────────────────────────────────────
create table if not exists public.products (
  id            uuid primary key default uuid_generate_v4(),
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
  id             uuid primary key default uuid_generate_v4(),
  setting_key    text not null unique,
  setting_value  jsonb,
  updated_at     timestamptz not null default now()
);

alter table public.settings enable row level security;

drop policy if exists "Admins manage settings" on public.settings;
create policy "Admins manage settings"
  on public.settings for all using (public.is_admin());

-- ────────────────────────────────────────────────────────────
-- 5. Auto-publish scheduled blog posts (OPTIONAL — pg_cron)
-- ────────────────────────────────────────────────────────────
-- Uncomment after enabling the pg_cron extension in:
--   Supabase Dashboard → Database → Extensions → pg_cron
--
-- This flips any scheduled post whose time has come over to published.
-- The Next.js /api/blog/publish-due route does the same thing on demand if
-- you'd rather not use pg_cron (or want both — they're idempotent).
--
-- create extension if not exists pg_cron;
-- select cron.schedule(
--   'publish-due-blog-posts',
--   '* * * * *',
--   $$ update public.blog_posts
--      set published = true, published_at = coalesce(scheduled_at, now())
--      where published = false
--        and scheduled_at is not null
--        and scheduled_at <= now() $$
-- );
