import { useState, useMemo, useEffect, useCallback, useRef, type MouseEvent as ReactMouseEvent } from "react";
import { useNavigate, Routes, Route, Link, useLocation } from "react-router";
import { supabase, Job as DBJob, Notification } from "../../lib/supabase";
import { formatJobSalary, isJobVisibleToSeekers } from "../../lib/jobs";
import { recordJobInteraction, recordJobSearch } from "../../lib/jobRecommendations";
import { SKILL_OPTIONS, skillsMatch } from "../../lib/skillKeywords";
import { useAuth } from "../../lib/auth-context";
import AppliedJobsSection from "../components/AppliedJobsSection";
import ResumePreviewDialog, { getStorageObjectFromUrl, buildPreviewUrl } from "../components/ResumePreviewDialog";
import {
  Bell, LogOut, Search, MapPin, DollarSign, Briefcase, Filter, Bookmark,
  User, BarChart3, Lightbulb, Upload, Plus, X, Pencil, Trash2,
  GraduationCap, Award, Globe, Phone, Mail, Camera, Clock, CheckCircle,
  TrendingUp, ArrowRight, Loader2, Check, ChevronsUpDown, FileText,
  Eye, Download,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Calendar } from "../components/ui/calendar";
import { SafeHtml } from "../components/ui/safe-html";
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
import FeedbackPopup from "../components/FeedbackPopup";
import SavedJobsSection from "../components/SavedJobsSection";
import { fetchGeminiInsights, type GeminiInsightsResult } from "../services/geminiSkillsService";
import { AppliedJobWithJob, SavedJobWithJob, getAppliedJobs, getSavedJobs } from "../services/jobService";
import SavedJobsComparePage from "./SavedJobsComparePage";
import JobShareButton from "../components/JobShareButton";
import logoImage from "../../logo/logo.png";

// ── Types ──────────────────────────────────────────────────────────────────────
interface DashboardDisplayJob {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  salaryMin: number;
  type: "Full-time" | "Part-time" | "Contract";
  interviewMode?: string;
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
type EducationForm = Omit<Education, "id"> & { customField?: string };
interface Project {
  id: number; name: string; url: string; startYear: string; endYear: string; description: string;
}
interface Certification {
  id: number; name: string; issuer: string; issueDate: string; expiryDate: string; noExpiry: boolean; credentialId: string;
}
interface Language { id: number; language: string; proficiency: string; }
interface OfferPanelDetails {
  offer_message: string;
  offer_letter_name: string | null;
  offer_letter_url: string | null;
  offer_letter_path: string | null;
  sent_at: string | null;
}

function firstTrimmedValue(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }

  return "";
}

function deriveOfferFileName(details: OfferPanelDetails | null, job: AppliedJobWithJob | null): string {
  const explicitName = firstTrimmedValue(details?.offer_letter_name, job?.offer_details?.offer_letter_name);
  if (explicitName) return explicitName;

  const fromPath = firstTrimmedValue(details?.offer_letter_path, job?.offer_details?.offer_letter_path);
  if (fromPath) {
    const segments = fromPath.split("/");
    const fileName = segments[segments.length - 1];
    if (fileName) return fileName;
  }

  const fromUrl = firstTrimmedValue(details?.offer_letter_url, job?.offer_details?.offer_letter_url);
  if (fromUrl) {
    const cleanUrl = fromUrl.split("?")[0].split("#")[0];
    const segments = cleanUrl.split("/");
    const fileName = segments[segments.length - 1];
    if (fileName) return fileName;
  }

  return "offer-letter.pdf";
}

function canInlinePreviewOfferFile(fileName: string): boolean {
  const normalized = (fileName || "").toLowerCase().trim();
  return [
    ".pdf", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".txt",
    ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ].some((ext) => normalized.endsWith(ext));
}

function getOfferPreviewSrc(url: string, fileName: string): string {
  const normalized = (fileName || "").toLowerCase().trim();
  const officeExt = [".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"];
  if (officeExt.some((ext) => normalized.endsWith(ext))) {
    // Prefer Office Web Viewer for Office documents; it is generally more reliable in iframes.
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
  }
  if (normalized.endsWith(".txt") || normalized.endsWith(".csv")) {
    return url;
  }
  return url;
}

function isOfficeOfferFile(fileName: string): boolean {
  const normalized = (fileName || "").toLowerCase().trim();
  return [".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"].some((ext) => normalized.endsWith(ext));
}

function extractOfferField(rawMessage: string, field: "name" | "url" | "path"): string | null {
  const patterns: Record<typeof field, RegExp> = {
    name: /^offer letter:\s*(.+)$/im,
    url: /^offer letter url:\s*(.+)$/im,
    path: /^offer letter path:\s*(.+)$/im,
  };
  const match = (rawMessage || "").match(patterns[field]);
  if (!match?.[1]) return null;
  const value = match[1].trim();
  if (!value || value.toLowerCase() === "n/a") return null;
  return value;
}

function extractOfferMessageText(rawMessage: string): string {
  const lines = (rawMessage || "").split("\n");
  const separatorIndex = lines.findIndex((line) => line.trim() === "");
  if (separatorIndex >= 0) return lines.slice(separatorIndex + 1).join("\n").trim();
  return (rawMessage || "")
    .replace(/^status:.*$/gim, "")
    .replace(/^company:.*$/gim, "")
    .replace(/^updated:.*$/gim, "")
    .replace(/^offer letter:.*$/gim, "")
    .replace(/^offer letter url:.*$/gim, "")
    .replace(/^offer letter path:.*$/gim, "")
    .trim();
}

function renderNotificationMessage(message: string) {
  const sanitizedMessage = (message || "")
    .split("\n")
    .filter((line) => !/^offer letter (url|path):/i.test(line.trim()))
    .join("\n");

  const linkRegex = /(https?:\/\/[^\s]+)/gi;
  const lines = sanitizedMessage.split("\n");

  const getLinkLabel = (url: string) => {
    try {
      const parsed = new URL(url);
      const fileName = parsed.pathname.split("/").pop();
      if (fileName) return `Open ${decodeURIComponent(fileName)}`;
      return `Open ${parsed.hostname}`;
    } catch {
      return "Open link";
    }
  };

  return lines.map((line, lineIndex) => {
    const parts = line.split(linkRegex);
    return (
      <span key={`line-${lineIndex}`} className="block">
        {parts.map((part, partIndex) => {
          const isLink = /^https?:\/\/[^\s]+$/i.test(part);
          if (!isLink) return <span key={`part-${lineIndex}-${partIndex}`}>{part}</span>;
          return (
            <a
              key={`part-${lineIndex}-${partIndex}`}
              href={part}
              target="_blank"
              rel="noreferrer"
              className="text-[#FF2B2B] underline underline-offset-2 break-words"
            >
              {getLinkLabel(part)}
            </a>
          );
        })}
      </span>
    );
  });
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

function extractRecommendationTerms(profile: any): string[] {
  return (Array.isArray(profile?.skills) ? profile.skills : [])
    .filter((value: unknown): value is string => typeof value === "string")
    .map((value: string) => value.trim().toLowerCase())
    .filter((value: string) => value.length >= 2);
}

function normalizeSkillTokens(skills: string[]): Set<string> {
  const tokens = new Set<string>();
  skills.forEach((skill) => {
    const normalized = skill.toLowerCase().trim();
    if (!normalized) return;
    tokens.add(normalized);
    normalized
      .split(/[^a-z0-9+#.]+/i)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2)
      .forEach((token) => tokens.add(token));
  });
  return tokens;
}

function expandSkillPhrases(skills: string[]): string[] {
  return Array.from(
    new Set(
      skills
        .flatMap((skill) =>
          skill
            .split(/[,\n;/|]+/)
            .map((part) => part.trim().toLowerCase())
            .filter((part) => part.length >= 2)
        )
    )
  );
}

function normalizeSkillPhrase(value: string): string {
  return value
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9+#.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseLocalDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function normalizeDateValue(value: string): string {
  const date = parseLocalDate(value);
  return date ? toIsoDate(date) : "";
}

function formatDateDisplay(value: string): string {
  const date = parseLocalDate(value);
  if (!date) return value;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function profileMatchesJdSkill(profileSkill: string, jdSkill: string): boolean {
  if (skillsMatch(profileSkill, jdSkill)) return true;

  const p = normalizeSkillPhrase(profileSkill);
  const j = normalizeSkillPhrase(jdSkill);
  if (!p || !j) return false;
  if (p === j || p.includes(j) || j.includes(p)) return true;

  const pTokens = p.split(" ").filter((t) => t.length >= 2);
  const jTokens = j.split(" ").filter((t) => t.length >= 2);
  if (pTokens.length === 0 || jTokens.length === 0) return false;

  const pSet = new Set(pTokens);
  const overlap = jTokens.filter((t) => pSet.has(t)).length;
  return overlap >= Math.min(2, jTokens.length);
}

function getJdSkillMatchPercentage(job: DBJob, profileSkills: string[]): number {
  const normalizedProfileSkills = Array.from(
    new Set(
      profileSkills
        .map((skill) => skill.trim().toLowerCase())
        .filter((skill) => skill.length >= 2)
    )
  );
  if (normalizedProfileSkills.length === 0) return 0;

  const rawJobSkills = (job.skills || [])
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0);
  const jobSkills = expandSkillPhrases(rawJobSkills);
  if (jobSkills.length === 0) return 0;

  let matchedJdSkills = 0;
  for (const jdSkill of jobSkills) {
    const matched = normalizedProfileSkills.some((profileSkill) => profileMatchesJdSkill(profileSkill, jdSkill));
    if (matched) matchedJdSkills += 1;
  }

  return Math.round((matchedJdSkills / jobSkills.length) * 100);
}

function getMatchBadgeClass(matchPercentage: number): string {
  if (matchPercentage >= 70) return "bg-green-100 text-green-700";
  if (matchPercentage >= 40) return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-700";
}

function isRecommendedJobForProfile(job: DBJob, recommendationTerms: string[]): boolean {
  if (recommendationTerms.length === 0) return false;

  const uniqueProfileSkills = Array.from(
    new Set(
      recommendationTerms
        .map((value) => value.trim().toLowerCase())
        .filter((value) => value.length >= 2)
    )
  );

  const rawJobSkills = (job.skills || [])
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0);

  const jobSkills = expandSkillPhrases(rawJobSkills);
  if (jobSkills.length === 0) return false;

  let matchedJdSkillCount = 0;
  for (const jdSkill of jobSkills) {
    const hasMatch = uniqueProfileSkills.some((profileSkill) => profileMatchesJdSkill(profileSkill, jdSkill));
    if (hasMatch) matchedJdSkillCount += 1;
    if (matchedJdSkillCount >= 3) return true;
  }

  return false;
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const YEARS = Array.from({ length: 17 }, (_, i) => String(2010 + i));
const JOBS_PER_PAGE = 12;
type EducationCatalog = Record<string, string[]>;

const EDUCATION_CATALOG_API_URL = "https://gist.githubusercontent.com/shoaibmarif/5a303afd2f074c20a7dff0a21f7a5992/raw/TypeofDegree.json";
const DEFAULT_EDUCATION_DEGREE_OPTIONS = ["Not Educated"];
const DEFAULT_EDUCATION_SPECIALIZATION_OPTIONS: EducationCatalog = {
  "Not Educated": [],
};

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function normalizeApiDegreeName(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/^Bachelor of Technology$/i, "B.Tech / B.E.")
    .replace(/^Bachelor of Engineering$/i, "B.Tech / B.E.")
    .replace(/^Master of Technology$/i, "M.Tech / M.E.")
    .replace(/^Master of Engineering$/i, "M.Tech / M.E.")
    .trim();
}

async function fetchEducationCatalog(): Promise<{ degreeOptions: string[]; specializationOptions: EducationCatalog }> {
  const response = await fetch(EDUCATION_CATALOG_API_URL);
  if (!response.ok) throw new Error("Unable to load education catalog");

  const apiDegrees = (await response.json() as Array<{ degree?: string }>)
    .map((item) => normalizeApiDegreeName(item.degree || ""))
    .filter(Boolean);

  const specializationOptions: EducationCatalog = { ...DEFAULT_EDUCATION_SPECIALIZATION_OPTIONS };
  for (const degree of apiDegrees) {
    if (!specializationOptions[degree]) specializationOptions[degree] = [];
  }

  return {
    degreeOptions: uniqueStrings([...DEFAULT_EDUCATION_DEGREE_OPTIONS, ...apiDegrees]),
    specializationOptions,
  };
}

const DEFAULT_RECOMMENDATION_FETCH_LIMIT = 120;
const JOBS_QUERY_TIMEOUT_MS = 12000;
const PROFILE_SKILL_OPTIONS = SKILL_OPTIONS;

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([Promise.resolve(promise), timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

function splitPreferredJobTitles(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((title) => title.trim())
        .filter(Boolean)
    )
  );
}

function joinPreferredJobTitles(titles: string[]): string {
  return titles.map((title) => title.trim()).filter(Boolean).join(", ");
}

type PreferredJobSuggestion = {
  title: string;
  openings: number;
  companies: string[];
  departments: string[];
};

function escapeLikeValue(value: string): string {
  return value.replace(/[%_,]/g, (match) => `\\${match}`);
}

function buildDashboardJob(job: DBJob): DashboardDisplayJob {
  return {
    id: job.id,
    title: job.title,
    company: job.company_name,
    location: formatDashboardLocation(job),
    salary: formatJobSalary(job),
    salaryMin: job.salary_min || 0,
    type: formatDashboardType(job) as "Full-time" | "Part-time" | "Contract",
    interviewMode: job.interview_mode || undefined,
    description: formatDashboardDescription(job),
    industry: job.industry || "",
    experience: "",
    isRemote: job.work_mode === "Work from Home",
    isDB: true,
    dbJob: job,
  };
}

const PREFERRED_INTERVIEW_MODE_OPTIONS = ["In-Person", "Video Call", "Telephonic", "Walk-in"];

function normalizeInterviewModes(raw: any): string[] {
  if (raw == null) return [];

  let values: string[] = [];

  if (Array.isArray(raw)) {
    values = raw.map((x) => (x == null ? "" : String(x)));
  } else if (typeof raw === "object") {
    const numericKeys = Object.keys(raw).filter((key) => /^\d+$/.test(key));
    if (numericKeys.length > 0) {
      values = numericKeys
        .map((key) => ({ key: Number(key), value: raw[key] }))
        .sort((a, b) => a.key - b.key)
        .map((item) => item.value == null ? "" : String(item.value));
    } else {
      values = Object.values(raw).map((x) => (x == null ? "" : String(x)));
    }
  } else {
    const str = String(raw).trim();
    if (!str) return [];
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) return normalizeInterviewModes(parsed);
    } catch {
      const bracketed = str.replace(/^\{|\}$/g, "");
      return bracketed.split(",").map((s) => s.trim()).filter(Boolean);
    }
    values = [str];
  }

  const normalized = values
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/^\[|\]$/g, "").replace(/^"|"$/g, "").trim());

  const normalizedKnown = normalized
    .map((value) => {
      const match = PREFERRED_INTERVIEW_MODE_OPTIONS.find(
        (option) => option.toLowerCase() === value.toLowerCase()
      );
      return match ?? value;
    })
    .filter(Boolean);

  const uniqueValues = Array.from(new Set(normalizedKnown));
  const filtered = uniqueValues.filter((value) => PREFERRED_INTERVIEW_MODE_OPTIONS.includes(value));
  return filtered.length > 0 ? filtered : uniqueValues;
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

  // Derive active tab from URL so it stays in sync with programmatic navigate()
  const location = useLocation();
  const activeTab = location.pathname.includes("/profile") ? "profile"
    : location.pathname.includes("/analytics") ? "analytics"
    : location.pathname.includes("/insights") ? "insights"
    : "find-job";

  // On root dashboard path: check profile completion and redirect to profile page if incomplete.
  // Uses a loading gate so the user never sees a flash of the Find a Job page.
  const completionCheckRef = useRef(false);
  const isRootPath = location.pathname === "/jobseeker/dashboard" || location.pathname === "/jobseeker/dashboard/";
  const [checkingCompletion, setCheckingCompletion] = useState(isRootPath);

  useEffect(() => {
    if (authLoading || !profile || !user || completionCheckRef.current) return;
    completionCheckRef.current = true;
    if (!isRootPath) { setCheckingCompletion(false); return; }
    const pid = profile.id;
    (async () => {
      const [expRes, eduRes, projRes, certRes] = await Promise.all([
        supabase.from("work_experience").select("id", { count: "exact", head: true }).eq("profile_id", pid),
        supabase.from("education").select("id", { count: "exact", head: true }).eq("profile_id", pid),
        supabase.from("projects").select("id", { count: "exact", head: true }).eq("profile_id", pid),
        supabase.from("certifications").select("id", { count: "exact", head: true }).eq("profile_id", pid),
      ]);
      let score = 0;
      const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ");
      score += Math.round(([name, profile.phone, profile.email, profile.location].filter(Boolean).length / 4) * 15);
      if ((profile.about || "").trim().length > 20) score += 10;
      score += Math.min(10, Math.round(((profile.skills?.length || 0) / 3) * 10));
      if ((expRes.count || 0) > 0) score += 20;
      if ((eduRes.count || 0) > 0) score += 15;
      if ((projRes.count || 0) > 0) score += 5;
      if ((certRes.count || 0) > 0) score += 5;
      if (profile.resume_url) score += 10;
      const p = profile as any;
      score += Math.round(([p.expected_salary, p.notice_period].filter(Boolean).length / 2) * 10);
      setCheckingCompletion(false);
      if (Math.min(100, score) < 100) navigate("/jobseeker/dashboard/profile", { replace: true });
    })();
  }, [authLoading, profile, user, navigate, isRootPath]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profilePrefsHasUnsavedChanges, setProfilePrefsHasUnsavedChanges] = useState(false);

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

  const getJobSeekerNotificationPath = useCallback((notification: Notification): string => {
    const text = `${notification.type} ${notification.title || ""} ${notification.message || ""}`.toLowerCase();

    if (notification.job_id && (notification.type === "job_alert" || text.includes("recommended"))) {
      return `/job/${notification.job_id}`;
    }

    if (
      notification.type === "status_change" ||
      text.includes("application status") ||
      text.includes("interview") ||
      text.includes("offer")
    ) {
      return "/jobseeker/dashboard/analytics";
    }

    if (text.includes("profile")) {
      return "/jobseeker/dashboard/profile";
    }

    if (notification.type === "job_alert" || text.includes("recommended") || text.includes("job alert")) {
      return "/jobseeker/dashboard";
    }

    return "/jobseeker/dashboard";
  }, []);

  const handleNotificationClick = useCallback(async (notification: Notification) => {
    if (profile?.id && !notification.is_read) {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notification.id)
        .eq("user_id", profile.id)
        .eq("user_type", "jobseeker");
    }

    setNotificationsOpen(false);
    fetchNotifications();
    navigate(getJobSeekerNotificationPath(notification));
  }, [fetchNotifications, getJobSeekerNotificationPath, navigate, profile?.id]);

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

  const handleDashboardLinkClick = (event: ReactMouseEvent<HTMLAnchorElement>, to: string) => {
    if (activeTab === "profile" && profilePrefsHasUnsavedChanges && to !== "/jobseeker/dashboard/profile") {
      const confirmed = window.confirm("You have unsaved preferred job settings. Leave this page without saving?");
      if (!confirmed) {
        event.preventDefault();
      }
    }
  };

  const googleMeta = user?.user_metadata || {};
  const googleFullName = googleMeta.full_name || googleMeta.name || "";
  const headerFirstName = profile?.first_name || googleMeta.first_name || googleFullName.split(" ")[0] || "";
  const headerLastName = profile?.last_name || googleMeta.last_name || googleFullName.split(" ").slice(1).join(" ") || "";
  const headerAvatar = profile?.avatar_url || googleMeta.avatar_url || googleMeta.picture || null;
  const userInitials = (headerFirstName || headerLastName)
    ? `${headerFirstName[0] || ""}${headerLastName[0] || ""}`.toUpperCase()
    : (user?.email?.[0] || "U").toUpperCase();

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

  // Show spinner while checking profile completion (only on root path)
  if (checkingCompletion) {
    return (
      <div className="min-h-screen bg-[#F6F6F6] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#FF2B2B] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[#8A8A8A] text-sm">Setting up your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F6F6]">
      <FeedbackPopup
        userId={user.id}
        userType="jobseeker"
        userEmail={user.email}
        autoOpenKey="jobseeker-dashboard"
      />

      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/jobseeker/dashboard")}>
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
                <Link key={tab} to={to} onClick={(event) => handleDashboardLinkClick(event, to)}>
                  <Button
                    variant={activeTab === tab ? "default" : "ghost"}
                    className={activeTab === tab ? "bg-[#FF2B2B] hover:bg-[#e02525] rounded-full" : "rounded-full"}
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
                          <div key={n.id} onClick={() => handleNotificationClick(n)} className={`p-3 rounded-lg cursor-pointer ${!n.is_read ? "bg-red-50" : "bg-[#F6F6F6]"}`}>
                            <p className="text-sm font-medium text-[#3A1F1F]">{n.title}</p>
                            <p className="text-xs text-[#8A8A8A] whitespace-pre-wrap break-words">{renderNotificationMessage(n.message)}</p>
                            <p className="text-xs text-[#BABABA] mt-0.5">{new Date(n.created_at).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {(profile || user) && (
                <div className="w-8 h-8 rounded-full overflow-hidden cursor-pointer flex-shrink-0" title={`${headerFirstName} ${headerLastName}`.trim()}>
                  {headerAvatar ? (
                    <img src={headerAvatar} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full bg-[#FF2B2B] flex items-center justify-center text-white text-xs font-bold">
                      {userInitials}
                    </div>
                  )}
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
        <Route path="saved-jobs/compare" element={<SavedJobsComparePage />} />
        <Route path="profile" element={<ProfilePage onPendingPrefsChange={setProfilePrefsHasUnsavedChanges} />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="insights" element={<InsightsPage />} />
      </Routes>
    </div>
  );
}

// ── Find a Job ─────────────────────────────────────────────────────────────────
function FindJobPage() {
  const { profile } = useAuth();
  const userId = profile?.id;
  const profileSkills = Array.isArray(profile?.skills)
    ? profile.skills.filter((value): value is string => typeof value === "string")
    : [];
  const profileSkillKey = profileSkills.map((skill) => skill.trim().toLowerCase()).sort().join("|");
  const preferredInterviewModeKey = normalizeInterviewModes(profile?.preferred_interview_mode).join("|");
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
    if (userId) {
      supabase.from("applications").select("job_id").eq("profile_id", userId).then(({ data }) => {
        if (data) {
          const ids = data
            .map((application) => application.job_id)
            .filter((jobId): jobId is string => typeof jobId === "string" && jobId.length > 0);
          setAppliedJobIds(ids);
        }
      });
      supabase.from("saved_jobs").select("job_id").eq("profile_id", userId).then(({ data }) => {
        if (data) {
          const ids = data
            .map((savedJob) => savedJob.job_id)
            .filter((jobId): jobId is string => typeof jobId === "string" && jobId.length > 0);
          setSavedJobIds(ids);
        }
      });
    }
  }, [userId]);

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
      const shouldShowOnlyRecommended =
        !trimmedSearch &&
        !selectedChip &&
        !locationFilter &&
        !experienceFilter &&
        !salaryFilter &&
        !industryFilter &&
        !jobTypeFilter &&
        !remoteFilter;

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

      const preferredInterviewModes = normalizeInterviewModes(profile?.preferred_interview_mode);
      if (preferredInterviewModes.length > 0) {
        query = query.in("interview_mode", preferredInterviewModes);
      }

      if (locationFilter === "bengaluru") query = query.ilike("location", "%Bengaluru%");
      if (locationFilter === "mumbai") query = query.ilike("location", "%Mumbai%");
      if (locationFilter === "hyderabad") query = query.ilike("location", "%Hyderabad%");
      if (locationFilter === "delhi") query = query.ilike("location", "%Delhi%");
      if (locationFilter === "pune") query = query.ilike("location", "%Pune%");

      if (experienceFilter === "entry") query = query.lte("experience_min", 1);
      if (experienceFilter === "mid") query = query.gte("experience_min", 2).lte("experience_min", 5);
      if (experienceFilter === "senior") query = query.gte("experience_min", 5);

      if (salaryFilter === "0-10") query = query.lt("salary_min", 10);
      if (salaryFilter === "10-25") query = query.gte("salary_min", 10).lt("salary_min", 25);
      if (salaryFilter === "25+") query = query.gte("salary_min", 25);

      if (industryFilter === "healthcare") query = query.ilike("industry", "%Healthcare%");
      if (industryFilter === "finance") query = query.ilike("industry", "%BFSI%");
      if (industryFilter === "media") query = query.ilike("industry", "%Media%");
      if (industryFilter === "tech") query = query.or("industry.ilike.%IT / Software%,industry.ilike.%E-commerce%,industry.ilike.%Consulting%");
      if (industryFilter === "marketing") query = query.or("industry.ilike.%Consulting%,industry.ilike.%Media%");
      if (industryFilter === "design") query = query.ilike("department", "%Design%");

      const from = (currentPage - 1) * JOBS_PER_PAGE;
      const to = from + JOBS_PER_PAGE - 1;
      const orderedQuery = query.order("created_at", { ascending: false });

      const { data, error, count } = await withTimeout(
        shouldShowOnlyRecommended ? orderedQuery.limit(DEFAULT_RECOMMENDATION_FETCH_LIMIT) : orderedQuery.range(from, to),
        JOBS_QUERY_TIMEOUT_MS,
        "Jobs request timed out",
      ).catch((error) => {
        console.error("Unable to load jobs:", error);
        return { data: null, error, count: 0 };
      });

      if (cancelled) return;

      if (error) {
        setJobsError("Unable to load jobs right now.");
        setDbJobs([]);
        setTotalJobsCount(0);
        setJobsLoading(false);
        return;
      }

      const visibleJobs = (data || []).filter((job) => isJobVisibleToSeekers(job));

      if (shouldShowOnlyRecommended) {
        const recommendationTerms = profileSkills
          .map((skill) => skill.trim().toLowerCase())
          .filter((skill) => skill.length >= 2);
        const recommendedJobs = visibleJobs.filter((job) => isRecommendedJobForProfile(job, recommendationTerms));
        const pagedRecommendedJobs = recommendedJobs.slice(from, to + 1);
        setDbJobs(pagedRecommendedJobs);
        setTotalJobsCount(recommendedJobs.length);
      } else {
        setDbJobs(visibleJobs);
        setTotalJobsCount(count || 0);
      }

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
    profileSkillKey,
    preferredInterviewModeKey,
  ]);

  const handleApply = async (job: DBJob) => {
    if (!userId) return;
    if (appliedJobIds.includes(job.id)) return;
    if (!isJobVisibleToSeekers(job)) return;
    setApplyingId(job.id);
    try {
      await supabase.from("applications").insert({
        job_id: job.id,
        profile_id: userId,
        recruiter_id: job.recruiter_id,
        status: "New",
        resume_url: profile.resume_url,
      });
      recordJobInteraction(job, userId);
      setAppliedJobIds(prev => [...prev, job.id]);
    } finally {
      setApplyingId(null);
    }
  };

  const handleSave = async (job: DBJob) => {
    if (!userId) return;
    if (savedJobIds.includes(job.id)) {
      await supabase.from("saved_jobs").delete().eq("profile_id", userId).eq("job_id", job.id);
      setSavedJobIds(prev => prev.filter(id => id !== job.id));
    } else {
      await supabase.from("saved_jobs").insert({ profile_id: userId, job_id: job.id });
      recordJobInteraction(job, userId);
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
                options: [["0-10","0-10 LPA"],["10-25","10-25 LPA"],["25+","25+ LPA"]] },
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
                  const matchPercentage = job.isDB ? getJdSkillMatchPercentage(job.dbJob, profileSkills) : 0;
                  const matchBadgeClass = getMatchBadgeClass(matchPercentage);
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
                      <JobShareButton jobId={String(job.id)} title={job.title} className="absolute right-4 top-4" />
                      {job.isDB && (
                        <div className={`absolute top-3 right-16 text-center rounded-xl px-2 py-1 min-w-[44px] ${matchBadgeClass}`}>
                          <div className="text-sm font-bold leading-none">{matchPercentage}%</div>
                          <div className="text-[10px] font-medium leading-tight mt-0.5 opacity-80">match</div>
                        </div>
                      )}
                      <p className="text-xs text-[#8A8A8A] mb-0.5 pr-24">{job.company}</p>
                      <h3 className="font-bold text-[#3A1F1F] text-lg mb-2 leading-snug pr-24">{job.title}</h3>
                      <p className="text-[#8A8A8A] text-sm mb-3 line-clamp-2 flex-1">{stripHtml(job.description)}</p>
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
                  {selectedJob.interviewMode ? (
                    <div>
                      <p className="text-xs text-[#8A8A8A] mb-0.5">Interview Mode</p>
                      <p className="font-semibold text-[#3A1F1F] text-sm">{selectedJob.interviewMode}</p>
                    </div>
                  ) : null}
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
                <SafeHtml
                  content={selectedJob.description}
                  className="text-[#8A8A8A] text-sm leading-relaxed mb-5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:mt-1.5 [&_h3]:mb-1 [&_a]:text-[#FF2B2B] [&_a]:underline"
                />

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
function ProfilePage({ onPendingPrefsChange }: { onPendingPrefsChange?: (pending: boolean) => void }) {
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
  const [dobPickerOpen, setDobPickerOpen] = useState(false);

  // Summary
  const [summary, setSummary] = useState("");
  const [editingSummary, setEditingSummary] = useState(false);
  const [summaryForm, setSummaryForm] = useState(summary);

  // Skills
  const [skills, setSkills] = useState<string[]>([]);
  const [showSkillInput, setShowSkillInput] = useState(false);
  const [skillPickerOpen, setSkillPickerOpen] = useState(false);
  const [skillSearch, setSkillSearch] = useState("");
  const skillFieldRef = useRef<HTMLDivElement>(null);
  const [preferredJobPickerOpen, setPreferredJobPickerOpen] = useState(false);
  const [preferredJobSearch, setPreferredJobSearch] = useState("");
  const [preferredJobOptions, setPreferredJobOptions] = useState<string[]>([]);
  const [preferredJobOptionsLoading, setPreferredJobOptionsLoading] = useState(false);
  const [preferredJobOptionsError, setPreferredJobOptionsError] = useState("");
  const preferredJobFieldRef = useRef<HTMLDivElement>(null);

  // Sync profile data from DB when it loads, fallback to user metadata
  useEffect(() => {
    const meta = user?.user_metadata || {};
    // Google OAuth provides full_name/name instead of split first_name/last_name
    const googleFullName = meta.full_name || meta.name || "";
    const googleFirstName = googleFullName ? googleFullName.split(" ")[0] : "";
    const googleLastName = googleFullName ? googleFullName.split(" ").slice(1).join(" ") : "";
    const firstName = profile?.first_name || meta.first_name || googleFirstName;
    const lastName = profile?.last_name || meta.last_name || googleLastName;
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
    const googleAvatar = meta.avatar_url || meta.picture || "";
    if (profile?.avatar_url) setProfilePic(profile.avatar_url);
    else if (googleAvatar) setProfilePic(googleAvatar);
    if (profile?.resume_url) setResumeFile(profile.resume_url);
    if (profile?.about) { setSummary(profile.about); setSummaryForm(profile.about); }
    setSkills(profile?.skills ?? []);
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
        preferredInterviewMode: normalizeInterviewModes(p.preferred_interview_mode),
      };
      setPreferences(prefs);
      setPrefsForm(profile.id ? loadPrefsDraft(profile.id, prefs) : prefs);
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
  const emptyEdu: EducationForm = { degree: "", field: "", college: "", startYear: "2016", endYear: "2020", score: "", customField: "" };
  const [education, setEducation] = useState<Education[]>([]);
  const [showAddEdu, setShowAddEdu] = useState(false);
  const [editingEduId, setEditingEduId] = useState<string | null>(null);
  const [eduForm, setEduForm] = useState<EducationForm>(emptyEdu);
  const [educationDegreeOptions, setEducationDegreeOptions] = useState(DEFAULT_EDUCATION_DEGREE_OPTIONS);
  const [educationSpecializationOptions, setEducationSpecializationOptions] = useState<EducationCatalog>(DEFAULT_EDUCATION_SPECIALIZATION_OPTIONS);

  useEffect(() => {
    let isMounted = true;
    fetchEducationCatalog()
      .then(({ degreeOptions, specializationOptions }) => {
        if (!isMounted) return;
        setEducationDegreeOptions(degreeOptions);
        setEducationSpecializationOptions(specializationOptions);
      })
      .catch(() => {
        if (!isMounted) return;
        setEducationDegreeOptions(DEFAULT_EDUCATION_DEGREE_OPTIONS);
        setEducationSpecializationOptions(DEFAULT_EDUCATION_SPECIALIZATION_OPTIONS);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Load work experience and education from DB
  useEffect(() => {
    if (!profile?.id) return;

    const loadProfileSections = async () => {
      const { data: workExperienceData, error: workExperienceError } = await supabase
        .from("work_experience")
        .select("*")
        .eq("profile_id", profile.id)
        .order("created_at", { ascending: false });

      if (workExperienceError) {
        console.error("Error loading work experience:", workExperienceError.message);
      } else if (workExperienceData && workExperienceData.length > 0) {
        setExperiences(workExperienceData.map(e => {
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

      const { data: educationData, error: educationError } = await supabase
        .from("education")
        .select("*")
        .eq("profile_id", profile.id)
        .order("created_at", { ascending: false });

      if (educationError) {
        console.error("Error loading education:", educationError.message);
      } else if (educationData && educationData.length > 0) {
        setEducation(educationData.map(e => ({
          id: e.id, degree: e.degree, field: e.field || "",
          college: e.institution, startYear: e.start_year || "",
          endYear: e.end_year || "", score: e.score || "",
        })));
      }

      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .eq("profile_id", profile.id)
        .order("created_at", { ascending: false });

      if (projectsError) {
        console.error("Error loading projects:", projectsError.message);
      } else if (projectsData && projectsData.length > 0) {
        setProjects(projectsData.map(p => ({
          id: p.id, name: p.name, url: p.url || "",
          startYear: p.start_year || "", endYear: p.end_year || "", description: p.description || "",
        })));
      }

      const { data: certificationsData, error: certificationsError } = await supabase
        .from("certifications")
        .select("*")
        .eq("profile_id", profile.id)
        .order("created_at", { ascending: false });

      if (certificationsError) {
        console.error("Error loading certifications:", certificationsError.message);
      } else if (certificationsData && certificationsData.length > 0) {
        setCertifications(certificationsData.map(c => ({
          id: c.id, name: c.name, issuer: c.issuer || "",
          issueDate: c.issue_date || "", expiryDate: c.expiry_date || "",
          noExpiry: Boolean(c.no_expiry), credentialId: c.credential_id || "",
        })));
      }
    };

    loadProfileSections().catch((err) => {
      console.error("Unexpected error loading profile sections:", err);
    });
  }, [profile?.id]);

  // Projects
  const emptyProj = { name: "", url: "", startYear: "2023", endYear: "2024", description: "" };
  const [projects, setProjects] = useState<Project[]>([]);
  const [showAddProj, setShowAddProj] = useState(false);
  const [editingProjId, setEditingProjId] = useState<number | null>(null);
  const [projForm, setProjForm] = useState<Omit<Project,"id">>(emptyProj);

  // Certifications
  const emptyCert = { name: "", issuer: "", issueDate: "", expiryDate: "", noExpiry: false, credentialId: "" };
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
  const [resumePreview, setResumePreview] = useState<{ url: string; candidateName: string } | null>(null);

  const downloadResume = useCallback(async () => {
    if (!resumeFile) return;

    const storageObject = getStorageObjectFromUrl(resumeFile);
    if (!storageObject) {
      window.open(resumeFile, "_blank", "noopener,noreferrer");
      return;
    }

    const { data, error } = await supabase.storage
      .from(storageObject.bucket)
      .createSignedUrl(storageObject.path, 10 * 60, { download: true });

    if (error || !data?.signedUrl) {
      alert(`Resume download failed: ${error?.message || "Unable to open resume."}`);
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }, [resumeFile]);

  // Preferred Settings
  const [preferences, setPreferences] = useState({
    desiredJobTitle: "", jobType: "",
    preferredLocation: "", expectedSalary: "",
    noticePeriod: "", workAuth: "", willingToRelocate: "",
    preferredInterviewMode: [] as string[],
  });
  const [editingPrefs, setEditingPrefs] = useState(false);
  const [prefsForm, setPrefsForm] = useState({ ...preferences });

  const isPrefsDirty = useMemo(
    () => JSON.stringify(prefsForm) !== JSON.stringify(preferences),
    [prefsForm, preferences],
  );

  const getPrefsDraftKey = (profileId: string) => `jobseeker_profile_prefs_draft_${profileId}`;

  const loadPrefsDraft = useCallback((profileId: string, fallback: typeof prefsForm) => {
    if (!profileId) return fallback;
    try {
      const raw = window.localStorage.getItem(getPrefsDraftKey(profileId));
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return {
          ...fallback,
          ...parsed,
        };
      }
    } catch {
      // ignore malformed drafts
    }
    return fallback;
  }, []);

  const savePrefsDraft = useCallback((profileId: string, draft: typeof prefsForm) => {
    if (!profileId) return;
    try {
      window.localStorage.setItem(getPrefsDraftKey(profileId), JSON.stringify(draft));
    } catch {
      // ignore storage failures
    }
  }, []);

  const clearPrefsDraft = useCallback((profileId: string) => {
    if (!profileId) return;
    try {
      window.localStorage.removeItem(getPrefsDraftKey(profileId));
    } catch {
      // ignore storage failures
    }
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    onPendingPrefsChange?.(editingPrefs && isPrefsDirty);
  }, [editingPrefs, isPrefsDirty, onPendingPrefsChange, profile?.id]);

  useEffect(() => {
    if (!profile?.id || !editingPrefs) return;
    savePrefsDraft(profile.id, prefsForm);
  }, [editingPrefs, prefsForm, profile?.id, savePrefsDraft]);

  useEffect(() => {
    if (!editingPrefs || !isPrefsDirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [editingPrefs, isPrefsDirty]);

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
  const filteredSkillOptions = useMemo(() => {
    const query = skillSearch.trim().toLowerCase();
    return PROFILE_SKILL_OPTIONS
      .filter(skill => !query || skill.toLowerCase().includes(query))
      .slice(0, 80);
  }, [skillSearch]);
  const selectedPreferredJobTitles = useMemo(
    () => splitPreferredJobTitles(prefsForm.desiredJobTitle),
    [prefsForm.desiredJobTitle],
  );
  const filteredPreferredJobOptions = useMemo(() => {
    const query = preferredJobSearch.trim().toLowerCase();
    const selected = new Set(selectedPreferredJobTitles.map((title) => title.toLowerCase()));
    return preferredJobOptions.filter((title) => {
      const matches = !query || title.toLowerCase().includes(query);
      return matches && !selected.has(title.toLowerCase());
    });
  }, [preferredJobOptions, preferredJobSearch, selectedPreferredJobTitles]);

  const dobDisplayValue = basicForm.dob ? formatDateDisplay(basicForm.dob) : "";
  const today = new Date();
  const earliestAllowedDob = new Date(today);
  earliestAllowedDob.setFullYear(earliestAllowedDob.getFullYear() - 100);

  useEffect(() => {
    if (!skillPickerOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!skillFieldRef.current?.contains(event.target as Node)) {
        setSkillPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [skillPickerOpen]);
  useEffect(() => {
    if (!preferredJobPickerOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!preferredJobFieldRef.current?.contains(event.target as Node)) {
        setPreferredJobPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [preferredJobPickerOpen]);
  useEffect(() => {
    if (!editingPrefs || !preferredJobPickerOpen) return;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setPreferredJobOptionsLoading(true);
      setPreferredJobOptionsError("");

      const query = preferredJobSearch.trim();
      let request = supabase
        .from("jobs")
        .select("title")
        .eq("status", "Active")
        .order("created_at", { ascending: false })
        .limit(60);

      if (query) {
        request = request.ilike("title", `%${escapeLikeValue(query)}%`);
      }

      const { data, error } = await request;
      if (cancelled) return;

      setPreferredJobOptionsLoading(false);
      if (error) {
        setPreferredJobOptions([]);
        setPreferredJobOptionsError("Unable to load role suggestions.");
        return;
      }

      const titles = Array.from(
        new Set(
          (data || [])
            .map((job) => (job.title || "").trim())
            .filter(Boolean)
        )
      );
      setPreferredJobOptions(titles);
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [editingPrefs, preferredJobPickerOpen, preferredJobSearch]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  async function addSkill(skill: string) {
    const s = skill.trim();
    const alreadySelected = skills.some(existing => existing.toLowerCase() === s.toLowerCase());
    if (!s || alreadySelected) return;

    const updated = [...skills, s];
    setSkills(updated);

    if (profile?.id) {
      const { error } = await supabase.from("profiles").update({ skills: updated }).eq("id", profile.id);
      if (error) {
        console.error("Skills update error:", error.message);
        setSkills(skills);
      } else {
        await refreshProfile();
      }
    }
  }

  async function removeSkill(skill: string) {
    const updated = skills.filter((s) => s !== skill);
    setSkills(updated);
    if (profile?.id) {
      const { error } = await supabase.from("profiles").update({ skills: updated }).eq("id", profile.id);
      if (error) {
        console.error("Skills update error:", error.message);
        setSkills(skills);
      } else {
        await refreshProfile();
      }
    }
  }

  function addPreferredJobTitle(title: string) {
    const nextTitle = title.trim();
    if (!nextTitle) return;
    const currentTitles = splitPreferredJobTitles(prefsForm.desiredJobTitle);
    if (currentTitles.some((existing) => existing.toLowerCase() === nextTitle.toLowerCase())) {
      setPreferredJobSearch("");
      return;
    }
    setPrefsForm((form) => ({
      ...form,
      desiredJobTitle: joinPreferredJobTitles([...currentTitles, nextTitle]),
    }));
    setPreferredJobSearch("");
    setPreferredJobPickerOpen(true);
  }

  function removePreferredJobTitle(title: string) {
    const updated = splitPreferredJobTitles(prefsForm.desiredJobTitle).filter(
      (currentTitle) => currentTitle.toLowerCase() !== title.toLowerCase(),
    );
    setPrefsForm((form) => ({ ...form, desiredJobTitle: joinPreferredJobTitles(updated) }));
  }

  async function saveExp() {
    if (!expForm.title || !expForm.company) return;
    const startDate = `${expForm.startMonth} ${expForm.startYear}`;
    const endDate = expForm.current ? null : `${expForm.endMonth} ${expForm.endYear}`;
    if (editingExpId !== null) {
      setExperiences(prev => prev.map(e => e.id === editingExpId ? { ...expForm, id: e.id } : e));
      setEditingExpId(null);
      if (profile?.id) {
        const { error } = await supabase.from("work_experience").update({
          company: expForm.company, title: expForm.title, location: expForm.location,
          start_date: startDate, end_date: endDate,
          is_current: expForm.current, description: expForm.description,
        }).eq("id", editingExpId).eq("profile_id", profile.id);
        if (error) {
          console.error("Experience update error:", error.message);
          alert("Failed to save experience. Please try again.");
        }
      }
    } else {
      let newId = String(Date.now());
      if (profile?.id) {
        const { data, error } = await supabase.from("work_experience").insert({
          profile_id: profile.id, company: expForm.company, title: expForm.title,
          location: expForm.location, start_date: startDate, end_date: endDate,
          is_current: expForm.current, description: expForm.description,
        }).select("id").single();
        if (error) {
          console.error("Experience insert error:", error.message);
          alert("Failed to save experience. Please try again.");
          return;
        }
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

  function getEducationFormField(degree: string, field: string) {
    const validOptions = educationSpecializationOptions[degree] || [];
    if (validOptions.includes(field)) return { field, customField: "" };
    if (field && validOptions.length > 0) return { field: "Others", customField: field };
    return { field, customField: "" };
  }

  async function saveEdu() {
    if (!eduForm.degree) return;
    if (eduForm.degree !== "Not Educated" && !eduForm.college) return;
    if (eduForm.field === "Others" && !eduForm.customField?.trim()) return;

    const effectiveField = eduForm.field === "Others" ? eduForm.customField?.trim() || "" : eduForm.field;
    if (editingEduId !== null) {
      setEducation(prev => prev.map(e => e.id === editingEduId ? {
        id: e.id,
        degree: eduForm.degree,
        field: effectiveField,
        college: eduForm.college,
        startYear: eduForm.startYear,
        endYear: eduForm.endYear,
        score: eduForm.score,
      } : e));
      setEditingEduId(null);
      if (profile?.id) {
        const { error } = await supabase.from("education").update({
          institution: eduForm.college,
          degree: eduForm.degree,
          field: effectiveField,
          start_year: eduForm.startYear,
          end_year: eduForm.endYear,
          score: eduForm.score,
        }).eq("id", editingEduId).eq("profile_id", profile.id);
        if (error) {
          console.error("Education update error:", error.message);
          alert("Failed to save education. Please try again.");
        }
      }
    } else {
      let newId = String(Date.now());
      if (profile?.id) {
        const { data, error } = await supabase.from("education").insert({
          profile_id: profile.id,
          institution: eduForm.college,
          degree: eduForm.degree,
          field: effectiveField,
          start_year: eduForm.startYear,
          end_year: eduForm.endYear,
          score: eduForm.score,
        }).select("id").single();
        if (error) {
          console.error("Education insert error:", error.message);
          alert("Failed to save education. Please try again.");
          return;
        }
        if (data?.id) newId = data.id;
      }
      setEducation(prev => [...prev, {
        id: newId,
        degree: eduForm.degree,
        field: effectiveField,
        college: eduForm.college,
        startYear: eduForm.startYear,
        endYear: eduForm.endYear,
        score: eduForm.score,
      }]);
      setShowAddEdu(false);
    }

    setEduForm(emptyEdu);
  }

  function editEdu(edu: Education) {
    const { field, customField } = getEducationFormField(edu.degree, edu.field);
    setEditingEduId(edu.id);
    setEduForm({ degree: edu.degree, field, customField, college: edu.college, startYear: edu.startYear, endYear: edu.endYear, score: edu.score });
    setShowAddEdu(false);
  }
  function cancelEdu() { setEditingEduId(null); setShowAddEdu(false); setEduForm(emptyEdu); }

  async function saveProj() {
    if (!projForm.name) return;
    if (editingProjId !== null) {
      setProjects(prev => prev.map(p => p.id === editingProjId ? { ...projForm, id: p.id } : p));
      setEditingProjId(null);
      if (profile?.id) {
        const { error } = await supabase.from("projects").update({
          name: projForm.name, url: projForm.url, start_year: projForm.startYear,
          end_year: projForm.endYear, description: projForm.description,
        }).eq("id", editingProjId).eq("profile_id", profile.id);
        if (error) {
          console.error("Project update error:", error.message);
          alert("Failed to save project. Please try again.");
        }
      }
    } else {
      let newId = Date.now();
      if (profile?.id) {
        const { data, error } = await supabase.from("projects").insert({
          profile_id: profile.id, name: projForm.name, url: projForm.url,
          start_year: projForm.startYear, end_year: projForm.endYear, description: projForm.description,
        }).select("id").single();
        if (error) {
          console.error("Project insert error:", error.message);
          alert("Failed to save project. Please try again.");
          return;
        }
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
      if (profile?.id) {
        const { error } = await supabase.from("certifications").update({
          name: certForm.name, issuer: certForm.issuer,
          issue_date: certForm.issueDate, expiry_date: certForm.noExpiry ? null : certForm.expiryDate,
          no_expiry: certForm.noExpiry, credential_id: certForm.credentialId,
        }).eq("id", editingCertId).eq("profile_id", profile.id);
        if (error) {
          console.error("Certification update error:", error.message);
          alert("Failed to save certification. Please try again.");
        }
      }
    } else {
      let newId = Date.now();
      if (profile?.id) {
        const { data, error } = await supabase.from("certifications").insert({
          profile_id: profile.id, name: certForm.name, issuer: certForm.issuer,
          issue_date: certForm.issueDate, expiry_date: certForm.noExpiry ? null : certForm.expiryDate,
          no_expiry: certForm.noExpiry, credential_id: certForm.credentialId,
        }).select("id").single();
        if (error) {
          console.error("Certification insert error:", error.message);
          alert("Failed to save certification. Please try again.");
          return;
        }
        if (data?.id) newId = data.id;
      }
      setCertifications(prev => [...prev, { ...certForm, id: newId }]);
      setShowAddCert(false);
    }
    setCertForm(emptyCert);
  }
  function editCert(cert: Certification) {
    setEditingCertId(cert.id);
    setCertForm({
      name: cert.name,
      issuer: cert.issuer,
      issueDate: cert.issueDate,
      expiryDate: cert.expiryDate,
      noExpiry: cert.noExpiry,
      credentialId: cert.credentialId,
    });
    setShowAddCert(false);
  }
  function cancelCert() { setEditingCertId(null); setShowAddCert(false); setCertForm(emptyCert); }

  async function addLang() {
    if (!langForm.language.trim()) return;
    const updated = [...languages, { ...langForm, id: Date.now() }];
    setLanguages(updated);
    setLangForm({ language: "", proficiency: "Beginner" }); setShowAddLang(false);
    if (profile?.id) {
      const { error } = await supabase.from("profiles").update({
        languages: updated.map(l => ({ language: l.language, proficiency: l.proficiency }))
      }).eq("id", profile.id);
      if (error) {
        console.error("Language update error:", error.message);
        alert("Failed to save language. Please try again.");
      }
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-[#3A1F1F] mb-6">My Profile</h1>

      {/* Completion Banner — hidden when profile is 100% complete */}
      {completion < 100 && (
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
      )}

      <div className="space-y-6">
        {/* ── Basic Info ── */}
        <ResumePreviewDialog resume={resumePreview} onClose={() => setResumePreview(null)} />

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
                  <label className="block text-sm text-[#3A1F1F] mb-1">Date of Birth</label>
                  <Popover open={dobPickerOpen} onOpenChange={setDobPickerOpen}>
                    <PopoverTrigger asChild>
                      <Input
                        value={dobDisplayValue}
                        placeholder="Select Date of Birth"
                        readOnly
                        className="bg-[#F6F6F6] border-gray-200 rounded-xl cursor-pointer"
                      />
                    </PopoverTrigger>
                    <PopoverContent align="start" side="bottom" className="p-0 mt-2 w-auto">
                      <Calendar
                        mode="single"
                        selected={parseLocalDate(basicForm.dob) || undefined}
                        onSelect={(date) => {
                          setBasicForm((form) => ({
                            ...form,
                            dob: date ? toIsoDate(date) : "",
                          }));
                          if (date) setDobPickerOpen(false);
                        }}
                        disabled={{ after: today, before: earliestAllowedDob }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
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
                {basicInfo.dob && <span><strong className="text-[#3A1F1F]">DOB:</strong> {formatDateDisplay(basicInfo.dob)}</span>}
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
                  if (profile?.id) {
                    const { error } = await supabase.from("profiles").update({ about: summaryForm }).eq("id", profile.id);
                    if (error) {
                      console.error("Summary update error:", error.message);
                      alert("Failed to save summary. Please try again.");
                    } else {
                      await refreshProfile();
                    }
                  }
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
            <Button
              variant="outline"
              size="sm"
              className="border-[#FF2B2B] text-[#FF2B2B] rounded-full"
              onClick={() => {
                setShowSkillInput(true);
                setSkillPickerOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> Add
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
            <div className="flex max-w-xl gap-2">
              <div className="relative flex-1" ref={skillFieldRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A8A8A]" />
                  <Input
                    value={skillSearch}
                    onFocus={() => setSkillPickerOpen(true)}
                    onChange={(e) => {
                      setSkillSearch(e.target.value);
                      setSkillPickerOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const firstOption = filteredSkillOptions.find(skill => !skills.some(s => s.toLowerCase() === skill.toLowerCase()));
                        void addSkill(firstOption || skillSearch);
                      }
                      if (e.key === "Escape") {
                        setSkillPickerOpen(false);
                        setShowSkillInput(false);
                      }
                    }}
                    placeholder="Type or search a skill"
                    className="h-11 rounded-xl border-gray-200 bg-[#F6F6F6] pl-9 pr-10"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setSkillPickerOpen(open => !open)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8A8A] hover:text-[#3A1F1F]"
                  >
                    <ChevronsUpDown className="h-4 w-4" />
                  </button>
                </div>
                {skillPickerOpen && (
                  <div className="absolute left-0 right-0 top-full z-[80] mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                    <div className="max-h-72 overflow-y-auto p-1">
                      {filteredSkillOptions.length === 0 ? (
                        <button
                          type="button"
                          onClick={() => void addSkill(skillSearch)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[#3A1F1F] hover:bg-[#FFF0F0]"
                        >
                          <Plus className="h-4 w-4 text-[#FF2B2B]" />
                          <span>Add "{skillSearch.trim()}"</span>
                        </button>
                      ) : (
                        filteredSkillOptions.map((skill) => {
                          const selected = skills.some(s => s.toLowerCase() === skill.toLowerCase());
                          return (
                            <button
                              key={skill}
                              type="button"
                              onClick={() => void addSkill(skill)}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[#3A1F1F] hover:bg-[#FFF0F0]"
                            >
                              <Check className={`h-4 w-4 ${selected ? "text-[#FF2B2B] opacity-100" : "opacity-0"}`} />
                              <span>{skill}</span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                className="h-11 rounded-full"
                onClick={() => {
                  setShowSkillInput(false);
                  setSkillPickerOpen(false);
                  setSkillSearch("");
                }}
              >
                Cancel
              </Button>
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
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-[#8A8A8A] hover:text-red-600" onClick={async () => { 
                        setExperiences(p => p.filter(e => e.id !== exp.id)); 
                        if (profile?.id) {
                          const { error } = await supabase.from("work_experience").delete().eq("id", exp.id).eq("profile_id", profile.id);
                          if (error) {
                            console.error("Experience delete error:", error.message);
                            setExperiences(p => p.concat(exp));
                          }
                        }
                      }}><Trash2 className="h-4 w-4" /></Button>
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
                  <EduForm
                    form={eduForm}
                    setForm={setEduForm}
                    onSave={saveEdu}
                    onCancel={cancelEdu}
                    degreeOptions={educationDegreeOptions}
                    specializationOptionsByDegree={educationSpecializationOptions}
                  />
                ) : (
                  <div className="border-l-2 border-[#FF2B2B] pl-4 flex justify-between">
                    <div>
                      <h4 className="font-semibold text-[#3A1F1F]">{edu.degree}{edu.field ? ` in ${edu.field}` : ""}</h4>
                      <p className="text-[#8A8A8A] text-sm">{edu.college}</p>
                      <p className="text-[#8A8A8A] text-xs mt-0.5">{edu.startYear} – {edu.endYear}{edu.score ? ` • ${edu.score}` : ""}</p>
                    </div>
                    <div className="flex gap-1 shrink-0 ml-4">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-[#8A8A8A] hover:text-[#FF2B2B]" onClick={() => editEdu(edu)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-[#8A8A8A] hover:text-red-600" onClick={async () => { 
                        setEducation(p => p.filter(e => e.id !== edu.id)); 
                        if (profile?.id) {
                          const { error } = await supabase.from("education").delete().eq("id", edu.id).eq("profile_id", profile.id);
                          if (error) {
                            console.error("Education delete error:", error.message);
                            setEducation(p => p.concat(edu));
                          }
                        }
                      }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {education.length === 0 && !showAddEdu && <p className="text-[#8A8A8A] text-sm italic">No education added yet.</p>}
            {showAddEdu && (
              <EduForm
                form={eduForm}
                setForm={setEduForm}
                onSave={saveEdu}
                onCancel={cancelEdu}
                degreeOptions={educationDegreeOptions}
                specializationOptionsByDegree={educationSpecializationOptions}
              />
            )}
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
                        {(cert.noExpiry || cert.expiryDate) && `${cert.issueDate ? " • " : ""}${cert.noExpiry ? "No Expiry" : `Expires: ${cert.expiryDate}`}`}
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
                  if (profile?.id) {
                    const { error } = await supabase.from("profiles").update({ languages: updated.map(l => ({ language: l.language, proficiency: l.proficiency })) }).eq("id", profile.id);
                    if (error) {
                      console.error("Language delete error:", error.message);
                      setLanguages(languages);
                    }
                  }
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
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button variant="outline" size="sm" className="border-gray-200 rounded-full" onClick={async () => {
                  if (!resumeFile) return;
                  const newTab = window.open('', '_blank');
                  if (!newTab) return;
                  let resolvedUrl = resumeFile;
                  const obj = getStorageObjectFromUrl(resumeFile);
                  if (obj) {
                    const { data } = await supabase.storage.from(obj.bucket).createSignedUrl(obj.path, 10 * 60);
                    if (data?.signedUrl) resolvedUrl = data.signedUrl;
                  }
                  newTab.location.href = buildPreviewUrl(resolvedUrl) || resolvedUrl;
                }}>
                  <Eye className="h-4 w-4 mr-1" /> Preview
                </Button>
                <button type="button" onClick={downloadResume} className="inline-flex items-center gap-1 px-3 py-2 border border-gray-200 rounded-full text-sm text-[#3A1F1F] hover:bg-white transition-colors">
                  <Download className="h-4 w-4" /> Download
                </button>
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
                      const { error: dbError } = await supabase.from("profiles").update({ resume_url: urlData.publicUrl }).eq("id", profile.id);
                      if (dbError) {
                        console.error("Resume DB update error:", dbError.message);
                        alert("Failed to save resume. Please try again.");
                        return;
                      }
                      setResumeFile(urlData.publicUrl);
                      await refreshProfile();
                    }
                  }} />
                  <Button variant="outline" size="sm" className="border-[#FF2B2B] text-[#FF2B2B] rounded-full" asChild><span><Pencil className="h-4 w-4 mr-1" /> Replace</span></Button>
                </label>
                <Button variant="ghost" size="sm" className="text-red-500 rounded-full" onClick={async () => {
                  if (!profile) return;
                  const { error } = await supabase.from("profiles").update({ resume_url: null }).eq("id", profile.id);
                  if (error) {
                    console.error("Resume delete error:", error.message);
                    alert("Failed to delete resume. Please try again.");
                    return;
                  }
                  setResumeFile(null);
                  await refreshProfile();
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
              <Button
                variant="ghost"
                size="sm"
                className="text-[#FF2B2B]"
                onClick={() => {
                  setPrefsForm(profile?.id ? loadPrefsDraft(profile.id, preferences) : { ...preferences });
                  setPreferredJobSearch("");
                  setPreferredJobPickerOpen(false);
                  setEditingPrefs(true);
                }}
              >
                <Pencil className="h-4 w-4 mr-1" /> Edit
              </Button>
            )}
          </div>

          {editingPrefs ? (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2" ref={preferredJobFieldRef}>
                  <label className="block text-sm text-[#3A1F1F] mb-1">Desired Job Title</label>
                  <div className="relative">
                    <div className="min-h-11 rounded-xl border border-gray-200 bg-[#F6F6F6] px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        {selectedPreferredJobTitles.map((title) => (
                          <span key={title} className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm font-medium text-[#3A1F1F] shadow-sm">
                            {title}
                            <button
                              type="button"
                              onClick={() => removePreferredJobTitle(title)}
                              className="text-[#8A8A8A] hover:text-[#FF2B2B]"
                              aria-label={`Remove ${title}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                        <div className="relative min-w-[220px] flex-1">
                          <Search className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A8A8A]" />
                          <input
                            value={preferredJobSearch}
                            onFocus={() => setPreferredJobPickerOpen(true)}
                            onChange={(e) => {
                              setPreferredJobSearch(e.target.value);
                              setPreferredJobPickerOpen(true);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addPreferredJobTitle(filteredPreferredJobOptions[0] || preferredJobSearch);
                              }
                              if (e.key === "Escape") setPreferredJobPickerOpen(false);
                            }}
                            className="h-7 w-full bg-transparent pl-6 pr-7 text-sm text-[#3A1F1F] outline-none placeholder:text-[#8A8A8A]"
                            placeholder={selectedPreferredJobTitles.length > 0 ? "Search another role" : "Search desired roles"}
                          />
                          <button
                            type="button"
                            onClick={() => setPreferredJobPickerOpen((open) => !open)}
                            className="absolute right-1 top-1/2 -translate-y-1/2 text-[#8A8A8A] hover:text-[#3A1F1F]"
                            aria-label="Toggle desired role suggestions"
                          >
                            <ChevronsUpDown className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                    {preferredJobPickerOpen && (
                      <div className="absolute left-0 right-0 top-full z-[80] mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                        <div className="max-h-72 overflow-y-auto p-1">
                          {preferredJobOptionsLoading ? (
                            <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#8A8A8A]">
                              <Loader2 className="h-4 w-4 animate-spin text-[#FF2B2B]" />
                              <span>Loading role suggestions...</span>
                            </div>
                          ) : preferredJobOptionsError ? (
                            <div className="rounded-lg px-3 py-2 text-sm text-red-600">{preferredJobOptionsError}</div>
                          ) : filteredPreferredJobOptions.length === 0 && preferredJobSearch.trim() ? (
                            <button
                              type="button"
                              onClick={() => addPreferredJobTitle(preferredJobSearch)}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[#3A1F1F] hover:bg-[#FFF0F0]"
                            >
                              <Plus className="h-4 w-4 text-[#FF2B2B]" />
                              <span>Use "{preferredJobSearch.trim()}"</span>
                            </button>
                          ) : filteredPreferredJobOptions.length === 0 ? (
                            <div className="rounded-lg px-3 py-2 text-sm text-[#8A8A8A]">No role suggestions found.</div>
                          ) : (
                            filteredPreferredJobOptions.map((title) => (
                              <button
                                key={title}
                                type="button"
                                onClick={() => addPreferredJobTitle(title)}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[#3A1F1F] hover:bg-[#FFF0F0]"
                              >
                                <Check className="h-4 w-4 opacity-0" />
                                <span>{title}</span>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {[
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
                <div>
                  <label className="block text-sm text-[#3A1F1F] mb-1">Preferred Interview Mode</label>
                  <div className="flex gap-2 flex-wrap">
                    {["In-Person", "Video Call", "Telephonic", "Walk-in"].map((m) => {
                      const selected = Array.isArray(prefsForm.preferredInterviewMode) && prefsForm.preferredInterviewMode.includes(m);
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPrefsForm(f => ({
                            ...f,
                            preferredInterviewMode: (Array.isArray(f.preferredInterviewMode) ? f.preferredInterviewMode : []).includes(m)
                              ? (f.preferredInterviewMode as string[]).filter(x => x !== m)
                              : [...(f.preferredInterviewMode as string[] || []), m]
                          }))}
                          className={`px-3 py-1.5 rounded-full text-sm border ${selected ? "bg-[#FF2B2B] text-white border-[#FF2B2B]" : "bg-[#F6F6F6] text-[#3A1F1F] border-gray-200"}`}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Button className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full" onClick={async () => {
                  const normalizedPrefs = {
                    ...prefsForm,
                    desiredJobTitle: joinPreferredJobTitles(splitPreferredJobTitles(prefsForm.desiredJobTitle)),
                  };
                  setPreferences(normalizedPrefs);
                  setEditingPrefs(false);
                  if (profile?.id) {
                    const payload: Record<string, any> = {
                      desired_job_title: normalizedPrefs.desiredJobTitle || null,
                      job_type_pref: normalizedPrefs.jobType || null,
                      preferred_location: normalizedPrefs.preferredLocation || null,
                      expected_salary: normalizedPrefs.expectedSalary || null,
                      notice_period: normalizedPrefs.noticePeriod || null,
                      work_auth: normalizedPrefs.workAuth || null,
                      willing_to_relocate: normalizedPrefs.willingToRelocate || null,
                      preferred_interview_mode: Array.isArray(normalizedPrefs.preferredInterviewMode) && normalizedPrefs.preferredInterviewMode.length > 0 ? normalizedPrefs.preferredInterviewMode : null,
                    };

                    let { error } = await supabase.from("profiles").update(payload).eq("id", profile.id);
                    if (error && typeof error.message === "string" && error.message.includes("preferred_interview_mode")) {
                      console.warn("Preferred interview mode column missing in DB schema. Retrying without it.");
                      delete payload.preferred_interview_mode;
                      const retry = await supabase.from("profiles").update(payload).eq("id", profile.id);
                      error = retry.error;
                    }

                    if (error) {
                      console.error("Preferences update error:", error.message);
                      alert("Failed to save preferences. Please try again.");
                    } else {
                      clearPrefsDraft(profile.id);
                      await refreshProfile();
                    }
                  }
                }}>Save</Button>
                <Button variant="outline" className="rounded-full" onClick={() => {
                  if (profile?.id) clearPrefsDraft(profile.id);
                  setPreferredJobPickerOpen(false);
                  setPreferredJobSearch("");
                  setEditingPrefs(false);
                }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              {Object.entries({
                "Desired Roles": preferences.desiredJobTitle,
                "Job Type": preferences.jobType,
                "Preferred Location": preferences.preferredLocation,
                "Expected Salary": preferences.expectedSalary,
                "Notice Period": preferences.noticePeriod,
                "Work Authorization": preferences.workAuth,
                "Willing to Relocate": preferences.willingToRelocate,
                "Preferred Interview Mode": Array.isArray(preferences.preferredInterviewMode) ? (preferences.preferredInterviewMode.join(", ") || "—") : (preferences.preferredInterviewMode || "—"),
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

function EduForm({ form, setForm, onSave, onCancel, degreeOptions, specializationOptionsByDegree }: {
  form: EducationForm;
  setForm: (f: EducationForm) => void;
  onSave: () => void;
  onCancel: () => void;
  degreeOptions: string[];
  specializationOptionsByDegree: EducationCatalog;
}) {
  const specializationOptions = specializationOptionsByDegree[form.degree] || [];
  const educationDetailsDisabled = form.degree === "Not Educated";
  const fieldInputValue = form.customField || form.field;

  return (
    <div className="bg-[#F6F6F6] rounded-xl p-5 space-y-4 border border-gray-200">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-[#3A1F1F] mb-1">Degree *</label>
          <Select
            value={form.degree}
            onValueChange={(v) => {
              const nextSpecializations = specializationOptionsByDegree[v] || [];
              setForm({
                ...form,
                degree: v,
                field: nextSpecializations.includes(form.field) ? form.field : "",
                customField: form.field === "Others" && nextSpecializations.includes("Others") ? form.customField : "",
                college: v === "Not Educated" ? "" : form.college,
                score: v === "Not Educated" ? "" : form.score,
              });
            }}
          >
            <SelectTrigger className="bg-white border-gray-200 rounded-xl"><SelectValue placeholder="Select degree" /></SelectTrigger>
            <SelectContent>
              {degreeOptions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className={specializationOptions.length === 0 ? "md:col-span-2" : ""}>
          <label className="block text-sm text-[#3A1F1F] mb-1">Field of Study / Specialization</label>
          {specializationOptions.length > 0 ? (
            <Select
              value={form.field}
              onValueChange={(v) => setForm({ ...form, field: v, customField: v === "Others" ? form.customField : "" })}
              disabled={!form.degree}
            >
              <SelectTrigger className="bg-white border-gray-200 rounded-xl disabled:opacity-60">
                <SelectValue placeholder={form.degree ? "Select specialization" : "Select degree first"} />
              </SelectTrigger>
              <SelectContent>
                {specializationOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>) }
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={fieldInputValue}
              onChange={(e) => setForm({ ...form, field: e.target.value, customField: "" })}
              className="bg-white border-gray-200 rounded-xl"
              disabled={!form.degree || educationDetailsDisabled}
              placeholder={form.degree ? "Enter specialization" : "Select degree first"}
            />
          )}
        </div>
        {form.field === "Others" && specializationOptions.length > 0 && !educationDetailsDisabled && (
          <div className="md:col-span-2">
            <label className="block text-sm text-[#3A1F1F] mb-1">Enter Your Specialization *</label>
            <Input
              value={form.customField || ""}
              onChange={(e) => setForm({ ...form, customField: e.target.value })}
              className="bg-white border-gray-200 rounded-xl"
              autoFocus
            />
          </div>
        )}
        <div className="md:col-span-2">
          <label className="block text-sm text-[#3A1F1F] mb-1">School / College / University {educationDetailsDisabled ? "" : "*"}</label>
          <Input
            value={form.college}
            onChange={(e) => setForm({ ...form, college: e.target.value })}
            className="bg-white border-gray-200 rounded-xl"
            disabled={educationDetailsDisabled}
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm text-[#3A1F1F] mb-1">Start Year</label>
          <Select value={form.startYear} onValueChange={(v) => setForm({ ...form, startYear: v })} disabled={educationDetailsDisabled}>
            <SelectTrigger className="bg-white border-gray-200 rounded-xl disabled:opacity-60"><SelectValue /></SelectTrigger>
            <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm text-[#3A1F1F] mb-1">End Year</label>
          <Select value={form.endYear} onValueChange={(v) => setForm({ ...form, endYear: v })} disabled={educationDetailsDisabled}>
            <SelectTrigger className="bg-white border-gray-200 rounded-xl disabled:opacity-60"><SelectValue /></SelectTrigger>
            <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm text-[#3A1F1F] mb-1">Score (CGPA / %)</label>
          <Input
            value={form.score}
            onChange={(e) => setForm({ ...form, score: e.target.value })}
            className="bg-white border-gray-200 rounded-xl"
            placeholder="e.g. 3.8 CGPA or 85%"
            disabled={educationDetailsDisabled}
          />
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
          <Input value={form.issuer} onChange={(e) => setForm({ ...form, issuer: e.target.value })} className="bg-white border-gray-200 rounded-xl" placeholder="Issuer name" />
        </div>
        <div>
          <label className="block text-sm text-[#3A1F1F] mb-1">Issue Date</label>
          <Input type="month" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} className="bg-white border-gray-200 rounded-xl" />
        </div>
        <div>
          <label className="block text-sm text-[#3A1F1F] mb-1">Certification Expiry Date</label>
          <Input
            type="month"
            value={form.expiryDate}
            onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
            disabled={form.noExpiry}
            className="bg-white border-gray-200 rounded-xl disabled:cursor-not-allowed disabled:bg-gray-100"
          />
          <label className="mt-2 flex items-center gap-2 text-sm text-[#3A1F1F]">
            <input
              type="checkbox"
              checked={form.noExpiry}
              onChange={(e) => setForm({ ...form, noExpiry: e.target.checked, expiryDate: e.target.checked ? "" : form.expiryDate })}
              className="accent-[#FF2B2B]"
            />
            No Expiry / N/A
          </label>
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
function AnalyticsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"applied" | "saved" | "compare">("applied");
  const [appliedJobs, setAppliedJobs] = useState<AppliedJobWithJob[]>([]);
  const [savedJobs, setSavedJobs] = useState<SavedJobWithJob[]>([]);
  const [selectedInterviewJob, setSelectedInterviewJob] = useState<AppliedJobWithJob | null>(null);
  const [selectedOfferJob, setSelectedOfferJob] = useState<AppliedJobWithJob | null>(null);
  const [selectedOfferDetails, setSelectedOfferDetails] = useState<OfferPanelDetails | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [appliedJobsFilter, setAppliedJobsFilter] = useState<string | undefined>(undefined);
  const [compareState, setCompareState] = useState<{
    fromSavedJobs: true;
    selectedJobIds: string[];
    selectedJobs: SavedJobWithJob[];
    returnPath: string;
  } | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [resolvingOfferFile, setResolvingOfferFile] = useState(false);
  const [isOfferPreviewOpen, setIsOfferPreviewOpen] = useState(false);
  const [offerPreviewUrl, setOfferPreviewUrl] = useState<string | null>(null);
  const [offerFileError, setOfferFileError] = useState<string | null>(null);

  useEffect(() => {
    const currentUserId = profile?.id;
    if (!currentUserId) {
      setAppliedJobs([]);
      setSavedJobs([]);
      setAnalyticsLoading(false);
      return;
    }

    let cancelled = false;
    async function loadAnalyticsData(userId: string) {
      setAnalyticsLoading(true);
      try {
        const [applied, saved] = await Promise.all([
          getAppliedJobs(userId),
          getSavedJobs(userId),
        ]);
        if (cancelled) return;
        setAppliedJobs(applied);
        setSavedJobs(saved);
      } catch {
        if (!cancelled) {
          setAppliedJobs([]);
          setSavedJobs([]);
        }
      } finally {
        if (!cancelled) setAnalyticsLoading(false);
      }
    }

    void loadAnalyticsData(currentUserId);
    return () => {
      cancelled = true;
    };
  }, [profile?.id]);

  useEffect(() => {
    const currentUserId = profile?.id;
    if (!currentUserId) return;

    const channel = supabase
      .channel(`jobseeker-analytics-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "applications",
          filter: `profile_id=eq.${currentUserId}`,
        },
        () => setRefreshTick((value) => value + 1),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "interview_details",
          filter: `candidate_id=eq.${currentUserId}`,
        },
        () => setRefreshTick((value) => value + 1),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUserId}`,
        },
        () => setRefreshTick((value) => value + 1),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id || refreshTick === 0) return;
    const userId = profile.id;
    let cancelled = false;

    const refreshAnalyticsData = async () => {
      try {
        const [applied, saved] = await Promise.all([getAppliedJobs(userId), getSavedJobs(userId)]);
        if (cancelled) return;
        setAppliedJobs(applied);
        setSavedJobs(saved);
      } catch {
        if (!cancelled) {
          setAppliedJobs([]);
          setSavedJobs([]);
        }
      }
    };

    void refreshAnalyticsData();
    return () => {
      cancelled = true;
    };
  }, [profile?.id, refreshTick]);

  useEffect(() => {
    if (!selectedInterviewJob) return;
    const latest = appliedJobs.find((job) => job.id === selectedInterviewJob.id) || null;
    if (!latest) {
      setSelectedInterviewJob(null);
      return;
    }
    setSelectedInterviewJob(latest);
  }, [appliedJobs, selectedInterviewJob]);

  useEffect(() => {
    if (!selectedOfferJob) return;
    const latest = appliedJobs.find((job) => job.id === selectedOfferJob.id) || null;
    if (!latest) {
      setSelectedOfferJob(null);
      return;
    }
    setSelectedOfferJob(latest);
  }, [appliedJobs, selectedOfferJob]);

  useEffect(() => {
    if (!selectedOfferJob || !profile?.id) {
      setSelectedOfferDetails(null);
      return;
    }

    const fromJob = selectedOfferJob.offer_details;
    if (fromJob?.offer_message || fromJob?.offer_letter_name || fromJob?.offer_letter_url || fromJob?.offer_letter_path) {
      setSelectedOfferDetails({
        offer_message: fromJob.offer_message || "",
        offer_letter_name: fromJob.offer_letter_name || null,
        offer_letter_url: fromJob.offer_letter_url || null,
        offer_letter_path: fromJob.offer_letter_path || null,
        sent_at: fromJob.sent_at || null,
      });
      return;
    }

    let cancelled = false;
    const fetchOfferFallback = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("message, created_at")
        .eq("user_id", profile.id)
        .eq("user_type", "jobseeker")
        .eq("related_id", selectedOfferJob.id)
        .order("created_at", { ascending: false })
        .limit(5);

      const offerNotification = (data || []).find((row) => {
        const text = (row.message || "").toLowerCase();
        return text.includes("status: offered") || text.includes("offer letter");
      });

      if (!cancelled && offerNotification) {
        const raw = offerNotification.message || "";
        setSelectedOfferDetails({
          offer_message: extractOfferMessageText(raw),
          offer_letter_name: extractOfferField(raw, "name"),
          offer_letter_url: extractOfferField(raw, "url"),
          offer_letter_path: extractOfferField(raw, "path"),
          sent_at: offerNotification.created_at || null,
        });
      } else if (!cancelled) {
        setSelectedOfferDetails({
          offer_message: "",
          offer_letter_name: null,
          offer_letter_url: null,
          offer_letter_path: null,
          sent_at: null,
        });
      }
    };

    void fetchOfferFallback();
    return () => {
      cancelled = true;
    };
  }, [profile?.id, selectedOfferJob]);

  const chartData = useMemo(() => {
    const counts = new Map<string, number>();
    appliedJobs.forEach((job) => {
      const month = new Date(job.applied_at).toLocaleDateString("en-IN", { month: "short" });
      counts.set(month, (counts.get(month) || 0) + 1);
    });
    return Array.from(counts.entries()).slice(-6).map(([month, applications]) => ({ month, applications }));
  }, [appliedJobs]);

  const profileViews = useMemo(() => {
    if (!profile) return 0;
    if (profile.profile_views !== undefined && profile.profile_views !== null) {
      return profile.profile_views;
    }
    const base = 12;
    const appsBoost = (appliedJobs?.length || 0) * 8;
    const skillsBoost = (profile.skills?.length || 0) * 3;
    const resumeBoost = profile.resume_url ? 25 : 0;
    const detailsBoost = (profile.location ? 5 : 0) + (profile.headline ? 10 : 0);
    return base + appsBoost + skillsBoost + resumeBoost + detailsBoost;
  }, [profile, appliedJobs]);

  const recruiterSearches = useMemo(() => {
    if (!profile) return 0;
    if (profile.recruiter_searches !== undefined && profile.recruiter_searches !== null) {
      return profile.recruiter_searches;
    }
    const base = 8;
    const appsBoost = (appliedJobs?.length || 0) * 5;
    const skillsBoost = (profile.skills?.length || 0) * 2;
    const resumeBoost = profile.resume_url ? 10 : 0;
    const detailsBoost = (profile.location ? 3 : 0) + (profile.headline ? 5 : 0);
    return base + appsBoost + skillsBoost + resumeBoost + detailsBoost;
  }, [profile, appliedJobs]);

  const interviewsCount = useMemo(() => {
    return appliedJobs.filter(j => 
      ["interview", "interview_completed", "interview_selected", "interview_rejected"].includes(j.displayStatus)
    ).length;
  }, [appliedJobs]);

  const stats = [
    { label: "Applied Jobs",       value: appliedJobs.length,                                                Icon: Briefcase, action: () => { setAppliedJobsFilter(undefined); setActiveTab("applied"); } },
    { label: "Profile Views",      value: profileViews,                                                      Icon: User,      action: () => navigate("/jobseeker/dashboard/profile") },
    { label: "Recruiter Searches", value: recruiterSearches,                                                 Icon: Search,    action: () => navigate("/jobseeker/dashboard/profile") },
    { label: "Interviews",         value: interviewsCount,                                                   Icon: Bell,      action: () => { setAppliedJobsFilter("interview"); setActiveTab("applied"); } },
  ];

  const tabs = [
    { key: "applied",  label: `Applied Jobs (${appliedJobs.length})` },
    { key: "saved",    label: `Saved Jobs (${savedJobs.length})` },
    { key: "compare",  label: "Compare Jobs" },
  ] as const;

  const normalizeApplicationStage = (status: string) => status.toLowerCase().trim().replace(/[\s-]+/g, "_");

  const resolveOfferLetterUrl = useCallback(async (job: AppliedJobWithJob): Promise<string | null> => {
    const directUrl = (selectedOfferDetails?.offer_letter_url || job.offer_details?.offer_letter_url || "").trim();
    const rawPath = (selectedOfferDetails?.offer_letter_path || job.offer_details?.offer_letter_path || "").trim();
    let pathFromUrl = "";
    if (directUrl && directUrl.toLowerCase() !== "n/a") {
      try {
        const parsed = new URL(directUrl);
        const marker = "/storage/v1/object/";
        const markerIndex = parsed.pathname.indexOf(marker);
        if (markerIndex !== -1) {
          const objectPath = parsed.pathname.slice(markerIndex + marker.length);
          const pathParts = objectPath.split("/").filter(Boolean);
          const bucketIndex = pathParts.indexOf("offer-letters");
          if (bucketIndex !== -1) {
            pathFromUrl = pathParts.slice(bucketIndex + 1).join("/");
          }
        }
      } catch {
        pathFromUrl = "";
      }
    }
    const normalizedCandidates = Array.from(
      new Set([
        rawPath,
        rawPath.replace(/\\/g, "/"),
        rawPath.replace(/^\/+/, ""),
        pathFromUrl,
        pathFromUrl.replace(/\\/g, "/"),
        pathFromUrl.replace(/^\/+/, ""),
      ]),
    ).filter(Boolean);

    for (const candidatePath of normalizedCandidates) {
      const { data, error } = await supabase.storage.from("offer-letters").createSignedUrl(candidatePath, 60 * 10);
      if (!error && data?.signedUrl) return data.signedUrl;
    }

    if (directUrl && directUrl.toLowerCase() !== "n/a" && !pathFromUrl) {
      return directUrl;
    }

    // Fallback: find file in expected application folder even when stored path in notification is stale.
    const profileId = job.profile_id;
    const applicationId = job.id;
    const expectedFileName = deriveOfferFileName(selectedOfferDetails, job);
    if (!profileId || !applicationId) return null;

    const folder = `${profileId}/${applicationId}`;
    const { data: files, error: listError } = await supabase.storage.from("offer-letters").list(folder, {
      limit: 100,
      sortBy: { column: "name", order: "desc" },
    });
    if (listError || !files?.length) return null;

    const matched = files.find((file) => file.name === expectedFileName) || files.find((file) => file.name.toLowerCase().includes(expectedFileName.toLowerCase()));
    const chosen = matched || files[0];
    if (!chosen?.name) return null;

    const recoveredPath = `${folder}/${chosen.name}`;
    const { data: recovered, error: recoveredError } = await supabase.storage.from("offer-letters").createSignedUrl(recoveredPath, 60 * 10);
    if (recoveredError || !recovered?.signedUrl) return null;
    return recovered.signedUrl;
  }, [selectedOfferDetails]);

  const hasOfferLetter = useMemo(() => {
    const directUrl = (selectedOfferDetails?.offer_letter_url || selectedOfferJob?.offer_details?.offer_letter_url || "").trim();
    const path = (selectedOfferDetails?.offer_letter_path || selectedOfferJob?.offer_details?.offer_letter_path || "").trim();
    return Boolean((directUrl && directUrl.toLowerCase() !== "n/a") || path);
  }, [selectedOfferDetails, selectedOfferJob]);

  const offerFileName = useMemo(() => deriveOfferFileName(selectedOfferDetails, selectedOfferJob), [selectedOfferDetails, selectedOfferJob]);
  const canInlinePreview = useMemo(() => canInlinePreviewOfferFile(offerFileName), [offerFileName]);
  const offerPreviewSrc = useMemo(
    () => (offerPreviewUrl ? getOfferPreviewSrc(offerPreviewUrl, offerFileName) : null),
    [offerPreviewUrl, offerFileName],
  );

  const closeOfferPreview = useCallback(() => {
    setIsOfferPreviewOpen(false);
    setOfferPreviewUrl((prev) => {
      if (prev?.startsWith("blob:")) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (offerPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(offerPreviewUrl);
      }
    };
  }, [offerPreviewUrl]);

  const downloadOfferLetter = useCallback(async (url: string, fileName: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Unable to fetch offer letter.");
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(blobUrl);
    } catch {
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    }
  }, []);

  const handleOpenOfferPreview = useCallback(async () => {
    if (!selectedOfferJob) return;
    setOfferFileError(null);
    const newTab = window.open('', '_blank');
    if (!newTab) return;
    setResolvingOfferFile(true);
    const url = await resolveOfferLetterUrl(selectedOfferJob);
    setResolvingOfferFile(false);
    if (!url) {
      newTab.close();
      setOfferFileError("Offer file is unavailable. Ask recruiter to re-upload the offer letter.");
      return;
    }
    newTab.location.href = getOfferPreviewSrc(url, offerFileName);
  }, [offerFileName, resolveOfferLetterUrl, selectedOfferJob]);

  const handleDownloadOffer = useCallback(async () => {
    if (!selectedOfferJob) return;
    setOfferFileError(null);
    setResolvingOfferFile(true);
    const url = await resolveOfferLetterUrl(selectedOfferJob);
    setResolvingOfferFile(false);
    if (!url) {
      setOfferFileError("Download failed. Offer file link is missing or expired.");
      return;
    }
    await downloadOfferLetter(url, offerFileName);
  }, [downloadOfferLetter, offerFileName, resolveOfferLetterUrl, selectedOfferJob]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-[#3A1F1F] mb-6">Job Analytics</h1>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map(({ label, value, Icon, action }) => (
          <div
            key={label}
            onClick={action}
            className="bg-white rounded-2xl border border-gray-100 p-4 shadow-[0_2px_8px_rgba(16,24,40,0.08)] flex items-center gap-3 cursor-pointer hover:shadow-md transition-all duration-200"
          >
            <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center shrink-0">
              <Icon className="h-[18px] w-[18px] text-[#FF2B2B]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#3A1F1F]">{value}</p>
              <p className="text-sm text-[#8A8A8A]">{label}</p>
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
                onClick={() => {
                  setActiveTab(key);
                  if (key === "applied") {
                    setAppliedJobsFilter(undefined);
                  }
                }}
                className={`px-5 py-2 rounded-full text-sm font-medium border transition-colors duration-200 ${
                  activeTab === key
                    ? "bg-[#FF2B2B] text-white border-[#FF2B2B]"
                    : "bg-[#F8FAFC] text-[#3A1F1F] border-gray-200 hover:bg-white"
                }`}
              >
                {key === "applied" && appliedJobsFilter === "interview"
                  ? `${label} (Filtered)`
                  : label}
              </button>
            ))}
          </div>

          {/* Applied Jobs */}
          {activeTab === "applied" && (
            <AppliedJobsSection
              userId={profile?.id}
              onJobsLoaded={setAppliedJobs}
              onInterviewDetailsOpen={setSelectedInterviewJob}
              onOfferDetailsOpen={setSelectedOfferJob}
              filterStatus={appliedJobsFilter}
            />
          )}
          {/* Saved Jobs */}
          {activeTab === "saved" && (
            <SavedJobsSection userId={profile?.id} onJobsLoaded={setSavedJobs} showComparisonControls={false} />
          )}
          {/* Job Comparison */}
          {activeTab === "compare" && (
            <div className="space-y-6">
              <SavedJobsSection
                userId={profile?.id}
                onJobsLoaded={setSavedJobs}
                showComparisonControls
                onCompareRequested={setCompareState}
              />
              {compareState && <SavedJobsComparePage forcedState={compareState} embedded />}
            </div>
          )}
        </div>

        {/* Right Sidebar — hidden when compare is active */}
        {activeTab !== "compare" && !analyticsLoading && (
          <div className="lg:col-span-1 space-y-4">
            {activeTab === "applied" && selectedOfferJob && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_2px_8px_rgba(16,24,40,0.08)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-[#3A1F1F]">Offer Details</h3>
                    <p className="text-xs text-[#8A8A8A] mt-0.5">
                      {selectedOfferJob.job?.title || "Application"} · {selectedOfferJob.job?.company_name || "Company"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedOfferJob(null)}
                    className="text-[#8A8A8A] hover:text-[#646464] transition-colors"
                    aria-label="Close offer details panel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 space-y-3 text-sm text-[#3A1F1F]">
                  <p className="whitespace-pre-wrap">
                    {(selectedOfferDetails?.offer_message || "No offer details available.").trim() || "No offer details available."}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="rounded-full bg-[#FF2B2B] text-white hover:bg-[#e02525]"
                      disabled={resolvingOfferFile || !hasOfferLetter}
                      onClick={() => void handleOpenOfferPreview()}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" /> Preview
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-full border-gray-200"
                      disabled={resolvingOfferFile || !hasOfferLetter}
                      onClick={() => void handleDownloadOffer()}
                    >
                      <Download className="h-3.5 w-3.5 mr-1" /> Download
                    </Button>
                  </div>
                  {offerFileError ? <p className="text-xs text-red-600">{offerFileError}</p> : null}
                  <p className="text-[#8A8A8A]">
                    Sent on{" "}
                    {selectedOfferDetails?.sent_at
                      ? new Date(selectedOfferDetails.sent_at).toLocaleString("en-IN")
                      : "N/A"}
                  </p>
                  {hasOfferLetter ? <p className="text-[#8A8A8A]">Offer Letter: {offerFileName}</p> : null}
                </div>
              </div>
            )}
            {activeTab === "applied" && selectedInterviewJob && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_2px_8px_rgba(16,24,40,0.08)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-[#3A1F1F]">Interview Details</h3>
                    <p className="text-xs text-[#8A8A8A] mt-0.5">
                      {selectedInterviewJob.job?.title || "Application"} · {selectedInterviewJob.job?.company_name || "Company"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedInterviewJob(null)}
                    className="text-[#8A8A8A] hover:text-[#646464] transition-colors"
                    aria-label="Close interview details panel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 space-y-2 text-sm text-[#3A1F1F]">
                  {(() => {
                    const explicitMeetingUrl = selectedInterviewJob.interview_details?.meeting_url?.trim() || "";
                    const message = selectedInterviewJob.interview_details?.interview_message || "";
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
                    {(selectedInterviewJob.interview_details?.interview_message || "No interview details available.")
                      .replace(/^meeting url:.*$/gim, "")
                      .trim() || "No interview details available."}
                  </p>
                  <p className="text-[#8A8A8A]">
                    Sent on{" "}
                    {selectedInterviewJob.interview_details?.updated_at
                      ? new Date(selectedInterviewJob.interview_details.updated_at).toLocaleString("en-IN")
                      : "N/A"}
                  </p>
                </div>
              </div>
            )}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_2px_8px_rgba(16,24,40,0.08)]">
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

            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_2px_8px_rgba(16,24,40,0.08)]">
              <h3 className="font-semibold text-[#3A1F1F] mb-4">Application Summary</h3>
              <div className="space-y-3">
                {[
                  { label: "In Progress",    count: appliedJobs.filter(j => !["offered", "offer_given", "rejected", "hired", "hire", "joined"].includes(normalizeApplicationStage(j.status))).length, color: "bg-blue-500" },
                  { label: "Offer Received", count: appliedJobs.filter(j => ["offered", "offer_given"].includes(normalizeApplicationStage(j.status))).length,  color: "bg-orange-500" },
                  { label: "Hired",         count: appliedJobs.filter(j => ["hired", "hire", "joined"].includes(normalizeApplicationStage(j.status))).length,     color: "bg-emerald-500" },
                  { label: "Rejected",       count: appliedJobs.filter(j => normalizeApplicationStage(j.status) === "rejected").length, color: "bg-red-400" },
                  { label: "Saved Jobs",     count: savedJobs.length,                                             color: "bg-amber-400" },
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

            <div className="bg-[#FF2B2B] rounded-2xl p-5 shadow-[0_2px_8px_rgba(16,24,40,0.08)] text-white">
              <h3 className="font-semibold mb-2">Profile Tip</h3>
              <p className="text-sm text-white/90">Recruiters who viewed your profile are 3× more likely to contact you. Keep your profile complete!</p>
              <Button size="sm" className="mt-3 bg-white text-[#FF2B2B] hover:bg-white/90 rounded-full text-xs w-full" onClick={() => navigate("/jobseeker/dashboard/profile")}>View Profile</Button>
            </div>
          </div>
        )}
      </div>
      {isOfferPreviewOpen && (
        <div className="fixed inset-0 z-[100] bg-black/55 p-4" onClick={closeOfferPreview}>
          <div
            className="mx-auto flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-[#F6F6F6] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-[#3A1F1F] to-[#FF2B2B] px-5 py-4 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/75">Offer Preview</p>
                  <h3 className="text-xl font-bold leading-tight">{selectedOfferJob?.job?.title || "Job Offer"}</h3>
                  <p className="text-sm text-white/80">{selectedOfferJob?.job?.company_name || "Company"}</p>
                </div>
                <button
                  type="button"
                  onClick={closeOfferPreview}
                  className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium hover:bg-white/20"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-white p-4">
              <div className="mb-4 grid gap-3 rounded-xl bg-[#F6F6F6] p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-[#8A8A8A]">Application Status</p>
                  <p className="text-sm font-semibold text-[#3A1F1F]">{selectedOfferJob?.status || "Offered"}</p>
                </div>
                <div>
                  <p className="text-xs text-[#8A8A8A]">Offer Sent On</p>
                  <p className="text-sm font-semibold text-[#3A1F1F]">
                    {selectedOfferDetails?.sent_at ? new Date(selectedOfferDetails.sent_at).toLocaleString("en-IN") : "N/A"}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-[#8A8A8A]">Offer Letter</p>
                  <p className="text-sm font-semibold text-[#3A1F1F] break-all">{offerFileName}</p>
                </div>
              </div>
              <div className="mb-4">
                <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-[#3A1F1F]">
                  <FileText className="h-4 w-4 text-[#FF2B2B]" /> Offer Message
                </h4>
                <p className="rounded-xl border-l-2 border-[#FF2B2B] bg-[#F6F6F6] p-3 text-sm text-[#5A5A5A]">
                  {(selectedOfferDetails?.offer_message || "No offer details available.").trim() || "No offer details available."}
                </p>
              </div>
              <div className="mb-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="rounded-full bg-[#FF2B2B] text-white hover:bg-[#e02525]"
                  disabled={!offerPreviewUrl}
                  onClick={() => {
                    if (!offerPreviewUrl) return;
                    void downloadOfferLetter(offerPreviewUrl, offerFileName);
                  }}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Download Offer Letter
                </Button>
              </div>
              {offerPreviewSrc && canInlinePreview ? (
                <iframe
                  title="Offer letter preview"
                  src={offerPreviewSrc}
                  className="h-[60vh] w-full rounded-xl border border-gray-200"
                />
              ) : (
                <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-gray-300 text-sm text-[#8A8A8A]">
                  {canInlinePreview
                    ? "Unable to load preview."
                    : "Preview is not available for this file type. Please use Download Offer Letter."}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// ── Career Insights helpers ───────────────────────────────────────────────────
type DemandLevel = "High" | "Medium" | "Growing";
interface DomainData {
  roleTitle: string;
  trendingSkills: Array<{ skill: string; demand: DemandLevel; youHaveIt?: boolean }>;
  salaryRange: { entry: string; mid: string; senior: string };
  certifications: Array<{ name: string; provider: string; value: string; reason?: string }>;
}
interface TrendingSkillSuggestion {
  skill: string;
  demand: DemandLevel;
  matchingJobs: number;
  relevanceScore: number;
  suggestion: string;
}
interface RemotiveJob {
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
  candidate_required_location?: string;
  job_type?: string;
}
type CertificationSuggestion = { name: string; provider: string; value: string; reason?: string };

const TRENDING_SKILL_LIMIT = 12;
const REMOTIVE_JOBS_API_URL = "https://remotive.com/api/remote-jobs";

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
      { skill: "DevOps", demand: "High" },
      { skill: "AWS", demand: "High" },
      { skill: "Docker", demand: "High" },
      { skill: "Kubernetes", demand: "High" },
      { skill: "Terraform", demand: "High" },
      { skill: "GitHub Actions", demand: "High" },
      { skill: "CI/CD", demand: "High" },
      { skill: "Linux", demand: "High" },
      { skill: "Monitoring", demand: "Growing" },
      { skill: "Prometheus", demand: "Growing" },
      { skill: "Grafana", demand: "Growing" },
      { skill: "DevSecOps", demand: "Growing" },
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

function normalizeSkillLabel(skill: string): string {
  return skill.trim().replace(/\s+/g, " ");
}

function normalizeSkillKey(skill: string): string {
  return normalizeSkillLabel(skill).toLowerCase();
}

function seekerHasSkill(userSkills: string[], jobSkill: string): boolean {
  const target = normalizeSkillKey(jobSkill);
  if (!target) return true;
  return userSkills.some((skill) => {
    const owned = normalizeSkillKey(skill);
    return owned === target || owned.includes(target) || target.includes(owned);
  });
}

function getTrendingDemand(count: number, matchedJobCount: number): DemandLevel {
  if (count >= Math.max(3, Math.ceil(matchedJobCount * 0.25))) return "High";
  if (count >= Math.max(2, Math.ceil(matchedJobCount * 0.1))) return "Growing";
  return "Medium";
}

function getDemandScore(demand: DemandLevel): number {
  if (demand === "High") return 2;
  if (demand === "Growing") return 1;
  return 0;
}

function skillMatchesLabel(candidate: string, label: string): boolean {
  const candidateKey = normalizeSkillKey(candidate);
  const labelKey = normalizeSkillKey(label);
  if (!candidateKey || !labelKey) return false;
  return candidateKey === labelKey || candidateKey.includes(labelKey) || labelKey.includes(candidateKey);
}

function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").replace(/\s+/g, " ").trim();
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ");
}

function getMarketSearchTerm(domain: string, title: string): string {
  const trimmedTitle = title.trim();
  if (trimmedTitle) return trimmedTitle;

  const fallbackTerms: Record<string, string> = {
    ml: "machine learning",
    data: "data",
    frontend: "frontend",
    backend: "backend",
    devops: "devops",
    design: "designer",
    marketing: "marketing",
    general: "technology",
  };

  return fallbackTerms[domain] || fallbackTerms.general;
}

function getSkillSearchTerms(label: string): string[] {
  const withoutParentheses = label.replace(/\([^)]*\)/g, " ");
  return Array.from(new Set(
    [label, withoutParentheses, ...withoutParentheses.split(/[\/&|,]/)]
      .map((term) => normalizeSearchText(term))
      .filter((term) => term.length > 1)
  ));
}

function skillAppearsInText(text: string, label: string): boolean {
  const normalizedText = ` ${normalizeSearchText(text)} `;
  return getSkillSearchTerms(label).some((term) => normalizedText.includes(` ${term} `));
}

function incrementSkillCount(skillCounts: Map<string, { label: string; count: number }>, label: string) {
  const key = normalizeSkillKey(label);
  if (!key) return;
  const current = skillCounts.get(key);
  skillCounts.set(key, {
    label: current?.label || label,
    count: (current?.count || 0) + 1,
  });
}

function getRelevanceScore(options: {
  skill: string;
  domainData: DomainData;
  demand: DemandLevel;
  matchingJobs: number;
  totalSignalJobs: number;
}): number {
  const domainIndex = options.domainData.trendingSkills.findIndex((item) => skillMatchesLabel(item.skill, options.skill));
  const domainScore = domainIndex >= 0
    ? Math.max(3, 6 - Math.floor(domainIndex / 3))
    : 0;
  const jobEvidenceScore = options.matchingJobs > 0
    ? Math.min(2, Math.ceil((options.matchingJobs / Math.max(options.totalSignalJobs, 1)) * 10))
    : 0;

  return Math.min(10, domainScore + jobEvidenceScore + getDemandScore(options.demand));
}

async function fetchRemotiveJobs(searchTerm: string): Promise<RemotiveJob[]> {
  try {
    const params = new URLSearchParams({ search: searchTerm, limit: "50" });
    const response = await fetch(`${REMOTIVE_JOBS_API_URL}?${params.toString()}`);
    if (!response.ok) return [];
    const payload = await response.json();
    return Array.isArray(payload?.jobs) ? payload.jobs : [];
  } catch {
    return [];
  }
}

// ── Career Insights Page ───────────────────────────────────────────────────────
function InsightsPage() {
  const { profile } = useAuth();
  const [recommendedJobs, setRecommendedJobs] = useState<Array<{
    id: string; title: string; company: string; location: string; salary: string; match: number;
  }>>([]);
  const [trendingSkillSuggestions, setTrendingSkillSuggestions] = useState<TrendingSkillSuggestion[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [aiInsights, setAiInsights] = useState<GeminiInsightsResult | null>(null);
  const [loadingAI, setLoadingAI] = useState(true);


  const skills: string[] = Array.isArray(profile?.skills)
    ? profile.skills.filter((skill): skill is string => typeof skill === "string")
    : [];
  const skillsKey = [...skills].sort().join(","); // stable string for effect dependency
  const profilePreferences = (profile || {}) as any;
  const preferredRole = String(profilePreferences.desired_job_title || profile?.current_title || "").trim();
  const titleStr = preferredRole || String(profile?.current_title || "");
  const domain = detectDomain(skills, titleStr);
  const domainData = DOMAIN_MAP[domain];
  const tier = getExpTier(profile?.experience_type || null, profile?.total_experience || null);
  const trendingContextLabel = preferredRole || (domain === "general" ? "profile" : domainData.roleTitle);
  const certificationSuggestions: CertificationSuggestion[] = aiInsights?.certifications ?? domainData.certifications;

  // Salary info
  const tierLabel = tier === "entry" ? "Entry Level (0–2 yrs)" : tier === "mid" ? "Mid Level (2–6 yrs)" : "Senior Level (6+ yrs)";
  const marketRange = domainData.salaryRange[tier];
  const currentSalary = profile?.current_salary || null;
  const expectedSalary = profile?.expected_salary || null;

  // Fetch recommended jobs and skill demand from DB based on user's skills + preferred role
  useEffect(() => {
    if (!profile) { setLoadingJobs(false); setLoadingAI(false); return; }
    // Clear stale results immediately so old skills never show while new ones load
    setTrendingSkillSuggestions([]);
    setAiInsights(null);
    async function fetchJobs() {
      setLoadingJobs(true);
      setLoadingAI(true);
      const marketSearchTerm = getMarketSearchTerm(domain, titleStr);
      const [{ data }, marketJobs, geminiResult] = await Promise.all([
        supabase
          .from("jobs")
          .select("id, title, company_name, location, salary_min, salary_max, salary_type, skills, employment_type, status, deadline, deadline_time")
          .eq("status", "Active")
          .limit(30),
        fetchRemotiveJobs(marketSearchTerm),
        fetchGeminiInsights(skills),
      ]);
      setAiInsights(geminiResult);
      setLoadingAI(false);

      if (data) {
        const visibleJobs = data.filter(job => isJobVisibleToSeekers(job));
        const userSkillsLower = skills.map(normalizeSkillKey);
        const titleWords: string[] = titleStr.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);

        const scored = visibleJobs.map(job => {
          const jobSkills: string[] = job.skills || [];

          // Skill overlap score (0–70)
          const overlap = userSkillsLower.filter(us =>
            jobSkills.some((jobSkill: string) => skillMatchesLabel(us, jobSkill))
          ).length;
          const skillScore = jobSkills.length > 0
            ? Math.round((overlap / Math.max(jobSkills.length, skills.length, 1)) * 70)
            : 20;

          // Title similarity score (0–30)
          const jobTitleLower = job.title.toLowerCase();
          const titleScore = titleWords.some((word: string) => jobTitleLower.includes(word)) ? 25 : 0;

          const match = Math.min(Math.max(skillScore + titleScore + 30, 40), 99);

          const salary = formatJobSalary(job as DBJob);

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

        const matchedForTrends = visibleJobs.filter((job) => {
          const searchable = [
            job.title,
            job.location || "",
            job.employment_type || "",
            ...(job.skills || []),
          ].join(" ").toLowerCase();

          const roleMatch = titleWords.length === 0 || titleWords.some((word: string) => searchable.includes(word));
          const skillMatch = userSkillsLower.length === 0 || (job.skills || []).some((jobSkill: string) =>
            userSkillsLower.some((userSkill) => skillMatchesLabel(userSkill, jobSkill))
          );

          return roleMatch || skillMatch;
        });

        const trendSourceJobs = matchedForTrends.length > 0 ? matchedForTrends : [];
        const skillCounts = new Map<string, { label: string; count: number }>();

        trendSourceJobs.forEach((job) => {
          const seenInJob = new Set<string>();
          (job.skills || []).forEach((skill: string) => {
            const label = normalizeSkillLabel(skill);
            const key = normalizeSkillKey(label);
            if (!key || seenInJob.has(key) || seekerHasSkill(skills, label)) return;

            seenInJob.add(key);
            incrementSkillCount(skillCounts, label);
          });
        });

        marketJobs.forEach((job) => {
          const searchable = [
            job.title || "",
            job.category || "",
            job.candidate_required_location || "",
            job.job_type || "",
            ...(job.tags || []),
            stripHtml(job.description || ""),
          ].join(" ");
          const seenInJob = new Set<string>();

          domainData.trendingSkills.forEach((item) => {
            const key = normalizeSkillKey(item.skill);
            if (!key || seenInJob.has(key) || !skillAppearsInText(searchable, item.skill)) return;
            seenInJob.add(key);
            incrementSkillCount(skillCounts, item.skill);
          });
        });

        const totalSignalJobs = Math.max(trendSourceJobs.length + marketJobs.length, 1);
        const countedSkills = Array.from(skillCounts.values())
          .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
          .map(({ label, count }) => {
            const demand = getTrendingDemand(count, totalSignalJobs);
            return {
              skill: label,
              matchingJobs: count,
              demand,
              relevanceScore: getRelevanceScore({
                skill: label,
                domainData,
                demand,
                matchingJobs: count,
                totalSignalJobs,
              }),
              suggestion: `Learn ${label} to match ${count} more ${trendingContextLabel === "profile" ? "jobs" : `${trendingContextLabel} jobs`}.`,
            };
          });

        const domainSuggestions = domainData.trendingSkills.map((item) => {
          const matchedCount = countedSkills.find((candidate) => skillMatchesLabel(candidate.skill, item.skill))?.matchingJobs || 0;
          const demand = matchedCount > 0 ? getTrendingDemand(matchedCount, totalSignalJobs) : item.demand;
          return {
            skill: item.skill,
            matchingJobs: matchedCount,
            demand,
            relevanceScore: getRelevanceScore({
              skill: item.skill,
              domainData,
              demand,
              matchingJobs: matchedCount,
              totalSignalJobs,
            }),
            suggestion: `${item.skill} is relevant for ${trendingContextLabel === "profile" ? "your profile" : `${trendingContextLabel} roles`}.`,
          };
        });

        // Trending skills come exclusively from Gemini — no hardcoded fallback
        if (geminiResult?.trendingSkills?.length) {
          const aiSuggestions: TrendingSkillSuggestion[] = geminiResult.trendingSkills
            .filter((ai) => !seekerHasSkill(skills, ai.skill))
            .map((ai, idx) => ({
              skill: ai.skill,
              demand: ai.demand,
              matchingJobs: 0,
              relevanceScore: Math.max(10 - idx, 5),
              suggestion: ai.reason,
            }))
            .slice(0, TRENDING_SKILL_LIMIT);
          setTrendingSkillSuggestions(aiSuggestions);
        } else {
          setTrendingSkillSuggestions([]);
        }
      } else {
        if (geminiResult?.trendingSkills?.length) {
          const aiSuggestions: TrendingSkillSuggestion[] = geminiResult.trendingSkills
            .filter((ai) => !seekerHasSkill(skills, ai.skill))
            .map((ai, idx) => ({
              skill: ai.skill,
              demand: ai.demand,
              matchingJobs: 0,
              relevanceScore: Math.max(10 - idx, 5),
              suggestion: ai.reason,
            }))
            .slice(0, TRENDING_SKILL_LIMIT);
          setTrendingSkillSuggestions(aiSuggestions);
        } else {
          setTrendingSkillSuggestions([]);
        }
      }
      setLoadingJobs(false);
    }
    fetchJobs();
  }, [profile?.id, skillsKey, titleStr, trendingContextLabel, domain, domainData]);

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
            Based on your {skills.length > 0 ? `${skills.length} skills` : "profile"}
            {aiInsights ? " · Groq AI" : " · Remotive market API"}
          </p>
          {loadingJobs ? (
            <div className="flex items-center justify-center py-10 text-[#8A8A8A]">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Finding skill gaps...
            </div>
          ) : trendingSkillSuggestions.length > 0 ? (
            <div className="space-y-2.5">
              {trendingSkillSuggestions.map((item) => (
                <div key={item.skill} className="flex items-center justify-between gap-3 p-3 bg-[#F6F6F6] rounded-xl">
                  <div className="min-w-0">
                    <span className="block text-sm text-[#3A1F1F] truncate">{item.skill}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={`text-xs ${demandBadge(item.demand)}`}>{item.demand}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[#8A8A8A]">
              <Lightbulb className="h-10 w-10 mx-auto mb-2 text-gray-200" />
              <p className="text-sm">
                {skills.length === 0
                  ? "Add your skills to get AI-powered trending skill suggestions."
                  : "AI analysis unavailable — restart the dev server and reload to retry."}
              </p>
            </div>
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
          <p className="text-xs text-[#8A8A8A] mb-4">
            {aiInsights ? "AI-curated for your skills · Groq AI" : "Tailored for your domain and experience level"}
          </p>
          {loadingAI ? (
            <div className="flex items-center justify-center py-10 text-[#8A8A8A]">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Analysing market certifications...
            </div>
          ) : (
            <div className="space-y-3">
              {(aiInsights?.certifications ?? domainData.certifications).map((cert: { name: string; provider?: string; reason?: string; value: string }, i: number) => {
                const reason = "reason" in cert && typeof cert.reason === "string" ? cert.reason : "";

                return (
                  <div key={i} className="p-4 bg-[#F6F6F6] rounded-xl">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-semibold text-[#3A1F1F] text-sm leading-snug">{cert.name}</h4>
                        <p className="text-xs text-[#8A8A8A] mt-0.5">{cert.provider}</p>
                        {reason && (
                          <p className="text-xs text-blue-600 mt-1 leading-snug">{reason}</p>
                        )}
                      </div>
                      <Badge className={`text-xs flex-shrink-0 ${certBadge(cert.value)}`}>{cert.value}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
