-- =============================================================
-- RhirePro — Super Admin: fix numeric type mismatches
-- Run in: Supabase Dashboard → SQL Editor → Run
--
-- Fixes "structure of query does not match function result type"
-- on get_super_admin_dashboard_kpis(), which was silently failing on
-- every call (that's why every Dashboard KPI showed 0, not just
-- Total Recruiters). Root cause: sum(final_amount) and extract(...)
-- return bigint/double precision, but the functions declared numeric.
-- Safe to re-run.
-- =============================================================

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
