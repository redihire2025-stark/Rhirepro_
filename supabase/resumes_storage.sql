-- =============================================================
-- RhirePro - Resume storage bucket and access policies
-- Run this in Supabase SQL Editor
-- =============================================================

insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do update set public = false;

drop policy if exists "Resume owners manage own files" on storage.objects;
create policy "Resume owners manage own files"
  on storage.objects for all
  using (
    bucket_id = 'resumes'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'resumes'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Recruiters read applicant resumes" on storage.objects;
create policy "Recruiters read applicant resumes"
  on storage.objects for select
  using (
    bucket_id = 'resumes'
    and exists (
      select 1
      from public.applications a
      where a.profile_id::text = (storage.foldername(name))[1]
        and a.recruiter_id = auth.uid()
    )
  );
