-- Recruiter-authored public articles
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

alter table recruiter_articles
  add column if not exists key_takeaway text;

alter table recruiter_articles enable row level security;

drop policy if exists "Recruiters manage own articles" on recruiter_articles;
create policy "Recruiters manage own articles"
  on recruiter_articles for all
  using (recruiter_id = auth.uid())
  with check (recruiter_id = auth.uid());

drop policy if exists "Public can read published recruiter articles" on recruiter_articles;
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
