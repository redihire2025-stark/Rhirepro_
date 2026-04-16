-- RhirePro feedback table migration
-- Run this in Supabase SQL Editor for existing projects.

create table if not exists feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users on delete cascade not null,
  user_type  text not null check (user_type in ('jobseeker','recruiter')),
  user_email text,
  rating     integer not null check (rating between 1 and 5),
  comment    text,
  created_at timestamptz default now()
);

-- Keep only the latest row per user before adding the uniqueness rule.
delete from feedback
where id in (
  select id
  from (
    select
      id,
      row_number() over (partition by user_id order by created_at desc, id desc) as duplicate_rank
    from feedback
  ) duplicates
  where duplicate_rank > 1
);

create unique index if not exists feedback_user_id_unique on feedback(user_id);

alter table feedback enable row level security;

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

-- Public landing page testimonials. This returns only safe display fields.
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
