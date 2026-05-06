import { useEffect, useMemo, useState } from "react";
import { Bookmark, DollarSign, Loader2, Trash2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./ui/pagination";
import { getSavedJobs, removeSavedJob, SavedJobWithJob } from "../services/jobService";

const JOBS_PER_PAGE = 12;
const MAX_COMPARE_JOBS = 3;

interface SavedJobsSectionProps {
  userId?: string;
  compact?: boolean;
  appliedJobIds?: string[];
  onJobsLoaded?: (jobs: SavedJobWithJob[]) => void;
  showComparisonControls?: boolean;
  onCompareRequested?: (state: {
    fromSavedJobs: true;
    selectedJobIds: string[];
    selectedJobs: SavedJobWithJob[];
    returnPath: string;
  }) => void;
}

const SAVED_JOBS_COMPARE_STATE_KEY = "savedJobsCompareState";

function formatLocation(job: SavedJobWithJob["job"]): string {
  return job?.location || job?.work_mode || "India";
}

function formatSalary(job: SavedJobWithJob["job"]): string {
  if (!job) return "Compensation as per company standards";
  if (job.salary_min && job.salary_max && job.salary_type) return `${job.salary_min}-${job.salary_max} ${job.salary_type}`;
  if (job.salary_min && job.salary_type) return `${job.salary_min}+ ${job.salary_type}`;
  if (job.salary_type) return `${job.salary_type} compensation`;
  return "Compensation as per company standards";
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function SavedJobsSection({
  userId,
  compact = false,
  appliedJobIds = [],
  onJobsLoaded,
  showComparisonControls = true,
  onCompareRequested,
}: SavedJobsSectionProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [savedJobs, setSavedJobs] = useState<SavedJobWithJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [compareJobIds, setCompareJobIds] = useState<string[]>([]);
  const [compareError, setCompareError] = useState("");
  const appliedJobIdSet = useMemo(() => new Set(appliedJobIds), [appliedJobIds]);

  useEffect(() => {
    const currentUserId = userId;
    if (!currentUserId) {
      setSavedJobs([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function loadSavedJobs(resolvedUserId: string) {
      setLoading(true);
      setError("");
      try {
        const jobs = await getSavedJobs(resolvedUserId);
        if (cancelled) return;
        setSavedJobs(jobs);
        onJobsLoaded?.(jobs);
      } catch {
        if (!cancelled) {
          setError("Unable to load saved jobs right now.");
          setSavedJobs([]);
          onJobsLoaded?.([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSavedJobs(currentUserId);
    return () => {
      cancelled = true;
    };
  }, [onJobsLoaded, userId]);

  const totalPages = Math.max(1, Math.ceil(savedJobs.length / JOBS_PER_PAGE));
  const paginatedJobs = useMemo(
    () => savedJobs.slice((currentPage - 1) * JOBS_PER_PAGE, currentPage * JOBS_PER_PAGE),
    [currentPage, savedJobs],
  );

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    const savedIdSet = new Set(
      savedJobs
        .map((savedJob) => savedJob.job_id)
        .filter((jobId): jobId is string => typeof jobId === "string" && jobId.length > 0),
    );
    setCompareJobIds((prev) => prev.filter((jobId) => savedIdSet.has(jobId)));
  }, [savedJobs]);

  useEffect(() => {
    if (!compareError) return;
    const timeoutId = window.setTimeout(() => setCompareError(""), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [compareError]);

  async function handleRemove(jobId: string) {
    if (!userId) return;
    let previousJobs: SavedJobWithJob[] = [];
    try {
      setSavedJobs((jobs) => {
        previousJobs = jobs;
        const nextJobs = jobs.filter((savedJob) => savedJob.job_id !== jobId);
        onJobsLoaded?.(nextJobs);
        return nextJobs;
      });
      setCompareJobIds((prev) => prev.filter((id) => id !== jobId));
      await removeSavedJob(userId, jobId);
    } catch {
      setError("Unable to remove this saved job right now.");
      if (previousJobs.length > 0) {
        setSavedJobs(previousJobs);
        onJobsLoaded?.(previousJobs);
      }
    }
  }

  function toggleCompare(jobId: string) {
    setCompareError("");
    setCompareJobIds((prev) => {
      if (prev.includes(jobId)) return prev.filter((id) => id !== jobId);
      if (prev.length >= MAX_COMPARE_JOBS) {
        setCompareError("You can compare up to 3 saved jobs only.");
        return prev;
      }
      return [...prev, jobId];
    });
  }

  function openComparePage() {
    if (compareJobIds.length < 2) {
      setCompareError("Please select at least 2 jobs to compare.");
      return;
    }

    const selectedSavedJobs = compareJobIds
      .map((jobId) => savedJobs.find((savedJob) => savedJob.job_id === jobId))
      .filter((savedJob): savedJob is SavedJobWithJob => Boolean(savedJob && savedJob.job));

    const compareState = {
      fromSavedJobs: true,
      selectedJobIds: compareJobIds,
      selectedJobs: selectedSavedJobs,
      returnPath: location.pathname,
    };

    try {
      sessionStorage.setItem(SAVED_JOBS_COMPARE_STATE_KEY, JSON.stringify(compareState));
    } catch {
      // ignore sessionStorage errors and continue with route state
    }

    if (onCompareRequested) {
      onCompareRequested(compareState);
      return;
    }

    navigate("/jobseeker/dashboard/saved-jobs/compare", { state: compareState });
  }

  if (loading) {
    return (
      <div className={`${compact ? "py-8" : "bg-white rounded-2xl p-12 shadow-md"} text-center`}>
        <Loader2 className="h-10 w-10 text-[#FF2B2B] animate-spin mx-auto mb-3" />
        <p className="text-[#8A8A8A] text-sm">Loading saved jobs...</p>
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

  if (savedJobs.length === 0) {
    return (
      <div className={`${compact ? "py-8" : "bg-white rounded-2xl p-12 shadow-md"} text-center`}>
        <Bookmark className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-[#8A8A8A]">No saved jobs found</p>
        {showComparisonControls && (
          <p className="text-xs text-red-600 mt-1">Save at least 2 jobs to compare.</p>
        )}
      </div>
    );
  }

  return (
    <div id="saved-jobs-pagination" className="space-y-3">
      {paginatedJobs.map((savedJob) => {
        if (!savedJob.job) return null;

        return (
          <div key={savedJob.id} className={`rounded-2xl flex items-center justify-between gap-4 ${compact ? "p-4 border border-gray-100 bg-[#F6F6F6]" : "p-5 bg-white shadow-md"}`}>
            <div>
              <h3 className={`font-semibold text-[#3A1F1F] ${compact ? "text-base" : ""}`}>{savedJob.job.title}</h3>
              <p className="text-[#8A8A8A] text-sm">{savedJob.job.company_name} - {formatLocation(savedJob.job)}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-[#8A8A8A]">
                <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{formatSalary(savedJob.job)}</span>
                <span>Saved {formatDate(savedJob.saved_at)}</span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              {typeof savedJob.job_id === "string" && savedJob.job_id.length > 0 ? (
                <>
                  {appliedJobIdSet.has(savedJob.job_id) && (
                    <Badge className="bg-green-100 text-green-700 text-xs">Applied</Badge>
                  )}
                  {showComparisonControls && (
                    <label className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-[#3A1F1F]">
                      <Checkbox
                        checked={compareJobIds.includes(savedJob.job_id)}
                        onCheckedChange={() => toggleCompare(savedJob.job_id)}
                        disabled={compareJobIds.length >= MAX_COMPARE_JOBS && !compareJobIds.includes(savedJob.job_id)}
                      />
                      Compare
                    </label>
                  )}
                  <Button
                    size="sm"
                    className={`rounded-full text-xs ${appliedJobIdSet.has(savedJob.job_id) ? "bg-green-500 hover:bg-green-500 text-white cursor-default" : "bg-[#FF2B2B] hover:bg-[#e02525] text-white"}`}
                    onClick={() => {
                      if (!appliedJobIdSet.has(savedJob.job_id)) navigate(`/job/${savedJob.job_id}`);
                    }}
                    disabled={appliedJobIdSet.has(savedJob.job_id)}
                  >
                    {appliedJobIdSet.has(savedJob.job_id) ? "Applied" : "Apply Now"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-[#8A8A8A] hover:text-red-500 rounded-full"
                    onClick={() => handleRemove(savedJob.job_id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="ghost" className="text-[#8A8A8A] rounded-full" disabled>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        );
      })}

      {showComparisonControls && (
        <div className={`${compact ? "p-4" : "p-5"} rounded-2xl border border-gray-200 bg-white`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-[#3A1F1F]">
              Compare Selection: {compareJobIds.length}/{MAX_COMPARE_JOBS}
            </p>
            <div className="flex items-center gap-2">
              {compareJobIds.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-full text-xs text-[#8A8A8A]"
                  onClick={() => setCompareJobIds([])}
                >
                  Clear
                </Button>
              )}
              <Button
                size="sm"
                className="rounded-full text-xs bg-[#FF2B2B] hover:bg-[#e02525] text-white"
                onClick={openComparePage}
                disabled={compareJobIds.length < 2 || savedJobs.length < 2}
              >
                Compare Jobs
              </Button>
            </div>
          </div>

          {savedJobs.length < 2 ? (
            <p className="text-xs text-red-600 mt-1">Save at least 2 jobs to compare.</p>
          ) : compareJobIds.length < 2 ? (
            <p className="text-xs text-red-600 mt-1">Please select at least 2 jobs to compare.</p>
          ) : null}

          {compareError && <p className="text-xs text-red-600 mt-1">{compareError}</p>}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <Pagination>
            <PaginationContent className="flex-wrap justify-center gap-2">
              <PaginationItem>
                <PaginationPrevious
                  href="#saved-jobs-pagination"
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
                    href="#saved-jobs-pagination"
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
                  href="#saved-jobs-pagination"
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
  );
}
