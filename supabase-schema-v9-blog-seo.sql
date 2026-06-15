-- ============================================================
-- LUMORA WOMEN — Blog SEO Schema v9
-- Adds an editable meta description for blog posts.
-- Run this AFTER v8 in the Supabase SQL Editor.
-- Safe to re-run.
-- ============================================================

do $$
begin
  if to_regclass('public.blog_posts') is null then
    raise exception 'Missing public.blog_posts. Run v2 (and later) before v9.';
  end if;
end $$;

alter table public.blog_posts
  add column if not exists meta_description text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'blog_posts_meta_description_length_check'
      and conrelid = 'public.blog_posts'::regclass
  ) then
    alter table public.blog_posts
      add constraint blog_posts_meta_description_length_check
      check (meta_description is null or char_length(meta_description) <= 200);
  end if;
end $$;
