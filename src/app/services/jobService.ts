import { supabase, Application, InterviewDetails, Job, OfferDetails, SavedJob } from "../../lib/supabase";

export type SavedJobWithJob = Omit<SavedJob, "job"> & {
  job: Job | null;
};

export type AppliedJobStatus =
  | "applied"
  | "under_review"
  | "shortlisted"
  | "interview"
  | "interview_completed"
  | "interview_selected"
  | "interview_rejected"
  | "offered"
  | "joined"
  | "rejected"
  | "on_hold"
  | "hired";

export type AppliedJobWithJob = Omit<Application, "job"> & {
  job: Job | null;
  displayStatus: AppliedJobStatus;
  interview_details: InterviewDetails | null;
  interviews: InterviewDetails[];
  offer_details: OfferDetails | null;
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
  if (normalized === "hired" || normalized === "hire" || normalized === "joined") return "joined";
  if (normalized === "offered" || normalized === "offer_given") return "offered";
  if (normalized === "interview_rejected") return "interview_rejected";
  if (normalized === "interview_selected") return "interview_selected";
  if (normalized === "interview_completed") return "interview_completed";
  if (normalized === "interview_scheduled" || normalized === "interview") return "interview";
  if (normalized === "under_review" || normalized === "screening" || normalized === "reviewed") return "under_review";
  if (normalized === "on_hold") return "on_hold";
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
    .replace(/^Round:.*$/gim, "")
    .replace(/^Company:.*$/gim, "")
    .replace(/^Updated:.*$/gim, "")
    .trim();
}

function extractInterviewRound(rawMessage: string): "L1" | "L2" | "L3" | "HR Round" | null {
  const explicitLine = (rawMessage || "")
    .split("\n")
    .find((line) => line.toLowerCase().startsWith("round:"));
  if (!explicitLine) return null;
  const value = explicitLine.split(":").slice(1).join(":").trim().toUpperCase();
  if (value === "L1") return "L1";
  if (value === "L2") return "L2";
  if (value === "L3") return "L3";
  if (value === "HR ROUND") return "HR Round";
  return null;
}

function extractFeedbackMessage(rawMessage: string): string {
  const cleaned = extractInterviewMessage(rawMessage);
  return cleaned.trim();
}

function extractMeetingUrl(rawMessage: string): string | null {
  const explicitLine = (rawMessage || "")
    .split("\n")
    .find((line) => line.toLowerCase().startsWith("meeting url:"));
  if (explicitLine) {
    const value = explicitLine.split(":").slice(1).join(":").trim();
    if (value) return value;
  }

  const match = (rawMessage || "").match(/https?:\/\/[^\s]+/i);
  return match ? match[0] : null;
}

function extractOfferLetterUrl(rawMessage: string): string | null {
  const explicitLine = (rawMessage || "")
    .split("\n")
    .find((line) => line.toLowerCase().startsWith("offer letter url:"));
  if (explicitLine) {
    const value = explicitLine.split(":").slice(1).join(":").trim();
    if (value) return value;
  }

  const match = (rawMessage || "").match(/https?:\/\/[^\s]+/i);
  return match ? match[0] : null;
}

function extractOfferLetterName(rawMessage: string): string | null {
  const explicitLine = (rawMessage || "")
    .split("\n")
    .find((line) => line.toLowerCase().startsWith("offer letter:"));
  if (!explicitLine) return null;
  const value = explicitLine.split(":").slice(1).join(":").trim();
  return value || null;
}

function extractOfferLetterPath(rawMessage: string): string | null {
  const explicitLine = (rawMessage || "")
    .split("\n")
    .find((line) => line.toLowerCase().startsWith("offer letter path:"));
  if (!explicitLine) return null;
  const value = explicitLine.split(":").slice(1).join(":").trim();
  return value || null;
}

function extractOfferMessage(rawMessage: string): string {
  const lines = (rawMessage || "").split("\n");
  const separatorIndex = lines.findIndex((line) => line.trim() === "");
  if (separatorIndex >= 0) {
    return lines.slice(separatorIndex + 1).join("\n").trim();
  }
  return rawMessage
    .replace(/^Status:.*$/gim, "")
    .replace(/^Company:.*$/gim, "")
    .replace(/^Updated:.*$/gim, "")
    .replace(/^Offer Letter:.*$/gim, "")
    .replace(/^Offer Letter URL:.*$/gim, "")
    .replace(/^Offer Letter Path:.*$/gim, "")
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
    let { data: interviewDetailsRows, error: interviewDetailsError } = await supabase
      .from("interview_details")
      .select("id, application_id, recruiter_id, candidate_id, interview_message, meeting_url, status, created_at, updated_at")
      .in("application_id", applicationIds);

    const missingMeetingUrlColumn =
      interviewDetailsError &&
      (interviewDetailsError.code === "42703" || /meeting_url/i.test(interviewDetailsError.message || ""));

    if (missingMeetingUrlColumn) {
      const fallbackQuery = await supabase
        .from("interview_details")
        .select("id, application_id, recruiter_id, candidate_id, interview_message, status, created_at, updated_at")
        .in("application_id", applicationIds);

      interviewDetailsRows = fallbackQuery.data as InterviewDetails[] | null;
      interviewDetailsError = fallbackQuery.error;
      if (!fallbackQuery.error && fallbackQuery.data) {
        interviewDetailsRows = (fallbackQuery.data as InterviewDetails[]).map((row) => ({
          ...row,
          meeting_url: null,
        }));
      }
    }

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

  const interviewNotificationByApplicationId = new Map<
    string,
    { message: string; rawMessage: string; created_at: string; priority: number; round: "L1" | "L2" | "L3" | "HR Round" | null }
  >();
  const interviewsByApplicationId = new Map<string, InterviewDetails[]>();
  const offerNotificationByApplicationId = new Map<
    string,
    { message: string; rawMessage: string; created_at: string; score: number }
  >();
  if (applicationIds.length > 0) {
    const { data: interviewNotifications, error: interviewNotificationsError } = await supabase
      .from("notifications")
      .select("related_id, title, message, created_at")
      .eq("user_id", userId)
      .eq("user_type", "jobseeker")
      .order("created_at", { ascending: false });

    if (!interviewNotificationsError) {
      (interviewNotifications || []).forEach((notification) => {
        const text = `${notification.title || ""}\n${notification.message || ""}`.toLowerCase();
        const title = (notification.title || "").toLowerCase();
        const isInterviewFeedbackNotification =
          title.includes("interview feedback from") ||
          text.includes("interview feedback:") ||
          text.includes("next round discussion:");
        const isInterviewNotification =
          isInterviewFeedbackNotification ||
          text.includes("interview scheduled") ||
          text.includes("meeting url:") ||
          /https?:\/\/\S+/i.test(notification.message || "");
        if (notification.related_id && applicationIds.includes(notification.related_id) && isInterviewNotification) {
          const rawMessage = notification.message || "";
          const extracted = extractInterviewMessage(rawMessage);
          const nextMessage = extracted || rawMessage;
          const existing = interviewNotificationByApplicationId.get(notification.related_id);
          const isInterviewDetailsTitle = title.includes("interview details from");
          const nextPriority = isInterviewDetailsTitle ? 2 : isInterviewFeedbackNotification ? 3 : 1;

          if (!existing) {
            interviewNotificationByApplicationId.set(notification.related_id, {
              message: nextMessage,
              rawMessage: rawMessage,
              created_at: notification.created_at || new Date().toISOString(),
              priority: nextPriority,
              round: extractInterviewRound(rawMessage),
            });
          } else {
            const existingGeneric = isGenericInterviewMessage(existing.message);
            const nextGeneric = isGenericInterviewMessage(nextMessage);
            const shouldReplace =
              nextPriority > existing.priority ||
              (existingGeneric && !nextGeneric) ||
              (existingGeneric === nextGeneric && nextMessage.length > existing.message.length);

            if (shouldReplace) {
              interviewNotificationByApplicationId.set(notification.related_id, {
                message: nextMessage,
                rawMessage: rawMessage,
                created_at: notification.created_at || existing.created_at,
                priority: nextPriority,
                round: extractInterviewRound(rawMessage),
              });
            }
          }

          const roundFromMessage = extractInterviewRound(rawMessage);
          const existingRounds = interviewsByApplicationId.get(notification.related_id) || [];
          const createdAt = notification.created_at || new Date().toISOString();
          if (isInterviewFeedbackNotification && roundFromMessage) {
            const existingRoundIndex = [...existingRounds]
              .reverse()
              .findIndex((entry) => entry.round === roundFromMessage);
            if (existingRoundIndex >= 0) {
              const realIndex = existingRounds.length - 1 - existingRoundIndex;
              const current = existingRounds[realIndex];
              const mergedMessage = [
                current.interview_message || "",
                "",
                extractFeedbackMessage(rawMessage),
              ]
                .join("\n")
                .trim();
              existingRounds[realIndex] = {
                ...current,
                interview_message: mergedMessage,
                updated_at: createdAt,
              };
            } else {
              existingRounds.push({
                id: `notification-${notification.related_id}-${createdAt}`,
                application_id: notification.related_id,
                recruiter_id: "",
                candidate_id: userId,
                interview_message: extractFeedbackMessage(rawMessage),
                meeting_url: extractMeetingUrl(rawMessage),
                round: roundFromMessage,
                status: "Interview Scheduled",
                created_at: createdAt,
                updated_at: createdAt,
              });
            }
          } else {
            existingRounds.push({
              id: `notification-${notification.related_id}-${createdAt}`,
              application_id: notification.related_id,
              recruiter_id: "",
              candidate_id: userId,
              interview_message: nextMessage,
              meeting_url: extractMeetingUrl(rawMessage),
              round: roundFromMessage,
              status: "Interview Scheduled",
              created_at: createdAt,
              updated_at: createdAt,
            });
          }
          interviewsByApplicationId.set(notification.related_id, existingRounds);
        }

        const isOfferNotification =
          text.includes("status: offered") ||
          text.includes("offer letter from") ||
          text.includes("offer letter url:");
        if (notification.related_id && applicationIds.includes(notification.related_id) && isOfferNotification) {
          const rawMessage = notification.message || "";
          const extractedMessage = extractOfferMessage(rawMessage);
          const hasPath = /offer letter path:/i.test(rawMessage);
          const hasUrl = /offer letter url:\s*(?!n\/a\b)/i.test(rawMessage);
          const hasName = /offer letter:\s*\S+/i.test(rawMessage);
          const detailScore = (hasPath ? 3 : 0) + (hasUrl ? 2 : 0) + (hasName ? 1 : 0) + Math.min(extractedMessage.length, 200);
          const existing = offerNotificationByApplicationId.get(notification.related_id);

          // Keep latest notification when scores are equal (query is already newest-first).
          if (!existing || detailScore > existing.score) {
            offerNotificationByApplicationId.set(notification.related_id, {
              message: extractedMessage,
              rawMessage,
              created_at: notification.created_at || new Date().toISOString(),
              score: detailScore,
            });
          }
        }
      });

      // Fallback: some setups store offer notifications without related_id.
      // Map those to latest offered applications that still miss offer details.
      const orphanOfferNotifications = (interviewNotifications || []).filter((notification) => {
        const text = `${notification.title || ""}\n${notification.message || ""}`.toLowerCase();
        const isOfferNotification =
          text.includes("status: offered") ||
          text.includes("offer letter from") ||
          text.includes("offer letter url:");
        return isOfferNotification && (!notification.related_id || !applicationIds.includes(notification.related_id));
      });

      if (orphanOfferNotifications.length > 0) {
        const offeredApplications = [...applications]
          .filter((application) => {
            const normalized = (application.status || "").toLowerCase().trim().replace(/[\s-]+/g, "_");
            return normalized === "offered" || normalized === "offer_given";
          })
          .sort((a, b) => new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime());

        let orphanIndex = 0;
        for (const application of offeredApplications) {
          if (offerNotificationByApplicationId.has(application.id)) continue;
          const fallbackNotification = orphanOfferNotifications[orphanIndex];
          if (!fallbackNotification) break;
          const rawMessage = fallbackNotification.message || "";
          const extractedMessage = extractOfferMessage(rawMessage);
          const hasPath = /offer letter path:/i.test(rawMessage);
          const hasUrl = /offer letter url:\s*(?!n\/a\b)/i.test(rawMessage);
          const hasName = /offer letter:\s*\S+/i.test(rawMessage);
          const detailScore = (hasPath ? 3 : 0) + (hasUrl ? 2 : 0) + (hasName ? 1 : 0) + Math.min(extractedMessage.length, 200);

          offerNotificationByApplicationId.set(application.id, {
            message: extractedMessage,
            rawMessage,
            created_at: fallbackNotification.created_at || new Date().toISOString(),
            score: detailScore,
          });
          orphanIndex += 1;
        }
      }
    }
  }

  return applications.map((application) => {
    const roundFromStoredDetails = extractInterviewRound(
      interviewDetailsByApplicationId.get(application.id)?.interview_message || "",
    );
    const interviewDetailsFromTable = interviewDetailsByApplicationId.get(application.id);
    const interviewHistoryFromNotifications = (interviewsByApplicationId.get(application.id) || []).sort(
      (a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
    );
    const interviewFallback = interviewNotificationByApplicationId.has(application.id)
      ? ({
          id: `notification-${application.id}`,
          application_id: application.id,
          recruiter_id: application.recruiter_id,
          candidate_id: application.profile_id,
          interview_message: interviewNotificationByApplicationId.get(application.id)?.message || "",
          meeting_url: extractMeetingUrl(interviewNotificationByApplicationId.get(application.id)?.rawMessage || ""),
          round: interviewNotificationByApplicationId.get(application.id)?.round || null,
          status: "Interview Scheduled",
          created_at: interviewNotificationByApplicationId.get(application.id)?.created_at || application.applied_at,
          updated_at: interviewNotificationByApplicationId.get(application.id)?.created_at || application.applied_at,
        } as InterviewDetails)
      : null;

    const latestInterviewDetail = interviewDetailsFromTable
      ? ({ ...interviewDetailsFromTable, round: roundFromStoredDetails } as InterviewDetails)
      : interviewFallback;

    return {
      ...application,
      status: application.status,
      job: normalizeJobRelation(application.job),
      interview_details: latestInterviewDetail,
      interviews: (() => {
        const list = interviewHistoryFromNotifications.length > 0 ? interviewHistoryFromNotifications : [];
        if (latestInterviewDetail) list.push(latestInterviewDetail);
        const deduped = new Map<string, InterviewDetails>();
        list.forEach((item) => {
          const key = `${item.round || "NA"}-${item.updated_at}-${item.meeting_url || ""}-${item.interview_message}`;
          deduped.set(key, item);
        });
        return Array.from(deduped.values()).sort(
          (a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
        );
      })(),
      offer_details: offerNotificationByApplicationId.has(application.id)
        ? ({
            application_id: application.id,
            offer_message: offerNotificationByApplicationId.get(application.id)?.message || "",
            offer_letter_name: extractOfferLetterName(offerNotificationByApplicationId.get(application.id)?.rawMessage || ""),
            offer_letter_url: extractOfferLetterUrl(offerNotificationByApplicationId.get(application.id)?.rawMessage || ""),
            offer_letter_path: extractOfferLetterPath(offerNotificationByApplicationId.get(application.id)?.rawMessage || ""),
            sent_at: offerNotificationByApplicationId.get(application.id)?.created_at || application.applied_at,
          } as OfferDetails)
        : null,
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
