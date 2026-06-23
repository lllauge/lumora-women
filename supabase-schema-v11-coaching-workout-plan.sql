-- ============================================================
-- LUMORA WOMEN — Coaching workout plan column v11
-- Run this in the Supabase SQL Editor. Safe to re-run.
-- Adds the workout_plan jsonb column so the plan editor's workout
-- section persists and shows up on the client portal.
-- ============================================================

alter table public.coaching_plans
  add column if not exists workout_plan jsonb not null default '[]'::jsonb;
