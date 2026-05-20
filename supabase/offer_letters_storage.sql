-- Offer letters storage bucket + policies
-- Run in Supabase SQL Editor once per project.

-- 1) Ensure private bucket exists
insert into storage.buckets (id, name, public)
values ('offer-letters', 'offer-letters', false)
on conflict (id) do update set public = false;

-- 2) Allow authenticated users to read/upload/update/delete offer letters.
--    This unblocks recruiter upload and jobseeker signed-url preview/download.
drop policy if exists "Authenticated read offer letters" on storage.objects;
create policy "Authenticated read offer letters"
  on storage.objects
  for select
  using (bucket_id = 'offer-letters' and auth.role() = 'authenticated');

drop policy if exists "Authenticated upload offer letters" on storage.objects;
create policy "Authenticated upload offer letters"
  on storage.objects
  for insert
  with check (bucket_id = 'offer-letters' and auth.role() = 'authenticated');

drop policy if exists "Authenticated update offer letters" on storage.objects;
create policy "Authenticated update offer letters"
  on storage.objects
  for update
  using (bucket_id = 'offer-letters' and auth.role() = 'authenticated')
  with check (bucket_id = 'offer-letters' and auth.role() = 'authenticated');

drop policy if exists "Authenticated delete offer letters" on storage.objects;
create policy "Authenticated delete offer letters"
  on storage.objects
  for delete
  using (bucket_id = 'offer-letters' and auth.role() = 'authenticated');

