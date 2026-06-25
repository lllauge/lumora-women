-- ============================================================
-- Recipe Library: Fiber Macro
-- ============================================================
-- Paste-mode recipes need fiber alongside the other macros so we
-- can scale published fiber down to the client's serving size.

alter table public.recipe_library
  add column if not exists fiber numeric;
