alter table if exists certifications
  add column if not exists expiry_date text,
  add column if not exists no_expiry boolean not null default false;

