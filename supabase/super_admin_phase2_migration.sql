-- =============================================================
-- RhirePro — Super Admin Portal Migration (Phase 2)
-- Run in: Supabase Dashboard → SQL Editor → Run
-- Run AFTER: super_admin_migration.sql, super_admin_activity_backfill.sql
-- Additive only — safe to run multiple times.
--
-- Scope notes (read before running):
--  - System Health / API Monitoring / Background Jobs / Database / Storage
--    expose ONLY real signals this stack actually has (Postgres system
--    catalogs, pg_cron, storage.objects, and new request/email logs this
--    migration adds). No fabricated CPU/RAM/Redis/queue metrics.
--  - pg_cron is already enabled in this project (job_expiry_scheduler.sql
--    installed the "mark-expired-jobs" job) — this migration adds one more
--    scheduled job, "snapshot-table-sizes", reusing the same extension.
--  - Roles & Permissions ships as a small fixed set (owner/admin/viewer) on
--    super_admins.role, not a dynamic permission builder.
--  - Settings covers a few real, DB-backed platform toggles. It does not
--    expose SMTP/payment/API keys — those stay in Netlify env vars, which
--    is where secrets belong.
-- =============================================================

-- ── 1. COMPANIES (aggregated view over recruiter_profiles) ───
create or replace function public.get_super_admin_companies()
returns table (
  company_name        text,
  recruiter_count      bigint,
  jobs_count           bigint,
  applications_count   bigint,
  industry             text,
  location             text,
  logo_url             text,
  latest_created_at    timestamptz
)
language plpgsql security definer set search_path = public stable as $$
begin
  if not public.is_super_admin(auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return query
  select
    coalesce(nullif(trim(rp.company_name), ''), 'Unaffiliated') as company_name,
    count(distinct rp.id)::bigint as recruiter_count,
    count(distinct j.id)::bigint as jobs_count,
    count(distinct a.id)::bigint as applications_count,
    max(rp.industry) as industry,
    max(rp.location) as location,
    max(rp.logo_url) as logo_url,
    max(rp.created_at) as latest_created_at
  from recruiter_profiles rp
  left join jobs j on j.recruiter_id = rp.id
  left join applications a on a.recruiter_id = rp.id
  group by coalesce(nullif(trim(rp.company_name), ''), 'Unaffiliated')
  order by recruiter_count desc;
end;
$$;
grant execute on function public.get_super_admin_companies() to authenticated;

-- ── 2. SUBSCRIPTIONS: allow super admin to update status ──────
drop policy if exists "Super admins update recruiter_subscriptions" on public.recruiter_subscriptions;
create policy "Super admins update recruiter_subscriptions"
  on public.recruiter_subscriptions for update
  using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

-- ── 3. REVENUE RPCs ────────────────────────────────────────────
create or replace function public.get_super_admin_revenue_timeseries(p_days int default 30)
returns table (day date, revenue numeric, transaction_count bigint)
language plpgsql security definer set search_path = public stable as $$
begin
  if not public.is_super_admin(auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return query
  select d::date,
    coalesce((select sum(final_amount) from payment_transactions
              where status = 'success' and completed_at::date = d::date), 0)::numeric,
    (select count(*) from payment_transactions
              where status = 'success' and completed_at::date = d::date)
  from generate_series(current_date - (greatest(p_days, 1) - 1), current_date, interval '1 day') d
  order by d;
end;
$$;
grant execute on function public.get_super_admin_revenue_timeseries(int) to authenticated;

create or replace function public.get_super_admin_revenue_by_plan()
returns table (plan_id text, revenue numeric, transaction_count bigint)
language plpgsql security definer set search_path = public stable as $$
begin
  if not public.is_super_admin(auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return query
  select p.plan_id, coalesce(sum(p.final_amount), 0)::numeric, count(*)::bigint
  from payment_transactions p
  where p.status = 'success'
  group by p.plan_id
  order by revenue desc;
end;
$$;
grant execute on function public.get_super_admin_revenue_by_plan() to authenticated;

-- ── 4. EMAIL LOGS (new — populated by Netlify functions going forward) ─
create table if not exists public.email_logs (
  id             uuid primary key default gen_random_uuid(),
  recipient_email text not null,
  email_type     text not null check (email_type in ('otp', 'reset_otp', 'invite', 'other')),
  subject        text,
  status         text not null check (status in ('sent', 'failed')),
  error_message  text,
  created_at     timestamptz not null default now()
);
create index if not exists email_logs_created_at_idx on public.email_logs(created_at desc);

alter table public.email_logs enable row level security;
drop policy if exists "Super admins read email logs" on public.email_logs;
create policy "Super admins read email logs"
  on public.email_logs for select
  using (public.is_super_admin(auth.uid()));
-- No client insert/update/delete policy — written only by service-role
-- Netlify functions (send-otp.mjs, send-invite.mjs, super-admin-invite.mjs).

-- ── 5. NOTIFICATIONS: super admin read access ──────────────────
drop policy if exists "Super admins read notifications" on public.notifications;
create policy "Super admins read notifications"
  on public.notifications for select
  using (public.is_super_admin(auth.uid()));

-- ── 6. ADMIN AUDIT LOG (new) ────────────────────────────────────
create table if not exists public.admin_audit_log (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid not null,
  actor_email  text,
  action       text not null,
  entity_type  text not null,
  entity_id    text,
  before_value jsonb,
  after_value  jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists admin_audit_log_created_at_idx on public.admin_audit_log(created_at desc);
create index if not exists admin_audit_log_entity_idx on public.admin_audit_log(entity_type, entity_id);

alter table public.admin_audit_log enable row level security;
drop policy if exists "Super admins read audit log" on public.admin_audit_log;
create policy "Super admins read audit log"
  on public.admin_audit_log for select
  using (public.is_super_admin(auth.uid()));

drop policy if exists "Super admins write own audit log" on public.admin_audit_log;
create policy "Super admins write own audit log"
  on public.admin_audit_log for insert
  with check (public.is_super_admin(auth.uid()) and actor_id = auth.uid());

-- ── 7. API REQUEST LOGS (new — populated by Netlify functions) ─
create table if not exists public.api_request_logs (
  id            uuid primary key default gen_random_uuid(),
  function_name text not null,
  status_code   integer not null,
  duration_ms   integer,
  error_message text,
  created_at    timestamptz not null default now()
);
create index if not exists api_request_logs_created_at_idx on public.api_request_logs(created_at desc);
create index if not exists api_request_logs_function_idx on public.api_request_logs(function_name, created_at desc);

alter table public.api_request_logs enable row level security;
drop policy if exists "Super admins read api request logs" on public.api_request_logs;
create policy "Super admins read api request logs"
  on public.api_request_logs for select
  using (public.is_super_admin(auth.uid()));
-- No client insert policy — written only by service-role Netlify functions.

-- ── 8. SYSTEM HEALTH (real signal: DB connectivity + response time) ─
create or replace function public.get_super_admin_system_health()
returns table (db_connected boolean, db_response_ms numeric, checked_at timestamptz)
language plpgsql security definer set search_path = public stable as $$
declare
  v_start timestamptz := clock_timestamp();
  v_probe int;
begin
  if not public.is_super_admin(auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  select 1 into v_probe;
  return query select true, extract(milliseconds from clock_timestamp() - v_start)::numeric, now();
end;
$$;
grant execute on function public.get_super_admin_system_health() to authenticated;

-- ── 9. DATABASE: table stats + daily size snapshots ────────────
create or replace function public.get_super_admin_table_stats()
returns table (table_name text, row_estimate bigint)
language plpgsql security definer set search_path = public stable as $$
begin
  if not public.is_super_admin(auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return query
  select c.relname::text, greatest(c.reltuples, 0)::bigint
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
  order by c.reltuples desc;
end;
$$;
grant execute on function public.get_super_admin_table_stats() to authenticated;

create table if not exists public.db_size_snapshots (
  id            bigint generated always as identity primary key,
  snapshot_at   timestamptz not null default now(),
  table_name    text not null,
  row_estimate  bigint not null
);
create index if not exists db_size_snapshots_table_time_idx on public.db_size_snapshots(table_name, snapshot_at desc);

alter table public.db_size_snapshots enable row level security;
drop policy if exists "Super admins read db size snapshots" on public.db_size_snapshots;
create policy "Super admins read db size snapshots"
  on public.db_size_snapshots for select
  using (public.is_super_admin(auth.uid()));

create or replace function public.snapshot_table_sizes()
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.db_size_snapshots (table_name, row_estimate)
  select c.relname::text, greatest(c.reltuples, 0)::bigint
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r';
end;
$$;

do $$
declare existing_job_id bigint;
begin
  select jobid into existing_job_id from cron.job where jobname = 'snapshot-table-sizes' limit 1;
  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end $$;

select cron.schedule('snapshot-table-sizes', '0 3 * * *', $$select public.snapshot_table_sizes();$$);

-- Seed today's snapshot immediately so the Database module isn't empty on first load.
select public.snapshot_table_sizes();

-- ── 10. STORAGE USAGE (real: aggregated from storage.objects) ──
create or replace function public.get_super_admin_storage_usage()
returns table (bucket_id text, object_count bigint, total_bytes bigint)
language plpgsql security definer set search_path = public, storage stable as $$
begin
  if not public.is_super_admin(auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return query
  select o.bucket_id, count(*)::bigint, coalesce(sum((o.metadata->>'size')::bigint), 0)::bigint
  from storage.objects o
  group by o.bucket_id
  order by total_bytes desc;
end;
$$;
grant execute on function public.get_super_admin_storage_usage() to authenticated;

-- ── 11. BACKGROUND JOBS (real: reads pg_cron's job tables) ──────
create or replace function public.get_super_admin_background_jobs()
returns table (
  jobname      text,
  schedule     text,
  active       boolean,
  last_run_at  timestamptz,
  last_status  text
)
language plpgsql security definer set search_path = public, cron stable as $$
begin
  if not public.is_super_admin(auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return query
  select
    j.jobname,
    j.schedule,
    j.active,
    lr.start_time,
    lr.status
  from cron.job j
  left join lateral (
    select d.start_time, d.status
    from cron.job_run_details d
    where d.jobid = j.jobid
    order by d.start_time desc
    limit 1
  ) lr on true
  order by j.jobname;
end;
$$;
grant execute on function public.get_super_admin_background_jobs() to authenticated;

-- ── 12. SUPPORT TICKETS (new) ───────────────────────────────────
create table if not exists public.support_tickets (
  id                uuid primary key default gen_random_uuid(),
  subject           text not null,
  description       text,
  requester_email   text,
  requester_type    text check (requester_type in ('recruiter', 'jobseeker', 'other')),
  status            text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  priority          text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  assigned_admin_id uuid references public.super_admins(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  resolved_at       timestamptz
);
create index if not exists support_tickets_status_idx on public.support_tickets(status, created_at desc);

alter table public.support_tickets enable row level security;
drop policy if exists "Super admins manage support tickets" on public.support_tickets;
create policy "Super admins manage support tickets"
  on public.support_tickets for all
  using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

create or replace function public.set_support_ticket_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  if new.status = 'resolved' and old.status is distinct from 'resolved' then
    new.resolved_at = now();
  end if;
  return new;
end;
$$;
drop trigger if exists support_tickets_updated_at on public.support_tickets;
create trigger support_tickets_updated_at
  before update on public.support_tickets
  for each row execute function public.set_support_ticket_updated_at();

-- ── 13. FEEDBACK: super admin read access ───────────────────────
drop policy if exists "Super admins read feedback" on public.feedback;
create policy "Super admins read feedback"
  on public.feedback for select
  using (public.is_super_admin(auth.uid()));

-- ── 14. ROLES: fixed role set on super_admins + admin-team access ─
alter table public.super_admins
  add column if not exists role text not null default 'admin' check (role in ('owner', 'admin', 'viewer'));

drop policy if exists "Super admins read all admins" on public.super_admins;
create policy "Super admins read all admins"
  on public.super_admins for select
  using (public.is_super_admin(auth.uid()));

drop policy if exists "Super admins update other admins" on public.super_admins;
create policy "Super admins update other admins"
  on public.super_admins for update
  using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

-- ── 15. PLATFORM SETTINGS (new — a few real, curated toggles) ──
create table if not exists public.platform_settings (
  setting_key   text primary key,
  setting_value jsonb not null,
  updated_at    timestamptz not null default now(),
  updated_by    uuid references public.super_admins(id) on delete set null
);

alter table public.platform_settings enable row level security;
drop policy if exists "Super admins manage platform settings" on public.platform_settings;
create policy "Super admins manage platform settings"
  on public.platform_settings for all
  using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

insert into public.platform_settings (setting_key, setting_value)
values
  ('maintenance_mode', '{"enabled": false, "message": ""}'::jsonb),
  ('support_contact_email', '"support@rhirepro.com"'::jsonb),
  ('announcement_banner', '{"enabled": false, "message": ""}'::jsonb)
on conflict (setting_key) do nothing;

-- ── 16. ANALYTICS RPCs (deeper cuts beyond the Dashboard) ───────
create or replace function public.get_super_admin_top_locations(p_limit int default 10)
returns table (location text, jobs_count bigint)
language plpgsql security definer set search_path = public stable as $$
begin
  if not public.is_super_admin(auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return query
  select coalesce(nullif(trim(j.location), ''), 'Unspecified'), count(*)::bigint
  from jobs j
  group by coalesce(nullif(trim(j.location), ''), 'Unspecified')
  order by count(*) desc
  limit greatest(p_limit, 1);
end;
$$;
grant execute on function public.get_super_admin_top_locations(int) to authenticated;

create or replace function public.get_super_admin_top_skills(p_limit int default 10)
returns table (skill text, jobs_count bigint)
language plpgsql security definer set search_path = public stable as $$
begin
  if not public.is_super_admin(auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return query
  select s.skill, count(*)::bigint
  from jobs j, unnest(j.skills) as s(skill)
  where s.skill is not null and trim(s.skill) <> ''
  group by s.skill
  order by count(*) desc
  limit greatest(p_limit, 1);
end;
$$;
grant execute on function public.get_super_admin_top_skills(int) to authenticated;

create or replace function public.get_super_admin_applications_by_type()
returns table (employment_type text, applications_count bigint)
language plpgsql security definer set search_path = public stable as $$
begin
  if not public.is_super_admin(auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return query
  select coalesce(nullif(trim(j.employment_type), ''), 'Unspecified'), count(a.id)::bigint
  from jobs j
  left join applications a on a.job_id = j.id
  group by coalesce(nullif(trim(j.employment_type), ''), 'Unspecified')
  order by count(a.id) desc;
end;
$$;
grant execute on function public.get_super_admin_applications_by_type() to authenticated;

create or replace function public.get_super_admin_recruiter_leaderboard(p_limit int default 10)
returns table (recruiter_id uuid, recruiter_name text, company_name text, jobs_count bigint, hires_count bigint)
language plpgsql security definer set search_path = public stable as $$
begin
  if not public.is_super_admin(auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return query
  select
    rp.id,
    coalesce(rp.recruiter_name, rp.email),
    rp.company_name,
    count(distinct j.id)::bigint,
    count(distinct a.id) filter (where a.status in ('Hired', 'Joined'))::bigint
  from recruiter_profiles rp
  left join jobs j on j.recruiter_id = rp.id
  left join applications a on a.recruiter_id = rp.id
  group by rp.id, rp.recruiter_name, rp.email, rp.company_name
  order by hires_count desc, jobs_count desc
  limit greatest(p_limit, 1);
end;
$$;
grant execute on function public.get_super_admin_recruiter_leaderboard(int) to authenticated;
