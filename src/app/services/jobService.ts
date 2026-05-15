import { supabase, Application, InterviewDetails, Job, SavedJob } from "../../lib/supabase";

export type SavedJobWithJob = Omit<SavedJob, "job"> & {
  job: Job | null;
};

export type AppliedJobStatus = "applied" | "shortlisted" | "rejected" | "interview" | "hired";

export type AppliedJobWithJob = Omit<Application, "job"> & {
  job: Job | null;
  displayStatus: AppliedJobStatus;
  interview_details: InterviewDetails | null;
};

type SupabaseJobRelation = Job | Job[] | null;
let interviewDetailsTableMissing = false;

function normalizeJobRelation(job: SupabaseJobRelation): Job | null {
  if (Array.isArray(job)) return job[0] ?? null;
  return job ?? null;
}

function normalizeApplicationStatus(status: Application["status"]): AppliedJobStatus {
  const normalized = (status || "").toLowerCase().trim().replace(/[\s-]+/g, "_");
  if (normalized === "shortlisted") return "shortlisted";
  if (normalized === "rejected") return "rejected";
  if (normalized === "hired" || normalized === "hire" || normalized === "joined") return "hired";
  if (normalized === "interview_scheduled" || normalized === "interview") return "interview";
  return "applied";
}

function extractInterviewMessage(rawMessage: string): string {
  const lines = (rawMessage || "").split("\n");
  const separatorIndex = lines.findIndex((line) => line.trim() === "");
  if (separatorIndex >= 0) {
    return lines.slice(separatorIndex + 1).join("\n").trim();
  }

  return rawMessage
    .replace(/^Status:.*$/gim, "")
    .replace(/^Company:.*$/gim, "")
    .replace(/^Updated:.*$/gim, "")
    .trim();
}

function isGenericInterviewMessage(message: string): boolean {
  const normalized = (message || "").toLowerCase().trim();
  if (!normalized) return true;
  return (
    normalized === "interview scheduled" ||
    normalized.startsWith("your application for") ||
    normalized.includes("is now: interview scheduled")
  );
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
  let applications: Array<Application & { job: SupabaseJobRelation }> = [];

  // Some deployed DBs may not yet have `applied_at`; fallback keeps analytics functional.
  const primaryQuery = await supabase
    .from("applications")
    .select("id, job_id, profile_id, recruiter_id, status, cover_letter, resume_url, applied_at, job:jobs(*)")
    .eq("profile_id", userId)
    .order("applied_at", { ascending: false });

  if (!primaryQuery.error) {
    applications = (primaryQuery.data || []) as Array<Application & { job: SupabaseJobRelation }>;
  } else {
    const fallbackQuery = await supabase
      .from("applications")
      .select("id, job_id, profile_id, recruiter_id, status, cover_letter, resume_url, job:jobs(*)")
      .eq("profile_id", userId)
      .order("id", { ascending: false });

    if (fallbackQuery.error) throw fallbackQuery.error;

    applications = ((fallbackQuery.data || []) as Array<Omit<Application, "applied_at"> & { job: SupabaseJobRelation }>).map(
      (application) => ({
        ...application,
        applied_at: new Date(0).toISOString(),
      }),
    ) as Array<Application & { job: SupabaseJobRelation }>;
  }

  const applicationIds = applications.map((application) => application.id);

  let interviewDetailsByApplicationId = new Map<string, InterviewDetails>();
  if (applicationIds.length > 0 && !interviewDetailsTableMissing) {
    const { data: interviewDetailsRows, error: interviewDetailsError } = await supabase
      .from("interview_details")
      .select("id, application_id, recruiter_id, candidate_id, interview_message, status, created_at, updated_at")
      .in("application_id", applicationIds);

    if (interviewDetailsError) {
      const missingInterviewDetailsTable =
        interviewDetailsError.code === "PGRST205" ||
        interviewDetailsError.code === "42P01" ||
        /interview_details/i.test(interviewDetailsError.message || "");

      if (!missingInterviewDetailsTable) {
        throw interviewDetailsError;
      }
      interviewDetailsTableMissing = true;
    } else {
      interviewDetailsByApplicationId = new Map(
        ((interviewDetailsRows || []) as InterviewDetails[]).map((details) => [details.application_id, details]),
      );
    }
  }

  const interviewNotificationByApplicationId = new Map<string, { message: string; created_at: string; priority: number }>();
  if (applicationIds.length > 0) {
    const { data: interviewNotifications, error: interviewNotificationsError } = await supabase
      .from("notifications")
      .select("related_id, title, message, created_at")
      .eq("user_id", userId)
      .eq("user_type", "jobseeker")
      .in("related_id", applicationIds)
      .order("created_at", { ascending: false });

    if (!interviewNotificationsError) {
      (interviewNotifications || []).forEach((notification) => {
        const text = `${notification.title || ""}\n${notification.message || ""}`.toLowerCase();
        if (notification.related_id && text.includes("interview scheduled")) {
          const rawMessage = notification.message || "";
          const extracted = extractInterviewMessage(rawMessage);
          const nextMessage = extracted || rawMessage;
          const existing = interviewNotificationByApplicationId.get(notification.related_id);
          const title = (notification.title || "").toLowerCase();
          const isInterviewDetailsTitle = title.includes("interview details from");
          const nextPriority = isInterviewDetailsTitle ? 2 : 1;

          if (!existing) {
            interviewNotificationByApplicationId.set(notification.related_id, {
              message: nextMessage,
              created_at: notification.created_at || new Date().toISOString(),
              priority: nextPriority,
            });
            return;
          }

          const existingGeneric = isGenericInterviewMessage(existing.message);
          const nextGeneric = isGenericInterviewMessage(nextMessage);
          const shouldReplace =
            nextPriority > existing.priority ||
            (existingGeneric && !nextGeneric) ||
            (existingGeneric === nextGeneric && nextMessage.length > existing.message.length);

          if (shouldReplace) {
            interviewNotificationByApplicationId.set(notification.related_id, {
              message: nextMessage,
              created_at: notification.created_at || existing.created_at,
              priority: nextPriority,
            });
          }
        }
      });
    }
  }

  return applications.map((application) => {
    return {
      ...application,
      status: application.status,
      job: normalizeJobRelation(application.job),
      interview_details:
        interviewDetailsByApplicationId.get(application.id) ??
        (interviewNotificationByApplicationId.has(application.id)
          ? ({
              id: `notification-${application.id}`,
              application_id: application.id,
              recruiter_id: application.recruiter_id,
              candidate_id: application.profile_id,
              interview_message: interviewNotificationByApplicationId.get(application.id)?.message || "",
              status: "Interview Scheduled",
              created_at: interviewNotificationByApplicationId.get(application.id)?.created_at || application.applied_at,
              updated_at: interviewNotificationByApplicationId.get(application.id)?.created_at || application.applied_at,
            } as InterviewDetails)
          : null),
      displayStatus: normalizeApplicationStatus(application.status),
    };
  });
}

export async function removeSavedJob(userId: string, jobId: string): Promise<void> {
  const { error } = await supabase
    .from("saved_jobs")
    .delete()
    .eq("profile_id", userId)
    .eq("job_id", jobId);

  if (error) throw error;
}
