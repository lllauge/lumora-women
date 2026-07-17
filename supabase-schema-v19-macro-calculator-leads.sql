-- ============================================================
-- LUMORA WOMEN — Schema v19: macro calculator leads
--
-- Backs the free macro calculator lead magnet at /macro-calculator.
-- Each submission stores the inputs and calculated targets so
-- coaching follow-ups have full context. Written by the service
-- role only (src/app/actions/macro-calculator.ts).
--
-- Run this in the Supabase SQL editor. Every statement is
-- idempotent — safe to re-run.
-- ============================================================

create table if not exists public.macro_calculator_leads (
  id                    uuid        primary key default gen_random_uuid(),
  first_name            text        not null,
  email                 text        not null,
  inputs                jsonb       not null,
  maintenance_calories  integer,
  calories              integer,
  protein_g             integer,
  carbs_g               integer,
  fat_g                 integer,
  goal_applied          text,
  insights              text[],
  created_at            timestamptz not null default now()
);

create index if not exists idx_macro_calculator_leads_email
  on public.macro_calculator_leads(email, created_at desc);

create index if not exists idx_macro_calculator_leads_created
  on public.macro_calculator_leads(created_at desc);

alter table public.macro_calculator_leads enable row level security;
-- No policies = zero client access. Service role key only.
