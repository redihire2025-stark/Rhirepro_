-- Fix: Ensure public.jobs table accepts 'Paused' status
-- Run this script in your Supabase Dashboard -> SQL Editor

begin;

-- Dynamically drop any existing status check constraint on public.jobs
do $$
declare
  c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'jobs'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%status%'
  loop
    execute format('alter table public.jobs drop constraint %I', c.conname);
  end loop;
end
$$;

-- Add updated check constraint including 'Paused'
alter table public.jobs
  add constraint jobs_status_check
  check (
    status in (
      'Active',
      'Paused',
      'Closed',
      'Expired'
    )
  );

commit;
