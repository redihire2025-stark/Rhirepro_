import { supabase, Application, Job, SavedJob } from "../../lib/supabase";

export type SavedJobWithJob = Omit<SavedJob, "job"> & {
  job: Job | null;
};

export type AppliedJobStatus = "applied" | "shortlisted" | "rejected" | "interview";

export type AppliedJobWithJob = Omit<Application, "job"> & {
  job: Job | null;
  displayStatus: AppliedJobStatus;
};

type SupabaseJobRelation = Job | Job[] | null;

function normalizeJobRelation(job: SupabaseJobRelation): Job | null {
  if (Array.isArray(job)) return job[0] ?? null;
  return job ?? null;
}

function normalizeApplicationStatus(status: Application["status"]): AppliedJobStatus {
  if (status === "Shortlisted") return "shortlisted";
  if (status === "Rejected") return "rejected";
  if (status === "Interview Scheduled") return "interview";
  return "applied";
}

function mapSavedJobsWithJob(data: Array<SavedJob & { job: SupabaseJobRelation }>): SavedJobWithJob[] {
  return data.map((savedJob) => ({
    ...savedJob,
    job: normalizeJobRelation(savedJob.job),
  }));
}

async function fetchSavedJobsByProfileId(userId: string): Promise<SavedJobWithJob[]> {
  const { data, error } = await supabase
    .from("saved_jobs")
    .select("id, profile_id, job_id, saved_at, job:jobs(*)")
    .eq("profile_id", userId)
    .order("saved_at", { ascending: false });

  if (error) throw error;

  return mapSavedJobsWithJob((data || []) as Array<SavedJob & { job: SupabaseJobRelation }>);
}

export async function getSavedJobs(userId: string): Promise<SavedJobWithJob[]> {
  return fetchSavedJobsByProfileId(userId);
}

export async function getSavedJobsForCurrentUser(): Promise<SavedJobWithJob[]> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user) throw new Error("Authentication required to fetch saved jobs.");

  return fetchSavedJobsByProfileId(user.id);
}

export async function getAppliedJobs(userId: string): Promise<AppliedJobWithJob[]> {
  const { data, error } = await supabase
    .from("applications")
    .select("id, job_id, profile_id, recruiter_id, status, cover_letter, resume_url, applied_at, job:jobs(*)")
    .eq("profile_id", userId)
    .order("applied_at", { ascending: false });

  if (error) throw error;

  return ((data || []) as Array<Application & { job: SupabaseJobRelation }>).map((application) => ({
    ...application,
    job: normalizeJobRelation(application.job),
    displayStatus: normalizeApplicationStatus(application.status),
  }));
}

export async function removeSavedJob(userId: string, jobId: string): Promise<void> {
  const { error } = await supabase
    .from("saved_jobs")
    .delete()
    .eq("profile_id", userId)
    .eq("job_id", jobId);

  if (error) throw error;
}
