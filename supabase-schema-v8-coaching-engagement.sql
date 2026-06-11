-- ============================================================
-- LUMORA WOMEN — Coaching Client Engagement Schema v8
-- Daily habit logs, coach <-> client messages, client check-ins.
-- Run this AFTER v7 in Supabase SQL Editor.
-- Safe to re-run.
-- ============================================================

do $$
begin
  if to_regclass('public.coaching_progress_logs') is null then
    raise exception 'Missing public.coaching_progress_logs. Run v7 before v8.';
  end if;
end $$;

-- ── Daily habit logs (one row per client per day) ────────────

create table if not exists public.coaching_daily_logs (
  id uuid primary key default gen_random_uuid(),
  coaching_client_id uuid not null references public.coaching_clients(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  log_date date not null default current_date,
  wins jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (coaching_client_id, log_date)
);

create index if not exists idx_coaching_daily_logs_client_date
  on public.coaching_daily_logs(coaching_client_id, log_date desc);

drop trigger if exists set_coaching_daily_logs_updated_at on public.coaching_daily_logs;
create trigger set_coaching_daily_logs_updated_at
  before update on public.coaching_daily_logs
  for each row execute function public.set_updated_at();

alter table public.coaching_daily_logs enable row level security;

drop policy if exists "Admins full access to coaching daily logs" on public.coaching_daily_logs;
create policy "Admins full access to coaching daily logs"
  on public.coaching_daily_logs for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Coaching clients can view own daily logs" on public.coaching_daily_logs;
create policy "Coaching clients can view own daily logs"
  on public.coaching_daily_logs for select
  using (
    exists (
      select 1 from public.coaching_clients cc
      where cc.id = coaching_daily_logs.coaching_client_id
        and cc.user_id = auth.uid()
    )
  );

drop policy if exists "Coaching clients can insert own daily logs" on public.coaching_daily_logs;
create policy "Coaching clients can insert own daily logs"
  on public.coaching_daily_logs for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.coaching_clients cc
      where cc.id = coaching_daily_logs.coaching_client_id
        and cc.user_id = auth.uid()
    )
  );

drop policy if exists "Coaching clients can update own daily logs" on public.coaching_daily_logs;
create policy "Coaching clients can update own daily logs"
  on public.coaching_daily_logs for update
  using (
    exists (
      select 1 from public.coaching_clients cc
      where cc.id = coaching_daily_logs.coaching_client_id
        and cc.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.coaching_clients cc
      where cc.id = coaching_daily_logs.coaching_client_id
        and cc.user_id = auth.uid()
    )
  );

-- ── Coach <-> client messages ────────────────────────────────

create table if not exists public.coaching_messages (
  id uuid primary key default gen_random_uuid(),
  coaching_client_id uuid not null references public.coaching_clients(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  sender text not null,
  body text not null,
  is_check_in boolean not null default false,
  read_by_coach_at timestamptz,
  read_by_client_at timestamptz,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'coaching_messages_sender_check'
      and conrelid = 'public.coaching_messages'::regclass
  ) then
    alter table public.coaching_messages
      add constraint coaching_messages_sender_check
      check (sender in ('client', 'coach'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'coaching_messages_body_length_check'
      and conrelid = 'public.coaching_messages'::regclass
  ) then
    alter table public.coaching_messages
      add constraint coaching_messages_body_length_check
      check (char_length(body) between 1 and 4000);
  end if;
end $$;

create index if not exists idx_coaching_messages_client_created
  on public.coaching_messages(coaching_client_id, created_at);

create index if not exists idx_coaching_messages_coach_unread
  on public.coaching_messages(coaching_client_id)
  where sender = 'client' and read_by_coach_at is null;

alter table public.coaching_messages enable row level security;

drop policy if exists "Admins full access to coaching messages" on public.coaching_messages;
create policy "Admins full access to coaching messages"
  on public.coaching_messages for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Coaching clients can view own messages" on public.coaching_messages;
create policy "Coaching clients can view own messages"
  on public.coaching_messages for select
  using (
    exists (
      select 1 from public.coaching_clients cc
      where cc.id = coaching_messages.coaching_client_id
        and cc.user_id = auth.uid()
    )
  );

drop policy if exists "Coaching clients can send own messages" on public.coaching_messages;
create policy "Coaching clients can send own messages"
  on public.coaching_messages for insert
  with check (
    sender = 'client'
    and user_id = auth.uid()
    and exists (
      select 1 from public.coaching_clients cc
      where cc.id = coaching_messages.coaching_client_id
        and cc.user_id = auth.uid()
    )
  );

-- ── Client check-ins: allow clients to add their own progress logs ──

drop policy if exists "Coaching clients can insert own progress logs" on public.coaching_progress_logs;
create policy "Coaching clients can insert own progress logs"
  on public.coaching_progress_logs for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.coaching_clients cc
      where cc.id = coaching_progress_logs.coaching_client_id
        and cc.user_id = auth.uid()
    )
  );
