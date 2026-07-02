-- Require a Supabase AAL2 session for private coaching data.
-- Service-role requests (webhooks and trusted server jobs) bypass RLS.
-- Run after the coaching schema migrations.

-- Retire the legacy application-managed TOTP secrets. Supabase Auth now owns
-- encrypted factor enrollment and exposes only assurance level in the JWT.
update public.users
set totp_secret = null
where totp_secret is not null;

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
        'create policy %I on public.%I as restrictive for all to authenticated using ((select auth.jwt()->>''aal'') = ''aal2'') with check ((select auth.jwt()->>''aal'') = ''aal2'')',
        policy_name,
        table_name
      );
    end if;
  end loop;
end
$$;
