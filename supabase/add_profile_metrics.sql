-- Migration to add profile views and recruiter searches tracking
-- Run this in your Supabase Dashboard -> SQL Editor -> Run

-- 1. Add columns to profiles table if they don't exist
alter table public.profiles add column if not exists profile_views integer default 0;
alter table public.profiles add column if not exists recruiter_searches integer default 0;

-- 2. Create security definer function to increment profile views (bypasses RLS safely)
create or replace function public.increment_profile_views(target_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set profile_views = coalesce(profile_views, 0) + 1
  where id = target_profile_id;
end;
$$;

-- 3. Create security definer function to increment recruiter searches (bypasses RLS safely)
create or replace function public.increment_recruiter_searches(target_profile_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set recruiter_searches = coalesce(recruiter_searches, 0) + 1
  where id = any(target_profile_ids);
end;
$$;

-- Grant execution permissions to authenticated users and anon users
grant execute on function public.increment_profile_views(uuid) to anon, authenticated;
grant execute on function public.increment_recruiter_searches(uuid[]) to anon, authenticated;
