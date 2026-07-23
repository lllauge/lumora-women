-- ============================================================
-- LUMORA WOMEN — Schema v20: lesson habit trackers
--
-- Backs the tickable day trackers inside course lesson guides
-- (e.g. the 14-day tracker in Postpartum Reset · Phase 1).
-- Each row stores which days one user has ticked on one tracker
-- within one lesson, so progress survives logout and devices.
--
-- Read/written from the lesson page (src/app/lesson/[lessonId]/
-- page.tsx) with the user's own session; RLS mirrors
-- lesson_progress: owner + enrolled (admins exempt from the
-- enrollment check, matching how lesson pages let admins preview).
--
-- Run this in the Supabase SQL editor. Every statement is
-- idempotent — safe to re-run.
-- ============================================================

create table if not exists public.habit_tracker_progress (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  lesson_id    uuid        not null references public.lessons(id) on delete cascade,
  tracker_key  text        not null default 'tracker-1',
  checked_days integer[]   not null default '{}',
  updated_at   timestamptz not null default now(),
  unique (user_id, lesson_id, tracker_key)
);

create index if not exists idx_habit_tracker_progress_user_lesson
  on public.habit_tracker_progress(user_id, lesson_id);

alter table public.habit_tracker_progress enable row level security;

drop policy if exists "Enrolled users can manage own tracker progress"
  on public.habit_tracker_progress;
create policy "Enrolled users can manage own tracker progress"
  on public.habit_tracker_progress for all
  using (
    auth.uid() = user_id
    and (
      public.is_admin()
      or exists (
        select 1
        from public.lessons l
        join public.modules m on m.id = l.module_id
        join public.enrollments e on e.course_id = m.course_id
        where l.id = habit_tracker_progress.lesson_id
          and e.user_id = auth.uid()
      )
    )
  )
  with check (
    auth.uid() = user_id
    and (
      public.is_admin()
      or exists (
        select 1
        from public.lessons l
        join public.modules m on m.id = l.module_id
        join public.enrollments e on e.course_id = m.course_id
        where l.id = habit_tracker_progress.lesson_id
          and e.user_id = auth.uid()
      )
    )
  );
