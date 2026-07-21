-- =============================================================
-- RhirePro — Super Admin Portal Migration (Phase 1)
-- Run in: Supabase Dashboard → SQL Editor → Run
-- Run AFTER: schema.sql, plans_migration.sql, org_admin_migration.sql,
--            status_workflow_migration.sql
-- Additive only — safe to run multiple times.
-- =============================================================

-- ── 1. SUPER ADMINS ──────────────────────────────────────────
create table if not exists public.super_admins (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text unique not null,
  full_name     text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  last_login_at timestamptz
);

alter table public.super_admins enable row level security;

drop policy if exists "Super admins read own row" on public.super_admins;
create policy "Super admins read own row"
  on public.super_admins for select
  using (id = auth.uid());

-- No client insert/update/delete policy — rows are only ever written by the
-- service-role super-admin-login Netlify function.

-- ── 2. GATEKEEPER FUNCTION ───────────────────────────────────
create or replace function public.is_super_admin(p_uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.super_admins
    where id = p_uid and is_active = true
  );
$$;

grant execute on function public.is_super_admin(uuid) to authenticated;

-- ── 3. SCHEMA ADDITION: profiles.is_disabled ─────────────────
-- recruiter_profiles.is_disabled already exists (org_admin_migration.sql).
-- profiles has no equivalent — add it for symmetrical disable/enable.
alter table public.profiles
  add column if not exists is_disabled boolean not null default false;

-- ── 4. ACTIVITY EVENTS (live feed) ───────────────────────────
create table if not exists public.activity_events (
  id          uuid primary key default gen_random_uuid(),
  event_type  text not null check (event_type in (
                'recruiter_signup', 'jobseeker_signup', 'job_posted',
                'application_submitted', 'application_status_changed',
                'payment_success'
              )),
  actor_id    uuid,
  actor_type  text check (actor_type in ('recruiter', 'jobseeker', 'system')),
  entity_type text not null,
  entity_id   uuid not null,
  title       text not null,
  description text,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists activity_events_created_at_idx
  on public.activity_events(created_at desc);
create index if not exists activity_events_type_idx
  on public.activity_events(event_type, created_at desc);

alter table public.activity_events enable row level security;

drop policy if exists "Super admins read activity events" on public.activity_events;
create policy "Super admins read activity events"
  on public.activity_events for select
  using (public.is_super_admin(auth.uid()));

-- No client insert/update/delete policy — rows are written only by the
-- SECURITY DEFINER trigger functions below, which run as table owner and
-- bypass RLS (same pattern as notify_recruiter_on_application in schema.sql).

do $$
begin
  alter publication supabase_realtime add table public.activity_events;
exception
  when duplicate_object then null;
end $$;

-- ── 5. TRIGGERS → activity_events ────────────────────────────

create or replace function public.log_activity_recruiter_signup()
returns trigger language plpgsql security definer as $$
begin
  insert into public.activity_events(event_type, actor_id, actor_type, entity_type, entity_id, title, description)
  values ('recruiter_signup', new.id, 'recruiter', 'recruiter_profiles', new.id,
          'New recruiter signed up',
          coalesce(new.recruiter_name, new.email) || ' (' || coalesce(new.company_name, 'no company set') || ')');
  return new;
end;
$$;
drop trigger if exists on_activity_recruiter_signup on public.recruiter_profiles;
create trigger on_activity_recruiter_signup
  after insert on public.recruiter_profiles
  for each row execute function public.log_activity_recruiter_signup();

create or replace function public.log_activity_jobseeker_signup()
returns trigger language plpgsql security definer as $$
begin
  insert into public.activity_events(event_type, actor_id, actor_type, entity_type, entity_id, title, description)
  values ('jobseeker_signup', new.id, 'jobseeker', 'profiles', new.id,
          'New job seeker signed up',
          coalesce(nullif(trim(coalesce(new.first_name, '') || ' ' || coalesce(new.last_name, '')), ''), new.email));
  return new;
end;
$$;
drop trigger if exists on_activity_jobseeker_signup on public.profiles;
create trigger on_activity_jobseeker_signup
  after insert on public.profiles
  for each row execute function public.log_activity_jobseeker_signup();

create or replace function public.log_activity_job_posted()
returns trigger language plpgsql security definer as $$
begin
  insert into public.activity_events(event_type, actor_id, actor_type, entity_type, entity_id, title, description)
  values ('job_posted', new.recruiter_id, 'recruiter', 'jobs', new.id,
          'New job posted', new.title || coalesce(' at ' || new.company_name, ''));
  return new;
end;
$$;
drop trigger if exists on_activity_job_posted on public.jobs;
create trigger on_activity_job_posted
  after insert on public.jobs
  for each row execute function public.log_activity_job_posted();

create or replace function public.log_activity_application_submitted()
returns trigger language plpgsql security definer as $$
declare
  v_job_title text;
begin
  select title into v_job_title from public.jobs where id = new.job_id;
  insert into public.activity_events(event_type, actor_id, actor_type, entity_type, entity_id, title, description)
  values ('application_submitted', new.profile_id, 'jobseeker', 'applications', new.id,
          'New application submitted', 'Applied to ' || coalesce(v_job_title, 'a job'));
  return new;
end;
$$;
drop trigger if exists on_activity_application_submitted on public.applications;
create trigger on_activity_application_submitted
  after insert on public.applications
  for each row execute function public.log_activity_application_submitted();

create or replace function public.log_activity_application_status_changed()
returns trigger language plpgsql security definer as $$
begin
  if old.status is distinct from new.status then
    insert into public.activity_events(event_type, actor_id, actor_type, entity_type, entity_id, title, description)
    values ('application_status_changed', auth.uid(), 'recruiter', 'applications', new.id,
            'Application status changed', old.status || ' -> ' || new.status);
  end if;
  return new;
end;
$$;
drop trigger if exists on_activity_application_status_changed on public.applications;
create trigger on_activity_application_status_changed
  after update on public.applications
  for each row execute function public.log_activity_application_status_changed();

-- ── 6. ADDITIVE RLS: SUPER ADMIN FULL ACCESS ─────────────────

-- profiles
drop policy if exists "Super admins read profiles" on public.profiles;
create policy "Super admins read profiles" on public.profiles for select
  using (public.is_super_admin(auth.uid()));

drop policy if exists "Super admins update profiles" on public.profiles;
create policy "Super admins update profiles" on public.profiles for update
  using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

-- recruiter_profiles
drop policy if exists "Super admins read recruiter_profiles" on public.recruiter_profiles;
create policy "Super admins read recruiter_profiles" on public.recruiter_profiles for select
  using (public.is_super_admin(auth.uid()));

drop policy if exists "Super admins update recruiter_profiles" on public.recruiter_profiles;
create policy "Super admins update recruiter_profiles" on public.recruiter_profiles for update
  using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

-- jobs (read + update + delete)
drop policy if exists "Super admins read jobs" on public.jobs;
create policy "Super admins read jobs" on public.jobs for select
  using (public.is_super_admin(auth.uid()));

drop policy if exists "Super admins update jobs" on public.jobs;
create policy "Super admins update jobs" on public.jobs for update
  using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

drop policy if exists "Super admins delete jobs" on public.jobs;
create policy "Super admins delete jobs" on public.jobs for delete
  using (public.is_super_admin(auth.uid()));

-- applications (read + update, no delete)
drop policy if exists "Super admins read applications" on public.applications;
create policy "Super admins read applications" on public.applications for select
  using (public.is_super_admin(auth.uid()));

drop policy if exists "Super admins update applications" on public.applications;
create policy "Super admins update applications" on public.applications for update
  using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

-- application_status_history (read-only, for the Applications detail timeline)
drop policy if exists "Super admins read status history" on public.application_status_history;
create policy "Super admins read status history" on public.application_status_history for select
  using (public.is_super_admin(auth.uid()));

-- payment_transactions (read-only)
drop policy if exists "Super admins read payment_transactions" on public.payment_transactions;
create policy "Super admins read payment_transactions" on public.payment_transactions for select
  using (public.is_super_admin(auth.uid()));

-- recruiter_subscriptions (read-only)
drop policy if exists "Super admins read recruiter_subscriptions" on public.recruiter_subscriptions;
create policy "Super admins read recruiter_subscriptions" on public.recruiter_subscriptions for select
  using (public.is_super_admin(auth.uid()));

-- ── 7. DASHBOARD AGGREGATE RPCs ───────────────────────────────

create or replace function public.get_super_admin_dashboard_kpis()
returns table (
  total_recruiters      bigint,
  total_jobseekers      bigint,
  total_jobs            bigint,
  active_jobs           bigint,
  total_applications    bigint,
  total_hires           bigint,
  total_revenue         numeric,
  active_subscriptions  bigint,
  new_recruiters_7d     bigint,
  new_jobseekers_7d     bigint,
  new_applications_7d   bigint
)
language plpgsql security definer set search_path = public stable as $$
begin
  if not public.is_super_admin(auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return query
  select
    (select count(*) from recruiter_profiles),
    (select count(*) from profiles),
    (select count(*) from jobs),
    (select count(*) from jobs where status = 'Active'),
    (select count(*) from applications),
    (select count(*) from applications where status in ('Hired', 'Joined')),
    (select coalesce(sum(final_amount), 0)::numeric from payment_transactions where status = 'success'),
    (select count(*) from recruiter_subscriptions where status = 'active'),
    (select count(*) from recruiter_profiles where created_at > now() - interval '7 days'),
    (select count(*) from profiles where created_at > now() - interval '7 days'),
    (select count(*) from applications where applied_at > now() - interval '7 days');
end;
$$;
grant execute on function public.get_super_admin_dashboard_kpis() to authenticated;

create or replace function public.get_super_admin_signups_timeseries(p_days int default 30)
returns table (day date, recruiters bigint, jobseekers bigint)
language plpgsql security definer set search_path = public stable as $$
begin
  if not public.is_super_admin(auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return query
  select d::date,
    (select count(*) from recruiter_profiles r where r.created_at::date = d::date),
    (select count(*) from profiles p where p.created_at::date = d::date)
  from generate_series(current_date - (greatest(p_days, 1) - 1), current_date, interval '1 day') d
  order by d;
end;
$$;
grant execute on function public.get_super_admin_signups_timeseries(int) to authenticated;

create or replace function public.get_super_admin_applications_timeseries(p_days int default 30)
returns table (day date, applications bigint, hires bigint)
language plpgsql security definer set search_path = public stable as $$
begin
  if not public.is_super_admin(auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return query
  select d::date,
    (select count(*) from applications a where a.applied_at::date = d::date),
    (select count(*) from applications a where a.applied_at::date = d::date and a.status in ('Hired', 'Joined'))
  from generate_series(current_date - (greatest(p_days, 1) - 1), current_date, interval '1 day') d
  order by d;
end;
$$;
grant execute on function public.get_super_admin_applications_timeseries(int) to authenticated;

create or replace function public.get_super_admin_application_funnel()
returns table (status text, count bigint)
language plpgsql security definer set search_path = public stable as $$
begin
  if not public.is_super_admin(auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return query
  select a.status, count(*)::bigint from applications a group by a.status order by count(*) desc;
end;
$$;
grant execute on function public.get_super_admin_application_funnel() to authenticated;
