-- Migration to add recruiter usage tracking columns (resumes viewed, keywords searched)
-- Run this in your Supabase Dashboard -> SQL Editor -> Run

-- 1. Add columns to recruiter_profiles table if they don't exist
alter table public.recruiter_profiles add column if not exists resumes_viewed_count integer default 0;
alter table public.recruiter_profiles add column if not exists keywords_used text[] default '{}';

-- 2. Create security definer function to increment recruiter resume views safely
create or replace function public.increment_recruiter_resume_views(p_recruiter_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.recruiter_profiles
  set resumes_viewed_count = coalesce(resumes_viewed_count, 0) + 1
  where id = p_recruiter_id;
end;
$$;

-- 3. Create security definer function to track keywords used by recruiter safely
create or replace function public.track_recruiter_keyword(p_recruiter_id uuid, p_keyword text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_keyword is not null and trim(p_keyword) <> '' then
    update public.recruiter_profiles
    set keywords_used = array(
      select distinct x
      from unnest(array_append(coalesce(keywords_used, '{}'), trim(lower(p_keyword)))) x
    )
    where id = p_recruiter_id;
  end if;
end;
$$;

-- 4. Grant execution permissions to authenticated users and anon users
grant execute on function public.increment_recruiter_resume_views(uuid) to anon, authenticated;
grant execute on function public.track_recruiter_keyword(uuid, text) to anon, authenticated;

-- 5. Update get_org_members_with_stats helper function to return tracking columns
create or replace function public.get_org_members_with_stats(p_admin_id uuid)
returns table (
  id                   uuid,
  email                text,
  recruiter_name       text,
  org_role             text,
  is_active            boolean,
  jobs_count           bigint,
  applications_count   bigint,
  hires_count          bigint,
  resumes_viewed_count integer,
  keywords_used        text[],
  created_at           timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    rp.id,
    rp.email,
    rp.recruiter_name,
    rp.org_role,
    coalesce(rp.is_active, true) as is_active,
    coalesce(j.cnt,  0)          as jobs_count,
    coalesce(a.cnt,  0)          as applications_count,
    coalesce(h.cnt,  0)          as hires_count,
    coalesce(rp.resumes_viewed_count, 0) as resumes_viewed_count,
    coalesce(rp.keywords_used, array[]::text[]) as keywords_used,
    rp.created_at
  FROM recruiter_profiles rp
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::bigint AS cnt FROM jobs WHERE recruiter_id = rp.id
  ) j ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::bigint AS cnt FROM applications WHERE recruiter_id = rp.id
  ) a ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::bigint AS cnt FROM applications
    WHERE  recruiter_id = rp.id AND status IN ('Hired', 'Joined')
  ) h ON true
  WHERE rp.id = p_admin_id
     OR rp.org_admin_id = p_admin_id
  ORDER BY
    (CASE WHEN rp.id = p_admin_id THEN 0 ELSE 1 END),
    rp.org_role DESC,
    rp.recruiter_name;
$$;

grant execute on function public.get_org_members_with_stats(uuid) to authenticated;
