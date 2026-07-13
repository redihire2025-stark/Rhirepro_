-- Recruiter company profile branding fields.
-- Run this once on existing databases that were created before these columns existed.

alter table public.recruiter_profiles
  add column if not exists cover_image_url text,
  add column if not exists cover_image_name text;

-- Public storage bucket used for recruiter logos and cover photos.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "Public avatar access" on storage.objects;
create policy "Public avatar access"
  on storage.objects
  for select
  using (bucket_id = 'avatars');

drop policy if exists "Auth users upload avatar" on storage.objects;
create policy "Auth users upload avatar"
  on storage.objects
  for insert
  with check (bucket_id = 'avatars' and auth.role() = 'authenticated');
