-- ============================================================
-- LUMORA WOMEN — Database Schema v2
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID
create extension if not exists "uuid-ossp";

-- ============================================================
-- DROP OLD TABLES (clean slate)
-- ============================================================
drop table if exists public.downloads cascade;
drop table if exists public.lesson_progress cascade;
drop table if exists public.enrollments cascade;
drop table if exists public.lessons cascade;
drop table if exists public.modules cascade;
drop table if exists public.courses cascade;
drop table if exists public.blog_posts cascade;
drop table if exists public.orders cascade;
drop table if exists public.email_subscribers cascade;
drop table if exists public.users cascade;
drop table if exists public.profiles cascade;
drop table if exists public.lesson_resources cascade;
drop table if exists public.products cascade;

drop function if exists public.is_admin() cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.handle_updated_at() cascade;

-- ============================================================
-- CREATE ALL TABLES FIRST
-- ============================================================

create table public.users (
  id          uuid references auth.users(id) on delete cascade primary key,
  email       text not null,
  first_name  text,
  last_name   text,
  role        text not null default 'student' check (role in ('student', 'admin')),
  created_at  timestamptz not null default now()
);

create table public.courses (
  id            uuid primary key default uuid_generate_v4(),
  title         text not null,
  subtitle      text,
  description   text,
  price         numeric(10,2) not null default 0,
  is_free       boolean not null default false,
  thumbnail_url text,
  published     boolean not null default false,
  created_at    timestamptz not null default now()
);

create table public.modules (
  id           uuid primary key default uuid_generate_v4(),
  course_id    uuid not null references public.courses(id) on delete cascade,
  title        text not null,
  order_number integer not null default 0
);

create table public.lessons (
  id           uuid primary key default uuid_generate_v4(),
  module_id    uuid not null references public.modules(id) on delete cascade,
  title        text not null,
  content      text,
  video_url    text,
  order_number integer not null default 0
);

create table public.enrollments (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  course_id   uuid not null references public.courses(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create table public.lesson_progress (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  lesson_id    uuid not null references public.lessons(id) on delete cascade,
  completed    boolean not null default false,
  completed_at timestamptz,
  unique (user_id, lesson_id)
);

create table public.downloads (
  id        uuid primary key default uuid_generate_v4(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  file_name text not null,
  file_url  text not null,
  file_type text
);

create table public.blog_posts (
  id                 uuid primary key default uuid_generate_v4(),
  title              text not null,
  slug               text not null unique,
  body               text,
  category           text,
  featured_image_url text,
  published          boolean not null default false,
  created_at         timestamptz not null default now()
);

create table public.orders (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid references auth.users(id) on delete set null,
  course_id         uuid references public.courses(id) on delete set null,
  amount            numeric(10,2) not null,
  stripe_payment_id text,
  status            text not null default 'pending' check (status in ('pending','paid','failed','refunded')),
  created_at        timestamptz not null default now()
);

create table public.email_subscribers (
  id            uuid primary key default uuid_generate_v4(),
  email         text not null unique,
  first_name    text,
  subscribed_at timestamptz not null default now()
);

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================
alter table public.users             enable row level security;
alter table public.courses           enable row level security;
alter table public.modules           enable row level security;
alter table public.lessons           enable row level security;
alter table public.enrollments       enable row level security;
alter table public.lesson_progress   enable row level security;
alter table public.downloads         enable row level security;
alter table public.blog_posts        enable row level security;
alter table public.orders            enable row level security;
alter table public.email_subscribers enable row level security;

-- ============================================================
-- ADMIN HELPER (must exist before policies reference it)
-- ============================================================
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- ============================================================
-- ALL POLICIES (all tables exist by this point)
-- ============================================================

-- users
create policy "Users can read own record"   on public.users for select using (auth.uid() = id);
create policy "Users can update own record" on public.users for update using (auth.uid() = id);
create policy "Admins full access to users" on public.users for all    using (public.is_admin());

-- courses
create policy "Published courses visible to all" on public.courses for select using (published = true);
create policy "Admins full access to courses"    on public.courses for all    using (public.is_admin());

-- modules
create policy "Modules visible for published courses" on public.modules for select
  using (exists (select 1 from public.courses where id = course_id and published = true));
create policy "Admins full access to modules" on public.modules for all using (public.is_admin());

-- lessons
create policy "Enrolled users can view lessons" on public.lessons for select
  using (
    exists (
      select 1 from public.enrollments e
      join public.modules m on m.id = lessons.module_id
      where e.user_id = auth.uid() and e.course_id = m.course_id
    )
  );
create policy "Admins full access to lessons" on public.lessons for all using (public.is_admin());

-- enrollments
create policy "Users can view own enrollments"   on public.enrollments for select using (auth.uid() = user_id);
create policy "Users can insert own enrollments" on public.enrollments for insert with check (auth.uid() = user_id);
create policy "Admins full access to enrollments" on public.enrollments for all using (public.is_admin());

-- lesson_progress
create policy "Users can manage own progress"    on public.lesson_progress for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Admins full access to progress"   on public.lesson_progress for all using (public.is_admin());

-- downloads
create policy "Enrolled users can view downloads" on public.downloads for select
  using (
    exists (
      select 1 from public.enrollments e
      join public.lessons l on l.id = downloads.lesson_id
      join public.modules m on m.id = l.module_id
      where e.user_id = auth.uid() and e.course_id = m.course_id
    )
  );
create policy "Admins full access to downloads" on public.downloads for all using (public.is_admin());

-- blog_posts
create policy "Published posts visible to all" on public.blog_posts for select using (published = true);
create policy "Admins full access to blog"     on public.blog_posts for all    using (public.is_admin());

-- orders
create policy "Users can view own orders"      on public.orders for select using (auth.uid() = user_id);
create policy "Service role can insert orders" on public.orders for insert with check (true);
create policy "Admins full access to orders"   on public.orders for all    using (public.is_admin());

-- email_subscribers
create policy "Anyone can subscribe"               on public.email_subscribers for insert with check (true);
create policy "Admins full access to subscribers"  on public.email_subscribers for all using (public.is_admin());

-- ============================================================
-- AUTO-CREATE USER ROW ON SIGNUP
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, first_name, last_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    coalesce(new.raw_user_meta_data->>'role', 'student')
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
