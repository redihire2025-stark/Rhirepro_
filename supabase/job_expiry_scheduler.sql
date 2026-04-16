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
  set status = 'Expired'
  where status = 'Active'
    and deadline is not null
    and (
      (deadline at time zone 'Asia/Kolkata')::date < (now() at time zone 'Asia/Kolkata')::date
      or (
        (deadline at time zone 'Asia/Kolkata')::date = (now() at time zone 'Asia/Kolkata')::date
        and (
          deadline_time is null
          or deadline_time <= to_char(now() at time zone 'Asia/Kolkata', 'HH24:MI')
        )
      )
    );
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
--   and (deadline at time zone 'Asia/Kolkata')::date < ((now() at time zone 'Asia/Kolkata')::date - 30);
