-- =============================================================
-- RhirePro — Super Admin: Activity Feed Backfill
-- Run in: Supabase Dashboard → SQL Editor → Run
-- Run AFTER: super_admin_migration.sql
--
-- The activity_events triggers only fire on NEW inserts/updates going
-- forward, so activity_events is empty until fresh signups/jobs/
-- applications happen. This backfills real, existing historical rows
-- (most recent 200 per category) so the Live Activity feed isn't empty
-- on first load. Safe to re-run — skips entities already recorded.
-- =============================================================

-- Recruiter signups
insert into public.activity_events (event_type, actor_id, actor_type, entity_type, entity_id, title, description, created_at)
select 'recruiter_signup', rp.id, 'recruiter', 'recruiter_profiles', rp.id,
       'New recruiter signed up',
       coalesce(rp.recruiter_name, rp.email) || ' (' || coalesce(rp.company_name, 'no company set') || ')',
       rp.created_at
from public.recruiter_profiles rp
where not exists (
  select 1 from public.activity_events ae
  where ae.entity_type = 'recruiter_profiles' and ae.entity_id = rp.id and ae.event_type = 'recruiter_signup'
)
order by rp.created_at desc
limit 200;

-- Job seeker signups
insert into public.activity_events (event_type, actor_id, actor_type, entity_type, entity_id, title, description, created_at)
select 'jobseeker_signup', p.id, 'jobseeker', 'profiles', p.id,
       'New job seeker signed up',
       coalesce(nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ''), p.email),
       p.created_at
from public.profiles p
where not exists (
  select 1 from public.activity_events ae
  where ae.entity_type = 'profiles' and ae.entity_id = p.id and ae.event_type = 'jobseeker_signup'
)
order by p.created_at desc
limit 200;

-- Jobs posted
insert into public.activity_events (event_type, actor_id, actor_type, entity_type, entity_id, title, description, created_at)
select 'job_posted', j.recruiter_id, 'recruiter', 'jobs', j.id,
       'New job posted', j.title || coalesce(' at ' || j.company_name, ''),
       j.created_at
from public.jobs j
where not exists (
  select 1 from public.activity_events ae
  where ae.entity_type = 'jobs' and ae.entity_id = j.id and ae.event_type = 'job_posted'
)
order by j.created_at desc
limit 200;

-- Applications submitted
insert into public.activity_events (event_type, actor_id, actor_type, entity_type, entity_id, title, description, created_at)
select 'application_submitted', a.profile_id, 'jobseeker', 'applications', a.id,
       'New application submitted', 'Applied to ' || coalesce(j.title, 'a job'),
       a.applied_at
from public.applications a
left join public.jobs j on j.id = a.job_id
where not exists (
  select 1 from public.activity_events ae
  where ae.entity_type = 'applications' and ae.entity_id = a.id and ae.event_type = 'application_submitted'
)
order by a.applied_at desc
limit 200;

-- Most recent application status changes (from the existing status-history table)
insert into public.activity_events (event_type, actor_id, actor_type, entity_type, entity_id, title, description, created_at)
select 'application_status_changed', h.changed_by, 'recruiter', 'applications', h.application_id,
       'Application status changed',
       coalesce(h.old_status || ' -> ', '') || h.new_status,
       h.changed_at
from public.application_status_history h
where not exists (
  select 1 from public.activity_events ae
  where ae.entity_type = 'applications' and ae.entity_id = h.application_id
    and ae.event_type = 'application_status_changed' and ae.created_at = h.changed_at
)
order by h.changed_at desc
limit 200;
