-- ============================================================
-- LUMORA WOMEN — Coaching Plan State + Progress Logs Schema v7
-- Run this AFTER v6 coaching plans in Supabase SQL Editor.
-- Safe to re-run.
-- ============================================================

do $$
begin
  if to_regclass('public.coaching_plans') is null then
    raise exception 'Missing public.coaching_plans. Run v6 coaching plans before v7.';
  end if;
end $$;

alter table public.coaching_plans
  add column if not exists planning_inputs jsonb not null default '{}'::jsonb;

create table if not exists public.coaching_progress_logs (
  id uuid primary key default gen_random_uuid(),
  coaching_client_id uuid not null references public.coaching_clients(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  logged_at date not null default current_date,
  weight text,
  body_fat text,
  waist text,
  hips text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.coaching_progress_logs
  add column if not exists body_fat text;

create index if not exists idx_coaching_progress_logs_client_id
  on public.coaching_progress_logs(coaching_client_id);

create index if not exists idx_coaching_progress_logs_logged_at
  on public.coaching_progress_logs(logged_at desc);

drop trigger if exists set_coaching_progress_logs_updated_at on public.coaching_progress_logs;
create trigger set_coaching_progress_logs_updated_at
  before update on public.coaching_progress_logs
  for each row execute function public.set_updated_at();

alter table public.coaching_progress_logs enable row level security;

drop policy if exists "Admins full access to coaching progress logs" on public.coaching_progress_logs;
create policy "Admins full access to coaching progress logs"
  on public.coaching_progress_logs for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Coaching clients can view own progress logs" on public.coaching_progress_logs;
create policy "Coaching clients can view own progress logs"
  on public.coaching_progress_logs for select
  using (
    exists (
      select 1
      from public.coaching_clients cc
      where cc.id = coaching_progress_logs.coaching_client_id
        and cc.user_id = auth.uid()
    )
  );
