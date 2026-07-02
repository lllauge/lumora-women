-- Require administrator AAL2 or a verified client email-code session for
-- private coaching data. Run after supabase-schema-v15-mfa-enforcement.sql.

create table if not exists public.client_email_mfa_challenges (
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0 check (attempts between 0 and 10),
  created_at timestamptz not null default now(),
  primary key (user_id, session_id)
);

create table if not exists public.client_email_mfa_sessions (
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id text not null,
  verified_at timestamptz not null default now(),
  expires_at timestamptz not null,
  primary key (user_id, session_id)
);

alter table public.client_email_mfa_challenges enable row level security;
alter table public.client_email_mfa_sessions enable row level security;
revoke all on public.client_email_mfa_challenges from anon, authenticated;
revoke all on public.client_email_mfa_sessions from anon, authenticated;

create index if not exists client_email_mfa_challenges_expiry_idx
  on public.client_email_mfa_challenges (expires_at);
create index if not exists client_email_mfa_sessions_expiry_idx
  on public.client_email_mfa_sessions (expires_at);

create or replace function public.has_required_private_data_auth()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when coalesce(
      (select u.role from public.users u where u.id = (select auth.uid())),
      'user'
    ) = 'admin'
      then (select auth.jwt()->>'aal') = 'aal2'
    else exists (
      select 1
      from public.client_email_mfa_sessions verified
      where verified.user_id = (select auth.uid())
        and verified.session_id = (select auth.jwt()->>'session_id')
        and verified.expires_at > now()
    )
  end;
$$;

revoke all on function public.has_required_private_data_auth() from public;
grant execute on function public.has_required_private_data_auth() to authenticated;

do $$
declare
  table_name text;
  policy_name constant text := 'Require MFA for private coaching data';
begin
  foreach table_name in array array[
    'coaching_orders',
    'coaching_clients',
    'coaching_onboarding',
    'coaching_plans',
    'coaching_progress_logs',
    'coaching_daily_logs',
    'coaching_messages'
  ]
  loop
    if to_regclass('public.' || table_name) is not null then
      execute format('drop policy if exists %I on public.%I', policy_name, table_name);
      execute format(
        'create policy %I on public.%I as restrictive for all to authenticated using ((select public.has_required_private_data_auth())) with check ((select public.has_required_private_data_auth()))',
        policy_name,
        table_name
      );
    end if;
  end loop;
end
$$;
