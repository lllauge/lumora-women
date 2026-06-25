-- ============================================================
-- Recipe Library: Paste-Mode Support
-- ============================================================
-- Adds stored macro totals + total grams to recipe_library so that
-- recipes pasted from external sources (cookbook, blog, etc.) can
-- carry the publisher's published macros instead of being recomputed
-- from per-ingredient USDA matches.
--
-- Presence of a non-null calories value signals "trust these totals,
-- don't recompute from ingredients" to the plan editor.
-- Ingredient grams continue to live inside the ingredient line text
-- (e.g. "150g chicken breast") so the plating engine works the same
-- way regardless of whether grams came from USDA or the paste parser.

alter table public.recipe_library
  add column if not exists calories numeric,
  add column if not exists protein numeric,
  add column if not exists carbs numeric,
  add column if not exists fats numeric,
  add column if not exists total_recipe_grams numeric;
