import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { useAuth } from "../../lib/auth-context";
import { formatJobDeadline, getEffectiveJobStatus } from "../../lib/jobs";
import { supabase } from "../../lib/supabase";
import { getSavedJobsForCurrentUser, SavedJobWithJob } from "../services/jobService";

interface ComparePageLocationState {
  fromSavedJobs?: boolean;
  selectedJobIds?: string[];
  selectedJobs?: SavedJobWithJob[];
  returnPath?: string;
}

type CompareFieldKey =
  | "jobTitle"
  | "companyName"
  | "location"
  | "employmentType"
  | "salary"
  | "experience"
  | "skills"
  | "education"
  | "deadline"
  | "status";

type CompareField = {
  key: CompareFieldKey;
  label: string;
  getValue: (job: NonNullable<SavedJobWithJob["job"]>) => string;
};

const MAX_COMPARE_JOBS = 3;
const DIFFERENCE_KEYS = new Set<CompareFieldKey>(["salary", "location", "experience", "skills", "deadline"]);
const SAVED_JOBS_COMPARE_STATE_KEY = "savedJobsCompareState";

function formatSalary(job: NonNullable<SavedJobWithJob["job"]>): string {
  if (job.salary_min && job.salary_max && job.salary_type) return `${job.salary_min}-${job.salary_max} ${job.salary_type}`;
  if (job.salary_min && job.salary_type) return `${job.salary_min}+ ${job.salary_type}`;
  if (job.salary_type) return `${job.salary_type} compensation`;
  return "N/A";
}

function formatLocation(job: NonNullable<SavedJobWithJob["job"]>): string {
  if (job.location?.trim()) return job.location.trim();
  if (job.work_mode?.trim()) return job.work_mode.trim();
  return "N/A";
}

function formatExperience(job: NonNullable<SavedJobWithJob["job"]>): string {
  if (job.experience_min && job.experience_max) return `${job.experience_min}-${job.experience_max} years`;
  if (job.experience_min) return `${job.experience_min}+ years`;
  if (job.experience_max) return `Up to ${job.experience_max} years`;
  return "N/A";
}

function formatSkills(job: NonNullable<SavedJobWithJob["job"]>): string {
  if (!job.skills || job.skills.length === 0) return "N/A";
  return job.skills.join(", ");
}

function formatEducation(job: NonNullable<SavedJobWithJob["job"]>): string {
  return job.education?.trim() || "N/A";
}

function formatDeadline(job: NonNullable<SavedJobWithJob["job"]>): string {
  return formatJobDeadline(job) || "N/A";
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeJDSection(value: string | null | undefined, fallback: string): string {
  const normalized = (value || "").trim();
  if (!normalized) return fallback;
  return normalized;
}

function formatQualifications(job: NonNullable<SavedJobWithJob["job"]>): string {
  if (job.description?.trim()) return job.description.trim();
  if (job.requirements?.trim()) return job.requirements.trim();
  if (job.education?.trim()) return job.education.trim();
  return "N/A";
}

function readStoredCompareState(): ComparePageLocationState {
  try {
    const rawValue = sessionStorage.getItem(SAVED_JOBS_COMPARE_STATE_KEY);
    if (!rawValue) return {};
    const parsedValue = JSON.parse(rawValue) as ComparePageLocationState;
    return typeof parsedValue === "object" && parsedValue ? parsedValue : {};
  } catch {
    return {};
  }
}

function getDifferenceHighlightMask(values: string[]): boolean[] {
  const normalizedValues = values.map(normalizeText);
  if (normalizedValues.length < 2) return normalizedValues.map(() => false);

  const frequencyMap = new Map<string, number>();
  normalizedValues.forEach((value) => {
    frequencyMap.set(value, (frequencyMap.get(value) || 0) + 1);
  });

  const maxFrequency = Math.max(...Array.from(frequencyMap.values()));
  const hasDifference = maxFrequency !== normalizedValues.length;

  if (!hasDifference) return normalizedValues.map(() => false);
  if (maxFrequency === 1) return normalizedValues.map(() => true);

  return normalizedValues.map((value) => (frequencyMap.get(value) || 0) < maxFrequency);
}

export default function SavedJobsComparePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();

  const navigationState = (location.state || {}) as ComparePageLocationState;
  const storedCompareState = useMemo(readStoredCompareState, []);

  const openedFromSavedJobs = navigationState.fromSavedJobs === true || storedCompareState.fromSavedJobs === true;
  const returnPath = navigationState.returnPath || storedCompareState.returnPath || "/jobseeker/dashboard";

  const initialSelectedJobs = useMemo(() => {
    const selectedJobs = Array.isArray(navigationState.selectedJobs)
      ? navigationState.selectedJobs
      : Array.isArray(storedCompareState.selectedJobs)
      ? storedCompareState.selectedJobs
      : [];

    return selectedJobs
      .filter((savedJob): savedJob is SavedJobWithJob => Boolean(savedJob && savedJob.job && savedJob.job_id))
      .slice(0, MAX_COMPARE_JOBS);
  }, [navigationState.selectedJobs, storedCompareState.selectedJobs]);

  const initialSelectedJobIds = useMemo(() => {
    const selectedIds = Array.isArray(navigationState.selectedJobIds)
      ? navigationState.selectedJobIds
      : Array.isArray(storedCompareState.selectedJobIds)
      ? storedCompareState.selectedJobIds
      : [];

    const normalizedIds = selectedIds.filter(
      (jobId): jobId is string => typeof jobId === "string" && jobId.trim().length > 0,
    );

    // Fallback to selectedJobs order when id list is missing/stale so UI order stays deterministic.
    const fallbackIdsFromJobs = initialSelectedJobs
      .map((savedJob) => savedJob.job_id)
      .filter((jobId): jobId is string => typeof jobId === "string" && jobId.trim().length > 0);

    const sourceIds = normalizedIds.length > 0 ? normalizedIds : fallbackIdsFromJobs;
    return Array.from(new Set(sourceIds)).slice(0, MAX_COMPARE_JOBS);
  }, [initialSelectedJobs, navigationState.selectedJobIds, storedCompareState.selectedJobIds]);

  const [savedJobs, setSavedJobs] = useState<SavedJobWithJob[]>(initialSelectedJobs);
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>(initialSelectedJobIds);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setSelectedJobIds(initialSelectedJobIds);
  }, [initialSelectedJobIds]);

  useEffect(() => {
    if (initialSelectedJobs.length === 0) return;
    setSavedJobs((previousJobs) => (previousJobs.length > 0 ? previousJobs : initialSelectedJobs));
  }, [initialSelectedJobs]);

  const refreshSavedJobs = useCallback(async () => {
    if (!openedFromSavedJobs) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const jobs = await getSavedJobsForCurrentUser();
      setSavedJobs(jobs);
    } catch {
      setSavedJobs([]);
      setError("Unable to load saved jobs right now.");
    } finally {
      setLoading(false);
    }
  }, [openedFromSavedJobs]);

  useEffect(() => {
    void refreshSavedJobs();
  }, [refreshSavedJobs]);

  useEffect(() => {
    if (!openedFromSavedJobs || !profile?.id) return;

    const channel = supabase
      .channel(`saved-jobs-compare-${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "saved_jobs",
          filter: `profile_id=eq.${profile.id}`,
        },
        () => {
          void refreshSavedJobs();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [openedFromSavedJobs, profile?.id, refreshSavedJobs]);

  useEffect(() => {
    const savedJobIdSet = new Set(
      savedJobs
        .map((savedJob) => savedJob.job_id)
        .filter((jobId): jobId is string => typeof jobId === "string" && jobId.length > 0),
    );

    setSelectedJobIds((prev) => prev.filter((jobId) => savedJobIdSet.has(jobId)).slice(0, MAX_COMPARE_JOBS));
  }, [savedJobs]);

  useEffect(() => {
    try {
      const selectedJobsForStorage = selectedJobIds
        .map((jobId) => savedJobs.find((savedJob) => savedJob.job_id === jobId))
        .filter((savedJob): savedJob is SavedJobWithJob => Boolean(savedJob && savedJob.job));

      const compareState: ComparePageLocationState = {
        fromSavedJobs: true,
        selectedJobIds,
        selectedJobs: selectedJobsForStorage,
        returnPath,
      };

      sessionStorage.setItem(SAVED_JOBS_COMPARE_STATE_KEY, JSON.stringify(compareState));
    } catch {
      // ignore sessionStorage errors
    }
  }, [returnPath, savedJobs, selectedJobIds]);

  const selectedJobs = useMemo(() => {
    if (selectedJobIds.length === 0) return [];

    return selectedJobIds
      .map((jobId) => savedJobs.find((savedJob) => savedJob.job_id === jobId))
      .filter((savedJob): savedJob is SavedJobWithJob => Boolean(savedJob && savedJob.job));
  }, [savedJobs, selectedJobIds]);

  const compareFields: CompareField[] = useMemo(
    () => [
      { key: "jobTitle", label: "Job Title", getValue: (job) => job.title?.trim() || "N/A" },
      { key: "companyName", label: "Company Name", getValue: (job) => job.company_name?.trim() || "N/A" },
      { key: "location", label: "Location", getValue: (job) => formatLocation(job) },
      { key: "employmentType", label: "Employment Type", getValue: (job) => job.employment_type?.trim() || job.work_mode?.trim() || "N/A" },
      { key: "salary", label: "Salary Range", getValue: (job) => formatSalary(job) },
      { key: "experience", label: "Experience Required", getValue: (job) => formatExperience(job) },
      { key: "skills", label: "Skills Required", getValue: (job) => formatSkills(job) },
      { key: "education", label: "Education", getValue: (job) => formatEducation(job) },
      { key: "deadline", label: "Application Deadline", getValue: (job) => formatDeadline(job) },
      { key: "status", label: "Job Status", getValue: (job) => getEffectiveJobStatus(job) || "N/A" },
    ],
    [],
  );

  const tableMinWidthClass = selectedJobs.length >= 3 ? "min-w-[1080px]" : "min-w-[920px]";

  function removeSelectedJob(jobId: string) {
    setSelectedJobIds((prev) => prev.filter((id) => id !== jobId));
  }

  function goBackToSavedJobs() {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(returnPath);
  }

  if (!openedFromSavedJobs) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl p-8 shadow-md text-center">
          <p className="text-[#3A1F1F] font-semibold mb-2">Please select at least 2 jobs to compare.</p>
          <p className="text-sm text-[#8A8A8A] mb-6">Please start comparison from the saved jobs section.</p>
          <Button className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full" onClick={() => navigate("/jobseeker/dashboard")}>
            Go to Saved Jobs
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl p-10 shadow-md text-center">
          <Loader2 className="h-10 w-10 text-[#FF2B2B] animate-spin mx-auto mb-3" />
          <p className="text-sm text-[#8A8A8A]">Loading saved jobs for comparison...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl p-8 shadow-md text-center">
          <p className="text-[#8A8A8A] mb-4">{error}</p>
          <Button variant="outline" className="rounded-full" onClick={() => void refreshSavedJobs()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (savedJobs.length < 2) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl p-8 shadow-md text-center">
          <p className="text-[#3A1F1F] font-semibold mb-2">Save at least 2 jobs to compare.</p>
          <Button className="mt-4 bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full" onClick={goBackToSavedJobs}>
            Back to Saved Jobs
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button variant="ghost" className="rounded-full px-0 text-[#8A8A8A] hover:text-[#3A1F1F]" onClick={goBackToSavedJobs}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Saved Jobs
          </Button>
          <h1 className="text-3xl font-bold text-[#3A1F1F]">Compare Saved Jobs</h1>
          <p className="text-sm text-[#8A8A8A] mt-1">Side-by-side view for your selected saved jobs.</p>
        </div>
        <Badge className="bg-[#FF2B2B]/10 text-[#FF2B2B] border border-[#FF2B2B]/20 px-3 py-1.5">
          Selected: {selectedJobIds.length}/{MAX_COMPARE_JOBS}
        </Badge>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-md">
        <div className="flex flex-wrap gap-2">
          {selectedJobs.map((savedJob) => (
            <div key={savedJob.id} className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-[#F6F6F6] px-3 py-1.5">
              <span className="text-xs text-[#3A1F1F]">
                {savedJob.job?.title?.trim() || "N/A"} · {savedJob.job?.company_name?.trim() || "N/A"}
              </span>
              <button
                type="button"
                className="text-[#8A8A8A] hover:text-red-600"
                onClick={() => removeSelectedJob(savedJob.job_id)}
                aria-label={`Remove ${savedJob.job?.title || "job"} from comparison`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {selectedJobs.length < 2 && (
          <p className="text-xs text-red-600 mt-2">Please select at least 2 jobs to compare.</p>
        )}
      </div>

      {selectedJobs.length >= 2 && (
        <>
          <div className="bg-white rounded-2xl p-5 shadow-md overflow-x-auto">
            <table className={`${tableMinWidthClass} w-full table-fixed border-separate border-spacing-0`}>
              <colgroup>
                <col className="w-44" />
                {selectedJobs.map((savedJob) => (
                  <col key={`col-${savedJob.id}`} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th className="text-left text-base text-[#6B6B6B] font-semibold bg-[#F1F1F1] px-5 py-4 rounded-l-xl border-b border-gray-200">Field</th>
                  {selectedJobs.map((savedJob, index) => (
                    <th
                      key={savedJob.id}
                      className={`text-left bg-[#F1F1F1] px-5 py-4 border-b border-gray-200 ${index === selectedJobs.length - 1 ? "rounded-r-xl" : ""}`}
                    >
                      <p className="text-base font-semibold text-[#3A1F1F] whitespace-normal break-words leading-6">
                        {savedJob.job?.title?.trim() || "N/A"}
                      </p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compareFields.map((field) => {
                  const values = selectedJobs.map((savedJob) => field.getValue(savedJob.job!));
                  const highlightMask = DIFFERENCE_KEYS.has(field.key) ? getDifferenceHighlightMask(values) : values.map(() => false);

                  return (
                    <tr key={field.key}>
                      <th className="text-left align-top text-[15px] text-[#3A1F1F] font-medium border-b border-gray-100 px-5 py-4 whitespace-normal break-words">
                        {field.label}
                      </th>
                      {values.map((value, index) => (
                        <td
                          key={`${field.key}-${selectedJobs[index].id}`}
                          className={`align-top border-b border-gray-100 px-5 py-4 text-[15px] whitespace-normal break-words leading-6 ${
                            highlightMask[index] ? "bg-amber-100 text-amber-950 font-semibold shadow-[inset_0_0_0_1px_rgba(217,119,6,0.25)]" : "text-[#3A1F1F]"
                          }`}
                        >
                          {value}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-md">
            <h2 className="text-lg font-semibold text-[#3A1F1F] mb-4">Full JD</h2>
            <div className="flex gap-4 overflow-x-auto pb-1">
              {selectedJobs.map((savedJob) => {
                const job = savedJob.job!;
                const jdSections = [
                  {
                    title: "Roles & Responsibilities",
                    value: normalizeJDSection(job.roles_responsibilities, "N/A"),
                  },
                  {
                    title: "Requirements",
                    value: normalizeJDSection(job.requirements, "N/A"),
                  },
                  {
                    title: "Qualifications",
                    value: normalizeJDSection(formatQualifications(job), "N/A"),
                  },
                ];

                return (
                  <article key={savedJob.id} className="min-w-[320px] md:min-w-[360px] flex-1 border border-gray-200 rounded-xl bg-[#F6F6F6] p-6">
                    <h3 className="text-base font-semibold text-[#3A1F1F]">{job.title?.trim() || "N/A"}</h3>
                    <p className="text-sm text-[#8A8A8A] mb-4">{job.company_name?.trim() || "N/A"}</p>
                    <div className="max-h-[420px] overflow-y-auto space-y-5 pr-2">
                      {jdSections.map((section, sectionIndex) => (
                        <section key={section.title} className={sectionIndex > 0 ? "pt-4 border-t border-gray-200" : ""}>
                          <h4 className="text-sm font-semibold text-[#3A1F1F] mb-2">{section.title}</h4>
                          <div className="text-sm text-[#5A5A5A] whitespace-pre-wrap leading-6 pl-4 pr-2">
                            {section.value}
                          </div>
                        </section>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
