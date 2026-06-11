-- Fix: ensure applications.status accepts "Hired"
-- Run this in Supabase SQL Editor against the same project your app uses.

begin;

-- Remove existing status-related CHECK constraints on public.applications
-- (older deployments may have a stricter list without "Hired").
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
      and rel.relname = 'applications'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%status%'
  loop
    execute format('alter table public.applications drop constraint %I', c.conname);
  end loop;
end
$$;

alter table public.applications
  add constraint applications_status_check
  check (
    status in (
      'New',
      'Reviewed',
      'Screening',
      'Applied',
      'Shortlisted',
      'Interview Scheduled',
      'Offered',
      'Rejected',
      'Hired'
    )
  );

commit;

