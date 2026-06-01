-- =============================================================
-- RhirePro — Job Expiry Status Scheduler
-- Run this in Supabase SQL Editor after schema.sql
-- =============================================================

create extension if not exists pg_cron;

create or replace function public.mark_expired_jobs()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.jobs
  set deadline = created_at + interval '15 days'
  where deadline is null;

  insert into public.notifications(user_id, user_type, title, message, type, job_id, related_id, notification_key, is_read)
  select
    recruiter_id,
    'recruiter',
    'Job Expiring Soon',
    'Your job ''' || title || ''' will expire in 7 days.',
    'expiry_warning',
    id,
    id,
    'job:' || id || ':expiry_warning:7:' || extract(epoch from deadline)::bigint,
    false
  from public.jobs
  where status in ('Active', 'Paused')
    and deadline > now() + interval '6 days'
    and deadline <= now() + interval '7 days'
  on conflict (notification_key) do nothing;

  insert into public.notifications(user_id, user_type, title, message, type, job_id, related_id, notification_key, is_read)
  select
    recruiter_id,
    'recruiter',
    'Job Expiring Soon',
    'Your job ''' || title || ''' will expire in 3 days.',
    'expiry_warning',
    id,
    id,
    'job:' || id || ':expiry_warning:3:' || extract(epoch from deadline)::bigint,
    false
  from public.jobs
  where status in ('Active', 'Paused')
    and deadline > now() + interval '2 days'
    and deadline <= now() + interval '3 days'
  on conflict (notification_key) do nothing;

  insert into public.notifications(user_id, user_type, title, message, type, job_id, related_id, notification_key, is_read)
  select
    recruiter_id,
    'recruiter',
    'Job Expiring Tomorrow',
    'Your job ''' || title || ''' will expire tomorrow.',
    'expiry_warning',
    id,
    id,
    'job:' || id || ':expiry_warning:1:' || extract(epoch from deadline)::bigint,
    false
  from public.jobs
  where status in ('Active', 'Paused')
    and deadline > now()
    and deadline <= now() + interval '1 day'
  on conflict (notification_key) do nothing;

  insert into public.notifications(user_id, user_type, title, message, type, job_id, related_id, notification_key, is_read)
  select
    recruiter_id,
    'recruiter',
    'Job Expired',
    'Your job ''' || title || ''' has expired.',
    'expired',
    id,
    id,
    'job:' || id || ':expired:' || extract(epoch from deadline)::bigint,
    false
  from public.jobs
  where status in ('Active', 'Paused')
    and deadline is not null
    and deadline <= now()
  on conflict (notification_key) do nothing;

  update public.jobs
  set status = 'Expired'
  where status in ('Active', 'Paused')
    and deadline is not null
    and deadline <= now();
end;
$$;

do $$
declare
  existing_job_id bigint;
begin
  select jobid
    into existing_job_id
  from cron.job
  where jobname = 'mark-expired-jobs'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end $$;

select cron.schedule(
  'mark-expired-jobs',
  '*/5 * * * *',
  $$select public.mark_expired_jobs();$$
);

-- Optional manual run once after installing the scheduler
select public.mark_expired_jobs();

-- Optional later cleanup strategy:
-- delete from public.jobs
-- where status = 'Expired'
--   and deadline is not null
--   and deadline < now() - interval '30 days';
