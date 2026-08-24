-- =============================================================
-- RhirePro — fix applications.recruiter_id blocking account deletion
-- Run in: Supabase Dashboard → SQL Editor → Run
-- Safe to run multiple times.
--
-- WHY
-- ---
-- Every other foreign key pointing at recruiter_profiles(id) across this
-- schema cascades or sets null on delete. applications.recruiter_id is the
-- one exception — it has no ON DELETE behavior at all, so Postgres
-- refuses to delete a recruiter who has any applications, which is
-- effectively every active recruiter. Supabase's Admin API surfaces this
-- as an opaque "Database error deleting user", which is what was showing
-- when trying to delete mr.noobesh1234@gmail.com / kollujaditya@gmail.com
-- (and would have blocked every recruiter/team-member deletion or
-- org-unwind built earlier this session the same way).
--
-- SET NULL rather than CASCADE: the application row itself is not this
-- recruiter's data to destroy — it's the job seeker's record of having
-- applied. It stays (job_id still identifies which posting), just with
-- recruiter_id cleared. In practice this rarely even matters: jobs.
-- recruiter_id already cascades, so deleting a recruiter deletes their job
-- postings, which cascades to delete applications via job_id anyway — this
-- FK was only ever able to *block* that from completing, never able to
-- prevent it once the CASCADE proceeds by itself.
--
-- HEADS UP — separate, bigger question worth deciding on purpose rather
-- than by default: deleting a recruiter currently deletes their job
-- postings too (jobs.recruiter_id ON DELETE CASCADE), which in turn wipes
-- every job seeker's application to those postings. That's the existing
-- schema design, not something this fix changes — flagging it in case
-- preserving job-seeker application history through a recruiter deletion
-- (the way the org-cancellation unwind reassigns jobs to the admin instead
-- of deleting them) is actually what's wanted for a plain account delete
-- too. Happy to build that if so; it's a real design choice either way.
-- =============================================================

BEGIN;

ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_recruiter_id_fkey;
ALTER TABLE public.applications
  ADD CONSTRAINT applications_recruiter_id_fkey
  FOREIGN KEY (recruiter_id) REFERENCES public.recruiter_profiles(id) ON DELETE SET NULL;

COMMIT;
