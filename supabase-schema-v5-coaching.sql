-- Lumora Women coaching MVP schema
-- Run this in Supabase SQL Editor after v4 security.

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
