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
}

const PIPELINE_STAGES = ["Applied", "Profile Viewed", "Shortlisted", "Interview", "Offer"] as const;

const STATUS_BADGE_CLASS: Record<string, string> = {
  applied: "bg-slate-100 text-slate-700",
  "profile viewed": "bg-blue-100 text-blue-700",
  shortlisted: "bg-pink-100 text-pink-700",
  interview: "bg-purple-100 text-purple-700",
  "interview scheduled": "bg-purple-100 text-purple-700",
  offer: "bg-orange-100 text-orange-700",
  offered: "bg-orange-100 text-orange-700",
  hired: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

const PIPELINE_STAGE_CLASS: Record<(typeof PIPELINE_STAGES)[number], { completed: string; pending: string; connector: string }> = {
  Applied: {
    completed: "bg-[#FF2B2B] text-white",
    pending: "bg-[#EEF0F4] text-[#98A2B3]",
    connector: "bg-[#FF2B2B]",
  },
  "Profile Viewed": {
    completed: "bg-[#FF2B2B] text-white",
    pending: "bg-[#EEF0F4] text-[#98A2B3]",
    connector: "bg-[#FF2B2B]",
  },
  Shortlisted: {
    completed: "bg-[#FF2B2B] text-white",
    pending: "bg-[#EEF0F4] text-[#98A2B3]",
    connector: "bg-[#FF2B2B]",
  },
  Interview: {
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

function normalizeStatus(status: AppliedJobWithJob["status"]): "new" | "reviewed" | "shortlisted" | "interview" | "offered" | "hired" | "rejected" {
  const normalized = (status || "").toLowerCase().trim().replace(/[\s-]+/g, "_");
  if (normalized === "rejected") return "rejected";
  if (normalized === "hired" || normalized === "hire" || normalized === "joined") return "hired";
  if (normalized === "offered" || normalized === "offer_given") return "offered";
  if (normalized === "interview_scheduled" || normalized === "interview") return "interview";
  if (normalized === "shortlisted") return "shortlisted";
  if (normalized === "screening" || normalized === "reviewed") return "reviewed";
  return "new";
}

function getStatusBadge(status: AppliedJobWithJob["status"]) {
  const normalized = normalizeStatus(status);
  if (normalized === "reviewed") return { label: "Profile Viewed", className: STATUS_BADGE_CLASS["profile viewed"] };
  if (normalized === "shortlisted") return { label: "Shortlisted", className: STATUS_BADGE_CLASS.shortlisted };
  if (normalized === "interview") return { label: "Interview Scheduled", className: STATUS_BADGE_CLASS["interview scheduled"] };
  if (normalized === "offered") return { label: "Offer Received", className: STATUS_BADGE_CLASS.offered };
  if (normalized === "hired") return { label: "Hired", className: STATUS_BADGE_CLASS.hired };
  if (normalized === "rejected") return { label: "Rejected", className: STATUS_BADGE_CLASS.rejected };
  return { label: "Applied", className: STATUS_BADGE_CLASS.applied };
}

function getCompletedStageCount(status: AppliedJobWithJob["status"]): number {
  const normalized = normalizeStatus(status);
  if (normalized === "rejected") return 0;
  if (normalized === "hired") return 5;
  if (normalized === "offered") return 5;
  if (normalized === "interview") return 4;
  if (normalized === "shortlisted") return 3;
  if (normalized === "reviewed") return 2;
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

export default function AppliedJobsSection({ userId, compact = false, onJobsLoaded, onInterviewDetailsOpen }: AppliedJobsSectionProps) {
  const [appliedJobs, setAppliedJobs] = useState<AppliedJobWithJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [interviewDetailsFor, setInterviewDetailsFor] = useState<AppliedJobWithJob | null>(null);

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

    loadAppliedJobs(currentUserId);

    const channel = supabase
      .channel(`jobseeker-applications-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "applications",
          filter: `profile_id=eq.${currentUserId}`,
        },
        () => {
          loadAppliedJobs(currentUserId);
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
          loadAppliedJobs(currentUserId);
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
          loadAppliedJobs(currentUserId);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
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

            {!isRejected && !isHired ? (
              <div className="mt-4 overflow-x-auto">
                <div className="inline-flex min-w-full items-center">
                  {PIPELINE_STAGES.map((stage, index) => {
                    const completed = index < completedCount;
                    const connectorCompleted = index < completedCount - 1;
                    const isInterviewStage = stage === "Interview";
                    const isInterviewScheduled = normalizeStatus(application.status) === "interview";
                    const isInterviewActive = isInterviewStage && isInterviewScheduled;
                    const handleInterviewClick = () => {
                      setInterviewDetailsFor(application);
                      onInterviewDetailsOpen?.(application);
                    };

                    return (
                      <div key={stage} className="flex items-center">
                        {isInterviewActive ? (
                          <button
                            type="button"
                            onClick={handleInterviewClick}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                handleInterviewClick();
                              }
                            }}
                            className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
                              completed ? PIPELINE_STAGE_CLASS[stage].completed : PIPELINE_STAGE_CLASS[stage].pending
                            } cursor-pointer animate-pulse focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2B2B] focus-visible:ring-offset-1`}
                            aria-label="View interview details"
                            title="View interview details"
                          >
                            {stage}
                          </button>
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
    <Dialog open={!onInterviewDetailsOpen && Boolean(interviewDetailsFor)} onOpenChange={(open) => !open && setInterviewDetailsFor(null)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Interview Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm text-[#3A1F1F]">
          <p className="whitespace-pre-wrap">{interviewDetailsFor?.interview_details?.interview_message || "No interview details available."}</p>
          <p className="text-[#8A8A8A]">
            Sent on{" "}
            {interviewDetailsFor?.interview_details?.updated_at
              ? new Date(interviewDetailsFor.interview_details.updated_at).toLocaleString("en-IN")
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
