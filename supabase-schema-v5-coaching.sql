-- ============================================================
-- LUMORA WOMEN — Coaching Schema v5
-- Run this AFTER v2/v3/v4 security in Supabase SQL Editor.
-- Safe to re-run.
-- ============================================================

do $$
begin
  if to_regprocedure('public.is_admin()') is null then
    raise exception 'Missing public.is_admin(). Run the earlier Lumora schema/security SQL before v5 coaching.';
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.coaching_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  first_name text,
  last_name text,
  amount numeric(10,2) not null default 0,
  stripe_session_id text unique,
  stripe_payment_id text unique,
  status text not null default 'paid',
  created_at timestamptz not null default now()
);

create table if not exists public.coaching_clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null unique,
  first_name text,
  last_name text,
  status text not null default 'needs_onboarding',
  onboarding_status text not null default 'not_started',
  coaching_order_id uuid references public.coaching_orders(id) on delete set null,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.coaching_onboarding (
  id uuid primary key default gen_random_uuid(),
  coaching_client_id uuid not null unique references public.coaching_clients(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  form_data jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'coaching_orders_status_check'
      and conrelid = 'public.coaching_orders'::regclass
  ) then
    alter table public.coaching_orders
      add constraint coaching_orders_status_check
      check (status in ('paid', 'refunded', 'disputed', 'cancelled'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'coaching_clients_status_check'
      and conrelid = 'public.coaching_clients'::regclass
  ) then
    alter table public.coaching_clients
      add constraint coaching_clients_status_check
      check (status in ('needs_onboarding', 'plan_pending', 'active', 'paused', 'completed', 'cancelled'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'coaching_clients_onboarding_status_check'
      and conrelid = 'public.coaching_clients'::regclass
  ) then
    alter table public.coaching_clients
      add constraint coaching_clients_onboarding_status_check
      check (onboarding_status in ('not_started', 'submitted', 'reviewed', 'needs_changes'));
  end if;
end $$;

create unique index if not exists idx_coaching_clients_email_lower_unique
  on public.coaching_clients (lower(email));

create index if not exists idx_coaching_orders_user_id
  on public.coaching_orders(user_id);

create index if not exists idx_coaching_orders_email
  on public.coaching_orders(email);

create index if not exists idx_coaching_orders_created_at
  on public.coaching_orders(created_at desc);

create index if not exists idx_coaching_clients_user_id
  on public.coaching_clients(user_id);

create index if not exists idx_coaching_clients_status
  on public.coaching_clients(status, onboarding_status);

create index if not exists idx_coaching_onboarding_user_id
  on public.coaching_onboarding(user_id);

drop trigger if exists set_coaching_clients_updated_at on public.coaching_clients;
create trigger set_coaching_clients_updated_at
  before update on public.coaching_clients
  for each row execute function public.set_updated_at();

drop trigger if exists set_coaching_onboarding_updated_at on public.coaching_onboarding;
create trigger set_coaching_onboarding_updated_at
  before update on public.coaching_onboarding
  for each row execute function public.set_updated_at();

alter table public.coaching_orders enable row level security;
alter table public.coaching_clients enable row level security;
alter table public.coaching_onboarding enable row level security;

drop policy if exists "Users can view own coaching orders" on public.coaching_orders;
create policy "Users can view own coaching orders"
  on public.coaching_orders for select
  using (auth.uid() = user_id);

drop policy if exists "Admins full access to coaching orders" on public.coaching_orders;
create policy "Admins full access to coaching orders"
  on public.coaching_orders for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Users can view own coaching client record" on public.coaching_clients;
create policy "Users can view own coaching client record"
  on public.coaching_clients for select
  using (auth.uid() = user_id);

drop policy if exists "Admins full access to coaching clients" on public.coaching_clients;
create policy "Admins full access to coaching clients"
  on public.coaching_clients for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Users can view own coaching onboarding" on public.coaching_onboarding;
create policy "Users can view own coaching onboarding"
  on public.coaching_onboarding for select
  using (auth.uid() = user_id);

drop policy if exists "Users can update own coaching onboarding" on public.coaching_onboarding;
create policy "Users can update own coaching onboarding"
  on public.coaching_onboarding for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Admins full access to coaching onboarding" on public.coaching_onboarding;
create policy "Admins full access to coaching onboarding"
  on public.coaching_onboarding for all
  using (public.is_admin())
  with check (public.is_admin());
