-- =============================================================
-- RhirePro — Backfill job seeker profile data for Google sign-ups
-- Run in: Supabase Dashboard → SQL Editor → Run
--
-- Bug: jobseekers who signed up with "Continue with Google" can end up
-- with profiles.first_name / last_name / avatar_url = NULL. This happens
-- for any row created before the on_auth_user_created trigger learned to
-- read Google's `full_name`/`name`/`avatar_url`/`picture` metadata keys
-- (see handle_new_user() in schema.sql), or if that trigger fix was never
-- re-applied to this database. The Super Admin → Job Seekers panel reads
-- straight from profiles.first_name/last_name, so those rows show up as
-- "—" with only an email.
--
-- This script is idempotent — safe to re-run:
--   1) Re-installs the current (fixed) handle_new_user() trigger function,
--      so it's a no-op if already up to date and a fix if it wasn't.
--   2) Backfills existing profiles rows that are missing first_name/
--      last_name/avatar_url from auth.users.raw_user_meta_data, without
--      touching rows that already have real data.
-- =============================================================

-- 1) Ensure the trigger function matches schema.sql (idempotent re-install)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_first_name text;
  v_last_name  text;
  v_full_name  text;
  v_avatar_url text;
begin
  if new.raw_user_meta_data->>'role' = 'recruiter' then
    insert into public.recruiter_profiles (id, email, recruiter_name, company_name, industry, company_size, phone)
    values (
      new.id, new.email,
      new.raw_user_meta_data->>'recruiter_name',
      new.raw_user_meta_data->>'company_name',
      new.raw_user_meta_data->>'industry',
      new.raw_user_meta_data->>'company_size',
      new.raw_user_meta_data->>'phone'
    )
    on conflict (id) do nothing;
  else
    v_first_name := new.raw_user_meta_data->>'first_name';
    v_last_name  := new.raw_user_meta_data->>'last_name';
    v_full_name  := coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name');
    v_avatar_url := coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture');

    if v_first_name is null and v_full_name is not null then
      v_first_name := split_part(v_full_name, ' ', 1);
      v_last_name  := nullif(trim(substr(v_full_name, length(split_part(v_full_name, ' ', 1)) + 2)), '');
    end if;

    insert into public.profiles (id, email, first_name, last_name, phone, experience_type, avatar_url)
    values (
      new.id, new.email,
      v_first_name,
      v_last_name,
      new.raw_user_meta_data->>'phone',
      coalesce(new.raw_user_meta_data->>'experience', 'fresher'),
      v_avatar_url
    )
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2) Backfill existing jobseeker rows missing name/avatar from auth metadata
update public.profiles p
set
  first_name = coalesce(
    nullif(p.first_name, ''),
    u.raw_user_meta_data->>'first_name',
    split_part(coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'), ' ', 1)
  ),
  last_name = coalesce(
    nullif(p.last_name, ''),
    u.raw_user_meta_data->>'last_name',
    nullif(trim(substr(
      coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
      length(split_part(coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'), ' ', 1)) + 2
    )), '')
  ),
  avatar_url = coalesce(
    p.avatar_url,
    u.raw_user_meta_data->>'avatar_url',
    u.raw_user_meta_data->>'picture'
  )
from auth.users u
where u.id = p.id
  and (p.first_name is null or p.first_name = '' or p.avatar_url is null)
  and (u.raw_user_meta_data->>'full_name' is not null or u.raw_user_meta_data->>'name' is not null
       or u.raw_user_meta_data->>'first_name' is not null or u.raw_user_meta_data->>'avatar_url' is not null
       or u.raw_user_meta_data->>'picture' is not null);
