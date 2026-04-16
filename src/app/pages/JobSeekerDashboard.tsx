import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate, Routes, Route, Link } from "react-router";
import { supabase, Job as DBJob, Notification, Application } from "../../lib/supabase";
import { isJobVisibleToSeekers } from "../../lib/jobs";
import { recordJobInteraction, recordJobSearch } from "../../lib/jobRecommendations";
import { useAuth } from "../../lib/auth-context";
import {
  Bell, LogOut, Search, MapPin, DollarSign, Briefcase, Filter, Bookmark,
  User, BarChart3, Lightbulb, Upload, Plus, X, Pencil, Trash2,
  GraduationCap, Award, Globe, Phone, Mail, Camera, Clock, CheckCircle,
  TrendingUp, ArrowRight, Loader2,
} from "lucide-react";
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
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Badge } from "../components/ui/badge";
import logoImage from "../../logo/logo.png";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Job {
  id: number; title: string; company: string; location: string;
  salary: string; salaryMin: number; type: "Full-time" | "Part-time" | "Contract";
  description: string; industry: string; experience: string; isRemote: boolean;
}
interface DashboardDisplayJob {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  salaryMin: number;
  type: "Full-time" | "Part-time" | "Contract";
  description: string;
  industry: string;
  experience: string;
  isRemote: boolean;
  isDB: true;
  dbJob: DBJob;
}
interface WorkExp {
  id: string; title: string; company: string; location: string;
  startMonth: string; startYear: string; endMonth: string; endYear: string;
  current: boolean; description: string;
}
interface Education {
  id: string; degree: string; field: string; college: string;
  startYear: string; endYear: string; score: string;
}
interface Project {
  id: number; name: string; url: string; startYear: string; endYear: string; description: string;
}
interface Certification {
  id: number; name: string; issuer: string; issueDate: string; credentialId: string;
}
interface Language { id: number; language: string; proficiency: string; }

function formatDashboardSalary(job: DBJob): string {
  if (job.salary_min && job.salary_max && job.salary_type) {
    return `${job.salary_min}-${job.salary_max} ${job.salary_type}`;
  }
  if (job.salary_min && job.salary_type) {
    return `${job.salary_min}+ ${job.salary_type}`;
  }
  if (job.salary_type) {
    return `${job.salary_type} compensation`;
  }
  return "Compensation as per company standards";
}

function formatDashboardLocation(job: DBJob): string {
  if (job.location?.trim()) return job.location;
  if (job.work_mode?.trim()) return job.work_mode;
  return "India";
}

function formatDashboardType(job: DBJob): string {
  if (job.employment_type?.trim()) return job.employment_type;
  if (job.work_mode?.trim()) return job.work_mode;
  if (job.department?.trim()) return job.department;
  return "Full-time";
}

function formatDashboardDescription(job: DBJob): string {
  if (job.description?.trim()) return job.description;
  if (job.roles_responsibilities?.trim()) return job.roles_responsibilities;
  if (job.requirements?.trim()) return job.requirements;

  const parts = [
    job.department?.trim(),
    job.industry?.trim(),
    job.skills?.length ? `Skills: ${job.skills.slice(0, 3).join(", ")}` : "",
  ].filter(Boolean);

  if (parts.length > 0) return parts.join(" | ");
  return "Explore this opportunity and apply now.";
}

// ── Job Data ───────────────────────────────────────────────────────────────────
const ALL_JOBS: Job[] = [
  { id: 1, title: "Senior Data Analyst", company: "TechCorp Inc.", location: "New York, NY", salary: "$90k–$120k", salaryMin: 90000, type: "Full-time", description: "Work with large datasets to drive business decisions using Python, SQL, and Tableau.", industry: "tech", experience: "senior", isRemote: false },
  { id: 2, title: "UI/UX Designer", company: "Creative Studios", location: "Remote", salary: "$70k–$95k", salaryMin: 70000, type: "Full-time", description: "Design beautiful and intuitive user experiences collaborating with engineers and PMs.", industry: "design", experience: "mid", isRemote: true },
  { id: 3, title: "Marketing Manager", company: "Marketing Pro", location: "Chicago, IL", salary: "$80k–$110k", salaryMin: 80000, type: "Full-time", description: "Lead marketing initiatives and grow brand presence across digital and offline channels.", industry: "marketing", experience: "mid", isRemote: false },
  { id: 4, title: "Software Engineer", company: "Tech Innovations", location: "San Francisco, CA", salary: "$100k–$140k", salaryMin: 100000, type: "Full-time", description: "Build scalable applications using React, Node.js, and cloud platforms.", industry: "tech", experience: "mid", isRemote: false },
  { id: 5, title: "Product Manager", company: "Product Co", location: "Austin, TX", salary: "$95k–$130k", salaryMin: 95000, type: "Full-time", description: "Drive product strategy and execution from concept to launch with cross-functional teams.", industry: "tech", experience: "senior", isRemote: false },
  { id: 6, title: "Content Writer", company: "Media Group", location: "Remote", salary: "$55k–$75k", salaryMin: 55000, type: "Contract", description: "Create engaging blog articles, social media posts, and email newsletters.", industry: "media", experience: "entry", isRemote: true },
  { id: 7, title: "Financial Analyst", company: "Finance Plus", location: "New York, NY", salary: "$75k–$100k", salaryMin: 75000, type: "Full-time", description: "Analyze financial data, prepare reports, and support business planning and budgeting.", industry: "finance", experience: "mid", isRemote: false },
  { id: 8, title: "Healthcare Data Specialist", company: "MedTech Solutions", location: "Remote", salary: "$65k–$85k", salaryMin: 65000, type: "Full-time", description: "Manage and analyze healthcare data to improve patient outcomes and efficiency.", industry: "healthcare", experience: "entry", isRemote: true },
  { id: 9, title: "Frontend Developer", company: "WebStudio", location: "San Francisco, CA", salary: "$85k–$115k", salaryMin: 85000, type: "Full-time", description: "Build responsive and accessible web interfaces using React and TypeScript.", industry: "tech", experience: "mid", isRemote: false },
  { id: 10, title: "Social Media Manager", company: "Brand Agency", location: "Chicago, IL", salary: "$50k–$70k", salaryMin: 50000, type: "Part-time", description: "Manage social media accounts and grow online community for global brands.", industry: "marketing", experience: "entry", isRemote: false },
  { id: 11, title: "DevOps Engineer", company: "CloudSys", location: "Remote", salary: "$110k–$145k", salaryMin: 110000, type: "Full-time", description: "Build CI/CD pipelines, manage cloud infrastructure, and improve deployment processes.", industry: "tech", experience: "senior", isRemote: true },
  { id: 12, title: "Graphic Designer", company: "Design House", location: "New York, NY", salary: "$45k–$65k", salaryMin: 45000, type: "Contract", description: "Create visual assets including branding materials, digital graphics, and marketing collateral.", industry: "design", experience: "entry", isRemote: false },
];

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const YEARS = Array.from({ length: 17 }, (_, i) => String(2010 + i));
const JOBS_PER_PAGE = 12;

function escapeLikeValue(value: string): string {
  return value.replace(/[%_,]/g, (match) => `\\${match}`);
}

function buildDashboardJob(job: DBJob): DashboardDisplayJob {
  return {
    id: job.id,
    title: job.title,
    company: job.company_name,
    location: formatDashboardLocation(job),
    salary: formatDashboardSalary(job),
    salaryMin: job.salary_min || 0,
    type: formatDashboardType(job) as "Full-time" | "Part-time" | "Contract",
    description: formatDashboardDescription(job),
    industry: job.industry || "",
    experience: "",
    isRemote: job.work_mode === "Work from Home",
    isDB: true,
    dbJob: job,
  };
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function JobSeekerDashboard() {
  const navigate = useNavigate();
  const { profile, user, loading: authLoading, signOut } = useAuth();

  // Auth guard — redirect to sign-in if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/signin", { replace: true });
    }
  }, [authLoading, user, navigate]);

  const [activeTab, setActiveTab] = useState("find-job");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!profile?.id) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", profile.id)
      .eq("user_type", "jobseeker")
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter((n: Notification) => !n.is_read).length);
    }
  }, [profile?.id]);

  useEffect(() => {
    fetchNotifications();
    if (!profile?.id) return;
    const channel = supabase
      .channel("jobseeker-notifications")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${profile.id}`,
      }, () => fetchNotifications())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.id, fetchNotifications]);

  const notifRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    if (notificationsOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [notificationsOpen]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const userInitials = profile
    ? `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`.toUpperCase()
    : "U";

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F6F6F6] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#FF2B2B] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[#8A8A8A] text-sm">Loading...</p>
        </div>
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F6F6F6]">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
              <img src={logoImage} alt="RhirePro Logo" className="w-10 h-10" />
              <div className="text-2xl font-bold text-[#3A1F1F]">Rhire<span className="text-[#FF2B2B]">Pro</span></div>
            </div>
            <nav className="hidden md:flex items-center gap-4">
              {[
                { label: "Find a Job", tab: "find-job", to: "/jobseeker/dashboard" },
                { label: "Profile", tab: "profile", to: "/jobseeker/dashboard/profile" },
                { label: "Job Analytics", tab: "analytics", to: "/jobseeker/dashboard/analytics" },
                { label: "Career Insights", tab: "insights", to: "/jobseeker/dashboard/insights" },
              ].map(({ label, tab, to }) => (
                <Link key={tab} to={to}>
                  <Button
                    variant={activeTab === tab ? "default" : "ghost"}
                    className={activeTab === tab ? "bg-[#FF2B2B] hover:bg-[#e02525] rounded-full" : "rounded-full"}
                    onClick={() => setActiveTab(tab)}
                  >
                    {label}
                  </Button>
                </Link>
              ))}

              <div className="relative" ref={notifRef}>
                <Button variant="ghost" size="icon" className="relative" onClick={async () => {
                  const opening = !notificationsOpen;
                  setNotificationsOpen(opening);
                  if (opening && profile?.id) {
                    await supabase.from("notifications").update({ is_read: true }).eq("user_id", profile.id);
                    fetchNotifications();
                  }
                }}>
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-[#FF2B2B] rounded-full text-white text-[9px] flex items-center justify-center font-bold">{unreadCount}</span>
                  )}
                </Button>
                {notificationsOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-[200]">
                    <div className="p-4">
                      <h3 className="font-semibold text-[#3A1F1F] mb-3">Notifications</h3>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="text-sm text-[#8A8A8A] text-center py-4">No notifications yet</p>
                        ) : notifications.map((n) => (
                          <div key={n.id} className={`p-3 rounded-lg ${!n.is_read ? "bg-red-50" : "bg-[#F6F6F6]"}`}>
                            <p className="text-sm font-medium text-[#3A1F1F]">{n.title}</p>
                            <p className="text-xs text-[#8A8A8A]">{n.message}</p>
                            <p className="text-xs text-[#BABABA] mt-0.5">{new Date(n.created_at).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {profile && (
                <div className="w-8 h-8 bg-[#FF2B2B] rounded-full flex items-center justify-center text-white text-xs font-bold cursor-pointer" title={`${profile.first_name} ${profile.last_name}`}>
                  {userInitials}
                </div>
              )}

              <Button
                variant="outline"
                className="border-[#FF2B2B] text-[#FF2B2B] hover:bg-[#FF2B2B] hover:text-white rounded-full"
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" /> Sign Out
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <Routes>
        <Route index element={<FindJobPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="insights" element={<InsightsPage />} />
      </Routes>
    </div>
  );
}

// ── Find a Job ─────────────────────────────────────────────────────────────────
function FindJobPage() {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [selectedChip, setSelectedChip] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [locationFilter, setLocationFilter] = useState("");
  const [experienceFilter, setExperienceFilter] = useState("");
  const [salaryFilter, setSalaryFilter] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");
  const [jobTypeFilter, setJobTypeFilter] = useState("");
  const [remoteFilter, setRemoteFilter] = useState("");
  const [dbJobs, setDbJobs] = useState<DBJob[]>([]);
  const [totalJobsCount, setTotalJobsCount] = useState(0);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState("");
  const [appliedJobIds, setAppliedJobIds] = useState<string[]>([]);
  const [savedJobIds, setSavedJobIds] = useState<string[]>([]);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<DashboardDisplayJob | null>(null);

  useEffect(() => {
    if (profile?.id) {
      supabase.from("applications").select("job_id").eq("profile_id", profile.id).then(({ data }) => {
        if (data) setAppliedJobIds(data.map(a => a.job_id));
      });
      supabase.from("saved_jobs").select("job_id").eq("profile_id", profile.id).then(({ data }) => {
        if (data) setSavedJobIds(data.map(s => s.job_id));
      });
    }
  }, [profile?.id]);

  useEffect(() => {
    let cancelled = false;

    async function fetchJobsPage() {
      setJobsLoading(true);
      setJobsError("");

      let query = supabase
        .from("jobs")
        .select("*", { count: "exact" })
        .eq("status", "Active");

      const trimmedSearch = searchQuery.trim();
      if (trimmedSearch) {
        const escaped = escapeLikeValue(trimmedSearch);
        query = query.or(
          `title.ilike.%${escaped}%,company_name.ilike.%${escaped}%,description.ilike.%${escaped}%,location.ilike.%${escaped}%`
        );
      }

      if (selectedChip === "Full-time" || selectedChip === "Part-time" || selectedChip === "Contract") {
        query = query.eq("employment_type", selectedChip);
      } else if (jobTypeFilter === "fulltime") {
        query = query.eq("employment_type", "Full-time");
      } else if (jobTypeFilter === "parttime") {
        query = query.eq("employment_type", "Part-time");
      } else if (jobTypeFilter === "contract") {
        query = query.eq("employment_type", "Contract");
      }

      if (selectedChip === "Remote" || locationFilter === "remote" || remoteFilter === "yes") {
        query = query.eq("work_mode", "Work from Home");
      } else if (remoteFilter === "no") {
        query = query.neq("work_mode", "Work from Home");
      }

      if (locationFilter === "bengaluru") query = query.ilike("location", "%Bengaluru%");
      if (locationFilter === "mumbai") query = query.ilike("location", "%Mumbai%");
      if (locationFilter === "hyderabad") query = query.ilike("location", "%Hyderabad%");
      if (locationFilter === "delhi") query = query.ilike("location", "%Delhi%");
      if (locationFilter === "pune") query = query.ilike("location", "%Pune%");

      if (experienceFilter === "entry") query = query.lte("experience_min", 1);
      if (experienceFilter === "mid") query = query.gte("experience_min", 2).lte("experience_min", 5);
      if (experienceFilter === "senior") query = query.gte("experience_min", 5);

      if (salaryFilter === "0-50") query = query.lt("salary_min", 50000);
      if (salaryFilter === "50-100") query = query.gte("salary_min", 50000).lt("salary_min", 100000);
      if (salaryFilter === "100+") query = query.gte("salary_min", 100000);

      if (industryFilter === "healthcare") query = query.ilike("industry", "%Healthcare%");
      if (industryFilter === "finance") query = query.ilike("industry", "%BFSI%");
      if (industryFilter === "media") query = query.ilike("industry", "%Media%");
      if (industryFilter === "tech") query = query.or("industry.ilike.%IT / Software%,industry.ilike.%E-commerce%,industry.ilike.%Consulting%");
      if (industryFilter === "marketing") query = query.or("industry.ilike.%Consulting%,industry.ilike.%Media%");
      if (industryFilter === "design") query = query.ilike("department", "%Design%");

      const from = (currentPage - 1) * JOBS_PER_PAGE;
      const to = from + JOBS_PER_PAGE - 1;

      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (cancelled) return;

      if (error) {
        setJobsError("Unable to load jobs right now.");
        setDbJobs([]);
        setTotalJobsCount(0);
        setJobsLoading(false);
        return;
      }

      const visibleJobs = (data || []).filter((job) => isJobVisibleToSeekers(job));
      setDbJobs(visibleJobs);
      setTotalJobsCount(count || 0);
      setJobsLoading(false);
    }

    fetchJobsPage();
    return () => {
      cancelled = true;
    };
  }, [
    currentPage,
    experienceFilter,
    industryFilter,
    jobTypeFilter,
    locationFilter,
    remoteFilter,
    searchQuery,
    selectedChip,
    salaryFilter,
  ]);

  const handleApply = async (job: DBJob) => {
    if (!profile?.id) return;
    if (appliedJobIds.includes(job.id)) return;
    if (!isJobVisibleToSeekers(job)) return;
    setApplyingId(job.id);
    try {
      await supabase.from("applications").insert({
        job_id: job.id,
        profile_id: profile.id,
        recruiter_id: job.recruiter_id,
        status: "New",
        resume_url: profile.resume_url,
      });
      recordJobInteraction(job, profile.id);
      setAppliedJobIds(prev => [...prev, job.id]);
    } finally {
      setApplyingId(null);
    }
  };

  const handleSave = async (job: DBJob) => {
    if (!profile?.id) return;
    if (savedJobIds.includes(job.id)) {
      await supabase.from("saved_jobs").delete().eq("profile_id", profile.id).eq("job_id", job.id);
      setSavedJobIds(prev => prev.filter(id => id !== job.id));
    } else {
      await supabase.from("saved_jobs").insert({ profile_id: profile.id, job_id: job.id });
      recordJobInteraction(job, profile.id);
      setSavedJobIds(prev => [...prev, job.id]);
    }
  };

  const displayJobs = useMemo(() => dbJobs.map(buildDashboardJob), [dbJobs]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedChip, locationFilter, experienceFilter, salaryFilter, industryFilter, jobTypeFilter, remoteFilter]);

  useEffect(() => {
    setSelectedJob(null);
  }, [currentPage, searchQuery, selectedChip, locationFilter, experienceFilter, salaryFilter, industryFilter, jobTypeFilter, remoteFilter]);

  const totalPages = Math.ceil(totalJobsCount / JOBS_PER_PAGE);

  useEffect(() => {
    if (totalPages === 0) {
      setCurrentPage(1);
      return;
    }

    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const pageNumbers = useMemo(
    () => Array.from({ length: totalPages }, (_, index) => index + 1),
    [totalPages],
  );

  const hasFilters = searchQuery || selectedChip || locationFilter || experienceFilter || salaryFilter || industryFilter || jobTypeFilter || remoteFilter;

  function clearAll() {
    setSearchQuery(""); setInputValue(""); setSelectedChip(null);
    setLocationFilter(""); setExperienceFilter(""); setSalaryFilter("");
    setIndustryFilter(""); setJobTypeFilter(""); setRemoteFilter("");
  }

  function handleChipClick(chip: string) {
    setSelectedChip(prev => prev === chip ? null : chip);
    setJobTypeFilter(""); setRemoteFilter("");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-[#3A1F1F] mb-6 text-center">Find Your Dream Job</h1>

      {/* Search Bar */}
      <div className="flex justify-center mb-8">
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-full shadow-lg border border-gray-200 p-2">
            <div className="flex items-center gap-3 px-4">
              <Search className="h-5 w-5 text-[#8A8A8A] shrink-0" />
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setSearchQuery(inputValue);
                    recordJobSearch(inputValue, profile?.id);
                  }
                }}
                placeholder="Search by title, company, or keywords..."
                className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
              />
              {inputValue && (
                <button onClick={() => { setInputValue(""); setSearchQuery(""); }}>
                  <X className="h-4 w-4 text-[#8A8A8A]" />
                </button>
              )}
              <Button
                className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full px-6 h-10 shrink-0"
                onClick={() => {
                  setSearchQuery(inputValue);
                  recordJobSearch(inputValue, profile?.id);
                }}
              >
                Search
              </Button>
            </div>
          </div>

          {/* Type Chips */}
          <div className="flex justify-center gap-3 mt-4 flex-wrap">
            {["Remote", "Full-time", "Part-time", "Contract"].map((chip) => (
              <button
                key={chip}
                onClick={() => handleChipClick(chip)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  selectedChip === chip
                    ? "bg-[#FF2B2B] text-white border-[#FF2B2B]"
                    : "bg-white text-[#3A1F1F] border-gray-300 hover:border-[#FF2B2B] hover:text-[#FF2B2B]"
                }`}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-6">
        {/* Filters Sidebar */}
        <div>
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4 sticky top-24">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[#3A1F1F] flex items-center gap-2">
                <Filter className="h-4 w-4" /> Filters
              </h3>
              {hasFilters && (
                <button onClick={clearAll} className="text-xs text-[#FF2B2B] hover:underline">Clear all</button>
              )}
            </div>
            {[
              { label: "Location", value: locationFilter, onChange: setLocationFilter,
                options: [["remote","Remote"],["bengaluru","Bengaluru"],["mumbai","Mumbai"],["hyderabad","Hyderabad"],["delhi","Delhi NCR"],["pune","Pune"]] },
              { label: "Experience", value: experienceFilter, onChange: setExperienceFilter,
                options: [["entry","Entry Level"],["mid","Mid Level"],["senior","Senior"]] },
              { label: "Salary Range", value: salaryFilter, onChange: setSalaryFilter,
                options: [["0-50","$0 – $50k"],["50-100","$50k – $100k"],["100+","$100k+"]] },
              { label: "Industry", value: industryFilter, onChange: setIndustryFilter,
                options: [["tech","Technology"],["finance","Finance"],["healthcare","Healthcare"],["marketing","Marketing"],["design","Design"],["media","Media"]] },
              { label: "Job Type", value: jobTypeFilter, onChange: setJobTypeFilter,
                options: [["fulltime","Full-time"],["parttime","Part-time"],["contract","Contract"]] },
              { label: "Remote", value: remoteFilter, onChange: setRemoteFilter,
                options: [["yes","Remote Only"],["no","On-site Only"]] },
            ].map(({ label, value, onChange, options }) => (
              <div key={label}>
                <label className="block mb-1.5 text-xs text-[#3A1F1F] font-medium uppercase tracking-wide">{label}</label>
                <Select value={value || "all"} onValueChange={(v) => onChange(v === "all" ? "" : v)}>
                  <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-xl text-sm h-9">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {options.map(([val, lbl]) => (
                      <SelectItem key={val} value={val}>{lbl}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>

        {/* Job Listings + Detail Panel */}
        <div className={`grid gap-4 ${selectedJob ? "lg:grid-cols-[1fr_1.3fr]" : "grid-cols-1"}`}>
          {/* Job Cards */}
          <div>
            <p className="text-[#8A8A8A] text-sm mb-3">
              {totalJobsCount} job{totalJobsCount !== 1 ? "s" : ""} found
              {searchQuery && <> for "<strong className="text-[#3A1F1F]">{searchQuery}</strong>"</>}
            </p>

            {jobsLoading ? (
              <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
                <Loader2 className="h-10 w-10 text-[#FF2B2B] animate-spin mx-auto mb-3" />
                <p className="text-[#8A8A8A] text-sm">Loading jobs...</p>
              </div>
            ) : jobsError ? (
              <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
                <h3 className="font-semibold text-[#3A1F1F] mb-2">Could not load jobs</h3>
                <p className="text-[#8A8A8A] text-sm">{jobsError}</p>
              </div>
            ) : totalJobsCount === 0 ? (
              <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
                <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <h3 className="font-semibold text-[#3A1F1F] mb-2">No jobs found</h3>
                <p className="text-[#8A8A8A] text-sm mb-4">Try adjusting your search or filters.</p>
                <Button onClick={clearAll} className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full">Clear Filters</Button>
              </div>
            ) : (
              <div id="job-results-pagination" className={`grid gap-4 ${selectedJob ? "grid-cols-1" : "md:grid-cols-2 xl:grid-cols-3"}`}>
                {displayJobs.map((job) => {
                  const isApplied = appliedJobIds.includes(String(job.id));
                  const isSaved = savedJobIds.includes(String(job.id));
                  const isSelected = selectedJob?.id === job.id;
                  return (
                    <div
                      key={job.id}
                      onClick={() => {
                        setSelectedJob(isSelected ? null : job);
                        if (!isSelected && job.isDB && job.dbJob) {
                          recordJobInteraction(job.dbJob, profile?.id);
                        }
                      }}
                      className={`bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer relative flex flex-col ${isSelected ? "ring-2 ring-[#FF2B2B]" : ""}`}
                    >
                      {job.isDB && <div className="absolute top-4 right-4 w-2.5 h-2.5 bg-[#FF2B2B] rounded-full" />}
                      <p className="text-xs text-[#8A8A8A] mb-0.5">{job.company}</p>
                      <h3 className="font-bold text-[#3A1F1F] text-lg mb-2 leading-snug pr-4">{job.title}</h3>
                      <p className="text-[#8A8A8A] text-sm mb-3 line-clamp-2 flex-1">{job.description}</p>
                      <div className="space-y-1 mb-4">
                        <div className="flex items-center text-sm text-[#8A8A8A]">
                          <MapPin className="h-3.5 w-3.5 mr-1.5 text-[#FF2B2B] shrink-0" />{job.location}
                        </div>
                        <div className="flex items-center text-sm text-[#8A8A8A]">
                          <DollarSign className="h-3.5 w-3.5 mr-1.5 text-[#FF2B2B] shrink-0" />{job.salary}
                        </div>
                        <div className="flex items-center text-sm text-[#8A8A8A]">
                          <Clock className="h-3.5 w-3.5 mr-1.5 text-[#FF2B2B] shrink-0" />{job.type}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className={`w-full rounded-full mt-auto ${isApplied ? "border-green-500 text-green-600 cursor-default" : "border-[#FF2B2B] text-[#FF2B2B] hover:bg-[#FF2B2B] hover:text-white"}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isApplied && job.isDB && job.dbJob) handleApply(job.dbJob);
                        }}
                        disabled={applyingId === String(job.id)}
                      >
                        {isApplied ? <><CheckCircle className="h-4 w-4 mr-1" /> Applied</> : applyingId === String(job.id) ? "Applying..." : "Apply Now"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {!jobsLoading && !jobsError && totalJobsCount > 0 && totalPages > 1 && (
              <div className="mt-8 flex justify-center">
                <Pagination>
                  <PaginationContent className="flex-wrap justify-center gap-2">
                    <PaginationItem>
                      <PaginationPrevious
                        href="#job-results-pagination"
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
                          href="#job-results-pagination"
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
                        href="#job-results-pagination"
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
          </div>

          {/* Detail Panel */}
          {selectedJob && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden sticky top-24 max-h-[calc(100vh-140px)] flex flex-col">
              <div className="p-6 overflow-y-auto flex-1">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    {selectedJob.isDB && (
                      <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full mb-2 inline-block">Verified Company</span>
                    )}
                    <p className="text-sm text-[#8A8A8A]">{selectedJob.company}</p>
                  </div>
                  <button onClick={() => setSelectedJob(null)} className="text-[#8A8A8A] hover:text-[#3A1F1F] p-1">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <h2 className="text-2xl font-bold text-[#3A1F1F] mb-4">{selectedJob.title}</h2>

                <div className="flex flex-wrap gap-4 mb-5 pb-5 border-b border-gray-100">
                  <div>
                    <p className="text-xs text-[#8A8A8A] mb-0.5">Location</p>
                    <p className="font-semibold text-[#3A1F1F] text-sm">{selectedJob.location}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#8A8A8A] mb-0.5">Salary</p>
                    <p className="font-semibold text-[#3A1F1F] text-sm">{selectedJob.salary}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#8A8A8A] mb-0.5">Experience</p>
                    <p className="font-semibold text-[#3A1F1F] text-sm">
                      {selectedJob.dbJob?.experience_min != null
                        ? `${selectedJob.dbJob.experience_min}${selectedJob.dbJob.experience_max ? `–${selectedJob.dbJob.experience_max}` : "+"} years`
                        : selectedJob.experience || "Not specified"}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 mb-6">
                  <Button
                    onClick={() => { if (!appliedJobIds.includes(String(selectedJob.id)) && selectedJob.isDB && selectedJob.dbJob) handleApply(selectedJob.dbJob); }}
                    disabled={appliedJobIds.includes(String(selectedJob.id)) || applyingId === String(selectedJob.id)}
                    className={`rounded-full px-6 ${appliedJobIds.includes(String(selectedJob.id)) ? "bg-green-500 hover:bg-green-500" : "bg-[#FF2B2B] hover:bg-[#e02525]"} text-white`}
                  >
                    {appliedJobIds.includes(String(selectedJob.id)) ? <><CheckCircle className="h-4 w-4 mr-1" /> Applied</> : "Apply Now"}
                  </Button>
                  {selectedJob.isDB && selectedJob.dbJob && (
                    <Button
                      variant="outline"
                      className={`rounded-full ${savedJobIds.includes(selectedJob.id) ? "border-[#FF2B2B] text-[#FF2B2B]" : "border-gray-200"}`}
                      onClick={() => handleSave(selectedJob.dbJob!)}
                    >
                      <Bookmark className="h-4 w-4 mr-1" fill={savedJobIds.includes(selectedJob.id) ? "currentColor" : "none"} />
                      {savedJobIds.includes(selectedJob.id) ? "Saved" : "Save"}
                    </Button>
                  )}
                </div>

                <h3 className="text-base font-bold text-[#3A1F1F] mb-2">Job Description :</h3>
                <p className="text-[#8A8A8A] text-sm leading-relaxed mb-5">{selectedJob.description}</p>

                {selectedJob.dbJob?.skills && selectedJob.dbJob.skills.length > 0 && (
                  <>
                    <h3 className="text-base font-bold text-[#3A1F1F] mb-2">Key Skills :</h3>
                    <div className="flex flex-wrap gap-2 mb-5">
                      {selectedJob.dbJob.skills.map((s, i) => (
                        <span key={i} className="bg-[#ECECF4] text-[#3A1F1F] text-xs px-3 py-1.5 rounded-full font-medium">{s}</span>
                      ))}
                    </div>
                  </>
                )}

                {selectedJob.dbJob?.perks && selectedJob.dbJob.perks.length > 0 && (
                  <>
                    <h3 className="text-base font-bold text-[#3A1F1F] mb-2">Perks & Benefits :</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedJob.dbJob.perks.map((p, i) => (
                        <span key={i} className="bg-green-50 text-green-700 text-xs px-3 py-1.5 rounded-full font-medium">{p}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Profile Page ───────────────────────────────────────────────────────────────
function ProfilePage() {
  const { profile, user, loading: authLoading, refreshProfile } = useAuth();
  // Basic Info — synced from DB via useEffect below
  const [basicInfo, setBasicInfo] = useState({
    name: "", headline: "", phone: "", email: "",
    location: "", dob: "", gender: "", maritalStatus: "",
    linkedin: "", portfolio: "",
  });
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [editingBasic, setEditingBasic] = useState(false);
  const [basicForm, setBasicForm] = useState({ ...basicInfo });

  // Summary
  const [summary, setSummary] = useState("");
  const [editingSummary, setEditingSummary] = useState(false);
  const [summaryForm, setSummaryForm] = useState(summary);

  // Skills
  const [skills, setSkills] = useState<string[]>([]);
  const [showSkillInput, setShowSkillInput] = useState(false);
  const [newSkill, setNewSkill] = useState("");

  // Sync profile data from DB when it loads, fallback to user metadata
  useEffect(() => {
    const meta = user?.user_metadata || {};
    // Use DB profile if available, otherwise fall back to user_metadata from sign-up
    const firstName = profile?.first_name || meta.first_name || "";
    const lastName = profile?.last_name || meta.last_name || "";
    const info = {
      name: `${firstName} ${lastName}`.trim(),
      headline: profile?.headline || "",
      phone: profile?.phone || meta.phone || "",
      email: profile?.email || user?.email || "",
      location: profile?.location || "",
      dob: (profile as any)?.dob || "",
      gender: (profile as any)?.gender || "",
      maritalStatus: (profile as any)?.marital_status || "",
      linkedin: profile?.linkedin_url || "",
      portfolio: profile?.portfolio_url || "",
    };
    if (info.name || info.email || info.phone) {
      setBasicInfo(info);
      setBasicForm(info);
    }
    if (profile?.avatar_url) setProfilePic(profile.avatar_url);
    if (profile?.resume_url) setResumeFile(profile.resume_url);
    if (profile?.about) { setSummary(profile.about); setSummaryForm(profile.about); }
    if (profile?.skills?.length) setSkills(profile.skills);
    // Preferences
    if (profile) {
      const p = profile as any;
      const prefs = {
        desiredJobTitle: p.desired_job_title || "",
        jobType: p.job_type_pref || "",
        preferredLocation: p.preferred_location || "",
        expectedSalary: p.expected_salary || "",
        noticePeriod: p.notice_period || "",
        workAuth: p.work_auth || "",
        willingToRelocate: p.willing_to_relocate || "",
      };
      setPreferences(prefs);
      setPrefsForm(prefs);
    }
    // Languages
    if ((profile as any)?.languages?.length) {
      setLanguages(((profile as any).languages as { language: string; proficiency: string }[]).map((l, i) => ({ ...l, id: i })));
    }
  }, [profile, user]);

  // Work Experience
  const emptyExp = { title: "", company: "", location: "", startMonth: "Jan", startYear: "2022", endMonth: "Jan", endYear: "2024", current: false, description: "" };
  const [experiences, setExperiences] = useState<WorkExp[]>([]);
  const [showAddExp, setShowAddExp] = useState(false);
  const [editingExpId, setEditingExpId] = useState<string | null>(null);
  const [expForm, setExpForm] = useState<Omit<WorkExp,"id">>(emptyExp);

  // Education
  const emptyEdu = { degree: "", field: "", college: "", startYear: "2016", endYear: "2020", score: "" };
  const [education, setEducation] = useState<Education[]>([]);
  const [showAddEdu, setShowAddEdu] = useState(false);
  const [editingEduId, setEditingEduId] = useState<string | null>(null);
  const [eduForm, setEduForm] = useState<Omit<Education,"id">>(emptyEdu);

  // Load work experience and education from DB
  useEffect(() => {
    if (!profile?.id) return;
    supabase.from("work_experience").select("*").eq("profile_id", profile.id).order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setExperiences(data.map(e => {
            const startParts = (e.start_date || "").split(" ");
            const endParts = (e.end_date || "").split(" ");
            return {
              id: e.id,
              title: e.title,
              company: e.company,
              location: e.location || "",
              startMonth: startParts[0] || "Jan",
              startYear: startParts[1] || "2022",
              endMonth: endParts[0] || "Jan",
              endYear: endParts[1] || "2024",
              current: e.is_current || false,
              description: e.description || "",
            };
          }));
        }
      });
    supabase.from("education").select("*").eq("profile_id", profile.id).order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setEducation(data.map(e => ({
            id: e.id, degree: e.degree, field: e.field || "",
            college: e.institution, startYear: e.start_year || "",
            endYear: e.end_year || "", score: e.score || "",
          })));
        }
      });
    supabase.from("projects").select("*").eq("profile_id", profile.id).order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setProjects(data.map(p => ({
            id: p.id, name: p.name, url: p.url || "",
            startYear: p.start_year || "", endYear: p.end_year || "", description: p.description || "",
          })));
        }
      });
    supabase.from("certifications").select("*").eq("profile_id", profile.id).order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setCertifications(data.map(c => ({
            id: c.id, name: c.name, issuer: c.issuer || "",
            issueDate: c.issue_date || "", credentialId: c.credential_id || "",
          })));
        }
      });
  }, [profile?.id]);

  // Projects
  const emptyProj = { name: "", url: "", startYear: "2023", endYear: "2024", description: "" };
  const [projects, setProjects] = useState<Project[]>([]);
  const [showAddProj, setShowAddProj] = useState(false);
  const [editingProjId, setEditingProjId] = useState<number | null>(null);
  const [projForm, setProjForm] = useState<Omit<Project,"id">>(emptyProj);

  // Certifications
  const emptyCert = { name: "", issuer: "", issueDate: "", credentialId: "" };
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [showAddCert, setShowAddCert] = useState(false);
  const [editingCertId, setEditingCertId] = useState<number | null>(null);
  const [certForm, setCertForm] = useState<Omit<Certification,"id">>(emptyCert);

  // Languages
  const [languages, setLanguages] = useState<Language[]>([]);
  const [showAddLang, setShowAddLang] = useState(false);
  const [langForm, setLangForm] = useState({ language: "", proficiency: "Beginner" });

  // Resume
  const [resumeFile, setResumeFile] = useState<string | null>(null);

  // Preferred Settings
  const [preferences, setPreferences] = useState({
    desiredJobTitle: "", jobType: "",
    preferredLocation: "", expectedSalary: "",
    noticePeriod: "", workAuth: "", willingToRelocate: "",
  });
  const [editingPrefs, setEditingPrefs] = useState(false);
  const [prefsForm, setPrefsForm] = useState({ ...preferences });

  // ── Completion ────────────────────────────────────────────────────────────
  const completion = useMemo(() => {
    let score = 0;
    const basicFields = [basicInfo.name, basicInfo.phone, basicInfo.email, basicInfo.location];
    score += Math.round((basicFields.filter(Boolean).length / 4) * 15);
    if (summary.trim().length > 20) score += 10;
    score += Math.min(10, Math.round((skills.length / 3) * 10));
    if (experiences.length > 0) score += 20;
    if (education.length > 0) score += 15;
    if (projects.length > 0) score += 5;
    if (certifications.length > 0) score += 5;
    if (resumeFile) score += 10;
    const prefFields = [preferences.desiredJobTitle, preferences.expectedSalary, preferences.noticePeriod];
    score += Math.round((prefFields.filter(Boolean).length / 3) * 10);
    return Math.min(100, score);
  }, [basicInfo, summary, skills, experiences, education, projects, certifications, resumeFile, preferences]);

  const completionColor = completion >= 80 ? "bg-green-500" : completion >= 50 ? "bg-yellow-500" : "bg-[#FF2B2B]";

  // ── Helpers ───────────────────────────────────────────────────────────────
  async function addSkill() {
    const s = newSkill.trim();
    if (s && !skills.includes(s)) {
      const updated = [...skills, s];
      setSkills(updated);
      if (profile?.id) await supabase.from("profiles").update({ skills: updated }).eq("id", profile.id);
    }
    setNewSkill(""); setShowSkillInput(false);
  }
  async function removeSkill(skill: string) {
    const updated = skills.filter(s => s !== skill);
    setSkills(updated);
    if (profile?.id) await supabase.from("profiles").update({ skills: updated }).eq("id", profile.id);
  }

  async function saveExp() {
    if (!expForm.title || !expForm.company) return;
    const startDate = `${expForm.startMonth} ${expForm.startYear}`;
    const endDate = expForm.current ? null : `${expForm.endMonth} ${expForm.endYear}`;
    if (editingExpId !== null) {
      setExperiences(prev => prev.map(e => e.id === editingExpId ? { ...expForm, id: e.id } : e));
      setEditingExpId(null);
      if (profile?.id) {
        await supabase.from("work_experience").update({
          company: expForm.company, title: expForm.title, location: expForm.location,
          start_date: startDate, end_date: endDate,
          is_current: expForm.current, description: expForm.description,
        }).eq("id", editingExpId).eq("profile_id", profile.id);
      }
    } else {
      let newId = String(Date.now());
      if (profile?.id) {
        const { data } = await supabase.from("work_experience").insert({
          profile_id: profile.id, company: expForm.company, title: expForm.title,
          location: expForm.location, start_date: startDate, end_date: endDate,
          is_current: expForm.current, description: expForm.description,
        }).select("id").single();
        if (data?.id) newId = data.id;
      }
      setExperiences(prev => [...prev, { ...expForm, id: newId }]);
      setShowAddExp(false);
    }
    setExpForm(emptyExp);
  }
  function editExp(exp: WorkExp) {
    setEditingExpId(exp.id);
    setExpForm({ title: exp.title, company: exp.company, location: exp.location, startMonth: exp.startMonth, startYear: exp.startYear, endMonth: exp.endMonth, endYear: exp.endYear, current: exp.current, description: exp.description });
    setShowAddExp(false);
  }
  function cancelExp() { setEditingExpId(null); setShowAddExp(false); setExpForm(emptyExp); }

  async function saveEdu() {
    if (!eduForm.degree || !eduForm.college) return;
    if (editingEduId !== null) {
      setEducation(prev => prev.map(e => e.id === editingEduId ? { ...eduForm, id: e.id } : e));
      setEditingEduId(null);
      if (profile?.id) {
        await supabase.from("education").update({
          institution: eduForm.college, degree: eduForm.degree, field: eduForm.field,
          start_year: eduForm.startYear, end_year: eduForm.endYear, score: eduForm.score,
        }).eq("id", editingEduId).eq("profile_id", profile.id);
      }
    } else {
      let newId = String(Date.now());
      if (profile?.id) {
        const { data } = await supabase.from("education").insert({
          profile_id: profile.id, institution: eduForm.college, degree: eduForm.degree,
          field: eduForm.field, start_year: eduForm.startYear, end_year: eduForm.endYear,
          score: eduForm.score,
        }).select("id").single();
        if (data?.id) newId = data.id;
      }
      setEducation(prev => [...prev, { ...eduForm, id: newId }]);
      setShowAddEdu(false);
    }
    setEduForm(emptyEdu);
  }
  function editEdu(edu: Education) {
    setEditingEduId(edu.id);
    setEduForm({ degree: edu.degree, field: edu.field, college: edu.college, startYear: edu.startYear, endYear: edu.endYear, score: edu.score });
    setShowAddEdu(false);
  }
  function cancelEdu() { setEditingEduId(null); setShowAddEdu(false); setEduForm(emptyEdu); }

  async function saveProj() {
    if (!projForm.name) return;
    if (editingProjId !== null) {
      setProjects(prev => prev.map(p => p.id === editingProjId ? { ...projForm, id: p.id } : p));
      setEditingProjId(null);
      if (profile?.id) await supabase.from("projects").update({
        name: projForm.name, url: projForm.url, start_year: projForm.startYear,
        end_year: projForm.endYear, description: projForm.description,
      }).eq("id", editingProjId).eq("profile_id", profile.id);
    } else {
      let newId = Date.now();
      if (profile?.id) {
        const { data } = await supabase.from("projects").insert({
          profile_id: profile.id, name: projForm.name, url: projForm.url,
          start_year: projForm.startYear, end_year: projForm.endYear, description: projForm.description,
        }).select("id").single();
        if (data?.id) newId = data.id;
      }
      setProjects(prev => [...prev, { ...projForm, id: newId }]);
      setShowAddProj(false);
    }
    setProjForm(emptyProj);
  }
  function editProj(proj: Project) {
    setEditingProjId(proj.id);
    setProjForm({ name: proj.name, url: proj.url, startYear: proj.startYear, endYear: proj.endYear, description: proj.description });
    setShowAddProj(false);
  }
  function cancelProj() { setEditingProjId(null); setShowAddProj(false); setProjForm(emptyProj); }

  async function saveCert() {
    if (!certForm.name) return;
    if (editingCertId !== null) {
      setCertifications(prev => prev.map(c => c.id === editingCertId ? { ...certForm, id: c.id } : c));
      setEditingCertId(null);
      if (profile?.id) await supabase.from("certifications").update({
        name: certForm.name, issuer: certForm.issuer,
        issue_date: certForm.issueDate, credential_id: certForm.credentialId,
      }).eq("id", editingCertId).eq("profile_id", profile.id);
    } else {
      let newId = Date.now();
      if (profile?.id) {
        const { data } = await supabase.from("certifications").insert({
          profile_id: profile.id, name: certForm.name, issuer: certForm.issuer,
          issue_date: certForm.issueDate, credential_id: certForm.credentialId,
        }).select("id").single();
        if (data?.id) newId = data.id;
      }
      setCertifications(prev => [...prev, { ...certForm, id: newId }]);
      setShowAddCert(false);
    }
    setCertForm(emptyCert);
  }
  function editCert(cert: Certification) {
    setEditingCertId(cert.id);
    setCertForm({ name: cert.name, issuer: cert.issuer, issueDate: cert.issueDate, credentialId: cert.credentialId });
    setShowAddCert(false);
  }
  function cancelCert() { setEditingCertId(null); setShowAddCert(false); setCertForm(emptyCert); }

  async function addLang() {
    if (!langForm.language.trim()) return;
    const updated = [...languages, { ...langForm, id: Date.now() }];
    setLanguages(updated);
    setLangForm({ language: "", proficiency: "Beginner" }); setShowAddLang(false);
    if (profile?.id) await supabase.from("profiles").update({
      languages: updated.map(l => ({ language: l.language, proficiency: l.proficiency }))
    }).eq("id", profile.id);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-[#3A1F1F] mb-6">My Profile</h1>

      {/* Completion Banner */}
      <div className="bg-white rounded-2xl p-6 shadow-md mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-[#3A1F1F]">Profile Completion</h3>
            <p className="text-sm text-[#8A8A8A]">
              {completion < 50 ? "Add more details to get noticed by recruiters." : completion < 80 ? "Almost there! A complete profile gets 5x more views." : "Great profile! Recruiters can find you easily."}
            </p>
          </div>
          <div className="text-3xl font-bold text-[#3A1F1F]">{completion}%</div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div className={`${completionColor} h-3 rounded-full transition-all duration-500`} style={{ width: `${completion}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#8A8A8A]">
          {[
            { label: "Basic Info", done: !!(basicInfo.name && basicInfo.phone && basicInfo.email && basicInfo.location) },
            { label: "Summary", done: summary.length > 20 },
            { label: "Skills (3+)", done: skills.length >= 3 },
            { label: "Experience", done: experiences.length > 0 },
            { label: "Education", done: education.length > 0 },
            { label: "Projects", done: projects.length > 0 },
            { label: "Certifications", done: certifications.length > 0 },
            { label: "Resume", done: !!resumeFile },
            { label: "Job Preferences", done: !!(preferences.desiredJobTitle && preferences.expectedSalary) },
          ].map(({ label, done }) => (
            <span key={label} className={`px-2 py-1 rounded-full text-xs ${done ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
              {done ? "✓" : "○"} {label}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {/* ── Basic Info ── */}
        <div className="bg-white rounded-2xl p-6 shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-[#3A1F1F] flex items-center gap-2"><User className="h-5 w-5 text-[#FF2B2B]" /> Basic Information</h3>
            {!editingBasic && (
              <Button variant="ghost" size="sm" className="text-[#FF2B2B]" onClick={() => { setBasicForm({ ...basicInfo }); setEditingBasic(true); }}>
                <Pencil className="h-4 w-4 mr-1" /> Edit
              </Button>
            )}
          </div>

          {editingBasic ? (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { label: "Full Name *", key: "name" },
                  { label: "Professional Headline", key: "headline" },
                  { label: "Phone *", key: "phone" },
                  { label: "Email *", key: "email" },
                  { label: "Location *", key: "location" },
                  { label: "Date of Birth", key: "dob" },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label className="block text-sm text-[#3A1F1F] mb-1">{label}</label>
                    <Input
                      value={basicForm[key as keyof typeof basicForm]}
                      onChange={(e) => setBasicForm(f => ({ ...f, [key]: e.target.value }))}
                      className="bg-[#F6F6F6] border-gray-200 rounded-xl"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-sm text-[#3A1F1F] mb-1">Gender</label>
                  <Select value={basicForm.gender} onValueChange={(v) => setBasicForm(f => ({ ...f, gender: v }))}>
                    <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Male","Female","Non-binary","Prefer not to say"].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm text-[#3A1F1F] mb-1">Marital Status</label>
                  <Select value={basicForm.maritalStatus} onValueChange={(v) => setBasicForm(f => ({ ...f, maritalStatus: v }))}>
                    <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Single","Married","Divorced","Widowed"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm text-[#3A1F1F] mb-1">LinkedIn Profile</label>
                  <Input value={basicForm.linkedin} onChange={(e) => setBasicForm(f => ({ ...f, linkedin: e.target.value }))} className="bg-[#F6F6F6] border-gray-200 rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm text-[#3A1F1F] mb-1">Portfolio / Website</label>
                  <Input value={basicForm.portfolio} onChange={(e) => setBasicForm(f => ({ ...f, portfolio: e.target.value }))} className="bg-[#F6F6F6] border-gray-200 rounded-xl" />
                </div>
              </div>
              <div className="flex gap-3">
                <Button className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full" onClick={async () => {
                  setBasicInfo(basicForm);
                  setEditingBasic(false);
                  if (profile?.id) {
                    const nameParts = basicForm.name.trim().split(" ");
                    const first = nameParts[0];
                    const last = nameParts.slice(1).join(" ");
                    await supabase.from("profiles").update({
                      first_name: first, last_name: last, phone: basicForm.phone,
                      headline: basicForm.headline, location: basicForm.location,
                      linkedin_url: basicForm.linkedin, portfolio_url: basicForm.portfolio,
                      dob: basicForm.dob || null, gender: basicForm.gender || null,
                      marital_status: basicForm.maritalStatus || null,
                    }).eq("id", profile.id);
                    refreshProfile();
                  }
                }}>Save</Button>
                <Button variant="outline" className="rounded-full" onClick={() => setEditingBasic(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-start gap-6 mb-4">
                {/* Avatar — click to upload */}
                <label className="relative cursor-pointer group shrink-0">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !profile?.id) return;
                      // Preview immediately (optimistic)
                      const reader = new FileReader();
                      reader.onload = (ev) => setProfilePic(ev.target?.result as string);
                      reader.readAsDataURL(file);
                      // Upload to Supabase Storage
                      const ext = file.name.split(".").pop();
                      const filePath = `${profile.id}/avatar.${ext}`;
                      const { data: uploadData, error: uploadError } = await supabase.storage
                        .from("avatars")
                        .upload(filePath, file, { upsert: true });
                      if (uploadError) {
                        console.error("Avatar upload error:", uploadError.message);
                        alert("Profile pic upload failed: " + uploadError.message);
                        return;
                      }
                      if (uploadData) {
                        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
                        const { error: dbError } = await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("id", profile.id);
                        if (dbError) console.error("Avatar DB update error:", dbError.message);
                        else refreshProfile();
                      }
                    }}
                  />
                  {profilePic ? (
                    <img
                      src={profilePic}
                      alt="Profile"
                      className="w-20 h-20 rounded-full object-cover border-2 border-white shadow-md"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-[#FF2B2B] rounded-full flex items-center justify-center text-white text-2xl font-bold">
                      {basicInfo.name.split(" ").map(n => n[0]).join("")}
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/50 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-0.5">
                    <Camera className="h-5 w-5 text-white" />
                    <span className="text-[9px] text-white font-medium leading-tight">Change</span>
                  </div>
                </label>
                <div>
                  <h2 className="text-2xl font-bold text-[#3A1F1F]">{basicInfo.name}</h2>
                  <p className="text-[#8A8A8A] mb-2">{basicInfo.headline}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-[#8A8A8A]">
                    <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{basicInfo.location}</span>
                    <span className="flex items-center gap-1"><Phone className="h-4 w-4" />{basicInfo.phone}</span>
                    <span className="flex items-center gap-1"><Mail className="h-4 w-4" />{basicInfo.email}</span>
                    {basicInfo.linkedin && <span className="flex items-center gap-1"><Globe className="h-4 w-4" />{basicInfo.linkedin}</span>}
                  </div>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-3 text-sm text-[#8A8A8A]">
                {basicInfo.dob && <span><strong className="text-[#3A1F1F]">DOB:</strong> {basicInfo.dob}</span>}
                {basicInfo.gender && <span><strong className="text-[#3A1F1F]">Gender:</strong> {basicInfo.gender}</span>}
                {basicInfo.maritalStatus && <span><strong className="text-[#3A1F1F]">Status:</strong> {basicInfo.maritalStatus}</span>}
              </div>
            </div>
          )}
        </div>

        {/* ── Summary ── */}
        <div className="bg-white rounded-2xl p-6 shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-[#3A1F1F]">Professional Summary</h3>
            {!editingSummary && (
              <Button variant="ghost" size="sm" className="text-[#FF2B2B]" onClick={() => { setSummaryForm(summary); setEditingSummary(true); }}>
                <Pencil className="h-4 w-4 mr-1" /> Edit
              </Button>
            )}
          </div>
          {editingSummary ? (
            <div className="space-y-3">
              <Textarea
                value={summaryForm}
                onChange={(e) => setSummaryForm(e.target.value)}
                rows={5}
                className="bg-[#F6F6F6] border-gray-200 rounded-xl resize-none"
                placeholder="Describe your professional background, key skills, and career goals..."
              />
              <div className="flex gap-3">
                <Button className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full" onClick={async () => {
                  setSummary(summaryForm); setEditingSummary(false);
                  if (profile?.id) await supabase.from("profiles").update({ about: summaryForm }).eq("id", profile.id);
                }}>Save</Button>
                <Button variant="outline" className="rounded-full" onClick={() => setEditingSummary(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <p className="text-[#8A8A8A] leading-relaxed">{summary || <span className="italic text-gray-400">No summary added yet.</span>}</p>
          )}
        </div>

        {/* ── Skills ── */}
        <div className="bg-white rounded-2xl p-6 shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-[#3A1F1F]">Key Skills</h3>
            <Button variant="outline" size="sm" className="border-[#FF2B2B] text-[#FF2B2B] rounded-full" onClick={() => setShowSkillInput(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Skill
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {skills.map((skill) => (
              <span key={skill} className="flex items-center gap-1 bg-[#ECECF4] text-[#3A1F1F] px-3 py-1.5 rounded-full text-sm font-medium">
                {skill}
                <button onClick={() => removeSkill(skill)} className="ml-1 text-[#8A8A8A] hover:text-[#FF2B2B]"><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
          {showSkillInput && (
            <div className="flex gap-2 mt-3">
              <Input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addSkill(); if (e.key === "Escape") setShowSkillInput(false); }}
                placeholder="Type a skill and press Enter"
                className="bg-[#F6F6F6] border-gray-200 rounded-xl max-w-xs"
                autoFocus
              />
              <Button className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full" onClick={addSkill}>Add</Button>
              <Button variant="outline" className="rounded-full" onClick={() => setShowSkillInput(false)}>Cancel</Button>
            </div>
          )}
        </div>

        {/* ── Work Experience ── */}
        <div className="bg-white rounded-2xl p-6 shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-[#3A1F1F] flex items-center gap-2"><Briefcase className="h-5 w-5 text-[#FF2B2B]" /> Work Experience</h3>
            <Button variant="outline" size="sm" className="border-[#FF2B2B] text-[#FF2B2B] rounded-full" onClick={() => { setShowAddExp(true); setEditingExpId(null); setExpForm(emptyExp); }}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>

          <div className="space-y-4">
            {experiences.map((exp) => (
              <div key={exp.id}>
                {editingExpId === exp.id ? (
                  <ExpForm form={expForm} setForm={setExpForm} onSave={saveExp} onCancel={cancelExp} />
                ) : (
                  <div className="border-l-2 border-[#FF2B2B] pl-4 flex justify-between">
                    <div>
                      <h4 className="font-semibold text-[#3A1F1F]">{exp.title}</h4>
                      <p className="text-[#8A8A8A] text-sm">{exp.company}{exp.location ? ` • ${exp.location}` : ""}</p>
                      <p className="text-[#8A8A8A] text-xs mt-0.5">
                        {exp.startMonth} {exp.startYear} – {exp.current ? "Present" : `${exp.endMonth} ${exp.endYear}`}
                      </p>
                      {exp.description && <p className="text-[#8A8A8A] text-sm mt-2">{exp.description}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0 ml-4">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-[#8A8A8A] hover:text-[#FF2B2B]" onClick={() => editExp(exp)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-[#8A8A8A] hover:text-red-600" onClick={async () => { setExperiences(p => p.filter(e => e.id !== exp.id)); if (profile?.id) await supabase.from("work_experience").delete().eq("id", exp.id).eq("profile_id", profile.id); }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {experiences.length === 0 && !showAddExp && (
              <p className="text-[#8A8A8A] text-sm italic">No work experience added yet.</p>
            )}
            {showAddExp && <ExpForm form={expForm} setForm={setExpForm} onSave={saveExp} onCancel={cancelExp} />}
          </div>
        </div>

        {/* ── Education ── */}
        <div className="bg-white rounded-2xl p-6 shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-[#3A1F1F] flex items-center gap-2"><GraduationCap className="h-5 w-5 text-[#FF2B2B]" /> Education</h3>
            <Button variant="outline" size="sm" className="border-[#FF2B2B] text-[#FF2B2B] rounded-full" onClick={() => { setShowAddEdu(true); setEditingEduId(null); setEduForm(emptyEdu); }}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
          <div className="space-y-4">
            {education.map((edu) => (
              <div key={edu.id}>
                {editingEduId === edu.id ? (
                  <EduForm form={eduForm} setForm={setEduForm} onSave={saveEdu} onCancel={cancelEdu} />
                ) : (
                  <div className="border-l-2 border-[#FF2B2B] pl-4 flex justify-between">
                    <div>
                      <h4 className="font-semibold text-[#3A1F1F]">{edu.degree}{edu.field ? ` in ${edu.field}` : ""}</h4>
                      <p className="text-[#8A8A8A] text-sm">{edu.college}</p>
                      <p className="text-[#8A8A8A] text-xs mt-0.5">{edu.startYear} – {edu.endYear}{edu.score ? ` • ${edu.score}` : ""}</p>
                    </div>
                    <div className="flex gap-1 shrink-0 ml-4">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-[#8A8A8A] hover:text-[#FF2B2B]" onClick={() => editEdu(edu)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-[#8A8A8A] hover:text-red-600" onClick={async () => { setEducation(p => p.filter(e => e.id !== edu.id)); if (profile?.id) await supabase.from("education").delete().eq("id", edu.id).eq("profile_id", profile.id); }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {education.length === 0 && !showAddEdu && <p className="text-[#8A8A8A] text-sm italic">No education added yet.</p>}
            {showAddEdu && <EduForm form={eduForm} setForm={setEduForm} onSave={saveEdu} onCancel={cancelEdu} />}
          </div>
        </div>

        {/* ── Projects ── */}
        <div className="bg-white rounded-2xl p-6 shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-[#3A1F1F] flex items-center gap-2"><Globe className="h-5 w-5 text-[#FF2B2B]" /> Projects</h3>
            <Button variant="outline" size="sm" className="border-[#FF2B2B] text-[#FF2B2B] rounded-full" onClick={() => { setShowAddProj(true); setEditingProjId(null); setProjForm(emptyProj); }}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
          <div className="space-y-4">
            {projects.map((proj) => (
              <div key={proj.id}>
                {editingProjId === proj.id ? (
                  <ProjForm form={projForm} setForm={setProjForm} onSave={saveProj} onCancel={cancelProj} />
                ) : (
                  <div className="border-l-2 border-[#FF2B2B] pl-4 flex justify-between">
                    <div>
                      <h4 className="font-semibold text-[#3A1F1F]">{proj.name}</h4>
                      {proj.url && <a href={proj.url} target="_blank" rel="noopener noreferrer" className="text-[#FF2B2B] text-xs hover:underline">{proj.url}</a>}
                      <p className="text-[#8A8A8A] text-xs mt-0.5">{proj.startYear} – {proj.endYear}</p>
                      {proj.description && <p className="text-[#8A8A8A] text-sm mt-1">{proj.description}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0 ml-4">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-[#8A8A8A] hover:text-[#FF2B2B]" onClick={() => editProj(proj)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-[#8A8A8A] hover:text-red-600" onClick={async () => { setProjects(p => p.filter(x => x.id !== proj.id)); if (profile?.id) await supabase.from("projects").delete().eq("id", proj.id).eq("profile_id", profile.id); }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {projects.length === 0 && !showAddProj && <p className="text-[#8A8A8A] text-sm italic">No projects added yet.</p>}
            {showAddProj && <ProjForm form={projForm} setForm={setProjForm} onSave={saveProj} onCancel={cancelProj} />}
          </div>
        </div>

        {/* ── Certifications ── */}
        <div className="bg-white rounded-2xl p-6 shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-[#3A1F1F] flex items-center gap-2"><Award className="h-5 w-5 text-[#FF2B2B]" /> Certifications</h3>
            <Button variant="outline" size="sm" className="border-[#FF2B2B] text-[#FF2B2B] rounded-full" onClick={() => { setShowAddCert(true); setEditingCertId(null); setCertForm(emptyCert); }}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
          <div className="space-y-4">
            {certifications.map((cert) => (
              <div key={cert.id}>
                {editingCertId === cert.id ? (
                  <CertForm form={certForm} setForm={setCertForm} onSave={saveCert} onCancel={cancelCert} />
                ) : (
                  <div className="border-l-2 border-[#FF2B2B] pl-4 flex justify-between">
                    <div>
                      <h4 className="font-semibold text-[#3A1F1F]">{cert.name}</h4>
                      {cert.issuer && <p className="text-[#8A8A8A] text-sm">{cert.issuer}</p>}
                      <p className="text-[#8A8A8A] text-xs mt-0.5">
                        {cert.issueDate && `Issued: ${cert.issueDate}`}
                        {cert.credentialId && ` • ID: ${cert.credentialId}`}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0 ml-4">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-[#8A8A8A] hover:text-[#FF2B2B]" onClick={() => editCert(cert)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-[#8A8A8A] hover:text-red-600" onClick={async () => { setCertifications(p => p.filter(c => c.id !== cert.id)); if (profile?.id) await supabase.from("certifications").delete().eq("id", cert.id).eq("profile_id", profile.id); }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {certifications.length === 0 && !showAddCert && <p className="text-[#8A8A8A] text-sm italic">No certifications added yet.</p>}
            {showAddCert && <CertForm form={certForm} setForm={setCertForm} onSave={saveCert} onCancel={cancelCert} />}
          </div>
        </div>

        {/* ── Languages ── */}
        <div className="bg-white rounded-2xl p-6 shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-[#3A1F1F]">Languages</h3>
            <Button variant="outline" size="sm" className="border-[#FF2B2B] text-[#FF2B2B] rounded-full" onClick={() => setShowAddLang(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-3 mb-3">
            {languages.map((lang) => (
              <div key={lang.id} className="flex items-center gap-1 bg-[#ECECF4] px-3 py-1.5 rounded-full text-sm">
                <span className="font-medium text-[#3A1F1F]">{lang.language}</span>
                <span className="text-[#8A8A8A] text-xs">· {lang.proficiency}</span>
                <button onClick={async () => {
                  const updated = languages.filter(l => l.id !== lang.id);
                  setLanguages(updated);
                  if (profile?.id) await supabase.from("profiles").update({ languages: updated.map(l => ({ language: l.language, proficiency: l.proficiency })) }).eq("id", profile.id);
                }} className="ml-1 text-[#8A8A8A] hover:text-[#FF2B2B]"><X className="h-3 w-3" /></button>
              </div>
            ))}
          </div>
          {showAddLang && (
            <div className="flex gap-3 mt-3 flex-wrap">
              <Input
                value={langForm.language}
                onChange={(e) => setLangForm(f => ({ ...f, language: e.target.value }))}
                placeholder="Language name"
                className="bg-[#F6F6F6] border-gray-200 rounded-xl w-40"
                autoFocus
              />
              <Select value={langForm.proficiency} onValueChange={(v) => setLangForm(f => ({ ...f, proficiency: v }))}>
                <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-xl w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Beginner","Intermediate","Proficient","Native"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full" onClick={addLang}>Add</Button>
              <Button variant="outline" className="rounded-full" onClick={() => setShowAddLang(false)}>Cancel</Button>
            </div>
          )}
        </div>

        {/* ── Resume ── */}
        <div className="bg-white rounded-2xl p-6 shadow-md">
          <h3 className="text-xl font-semibold text-[#3A1F1F] mb-4 flex items-center gap-2"><Upload className="h-5 w-5 text-[#FF2B2B]" /> Resume</h3>
          {resumeFile ? (
            <div className="flex items-center justify-between bg-[#F6F6F6] rounded-xl p-4">
              <div className="min-w-0">
                <p className="font-medium text-[#3A1F1F] truncate">Resume uploaded</p>
                <a href={resumeFile} target="_blank" rel="noopener noreferrer" className="text-sm text-[#FF2B2B] hover:underline">View / Download</a>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <label className="cursor-pointer">
                  <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !profile) return;
                    const ext = file.name.split(".").pop();
                    const filePath = `${profile.id}/resume.${ext}`;
                    const { data: uploadData, error: uploadError } = await supabase.storage.from("resumes").upload(filePath, file, { upsert: true });
                    if (uploadError) { alert("Resume upload failed: " + uploadError.message); return; }
                    if (uploadData) {
                      const { data: urlData } = supabase.storage.from("resumes").getPublicUrl(filePath);
                      await supabase.from("profiles").update({ resume_url: urlData.publicUrl }).eq("id", profile.id);
                      setResumeFile(urlData.publicUrl);
                      refreshProfile();
                    }
                  }} />
                  <Button variant="outline" size="sm" className="border-[#FF2B2B] text-[#FF2B2B] rounded-full" asChild><span><Pencil className="h-4 w-4 mr-1" /> Replace</span></Button>
                </label>
                <Button variant="ghost" size="sm" className="text-red-500 rounded-full" onClick={async () => {
                  if (!profile) return;
                  await supabase.from("profiles").update({ resume_url: null }).eq("id", profile.id);
                  setResumeFile(null);
                  refreshProfile();
                }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ) : (
            <label className="cursor-pointer">
              <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file || !profile) return;
                const ext = file.name.split(".").pop();
                const filePath = `${profile.id}/resume.${ext}`;
                const { data: uploadData, error: uploadError } = await supabase.storage.from("resumes").upload(filePath, file, { upsert: true });
                if (uploadError) { alert("Resume upload failed: " + uploadError.message); return; }
                if (uploadData) {
                  const { data: urlData } = supabase.storage.from("resumes").getPublicUrl(filePath);
                  await supabase.from("profiles").update({ resume_url: urlData.publicUrl }).eq("id", profile.id);
                  setResumeFile(urlData.publicUrl);
                  refreshProfile();
                }
              }} />
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:border-[#FF2B2B] transition-colors">
                <Upload className="h-10 w-10 mx-auto mb-3 text-[#8A8A8A]" />
                <p className="text-[#3A1F1F] font-medium mb-1">Upload your resume</p>
                <p className="text-[#8A8A8A] text-sm">PDF, DOC, or DOCX · Max 5MB</p>
                <Button className="mt-4 bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full" asChild><span>Choose File</span></Button>
              </div>
            </label>
          )}
        </div>

        {/* ── Preferred Job Settings ── */}
        <div className="bg-white rounded-2xl p-6 shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-[#3A1F1F] flex items-center gap-2"><Briefcase className="h-5 w-5 text-[#FF2B2B]" /> Preferred Job Settings</h3>
            {!editingPrefs && (
              <Button variant="ghost" size="sm" className="text-[#FF2B2B]" onClick={() => { setPrefsForm({ ...preferences }); setEditingPrefs(true); }}>
                <Pencil className="h-4 w-4 mr-1" /> Edit
              </Button>
            )}
          </div>

          {editingPrefs ? (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { label: "Desired Job Title", key: "desiredJobTitle" },
                  { label: "Preferred Location", key: "preferredLocation" },
                  { label: "Expected Salary", key: "expectedSalary" },
                  { label: "Notice Period", key: "noticePeriod" },
                  { label: "Work Authorization", key: "workAuth" },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label className="block text-sm text-[#3A1F1F] mb-1">{label}</label>
                    <Input
                      value={prefsForm[key as keyof typeof prefsForm]}
                      onChange={(e) => setPrefsForm(f => ({ ...f, [key]: e.target.value }))}
                      className="bg-[#F6F6F6] border-gray-200 rounded-xl"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-sm text-[#3A1F1F] mb-1">Job Type</label>
                  <Select value={prefsForm.jobType} onValueChange={(v) => setPrefsForm(f => ({ ...f, jobType: v }))}>
                    <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Full-time","Part-time","Contract","Internship","Freelance"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm text-[#3A1F1F] mb-1">Willing to Relocate</label>
                  <Select value={prefsForm.willingToRelocate} onValueChange={(v) => setPrefsForm(f => ({ ...f, willingToRelocate: v }))}>
                    <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Yes","No","Maybe"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-3">
                <Button className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full" onClick={async () => {
                  setPreferences(prefsForm); setEditingPrefs(false);
                  if (profile?.id) await supabase.from("profiles").update({
                    desired_job_title: prefsForm.desiredJobTitle || null,
                    job_type_pref: prefsForm.jobType || null,
                    preferred_location: prefsForm.preferredLocation || null,
                    expected_salary: prefsForm.expectedSalary || null,
                    notice_period: prefsForm.noticePeriod || null,
                    work_auth: prefsForm.workAuth || null,
                    willing_to_relocate: prefsForm.willingToRelocate || null,
                  }).eq("id", profile.id);
                }}>Save</Button>
                <Button variant="outline" className="rounded-full" onClick={() => setEditingPrefs(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              {Object.entries({
                "Desired Role": preferences.desiredJobTitle,
                "Job Type": preferences.jobType,
                "Preferred Location": preferences.preferredLocation,
                "Expected Salary": preferences.expectedSalary,
                "Notice Period": preferences.noticePeriod,
                "Work Authorization": preferences.workAuth,
                "Willing to Relocate": preferences.willingToRelocate,
              }).map(([label, value]) => (
                <div key={label} className="bg-[#F6F6F6] rounded-xl p-3">
                  <p className="text-[#8A8A8A] text-xs mb-1">{label}</p>
                  <p className="font-medium text-[#3A1F1F]">{value || "—"}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-forms ──────────────────────────────────────────────────────────────────
function ExpForm({ form, setForm, onSave, onCancel }: {
  form: Omit<WorkExp,"id">;
  setForm: (f: Omit<WorkExp,"id">) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="bg-[#F6F6F6] rounded-xl p-5 space-y-4 border border-gray-200">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-[#3A1F1F] mb-1">Job Title *</label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-white border-gray-200 rounded-xl" autoFocus />
        </div>
        <div>
          <label className="block text-sm text-[#3A1F1F] mb-1">Company *</label>
          <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="bg-white border-gray-200 rounded-xl" />
        </div>
        <div>
          <label className="block text-sm text-[#3A1F1F] mb-1">Location</label>
          <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="bg-white border-gray-200 rounded-xl" />
        </div>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-sm text-[#3A1F1F] mb-1">Start</label>
            <div className="flex gap-2">
              <Select value={form.startMonth} onValueChange={(v) => setForm({ ...form, startMonth: v })}>
                <SelectTrigger className="bg-white border-gray-200 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={form.startYear} onValueChange={(v) => setForm({ ...form, startYear: v })}>
                <SelectTrigger className="bg-white border-gray-200 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>
        {!form.current && (
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-sm text-[#3A1F1F] mb-1">End</label>
              <div className="flex gap-2">
                <Select value={form.endMonth} onValueChange={(v) => setForm({ ...form, endMonth: v })}>
                  <SelectTrigger className="bg-white border-gray-200 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.endYear} onValueChange={(v) => setForm({ ...form, endYear: v })}>
                  <SelectTrigger className="bg-white border-gray-200 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 mt-2">
          <input type="checkbox" id="current-exp" checked={form.current} onChange={(e) => setForm({ ...form, current: e.target.checked })} className="accent-[#FF2B2B]" />
          <label htmlFor="current-exp" className="text-sm text-[#3A1F1F]">Currently working here</label>
        </div>
      </div>
      <div>
        <label className="block text-sm text-[#3A1F1F] mb-1">Description</label>
        <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="bg-white border-gray-200 rounded-xl resize-none" placeholder="Describe your role and achievements..." />
      </div>
      <div className="flex gap-3">
        <Button className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full" onClick={onSave}>Save</Button>
        <Button variant="outline" className="rounded-full" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

function EduForm({ form, setForm, onSave, onCancel }: {
  form: Omit<Education,"id">;
  setForm: (f: Omit<Education,"id">) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="bg-[#F6F6F6] rounded-xl p-5 space-y-4 border border-gray-200">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-[#3A1F1F] mb-1">Degree *</label>
          <Select value={form.degree} onValueChange={(v) => setForm({ ...form, degree: v })}>
            <SelectTrigger className="bg-white border-gray-200 rounded-xl"><SelectValue placeholder="Select degree" /></SelectTrigger>
            <SelectContent>
              {["High School","Diploma","B.Tech / B.E.","B.Sc","B.Com","B.A.","MBA","M.Tech / M.E.","M.Sc","M.A.","Ph.D","Other"].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm text-[#3A1F1F] mb-1">Field of Study</label>
          <Input value={form.field} onChange={(e) => setForm({ ...form, field: e.target.value })} className="bg-white border-gray-200 rounded-xl" placeholder="e.g. Computer Science" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm text-[#3A1F1F] mb-1">College / University *</label>
          <Input value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })} className="bg-white border-gray-200 rounded-xl" autoFocus />
        </div>
        <div>
          <label className="block text-sm text-[#3A1F1F] mb-1">Start Year</label>
          <Select value={form.startYear} onValueChange={(v) => setForm({ ...form, startYear: v })}>
            <SelectTrigger className="bg-white border-gray-200 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm text-[#3A1F1F] mb-1">End Year</label>
          <Select value={form.endYear} onValueChange={(v) => setForm({ ...form, endYear: v })}>
            <SelectTrigger className="bg-white border-gray-200 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm text-[#3A1F1F] mb-1">Score (CGPA / %)</label>
          <Input value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} className="bg-white border-gray-200 rounded-xl" placeholder="e.g. 3.8 CGPA or 85%" />
        </div>
      </div>
      <div className="flex gap-3">
        <Button className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full" onClick={onSave}>Save</Button>
        <Button variant="outline" className="rounded-full" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

function ProjForm({ form, setForm, onSave, onCancel }: {
  form: Omit<Project,"id">;
  setForm: (f: Omit<Project,"id">) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="bg-[#F6F6F6] rounded-xl p-5 space-y-4 border border-gray-200">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-[#3A1F1F] mb-1">Project Name *</label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-white border-gray-200 rounded-xl" autoFocus />
        </div>
        <div>
          <label className="block text-sm text-[#3A1F1F] mb-1">Project URL</label>
          <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className="bg-white border-gray-200 rounded-xl" placeholder="https://..." />
        </div>
        <div>
          <label className="block text-sm text-[#3A1F1F] mb-1">Start Year</label>
          <Select value={form.startYear} onValueChange={(v) => setForm({ ...form, startYear: v })}>
            <SelectTrigger className="bg-white border-gray-200 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm text-[#3A1F1F] mb-1">End Year</label>
          <Select value={form.endYear} onValueChange={(v) => setForm({ ...form, endYear: v })}>
            <SelectTrigger className="bg-white border-gray-200 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm text-[#3A1F1F] mb-1">Description *</label>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="bg-white border-gray-200 rounded-xl resize-none" placeholder="Describe what you built and your contributions..." />
        </div>
      </div>
      <div className="flex gap-3">
        <Button className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full" onClick={onSave}>Save</Button>
        <Button variant="outline" className="rounded-full" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

function CertForm({ form, setForm, onSave, onCancel }: {
  form: Omit<Certification,"id">;
  setForm: (f: Omit<Certification,"id">) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="bg-[#F6F6F6] rounded-xl p-5 space-y-4 border border-gray-200">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-[#3A1F1F] mb-1">Certificate Name *</label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-white border-gray-200 rounded-xl" autoFocus />
        </div>
        <div>
          <label className="block text-sm text-[#3A1F1F] mb-1">Issuing Organization</label>
          <Input value={form.issuer} onChange={(e) => setForm({ ...form, issuer: e.target.value })} className="bg-white border-gray-200 rounded-xl" placeholder="e.g. Google, Coursera" />
        </div>
        <div>
          <label className="block text-sm text-[#3A1F1F] mb-1">Issue Date</label>
          <Input type="month" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} className="bg-white border-gray-200 rounded-xl" />
        </div>
        <div>
          <label className="block text-sm text-[#3A1F1F] mb-1">Credential ID</label>
          <Input value={form.credentialId} onChange={(e) => setForm({ ...form, credentialId: e.target.value })} className="bg-white border-gray-200 rounded-xl" />
        </div>
      </div>
      <div className="flex gap-3">
        <Button className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full" onClick={onSave}>Save</Button>
        <Button variant="outline" className="rounded-full" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

// ── Analytics Page ─────────────────────────────────────────────────────────────
const STATUS_STEPS = ["Applied", "Profile Viewed", "Shortlisted", "Interview", "Offer"] as const;

const STATUS_META: Record<string, { color: string; step: number }> = {
  "Applied":             { color: "bg-gray-100 text-gray-700",    step: 1 },
  "Profile Viewed":      { color: "bg-blue-100 text-blue-700",    step: 2 },
  "Shortlisted":         { color: "bg-amber-100 text-amber-700",  step: 3 },
  "Interview Scheduled": { color: "bg-purple-100 text-purple-700",step: 4 },
  "Offer Received":      { color: "bg-green-100 text-green-700",  step: 5 },
  "Rejected":            { color: "bg-red-100 text-red-700",      step: -1 },
};

function fmtIndustry(s: string) {
  return ({ tech:"Technology", finance:"Finance", healthcare:"Healthcare", marketing:"Marketing", design:"Design", media:"Media" } as Record<string,string>)[s] ?? s;
}
function fmtExp(s: string) {
  return ({ entry:"Entry Level", mid:"Mid Level", senior:"Senior" } as Record<string,string>)[s] ?? s;
}

function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<"applied" | "saved" | "compare">("applied");

  const chartData = [
    { month: "Oct", applications: 8 },  { month: "Nov", applications: 14 },
    { month: "Dec", applications: 10 }, { month: "Jan", applications: 18 },
    { month: "Feb", applications: 24 }, { month: "Mar", applications: 30 },
  ];

  const [appliedJobs, setAppliedJobs] = useState([
    { id: 1, title: "Senior Data Analyst",   company: "TechCorp Inc.",     location: "New York, NY",      appliedDate: "Mar 1, 2026",  status: "Interview Scheduled" },
    { id: 2, title: "DevOps Engineer",        company: "CloudSys",          location: "Remote",            appliedDate: "Feb 28, 2026", status: "Profile Viewed" },
    { id: 3, title: "Marketing Manager",      company: "Marketing Pro",     location: "Chicago, IL",       appliedDate: "Feb 25, 2026", status: "Applied" },
    { id: 4, title: "Product Designer",       company: "Design Hub",        location: "San Francisco, CA", appliedDate: "Feb 20, 2026", status: "Shortlisted" },
    { id: 5, title: "Software Engineer",      company: "Tech Innovations",  location: "Austin, TX",        appliedDate: "Feb 10, 2026", status: "Rejected" },
    { id: 6, title: "Product Manager",        company: "Product Co",        location: "Austin, TX",        appliedDate: "Jan 30, 2026", status: "Offer Received" },
  ]);

  const [savedJobs, setSavedJobs] = useState([
    { id: 1, title: "Frontend Developer",         company: "WebStudio",         location: "San Francisco, CA", salary: "$85k–$115k", savedDate: "Mar 5, 2026" },
    { id: 2, title: "Financial Analyst",           company: "Finance Plus",      location: "New York, NY",      salary: "$75k–$100k", savedDate: "Mar 3, 2026" },
    { id: 3, title: "Healthcare Data Specialist",  company: "MedTech Solutions", location: "Remote",            salary: "$65k–$85k",  savedDate: "Feb 28, 2026" },
    { id: 4, title: "Content Writer",              company: "Media Group",       location: "Remote",            salary: "$55k–$75k",  savedDate: "Feb 25, 2026" },
  ]);

  // Compare state
  const [job1Id, setJob1Id] = useState<string>("");
  const [job2Id, setJob2Id] = useState<string>("");

  const job1 = useMemo(() => ALL_JOBS.find(j => String(j.id) === job1Id) ?? null, [job1Id]);
  const job2 = useMemo(() => ALL_JOBS.find(j => String(j.id) === job2Id) ?? null, [job2Id]);

  // IDs of saved jobs found in ALL_JOBS
  const savedAllJobIds = useMemo(() =>
    savedJobs.map(sj => ALL_JOBS.find(j => j.title === sj.title)?.id).filter(Boolean) as number[],
    [savedJobs]
  );

  const compareRows: { label: string; val1: string; val2: string }[] = useMemo(() => {
    if (!job1 || !job2) return [];
    return [
      { label: "Company",          val1: job1.company,                     val2: job2.company },
      { label: "Location",         val1: job1.location,                    val2: job2.location },
      { label: "Salary",           val1: job1.salary,                      val2: job2.salary },
      { label: "Job Type",         val1: job1.type,                        val2: job2.type },
      { label: "Work Mode",        val1: job1.isRemote ? "Remote" : "On-site", val2: job2.isRemote ? "Remote" : "On-site" },
      { label: "Industry",         val1: fmtIndustry(job1.industry),       val2: fmtIndustry(job2.industry) },
      { label: "Experience Level", val1: fmtExp(job1.experience),          val2: fmtExp(job2.experience) },
    ];
  }, [job1, job2]);

  const matchCount = compareRows.filter(r => r.val1 === r.val2).length;
  const matchPct = compareRows.length ? Math.round((matchCount / compareRows.length) * 100) : 0;

  const stats = [
    { label: "Applied",            value: appliedJobs.length,                                                Icon: Briefcase },
    { label: "Profile Views",      value: 2543,                                                              Icon: User },
    { label: "Recruiter Searches", value: 48,                                                                Icon: Search },
    { label: "Interviews",         value: appliedJobs.filter(j => j.status === "Interview Scheduled").length, Icon: Bell },
  ];

  const tabs = [
    { key: "applied",  label: `Applied Jobs (${appliedJobs.length})` },
    { key: "saved",    label: `Saved Jobs (${savedJobs.length})` },
    { key: "compare",  label: "Compare Jobs" },
  ] as const;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-[#3A1F1F] mb-6">Job Analytics</h1>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map(({ label, value, Icon }) => (
          <div key={label} className="bg-white rounded-2xl p-4 shadow-md flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FF2B2B]/10 rounded-full flex items-center justify-center shrink-0">
              <Icon className="h-5 w-5 text-[#FF2B2B]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#3A1F1F]">{value}</p>
              <p className="text-xs text-[#8A8A8A]">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main + Sidebar (sidebar hidden when compare is active) */}
      <div className={`grid gap-6 ${activeTab === "compare" ? "grid-cols-1" : "lg:grid-cols-3"}`}>

        {/* Left — Tabs */}
        <div className={activeTab === "compare" ? "w-full" : "lg:col-span-2"}>
          {/* Tab buttons */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  activeTab === key
                    ? "bg-[#FF2B2B] text-white"
                    : "bg-white text-[#3A1F1F] shadow-sm hover:shadow-md"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Applied Jobs */}
          {activeTab === "applied" && (
            <div className="space-y-3">
              {appliedJobs.length === 0 && (
                <div className="bg-white rounded-2xl p-12 shadow-md text-center">
                  <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-[#8A8A8A]">No applications yet. Start applying!</p>
                </div>
              )}
              {appliedJobs.map((job) => {
                const meta = STATUS_META[job.status] ?? STATUS_META["Applied"];
                const isRejected = job.status === "Rejected";
                return (
                  <div key={job.id} className="bg-white rounded-2xl p-5 shadow-md">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-[#3A1F1F] text-lg">{job.title}</h3>
                        <p className="text-[#8A8A8A] text-sm">{job.company} · {job.location}</p>
                        <p className="text-xs text-[#8A8A8A] mt-0.5">Applied on {job.appliedDate}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${meta.color} text-xs`}>{job.status}</Badge>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-[#8A8A8A] hover:text-red-500"
                          onClick={() => setAppliedJobs(p => p.filter(j => j.id !== job.id))}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {isRejected ? (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="h-1.5 flex-1 bg-red-200 rounded-full" />
                        <span className="text-xs text-red-500 font-medium">Application not moved forward</span>
                        <div className="h-1.5 flex-1 bg-red-200 rounded-full" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 mt-2 overflow-x-auto pb-1">
                        {STATUS_STEPS.map((step, i) => {
                          const done = meta.step > i;
                          const current = meta.step === i + 1;
                          return (
                            <div key={step} className="flex items-center gap-1 shrink-0">
                              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all ${done || current ? "bg-[#FF2B2B] text-white" : "bg-gray-100 text-gray-400"}`}>
                                {(done || current) && <span className="text-[10px]">●</span>}
                                {step}
                              </div>
                              {i < STATUS_STEPS.length - 1 && (
                                <div className={`w-4 h-0.5 rounded-full ${done ? "bg-[#FF2B2B]" : "bg-gray-200"}`} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Saved Jobs */}
          {activeTab === "saved" && (
            <div className="space-y-3">
              {savedJobs.length === 0 && (
                <div className="bg-white rounded-2xl p-12 shadow-md text-center">
                  <Bookmark className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-[#8A8A8A]">No saved jobs yet. Bookmark jobs to apply later!</p>
                </div>
              )}
              {savedJobs.map((job) => (
                <div key={job.id} className="bg-white rounded-2xl p-5 shadow-md flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-[#3A1F1F]">{job.title}</h3>
                    <p className="text-[#8A8A8A] text-sm">{job.company} · {job.location}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-[#8A8A8A]">
                      <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{job.salary}</span>
                      <span>Saved {job.savedDate}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full text-xs">Apply Now</Button>
                    <Button size="sm" variant="ghost" className="text-[#8A8A8A] hover:text-red-500 rounded-full"
                      onClick={() => setSavedJobs(p => p.filter(j => j.id !== job.id))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Compare Jobs ── */}
          {activeTab === "compare" && (
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-[#3A1F1F]">Compare Jobs Side by Side</h3>
                  <p className="text-sm text-[#8A8A8A] mt-1">Select any two jobs to compare their details</p>
                </div>
                {savedAllJobIds.length >= 2 && (
                  <Button
                    variant="outline"
                    className="border-[#FF2B2B] text-[#FF2B2B] rounded-full text-sm shrink-0"
                    onClick={() => {
                      setJob1Id(String(savedAllJobIds[0]));
                      setJob2Id(String(savedAllJobIds[1]));
                    }}
                  >
                    <Bookmark className="h-4 w-4 mr-2" /> Fill from Saved Jobs
                  </Button>
                )}
              </div>

              {/* Job Selectors */}
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-[#3A1F1F] mb-2">Job 1</label>
                  <Select value={job1Id} onValueChange={setJob1Id}>
                    <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-xl">
                      <SelectValue placeholder="Select a job..." />
                    </SelectTrigger>
                    <SelectContent>
                      {savedAllJobIds.length > 0 && (
                        <>
                          <div className="px-2 py-1 text-xs font-semibold text-[#8A8A8A] uppercase tracking-wide">Saved Jobs</div>
                          {ALL_JOBS.filter(j => savedAllJobIds.includes(j.id)).map(j => (
                            <SelectItem key={j.id} value={String(j.id)}>
                              🔖 {j.title} — {j.company}
                            </SelectItem>
                          ))}
                          <div className="px-2 py-1 text-xs font-semibold text-[#8A8A8A] uppercase tracking-wide mt-1">All Jobs</div>
                        </>
                      )}
                      {ALL_JOBS.filter(j => !savedAllJobIds.includes(j.id)).map(j => (
                        <SelectItem key={j.id} value={String(j.id)}>
                          {j.title} — {j.company}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#3A1F1F] mb-2">Job 2</label>
                  <Select value={job2Id} onValueChange={setJob2Id}>
                    <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-xl">
                      <SelectValue placeholder="Select a job..." />
                    </SelectTrigger>
                    <SelectContent>
                      {savedAllJobIds.length > 0 && (
                        <>
                          <div className="px-2 py-1 text-xs font-semibold text-[#8A8A8A] uppercase tracking-wide">Saved Jobs</div>
                          {ALL_JOBS.filter(j => savedAllJobIds.includes(j.id)).map(j => (
                            <SelectItem key={j.id} value={String(j.id)}>
                              🔖 {j.title} — {j.company}
                            </SelectItem>
                          ))}
                          <div className="px-2 py-1 text-xs font-semibold text-[#8A8A8A] uppercase tracking-wide mt-1">All Jobs</div>
                        </>
                      )}
                      {ALL_JOBS.filter(j => !savedAllJobIds.includes(j.id)).map(j => (
                        <SelectItem key={j.id} value={String(j.id)}>
                          {j.title} — {j.company}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Placeholder when not both selected */}
              {(!job1 || !job2) && (
                <div className="text-center py-16 text-[#8A8A8A]">
                  <div className="flex justify-center gap-4 mb-4 opacity-30">
                    <div className="w-24 h-32 bg-gray-200 rounded-xl" />
                    <div className="flex items-center text-2xl font-bold text-gray-400">VS</div>
                    <div className="w-24 h-32 bg-gray-200 rounded-xl" />
                  </div>
                  <p className="font-medium">Select two jobs above to compare</p>
                  <p className="text-sm mt-1">Compare salary, location, job type, and more</p>
                </div>
              )}

              {/* Comparison Table */}
              {job1 && job2 && (
                <>
                  {/* Match Score */}
                  <div className="flex items-center justify-center gap-4 mb-6 p-4 bg-[#F6F6F6] rounded-xl">
                    <span className="text-sm text-[#8A8A8A]">Similarity Score</span>
                    <div className="flex-1 max-w-xs bg-gray-200 rounded-full h-2.5">
                      <div className="bg-[#FF2B2B] h-2.5 rounded-full transition-all" style={{ width: `${matchPct}%` }} />
                    </div>
                    <span className="font-bold text-[#3A1F1F] text-lg">{matchPct}%</span>
                    <span className="text-xs text-[#8A8A8A]">({matchCount}/{compareRows.length} fields match)</span>
                  </div>

                  {/* Header row */}
                  <div className="grid grid-cols-3 gap-3 mb-2">
                    <div />
                    <div className="bg-[#FF2B2B]/10 border-2 border-[#FF2B2B]/30 rounded-xl p-4 text-center">
                      <p className="text-xs text-[#8A8A8A] mb-1">Job 1</p>
                      <h4 className="font-bold text-[#3A1F1F] text-sm leading-tight">{job1.title}</h4>
                      <p className="text-xs text-[#8A8A8A] mt-1">{job1.company}</p>
                      {savedAllJobIds.includes(job1.id) && <Badge className="mt-2 bg-amber-100 text-amber-700 text-xs">Saved</Badge>}
                    </div>
                    <div className="bg-[#FF2B2B]/10 border-2 border-[#FF2B2B]/30 rounded-xl p-4 text-center">
                      <p className="text-xs text-[#8A8A8A] mb-1">Job 2</p>
                      <h4 className="font-bold text-[#3A1F1F] text-sm leading-tight">{job2.title}</h4>
                      <p className="text-xs text-[#8A8A8A] mt-1">{job2.company}</p>
                      {savedAllJobIds.includes(job2.id) && <Badge className="mt-2 bg-amber-100 text-amber-700 text-xs">Saved</Badge>}
                    </div>
                  </div>

                  {/* Data Rows */}
                  {compareRows.map(({ label, val1, val2 }) => {
                    const match = val1 === val2;
                    return (
                      <div key={label} className="grid grid-cols-3 gap-3 py-2 border-b border-gray-100 items-center">
                        <div className="text-sm font-medium text-[#8A8A8A]">{label}</div>
                        <div className={`text-sm text-center py-2 px-3 rounded-lg ${match ? "bg-green-50 text-green-700 font-medium" : "bg-[#F6F6F6] text-[#3A1F1F]"}`}>
                          {match && <span className="mr-1">✓</span>}{val1}
                        </div>
                        <div className={`text-sm text-center py-2 px-3 rounded-lg ${match ? "bg-green-50 text-green-700 font-medium" : "bg-[#F6F6F6] text-[#3A1F1F]"}`}>
                          {match && <span className="mr-1">✓</span>}{val2}
                        </div>
                      </div>
                    );
                  })}

                  {/* Description row */}
                  <div className="grid grid-cols-3 gap-3 py-3 items-start mt-1">
                    <div className="text-sm font-medium text-[#8A8A8A]">Description</div>
                    <div className="text-xs text-[#3A1F1F] bg-[#F6F6F6] rounded-lg p-3 leading-relaxed">{job1.description}</div>
                    <div className="text-xs text-[#3A1F1F] bg-[#F6F6F6] rounded-lg p-3 leading-relaxed">{job2.description}</div>
                  </div>

                  {/* CTA row */}
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div />
                    <Button className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full text-sm">Apply — {job1.title}</Button>
                    <Button className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full text-sm">Apply — {job2.title}</Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar — hidden when compare is active */}
        {activeTab !== "compare" && (
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-2xl p-5 shadow-md">
              <h3 className="font-semibold text-[#3A1F1F] mb-4">Application Trend</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ECECF4" />
                  <XAxis dataKey="month" stroke="#8A8A8A" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#8A8A8A" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="applications" fill="#FF2B2B" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-md">
              <h3 className="font-semibold text-[#3A1F1F] mb-4">Application Summary</h3>
              <div className="space-y-3">
                {[
                  { label: "In Progress",    count: appliedJobs.filter(j => !["Offer Received","Rejected"].includes(j.status)).length, color: "bg-blue-500" },
                  { label: "Offer Received", count: appliedJobs.filter(j => j.status === "Offer Received").length,  color: "bg-green-500" },
                  { label: "Rejected",       count: appliedJobs.filter(j => j.status === "Rejected").length,        color: "bg-red-400" },
                  { label: "Saved Jobs",     count: savedJobs.length,                                               color: "bg-amber-400" },
                ].map(({ label, count, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-[#3A1F1F]">
                      <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                      {label}
                    </div>
                    <span className="font-bold text-[#3A1F1F]">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#FF2B2B] rounded-2xl p-5 text-white">
              <h3 className="font-semibold mb-2">Profile Tip</h3>
              <p className="text-sm text-white/90">Recruiters who viewed your profile are 3× more likely to contact you. Keep your profile complete!</p>
              <Button size="sm" className="mt-3 bg-white text-[#FF2B2B] hover:bg-white/90 rounded-full text-xs w-full">View Profile</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Career Insights helpers ───────────────────────────────────────────────────
type DemandLevel = "High" | "Medium" | "Growing";
interface DomainData {
  roleTitle: string;
  trendingSkills: Array<{ skill: string; demand: DemandLevel; youHaveIt?: boolean }>;
  salaryRange: { entry: string; mid: string; senior: string };
  certifications: Array<{ name: string; provider: string; value: string }>;
}

const DOMAIN_MAP: Record<string, DomainData> = {
  ml: {
    roleTitle: "ML / AI Engineer",
    trendingSkills: [
      { skill: "Generative AI / LLMs", demand: "High" },
      { skill: "MLOps & Model Deployment", demand: "High" },
      { skill: "PyTorch / TensorFlow", demand: "High" },
      { skill: "LangChain / RAG Pipelines", demand: "Growing" },
      { skill: "Vector Databases (Pinecone, Weaviate)", demand: "Growing" },
      { skill: "Feature Engineering", demand: "Medium" },
    ],
    salaryRange: { entry: "6–12 LPA", mid: "14–28 LPA", senior: "30–60 LPA" },
    certifications: [
      { name: "TensorFlow Developer Certificate", provider: "Google", value: "High Demand" },
      { name: "AWS Certified ML – Specialty", provider: "Amazon", value: "High ROI" },
      { name: "Deep Learning Specialization", provider: "DeepLearning.AI / Coursera", value: "Recommended" },
      { name: "Databricks Certified ML Professional", provider: "Databricks", value: "In-Demand" },
    ],
  },
  data: {
    roleTitle: "Data Analyst / Engineer",
    trendingSkills: [
      { skill: "SQL (Advanced / Window Functions)", demand: "High" },
      { skill: "Python (Pandas, NumPy)", demand: "High" },
      { skill: "Power BI / Tableau", demand: "High" },
      { skill: "dbt (Data Build Tool)", demand: "Growing" },
      { skill: "Apache Spark", demand: "Medium" },
      { skill: "Google BigQuery / Snowflake", demand: "Growing" },
    ],
    salaryRange: { entry: "4–8 LPA", mid: "10–20 LPA", senior: "20–40 LPA" },
    certifications: [
      { name: "Google Data Analytics Certificate", provider: "Google / Coursera", value: "High ROI" },
      { name: "Microsoft PL-300 (Power BI Analyst)", provider: "Microsoft", value: "In-Demand" },
      { name: "AWS Certified Data Analytics – Specialty", provider: "Amazon", value: "Recommended" },
      { name: "Databricks Certified Data Engineer", provider: "Databricks", value: "Growing" },
    ],
  },
  frontend: {
    roleTitle: "Frontend Developer",
    trendingSkills: [
      { skill: "React 19 / Next.js 15", demand: "High" },
      { skill: "TypeScript", demand: "High" },
      { skill: "Tailwind CSS / shadcn/ui", demand: "High" },
      { skill: "Web Performance & Core Web Vitals", demand: "Growing" },
      { skill: "React Native / Flutter", demand: "Medium" },
      { skill: "WebAssembly", demand: "Growing" },
    ],
    salaryRange: { entry: "4–8 LPA", mid: "10–22 LPA", senior: "22–45 LPA" },
    certifications: [
      { name: "Meta Front-End Developer Certificate", provider: "Meta / Coursera", value: "High ROI" },
      { name: "JavaScript Algorithms & Data Structures", provider: "freeCodeCamp", value: "Foundational" },
      { name: "Google UX Design Certificate", provider: "Google / Coursera", value: "Recommended" },
      { name: "AWS CloudFront / CDN Specialization", provider: "Amazon", value: "In-Demand" },
    ],
  },
  backend: {
    roleTitle: "Backend / Full-Stack Developer",
    trendingSkills: [
      { skill: "Node.js / Bun.js", demand: "High" },
      { skill: "Go (Golang)", demand: "High" },
      { skill: "Microservices & Event-Driven Architecture", demand: "High" },
      { skill: "PostgreSQL / Redis / Kafka", demand: "Growing" },
      { skill: "GraphQL / tRPC", demand: "Medium" },
      { skill: "gRPC & Protocol Buffers", demand: "Growing" },
    ],
    salaryRange: { entry: "5–9 LPA", mid: "12–25 LPA", senior: "25–50 LPA" },
    certifications: [
      { name: "AWS Solutions Architect – Associate", provider: "Amazon", value: "High ROI" },
      { name: "Oracle Java SE Certified Developer", provider: "Oracle", value: "In-Demand" },
      { name: "MongoDB Certified Developer", provider: "MongoDB", value: "Recommended" },
      { name: "Node.js Application Developer (JSNAD)", provider: "OpenJS Foundation", value: "Growing" },
    ],
  },
  devops: {
    roleTitle: "DevOps / Cloud Engineer",
    trendingSkills: [
      { skill: "Kubernetes & Helm Charts", demand: "High" },
      { skill: "Terraform / OpenTofu (IaC)", demand: "High" },
      { skill: "GitOps (ArgoCD / Flux)", demand: "High" },
      { skill: "Platform Engineering / Internal Dev Platforms", demand: "Growing" },
      { skill: "FinOps / Cloud Cost Optimization", demand: "Growing" },
      { skill: "eBPF & Advanced Observability", demand: "Medium" },
    ],
    salaryRange: { entry: "6–12 LPA", mid: "15–30 LPA", senior: "30–65 LPA" },
    certifications: [
      { name: "CKA – Certified Kubernetes Administrator", provider: "CNCF", value: "High Demand" },
      { name: "AWS Solutions Architect – Professional", provider: "Amazon", value: "High ROI" },
      { name: "HashiCorp Certified: Terraform Associate", provider: "HashiCorp", value: "In-Demand" },
      { name: "Google Cloud Professional DevOps Engineer", provider: "Google Cloud", value: "Recommended" },
    ],
  },
  design: {
    roleTitle: "UI/UX Designer",
    trendingSkills: [
      { skill: "Figma (Advanced Prototyping)", demand: "High" },
      { skill: "Design Systems & Component Libraries", demand: "High" },
      { skill: "UX Research & Usability Testing", demand: "Growing" },
      { skill: "Motion Design & Micro-interactions", demand: "Growing" },
      { skill: "AI-Assisted Design (Midjourney, Galileo AI)", demand: "High" },
      { skill: "3D / Spline Design", demand: "Medium" },
    ],
    salaryRange: { entry: "3–7 LPA", mid: "8–18 LPA", senior: "18–40 LPA" },
    certifications: [
      { name: "Google UX Design Professional Certificate", provider: "Google / Coursera", value: "High ROI" },
      { name: "Interaction Design Foundation Membership", provider: "IDF", value: "Recommended" },
      { name: "Adobe Certified Professional", provider: "Adobe", value: "In-Demand" },
      { name: "Figma Advanced Design Systems", provider: "Figma / Designership", value: "Growing" },
    ],
  },
  marketing: {
    roleTitle: "Digital Marketing Specialist",
    trendingSkills: [
      { skill: "AI-Powered Marketing & Automation", demand: "High" },
      { skill: "SEO / Generative Engine Optimization (GEO)", demand: "High" },
      { skill: "Performance Marketing (Meta, Google Ads)", demand: "High" },
      { skill: "Marketing Analytics & Attribution", demand: "Growing" },
      { skill: "Short-form Video Content Strategy", demand: "Growing" },
      { skill: "WhatsApp & Conversational Marketing", demand: "Medium" },
    ],
    salaryRange: { entry: "3–6 LPA", mid: "7–15 LPA", senior: "15–35 LPA" },
    certifications: [
      { name: "Google Analytics 4 Certification", provider: "Google", value: "High Demand" },
      { name: "Meta Blueprint Ads Certification", provider: "Meta", value: "In-Demand" },
      { name: "HubSpot Marketing Certification", provider: "HubSpot Academy", value: "High ROI" },
      { name: "Google Ads Search Certification", provider: "Google", value: "Recommended" },
    ],
  },
  general: {
    roleTitle: "Professional",
    trendingSkills: [
      { skill: "AI Tools (ChatGPT, Copilot, Gemini)", demand: "High" },
      { skill: "Data Literacy & Advanced Excel", demand: "High" },
      { skill: "Agile / Scrum Project Management", demand: "High" },
      { skill: "Business Communication & Presentation", demand: "Growing" },
      { skill: "Digital Collaboration (Notion, Jira, Slack)", demand: "Medium" },
      { skill: "Critical Thinking & Problem Solving", demand: "Growing" },
    ],
    salaryRange: { entry: "3–6 LPA", mid: "7–15 LPA", senior: "15–30 LPA" },
    certifications: [
      { name: "PMP – Project Management Professional", provider: "PMI", value: "High ROI" },
      { name: "Google Project Management Certificate", provider: "Google / Coursera", value: "Recommended" },
      { name: "Microsoft Office Specialist (MOS)", provider: "Microsoft", value: "In-Demand" },
      { name: "Certified Scrum Master (CSM)", provider: "Scrum Alliance", value: "Growing" },
    ],
  },
};

function detectDomain(skills: string[], title: string): string {
  const s = skills.map(x => x.toLowerCase()).join(" ");
  const t = title.toLowerCase();
  const combined = s + " " + t;
  if (/devops|cloud|kubernetes|docker|terraform|jenkins|sre|ansible|gitops|cicd|ci\/cd/i.test(combined)) return "devops";
  if (/machine.?learning|deep.?learning|tensorflow|pytorch|mlops|llm|genai|nlp|computer.?vision|ai engineer/i.test(combined)) return "ml";
  if (/data.?analyst|data.?engineer|data.?scientist|sql|power.?bi|tableau|spark|hadoop|databricks|bigquery|analytics/i.test(combined)) return "data";
  if (/python|pandas|numpy/i.test(combined) && /data|analytic|scientist/i.test(combined)) return "data";
  if (/react|vue|angular|next\.?js|svelte|frontend|html|css|javascript|typescript|ui developer|ux developer/i.test(combined)) return "frontend";
  if (/node|java |spring|django|flask|php|ruby|golang|go lang|backend|api developer|microservice|postgresql|mongodb/i.test(combined)) return "backend";
  if (/figma|sketch|adobe xd|ux research|ui design|product design|wireframe|design system/i.test(combined)) return "design";
  if (/seo|digital.?marketing|google.?ads|content.?market|social.?media|brand|growth.?hack|influencer/i.test(combined)) return "marketing";
  return "general";
}

function parseExpYears(total: string | null): number {
  if (!total) return 0;
  const m = total.match(/(\d+)\s*year/i);
  return m ? parseInt(m[1]) : 0;
}

function getExpTier(expType: string | null, total: string | null): "entry" | "mid" | "senior" {
  if (expType !== "experienced") return "entry";
  const yrs = parseExpYears(total);
  if (yrs >= 6) return "senior";
  if (yrs >= 2) return "mid";
  return "entry";
}

// ── Career Insights Page ───────────────────────────────────────────────────────
function InsightsPage() {
  const { profile } = useAuth();
  const [recommendedJobs, setRecommendedJobs] = useState<Array<{
    id: string; title: string; company: string; location: string; salary: string; match: number;
  }>>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  const skills = profile?.skills || [];
  const titleStr = profile?.current_title || "";
  const domain = detectDomain(skills, titleStr);
  const domainData = DOMAIN_MAP[domain];
  const tier = getExpTier(profile?.experience_type || null, profile?.total_experience || null);

  // Mark skills the user already has
  const trendingWithMatch = domainData.trendingSkills.map(item => ({
    ...item,
    youHaveIt: skills.some(s => item.skill.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(item.skill.split(" ")[0].toLowerCase())),
  }));

  // Salary info
  const tierLabel = tier === "entry" ? "Entry Level (0–2 yrs)" : tier === "mid" ? "Mid Level (2–6 yrs)" : "Senior Level (6+ yrs)";
  const marketRange = domainData.salaryRange[tier];
  const currentSalary = profile?.current_salary || null;
  const expectedSalary = profile?.expected_salary || null;

  // Fetch recommended jobs from DB based on user's skills + title
  useEffect(() => {
    if (!profile) { setLoadingJobs(false); return; }
    async function fetchJobs() {
      setLoadingJobs(true);
      const { data } = await supabase
        .from("jobs")
        .select("id, title, company_name, location, salary_min, salary_max, salary_type, skills, employment_type, status, deadline, deadline_time")
        .eq("status", "Active")
        .limit(30);

      if (data) {
        const visibleJobs = data.filter(job => isJobVisibleToSeekers(job));
        const userSkillsLower = skills.map(s => s.toLowerCase());
        const titleWords = titleStr.toLowerCase().split(/\s+/).filter(w => w.length > 3);

        const scored = visibleJobs.map(job => {
          const jobSkills: string[] = job.skills || [];
          const jobSkillsLower = jobSkills.map((s: string) => s.toLowerCase());

          // Skill overlap score (0–70)
          const overlap = userSkillsLower.filter(us =>
            jobSkillsLower.some(js => js.includes(us) || us.includes(js))
          ).length;
          const skillScore = jobSkills.length > 0
            ? Math.round((overlap / Math.max(jobSkills.length, skills.length, 1)) * 70)
            : 20;

          // Title similarity score (0–30)
          const jobTitleLower = job.title.toLowerCase();
          const titleScore = titleWords.some(w => jobTitleLower.includes(w)) ? 25 : 0;

          const match = Math.min(Math.max(skillScore + titleScore + 30, 40), 99);

          const salary = job.salary_min && job.salary_max
            ? `${job.salary_min}–${job.salary_max} LPA`
            : "Not disclosed";

          return {
            id: job.id,
            title: job.title,
            company: job.company_name,
            location: job.location || "India",
            salary,
            match,
          };
        })
          .sort((a, b) => b.match - a.match)
          .slice(0, 5);

        setRecommendedJobs(scored);
      }
      setLoadingJobs(false);
    }
    fetchJobs();
  }, [profile?.id]);

  const demandBadge = (d: DemandLevel) => {
    if (d === "High") return "bg-[#FF2B2B] text-white";
    if (d === "Growing") return "bg-green-100 text-green-800";
    return "bg-[#ECECF4] text-[#3A1F1F]";
  };

  const certBadge = (v: string) => {
    if (v === "High ROI" || v === "High Demand") return "bg-[#FF2B2B] text-white";
    if (v === "In-Demand") return "bg-orange-100 text-orange-700";
    if (v === "Growing") return "bg-green-100 text-green-800";
    return "bg-[#ECECF4] text-[#3A1F1F]";
  };

  const userName = profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() : "You";

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#3A1F1F]">Career Insights</h1>
        <p className="text-[#8A8A8A] mt-1">
          Personalized for <span className="text-[#FF2B2B] font-medium">{userName}</span>
          {domainData.roleTitle !== "Professional" && (
            <> · <span className="font-medium text-[#3A1F1F]">{domainData.roleTitle}</span></>
          )}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recommended Jobs */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-[#3A1F1F] mb-4 flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-[#FF2B2B]" /> Recommended Jobs
          </h3>
          {loadingJobs ? (
            <div className="flex items-center justify-center py-10 text-[#8A8A8A]">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Finding matches...
            </div>
          ) : recommendedJobs.length === 0 ? (
            <div className="text-center py-8 text-[#8A8A8A]">
              <Briefcase className="h-10 w-10 mx-auto mb-2 text-gray-200" />
              <p className="text-sm">No active job listings found. Check back soon!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recommendedJobs.map((job) => (
                <div key={job.id} className="p-4 bg-[#F6F6F6] rounded-xl hover:bg-[#ECECF4] transition-colors">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <h4 className="font-semibold text-[#3A1F1F] truncate">{job.title}</h4>
                      <p className="text-sm text-[#8A8A8A]">{job.company}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-[#8A8A8A]">
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>
                        <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{job.salary}</span>
                      </div>
                    </div>
                    <div className="text-center flex-shrink-0">
                      <div className={`text-sm font-bold rounded-xl px-2 py-1 ${job.match >= 75 ? "bg-green-100 text-green-700" : job.match >= 55 ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600"}`}>
                        {job.match}%
                      </div>
                      <div className="text-xs text-[#8A8A8A] mt-0.5">match</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Trending Skills */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-[#3A1F1F] mb-1 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-[#FF2B2B]" /> Trending Skills
          </h3>
          <p className="text-xs text-[#8A8A8A] mb-4">
            Based on your {domain === "general" ? "profile" : `${domainData.roleTitle} role`}
            {skills.length > 0 && ` & ${skills.length} skills`}
          </p>
          <div className="space-y-2.5">
            {trendingWithMatch.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-[#F6F6F6] rounded-xl">
                <div className="flex items-center gap-2 min-w-0">
                  {item.youHaveIt && (
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" title="You already have this skill" />
                  )}
                  <span className={`text-sm truncate ${item.youHaveIt ? "text-green-700 font-medium" : "text-[#3A1F1F]"}`}>{item.skill}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {item.youHaveIt && <span className="text-xs text-green-600">You have it</span>}
                  <Badge className={`text-xs ${demandBadge(item.demand)}`}>{item.demand}</Badge>
                </div>
              </div>
            ))}
          </div>
          {skills.length === 0 && (
            <p className="text-xs text-[#8A8A8A] mt-3 text-center">Add skills to your profile to see personalized matches.</p>
          )}
        </div>

        {/* Salary Insights */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-[#3A1F1F] mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-[#FF2B2B]" /> Salary Insights
          </h3>
          <div className="space-y-3">
            <div className="p-4 bg-[#F6F6F6] rounded-xl">
              <p className="text-xs text-[#8A8A8A] mb-1">Market Range · {tierLabel}</p>
              <p className="text-sm text-[#8A8A8A] mb-0.5">For {domainData.roleTitle}</p>
              <p className="text-2xl font-bold text-[#3A1F1F]">{marketRange}</p>
            </div>
            {currentSalary && (
              <div className="p-4 bg-[#F6F6F6] rounded-xl">
                <p className="text-xs text-[#8A8A8A] mb-1">Your Current Salary</p>
                <p className="text-2xl font-bold text-[#FF2B2B]">{currentSalary}</p>
              </div>
            )}
            {expectedSalary && (
              <div className="p-4 bg-green-50 border border-green-100 rounded-xl">
                <p className="text-xs text-[#8A8A8A] mb-1">Your Expected Salary</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-green-700">{expectedSalary}</p>
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
              </div>
            )}
            <div className="p-3 bg-blue-50 rounded-xl">
              <p className="text-xs text-blue-700">
                <span className="font-semibold">Tip:</span> {tier === "entry"
                  ? "Build 2–3 strong portfolio projects to command higher packages."
                  : tier === "mid"
                  ? "Upskill to the trending technologies above to unlock the next salary bracket."
                  : "Consider leadership roles or specialized expertise for maximum compensation."}
              </p>
            </div>
          </div>
        </div>

        {/* Suggested Certifications */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-[#3A1F1F] mb-1 flex items-center gap-2">
            <Award className="h-5 w-5 text-[#FF2B2B]" /> Suggested Certifications
          </h3>
          <p className="text-xs text-[#8A8A8A] mb-4">Tailored for your domain and experience level</p>
          <div className="space-y-3">
            {domainData.certifications.map((cert, i) => (
              <div key={i} className="p-4 bg-[#F6F6F6] rounded-xl">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-semibold text-[#3A1F1F] text-sm leading-snug">{cert.name}</h4>
                    <p className="text-xs text-[#8A8A8A] mt-0.5">{cert.provider}</p>
                  </div>
                  <Badge className={`text-xs flex-shrink-0 ${certBadge(cert.value)}`}>{cert.value}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
