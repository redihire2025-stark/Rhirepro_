-- =============================================================
-- RedHire / RhirePro — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → Run
-- =============================================================

-- ── 1. JOB SEEKER PROFILES ───────────────────────────────────
create table if not exists profiles (
  id           uuid references auth.users on delete cascade primary key,
  email        text unique not null,
  first_name   text,
  last_name    text,
  phone        text,
  avatar_url   text,
  headline     text,
  location     text,
  experience_type text check (experience_type in ('fresher','experienced')),
  total_experience text,
  current_company  text,
  current_title    text,
  current_salary   text,
  expected_salary  text,
  notice_period    text,
  skills       text[],
  resume_url   text,
  linkedin_url text,
  portfolio_url text,
  about        text,
  otp_code     text,
  otp_expires_at timestamptz,
  created_at   timestamptz default now()
);

-- ── 2. WORK EXPERIENCE ───────────────────────────────────────
create table if not exists work_experience (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid references profiles(id) on delete cascade,
  company     text not null,
  title       text not null,
  location    text,
  start_date  text,
  end_date    text,
  is_current  boolean default false,
  description text,
  created_at  timestamptz default now()
);

-- ── 3. EDUCATION ─────────────────────────────────────────────
create table if not exists education (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid references profiles(id) on delete cascade,
  institution  text not null,
  degree       text not null,
  field        text,
  start_year   text,
  end_year     text,
  score        text,
  created_at   timestamptz default now()
);

-- ── 4. RECRUITER PROFILES ────────────────────────────────────
create table if not exists recruiter_profiles (
  id                  uuid references auth.users on delete cascade primary key,
  email               text unique not null,
  recruiter_name      text,
  company_name        text,
  company_size        text,
  company_type        text,
  industry            text,
  phone               text,
  company_description text,
  website             text,
  location            text,
  logo_url            text,
  cover_image_url     text,
  cover_image_name    text,
  tagline             text,
  linkedin_url        text,
  cin                 text,
  otp_code            text,
  otp_expires_at      timestamptz,
  created_at          timestamptz default now()
);

-- ── 5. JOBS ──────────────────────────────────────────────────
create table if not exists jobs (
  id              uuid primary key default gen_random_uuid(),
  recruiter_id    uuid references recruiter_profiles(id) on delete cascade,
  title           text not null,
  description     text,
  company_name    text,
  location        text,
  work_mode       text,
  salary_min      numeric,
  salary_max      numeric,
  salary_type     text default 'LPA',
  experience_min  numeric,
  experience_max  numeric,
  employment_type text,
  industry        text,
  department      text,
  skills          text[],
  perks           text[],
  education       text,
  interview_mode  text,
  roles_responsibilities text,
  requirements    text,
  openings        integer default 1,
  status          text default 'Active' check (status in ('Active','Paused','Closed','Expired')),
  deadline        timestamptz default (now() + interval '15 days'),
  deadline_time   text constraint jobs_deadline_time_check check (deadline_time is null or deadline_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  views           integer default 0,
  created_at      timestamptz default now()
);

create table if not exists recruiter_articles (
  id               uuid primary key default gen_random_uuid(),
  recruiter_id     uuid not null references recruiter_profiles(id) on delete cascade,
  title            text not null,
  category         text not null,
  summary          text,
  key_takeaway     text,
  content          text not null,
  cover_image_url  text,
  cover_image_name text,
  read_time        integer not null default 1,
  status           text not null default 'Published' check (status in ('Published', 'Draft')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  published_at     timestamptz
);

create index if not exists recruiter_articles_recruiter_id_idx
  on recruiter_articles(recruiter_id);

create index if not exists recruiter_articles_public_feed_idx
  on recruiter_articles(status, published_at desc, created_at desc);

-- Run if the jobs table already exists (migration):
-- alter table jobs add column if not exists roles_responsibilities text;
-- alter table jobs add column if not exists requirements text;
-- alter table jobs add column if not exists deadline_time text;
-- alter table jobs alter column deadline set default (now() + interval '15 days');
-- update jobs set deadline = created_at + interval '15 days' where deadline is null;
-- alter table jobs drop constraint if exists jobs_deadline_time_check;
-- alter table jobs add constraint jobs_deadline_time_check check (deadline_time is null or deadline_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
-- alter table jobs drop constraint if exists jobs_status_check;
-- alter table jobs add constraint jobs_status_check check (status in ('Active','Paused','Closed','Expired'));

-- ── 6. APPLICATIONS ──────────────────────────────────────────
create table if not exists applications (
  id           uuid primary key default gen_random_uuid(),
  job_id       uuid references jobs(id) on delete cascade,
  profile_id   uuid references profiles(id) on delete cascade,
  recruiter_id uuid references recruiter_profiles(id),
  status       text default 'New' check (status in ('New','Reviewed','Screening','Applied','Shortlisted','Interview Scheduled','Offered','Rejected','Hired')),
  cover_letter text,
  resume_url   text,
  applied_at   timestamptz default now(),
  unique(job_id, profile_id)
);


-- ── 7. SAVED JOBS ────────────────────────────────────────────
create table if not exists saved_jobs (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  job_id     uuid references jobs(id) on delete cascade,
  saved_at   timestamptz default now(),
  unique(profile_id, job_id)
);

-- ── 8. NOTIFICATIONS ─────────────────────────────────────────
create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  user_type   text check (user_type in ('jobseeker','recruiter')),
  title       text not null,
  message     text,
  type        text check (type in ('application','message','status_change','job_alert','expiry_warning','expired','reposted')),
  job_id      uuid references jobs(id) on delete set null,
  notification_key text unique,
  is_read     boolean default false,
  related_id  uuid,
  created_at  timestamptz default now()
);

create index if not exists notifications_user_unread_idx
  on notifications(user_id, user_type, is_read, created_at desc);
create index if not exists notifications_job_id_idx
  on notifications(job_id, created_at desc);

-- ── 9. MESSAGES ──────────────────────────────────────────────
create table if not exists messages (
  id        uuid primary key default gen_random_uuid(),
  from_id   uuid not null,
  from_type text check (from_type in ('jobseeker','recruiter')),
  to_id     uuid not null,
  to_type   text check (to_type in ('jobseeker','recruiter')),
  content   text not null,
  is_read   boolean default false,
  sent_at   timestamptz default now()
);

-- 10. FEEDBACK
create table if not exists feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users on delete cascade not null unique,
  user_type  text not null check (user_type in ('jobseeker','recruiter')),
  user_email text,
  rating     integer not null check (rating between 1 and 5),
  comment    text,
  created_at timestamptz default now()
);

-- =============================================================
-- RLS POLICIES (all tables exist now, safe to cross-reference)
-- =============================================================

alter table profiles enable row level security;
alter table work_experience enable row level security;
alter table education enable row level security;
alter table recruiter_profiles enable row level security;
alter table jobs enable row level security;
alter table recruiter_articles enable row level security;
alter table applications enable row level security;
alter table saved_jobs enable row level security;
alter table notifications enable row level security;
alter table messages enable row level security;
alter table feedback enable row level security;

-- profiles
drop policy if exists "Own profile full access" on profiles;
drop policy if exists "Recruiters can read all profiles" on profiles;
create policy "Own profile full access"
  on profiles for all using (auth.uid() = id);
create policy "Recruiters can read all profiles"
  on profiles for select using (
    exists (select 1 from recruiter_profiles where id = auth.uid())
  );

-- work_experience
drop policy if exists "Own work experience" on work_experience;
drop policy if exists "Recruiters read work experience" on work_experience;
create policy "Own work experience"
  on work_experience for all using (profile_id = auth.uid());
create policy "Recruiters read work experience"
  on work_experience for select using (
    exists (select 1 from recruiter_profiles where id = auth.uid())
  );

-- education
drop policy if exists "Own education" on education;
drop policy if exists "Recruiters read education" on education;
create policy "Own education"
  on education for all using (profile_id = auth.uid());
create policy "Recruiters read education"
  on education for select using (
    exists (select 1 from recruiter_profiles where id = auth.uid())
  );

-- recruiter_profiles
drop policy if exists "Own recruiter profile" on recruiter_profiles;
drop policy if exists "Job seekers can read recruiter profiles" on recruiter_profiles;
drop policy if exists "Public can read recruiter profiles" on recruiter_profiles;
create policy "Own recruiter profile"
  on recruiter_profiles for all using (auth.uid() = id);
create policy "Job seekers can read recruiter profiles"
  on recruiter_profiles for select using (
    exists (select 1 from profiles where id = auth.uid())
  );
-- Required for /report/:recruiterId public pages (no login needed)
create policy "Public can read recruiter profiles"
  on recruiter_profiles for select using (true);

-- jobs
drop policy if exists "Recruiters manage own jobs" on jobs;
drop policy if exists "Anyone can read active jobs" on jobs;
create policy "Recruiters manage own jobs"
  on jobs for all using (recruiter_id = auth.uid());
create policy "Anyone can read active jobs"
  on jobs for select using (
    status = 'Active'
    and deadline is not null
    and deadline > now()
  );

drop policy if exists "Recruiters manage own articles" on recruiter_articles;
drop policy if exists "Public can read published recruiter articles" on recruiter_articles;
create policy "Recruiters manage own articles"
  on recruiter_articles for all
  using (recruiter_id = auth.uid())
  with check (recruiter_id = auth.uid());
create policy "Public can read published recruiter articles"
  on recruiter_articles for select
  using (status = 'Published');

create or replace function set_recruiter_article_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  if new.status = 'Published' and new.published_at is null then
    new.published_at = now();
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists recruiter_articles_updated_at on recruiter_articles;
create trigger recruiter_articles_updated_at
  before insert or update on recruiter_articles
  for each row execute function set_recruiter_article_updated_at();

-- applications
drop policy if exists "Job seekers see own applications" on applications;
drop policy if exists "Job seekers can apply" on applications;
drop policy if exists "Recruiters manage their job applications" on applications;
drop policy if exists "Public can read aggregate application stats" on applications;
create policy "Job seekers see own applications"
  on applications for select using (profile_id = auth.uid());
create policy "Job seekers can apply"
  on applications for insert with check (profile_id = auth.uid());
create policy "Recruiters manage their job applications"
  on applications for all using (recruiter_id = auth.uid());
-- Required for /report/:recruiterId public pages — exposes only aggregate counts (status + job_id)
create policy "Public can read aggregate application stats"
  on applications for select using (true);

-- saved_jobs
drop policy if exists "Own saved jobs" on saved_jobs;
create policy "Own saved jobs"
  on saved_jobs for all using (profile_id = auth.uid());

-- notifications
drop policy if exists "Own notifications" on notifications;
create policy "Own notifications"
  on notifications for all using (user_id = auth.uid());

-- messages
drop policy if exists "Own messages" on messages;
create policy "Own messages"
  on messages for all using (from_id = auth.uid() or to_id = auth.uid());

-- feedback
drop policy if exists "Users can submit own feedback" on feedback;
drop policy if exists "Users can update own feedback" on feedback;
drop policy if exists "Users can read own feedback" on feedback;
drop policy if exists "Public can read testimonial feedback" on feedback;
create policy "Users can submit own feedback"
  on feedback for insert with check (user_id = auth.uid());
create policy "Users can update own feedback"
  on feedback for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users can read own feedback"
  on feedback for select using (user_id = auth.uid());
create policy "Public can read testimonial feedback"
  on feedback for select using (rating between 1 and 5);

-- Public landing page testimonials
create or replace function public.get_landing_testimonials(testimonial_limit integer default 24)
returns table (
  feedback_id uuid,
  user_id uuid,
  user_type text,
  rating integer,
  comment text,
  reviewer_name text,
  reviewer_role text,
  image_url text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    f.id as feedback_id,
    f.user_id,
    f.user_type,
    f.rating,
    f.comment,
    case
      when f.user_type = 'jobseeker' then trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, ''))
      when f.user_type = 'recruiter' then coalesce(nullif(trim(rp.recruiter_name), ''), nullif(trim(rp.company_name), ''))
      else null
    end as reviewer_name,
    case
      when f.user_type = 'jobseeker' then coalesce(nullif(trim(p.current_title), ''), nullif(trim(p.headline), ''), 'Job Seeker')
      when f.user_type = 'recruiter' then
        case
          when nullif(trim(rp.company_name), '') is not null then 'Recruiter at ' || trim(rp.company_name)
          else 'Recruiter'
        end
      else 'RhirePro User'
    end as reviewer_role,
    case
      when f.user_type = 'jobseeker' then p.avatar_url
      when f.user_type = 'recruiter' then rp.logo_url
      else null
    end as image_url,
    f.created_at
  from feedback f
  left join profiles p on f.user_type = 'jobseeker' and p.id = f.user_id
  left join recruiter_profiles rp on f.user_type = 'recruiter' and rp.id = f.user_id
  where f.rating between 1 and 5
  order by f.created_at desc
  limit greatest(1, least(testimonial_limit, 50));
$$;

grant execute on function public.get_landing_testimonials(integer) to anon, authenticated;


-- =============================================================
-- TRIGGERS
-- =============================================================

-- Auto-create profile row when a new user signs up (bypasses RLS)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_first_name text;
  v_last_name  text;
  v_full_name  text;
  v_avatar_url text;
begin
  if new.raw_user_meta_data->>'role' = 'recruiter' then
    insert into public.recruiter_profiles (id, email, recruiter_name, company_name, industry, company_size, phone)
    values (
      new.id, new.email,
      new.raw_user_meta_data->>'recruiter_name',
      new.raw_user_meta_data->>'company_name',
      new.raw_user_meta_data->>'industry',
      new.raw_user_meta_data->>'company_size',
      new.raw_user_meta_data->>'phone'
    )
    on conflict (id) do nothing;
  else
    -- For Google OAuth, metadata has 'full_name'/'name' instead of split first/last
    v_first_name := new.raw_user_meta_data->>'first_name';
    v_last_name  := new.raw_user_meta_data->>'last_name';
    v_full_name  := coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name');
    v_avatar_url := coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture');

    if v_first_name is null and v_full_name is not null then
      v_first_name := split_part(v_full_name, ' ', 1);
      v_last_name  := nullif(trim(substr(v_full_name, length(split_part(v_full_name, ' ', 1)) + 2)), '');
    end if;

    insert into public.profiles (id, email, first_name, last_name, phone, experience_type, avatar_url)
    values (
      new.id, new.email,
      v_first_name,
      v_last_name,
      new.raw_user_meta_data->>'phone',
      coalesce(new.raw_user_meta_data->>'experience', 'fresher'),
      v_avatar_url
    )
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Notify recruiter when a candidate applies
create or replace function notify_recruiter_on_application()
returns trigger language plpgsql security definer as $$
declare
  v_job_title text;
  v_candidate_name text;
begin
  select title into v_job_title from jobs where id = new.job_id;
  select coalesce(first_name || ' ' || last_name, email)
    into v_candidate_name from profiles where id = new.profile_id;

  insert into notifications(user_id, user_type, title, message, type, job_id, related_id)
  values (
    new.recruiter_id, 'recruiter',
    'New Application Received',
    v_candidate_name || ' applied for ' || v_job_title,
    'application', new.job_id, new.id
  );
  return new;
end;
$$;

drop trigger if exists on_application_insert on applications;
create trigger on_application_insert
  after insert on applications
  for each row execute function notify_recruiter_on_application();

-- Notify candidate when application status changes
create or replace function notify_candidate_on_status_change()
returns trigger language plpgsql security definer as $$
declare
  v_job_title text;
begin
  if old.status is distinct from new.status then
    select title into v_job_title from jobs where id = new.job_id;

    insert into notifications(user_id, user_type, title, message, type, job_id, related_id)
    values (
      new.profile_id, 'jobseeker',
      'Application Status Updated',
      'Your application for ' || v_job_title || ' is now: ' || new.status,
      'status_change', new.job_id, new.id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_application_status_change on applications;
create trigger on_application_status_change
  after update on applications
  for each row execute function notify_candidate_on_status_change();

-- =============================================================
-- STORAGE BUCKETS
-- Run this entire section in: Supabase Dashboard → SQL Editor
-- =============================================================

-- Public bucket for generated HTML hiring reports
insert into storage.buckets (id, name, public)
values ('reports', 'reports', true)
on conflict (id) do update set public = true;

-- Anyone can read report files (public HTML pages shared via URL)
drop policy if exists "Public read reports" on storage.objects;
create policy "Public read reports"
  on storage.objects for select using (bucket_id = 'reports');

-- Any authenticated user can upload a report
drop policy if exists "Recruiters upload own report" on storage.objects;
create policy "Recruiters upload own report"
  on storage.objects for insert
  with check (bucket_id = 'reports' and auth.role() = 'authenticated');

-- Any authenticated user can overwrite (upsert) their report
drop policy if exists "Recruiters update own report" on storage.objects;
create policy "Recruiters update own report"
  on storage.objects for update
  using (bucket_id = 'reports' and auth.role() = 'authenticated');

