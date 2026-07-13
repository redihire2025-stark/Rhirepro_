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
  filterStatus?: string;
}

const PIPELINE_STAGES = [
  "Applied",
  "Under Review",
  "Shortlisted",
  "Interview",
  "L1",
  "L2",
  "L3",
  "HR",
  "Interview Complete",
  "Selected",
  "Offer",
  "Hired",
] as const;

const STATUS_BADGE_CLASS: Record<string, string> = {
  applied: "bg-gray-100 text-gray-700 border-gray-200",
  "under review": "bg-blue-100 text-blue-700 border-blue-200",
  shortlisted: "bg-pink-100 text-pink-700 border-pink-200",
  "interview scheduled": "bg-purple-100 text-purple-700 border-purple-200",
  "interview completed": "bg-indigo-100 text-indigo-700 border-indigo-200",
  "interview selected": "bg-teal-100 text-teal-700 border-teal-200",
  "interview rejected": "bg-red-100 text-red-700 border-red-200",
  offer: "bg-orange-100 text-orange-700 border-orange-200",
  offered: "bg-orange-100 text-orange-700 border-orange-200",
  hired: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  "on hold": "bg-amber-100 text-amber-700 border-amber-200",
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

function getStageState(
  stage: (typeof PIPELINE_STAGES)[number],
  status: AppliedJobWithJob["status"],
  interviews: AppliedJobWithJob["interviews"]
): { state: "completed" | "active" | "pending"; className: string } {
  const nStatus = normalizeStatus(status);

  const sequentialStages = [
    "Applied",
    "Under Review",
    "Shortlisted",
    "Interview",
    "L1",
    "L2",
    "L3",
    "HR",
    "Interview Complete",
    "Selected",
    "Offer",
    "Hired",
  ];

  const scheduledRounds = interviews || [];
  const getHighestScheduledRoundRank = (): number => {
    let maxRank = 4; // default to Interview
    scheduledRounds.forEach((item) => {
      if (!item.round) return;
      const normalizedRound = item.round.toUpperCase().trim();
      if (normalizedRound === "L1") maxRank = Math.max(maxRank, 5);
      else if (normalizedRound === "L2") maxRank = Math.max(maxRank, 6);
      else if (normalizedRound === "L3") maxRank = Math.max(maxRank, 7);
      else if (normalizedRound === "HR" || normalizedRound === "HR ROUND") maxRank = Math.max(maxRank, 8);
    });
    return maxRank;
  };

  let currentRank = 1;
  if (nStatus === "reviewed") {
    currentRank = 2;
  } else if (nStatus === "shortlisted") {
    currentRank = 3;
  } else if (nStatus === "interview_scheduled") {
    currentRank = getHighestScheduledRoundRank();
  } else if (nStatus === "interview_completed") {
    currentRank = 9;
  } else if (nStatus === "interview_selected") {
    currentRank = 10;
  } else if (nStatus === "offered") {
    currentRank = 11;
  } else if (nStatus === "hired") {
    currentRank = 12;
  } else if (nStatus === "interview_rejected") {
    currentRank = getHighestScheduledRoundRank();
  } else if (nStatus === "rejected") {
    if (scheduledRounds.length > 0) {
      currentRank = getHighestScheduledRoundRank();
    } else {
      currentRank = 1;
    }
  } else if (nStatus === "on_hold") {
    if (scheduledRounds.length > 0) {
      currentRank = getHighestScheduledRoundRank();
    } else {
      currentRank = 2;
    }
  }

  const stageRank = sequentialStages.indexOf(stage) + 1;
  let state: "completed" | "active" | "pending" = "pending";

  if (nStatus === "rejected" || nStatus === "interview_rejected") {
    if (stageRank < currentRank) {
      state = "completed";
    } else if (stageRank === currentRank) {
      state = "active";
    } else {
      state = "pending";
    }
  } else if (nStatus === "on_hold") {
    if (stageRank < currentRank) {
      state = "completed";
    } else if (stageRank === currentRank) {
      state = "active";
    } else {
      state = "pending";
    }
  } else {
    if (stageRank < currentRank) {
      state = "completed";
    } else if (stageRank === currentRank) {
      state = "active";
    } else {
      state = "pending";
    }
  }

  const stageColors: Record<(typeof PIPELINE_STAGES)[number], string> = {
    Applied: "bg-[#4F8EF7]",
    "Under Review": "bg-slate-400",
    Shortlisted: "bg-pink-500",
    Interview: "bg-purple-500",
    L1: "bg-purple-500",
    L2: "bg-purple-500",
    L3: "bg-purple-500",
    HR: "bg-purple-500",
    "Interview Complete": "bg-indigo-500",
    Selected: "bg-teal-500",
    Offer: "bg-orange-500",
    Hired: "bg-emerald-500",
  };

  let className = "bg-[#EEF0F4]"; // Default pending style

  if (state !== "pending") {
    if (state === "active" && (nStatus === "rejected" || nStatus === "interview_rejected")) {
      className = "bg-red-500";
    } else if (state === "active" && nStatus === "on_hold") {
      className = "bg-amber-500";
    } else {
      className = stageColors[stage] || "bg-[#4F8EF7]";
    }
  }

  return { state, className };
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

export default function AppliedJobsSection({ userId, compact = false, onJobsLoaded, onInterviewDetailsOpen, onOfferDetailsOpen, filterStatus }: AppliedJobsSectionProps) {
  const [appliedJobs, setAppliedJobs] = useState<AppliedJobWithJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [interviewDetailsFor, setInterviewDetailsFor] = useState<AppliedJobWithJob | null>(null);
  const [selectedInterviewRound, setSelectedInterviewRound] = useState<AppliedJobWithJob["interviews"][number] | null>(null);

  const filteredJobs = useMemo(() => {
    if (!filterStatus) return appliedJobs;
    if (filterStatus === "interview") {
      return appliedJobs.filter(j => {
        const nStatus = normalizeStatus(j.status);
        return ["interview_scheduled", "interview_completed", "interview_selected", "interview_rejected"].includes(nStatus);
      });
    }
    return appliedJobs;
  }, [appliedJobs, filterStatus]);

  useEffect(() => {
    const currentUserId = userId;
    if (!currentUserId) {
      setAppliedJobs([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function loadAppliedJobs(resolvedUserId: string, isSilent = false) {
      if (!isSilent) setLoading(true);
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
        void loadAppliedJobs(currentUserId, true);
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
          void loadAppliedJobs(currentUserId, true);
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
          void loadAppliedJobs(currentUserId, true);
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
          void loadAppliedJobs(currentUserId, true);
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

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / JOBS_PER_PAGE));
  const paginatedJobs = useMemo(
    () => filteredJobs.slice((currentPage - 1) * JOBS_PER_PAGE, currentPage * JOBS_PER_PAGE),
    [filteredJobs, currentPage],
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

  if (filteredJobs.length === 0) {
    return (
      <div className={`${compact ? "py-8" : "bg-white rounded-2xl p-12 shadow-md"} text-center`}>
        <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-[#8A8A8A]">No interview-related applications found</p>
      </div>
    );
  }

  return (
    <>
    <div id="applied-jobs-pagination" className="space-y-4">
      {paginatedJobs.map((application) => {
        if (!application.job) return null;
        const badge = getStatusBadge(application.status);
        const isRejected = ["rejected", "interview_rejected"].includes(normalizeStatus(application.status));
        const isHired = normalizeStatus(application.status) === "hired";
        const isOnHold = normalizeStatus(application.status) === "on_hold";

        const nStatus = normalizeStatus(application.status);
        const scheduledRounds = application.interviews || [];
        const getHighestScheduledRoundRank = (): number => {
          let maxRank = 4; // default to Interview
          scheduledRounds.forEach((item) => {
            if (!item.round) return;
            const normalizedRound = item.round.toUpperCase().trim();
            if (normalizedRound === "L1") maxRank = Math.max(maxRank, 5);
            else if (normalizedRound === "L2") maxRank = Math.max(maxRank, 6);
            else if (normalizedRound === "L3") maxRank = Math.max(maxRank, 7);
            else if (normalizedRound === "HR" || normalizedRound === "HR ROUND") maxRank = Math.max(maxRank, 8);
          });
          return maxRank;
        };

        let currentRank = 1;
        if (nStatus === "reviewed") {
          currentRank = 2;
        } else if (nStatus === "shortlisted") {
          currentRank = 3;
        } else if (nStatus === "interview_scheduled") {
          currentRank = getHighestScheduledRoundRank();
        } else if (nStatus === "interview_completed") {
          currentRank = 9;
        } else if (nStatus === "interview_selected") {
          currentRank = 10;
        } else if (nStatus === "offered") {
          currentRank = 11;
        } else if (nStatus === "hired") {
          currentRank = 12;
        } else if (nStatus === "interview_rejected") {
          currentRank = getHighestScheduledRoundRank();
        } else if (nStatus === "rejected") {
          if (scheduledRounds.length > 0) {
            currentRank = getHighestScheduledRoundRank();
          } else {
            currentRank = 1;
          }
        } else if (nStatus === "on_hold") {
          if (scheduledRounds.length > 0) {
            currentRank = getHighestScheduledRoundRank();
          } else {
            currentRank = 2;
          }
        }

        const getClickableDetails = (stage: (typeof PIPELINE_STAGES)[number]) => {
          if (stage === "Interview" && currentRank >= 4) {
            const hasDetails = !!application.interview_details || (application.interviews && application.interviews.length > 0);
            if (hasDetails) {
              return {
                clickable: true,
                onClick: () => {
                  setSelectedInterviewRound(null);
                  setInterviewDetailsFor(application);
                  onInterviewDetailsOpen?.(application);
                }
              };
            }
          }
          if (["L1", "L2", "L3", "HR"].includes(stage)) {
            const stageRank = PIPELINE_STAGES.indexOf(stage) + 1;
            if (currentRank >= stageRank) {
              const mappedInterview = [...(application.interviews || [])]
                .reverse()
                .find((item) => {
                  const normalized = (item.round || "").toUpperCase().trim();
                  const normalizedRound = normalized === "HR ROUND" ? "HR" : normalized;
                  return normalizedRound === stage;
                }) || null;
              if (mappedInterview) {
                return {
                  clickable: true,
                  onClick: () => {
                    setSelectedInterviewRound(mappedInterview);
                    setInterviewDetailsFor(application);
                    onInterviewDetailsOpen?.(application);
                  }
                };
              }
            }
          }
          if (stage === "Offer" && currentRank >= 11) {
            if (application.offer_details) {
              return {
                clickable: true,
                onClick: () => {
                  onOfferDetailsOpen?.(application);
                }
              };
            }
          }
          return { clickable: false, onClick: undefined };
        };

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
                <button
                  type="button"
                  aria-label="Close status card"
                  className="text-[#8A8A8A] hover:text-[#646464] transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-4">
              {!isOnHold && !isHired && !isRejected && (
                <>
                  <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
                    <span className="font-medium text-[#7C8593]">Application Progression</span>
                    <span className={`font-semibold px-2 py-0.5 rounded-full ${badge.className}`}>
                      {nStatus === "interview_scheduled" ? "Interviewing" : badge.label}
                    </span>
                  </div>

                  {/* Segmented Pipeline Bar (Single combined bar with no gaps) */}
                  <div className="flex items-center w-full h-[7px] bg-[#EEF0F4] rounded-full relative">
                    {PIPELINE_STAGES.map((stage) => {
                      const clickableInfo = getClickableDetails(stage);
                      const { state, className: statusClass } = getStageState(stage, application.status, application.interviews);
                      const tooltipText = `${stage} (${state.charAt(0).toUpperCase() + state.slice(1)})${clickableInfo.clickable ? " - Click to view details" : ""}`;
                      const isFirst = stage === "Applied";
                      const isLast = stage === "Hired";
                      const roundedClass = isFirst ? "rounded-l-full" : isLast ? "rounded-r-full" : "";

                      if (clickableInfo.clickable) {
                        const animationClass = ["Interview", "L1", "L2", "L3", "HR"].includes(stage)
                          ? "animate-interview-cta"
                          : stage === "Offer"
                          ? "animate-offer-cta"
                          : "";

                        return (
                          <button
                            key={stage}
                            type="button"
                            onClick={clickableInfo.onClick}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                clickableInfo.onClick?.();
                              }
                            }}
                            className={`${statusClass} ${roundedClass} ${animationClass} h-full flex-1 cursor-pointer border-0 p-0 m-0 outline-none transition-all duration-300 hover:brightness-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FF2B2B] relative z-10 hover:z-20`}
                            title={tooltipText}
                            aria-label={tooltipText}
                          />
                        );
                      } else {
                        return (
                          <div
                            key={stage}
                            className={`${statusClass} ${roundedClass} h-full flex-1 transition-all duration-300`}
                            title={tooltipText}
                          />
                        );
                      }
                    })}
                  </div>

                  {/* Boundaries */}
                  <div className="flex justify-between items-center text-[10px] text-gray-400 mt-1">
                    <span>Applied</span>
                    <span>Hired</span>
                  </div>
                </>
              )}

              {/* Status Banners */}
              {isRejected && (
                <div className="flex items-center gap-2">
                  <span className="h-[5px] flex-1 rounded-full bg-red-200/80" />
                  <span className="text-sm text-[#FF2B2B] font-medium">Application not moved forward</span>
                  <span className="h-[5px] flex-1 rounded-full bg-red-200/80" />
                </div>
              )}
              {isOnHold && (
                <div className="flex items-center gap-2">
                  <span className="h-[5px] flex-1 rounded-full bg-amber-200/80" />
                  <span className="text-sm text-[#B45309] font-medium">Application is on hold</span>
                  <span className="h-[5px] flex-1 rounded-full bg-amber-200/80" />
                </div>
              )}
              {isHired && (
                <div className="flex items-center gap-2">
                  <span className="h-[5px] flex-1 rounded-full bg-emerald-200/80" />
                  <span className="text-sm text-emerald-600 font-medium">You are hired</span>
                  <span className="h-[5px] flex-1 rounded-full bg-emerald-200/80" />
                </div>
              )}
            </div>
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
