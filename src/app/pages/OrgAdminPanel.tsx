import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { supabase, type RecruiterArticle, type Job } from "../../lib/supabase";
import { useAuth } from "../../lib/auth-context";
import { isJobExpired } from "../../lib/jobs";
import logoImage from "../../logo/logo.png";
import {
  Users, UserX, UserCheck, Crown, Building2, Mail, Briefcase,
  BarChart2, Plus, MoreVertical, Loader2, X, CheckCircle,
  Clock, ArrowLeft, LogOut, Shield, RefreshCw, Send,
  LayoutGrid, TrendingUp, CreditCard, Download, ArrowRight,
  BookOpen, Edit3, Trash2, Eye, EyeOff, Tag, Image as ImageIcon,
  Search, Filter, ExternalLink, FileText, Upload, ShieldAlert,
} from "lucide-react";
import {
  calculateRecruiterCompletion,
  RECRUITER_MIN_COMPLETION_THRESHOLD,
} from "../../lib/recruiterProfileCompletion";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { SafeHtml } from "../components/ui/safe-html";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "../components/ui/pagination";

// ─── Types ───────────────────────────────────────────────────────────────────

type OrgMember = {
  id: string;
  email: string;
  recruiter_name: string | null;
  org_role: string;
  is_active: boolean;
  verification_status: string | null;
  last_login_at: string | null;
  jobs_count: number;
  applications_count: number;
  hires_count: number;
  created_at: string;
  resumes_used: number;
  keywords_used: number;
  profiles_viewed: number;
};

type OrgInvitation = {
  id: string;
  invited_email: string;
  role: string;
  status: string;
  created_at: string;
  expires_at: string;
};

type OrgJob = {
  id: string;
  title: string;
  status: string;
  recruiter_id: string;
  company_name: string;
  location: string | null;
  created_at: string;
  deadline: string | null;
  deadline_time?: string | null;
  views: number | null;
  openings: number;
  recruiter_name: string;
};

type OrgApplication = {
  id: string;
  job_id: string;
  profile_id: string;
  recruiter_id: string;
  status: string;
  applied_at: string;
  job_title: string;
  candidate_name: string;
  recruiter_name: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function initials(name: string | null, email: string) {
  const src = name || email;
  return src.slice(0, 2).toUpperCase();
}

const STATUS_COLOR: Record<string, string> = {
  Active: "bg-green-100 text-green-700",
  Paused: "bg-yellow-100 text-yellow-700",
  Closed: "bg-gray-100 text-gray-500",
  Expired: "bg-red-100 text-red-600",
};

const ACTIVITY_WINDOW_MS = 24 * 60 * 60 * 1000;

function hasSignedInRecently(lastLoginAt: string | null | undefined) {
  if (!lastLoginAt) return false;
  const seen = new Date(lastLoginAt).getTime();
  return !isNaN(seen) && Date.now() - seen <= ACTIVITY_WINDOW_MS;
}

function memberStatusBadge(member: OrgMember, currentUserId?: string) {
  if (member.verification_status === "Rejected") {
    return { label: "Rejected", className: "bg-red-100 text-red-700" };
  }
  if (member.verification_status && member.verification_status !== "Verified") {
    return { label: "Pending Approval", className: "bg-yellow-100 text-yellow-700" };
  }
  const isOnlineRecently = (currentUserId && member.id === currentUserId) || hasSignedInRecently(member.last_login_at);
  return member.is_active && isOnlineRecently
    ? { label: "Active", className: "bg-green-100 text-green-700" }
    : { label: "Inactive", className: "bg-gray-100 text-gray-500" };
}

const APP_STATUS_COLOR: Record<string, string> = {
  Applied: "bg-blue-100 text-blue-700",
  "Under Review": "bg-purple-100 text-purple-700",
  Shortlisted: "bg-indigo-100 text-indigo-700",
  "Interview Scheduled": "bg-yellow-100 text-yellow-700",
  "Offered": "bg-orange-100 text-orange-700",
  Joined: "bg-green-100 text-green-700",
  Hired: "bg-green-100 text-green-700",
  Rejected: "bg-red-100 text-red-600",
  "On Hold": "bg-gray-100 text-gray-500",
};

/** Default blog category used when creating a new blog. */
const DEFAULT_BLOG_CATEGORY = "Career Advice";

/** Average reading speed for blog read-time estimation. */
const WORDS_PER_MINUTE = 200;

/** Strip HTML tags from user input as a basic XSS defense-in-depth measure. */
const stripHtmlTags = (input: string): string => input.replace(/<[^>]*>/g, "");

/** Validate that a URL string is a valid HTTP(S) URL. Returns the URL or null. */
const sanitizeUrl = (url: string): string | null => {
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("data:image/")) return trimmed;
  try {
    const parsed = new URL(trimmed);
    return ["http:", "https:"].includes(parsed.protocol) ? trimmed : null;
  } catch {
    return null;
  }
};

// Memory cache to prevent reloading flicker when navigating back to OrgAdminPanel
let orgCache: {
  members: OrgMember[];
  invitations: OrgInvitation[];
  teamJobs: OrgJob[];
  teamApps: OrgApplication[];
  activeSub: any | null;
} | null = null;

export default function OrgAdminPanel() {
  const navigate = useNavigate();
  const { memberId, jobId } = useParams<{ memberId: string; jobId: string }>();
  const { user, recruiterProfile, isOrgAdmin, loading: authLoading, signOut } = useAuth();
  const initialMountRef = useRef(true);

  const profileCompletion = useMemo(() => {
    return calculateRecruiterCompletion(recruiterProfile, null, false);
  }, [recruiterProfile]);
  const canPostBlog = profileCompletion.isEligible;
  const blogCompletionScore = profileCompletion.score;

  const [activeTab, setActiveTab] = useState("overview");
  const [members, setMembers] = useState<OrgMember[]>(orgCache?.members || []);
  const [invitations, setInvitations] = useState<OrgInvitation[]>(orgCache?.invitations || []);
  const [teamJobs, setTeamJobs] = useState<OrgJob[]>(orgCache?.teamJobs || []);
  const [teamApps, setTeamApps] = useState<OrgApplication[]>(orgCache?.teamApps || []);
  const [activeSub, setActiveSub] = useState<any | null>(orgCache?.activeSub || null);
  const [dataLoading, setDataLoading] = useState(!orgCache);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState(false);

  // Filters & Pagination
  const [jobSearch, setJobSearch] = useState("");
  const [appStatusFilter, setAppStatusFilter] = useState("all");
  const [jobPage, setJobPage] = useState(1);
  const [appPage, setAppPage] = useState(1);
  const JOBS_PER_PAGE = 10;
  const APPS_PER_PAGE = 10;

  // Reset job page when search filter changes
  useEffect(() => {
    setJobPage(1);
  }, [jobSearch]);

  // Reset app page when status filter changes
  useEffect(() => {
    setAppPage(1);
  }, [appStatusFilter]);

  // Blog Management State
  const [teamBlogs, setTeamBlogs] = useState<RecruiterArticle[]>([]);
  const [blogModalOpen, setBlogModalOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<RecruiterArticle | null>(null);
  const [blogTitle, setBlogTitle] = useState("");
  const [blogCategory, setBlogCategory] = useState(DEFAULT_BLOG_CATEGORY);
  const [blogTags, setBlogTags] = useState("");
  const [blogCoverUrl, setBlogCoverUrl] = useState("");
  const [blogCoverName, setBlogCoverName] = useState("");
  const [blogSummary, setBlogSummary] = useState("");
  const [blogContent, setBlogContent] = useState("");
  const [blogStatus, setBlogStatus] = useState<"Published" | "Draft">("Published");
  const [blogSaving, setBlogSaving] = useState(false);
  const [blogError, setBlogError] = useState("");
  const [blogSearchQuery, setBlogSearchQuery] = useState("");
  const [discardBlogConfirmOpen, setDiscardBlogConfirmOpen] = useState(false);
  const blogFormSnapshotRef = useRef<Record<string, unknown>>({});
  // Analytics and Subscription Usage list every member with no way to find
  // one; both tables are driven by this.
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [blogStatusFilter, setBlogStatusFilter] = useState<"all" | "Published" | "Draft">("all");
  const [deleteBlogId, setDeleteBlogId] = useState<string | null>(null);
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);
  const [removeMemberError, setRemoveMemberError] = useState("");

  // Recruiter Details & Keywords dialog
  const [selectedMember, setSelectedMember] = useState<OrgMember | null>(null);
  const [memberKeywords, setMemberKeywords] = useState<{ keyword: string; created_at: string }[]>([]);
  const [keywordsLoading, setKeywordsLoading] = useState(false);

  // Fetch search keywords for a recruiter. This used to merge in
  // localStorage under `search_keywords_${memberId}` as a "fallback" — but
  // that key only ever exists in the searching recruiter's own browser, so
  // an admin viewing a team member's history from a different device could
  // never see it anyway. It was masking a real 403 (missing GRANT on this
  // table, fixed in recruiter_search_keywords_grants_fix.sql) behind what
  // looked like just-empty-for-this-member data.
  const fetchMemberKeywords = async (memberId: string) => {
    setKeywordsLoading(true);
    try {
      const { data, error } = await supabase
        .from("recruiter_search_keywords")
        .select("keyword, created_at")
        .eq("recruiter_id", memberId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching keywords from DB:", error);
        setMemberKeywords([]);
      } else {
        setMemberKeywords(data || []);
      }
    } catch (err) {
      console.error("Error in fetchMemberKeywords:", err);
      setMemberKeywords([]);
    } finally {
      setKeywordsLoading(false);
    }
  };

  const handleMemberClick = (member: OrgMember) => {
    window.open(`/recruiter/admin/member/${member.id}`, "_blank");
  };

  const handleJobClick = (job: OrgJob) => {
    window.open(`/recruiter/admin/job/${job.id}`, "_blank");
  };

  const handleApplicationClick = (app: OrgApplication) => {
    window.open(`/recruiter/applicant/${app.id}/profile`, "_blank");
  };

  // If memberId is present, auto-fetch details once members load
  useEffect(() => {
    if (memberId && members.length > 0) {
      const member = members.find(m => m.id === memberId);
      if (member) {
        setSelectedMember(member);
        fetchMemberKeywords(member.id);
      }
    }
  }, [memberId, members]);

  // Job detail (deep-linked): the jobs/applications list only carries the
  // columns the table renders, so the full posting (description, skills,
  // salary, etc.) is fetched separately once a job is opened.
  const [jobDetail, setJobDetail] = useState<Job | null>(null);
  const [jobDetailLoading, setJobDetailLoading] = useState(false);

  useEffect(() => {
    if (!jobId) {
      setJobDetail(null);
      return;
    }
    let cancelled = false;
    setJobDetailLoading(true);
    supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) {
          setJobDetail((data as Job) || null);
          setJobDetailLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [jobId]);

  // Export recruiter usage data to CSV (Excel compatible with standard flat tabular layout)
  const exportMemberToExcel = (member: OrgMember, keywords: { keyword: string; created_at: string }[]) => {
    const clean = (val: string | number | null | undefined) => `"${String(val ?? "").replace(/"/g, '""')}"`;

    const formatDateDMY = (dateInput: string | Date) => {
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return "—";
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    };

    const formatTime = (dateInput: string | Date) => {
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return "—";
      return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    };

    const rows: string[] = [];

    // Title header banner
    const recruiterDisplayName = (member.recruiter_name || member.email).toUpperCase();
    rows.push([clean(`RECRUITER USAGE & SEARCH ANALYTICS REPORT - ${recruiterDisplayName}`)].join(","));

    // Flat Column Headers (matching standard business Excel reports)
    rows.push([
      clean("SL.No."),
      clean("RECRUITER_NAME"),
      clean("EMAIL_ADDRESS"),
      clean("ROLE"),
      clean("STATUS"),
      clean("SEARCH_KEYWORD"),
      clean("SEARCH_DATE"),
      clean("SEARCH_TIME"),
      clean("PROFILES_VIEWED"),
      clean("RESUMES_DOWNLOADED"),
      clean("JOBS_POSTED"),
      clean("TOTAL_SEARCHES"),
    ].join(","));

    if (keywords.length === 0) {
      // If no search logs, output the member's profile & usage row with placeholder for search keyword
      rows.push([
        clean(1),
        clean(member.recruiter_name || "(No name)"),
        clean(member.email),
        clean(member.org_role),
        clean(memberStatusBadge(member).label),
        clean("—"),
        clean(formatDateDMY(member.created_at)),
        clean("—"),
        clean(member.profiles_viewed || 0),
        clean(member.resumes_used || 0),
        clean(member.jobs_count || 0),
        clean(member.keywords_used || 0),
      ].join(","));
    } else {
      // Output each search keyword entry as a standard line item
      keywords.forEach((log, index) => {
        rows.push([
          clean(index + 1),
          clean(member.recruiter_name || "(No name)"),
          clean(member.email),
          clean(member.org_role),
          clean(memberStatusBadge(member).label),
          clean(log.keyword),
          clean(formatDateDMY(log.created_at)),
          clean(formatTime(log.created_at)),
          clean(member.profiles_viewed || 0),
          clean(member.resumes_used || 0),
          clean(member.jobs_count || 0),
          clean(member.keywords_used || keywords.length),
        ].join(","));
      });
    }

    const csvContent = "\ufeff" + rows.join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const filename = `${(member.recruiter_name || "recruiter").replace(/\s+/g, "_")}_usage_report.csv`;
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  // Auth guard
  useEffect(() => {
    if (authLoading) return;
    if (!user || !isOrgAdmin) {
      navigate("/recruiter/dashboard", { replace: true });
    }
  }, [authLoading, user, isOrgAdmin, navigate]);

  // ── Data fetching ───────────────────────────────────────────

  const loadData = useCallback(async (silent = false) => {
    if (!user || !recruiterProfile) return;
    if (!silent) setDataLoading(true);
    try {
      // Fetch active subscription
      const { data: subData } = await supabase
        .from("recruiter_subscriptions")
        .select("*")
        .eq("recruiter_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setActiveSub(subData);

      // Members + stats via security-definer function
      const { data: membersData } = await supabase.rpc(
        "get_org_members_with_stats",
        { p_admin_id: user.id }
      );
      let membersList: OrgMember[] = membersData || [];

      // Fetch last_login_at for accurate 24-hour activity check
      const memberIds = membersList.map(m => m.id);
      if (memberIds.length > 0) {
        const { data: profileLogins } = await supabase
          .from("recruiter_profiles")
          .select("id, last_login_at")
          .in("id", memberIds);

        const loginMap = new Map((profileLogins || []).map(p => [p.id, p.last_login_at]));
        membersList = membersList.map(m => ({
          ...m,
          last_login_at: m.id === user.id
            ? (loginMap.get(m.id) || recruiterProfile?.last_login_at || new Date().toISOString())
            : (loginMap.get(m.id) ?? m.last_login_at ?? null),
        }));
      }

      setMembers(membersList);

      // Build recruiter name map
      const nameMap: Record<string, string> = {};
      membersList.forEach(m => { nameMap[m.id] = m.recruiter_name || m.email; });
      nameMap[user.id] = recruiterProfile.recruiter_name || recruiterProfile.email;

      // Pending invitations
      const { data: invData } = await supabase
        .from("recruiter_invitations")
        .select("id, invited_email, role, status, created_at, expires_at")
        .eq("org_admin_id", user.id)
        .order("created_at", { ascending: false });
      setInvitations(invData || []);

      // All team jobs
      const allIds = Array.from(
        new Set(
          [user.id, recruiterProfile?.id, ...membersList.map(m => m.id)]
            .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
        )
      );
      const { data: jobsData } = await supabase
        .from("jobs")
        .select("id, title, status, recruiter_id, company_name, location, created_at, deadline, deadline_time, views, openings")
        .in("recruiter_id", allIds)
        .order("created_at", { ascending: false });
      const mappedJobs = (jobsData || []).map(j => ({
        ...j,
        recruiter_name: nameMap[j.recruiter_id] || "Unknown",
      }));
      setTeamJobs(mappedJobs);

      // All team applications (capped at 500)
      const { data: appsData } = await supabase
        .from("applications")
        .select(`
          id, job_id, profile_id, recruiter_id, status, applied_at,
          job:jobs!job_id(title),
          profile:profiles!profile_id(first_name, last_name, email)
        `)
        .in("recruiter_id", allIds)
        .order("applied_at", { ascending: false })
        .limit(500);

      const mappedApps = (appsData || []).map((a: any) => ({
        id: a.id,
        job_id: a.job_id,
        profile_id: a.profile_id,
        recruiter_id: a.recruiter_id,
        status: a.status,
        applied_at: a.applied_at,
        job_title: a.job?.title || "Unknown Job",
        candidate_name: a.profile
          ? `${a.profile.first_name || ""} ${a.profile.last_name || ""}`.trim() || a.profile.email
          : "Unknown",
        recruiter_name: nameMap[a.recruiter_id] || "Unknown",
      }));
      setTeamApps(mappedApps);

      // Fetch org-scoped blogs from the `blogs` table (exclude platform / Super Admin seed blogs)
      const { data: blogsData } = await supabase
        .from("blogs")
        .select("*")
        .order("created_at", { ascending: false });

      const SEED_OR_PLATFORM_TITLES = new Set([
        "building a strong employer brand for better hiring",
        "why remote work continues to grow in 2026",
        "top interview mistakes candidates should avoid",
        "how companies are adapting to hiring challenges",
        "how to make your resume stand out in 2026",
        "10 proven strategies to attract and hire top software engineers",
        "5 interview tips every job seeker should know",
        "how to build a strong employer brand to attract top talent",
      ]);

      const orgBlogs = ((blogsData || []) as any[]).filter((blog) => {
        const cleanTitle = (blog.title || "").trim().toLowerCase();
        if (SEED_OR_PLATFORM_TITLES.has(cleanTitle)) return false;
        if (blog.author_name === "RhirePro Editorial") return false;

        if (blog.author_id && allIds.includes(blog.author_id)) return true;
        if (blog.org_id && (blog.org_id === recruiterProfile?.org_id || blog.org_id === recruiterProfile?.id || blog.org_id === user.id)) return true;
        
        // Fallback for blogs created by this org admin when author_id is null
        if (blog.author_name && recruiterProfile && (
          blog.author_name === recruiterProfile.recruiter_name ||
          blog.author_name === recruiterProfile.company_name ||
          blog.author_name === "Org Admin"
        )) {
          return true;
        }

        return false;
      });

      setTeamBlogs(orgBlogs);

      // Cache the loaded data
      orgCache = {
        members: membersList,
        invitations: invData || [],
        teamJobs: mappedJobs,
        teamApps: mappedApps,
        activeSub: subData,
      };
    } finally {
      if (!silent) setDataLoading(false);
    }
  }, [user, recruiterProfile]);

  // ── Blog Actions ───────────────────────────────────────────

  const handleOpenCreateBlog = () => {
    if (!canPostBlog) {
      toast.error(`Profile completion is currently at ${blogCompletionScore}%. A minimum of 60% completion is required to create and publish blogs.`);
      navigate("/recruiter/dashboard/company-profile");
      return;
    }
    setEditingBlog(null);
    setBlogTitle("");
    setBlogCategory(DEFAULT_BLOG_CATEGORY);
    setBlogTags("");
    setBlogCoverUrl("");
    setBlogCoverName("");
    setBlogSummary("");
    setBlogContent("");
    setBlogStatus("Published");
    setBlogError("");
    blogFormSnapshotRef.current = {
      title: "", category: DEFAULT_BLOG_CATEGORY, tags: "", coverUrl: "",
      summary: "", content: "", status: "Published",
    };
    setBlogModalOpen(true);
  };

  const handleOpenEditBlog = (blog: RecruiterArticle) => {
    setEditingBlog(blog);
    const title = blog.title || "";
    const category = blog.category || DEFAULT_BLOG_CATEGORY;
    const tags = Array.isArray(blog.tags) ? blog.tags.join(", ") : "";
    const coverUrl = blog.cover_image_url || "";
    const summary = blog.summary || "";
    const content = blog.content || "";
    const status = blog.status || "Published";
    setBlogTitle(title);
    setBlogCategory(category);
    setBlogTags(tags);
    setBlogCoverUrl(coverUrl);
    setBlogCoverName(blog.cover_image_name || (blog.cover_image_url ? "Cover image" : ""));
    setBlogSummary(summary);
    setBlogContent(content);
    setBlogStatus(status);
    setBlogError("");
    blogFormSnapshotRef.current = { title, category, tags, coverUrl, summary, content, status };
    setBlogModalOpen(true);
  };

  // A stray click on the overlay or the Cancel button used to close the
  // dialog immediately, silently discarding whatever was typed. Now it only
  // closes outright when the form still matches what it was opened with;
  // otherwise it asks for confirmation first.
  const hasUnsavedBlogChanges = () => {
    const current = {
      title: blogTitle, category: blogCategory, tags: blogTags, coverUrl: blogCoverUrl,
      summary: blogSummary, content: blogContent, status: blogStatus,
    };
    return JSON.stringify(current) !== JSON.stringify(blogFormSnapshotRef.current);
  };

  const requestCloseBlogModal = () => {
    if (hasUnsavedBlogChanges()) {
      setDiscardBlogConfirmOpen(true);
    } else {
      setBlogModalOpen(false);
    }
  };

  const handleBlogImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setBlogCoverName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setBlogCoverUrl(typeof reader.result === "string" ? reader.result : "");
    };
    reader.readAsDataURL(file);
    event.currentTarget.value = "";
  };

  const handleRemoveBlogCoverImage = () => {
    setBlogCoverUrl("");
    setBlogCoverName("");
  };

  const handleSaveBlog = useCallback(async () => {
    if (!canPostBlog) {
      const msg = `Profile completion is currently at ${blogCompletionScore}%. A minimum of 60% completion is required to publish blogs.`;
      setBlogError(msg);
      toast.error(msg);
      return;
    }
    if (!blogTitle.trim()) {
      setBlogError("Blog title is required.");
      return;
    }
    if (!blogSummary.trim()) {
      setBlogError("Blog summary is required.");
      return;
    }
    if (!blogCoverUrl.trim()) {
      setBlogError("Cover image is required. Please upload an image from your device.");
      return;
    }
    if (!blogContent.trim()) {
      setBlogError("Blog content is required.");
      return;
    }

    setBlogSaving(true);
    setBlogError("");

    try {
      const userTags = blogTags
        .split(",")
        .map(t => stripHtmlTags(t.trim()))
        .filter(Boolean);
      const tagsArray = Array.from(new Set(["Blog", ...userTags]));

      const sanitizedTitle = stripHtmlTags(blogTitle.trim());
      const sanitizedContent = stripHtmlTags(blogContent.trim());
      const sanitizedSummary = stripHtmlTags(blogSummary.trim()) || null;
      const sanitizedCoverUrl = sanitizeUrl(blogCoverUrl);
      const calcReadTime = Math.max(1, Math.ceil(sanitizedContent.split(/\s+/).length / WORDS_PER_MINUTE));

      let error: any = null;

      const blogPayload: Record<string, any> = {
        title: sanitizedTitle,
        category: blogCategory,
        tags: tagsArray,
        summary: sanitizedSummary,
        content: sanitizedContent,
        cover_image_url: sanitizedCoverUrl,
        cover_image_name: blogCoverName || null,
        status: blogStatus,
        read_time: calcReadTime,
        author_id: user?.id || null,
        author_name: recruiterProfile?.company_name || recruiterProfile?.recruiter_name || "Org Admin",
        published_at: blogStatus === "Published" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      if (editingBlog) {
        let res = await supabase
          .from("blogs")
          .update(blogPayload)
          .eq("id", editingBlog.id);
        if (res.error && (res.error.code === "23503" || res.error.message?.includes("foreign key constraint"))) {
          res = await supabase
            .from("blogs")
            .update({ ...blogPayload, author_id: null })
            .eq("id", editingBlog.id);
        }
        error = res.error;
      } else {
        let res = await supabase
          .from("blogs")
          .insert([blogPayload]);
        if (res.error && (res.error.code === "23503" || res.error.message?.includes("foreign key constraint"))) {
          res = await supabase
            .from("blogs")
            .insert([{ ...blogPayload, author_id: null }]);
        }
        error = res.error;
      }

      if (error) throw error;

      setBlogModalOpen(false);
      await loadData(true);
    } catch (err: any) {
      setBlogError(err.message || "Failed to save blog.");
    } finally {
      setBlogSaving(false);
    }
  }, [canPostBlog, blogCompletionScore, blogTitle, blogContent, blogTags, blogCategory, blogSummary, blogCoverUrl, blogStatus, user?.id, recruiterProfile?.recruiter_name, recruiterProfile?.company_name, editingBlog, loadData]);

  const handleTogglePublishStatus = useCallback(async (blog: RecruiterArticle) => {
    const newStatus = blog.status === "Published" ? "Draft" : "Published";
    if (newStatus === "Published" && !canPostBlog) {
      toast.error(`Profile completion is currently at ${blogCompletionScore}%. A minimum of 60% completion is required to publish blogs.`);
      return;
    }
    try {
      await supabase
        .from("blogs")
        .update({
          status: newStatus,
          published_at: newStatus === "Published" ? new Date().toISOString() : blog.published_at,
          updated_at: new Date().toISOString(),
        })
        .eq("id", blog.id);

      await loadData(true);
    } catch (err) {
      console.error("Failed to toggle status", err);
    }
  }, [canPostBlog, blogCompletionScore, loadData]);

  const handleDeleteBlog = useCallback(async (blogId: string) => {
    try {
      const { error } = await supabase.from("blogs").delete().eq("id", blogId);
      if (error) throw error;
      setDeleteBlogId(null);
      await loadData(true);
    } catch (err: any) {
      console.error("Failed to delete blog", err);
      toast.error("Failed to delete blog", { description: err?.message || "Please try again." });
    }
  }, [loadData]);

  useEffect(() => {
    if (user && recruiterProfile && isOrgAdmin) {
      loadData(!!orgCache);
    }
  }, [user, recruiterProfile, isOrgAdmin, loadData]);

  useEffect(() => {
    if (initialMountRef.current) {
      initialMountRef.current = false;
      return;
    }
    if (user && recruiterProfile && isOrgAdmin) {
      loadData(true);
    }
  }, [activeTab, user, recruiterProfile, isOrgAdmin, loadData]);

  // ── Invite handler ──────────────────────────────────────────

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !user || !recruiterProfile) return;
    setInviteLoading(true);
    setInviteError("");
    try {
      const seatsUsed = members.filter(m => m.is_active).length;
      const maxSeats = recruiterProfile.max_seats || 5;
      const pending = invitations.find(
        i => i.invited_email === inviteEmail.trim().toLowerCase() && i.status === "pending"
      );
      if (pending) {
        setInviteError("A pending invitation already exists for this email.");
        return;
      }
      // Pending invites reserve a seat too — if this weren't counted, an
      // admin could send more invites than they have seats for, and end up
      // over the limit the moment more than maxSeats of them get accepted.
      const pendingCount = invitations.filter(i => i.status === "pending").length;
      if (seatsUsed + pendingCount >= maxSeats) {
        setInviteError(
          pendingCount > 0
            ? `Seat limit reached (${maxSeats} seats — ${seatsUsed} used, ${pendingCount} pending). Wait for a pending invite to be used or revoke one before sending another.`
            : `Seat limit reached (${maxSeats} seats). Upgrade your plan to add more.`
        );
        return;
      }

      const adminDomain = recruiterProfile.email?.split("@")[1]?.toLowerCase();
      const inviteDomain = inviteEmail.trim().split("@")[1]?.toLowerCase();
      if (!adminDomain || !inviteDomain || adminDomain !== inviteDomain) {
        setInviteError(`You can only invite members with a matching email domain (@${adminDomain || ""}).`);
        return;
      }

      const res = await fetch("/api/send-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_admin_id: user.id,
          company_name: recruiterProfile.company_name || "",
          invited_email: inviteEmail.trim().toLowerCase(),
          invited_by_name:
            recruiterProfile.recruiter_name || recruiterProfile.company_name || "Admin",
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to send invitation" }));
        throw new Error(err.error || "Failed to send invitation");
      }

      setInviteSuccess(true);
      setInviteEmail("");
      await loadData();
      setTimeout(() => {
        setInviteSuccess(false);
        setInviteOpen(false);
      }, 2500);
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : "Failed to send invitation");
    } finally {
      setInviteLoading(false);
    }
  };

  // ── Member actions ──────────────────────────────────────────

  const handleMemberAction = async (
    memberId: string,
    action: "deactivate" | "activate" | "approve"
  ) => {
    setActionLoading(memberId);
    try {
      if (action === "deactivate") {
        await supabase.from("recruiter_profiles").update({ is_active: false }).eq("id", memberId);
      } else if (action === "activate") {
        await supabase.from("recruiter_profiles").update({ is_active: true }).eq("id", memberId);
      } else {
        // A member you invited yourself shouldn't need a separate Super Admin
        // approval — this clears a Pending/Rejected verification_status the
        // same way Super Admin's own Approve action does. The "Org admins
        // update member profiles" RLS policy (org_admin_id = auth.uid())
        // already permits this write on your own team's rows.
        await supabase.from("recruiter_profiles").update({
          verification_status: "Verified",
          verified_at: new Date().toISOString(),
          rejection_reason: null,
          rejected_at: null,
          rejected_by: null,
        }).eq("id", memberId);
      }
      await loadData();
    } finally {
      setActionLoading(null);
    }
  };

  // Removing a member deletes their account entirely (not just an org
  // unlink) — they never signed up as an independent user, so leaving the
  // account behind would let them keep using the platform for free under
  // data that belonged to this org. This is irreversible, hence the
  // confirmation dialog before it's ever called.
  const handleRemoveMember = async (memberIdToRemove: string) => {
    setActionLoading(memberIdToRemove);
    setRemoveMemberError("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch("/api/org-remove-member", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ member_id: memberIdToRemove }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to remove member" }));
        throw new Error(err.error || "Failed to remove member");
      }
      setRemoveMemberId(null);
      await loadData();
    } catch (err: unknown) {
      setRemoveMemberError(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeInvitation = async (inviteId: string) => {
    setActionLoading(inviteId);
    try {
      const { error } = await supabase
        .from("recruiter_invitations")
        .update({ status: "revoked" })
        .eq("id", inviteId);
      if (error) throw error;
      toast.success("Invitation revoked successfully");
      await loadData();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to revoke invitation";
      toast.error(errMsg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // ── Derived stats ───────────────────────────────────────────

  const activeMembersCount = members.filter(m => memberStatusBadge(m, user?.id).label === "Active").length;
  const activeCount = activeMembersCount;
  const seatsUsed = members.filter(m => m.is_active).length;
  const maxSeats = recruiterProfile?.max_seats || 5;
  const seatPct = Math.min((seatsUsed / maxSeats) * 100, 100);
  const pendingInvitations = invitations.filter(i => i.status === "pending");
  const companyInitials = (recruiterProfile?.company_name || "RC")
    .split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const filteredJobs = useMemo(() => teamJobs.filter(j =>
    !jobSearch ||
    j.title.toLowerCase().includes(jobSearch.toLowerCase()) ||
    j.recruiter_name.toLowerCase().includes(jobSearch.toLowerCase())
  ), [teamJobs, jobSearch]);

  const totalJobPages = Math.max(1, Math.ceil(filteredJobs.length / JOBS_PER_PAGE));
  const paginatedJobs = useMemo(() => {
    const start = (jobPage - 1) * JOBS_PER_PAGE;
    return filteredJobs.slice(start, start + JOBS_PER_PAGE);
  }, [filteredJobs, jobPage]);

  const filteredApps = useMemo(() => teamApps.filter(a =>
    appStatusFilter === "all" || a.status === appStatusFilter
  ), [teamApps, appStatusFilter]);

  const totalAppPages = Math.max(1, Math.ceil(filteredApps.length / APPS_PER_PAGE));
  const paginatedApps = useMemo(() => {
    const start = (appPage - 1) * APPS_PER_PAGE;
    return filteredApps.slice(start, start + APPS_PER_PAGE);
  }, [teamApps, appStatusFilter, filteredApps, appPage]);

  const filteredBlogs = useMemo(() => teamBlogs.filter(blog => {
    const matchesStatus = blogStatusFilter === "all" || blog.status === blogStatusFilter;
    const q = blogSearchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      blog.title.toLowerCase().includes(q) ||
      blog.category.toLowerCase().includes(q) ||
      (Array.isArray(blog.tags) && blog.tags.some(t => t.toLowerCase().includes(q)));
    return matchesStatus && matchesSearch;
  }), [teamBlogs, blogStatusFilter, blogSearchQuery]);

  /*
   * Overview KPIs come from the database rather than from teamApps.
   *
   * teamApps is fetched with .limit(500) for the applications table below. One
   * org already has 996 distinct candidates, so deriving "Total Candidates"
   * from that list reported a truncated figure — and because the cap is applied
   * before the DISTINCT, it was not even a stable undercount. The RPC counts
   * server side and is scoped to the calling admin's own team.
   */
  const [serverKpis, setServerKpis] = useState<{
    total_recruiters: number; active_recruiters: number;
    total_jobs: number; active_jobs: number; closed_jobs: number;
    total_candidates: number; applications_today: number;
    interviews_scheduled: number; offers_released: number; successful_hires: number;
  } | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    void supabase.rpc("org_admin_overview_kpis").maybeSingle().then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        console.warn("Overview KPIs unavailable, falling back to loaded rows:", error.message);
        return;
      }
      if (data) setServerKpis(data as typeof serverKpis);
    });
    return () => { cancelled = true; };
  }, [user?.id]);

  // Fallback keeps the tab populated if the RPC has not been run against this
  // database yet; it carries the old truncation, which is still better than
  // blank tiles.
  const todayStr = new Date().toDateString();
  const overviewKpis = useMemo(() => {
    const closedCount = teamJobs.filter(j => (j.status || "").toLowerCase() === "closed").length;
    const expiredCount = teamJobs.filter(j => {
      const s = (j.status || "").toLowerCase();
      if (s === "expired") return true;
      if (s !== "closed" && isJobExpired(j)) return true;
      return false;
    }).length;

    return serverKpis ? {
      totalRecruiters: members.length,
      activeRecruiters: activeMembersCount,
      totalJobs: serverKpis.total_jobs,
      activeJobs: serverKpis.active_jobs,
      closedJobs: serverKpis.closed_jobs ?? closedCount,
      expiredJobs: expiredCount,
      totalCandidates: serverKpis.total_candidates,
      applicationsToday: serverKpis.applications_today,
      interviewsScheduled: serverKpis.interviews_scheduled,
      offersReleased: serverKpis.offers_released,
      successfulHires: serverKpis.successful_hires,
    } : {
      totalRecruiters: members.length,
      activeRecruiters: activeMembersCount,
      totalJobs: teamJobs.length,
      activeJobs: teamJobs.filter(j => j.status === "Active" && !isJobExpired(j)).length,
      closedJobs: closedCount,
      expiredJobs: expiredCount,
      totalCandidates: new Set(teamApps.map(a => a.profile_id)).size,
      applicationsToday: teamApps.filter(a => new Date(a.applied_at).toDateString() === todayStr).length,
      interviewsScheduled: teamApps.filter(a => a.status === "Interview Scheduled").length,
      offersReleased: teamApps.filter(a => a.status === "Offered").length,
      successfulHires: teamApps.filter(a => ["Hired", "Joined"].includes(a.status)).length,
    };
  }, [serverKpis, members.length, activeMembersCount, teamJobs, teamApps, todayStr]);

  const filteredMembers = useMemo(() => {
    const q = memberSearchQuery.toLowerCase().trim();
    if (!q) return members;
    return members.filter(m =>
      (m.recruiter_name || "").toLowerCase().includes(q) ||
      (m.email || "").toLowerCase().includes(q),
    );
  }, [members, memberSearchQuery]);

  // ── Header Render Helper ────────────────────────────────────
  const renderHeader = () => (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/recruiter/dashboard" className="flex items-center gap-3">
              <img src={logoImage} alt="RhirePro" className="w-10 h-10" />
              <div>
                <div className="text-2xl font-bold text-[#3A1F1F]">
                  Rhire<span className="text-[#FF2B2B]">Pro</span>
                </div>
                <div className="text-xs text-[#8A8A8A]">Recruiter</div>
              </div>
            </Link>
            <div className="hidden md:flex items-center gap-2 pl-4 border-l border-gray-200">
              <Shield className="h-4 w-4 text-[#FF2B2B]" />
              <span className="text-sm font-semibold text-[#3A1F1F]">Team Admin Panel</span>
              <span className="text-xs text-[#8A8A8A]">— {recruiterProfile?.company_name}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/recruiter/dashboard">
              <Button variant="ghost" size="sm" className="text-[#8A8A8A] hover:text-[#3A1F1F] rounded-full">
                <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-accent">
                <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center border border-gray-200 bg-[#FF2B2B] text-white text-xs font-bold flex-shrink-0">
                  {recruiterProfile?.logo_url ? (
                    <img src={recruiterProfile.logo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    companyInitials
                  )}
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-3 py-2">
                  <p className="text-sm font-medium text-[#3A1F1F]">
                    {recruiterProfile?.company_name || "Company"}
                  </p>
                  <p className="text-xs text-[#8A8A8A]">{recruiterProfile?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-500">
                  <LogOut className="h-4 w-4 mr-2" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );

  // ── Render ──────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F6F6F6] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#FF2B2B] border-t-transparent rounded-full animate-spin text-[#FF2B2B]" />
      </div>
    );
  }

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-[#F6F6F6]">
        {renderHeader()}
        <div className="container mx-auto px-4 py-12 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-[#FF2B2B] border-t-transparent rounded-full animate-spin text-[#FF2B2B]" />
        </div>
      </div>
    );
  }

  if (memberId) {
    if (dataLoading) {
      return (
        <div className="min-h-screen bg-[#F6F6F6]">
          {renderHeader()}
          <div className="container mx-auto px-4 py-8 max-w-3xl">
            <LoadingCard />
          </div>
        </div>
      );
    }

    const member = members.find(m => m.id === memberId);
    if (!member) {
      return (
        <div className="min-h-screen bg-[#F6F6F6]">
          {renderHeader()}
          <div className="container mx-auto px-4 py-8 max-w-3xl text-center">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <h3 className="text-xl font-bold text-[#3A1F1F] mb-2">Member Not Found</h3>
              <p className="text-sm text-[#8A8A8A]">The member with ID {memberId} was not found in your organization.</p>
              <Button className="mt-4 bg-[#FF2B2B] hover:bg-[#e02525] rounded-full" onClick={() => window.close()}>
                Close Window
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#F6F6F6]">
        {renderHeader()}

        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            {/* Header/Title block */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4 mb-6 border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#FF2B2B] text-white flex items-center justify-center text-sm font-bold">
                  {initials(member.recruiter_name, member.email)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#3A1F1F]">
                    {member.recruiter_name || "(No name)"}
                  </h3>
                  <p className="text-xs text-[#8A8A8A] font-normal">{member.email}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => exportMemberToExcel(member, memberKeywords)}
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 text-xs py-1.5 px-4 rounded-full"
                >
                  <Download className="h-4 w-4" /> Export to Excel
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.close()}
                  className="text-[#8A8A8A] hover:text-[#3A1F1F] text-xs py-1.5 px-4 rounded-full"
                >
                  Close Window
                </Button>
              </div>
            </div>

            {/* Recruiter Meta Info */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl mb-6">
              <div>
                <span className="text-xs text-[#8A8A8A] block font-medium">Role</span>
                <span className="text-sm font-semibold text-[#3A1F1F] capitalize">{member.org_role}</span>
              </div>
              <div>
                <span className="text-xs text-[#8A8A8A] block font-medium">Status</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-block mt-0.5 ${memberStatusBadge(member).className}`}>
                  {memberStatusBadge(member).label}
                </span>
              </div>
              <div>
                <span className="text-xs text-[#8A8A8A] block font-medium">Joined On</span>
                <span className="text-sm font-semibold text-[#3A1F1F]">{fmtDate(member.created_at)}</span>
              </div>
            </div>

            {/* Performance / Usage Stats Grid */}
            <div className="mb-6">
              <h4 className="text-sm font-bold text-[#3A1F1F] mb-3">Usage Statistics</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white border border-gray-150 p-3.5 rounded-xl text-center shadow-xs">
                  <span className="text-xs text-[#8A8A8A] block mb-1 font-medium">Jobs Posted</span>
                  <span className="text-xl font-bold text-[#3A1F1F]">{member.jobs_count}</span>
                </div>
                <div className="bg-white border border-gray-150 p-3.5 rounded-xl text-center shadow-xs">
                  <span className="text-xs text-[#8A8A8A] block mb-1 font-medium">Profiles Viewed</span>
                  <span className="text-xl font-bold text-[#3A1F1F]">{member.profiles_viewed || 0}</span>
                </div>
                <div className="bg-white border border-gray-150 p-3.5 rounded-xl text-center shadow-xs">
                  <span className="text-xs text-[#8A8A8A] block mb-1 font-medium">Resumes Downloaded</span>
                  <span className="text-xl font-bold text-[#3A1F1F]">{member.resumes_used || 0}</span>
                </div>
                <div className="bg-white border border-gray-150 p-3.5 rounded-xl text-center shadow-xs">
                  <span className="text-xs text-[#8A8A8A] block mb-1 font-medium">Keywords Used</span>
                  <span className="text-xl font-bold text-[#3A1F1F]">{member.keywords_used || 0}</span>
                </div>
              </div>
            </div>

            {/* Keywords Section */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-bold text-[#3A1F1F]">Search Keywords Used</h4>
                <span className="text-xs text-[#8A8A8A] font-medium">Total: {memberKeywords.length} searches</span>
              </div>

              {keywordsLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-[#FF2B2B]" />
                </div>
              ) : memberKeywords.length === 0 ? (
                <div className="text-center py-6 border border-dashed rounded-xl text-sm text-[#8A8A8A]">
                  No search keywords logged for this recruiter.
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Top Keywords (Aggregated) */}
                  <div>
                    <span className="text-xs font-semibold text-[#8A8A8A] block mb-2">Top Searched Keywords</span>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(new Set(memberKeywords.map(k => k.keyword.trim().toLowerCase())))
                        .map(kw => {
                          const count = memberKeywords.filter(k => k.keyword.trim().toLowerCase() === kw).length;
                          return (
                            <div key={kw} className="bg-red-50 text-[#FF2B2B] text-xs font-medium px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 border border-red-100">
                              <span>{kw}</span>
                              <span className="bg-[#FF2B2B] text-white text-[10px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-bold">
                                {count}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Search History List */}
                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <span className="text-xs font-semibold text-[#8A8A8A] bg-gray-50 px-4 py-2 block border-b border-gray-100">Search History Logs</span>
                    <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                      {memberKeywords.map((kw, i) => (
                        <div key={i} className="flex justify-between items-center px-4 py-3 text-xs">
                          <span className="font-medium text-[#3A1F1F]">{kw.keyword}</span>
                          <span className="text-[#8A8A8A]">{new Date(kw.created_at).toLocaleString("en-IN")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (jobId) {
    if (dataLoading || jobDetailLoading) {
      return (
        <div className="min-h-screen bg-[#F6F6F6]">
          {renderHeader()}
          <div className="container mx-auto px-4 py-8 max-w-3xl">
            <LoadingCard />
          </div>
        </div>
      );
    }

    const jobSummary = teamJobs.find(j => j.id === jobId);
    if (!jobDetail && !jobSummary) {
      return (
        <div className="min-h-screen bg-[#F6F6F6]">
          {renderHeader()}
          <div className="container mx-auto px-4 py-8 max-w-3xl text-center">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <h3 className="text-xl font-bold text-[#3A1F1F] mb-2">Job Not Found</h3>
              <p className="text-sm text-[#8A8A8A]">The job with ID {jobId} was not found in your organization.</p>
              <Button className="mt-4 bg-[#FF2B2B] hover:bg-[#e02525] rounded-full" onClick={() => window.close()}>
                Close Window
              </Button>
            </div>
          </div>
        </div>
      );
    }

    const job = (jobDetail || jobSummary) as Job & Partial<OrgJob>;
    const postedBy = jobSummary?.recruiter_name || "Unknown";
    const jobApplications = teamApps.filter(a => a.job_id === jobId);

    return (
      <div className="min-h-screen bg-[#F6F6F6]">
        {renderHeader()}

        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            {/* Header/Title block */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4 mb-6 border-gray-100">
              <div>
                <h3 className="text-xl font-bold text-[#3A1F1F]">{job.title}</h3>
                <p className="text-xs text-[#8A8A8A] font-normal">{job.company_name} · Posted by {postedBy}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  className={`text-xs ${STATUS_COLOR[job.status] || "bg-gray-100 text-gray-500"}`}
                  variant="secondary"
                >
                  {job.status}
                </Badge>
                <Button
                  variant="outline"
                  onClick={() => window.close()}
                  className="text-[#8A8A8A] hover:text-[#3A1F1F] text-xs py-1.5 px-4 rounded-full"
                >
                  Close Window
                </Button>
              </div>
            </div>

            {/* Job Meta Info */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl mb-6">
              <div>
                <span className="text-xs text-[#8A8A8A] block font-medium">Location</span>
                <span className="text-sm font-semibold text-[#3A1F1F]">{job.location || "—"}</span>
              </div>
              <div>
                <span className="text-xs text-[#8A8A8A] block font-medium">Work Mode</span>
                <span className="text-sm font-semibold text-[#3A1F1F]">{job.work_mode || "—"}</span>
              </div>
              <div>
                <span className="text-xs text-[#8A8A8A] block font-medium">Employment Type</span>
                <span className="text-sm font-semibold text-[#3A1F1F]">{job.employment_type || "—"}</span>
              </div>
              <div>
                <span className="text-xs text-[#8A8A8A] block font-medium">Posted On</span>
                <span className="text-sm font-semibold text-[#3A1F1F]">{fmtDate(job.created_at)}</span>
              </div>
              <div>
                <span className="text-xs text-[#8A8A8A] block font-medium">Deadline</span>
                <span className="text-sm font-semibold text-[#3A1F1F]">{job.deadline ? fmtDate(job.deadline) : "—"}</span>
              </div>
              <div>
                <span className="text-xs text-[#8A8A8A] block font-medium">Openings</span>
                <span className="text-sm font-semibold text-[#3A1F1F]">{job.openings ?? "—"}</span>
              </div>
            </div>

            {/* Usage Stats */}
            <div className="mb-6">
              <h4 className="text-sm font-bold text-[#3A1F1F] mb-3">Job Statistics</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-gray-150 p-3.5 rounded-xl text-center shadow-xs">
                  <span className="text-xs text-[#8A8A8A] block mb-1 font-medium">Views</span>
                  <span className="text-xl font-bold text-[#3A1F1F]">{job.views ?? 0}</span>
                </div>
                <div className="bg-white border border-gray-150 p-3.5 rounded-xl text-center shadow-xs">
                  <span className="text-xs text-[#8A8A8A] block mb-1 font-medium">Applications</span>
                  <span className="text-xl font-bold text-[#3A1F1F]">{jobApplications.length}</span>
                </div>
                <div className="bg-white border border-gray-150 p-3.5 rounded-xl text-center shadow-xs">
                  <span className="text-xs text-[#8A8A8A] block mb-1 font-medium">Salary Range</span>
                  <span className="text-xl font-bold text-[#3A1F1F]">
                    {job.salary_min || job.salary_max ? `${job.salary_min ?? "—"} - ${job.salary_max ?? "—"}` : "—"}
                  </span>
                </div>
              </div>
            </div>

            {job.skills && job.skills.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-bold text-[#3A1F1F] mb-2">Skills Required</h4>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((s, i) => (
                    <span key={i} className="bg-red-50 text-[#FF2B2B] text-xs font-medium px-2.5 py-1 rounded-lg border border-red-100">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {job.description && (
              <div className="mb-6">
                <h4 className="text-sm font-bold text-[#3A1F1F] mb-2">Description</h4>
                <SafeHtml content={job.description} className="text-sm text-[#3A1F1F] prose prose-sm max-w-none" />
              </div>
            )}

            {/* Applicants for this job */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-bold text-[#3A1F1F]">Applicants</h4>
                <span className="text-xs text-[#8A8A8A] font-medium">Total: {jobApplications.length}</span>
              </div>
              {jobApplications.length === 0 ? (
                <div className="text-center py-6 border border-dashed rounded-xl text-sm text-[#8A8A8A]">
                  No applications received yet for this job.
                </div>
              ) : (
                <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50">
                  {jobApplications.map(app => (
                    <div
                      key={app.id}
                      onClick={() => handleApplicationClick(app)}
                      className="flex justify-between items-center px-4 py-3 text-sm cursor-pointer hover:bg-[#FFF8F8] transition-colors"
                    >
                      <span className="font-medium text-[#3A1F1F]">{app.candidate_name}</span>
                      <div className="flex items-center gap-3">
                        <Badge
                          className={`text-xs ${APP_STATUS_COLOR[app.status] || "bg-gray-100 text-gray-500"}`}
                          variant="secondary"
                        >
                          {app.status}
                        </Badge>
                        <span className="text-xs text-[#8A8A8A]">{fmtDate(app.applied_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F6F6]">
      {renderHeader()}

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <SummaryCard icon={<Users className="h-5 w-5 text-[#FF2B2B]" />} label="Team Members" value={`${activeMembersCount} active`} sub={`${members.length} total`} onClick={() => setActiveTab("team")} />
          <SummaryCard icon={<Shield className="h-5 w-5 text-blue-500" />} label="Sub-Users" value={`${seatsUsed} / ${maxSeats}`} sub={`${maxSeats - seatsUsed} remaining`} onClick={() => setActiveTab("team")} />
          <SummaryCard icon={<Briefcase className="h-5 w-5 text-green-500" />} label="Total Jobs" value={String(teamJobs.length)} sub={`${teamJobs.filter(j => j.status === "Active").length} active`} onClick={() => setActiveTab("jobs")} />
          <SummaryCard icon={<BarChart2 className="h-5 w-5 text-purple-500" />} label="Total Applications" value={String(teamApps.length)} sub={`${teamApps.filter(a => ["Hired", "Joined"].includes(a.status)).length} hired`} onClick={() => setActiveTab("applications")} />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white rounded-xl p-1 shadow-sm mb-6 w-full justify-start flex-wrap h-auto gap-1">
            <TabsTrigger value="overview" className="rounded-lg text-sm data-[state=active]:bg-[#FF2B2B] data-[state=active]:text-white">
              <LayoutGrid className="h-4 w-4 mr-1.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="team" className="rounded-lg text-sm data-[state=active]:bg-[#FF2B2B] data-[state=active]:text-white">
              <Users className="h-4 w-4 mr-1.5" /> Team
            </TabsTrigger>
            <TabsTrigger value="jobs" className="rounded-lg text-sm data-[state=active]:bg-[#FF2B2B] data-[state=active]:text-white">
              <Briefcase className="h-4 w-4 mr-1.5" /> All Jobs
            </TabsTrigger>
            <TabsTrigger value="applications" className="rounded-lg text-sm data-[state=active]:bg-[#FF2B2B] data-[state=active]:text-white">
              <Mail className="h-4 w-4 mr-1.5" /> All Applications
            </TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-lg text-sm data-[state=active]:bg-[#FF2B2B] data-[state=active]:text-white">
              <BarChart2 className="h-4 w-4 mr-1.5" /> Analytics
            </TabsTrigger>
            <TabsTrigger value="subscription_usage" className="rounded-lg text-sm data-[state=active]:bg-[#FF2B2B] data-[state=active]:text-white">
              <CreditCard className="h-4 w-4 mr-1.5" /> Subscription Usage
            </TabsTrigger>
            <TabsTrigger value="blogs" className="rounded-lg text-sm data-[state=active]:bg-[#FF2B2B] data-[state=active]:text-white">
              <BookOpen className="h-4 w-4 mr-1.5" /> Blogs
            </TabsTrigger>
          </TabsList>

          {/* ── Overview Tab ── */}
          <TabsContent value="overview">
            {dataLoading ? <LoadingCard /> : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
                  <AnalyticsCard label="Total Recruiters" value={overviewKpis.totalRecruiters} color="text-[#3A1F1F]" onClick={() => setActiveTab("team")} />
                  <AnalyticsCard label="Active Recruiters" value={overviewKpis.activeRecruiters} color="text-green-600" onClick={() => setActiveTab("team")} />
                  <AnalyticsCard label="Total Jobs" value={overviewKpis.totalJobs} color="text-[#3A1F1F]" onClick={() => setActiveTab("jobs")} />
                  <AnalyticsCard label="Active Jobs" value={overviewKpis.activeJobs} color="text-green-600" onClick={() => setActiveTab("jobs")} />
                  <AnalyticsCard label="Closed / Expiry Jobs" value={`${overviewKpis.closedJobs} / ${overviewKpis.expiredJobs}`} color="text-gray-500" onClick={() => setActiveTab("jobs")} />
                  <AnalyticsCard label="Total Candidates" value={overviewKpis.totalCandidates} color="text-[#3A1F1F]" onClick={() => setActiveTab("applications")} />
                  <AnalyticsCard label="Applications Today" value={overviewKpis.applicationsToday} color="text-blue-600" onClick={() => setActiveTab("applications")} />
                  <AnalyticsCard label="Interviews Scheduled" value={overviewKpis.interviewsScheduled} color="text-yellow-600" onClick={() => setActiveTab("applications")} />
                  <AnalyticsCard label="Offers Released" value={overviewKpis.offersReleased} color="text-orange-600" onClick={() => setActiveTab("applications")} />
                  <AnalyticsCard label="Successful Hires" value={overviewKpis.successfulHires} color="text-green-600" onClick={() => setActiveTab("applications")} />
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#FF2B2B]/10 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="h-5 w-5 text-[#FF2B2B]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#3A1F1F]">Organization-wide hiring snapshot</p>
                    <p className="text-xs text-[#8A8A8A] mt-0.5">
                      Switch to Team, All Jobs, All Applications, or Analytics above for the full breakdown.
                    </p>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* ── Team Tab ── */}
          <TabsContent value="team">
            {/* Seat bar */}
            <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-[#3A1F1F]">Sub User Used</h3>
                  <p className="text-sm text-[#8A8A8A] mt-0.5">
                    {seatsUsed} of {maxSeats} seats used
                    {maxSeats - seatsUsed > 0 && ` · ${maxSeats - seatsUsed} available`}
                  </p>
                </div>
                <Button
                  onClick={() => { setInviteOpen(true); setInviteError(""); setInviteSuccess(false); }}
                  className="bg-[#FF2B2B] hover:bg-[#e02525] rounded-full"
                >
                  <Plus className="h-4 w-4 mr-2" /> Invite Member
                </Button>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className="bg-[#FF2B2B] h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${seatPct}%` }}
                />
              </div>
            </div>

            {/* Members table */}
            {dataLoading ? (
              <LoadingCard />
            ) : (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-semibold text-[#3A1F1F]">
                    Team Members <span className="text-[#8A8A8A] font-normal">({members.length})</span>
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => loadData()} className="text-[#8A8A8A]">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#F6F6F6] text-xs text-[#8A8A8A] font-medium uppercase tracking-wide">
                        <th className="text-left px-6 py-3">Member</th>
                        <th className="text-left px-6 py-3">Role</th>
                        <th className="text-left px-6 py-3">Status</th>
                        <th className="text-left px-6 py-3">Jobs</th>
                        <th className="text-left px-6 py-3">Applications</th>
                        <th className="text-left px-6 py-3">Hires</th>
                        <th className="text-left px-6 py-3">Joined</th>
                        <th className="text-right px-6 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {members.map(member => (
                        <tr key={member.id} className="hover:bg-[#FFF8F8] transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-[#FF2B2B] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {initials(member.recruiter_name, member.email)}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-[#3A1F1F]">
                                  {member.recruiter_name || "(No name)"}
                                </p>
                                <p className="text-xs text-[#8A8A8A]">{member.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {member.org_role === "admin" ? (
                              <Badge className="bg-[#FF2B2B] text-white text-xs gap-1">
                                <Crown className="h-3 w-3" /> Admin
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">Member</Badge>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <Badge
                              className={`text-xs ${memberStatusBadge(member, user?.id).className}`}
                              variant="secondary"
                            >
                              {memberStatusBadge(member, user?.id).label}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-sm text-[#3A1F1F] font-medium">{member.jobs_count}</td>
                          <td className="px-6 py-4 text-sm text-[#3A1F1F] font-medium">{member.applications_count}</td>
                          <td className="px-6 py-4 text-sm text-green-600 font-medium">{member.hires_count}</td>
                          <td className="px-6 py-4 text-xs text-[#8A8A8A]">{fmtDate(member.created_at)}</td>
                          <td className="px-6 py-4 text-right">
                            {member.id === user?.id ? (
                              <span className="text-xs text-[#8A8A8A] italic">You</span>
                            ) : (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    disabled={actionLoading === member.id}
                                  >
                                    {actionLoading === member.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <MoreVertical className="h-4 w-4" />
                                    )}
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {member.verification_status && member.verification_status !== "Verified" && (
                                    <>
                                      <DropdownMenuItem
                                        onClick={() => handleMemberAction(member.id, "approve")}
                                        className="text-green-600"
                                      >
                                        <CheckCircle className="h-4 w-4 mr-2" /> Approve
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                    </>
                                  )}
                                  {member.is_active ? (
                                    <DropdownMenuItem
                                      onClick={() => handleMemberAction(member.id, "deactivate")}
                                      className="text-orange-600"
                                    >
                                      <UserX className="h-4 w-4 mr-2" /> Deactivate
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      onClick={() => handleMemberAction(member.id, "activate")}
                                      className="text-green-600"
                                    >
                                      <UserCheck className="h-4 w-4 mr-2" /> Activate
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => { setRemoveMemberError(""); setRemoveMemberId(member.id); }}
                                    className="text-red-600"
                                  >
                                    <X className="h-4 w-4 mr-2" /> Remove from Org
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </td>
                        </tr>
                      ))}
                      {members.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-6 py-12 text-center text-[#8A8A8A] text-sm">
                            No team members yet. Invite someone to get started.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Pending invitations */}
            {pendingInvitations.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-[#3A1F1F]">
                    Pending Invitations <span className="text-[#8A8A8A] font-normal">({pendingInvitations.length})</span>
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#F6F6F6] text-xs text-[#8A8A8A] font-medium uppercase tracking-wide">
                        <th className="text-left px-6 py-3">Email</th>
                        <th className="text-left px-6 py-3">Role</th>
                        <th className="text-left px-6 py-3">Sent</th>
                        <th className="text-left px-6 py-3">Expires</th>
                        <th className="text-right px-6 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {pendingInvitations.map(inv => (
                        <tr key={inv.id} className="hover:bg-[#FFF8F8] transition-colors">
                          <td className="px-6 py-4 text-sm text-[#3A1F1F]">{inv.invited_email}</td>
                          <td className="px-6 py-4">
                            <Badge variant="secondary" className="text-xs capitalize">{inv.role}</Badge>
                          </td>
                          <td className="px-6 py-4 text-xs text-[#8A8A8A]">{fmtDate(inv.created_at)}</td>
                          <td className="px-6 py-4 text-xs text-[#8A8A8A]">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {fmtDate(inv.expires_at)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={actionLoading === inv.id}
                              className="text-red-500 hover:text-red-600 text-xs h-7"
                              onClick={() => handleRevokeInvitation(inv.id)}
                            >
                              {actionLoading === inv.id ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : null}
                              Revoke
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── All Jobs Tab ── */}
          <TabsContent value="jobs">
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
                <h3 className="font-semibold text-[#3A1F1F] whitespace-nowrap">
                  All Jobs <span className="text-[#8A8A8A] font-normal">({filteredJobs.length})</span>
                </h3>
                <Input
                  value={jobSearch}
                  onChange={e => setJobSearch(e.target.value)}
                  placeholder="Search by title or member…"
                  className="max-w-xs rounded-xl bg-[#F6F6F6] border-gray-200"
                />
              </div>
              {dataLoading ? <LoadingCard /> : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-[#F6F6F6] text-xs text-[#8A8A8A] font-medium uppercase tracking-wide">
                          <th className="text-left px-6 py-3">Job Title</th>
                          <th className="text-left px-6 py-3">Posted By</th>
                          <th className="text-left px-6 py-3">Status</th>
                          <th className="text-left px-6 py-3">Location</th>
                          <th className="text-left px-6 py-3">Views</th>
                          <th className="text-left px-6 py-3">Posted</th>
                          <th className="text-left px-6 py-3">Deadline</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {paginatedJobs.map(job => (
                          <tr
                            key={job.id}
                            onClick={() => handleJobClick(job)}
                            className="hover:bg-[#FFF8F8] transition-colors cursor-pointer"
                          >
                            <td className="px-6 py-4">
                              <p className="text-sm font-medium text-[#3A1F1F]">{job.title}</p>
                              <p className="text-xs text-[#8A8A8A]">{job.company_name}</p>
                            </td>
                            <td className="px-6 py-4 text-sm text-[#3A1F1F]">{job.recruiter_name}</td>
                            <td className="px-6 py-4">
                              <Badge
                                className={`text-xs ${STATUS_COLOR[job.status] || "bg-gray-100 text-gray-500"}`}
                                variant="secondary"
                              >
                                {job.status}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-sm text-[#8A8A8A]">{job.location || "—"}</td>
                            <td className="px-6 py-4 text-sm text-[#3A1F1F]">{job.views ?? 0}</td>
                            <td className="px-6 py-4 text-xs text-[#8A8A8A]">{fmtDate(job.created_at)}</td>
                            <td className="px-6 py-4 text-xs text-[#8A8A8A]">
                              {job.deadline ? fmtDate(job.deadline) : "—"}
                            </td>
                          </tr>
                        ))}
                        {filteredJobs.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-6 py-12 text-center text-[#8A8A8A] text-sm">
                              No jobs found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Jobs Pagination */}
                  {totalJobPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <p className="text-xs text-[#8A8A8A]">
                        Showing <span className="font-semibold text-[#3A1F1F]">{(jobPage - 1) * JOBS_PER_PAGE + 1}</span> to{" "}
                        <span className="font-semibold text-[#3A1F1F]">
                          {Math.min(jobPage * JOBS_PER_PAGE, filteredJobs.length)}
                        </span>{" "}
                        of <span className="font-semibold text-[#3A1F1F]">{filteredJobs.length}</span> jobs
                      </p>
                      <Pagination className="mx-0 w-auto">
                        <PaginationContent className="flex-wrap justify-center gap-1.5">
                          <PaginationItem>
                            <PaginationPrevious
                              href="#"
                              onClick={(event) => {
                                event.preventDefault();
                                if (jobPage > 1) setJobPage(p => p - 1);
                              }}
                              className={jobPage === 1 ? "pointer-events-none opacity-50 text-xs h-8 px-2.5" : "text-xs h-8 px-2.5 cursor-pointer"}
                            />
                          </PaginationItem>

                          {(() => {
                            const delta = 1;
                            const range: (number | string)[] = [];
                            for (let i = 1; i <= totalJobPages; i++) {
                              if (i === 1 || i === totalJobPages || (i >= jobPage - delta && i <= jobPage + delta)) {
                                range.push(i);
                              } else if (range[range.length - 1] !== "...") {
                                range.push("...");
                              }
                            }
                            return range.map((page, idx) => {
                              if (page === "...") {
                                return (
                                  <PaginationItem key={`ellipsis-job-${idx}`}>
                                    <PaginationEllipsis className="text-[#8A8A8A] size-8" />
                                  </PaginationItem>
                                );
                              }
                              const pageNum = page as number;
                              return (
                                <PaginationItem key={`job-page-${pageNum}`}>
                                  <PaginationLink
                                    href="#"
                                    isActive={jobPage === pageNum}
                                    onClick={(event) => {
                                      event.preventDefault();
                                      setJobPage(pageNum);
                                    }}
                                    className={
                                      jobPage === pageNum
                                        ? "border-[#FF2B2B] bg-[#FF2B2B] text-white hover:bg-[#e02525] hover:text-white size-8 text-xs font-semibold"
                                        : "text-[#3A1F1F] size-8 text-xs cursor-pointer hover:bg-gray-100"
                                    }
                                  >
                                    {pageNum}
                                  </PaginationLink>
                                </PaginationItem>
                              );
                            });
                          })()}

                          <PaginationItem>
                            <PaginationNext
                              href="#"
                              onClick={(event) => {
                                event.preventDefault();
                                if (jobPage < totalJobPages) setJobPage(p => p + 1);
                              }}
                              className={jobPage === totalJobPages ? "pointer-events-none opacity-50 text-xs h-8 px-2.5" : "text-xs h-8 px-2.5 cursor-pointer"}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>

          {/* ── All Applications Tab ── */}
          <TabsContent value="applications">
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4 flex-wrap">
                <h3 className="font-semibold text-[#3A1F1F] whitespace-nowrap">
                  All Applications <span className="text-[#8A8A8A] font-normal">({filteredApps.length})</span>
                </h3>
                <select
                  value={appStatusFilter}
                  onChange={e => setAppStatusFilter(e.target.value)}
                  className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-[#F6F6F6] text-[#3A1F1F] outline-none"
                >
                  <option value="all">All statuses</option>
                  {["Applied", "Under Review", "Shortlisted", "Interview Scheduled",
                    "Offered", "Joined", "Rejected", "On Hold"].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                </select>
              </div>
              {dataLoading ? <LoadingCard /> : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-[#F6F6F6] text-xs text-[#8A8A8A] font-medium uppercase tracking-wide">
                          <th className="text-left px-6 py-3">Candidate</th>
                          <th className="text-left px-6 py-3">Job</th>
                          <th className="text-left px-6 py-3">Posted By</th>
                          <th className="text-left px-6 py-3">Status</th>
                          <th className="text-left px-6 py-3">Applied</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {paginatedApps.map(app => (
                          <tr
                            key={app.id}
                            onClick={() => handleApplicationClick(app)}
                            className="hover:bg-[#FFF8F8] transition-colors cursor-pointer"
                          >
                            <td className="px-6 py-4 text-sm font-medium text-[#3A1F1F]">{app.candidate_name}</td>
                            <td className="px-6 py-4 text-sm text-[#3A1F1F]">{app.job_title}</td>
                            <td className="px-6 py-4 text-sm text-[#8A8A8A]">{app.recruiter_name}</td>
                            <td className="px-6 py-4">
                              <Badge
                                className={`text-xs ${APP_STATUS_COLOR[app.status] || "bg-gray-100 text-gray-500"}`}
                                variant="secondary"
                              >
                                {app.status}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-xs text-[#8A8A8A]">{fmtDate(app.applied_at)}</td>
                          </tr>
                        ))}
                        {filteredApps.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-[#8A8A8A] text-sm">
                              No applications found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Applications Pagination */}
                  {totalAppPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <p className="text-xs text-[#8A8A8A]">
                        Showing <span className="font-semibold text-[#3A1F1F]">{(appPage - 1) * APPS_PER_PAGE + 1}</span> to{" "}
                        <span className="font-semibold text-[#3A1F1F]">
                          {Math.min(appPage * APPS_PER_PAGE, filteredApps.length)}
                        </span>{" "}
                        of <span className="font-semibold text-[#3A1F1F]">{filteredApps.length}</span> applications
                      </p>
                      <Pagination className="mx-0 w-auto">
                        <PaginationContent className="flex-wrap justify-center gap-1.5">
                          <PaginationItem>
                            <PaginationPrevious
                              href="#"
                              onClick={(event) => {
                                event.preventDefault();
                                if (appPage > 1) setAppPage(p => p - 1);
                              }}
                              className={appPage === 1 ? "pointer-events-none opacity-50 text-xs h-8 px-2.5" : "text-xs h-8 px-2.5 cursor-pointer"}
                            />
                          </PaginationItem>

                          {(() => {
                            const delta = 1;
                            const range: (number | string)[] = [];
                            for (let i = 1; i <= totalAppPages; i++) {
                              if (i === 1 || i === totalAppPages || (i >= appPage - delta && i <= appPage + delta)) {
                                range.push(i);
                              } else if (range[range.length - 1] !== "...") {
                                range.push("...");
                              }
                            }
                            return range.map((page, idx) => {
                              if (page === "...") {
                                return (
                                  <PaginationItem key={`ellipsis-app-${idx}`}>
                                    <PaginationEllipsis className="text-[#8A8A8A] size-8" />
                                  </PaginationItem>
                                );
                              }
                              const pageNum = page as number;
                              return (
                                <PaginationItem key={`app-page-${pageNum}`}>
                                  <PaginationLink
                                    href="#"
                                    isActive={appPage === pageNum}
                                    onClick={(event) => {
                                      event.preventDefault();
                                      setAppPage(pageNum);
                                    }}
                                    className={
                                      appPage === pageNum
                                        ? "border-[#FF2B2B] bg-[#FF2B2B] text-white hover:bg-[#e02525] hover:text-white size-8 text-xs font-semibold"
                                        : "text-[#3A1F1F] size-8 text-xs cursor-pointer hover:bg-gray-100"
                                    }
                                  >
                                    {pageNum}
                                  </PaginationLink>
                                </PaginationItem>
                              );
                            });
                          })()}

                          <PaginationItem>
                            <PaginationNext
                              href="#"
                              onClick={(event) => {
                                event.preventDefault();
                                if (appPage < totalAppPages) setAppPage(p => p + 1);
                              }}
                              className={appPage === totalAppPages ? "pointer-events-none opacity-50 text-xs h-8 px-2.5" : "text-xs h-8 px-2.5 cursor-pointer"}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>

          {/* ── Analytics Tab ── */}
          <TabsContent value="analytics">
            {dataLoading ? <LoadingCard /> : (
              <>
                {/* Overview cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <AnalyticsCard label="Active Jobs" value={teamJobs.filter(j => j.status === "Active").length} color="text-green-600" onClick={() => setActiveTab("jobs")} />
                  <AnalyticsCard label="Total Applications" value={teamApps.length} color="text-blue-600" onClick={() => setActiveTab("applications")} />
                  <AnalyticsCard label="Total Hires" value={teamApps.filter(a => ["Hired", "Joined"].includes(a.status)).length} color="text-purple-600" onClick={() => setActiveTab("applications")} />
                  <AnalyticsCard label="Active Members" value={activeCount} color="text-[#FF2B2B]" onClick={() => setActiveTab("team")} />
                </div>

                <div className="relative mb-4 max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A8A8A]" />
                  <Input
                    placeholder="Search member by name or email…"
                    value={memberSearchQuery}
                    onChange={e => setMemberSearchQuery(e.target.value)}
                    className="pl-9 bg-white border-gray-200 rounded-xl"
                  />
                </div>

                {/* Per-member breakdown */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="font-semibold text-[#3A1F1F]">Member Performance</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-[#F6F6F6] text-xs text-[#8A8A8A] font-medium uppercase tracking-wide">
                          <th className="text-left px-6 py-3">Member</th>
                          <th className="text-left px-6 py-3">Jobs Posted</th>
                          <th className="text-left px-6 py-3">Applications</th>
                          <th className="text-left px-6 py-3">Hires</th>
                          <th className="text-left px-6 py-3">Hire Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filteredMembers.map(m => {
                          const hireRate = m.applications_count > 0
                            ? ((m.hires_count / m.applications_count) * 100).toFixed(1)
                            : "0.0";
                          return (
                            <tr
                              key={m.id}
                              className="hover:bg-[#FFF8F8] transition-colors cursor-pointer"
                              onClick={() => handleMemberClick(m)}
                              title="Click to view details"
                            >
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-[#FF2B2B] text-white flex items-center justify-center text-xs font-bold">
                                    {initials(m.recruiter_name, m.email)}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-[#3A1F1F]">
                                      {m.recruiter_name || "(No name)"}
                                      {m.id === user?.id && <span className="ml-1 text-xs text-[#8A8A8A]">(You)</span>}
                                    </p>
                                    <p className="text-xs text-[#8A8A8A]">{m.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm font-semibold text-[#3A1F1F]">{m.jobs_count}</span>
                                <div className="mt-1 w-24 bg-gray-100 rounded-full h-1.5">
                                  <div
                                    className="bg-green-400 h-1.5 rounded-full"
                                    style={{ width: `${Math.min((m.jobs_count / (Math.max(...members.map(x => x.jobs_count)) || 1)) * 100, 100)}%` }}
                                  />
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm font-semibold text-[#3A1F1F]">{m.applications_count}</span>
                                <div className="mt-1 w-24 bg-gray-100 rounded-full h-1.5">
                                  <div
                                    className="bg-blue-400 h-1.5 rounded-full"
                                    style={{ width: `${Math.min((m.applications_count / (Math.max(...members.map(x => x.applications_count)) || 1)) * 100, 100)}%` }}
                                  />
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-green-600 font-semibold">{m.hires_count}</td>
                              <td className="px-6 py-4">
                                <span className={`text-sm font-semibold ${Number(hireRate) > 20 ? "text-green-600" : "text-[#8A8A8A]"}`}>
                                  {hireRate}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* ── Subscription Usage Tab ── */}
          <TabsContent value="subscription_usage">
            {dataLoading ? <LoadingCard /> : (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
                    <p className="text-sm text-[#8A8A8A] font-bold mb-2">Current Plan</p>
                    <p className="text-2xl font-bold text-[#FF2B2B] capitalize">
                      {activeSub ? activeSub.plan_id.replace(/[_-]/g, " ") : "Premium Plan"}
                    </p>
                  </div>
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
                    <p className="text-sm text-[#8A8A8A] font-bold mb-2">Expires On</p>
                    <p className="text-2xl font-bold text-[#3A1F1F]">
                      {activeSub 
                        ? fmtDate(activeSub.expires_at) 
                        : fmtDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
                      }
                    </p>
                  </div>
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
                    <p className="text-sm text-[#8A8A8A] font-bold mb-2">Total Profiles Viewed</p>
                    <p className="text-2xl font-bold text-[#3A1F1F]">
                      {members.reduce((acc, m) => acc + (m.profiles_viewed || 0), 0)}
                    </p>
                  </div>
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
                    <p className="text-sm text-[#8A8A8A] font-bold mb-2">Total Resumes Downloaded</p>
                    <p className="text-2xl font-bold text-[#3A1F1F]">
                      {members.reduce((acc, m) => acc + (m.resumes_used || 0), 0)}
                    </p>
                  </div>
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
                    <p className="text-sm text-[#8A8A8A] font-bold mb-2">Total Search Keywords</p>
                    <p className="text-2xl font-bold text-[#3A1F1F]">
                      {members.reduce((acc, m) => acc + (m.keywords_used || 0), 0)}
                    </p>
                  </div>
                </div>

                {/* Per-member usage breakdown */}
                                <div className="relative mb-4 max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A8A8A]" />
                  <Input
                    placeholder="Search member by name or email…"
                    value={memberSearchQuery}
                    onChange={e => setMemberSearchQuery(e.target.value)}
                    className="pl-9 bg-white border-gray-200 rounded-xl"
                  />
                </div>
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="font-semibold text-[#3A1F1F]">Recruiter Usage Statistics</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-[#F6F6F6] text-xs text-[#8A8A8A] font-medium uppercase tracking-wide">
                          <th className="text-left px-6 py-3">Recruiter Name</th>
                          <th className="text-left px-6 py-3">Jobs Posted</th>
                          <th className="text-left px-6 py-3">Profiles Viewed</th>
                          <th className="text-left px-6 py-3">Resumes Downloaded</th>
                          <th className="text-left px-6 py-3">Search Keywords Used</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filteredMembers.map(m => (
                          <tr
                            key={m.id}
                            className="hover:bg-[#FFF8F8] transition-colors cursor-pointer"
                            onClick={() => handleMemberClick(m)}
                            title="Click to view details"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#FF2B2B] text-white flex items-center justify-center text-xs font-bold">
                                  {initials(m.recruiter_name, m.email)}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-[#3A1F1F]">
                                    {m.recruiter_name || "(No name)"}
                                    {m.id === user?.id && <span className="ml-1 text-xs text-[#8A8A8A]">(You)</span>}
                                  </p>
                                  <p className="text-xs text-[#8A8A8A]">{m.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-[#3A1F1F]">
                              {m.jobs_count}
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-[#3A1F1F]">
                              {m.profiles_viewed || 0}
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-[#3A1F1F]">
                              {m.resumes_used || 0}
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-[#3A1F1F]">
                              {m.keywords_used || 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* ── Blogs Tab ── */}
          <TabsContent value="blogs">
            {!canPostBlog && (
              <div className="bg-[#FFF8F8] border border-red-100 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-50 text-[#FF2B2B] rounded-xl flex items-center justify-center flex-shrink-0">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#3A1F1F]">Company Profile Incomplete ({blogCompletionScore}% / 60% Required)</p>
                    <p className="text-xs text-[#5A5A5A]">
                      You must reach at least 60% profile completion to create and publish organization blogs and articles.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => navigate("/recruiter/dashboard/company-profile")}
                  className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full text-xs self-start sm:self-auto flex-shrink-0"
                >
                  Complete Company Profile
                </Button>
              </div>
            )}

            <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-lg text-[#3A1F1F]">Organization Blogs & Articles</h3>
                <p className="text-sm text-[#8A8A8A] mt-0.5">
                  Create, edit, publish, or draft articles visible to candidates and job seekers.
                </p>
              </div>
              <Button
                onClick={handleOpenCreateBlog}
                className="bg-[#FF2B2B] hover:bg-[#e02525] rounded-full flex items-center gap-2 self-start md:self-auto"
              >
                <Plus className="h-4 w-4" /> Create Blog
              </Button>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white rounded-2xl p-4 mb-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant={blogStatusFilter === "all" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setBlogStatusFilter("all")}
                  className={`rounded-full text-xs ${blogStatusFilter === "all" ? "bg-[#3A1F1F] text-white hover:bg-[#3A1F1F]" : "text-[#8A8A8A]"}`}
                >
                  All ({teamBlogs.length})
                </Button>
                <Button
                  variant={blogStatusFilter === "Published" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setBlogStatusFilter("Published")}
                  className={`rounded-full text-xs ${blogStatusFilter === "Published" ? "bg-green-600 text-white hover:bg-green-700" : "text-[#8A8A8A]"}`}
                >
                  Published ({teamBlogs.filter(b => b.status === "Published").length})
                </Button>
                <Button
                  variant={blogStatusFilter === "Draft" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setBlogStatusFilter("Draft")}
                  className={`rounded-full text-xs ${blogStatusFilter === "Draft" ? "bg-amber-600 text-white hover:bg-amber-700" : "text-[#8A8A8A]"}`}
                >
                  Drafts ({teamBlogs.filter(b => b.status === "Draft").length})
                </Button>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8A8A]" />
                <Input
                  type="text"
                  placeholder="Search title, category, tags..."
                  value={blogSearchQuery}
                  onChange={e => setBlogSearchQuery(e.target.value)}
                  className="pl-9 text-xs rounded-full bg-[#F6F6F6] border-gray-200"
                />
              </div>
            </div>

            {/* Blogs Table */}
            {dataLoading ? (
              <LoadingCard />
            ) : filteredBlogs.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
                    <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <h4 className="font-bold text-[#3A1F1F] mb-1">No blogs found</h4>
                    <p className="text-xs text-[#8A8A8A] max-w-sm mx-auto mb-4">
                      {blogSearchQuery || blogStatusFilter !== "all"
                        ? "No blogs match your filter criteria."
                        : "Your organization has not created any blogs yet."}
                    </p>
                    <Button
                      onClick={handleOpenCreateBlog}
                      className="bg-[#FF2B2B] hover:bg-[#e02525] rounded-full text-xs"
                    >
                      <Plus className="h-4 w-4 mr-1.5" /> Create First Blog
                    </Button>
                  </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-[#F6F6F6] text-xs text-[#8A8A8A] font-medium uppercase tracking-wide">
                          <th className="text-left px-6 py-3">Blog</th>
                          <th className="text-left px-6 py-3">Category</th>
                          <th className="text-left px-6 py-3">Tags</th>
                          <th className="text-left px-6 py-3">Status</th>
                          <th className="text-left px-6 py-3">Date</th>
                          <th className="text-right px-6 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filteredBlogs.map(blog => (
                          <tr key={blog.id} className="hover:bg-[#FFF8F8] transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {blog.cover_image_url ? (
                                  <img
                                    src={blog.cover_image_url}
                                    alt=""
                                    className="w-12 h-12 rounded-xl object-cover border border-gray-100 flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-xl bg-[#F6F6F6] flex items-center justify-center text-gray-400 flex-shrink-0">
                                    <ImageIcon className="h-5 w-5" />
                                  </div>
                                )}
                                <div className="max-w-xs sm:max-w-md">
                                  <p className="text-sm font-semibold text-[#3A1F1F] line-clamp-1">
                                    {blog.title}
                                  </p>
                                  {blog.summary && (
                                    <p className="text-xs text-[#8A8A8A] line-clamp-1 mt-0.5">
                                      {blog.summary}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant="outline" className="text-xs font-normal text-[#3A1F1F] border-gray-200 bg-gray-50">
                                {blog.category}
                              </Badge>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {Array.isArray(blog.tags) && blog.tags.length > 0 ? (
                                  blog.tags.map((tag, idx) => (
                                    <span key={idx} className="text-[10px] bg-red-50 text-[#FF2B2B] px-2 py-0.5 rounded-full font-medium">
                                      #{tag}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-[#8A8A8A]">—</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {blog.status === "Published" ? (
                                <Badge className="bg-green-100 text-green-700 border-green-200 text-xs gap-1">
                                  <Eye className="h-3 w-3" /> Published
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs gap-1">
                                  <EyeOff className="h-3 w-3" /> Draft
                                </Badge>
                              )}
                            </td>
                            <td className="px-6 py-4 text-xs text-[#8A8A8A]">
                              {fmtDate(blog.published_at || blog.created_at)}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent">
                                  <MoreVertical className="h-4 w-4 text-[#8A8A8A]" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44">
                                  <DropdownMenuItem onClick={() => handleOpenEditBlog(blog)}>
                                    <Edit3 className="h-4 w-4 mr-2" /> Edit Blog
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleTogglePublishStatus(blog)}>
                                    {blog.status === "Published" ? (
                                      <><EyeOff className="h-4 w-4 mr-2 text-amber-600" /> Save as Draft</>
                                    ) : (
                                      <><Eye className="h-4 w-4 mr-2 text-green-600" /> Publish Blog</>
                                    )}
                                  </DropdownMenuItem>
                                  {blog.status === "Published" && (
                                    <DropdownMenuItem onClick={() => window.open(`/blog/${blog.id}`, "_blank")}>
                                      <ExternalLink className="h-4 w-4 mr-2 text-blue-500" /> View Public Page
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setDeleteBlogId(blog.id)}
                                    className="text-red-500 focus:text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" /> Delete Blog
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create / Edit Blog Dialog */}
      <Dialog open={blogModalOpen} onOpenChange={(open) => { if (open) setBlogModalOpen(true); else requestCloseBlogModal(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#3A1F1F]">
              <BookOpen className="h-5 w-5 text-[#FF2B2B]" />
              {editingBlog ? "Edit Blog" : "Create New Blog"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {!canPostBlog && (
              <div className="bg-[#FFF0F0] border border-red-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#5A5A5A]">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="w-5 h-5 text-[#FF2B2B] flex-shrink-0" />
                  <div>
                    <p className="font-bold text-[#3A1F1F]">Profile Incomplete ({blogCompletionScore}% / 60% Required)</p>
                    <p>You must reach at least 60% company profile completion before publishing blogs.</p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => navigate("/recruiter/dashboard/company-profile")}
                  className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-xl text-xs flex-shrink-0 self-start sm:self-auto"
                >
                  Complete Profile
                </Button>
              </div>
            )}

            {blogError && (
              <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl border border-red-100">
                {blogError}
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-[#3A1F1F] block mb-1">
                Blog Title <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={blogTitle}
                onChange={e => setBlogTitle(e.target.value)}
                placeholder="e.g., 10 Strategies for Hiring Top Software Engineers"
                className="rounded-xl bg-[#F6F6F6] border-gray-200"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[#3A1F1F] block mb-1">
                  Category
                </label>
                <select
                  value={blogCategory}
                  onChange={e => setBlogCategory(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[#F6F6F6] border border-gray-200 text-xs font-medium text-[#3A1F1F] focus:outline-none focus:ring-2 focus:ring-[#FF2B2B]"
                >
                  <option value="Career Advice">Career Advice</option>
                  <option value="Hiring Trends">Hiring Trends</option>
                  <option value="Interview Tips">Interview Tips</option>
                  <option value="Employer Tips">Employer Tips</option>
                  <option value="Work Trends">Work Trends</option>
                  <option value="Industry Insights">Industry Insights</option>
                  <option value="Technology & Product">Technology & Product</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#3A1F1F] block mb-1">
                  Tags <span className="text-[#8A8A8A] font-normal">(comma-separated)</span>
                </label>
                <Input
                  type="text"
                  value={blogTags}
                  onChange={e => setBlogTags(e.target.value)}
                  placeholder="e.g., hiring, engineering, recruitment"
                  className="rounded-xl bg-[#F6F6F6] border-gray-200 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#3A1F1F] block mb-1">
                Cover Image <span className="text-red-500">*</span>
              </label>
              <label className="aspect-video max-h-[160px] w-full rounded-xl bg-[#F6F6F6] border border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-red-50 hover:border-red-200 overflow-hidden relative transition-colors">
                {blogCoverUrl ? (
                  <img src={blogCoverUrl} alt="Blog cover preview" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <div className="text-center px-4 py-6">
                    <Upload className="h-7 w-7 text-[#FF2B2B] mx-auto mb-1.5" />
                    <p className="text-xs text-[#8A8A8A]">Upload cover image from device</p>
                    <p className="text-[10px] text-[#A0A0A0] mt-0.5">PNG, JPG, WEBP up to 5MB</p>
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleBlogImageUpload} />
              </label>
              {(blogCoverUrl || blogCoverName) && (
                <div className="flex items-center justify-between gap-2 mt-2">
                  <p className="text-xs text-[#8A8A8A] truncate">{blogCoverName || "Cover image"}</p>
                  <button
                    type="button"
                    onClick={handleRemoveBlogCoverImage}
                    className="text-xs font-medium text-[#FF2B2B] hover:underline flex-shrink-0"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-[#3A1F1F] block mb-1">
                Short Summary / Excerpt <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={2}
                value={blogSummary}
                onChange={e => setBlogSummary(e.target.value)}
                placeholder="Brief 1-2 sentence description summarizing the main takeaways..."
                className="w-full p-3 rounded-xl bg-[#F6F6F6] border border-gray-200 text-xs text-[#3A1F1F] focus:outline-none focus:ring-2 focus:ring-[#FF2B2B]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#3A1F1F] block mb-1">
                Blog Content <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={8}
                value={blogContent}
                onChange={e => setBlogContent(e.target.value)}
                placeholder="Write your detailed blog content here..."
                className="w-full p-3 rounded-xl bg-[#F6F6F6] border border-gray-200 text-xs text-[#3A1F1F] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#FF2B2B]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#3A1F1F] block mb-1.5">
                Publication Status
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[#3A1F1F]">
                  <input
                    type="radio"
                    name="blogStatus"
                    value="Published"
                    checked={blogStatus === "Published"}
                    onChange={() => setBlogStatus("Published")}
                    className="accent-[#FF2B2B]"
                  />
                  Publish Immediately
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[#3A1F1F]">
                  <input
                    type="radio"
                    name="blogStatus"
                    value="Draft"
                    checked={blogStatus === "Draft"}
                    onChange={() => setBlogStatus("Draft")}
                    className="accent-[#FF2B2B]"
                  />
                  Save as Draft
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <Button
                variant="outline"
                className="flex-1 rounded-full"
                onClick={requestCloseBlogModal}
                disabled={blogSaving}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-[#FF2B2B] hover:bg-[#e02525] rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleSaveBlog}
                disabled={blogSaving || (!canPostBlog && blogStatus === "Published")}
              >
                {blogSaving ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</>
                ) : (
                  editingBlog ? "Update Blog" : (blogStatus === "Published" ? "Publish Blog" : "Save Draft")
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Discard Blog Changes Confirmation */}
      <Dialog open={discardBlogConfirmOpen} onOpenChange={setDiscardBlogConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#3A1F1F]">Discard changes?</DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <p className="text-sm text-[#8A8A8A]">
              You have unsaved changes to this blog. Closing now will discard them.
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 rounded-full"
              onClick={() => setDiscardBlogConfirmOpen(false)}
            >
              Keep Editing
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-full"
              onClick={() => { setDiscardBlogConfirmOpen(false); setBlogModalOpen(false); }}
            >
              Discard
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Blog Confirmation Dialog */}
      <Dialog open={!!deleteBlogId} onOpenChange={() => setDeleteBlogId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#3A1F1F] flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" /> Delete Blog
            </DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <p className="text-sm text-[#8A8A8A]">
              Are you sure you want to delete this blog? This action cannot be undone.
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 rounded-full"
              onClick={() => setDeleteBlogId(null)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-full"
              onClick={() => deleteBlogId && handleDeleteBlog(deleteBlogId)}
            >
              Confirm Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation Dialog */}
      <Dialog open={!!removeMemberId} onOpenChange={() => { setRemoveMemberId(null); setRemoveMemberError(""); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#3A1F1F] flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" /> Remove Team Member
            </DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-2">
            <p className="text-sm text-[#8A8A8A]">
              This permanently deletes{" "}
              <strong className="text-[#3A1F1F]">
                {members.find(m => m.id === removeMemberId)?.recruiter_name || "this member"}
              </strong>
              's account — not just their access to your team. They will be signed out
              everywhere and cannot sign back in. This cannot be undone.
            </p>
            {removeMemberError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {removeMemberError}
              </p>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 rounded-full"
              onClick={() => { setRemoveMemberId(null); setRemoveMemberError(""); }}
              disabled={actionLoading === removeMemberId}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-full"
              onClick={() => removeMemberId && handleRemoveMember(removeMemberId)}
              disabled={actionLoading === removeMemberId}
            >
              {actionLoading === removeMemberId ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Delete Account
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#3A1F1F]">
              <Send className="h-5 w-5 text-[#FF2B2B]" /> Invite Team Member
            </DialogTitle>
          </DialogHeader>

          {inviteSuccess ? (
            <div className="py-8 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="font-semibold text-[#3A1F1F]">Invitation Sent!</p>
              <p className="text-sm text-[#8A8A8A] mt-1">
                An invite email has been sent to <strong>{inviteEmail || "the recipient"}</strong>.
              </p>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div>
                <p className="text-sm text-[#8A8A8A] mb-4">
                  The invitee will receive an email with a secure link to join{" "}
                  <strong>{recruiterProfile?.company_name}</strong> as a team member.
                </p>
                <label className="text-sm font-medium text-[#3A1F1F] block mb-1.5">
                  Email address
                </label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={e => { setInviteEmail(e.target.value); setInviteError(""); }}
                  placeholder="colleague@company.com"
                  className="rounded-xl bg-[#F6F6F6] border-gray-200"
                  onKeyDown={e => e.key === "Enter" && handleInvite()}
                />
                {inviteError && (
                  <p className="text-red-500 text-xs mt-2">{inviteError}</p>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-[#8A8A8A] bg-[#F6F6F6] rounded-xl p-3">
                <Building2 className="h-4 w-4 flex-shrink-0" />
                <span>
                  Seats: {activeCount + pendingInvitations.length} of {maxSeats} used
                  {maxSeats - activeCount - pendingInvitations.length <= 0 && (
                    <span className="text-red-500 font-medium ml-1">— Seat limit reached</span>
                  )}
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 rounded-full"
                  onClick={() => { setInviteOpen(false); setInviteEmail(""); setInviteError(""); }}
                  disabled={inviteLoading}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-[#FF2B2B] hover:bg-[#e02525] rounded-full"
                  onClick={handleInvite}
                  disabled={inviteLoading || !inviteEmail.trim()}
                >
                  {inviteLoading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending…</>
                  ) : (
                    <><Send className="h-4 w-4 mr-2" /> Send Invite</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({
  icon, label, value, sub, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-5 shadow-sm border border-gray-100 ${onClick ? "hover:shadow-md cursor-pointer transition-all duration-200 active:scale-[0.98]" : ""
        }`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl bg-[#F6F6F6] flex items-center justify-center">
          {icon}
        </div>
        <span className="text-xs text-[#8A8A8A] font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-[#3A1F1F]">{value}</p>
      <p className="text-xs text-[#8A8A8A] mt-0.5">{sub}</p>
    </div>
  );
}

function AnalyticsCard({
  label, value, color, onClick,
}: {
  label: string;
  value: number | string;
  color: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-5 shadow-sm border border-gray-100 ${onClick ? "hover:shadow-md cursor-pointer transition-all duration-200 active:scale-[0.98]" : ""
        }`}
    >
      <p className="text-xs text-[#8A8A8A] font-medium mb-2">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="bg-white rounded-2xl p-12 flex items-center justify-center shadow-sm">
      <div className="text-center">
        <Loader2 className="h-8 w-8 text-[#FF2B2B] animate-spin mx-auto mb-3" />
        <p className="text-sm text-[#8A8A8A]">Loading…</p>
      </div>
    </div>
  );
}
