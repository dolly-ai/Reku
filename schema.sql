-- Run in the Supabase SQL Editor before enabling account sign-in.
-- Existing device-only profiles and transactions remain available for the
-- first account that signs in from that device.

alter table public.profiles
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.profiles
  alter column device_id drop not null;

alter table public.transactions
  add column if not exists client_id uuid;

create unique index if not exists profiles_user_id_unique
  on public.profiles(user_id)
  where user_id is not null;

create unique index if not exists transactions_client_id_unique
  on public.transactions(client_id);

drop function if exists public.claim_legacy_profile(uuid);

create or replace function public.claim_legacy_profile(p_device_id text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  account_profile public.profiles%rowtype;
  legacy_profile public.profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into account_profile
  from public.profiles
  where user_id = auth.uid()
  for update;

  if account_profile.id is null then
    select * into legacy_profile
    from public.profiles
    where id = auth.uid()
      and user_id is null
    for update;

    if legacy_profile.id is not null then
      update public.profiles
      set user_id = auth.uid(),
          device_id = coalesce(device_id, p_device_id)
      where id = legacy_profile.id
      returning * into account_profile;
    end if;
  end if;

  select * into legacy_profile
  from public.profiles
  where device_id = p_device_id
    and user_id is null
  for update;

  if legacy_profile.id is not null then
    if account_profile.id is null then
      update public.profiles
      set user_id = auth.uid()
      where id = legacy_profile.id
      returning * into account_profile;
    else
      update public.profiles
      set name = coalesce(account_profile.name, legacy_profile.name),
          budget_amount = case
            when coalesce(account_profile.budget_amount, 0) = 0 then legacy_profile.budget_amount
            else account_profile.budget_amount
          end,
          budget_period = case
            when coalesce(account_profile.budget_amount, 0) = 0 then legacy_profile.budget_period
            else account_profile.budget_period
          end
      where id = account_profile.id
      returning * into account_profile;

      update public.transactions
      set profile_id = account_profile.id
      where profile_id = legacy_profile.id;

      delete from public.profiles
      where id = legacy_profile.id;
    end if;
  end if;

  if account_profile.id is null then
    begin
      insert into public.profiles (user_id, device_id)
      values (auth.uid(), p_device_id)
      returning * into account_profile;
    exception when unique_violation then
      select * into account_profile
      from public.profiles
      where user_id = auth.uid()
      for update;

      if account_profile.id is null then
        insert into public.profiles (user_id, device_id)
        values (auth.uid(), gen_random_uuid()::text)
        returning * into account_profile;
      end if;
    end;
  end if;

  return account_profile.id;
end;
$$;

revoke all on function public.claim_legacy_profile(text) from public;
grant execute on function public.claim_legacy_profile(text) to authenticated;

do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'transactions')
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      existing_policy.policyname,
      existing_policy.tablename
    );
  end loop;
end;
$$;

alter table public.profiles enable row level security;
alter table public.transactions enable row level security;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.transactions to authenticated;

create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using (user_id = auth.uid());

create policy "Users can create their own profile"
  on public.profiles for insert to authenticated
  with check (user_id = auth.uid());

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can read their own transactions"
  on public.transactions for select to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = transactions.profile_id
        and profiles.user_id = auth.uid()
    )
  );

create policy "Users can create their own transactions"
  on public.transactions for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = transactions.profile_id
        and profiles.user_id = auth.uid()
    )
  );

create policy "Users can update their own transactions"
  on public.transactions for update to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = transactions.profile_id
        and profiles.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = transactions.profile_id
        and profiles.user_id = auth.uid()
    )
  );

create policy "Users can delete their own transactions"
  on public.transactions for delete to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = transactions.profile_id
        and profiles.user_id = auth.uid()
    )
  );