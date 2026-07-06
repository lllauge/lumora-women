-- ============================================================
-- LUMORA WOMEN — Coach Weekly Reviews Schema v18
-- Structured weekly coach review ("What I saw / What we're
-- changing / Your focus this week") pinned to the client's
-- Today page. One row per client per week.
-- Run this AFTER v8 in Supabase SQL Editor. Safe to re-run.
-- ============================================================

do $$
begin
  if to_regclass('public.coaching_daily_logs') is null then
    raise exception 'Missing public.coaching_daily_logs. Run v8 before v18.';
  end if;
end $$;

create table if not exists public.coaching_reviews (
  id uuid primary key default gen_random_uuid(),
  coaching_client_id uuid not null references public.coaching_clients(id) on delete cascade,
  -- Monday of the week the review covers, in the coaching time zone.
  week_of date not null,
  what_i_saw text not null default '',
  what_changed text not null default '',
  focus text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (coaching_client_id, week_of)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'coaching_reviews_length_check'
      and conrelid = 'public.coaching_reviews'::regclass
  ) then
    alter table public.coaching_reviews
      add constraint coaching_reviews_length_check
      check (
        char_length(what_i_saw) <= 2000
        and char_length(what_changed) <= 2000
        and char_length(focus) <= 2000
        and char_length(what_i_saw) + char_length(what_changed) + char_length(focus) >= 1
      );
  end if;
end $$;

create index if not exists idx_coaching_reviews_client_week
  on public.coaching_reviews(coaching_client_id, week_of desc);

drop trigger if exists set_coaching_reviews_updated_at on public.coaching_reviews;
create trigger set_coaching_reviews_updated_at
  before update on public.coaching_reviews
  for each row execute function public.set_updated_at();

alter table public.coaching_reviews enable row level security;

drop policy if exists "Admins full access to coaching reviews" on public.coaching_reviews;
create policy "Admins full access to coaching reviews"
  on public.coaching_reviews for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Coaching clients can view own reviews" on public.coaching_reviews;
create policy "Coaching clients can view own reviews"
  on public.coaching_reviews for select
  using (
    exists (
      select 1 from public.coaching_clients cc
      where cc.id = coaching_reviews.coaching_client_id
        and cc.user_id = auth.uid()
    )
  );
