-- ============================================================
-- LUMORA WOMEN — Database Schema v4 Security Hardening
-- Run this AFTER v2/v3 in Supabase SQL Editor.
-- Every statement is idempotent — safe to re-run.
-- ============================================================

-- Paid course protection:
-- Enrollments must be created by trusted server routes only:
--   - /api/enrollments for verified free courses
--   - Stripe webhook for paid courses
-- The Supabase service role bypasses RLS, so public insert policies are not needed.
drop policy if exists "Users can insert own enrollments" on public.enrollments;

-- Order rows must never be client-created. The Stripe webhook writes these with
-- the service role after verifying Stripe's webhook signature.
drop policy if exists "Service role can insert orders" on public.orders;

-- Lesson progress should only be readable/writable by the owning user when that
-- user is enrolled in the lesson's course.
drop policy if exists "Users can manage own progress" on public.lesson_progress;
create policy "Enrolled users can manage own progress"
  on public.lesson_progress for all
  using (
    auth.uid() = user_id
    and exists (
      select 1
      from public.lessons l
      join public.modules m on m.id = l.module_id
      join public.enrollments e on e.course_id = m.course_id
      where l.id = lesson_progress.lesson_id
        and e.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.lessons l
      join public.modules m on m.id = l.module_id
      join public.enrollments e on e.course_id = m.course_id
      where l.id = lesson_progress.lesson_id
        and e.user_id = auth.uid()
    )
  );

-- Stripe may retry webhooks. This keeps duplicate payment events from creating
-- duplicate order rows. Multiple NULL values remain allowed.
create unique index if not exists idx_orders_stripe_payment_id_unique
  on public.orders(stripe_payment_id)
  where stripe_payment_id is not null;
