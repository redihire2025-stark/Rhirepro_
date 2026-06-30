-- Org Admin module: adds the org-admin role and org grouping on top of recruiter_profiles.
-- Safe to run multiple times.

-- 1. Flag a recruiter_profiles row as an org admin account.
alter table recruiter_profiles
  add column if not exists is_org_admin boolean not null default false;

-- 2. Link a recruiter to the org admin that manages them.
--    An org admin's own row should have org_id = its own id (self-reference) once promoted.
alter table recruiter_profiles
  add column if not exists org_id uuid references recruiter_profiles(id) on delete set null;

create index if not exists idx_recruiter_profiles_org_id on recruiter_profiles(org_id);
create index if not exists idx_recruiter_profiles_is_org_admin on recruiter_profiles(is_org_admin) where is_org_admin = true;

-- 3. Recruiter-level status fields needed by the Recruiter Management module (later phase).
alter table recruiter_profiles
  add column if not exists is_disabled boolean not null default false;

alter table recruiter_profiles
  add column if not exists last_login_at timestamptz;

-- 4. Convenience: when a row is promoted to org admin, default its org_id to itself
--    so its own KPI queries (scoped by org_id) include its own data.
update recruiter_profiles
set org_id = id
where is_org_admin = true and org_id is null;

-- 5. Backfill the 10 already-seeded org admin accounts (admin_org1@redhire.dev .. admin_org10@redhire.dev)
--    so the DB flag is consistent with the login-page email-pattern detection.
update recruiter_profiles
set is_org_admin = true,
    org_id = id
where email ~* '^admin_org[0-9]+@redhire\.dev$';
