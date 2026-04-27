import { useEffect, useMemo, useState } from "react";
import { Briefcase, Loader2 } from "lucide-react";
import { Badge } from "./ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./ui/pagination";
import { AppliedJobWithJob, getAppliedJobs } from "../services/jobService";

const JOBS_PER_PAGE = 12;

interface AppliedJobsSectionProps {
  userId?: string;
  compact?: boolean;
  onJobsLoaded?: (jobs: AppliedJobWithJob[]) => void;
}

const STATUS_CLASS: Record<AppliedJobWithJob["displayStatus"], string> = {
  applied: "bg-gray-100 text-gray-700",
  shortlisted: "bg-amber-100 text-amber-700",
  rejected: "bg-red-100 text-red-700",
  interview: "bg-purple-100 text-purple-700",
};

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

export default function AppliedJobsSection({ userId, compact = false, onJobsLoaded }: AppliedJobsSectionProps) {
  const [appliedJobs, setAppliedJobs] = useState<AppliedJobWithJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

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
    return () => {
      cancelled = true;
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
    <div id="applied-jobs-pagination" className="space-y-3">
      {paginatedJobs.map((application) => {
        if (!application.job) return null;

        return (
          <div key={application.id} className={`rounded-2xl ${compact ? "p-4 border border-gray-100 bg-[#F6F6F6]" : "p-5 bg-white shadow-md"}`}>
            <div className="flex justify-between items-start gap-4">
              <div>
                <h3 className={`font-semibold text-[#3A1F1F] ${compact ? "text-base" : "text-lg"}`}>{application.job.title}</h3>
                <p className="text-[#8A8A8A] text-sm">{application.job.company_name} - {formatLocation(application.job)}</p>
                <p className="text-xs text-[#8A8A8A] mt-0.5">Applied on {formatDate(application.applied_at)}</p>
              </div>
              <Badge className={`${STATUS_CLASS[application.displayStatus]} text-xs capitalize`}>
                {application.displayStatus}
              </Badge>
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
  );
}
