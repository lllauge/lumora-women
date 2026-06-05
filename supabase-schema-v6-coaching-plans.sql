-- ============================================================
-- LUMORA WOMEN — Coaching Plans Schema v6
-- Run this AFTER v5 coaching in Supabase SQL Editor.
-- Safe to re-run.
-- ============================================================

do $$
begin
  if to_regclass('public.coaching_clients') is null then
    raise exception 'Missing public.coaching_clients. Run v5 coaching before v6 coaching plans.';
  end if;
end $$;

create table if not exists public.coaching_plans (
  id uuid primary key default gen_random_uuid(),
  coaching_client_id uuid not null unique references public.coaching_clients(id) on delete cascade,
  macro_targets jsonb not null default '{}'::jsonb,
  meal_plan jsonb not null default '[]'::jsonb,
  recipes jsonb not null default '[]'::jsonb,
  grocery_list jsonb not null default '[]'::jsonb,
  admin_notes text,
  client_notes text,
  status text not null default 'draft',
  generated_by_ai boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'coaching_plans_status_check'
      and conrelid = 'public.coaching_plans'::regclass
  ) then
    alter table public.coaching_plans
      add constraint coaching_plans_status_check
      check (status in ('draft', 'ready_for_client', 'published', 'archived'));
  end if;
end $$;

create index if not exists idx_coaching_plans_client_id
  on public.coaching_plans(coaching_client_id);

create index if not exists idx_coaching_plans_status
  on public.coaching_plans(status);

drop trigger if exists set_coaching_plans_updated_at on public.coaching_plans;
create trigger set_coaching_plans_updated_at
  before update on public.coaching_plans
  for each row execute function public.set_updated_at();

alter table public.coaching_plans enable row level security;

drop policy if exists "Admins full access to coaching plans" on public.coaching_plans;
create policy "Admins full access to coaching plans"
  on public.coaching_plans for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Coaching clients can view published plans" on public.coaching_plans;
create policy "Coaching clients can view published plans"
  on public.coaching_plans for select
  using (
    status = 'published'
    and exists (
      select 1
      from public.coaching_clients cc
      where cc.id = coaching_plans.coaching_client_id
        and cc.user_id = auth.uid()
    )
  );
