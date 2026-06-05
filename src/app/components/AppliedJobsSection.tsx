import { useEffect, useMemo, useState } from "react";
import { Briefcase, Loader2, X } from "lucide-react";
import { Badge } from "./ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./ui/pagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { AppliedJobWithJob, getAppliedJobs } from "../services/jobService";
import { supabase } from "../../lib/supabase";

const JOBS_PER_PAGE = 12;

interface AppliedJobsSectionProps {
  userId?: string;
  compact?: boolean;
  onJobsLoaded?: (jobs: AppliedJobWithJob[]) => void;
  onInterviewDetailsOpen?: (job: AppliedJobWithJob) => void;
  onOfferDetailsOpen?: (job: AppliedJobWithJob) => void;
}

const PIPELINE_STAGES = ["Applied", "Under Review", "Shortlisted", "Interview Scheduled", "Interview Completed", "Interview Selected", "Interview Rejected", "Offer"] as const;
const INTERVIEW_ROUNDS = ["L1", "L2", "L3", "HR"] as const;

const STATUS_BADGE_CLASS: Record<string, string> = {
  applied: "bg-slate-100 text-slate-700",
  "under review": "bg-blue-100 text-blue-700",
  shortlisted: "bg-pink-100 text-pink-700",
  "interview scheduled": "bg-purple-100 text-purple-700",
  "interview completed": "bg-indigo-100 text-indigo-700",
  "interview selected": "bg-teal-100 text-teal-700",
  "interview rejected": "bg-red-100 text-red-700",
  offer: "bg-orange-100 text-orange-700",
  offered: "bg-orange-100 text-orange-700",
  hired: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  "on hold": "bg-amber-100 text-amber-700",
};

const PIPELINE_STAGE_CLASS: Record<(typeof PIPELINE_STAGES)[number], { completed: string; pending: string; connector: string }> = {
  Applied: {
    completed: "bg-[#FF2B2B] text-white",
    pending: "bg-[#EEF0F4] text-[#98A2B3]",
    connector: "bg-[#FF2B2B]",
  },
  "Under Review": {
    completed: "bg-[#FF2B2B] text-white",
    pending: "bg-[#EEF0F4] text-[#98A2B3]",
    connector: "bg-[#FF2B2B]",
  },
  Shortlisted: {
    completed: "bg-[#FF2B2B] text-white",
    pending: "bg-[#EEF0F4] text-[#98A2B3]",
    connector: "bg-[#FF2B2B]",
  },
  "Interview Scheduled": {
    completed: "bg-[#FF2B2B] text-white",
    pending: "bg-[#EEF0F4] text-[#98A2B3]",
    connector: "bg-[#FF2B2B]",
  },
  "Interview Completed": {
    completed: "bg-[#FF2B2B] text-white",
    pending: "bg-[#EEF0F4] text-[#98A2B3]",
    connector: "bg-[#FF2B2B]",
  },
  "Interview Selected": {
    completed: "bg-[#FF2B2B] text-white",
    pending: "bg-[#EEF0F4] text-[#98A2B3]",
    connector: "bg-[#FF2B2B]",
  },
  "Interview Rejected": {
    completed: "bg-[#FF2B2B] text-white",
    pending: "bg-[#EEF0F4] text-[#98A2B3]",
    connector: "bg-[#FF2B2B]",
  },
  Offer: {
    completed: "bg-[#FF2B2B] text-white",
    pending: "bg-[#EEF0F4] text-[#98A2B3]",
    connector: "bg-[#FF2B2B]",
  },
};

function normalizeStatus(status: AppliedJobWithJob["status"]): "new" | "reviewed" | "shortlisted" | "interview_scheduled" | "interview_completed" | "interview_selected" | "interview_rejected" | "offered" | "hired" | "rejected" | "on_hold" {
  const normalized = (status || "").toLowerCase().trim().replace(/[\s-]+/g, "_");
  if (normalized === "rejected") return "rejected";
  if (normalized === "hired" || normalized === "hire" || normalized === "joined") return "hired";
  if (normalized === "offered" || normalized === "offer_given") return "offered";
  if (normalized === "interview_rejected") return "interview_rejected";
  if (normalized === "interview_selected") return "interview_selected";
  if (normalized === "interview_completed") return "interview_completed";
  if (normalized === "interview_scheduled" || normalized === "interview") return "interview_scheduled";
  if (normalized === "shortlisted") return "shortlisted";
  if (normalized === "screening" || normalized === "reviewed" || normalized === "under_review") return "reviewed";
  if (normalized === "on_hold") return "on_hold";
  return "new";
}

function getStatusBadge(status: AppliedJobWithJob["status"]) {
  const normalized = normalizeStatus(status);
  if (normalized === "reviewed") return { label: "Under Review", className: STATUS_BADGE_CLASS["under review"] };
  if (normalized === "shortlisted") return { label: "Shortlisted", className: STATUS_BADGE_CLASS.shortlisted };
  if (normalized === "interview_scheduled") return { label: "Interview Scheduled", className: STATUS_BADGE_CLASS["interview scheduled"] };
  if (normalized === "interview_completed") return { label: "Interview Completed", className: STATUS_BADGE_CLASS["interview completed"] };
  if (normalized === "interview_selected") return { label: "Interview Selected", className: STATUS_BADGE_CLASS["interview selected"] };
  if (normalized === "interview_rejected") return { label: "Interview Rejected", className: STATUS_BADGE_CLASS["interview rejected"] };
  if (normalized === "offered") return { label: "Offer Received", className: STATUS_BADGE_CLASS.offered };
  if (normalized === "hired") return { label: "Joined", className: STATUS_BADGE_CLASS.hired };
  if (normalized === "rejected") return { label: "Rejected", className: STATUS_BADGE_CLASS.rejected };
  if (normalized === "on_hold") return { label: "On Hold", className: STATUS_BADGE_CLASS["on hold"] };
  return { label: "Applied", className: STATUS_BADGE_CLASS.applied };
}

function getCompletedStageCount(status: AppliedJobWithJob["status"]): number {
  const normalized = normalizeStatus(status);
  if (normalized === "rejected") return 0;
  if (normalized === "hired") return 8;
  if (normalized === "offered") return 8;
  if (normalized === "interview_rejected") return 7;
  if (normalized === "interview_selected") return 6;
  if (normalized === "interview_completed") return 5;
  if (normalized === "interview_scheduled") return 4;
  if (normalized === "shortlisted") return 3;
  if (normalized === "reviewed") return 2;
  if (normalized === "on_hold") return 2;
  return 1;
}

function formatLocation(job: AppliedJobWithJob["job"]): string {
  return job?.location || job?.work_mode || "India";
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AppliedJobsSection({ userId, compact = false, onJobsLoaded, onInterviewDetailsOpen, onOfferDetailsOpen }: AppliedJobsSectionProps) {
  const [appliedJobs, setAppliedJobs] = useState<AppliedJobWithJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [interviewDetailsFor, setInterviewDetailsFor] = useState<AppliedJobWithJob | null>(null);
  const [selectedInterviewRound, setSelectedInterviewRound] = useState<AppliedJobWithJob["interviews"][number] | null>(null);

  useEffect(() => {
    const currentUserId = userId;
    if (!currentUserId) {
      setAppliedJobs([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function loadAppliedJobs(resolvedUserId: string) {
      setLoading(true);
      setError("");
      try {
        const jobs = await getAppliedJobs(resolvedUserId);
        if (cancelled) return;
        setAppliedJobs(jobs);
        onJobsLoaded?.(jobs);
      } catch {
        if (!cancelled) {
          setError("Unable to load applied jobs right now.");
          setAppliedJobs([]);
          onJobsLoaded?.([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadAppliedJobs(currentUserId);
    const handleForegroundRefresh = () => {
      if (document.visibilityState === "visible") {
        void loadAppliedJobs(currentUserId);
      }
    };

    const channel = supabase
      .channel(`jobseeker-applications-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "applications",
          filter: `profile_id=eq.${currentUserId}`,
        },
        () => {
          void loadAppliedJobs(currentUserId);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "interview_details",
          filter: `candidate_id=eq.${currentUserId}`,
        },
        () => {
          void loadAppliedJobs(currentUserId);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUserId}`,
        },
        () => {
          void loadAppliedJobs(currentUserId);
        },
      )
      .subscribe();

    window.addEventListener("focus", handleForegroundRefresh);
    document.addEventListener("visibilitychange", handleForegroundRefresh);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", handleForegroundRefresh);
      document.removeEventListener("visibilitychange", handleForegroundRefresh);
      supabase.removeChannel(channel);
    };
  }, [onJobsLoaded, userId]);

  const totalPages = Math.max(1, Math.ceil(appliedJobs.length / JOBS_PER_PAGE));
  const paginatedJobs = useMemo(
    () => appliedJobs.slice((currentPage - 1) * JOBS_PER_PAGE, currentPage * JOBS_PER_PAGE),
    [appliedJobs, currentPage],
  );

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  if (loading) {
    return (
      <div className={`${compact ? "py-8" : "bg-white rounded-2xl p-12 shadow-md"} text-center`}>
        <Loader2 className="h-10 w-10 text-[#FF2B2B] animate-spin mx-auto mb-3" />
        <p className="text-[#8A8A8A] text-sm">Loading applied jobs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${compact ? "py-8" : "bg-white rounded-2xl p-12 shadow-md"} text-center`}>
        <p className="text-[#8A8A8A]">{error}</p>
      </div>
    );
  }

  if (appliedJobs.length === 0) {
    return (
      <div className={`${compact ? "py-8" : "bg-white rounded-2xl p-12 shadow-md"} text-center`}>
        <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-[#8A8A8A]">No applied jobs found</p>
      </div>
    );
  }

  return (
    <>
    <div id="applied-jobs-pagination" className="space-y-4">
      {paginatedJobs.map((application) => {
        if (!application.job) return null;
        const badge = getStatusBadge(application.status);
        const completedCount = getCompletedStageCount(application.status);
        const isRejected = normalizeStatus(application.status) === "rejected";
        const isHired = normalizeStatus(application.status) === "hired";
        const isOnHold = normalizeStatus(application.status) === "on_hold";

        return (
          <div
            key={application.id}
            className={`rounded-2xl border border-gray-100 bg-white ${compact ? "p-4" : "p-5"} shadow-[0_2px_8px_rgba(16,24,40,0.08)]`}
          >
            <div className="flex justify-between items-start gap-4">
              <div>
                <h3 className={`font-semibold text-[#2D1A1A] ${compact ? "text-base" : "text-lg"}`}>{application.job.title}</h3>
                <p className="text-[#7C8593] text-sm">{application.job.company_name} · {formatLocation(application.job)}</p>
                <p className="text-sm text-[#7C8593] mt-0.5">Applied on {formatDate(application.applied_at)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={`${badge.className} rounded-full px-3 py-1 text-xs font-medium`}>{badge.label}</Badge>
                <button
                  type="button"
                  aria-label="Close status card"
                  className="text-[#8A8A8A] hover:text-[#646464] transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {!isRejected && !isHired && !isOnHold ? (
              <div className="mt-4">
                <div className="flex flex-wrap items-center gap-y-2">
                  {PIPELINE_STAGES.map((stage, index) => {
                    const completed = index < completedCount;
                    const connectorCompleted = index < completedCount - 1;
                    const isInterviewStage = stage === "Interview Scheduled" || stage === "Interview Completed";
                    const isOfferStage = stage === "Offer";
                    const isInterviewScheduled = normalizeStatus(application.status) === "interview_scheduled";
                    const isInterviewCompleted = normalizeStatus(application.status) === "interview_completed";
                    const isOffered = normalizeStatus(application.status) === "offered";
                    const isInterviewActive = (stage === "Interview Scheduled" && isInterviewScheduled) || (stage === "Interview Completed" && isInterviewCompleted);
                    const isOfferActive = isOfferStage && isOffered;
                    const handleInterviewClick = () => {
                      setSelectedInterviewRound(null);
                      setInterviewDetailsFor(application);
                      onInterviewDetailsOpen?.(application);
                    };
                    const handleOfferClick = () => {
                      onOfferDetailsOpen?.(application);
                    };

                    return (
                      <div key={stage} className="flex items-center flex-shrink-0">
                        {isInterviewActive || isOfferActive ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={isInterviewActive ? handleInterviewClick : handleOfferClick}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  if (isInterviewActive) handleInterviewClick();
                                  if (isOfferActive) handleOfferClick();
                                }
                              }}
                              className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
                                completed ? PIPELINE_STAGE_CLASS[stage].completed : PIPELINE_STAGE_CLASS[stage].pending
                              } cursor-pointer ${isOfferActive ? "animate-offer-cta" : "animate-interview-cta"} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2B2B] focus-visible:ring-offset-1`}
                              aria-label={isInterviewActive ? "View interview details" : "View offer details"}
                              title={isInterviewActive ? "View interview details" : "View offer details"}
                            >
                              {stage}
                            </button>
                            {isInterviewActive ? (
                              <div className="inline-flex items-center gap-1">
                                {INTERVIEW_ROUNDS.map((roundLabel, roundIndex) => {
                                  const scheduledRounds = application.interviews || [];

                                  const latestScheduledRound = (() => {
                                    const latest = [...scheduledRounds]
                                      .filter((item) => item.round)
                                      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];
                                    if (!latest?.round) return null;
                                    const normalized = latest.round.toUpperCase().trim();
                                    return normalized === "HR ROUND" ? "HR" : normalized;
                                  })();

                                  const latestRoundIndex = latestScheduledRound
                                    ? INTERVIEW_ROUNDS.indexOf(latestScheduledRound as (typeof INTERVIEW_ROUNDS)[number])
                                    : -1;
                                  const hasRound = latestRoundIndex >= 0 && roundIndex <= latestRoundIndex;
                                  const mappedInterview = [...scheduledRounds]
                                    .reverse()
                                    .find((item) => {
                                      const normalized = (item.round || "").toUpperCase().trim();
                                      const normalizedRound = normalized === "HR ROUND" ? "HR" : normalized;
                                      return normalizedRound === roundLabel;
                                    }) || null;

                                  const isLatestRound = hasRound && latestScheduledRound === roundLabel;

                                  if (!hasRound) {
                                    return (
                                      <span
                                        key={`${application.id}-round-${roundLabel}`}
                                        className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#EEF0F4] px-1 text-[10px] font-semibold leading-none text-[#98A2B3]"
                                        aria-label={`${roundLabel} not scheduled`}
                                        title={`${roundLabel} not scheduled`}
                                      >
                                        {roundLabel}
                                      </span>
                                    );
                                  }

                                  return (
                                    <button
                                      key={`${application.id}-${mappedInterview?.updated_at || roundLabel}-${roundIndex}`}
                                      type="button"
                                      onClick={() => {
                                        const detailInterview = mappedInterview || scheduledRounds[scheduledRounds.length - 1] || null;
                                        if (!detailInterview) return;
                                        setSelectedInterviewRound(detailInterview);
                                        setInterviewDetailsFor(application);
                                        onInterviewDetailsOpen?.(application);
                                      }}
                                      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FF2B2B] px-1 text-[10px] font-semibold leading-none text-white hover:bg-[#e02525] ${
                                        hasRound ? "animate-interview-cta" : ""
                                      }`}
                                      title={`View ${roundLabel} details`}
                                      aria-label={`View ${roundLabel} details`}
                                    >
                                      {roundLabel}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <span
                            className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
                              completed ? PIPELINE_STAGE_CLASS[stage].completed : PIPELINE_STAGE_CLASS[stage].pending
                            }`}
                          >
                            {stage}
                          </span>
                        )}
                        {index < PIPELINE_STAGES.length - 1 && (
                          <span className={`mx-1 h-[2px] w-4 sm:w-5 ${connectorCompleted ? PIPELINE_STAGE_CLASS[stage].connector : "bg-[#D8DDE6]"}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : isRejected ? (
              <div className="mt-5 flex items-center gap-2">
                <span className="h-[5px] flex-1 rounded-full bg-red-200/80" />
                <span className="text-sm text-[#FF2B2B]">Application not moved forward</span>
                <span className="h-[5px] flex-1 rounded-full bg-red-200/80" />
              </div>
            ) : isOnHold ? (
              <div className="mt-5 flex items-center gap-2">
                <span className="h-[5px] flex-1 rounded-full bg-amber-200/80" />
                <span className="text-sm text-amber-600">Application is on hold</span>
                <span className="h-[5px] flex-1 rounded-full bg-amber-200/80" />
              </div>
            ) : (
              <div className="mt-5 flex items-center gap-2">
                <span className="h-[5px] flex-1 rounded-full bg-emerald-200/80" />
                <span className="text-sm text-emerald-600">You are hired</span>
                <span className="h-[5px] flex-1 rounded-full bg-emerald-200/80" />
              </div>
            )}
          </div>
        );
      })}

      {totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <Pagination>
            <PaginationContent className="flex-wrap justify-center gap-2">
              <PaginationItem>
                <PaginationPrevious
                  href="#applied-jobs-pagination"
                  onClick={(event) => {
                    event.preventDefault();
                    setCurrentPage((page) => Math.max(1, page - 1));
                  }}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    href="#applied-jobs-pagination"
                    isActive={currentPage === page}
                    onClick={(event) => {
                      event.preventDefault();
                      setCurrentPage(page);
                    }}
                    className={currentPage === page ? "border-[#FF2B2B] bg-[#FF2B2B] text-white hover:bg-[#e02525] hover:text-white" : "text-[#3A1F1F]"}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  href="#applied-jobs-pagination"
                  onClick={(event) => {
                    event.preventDefault();
                    setCurrentPage((page) => Math.min(totalPages, page + 1));
                  }}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
    <Dialog
      open={!onInterviewDetailsOpen && Boolean(interviewDetailsFor)}
      onOpenChange={(open) => {
        if (!open) {
          setInterviewDetailsFor(null);
          setSelectedInterviewRound(null);
        }
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Interview Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm text-[#3A1F1F]">
          {(() => {
            const currentInterview = selectedInterviewRound || interviewDetailsFor?.interview_details || null;
            const explicitMeetingUrl = currentInterview?.meeting_url?.trim() || "";
            const message = currentInterview?.interview_message || "";
            const extractedFromMessage = message.match(/https?:\/\/[^\s]+/i)?.[0] || "";
            const joinUrl = explicitMeetingUrl || extractedFromMessage;
            if (!joinUrl) return null;
            return (
            <p>
              Join meeting:{" "}
              <a
                href={joinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#FF2B2B] underline hover:text-[#e02525]"
              >
                {joinUrl}
              </a>
            </p>
            );
          })()}
          <p className="whitespace-pre-wrap">
            {((
              selectedInterviewRound?.interview_message ||
              interviewDetailsFor?.interview_details?.interview_message ||
              "No interview details available."
            )
              .replace(/^round:.*$/gim, "")
              .replace(/^meeting url:.*$/gim, "")
              .trim() || "No interview details available.")}
          </p>
          {(selectedInterviewRound?.round || interviewDetailsFor?.interview_details?.round) ? (
            <p className="text-[#8A8A8A]">
              Round: {selectedInterviewRound?.round || interviewDetailsFor?.interview_details?.round}
            </p>
          ) : null}
          <p className="text-[#8A8A8A]">
            Sent on{" "}
            {(selectedInterviewRound?.updated_at || interviewDetailsFor?.interview_details?.updated_at)
              ? new Date(selectedInterviewRound?.updated_at || interviewDetailsFor?.interview_details?.updated_at || "").toLocaleString("en-IN")
              : "N/A"}
          </p>
          {interviewDetailsFor?.job?.company_name ? (
            <p className="text-[#8A8A8A]">Company: {interviewDetailsFor.job.company_name}</p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
