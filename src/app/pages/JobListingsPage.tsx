import { useEffect, useMemo, useState } from "react";
import { Menu, Search, MapPin, DollarSign, Clock, ChevronRight, Facebook, Instagram, Twitter, Bell, Star, ArrowRight, Users } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../components/ui/pagination";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "../components/ui/sheet";
import { useNavigate } from "react-router";
import logoImage from "../../logo/logo.png";
import { supabase, type Job as DBJob } from "../../lib/supabase";
import { formatJobSalary, isJobVisibleToSeekers } from "../../lib/jobs";
import { useAuth } from "../../lib/auth-context";
import { getRecommendedJobs, recordJobInteraction, recordJobSearch } from "../../lib/jobRecommendations";
import { isIndianLocation } from "../../lib/locationData";
import JobShareButton from "../components/JobShareButton";
import {
  assignBalancedCategories,
  getAvailableJobCategories,
  getRandomJobCategories,
  type JobCategory,
} from "../../lib/jobCategorization";

type DisplayJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  type: string;
  interviewMode?: string;
  description: string;
  featured: boolean;
  category: JobCategory | null;
  dbJob?: DBJob;
  applicantCount?: number;
};

const JOBS_PER_PAGE = 12;

function formatLocation(job: DBJob): string {
  if (job.location?.trim()) return job.location;
  if (job.work_mode?.trim()) return job.work_mode;
  return "India";
}

function formatType(job: DBJob): string {
  if (job.employment_type?.trim()) return job.employment_type;
  if (job.work_mode?.trim()) return job.work_mode;
  if (job.department?.trim()) return job.department;
  return "Full-time";
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function formatDescription(job: DBJob): string {
  if (job.description?.trim()) return stripHtml(job.description);
  if (job.roles_responsibilities?.trim()) return stripHtml(job.roles_responsibilities);
  if (job.requirements?.trim()) return stripHtml(job.requirements);

  const parts = [
    job.department?.trim(),
    job.industry?.trim(),
    job.skills?.length ? `Skills: ${job.skills.slice(0, 3).join(", ")}` : "",
  ].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(" | ");
  }

  return "Explore this opportunity and apply now.";
}

function normalizeInterviewMode(raw: unknown): string | null {
  if (raw == null) return null;
  const normalized = String(raw).trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  return normalized || null;
}

function jobMatchesInterviewModes(job: DBJob, preferredModes: string[]): boolean {
  if (preferredModes.length === 0) return true;
  const jobMode = normalizeInterviewMode(job.interview_mode) || normalizeInterviewMode(job.work_mode);
  if (!jobMode) return false;
  return preferredModes.some((mode) => normalizeInterviewMode(mode) === jobMode);
}

export default function JobListingsPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [email, setEmail] = useState("");
  const [jobs, setJobs] = useState<DisplayJob[]>([]);
  const [visibleCategories, setVisibleCategories] = useState<JobCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const navigate = useNavigate();
  const { profile, role } = useAuth();

  useEffect(() => {
    let mounted = true;

    async function fetchJobs() {
      setLoading(true);
      setLoadError("");

      const [{ data, error }, applicationsRes, savedRes] = await Promise.all([
        supabase
          .from("jobs")
          .select("*")
          .eq("status", "Active")
          .order("created_at", { ascending: false }),
        profile?.id
          ? supabase.from("applications").select("job_id").eq("profile_id", profile.id)
          : Promise.resolve({ data: [] as { job_id: string }[] }),
        profile?.id
          ? supabase.from("saved_jobs").select("job_id").eq("profile_id", profile.id)
          : Promise.resolve({ data: [] as { job_id: string }[] }),
      ]);

      if (!mounted) return;

      if (error) {
        setLoadError("Unable to load jobs right now.");
        setJobs([]);
        setLoading(false);
        return;
      }

      const appliedJobIds = (applicationsRes.data || []).map((item) => item.job_id);
      const savedJobIds = (savedRes.data || []).map((item) => item.job_id);
      let rawModes: string[] = [];
      if (role === "jobseeker" && profile?.preferred_interview_mode) {
        const modeData = profile.preferred_interview_mode as unknown;
        if (Array.isArray(modeData)) {
          rawModes = modeData as string[];
        } else if (typeof modeData === "string") {
          try {
            const parsed = JSON.parse(modeData);
            if (Array.isArray(parsed)) rawModes = parsed as string[];
          } catch (e) {
            rawModes = modeData.split(",").map((s: string) => s.trim()).filter(Boolean);
          }
        }
      }
      const preferredInterviewModes = Array.isArray(rawModes)
        ? rawModes
            .map((value: string) => normalizeInterviewMode(value))
            .filter((value: string | null): value is string => Boolean(value))
        : [];

      const visibleIndianJobs = assignBalancedCategories((data || [])
        .filter((job) => isJobVisibleToSeekers(job) && isIndianLocation(job.location))
        .filter((job) => jobMatchesInterviewModes(job, preferredInterviewModes))
        .map((job) => ({
          id: job.id,
          title: job.title,
          company: job.company_name,
          location: formatLocation(job),
          salary: formatJobSalary(job),
          type: formatType(job),
          interviewMode: job.interview_mode || undefined,
          description: formatDescription(job),
          category: null,
          featured: false,
          dbJob: job,
          applicantCount: job.applicant_count || 0,
        })));

      const recommended = getRecommendedJobs(visibleIndianJobs, {
        userId: role === "jobseeker" ? profile?.id : null,
        profile: role === "jobseeker" ? profile : null,
        appliedJobIds,
        savedJobIds,
      });

      const preparedJobs = recommended.map((job, index) => ({ ...job, featured: index < 3 }));
      const availableCategories = getAvailableJobCategories(preparedJobs);

      setJobs(preparedJobs);
      setVisibleCategories(getRandomJobCategories(availableCategories, 3));
      setLoading(false);
    }

    fetchJobs();
    return () => {
      mounted = false;
    };
  }, [profile, role]);

  // Subscribe to real-time jobs table changes to update counts automatically
  useEffect(() => {
    const channel = supabase
      .channel("joblistings-jobs-realtime")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "jobs",
        },
        (payload) => {
          const updatedJob = payload.new as DBJob;
          if (updatedJob && updatedJob.id) {
            setJobs((prev) =>
              prev.map((job) => {
                if (job.id === updatedJob.id) {
                  const dbJob = job.dbJob;
                  if (dbJob) {
                    const updatedDbJob = {
                      ...dbJob,
                      applicant_count: updatedJob.applicant_count || 0,
                    };
                    return {
                      ...job,
                      dbJob: updatedDbJob,
                      applicantCount: updatedJob.applicant_count || 0,
                    };
                  }
                }
                return job;
              })
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function handleSearchSubmit() {
    recordJobSearch(searchTerm, role === "jobseeker" ? profile?.id : null);
  }

  useEffect(() => {
    if (selectedCategory !== "ALL" && !visibleCategories.includes(selectedCategory as JobCategory)) {
      setSelectedCategory("ALL");
    }
  }, [selectedCategory, visibleCategories]);

  const categories = useMemo(() => ["ALL", ...visibleCategories], [visibleCategories]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !term ||
        job.title.toLowerCase().includes(term) ||
        job.company.toLowerCase().includes(term) ||
        job.location.toLowerCase().includes(term);
      const matchesCategory =
        selectedCategory === "ALL"
          ? visibleCategories.length === 0 || (job.category !== null && visibleCategories.includes(job.category))
          : job.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [jobs, searchTerm, selectedCategory, visibleCategories]);

  const displayJobs = useMemo(() => {
    if (selectedCategory !== "ALL") return filteredJobs;

    const grouped = new Map<JobCategory, DisplayJob[]>();
    visibleCategories.forEach((category) => grouped.set(category, []));

    filteredJobs.forEach((job) => {
      if (job.category && grouped.has(job.category)) {
        grouped.get(job.category)?.push(job);
      }
    });

    const mixed: DisplayJob[] = [];
    while (mixed.length < filteredJobs.length) {
      let addedInRound = false;
      for (const key of visibleCategories) {
        const nextJob = grouped.get(key)?.shift();
        if (nextJob) {
          mixed.push(nextJob);
          addedInRound = true;
        }
      }
      if (!addedInRound) break;
    }

    return mixed;
  }, [filteredJobs, selectedCategory, visibleCategories]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);

  const totalPages = Math.ceil(displayJobs.length / JOBS_PER_PAGE);

  useEffect(() => {
    if (totalPages === 0) {
      setCurrentPage(1);
      return;
    }

    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedJobs = useMemo(() => {
    const startIndex = (currentPage - 1) * JOBS_PER_PAGE;
    return displayJobs.slice(startIndex, startIndex + JOBS_PER_PAGE);
  }, [currentPage, displayJobs]);

  const pageNumbers = useMemo(
    () => Array.from({ length: totalPages }, (_, index) => index + 1),
    [totalPages],
  );

  return (
    <div className="min-h-screen bg-[#F6F6F6]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <img src={logoImage} alt="RhirePro Logo" className="w-10 h-10" />
            <div className="text-xl font-bold text-[#3A1F1F]">
              Rhire<span className="text-[#FF2B2B]">Pro</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <button onClick={() => navigate('/')} className="text-[#3A1F1F] hover:text-[#FF2B2B] transition-colors">
              Home
            </button>
            <button onClick={() => navigate('/')} className="text-[#3A1F1F] hover:text-[#FF2B2B] transition-colors">
              About Us
            </button>
            <Button
              className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full px-6"
            >
              Jobs
            </Button>
            <button onClick={() => navigate('/')} className="text-[#3A1F1F] hover:text-[#FF2B2B] transition-colors">
              Contact Us
            </button>
          </nav>

          {/* Hamburger Menu */}
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <button className="md:ml-4 p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Menu className="h-6 w-6 text-[#3A1F1F]" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 bg-white">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <SheetDescription className="sr-only">
                Sign in options for job seekers and recruiters
              </SheetDescription>
              <div className="flex flex-col gap-6 mt-8">
                <h3 className="text-xl font-semibold text-[#3A1F1F]">Welcome to RhirePro</h3>
                <Button 
                  className="w-full bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full"
                  onClick={() => navigate('/signin')}
                >
                  Job Seeker Sign In
                </Button>
                <Button 
                  className="w-full bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full"
                  onClick={() => navigate('/signin')}
                >
                  Recruiter Sign In
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <div className="mb-6 md:mb-0">
              <div className="flex items-center gap-2 text-sm text-[#8A8A8A] mb-4">
                <a href="/" className="hover:text-[#FF2B2B]">Home</a>
                <ChevronRight className="h-4 w-4" />
                <span className="text-[#FF2B2B] border border-[#FF2B2B] px-3 py-1 rounded-full">
                  JOB Detail
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-[#3A1F1F] mb-4">
                Find Your Next Opportunity Here
              </h1>
              <p className="text-[#8A8A8A] max-w-lg">
                Browse curated job openings across various industries that match your skills and career goals.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-300 rounded-2xl h-40 w-48"></div>
              <div className="bg-gray-400 rounded-2xl h-40 w-32 mt-8"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Job Listings Section */}
      <section className="bg-[#ECECF4] py-16">
        <div id="jobs-pagination" className="container mx-auto px-4">
          <div className="text-center mb-12">
            <span className="inline-block bg-[#FF2B2B] text-white px-4 py-1 rounded-full text-sm mb-4">
              JOB LISTINGS
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-[#3A1F1F] mb-4">
              Turn Your Passion into a Career
            </h2>
            <p className="text-lg text-[#8A8A8A] max-w-3xl mx-auto">
              Discover opportunities that align with your passion and career goals.
            </p>
          </div>

          {/* Search and Filters */}
          <div className="mb-8 max-w-4xl mx-auto">
            <div className="flex flex-wrap gap-3 justify-center mb-6">
              {categories.map((category) => (
                <Button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`rounded-full px-6 ${
                    selectedCategory === category
                      ? "bg-[#FF2B2B] hover:bg-[#e02525] text-white"
                      : "bg-white border-2 border-gray-300 text-[#3A1F1F] hover:bg-gray-100"
                  }`}
                >
                  {category}
                </Button>
              ))}
            </div>

            <div className="bg-white rounded-full p-2 flex items-center gap-2 shadow-md">
              <Search className="h-5 w-5 text-[#8A8A8A] ml-4" />
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearchSubmit();
                }}
                className="bg-transparent border-0 text-[#3A1F1F] placeholder:text-gray-400 flex-1 focus-visible:ring-0"
                placeholder="Search jobs by title or company..."
              />
              <Button className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full px-8" onClick={handleSearchSubmit}>
                <Search className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Job Cards Grid */}
          {loading && (
            <div className="text-center py-16">
              <p className="text-[#8A8A8A] text-lg">Loading Indian jobs...</p>
            </div>
          )}

          {!loading && !loadError && filteredJobs.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedJobs.map((job) => (
              <div
                key={job.id}
                className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all relative cursor-pointer"
                onClick={() => {
                  if (job.dbJob) {
                    recordJobInteraction(job.dbJob, role === "jobseeker" ? profile?.id : null);
                  }
                  navigate(`/job/${job.id}`);
                }}
              >
                <JobShareButton jobId={job.id} title={job.title} className="absolute right-4 top-4" />
                <div 
                  className="absolute top-4 right-16 bg-[#FFF2F2] text-[#FF2B2B] rounded-full px-2.5 py-1 text-xs font-semibold flex items-center gap-1.5 border border-red-100 shadow-sm shrink-0"
                  title={`${job.applicantCount || 0} candidates applied`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Users className="h-3.5 w-3.5 shrink-0" />
                  <span>{job.applicantCount || 0} applied</span>
                </div>
                {job.featured && (
                  <div className="absolute top-5 right-[144px] w-3 h-3 bg-[#FF2B2B] rounded-full" title="Featured Job"></div>
                )}
                <div className="mb-4 pr-[150px]">
                  <span className="text-sm text-[#8A8A8A]">{job.company}</span>
                  <h3 className="text-xl font-bold text-[#3A1F1F] mt-1">{job.title}</h3>
                </div>
                <p className="text-[#8A8A8A] text-sm mb-4 line-clamp-2">
                  {job.description}
                </p>
                <div className="space-y-2 mb-6">
                  <div className="flex items-center text-sm text-[#8A8A8A]">
                    <MapPin className="h-4 w-4 mr-2 text-[#FF2B2B]" />
                    {job.location}
                  </div>
                  <div className="flex items-center text-sm text-[#8A8A8A]">
                    <DollarSign className="h-4 w-4 mr-2 text-[#FF2B2B]" />
                    {job.salary}
                  </div>
                  <div className="flex items-center text-sm text-[#8A8A8A]">
                    <Clock className="h-4 w-4 mr-2 text-[#FF2B2B]" />
                    {job.type}
                  </div>
                  {job.interviewMode ? (
                    <div className="text-sm text-[#8A8A8A]">
                      Interview mode: <span className="font-medium text-[#3A1F1F]">{job.interviewMode}</span>
                    </div>
                  ) : null}
                </div>
                <Button className="w-full bg-white border-2 border-[#FF2B2B] text-[#FF2B2B] hover:bg-[#FF2B2B] hover:text-white rounded-full">
                  Apply Now
                </Button>
              </div>
            ))}
          </div>
          )}

          {!loading && !loadError && totalPages > 1 && (
            <div className="mt-10 flex justify-center">
              <Pagination>
                <PaginationContent className="flex-wrap justify-center gap-2">
                  <PaginationItem>
                    <PaginationPrevious
                      href="#jobs-pagination"
                      onClick={(event) => {
                        event.preventDefault();
                        if (currentPage > 1) setCurrentPage((page) => page - 1);
                      }}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>

                  {pageNumbers.map((pageNumber) => (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink
                        href="#jobs-pagination"
                        isActive={currentPage === pageNumber}
                        onClick={(event) => {
                          event.preventDefault();
                          setCurrentPage(pageNumber);
                        }}
                        className={
                          currentPage === pageNumber
                            ? "border-[#FF2B2B] bg-[#FF2B2B] text-white hover:bg-[#e02525] hover:text-white"
                            : "text-[#3A1F1F]"
                        }
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      href="#jobs-pagination"
                      onClick={(event) => {
                        event.preventDefault();
                        if (currentPage < totalPages) setCurrentPage((page) => page + 1);
                      }}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}

          {!loading && loadError && (
            <div className="text-center py-16">
              <p className="text-[#8A8A8A] text-lg">{loadError}</p>
            </div>
          )}

          {!loading && !loadError && filteredJobs.length === 0 && (
            <div className="text-center py-16">
              <p className="text-[#8A8A8A] text-lg">
                {selectedCategory !== "ALL"
                  ? "No posted jobs found in this category yet."
                  : "No Indian jobs found matching your criteria."}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#FF2B2B] text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 mb-12">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Work With Purpose.<br />Grow With Us.
              </h2>
              <div className="space-y-3 text-white/90">
                <p className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  ID 123/201
                </p>
                <p className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  www.RhirePro.com
                </p>
                <p className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  0120 - 3532 - 510
                </p>
              </div>
              <div className="flex gap-4 mt-6">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                  <Facebook className="h-5 w-5 text-[#FF2B2B]" />
                </div>
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                  <Instagram className="h-5 w-5 text-[#FF2B2B]" />
                </div>
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                  <Twitter className="h-5 w-5 text-[#FF2B2B]" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h4 className="font-bold mb-4">Company</h4>
                <ul className="space-y-2 text-white/80">
                  <li><a href="/" className="hover:text-white transition-colors">Home</a></li>
                  <li><a href="/" className="hover:text-white transition-colors">About Us</a></li>
                  <li><a href="/services" className="hover:text-white transition-colors">Services</a></li>
                  <li><a href="/" className="hover:text-white transition-colors">Contact Us</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-4">Services</h4>
                <ul className="space-y-2 text-white/80">
                  <li><a href="#" className="hover:text-white transition-colors">Talent Sourcing</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Executive Search</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Project-Based Hiring</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Career Coaching</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Job Matching</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Branding Support</a></li>
                </ul>
              </div>
            </div>
          </div>

          {/* Newsletter */}
          <div className="bg-white rounded-full p-2 flex items-center gap-2 max-w-xl">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-transparent border-0 text-[#3A1F1F] placeholder:text-gray-400 flex-1 focus-visible:ring-0"
              placeholder="Email"
            />
            <Button className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full px-8">
              Subscribe Now <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <div className="border-t border-white/20 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-white/80 text-sm">
            <p>Copyright © 2025 RhirePro. All Rights Reserved.</p>
            <p>Privacy and Policy</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
