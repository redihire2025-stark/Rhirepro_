-- Interview details linked to a specific application.
-- Supports recruiter send/resend without duplicate rows.

create table if not exists interview_details (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  recruiter_id uuid not null references recruiter_profiles(id) on delete cascade,
  candidate_id uuid not null references profiles(id) on delete cascade,
  interview_message text not null,
  meeting_url text,
  status text not null default 'Interview Scheduled' check (status in ('Interview Scheduled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (application_id)
);

alter table interview_details add column if not exists meeting_url text;

create index if not exists interview_details_candidate_idx on interview_details(candidate_id);
create index if not exists interview_details_recruiter_idx on interview_details(recruiter_id);

create or replace function set_interview_details_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_interview_details_updated_at on interview_details;
create trigger trg_interview_details_updated_at
before update on interview_details
for each row execute function set_interview_details_updated_at();

alter table interview_details enable row level security;

drop policy if exists "Recruiters manage own interview details" on interview_details;
create policy "Recruiters manage own interview details"
  on interview_details
  for all
  using (recruiter_id = auth.uid())
  with check (recruiter_id = auth.uid());

drop policy if exists "Job seekers read own interview details" on interview_details;
create policy "Job seekers read own interview details"
  on interview_details
  for select
  using (candidate_id = auth.uid());
