import { useState, useEffect, useCallback, useRef, useMemo, type ChangeEvent } from "react";
import { useNavigate, Routes, Route, Link, useLocation, useParams } from "react-router";
import { supabase, Job, Application, Notification, Profile, WorkExperience, Education as EduType, RecruiterSubscription, RecruiterArticle } from "../../lib/supabase";
import {
  SALARY_AMOUNT_OPTIONS,
  JOB_EXPIRY_DAYS,
  buildJobDeadlineTimestamp,
  buildJobExpiryTimestamp,
  formatJobDeadline,
  formatJobSalary,
  formatSalaryRangeFromValues,
  getEffectiveJobStatus,
  getJobDaysRemaining,
  isJobExpired,
} from "../../lib/jobs";
import { PLANS, FREE_DAILY_POST_LIMIT, getPlanById, validatePromo, getPlanPriceBreakdown } from "../../lib/plans";
import { INDIA_CITY_OPTIONS } from "../../lib/locationData";
import { SEARCH_SUGGESTION_DATASET, SKILL_OPTIONS, getSkillSearchTerms, skillsMatch } from "../../lib/skillKeywords";
import { useAuth } from "../../lib/auth-context";
import logoImage from "../../logo/logo.png";
import {
  Bell, LogOut, Plus, Edit, Pause, Trash2, User, Upload, Building2,
  Search, Filter, Download, Mail, Phone, MapPin, Calendar, Clock,
  Briefcase, GraduationCap, Star, ChevronDown, ChevronRight, Eye,
  BarChart2, TrendingUp, Users, FileText, CheckCircle, XCircle,
  MessageSquare, Video, Award, BookOpen, Globe, Linkedin, Share2,
  ArrowRight, Target, Zap, RefreshCw, MoreVertical, ThumbsUp, ThumbsDown, ExternalLink, Loader2,
  CreditCard, Tag, ShieldCheck, Crown, Check,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { RichTextEditor } from "../components/ui/rich-text-editor";
import { SafeHtml } from "../components/ui/safe-html";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "../components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import FeedbackPopup from "../components/FeedbackPopup";
import InterviewDetailsModal from "../components/InterviewDetailsModal";
import InterviewFeedbackModal from "../components/InterviewFeedbackModal";
import OfferDetailsModal from "../components/OfferDetailsModal";
import ResumePreviewDialog, { getStorageObjectFromUrl, buildPreviewUrl } from "../components/ResumePreviewDialog";
import JobShareButton from "../components/JobShareButton";
import ApplicantProfilePage from "./ApplicantProfilePage";

const DEPARTMENT_OPTIONS = [
  "Engineering",
  "Software Development",
  "Information Technology",
  "Data Science",
  "Artificial Intelligence / Machine Learning",
  "Product Management",
  "Project Management",
  "Quality Assurance",
  "DevOps / Cloud Infrastructure",
  "Cybersecurity",
  "UI/UX Design",
  "Design / Creative",
  "Research and Development",
  "Operations",
  "Business Operations",
  "Sales",
  "Business Development",
  "Marketing",
  "Digital Marketing",
  "Content / Editorial",
  "Customer Support",
  "Customer Success",
  "Human Resources",
  "Talent Acquisition",
  "Finance",
  "Accounting",
  "Legal",
  "Compliance",
  "Administration",
  "Procurement",
  "Supply Chain",
  "Logistics",
  "Manufacturing",
  "Production",
  "Maintenance",
  "Healthcare / Clinical",
  "Education / Training",
  "Consulting",
  "Analytics",
  "Strategy",
  "Public Relations",
  "Facilities",
  "Security",
  "Other",
];

const ARTICLE_CATEGORY_OPTIONS = [
  "Career Tips",
  "Industry Insights",
  "Recruitment Trends",
  "Employer Tips",
  "Job Search",
  "Workplace Culture",
  "Remote Work",
  "AI in Recruitment",
  "Resume Building",
  "Interview Preparation",
  "Hiring Strategy",
  "Leadership",
  "Employee Engagement",
  "Salary Insights",
  "Freshers Guide",
];

type RecruiterArticleDraft = {
  title: string;
  category: string;
  summary: string;
  keyTakeaway: string;
  content: string;
  imageName: string;
};

const createEmptyArticleDraft = (): RecruiterArticleDraft => ({
  title: "",
  category: "Career Tips",
  summary: "",
  keyTakeaway: "",
  content: "",
  imageName: "",
});

const toArticleCardText = (article: RecruiterArticle) => article.summary || article.content;

function LocationAutocomplete({
  value,
  onChange,
  placeholder = "Search city",
  required = false,
  className = "",
  inputClassName = "",
  onEnter,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  inputClassName?: string;
  onEnter?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearch(value);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const filteredCities = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return INDIA_CITY_OPTIONS;

    const startsWith = INDIA_CITY_OPTIONS.filter(city => city.toLowerCase().startsWith(query));
    const includes = INDIA_CITY_OPTIONS.filter(city => {
      const normalized = city.toLowerCase();
      return !normalized.startsWith(query) && normalized.includes(query);
    });
    return [...startsWith, ...includes];
  }, [search]);

  const selectCity = (city: string, submit = false) => {
    const next = city.trim();
    onChange(next);
    setSearch(next);
    setOpen(false);
    if (submit && onEnter) onEnter();
  };

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A8A8A]" />
        <Input
          value={search}
          required={required}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setSearch(e.target.value);
            onChange(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              selectCity(filteredCities[0] || search, true);
            }
            if (e.key === "Escape") setOpen(false);
          }}
          className={`bg-[#F6F6F6] border-gray-200 rounded-xl pl-9 pr-10 ${inputClassName}`}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setOpen(current => !current)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8A8A] hover:text-[#3A1F1F]"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
      {open && (
        <div className="absolute left-0 right-0 top-full z-[80] mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          <div className="max-h-72 overflow-y-auto p-1">
            {filteredCities.length === 0 ? (
              <button
                type="button"
                onClick={() => selectCity(search)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[#3A1F1F] hover:bg-[#FFF0F0]"
              >
                <Plus className="h-4 w-4 text-[#FF2B2B]" />
                <span>Add "{search.trim()}"</span>
              </button>
            ) : (
              filteredCities.map((city) => {
                const selected = value.toLowerCase() === city.toLowerCase();
                return (
                  <button
                    key={city}
                    type="button"
                    onClick={() => selectCity(city)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[#3A1F1F] hover:bg-[#FFF0F0]"
                  >
                    <Check className={`h-4 w-4 ${selected ? "text-[#FF2B2B] opacity-100" : "opacity-0"}`} />
                    <span>{city}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Types ──────────────────────────────────────────────────────────────────

function getSalaryFormValue(val: number | null | undefined): string {
  if (val === null || val === undefined) return "";
  return String(val);
}

function SalaryCombobox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const formatSalaryAmount = (amount: number) => {
    const lpa = amount >= 1000 ? amount / 100000 : amount;
    const label = Number.isInteger(lpa) ? String(lpa) : lpa.toFixed(1).replace(/\.0$/, "");
    return `${label} LPA${lpa >= 50 ? "+" : ""}`;
  };
  const selectedOption = SALARY_AMOUNT_OPTIONS.find(option => String(option.value) === value);
  const selectedLabel = selectedOption?.label ?? (value ? formatSalaryAmount(Number(value)) : "");
  const displayValue = open ? search : selectedLabel;

  useEffect(() => {
    if (!open) setSearch(selectedLabel);
  }, [open, selectedLabel]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const filteredOptions = useMemo(() => {
    const query = search.replace(/\D/g, "");
    if (!query) return SALARY_AMOUNT_OPTIONS;

    const addOption = (
      map: Map<number, { value: number; label: string; score: number }>,
      amount: number,
      score: number,
    ) => {
      if (!Number.isFinite(amount) || amount < 0 || amount > 50) return;
      const existing = map.get(amount);
      if (!existing || score < existing.score) {
        map.set(amount, { value: amount, label: formatSalaryAmount(amount), score });
      }
    };

    const matchingOptions = SALARY_AMOUNT_OPTIONS.filter(option => {
      const normalizedLabel = option.label.toLowerCase().replace(/\s/g, "");
      return normalizedLabel.includes(query) || String(option.value).includes(query);
    });

    const typedNumber = Number(query);
    const optionMap = new Map<number, { value: number; label: string; score: number }>();

    if (typedNumber === 0) addOption(optionMap, 0, 0);
    if (typedNumber > 0 && typedNumber <= 50) addOption(optionMap, typedNumber, 0);

    matchingOptions.forEach(option => addOption(optionMap, option.value, 1));

    if (typedNumber > 0) {
      SALARY_AMOUNT_OPTIONS
        .map(option => ({ ...option, distance: Math.abs(option.value - typedNumber) }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 4)
        .forEach((option, index) => addOption(optionMap, option.value, 2 + index));
    }

    return Array.from(optionMap.values())
      .sort((a, b) => a.score - b.score || a.value - b.value)
      .slice(0, 8);
  }, [search]);

  const selectSalary = (option: { value: number; label: string }) => {
    onChange(String(option.value));
    setSearch(option.label);
    setOpen(false);
  };

  return (
    <div className="relative flex-1" ref={wrapperRef}>
      <div className="relative">
        <Input
          value={displayValue}
          inputMode="numeric"
          onFocus={() => {
            setSearch(selectedLabel);
            setOpen(true);
          }}
          onChange={e => {
            setSearch(e.target.value.replace(/\D/g, ""));
            if (value) onChange("");
            setOpen(true);
          }}
          onKeyDown={e => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (filteredOptions[0]) selectSalary(filteredOptions[0]);
            }
            if (e.key === "Escape") setOpen(false);
          }}
          className="h-10 rounded-xl border-gray-200 bg-[#F6F6F6] pr-10 text-[#3A1F1F]"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => {
            setSearch(selectedLabel);
            setOpen(current => !current);
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8A8A] hover:text-[#3A1F1F]"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
      {open && (
        <div className="absolute left-0 right-0 top-full z-[90] mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          <div className="max-h-72 overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-3 text-sm text-[#8A8A8A]">No salary found.</div>
            ) : (
              filteredOptions.map(option => {
                const optionValue = String(option.value);
                const selected = optionValue === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => selectSalary(option)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[#3A1F1F] hover:bg-[#FFF0F0]"
                  >
                    <Check className={`h-4 w-4 ${selected ? "text-[#FF2B2B] opacity-100" : "opacity-0"}`} />
                    <span>{option.label}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface Experience {
  company: string;
  title: string;
  from: string;
  to: string;
  current: boolean;
  location: string;
  description: string;
}

interface Education {
  institution: string;
  degree: string;
  field: string;
  from: string;
  to: string;
  score?: string;
}

interface Candidate {
  id: number;
  name: string;
  initials: string;
  headline: string;
  totalExp: string;
  currentCompany: string;
  currentTitle: string;
  location: string;
  email: string;
  phone: string;
  noticePeriod: string;
  currentSalary: string;
  expectedSalary: string;
  skills: string[];
  experience: Experience[];
  education: Education[];
  appliedFor: string;
  appliedDate: string;
  status: "Applied" | "Under Review" | "Shortlisted" | "Interview Scheduled" | "Interview Completed" | "Interview Selected" | "Offered" | "Joined" | "Rejected" | "On Hold";
  matchScore: number;
  resumeScore: number;
  about?: string;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────



const jobsData = [
  { id: 1, title: "Senior Data Analyst", applicants: 45, views: 1240, status: "Active", posted: "2 days ago", location: "Bengaluru", type: "Full-time", salary: "15-25 LPA", pipeline: { new: 12, reviewed: 18, shortlisted: 9, interview: 4, offered: 2 } },
  { id: 2, title: "Marketing Manager", applicants: 32, views: 867, status: "Active", posted: "1 week ago", location: "New Delhi", type: "Full-time", salary: "18-28 LPA", pipeline: { new: 8, reviewed: 14, shortlisted: 7, interview: 2, offered: 1 } },
  { id: 3, title: "Product Designer", applicants: 28, views: 654, status: "Paused", posted: "2 weeks ago", location: "Bengaluru", type: "Full-time", salary: "12-20 LPA", pipeline: { new: 4, reviewed: 12, shortlisted: 8, interview: 3, offered: 1 } },
  { id: 4, title: "Software Engineer", applicants: 67, views: 2100, status: "Active", posted: "3 days ago", location: "Hyderabad", type: "Full-time", salary: "20-40 LPA", pipeline: { new: 22, reviewed: 28, shortlisted: 11, interview: 5, offered: 1 } },
];

const PIPELINE_STAGES = [
  "Applied",
  "Under Review",
  "Shortlisted",
  "Interview Scheduled",
  "Interview Completed",
  "Interview Selected",
  "Interview Rejected",
  "Offered",
  "Joined",
  "Rejected",
  "On Hold",
] as const;

type PipelineStage = typeof PIPELINE_STAGES[number];

const PIPELINE_STAGE_STYLES: Record<PipelineStage, { bar: string; badge: string; text: string }> = {
  Applied: {
    bar: "bg-[#4F8EF7]/70",
    badge: "bg-gray-50 border-gray-100 hover:bg-gray-100",
    text: "text-[#4F8EF7]",
  },
  "Under Review": {
    bar: "bg-slate-400/60",
    badge: "bg-blue-50/70 border-blue-100/70 hover:bg-blue-50",
    text: "text-slate-500",
  },
  Shortlisted: {
    bar: "bg-pink-400/60",
    badge: "bg-pink-50/70 border-pink-100/70 hover:bg-pink-50",
    text: "text-pink-600",
  },
  "Interview Scheduled": {
    bar: "bg-purple-300/65",
    badge: "bg-purple-50/70 border-purple-100/70 hover:bg-purple-50",
    text: "text-purple-500",
  },
  "Interview Completed": {
    bar: "bg-indigo-400/60",
    badge: "bg-indigo-50/70 border-indigo-100/70 hover:bg-indigo-50",
    text: "text-indigo-600",
  },
  "Interview Selected": {
    bar: "bg-teal-400/60",
    badge: "bg-teal-50/70 border-teal-100/70 hover:bg-teal-50",
    text: "text-teal-600",
  },
  "Interview Rejected": {
    bar: "bg-red-400/60",
    badge: "bg-red-50/70 border-red-100/70 hover:bg-red-50",
    text: "text-red-650",
  },
  Offered: {
    bar: "bg-green-400/60",
    badge: "bg-orange-50/70 border-orange-100/70 hover:bg-orange-50",
    text: "text-green-600",
  },
  Joined: {
    bar: "bg-emerald-500/65",
    badge: "bg-emerald-50/70 border-emerald-100/70 hover:bg-emerald-50",
    text: "text-emerald-600",
  },
  Rejected: {
    bar: "bg-red-300/60",
    badge: "bg-red-50/70 border-red-100/70 hover:bg-red-50",
    text: "text-red-500",
  },
  "On Hold": {
    bar: "bg-amber-400/60",
    badge: "bg-amber-50/70 border-amber-100/70 hover:bg-amber-50",
    text: "text-amber-600",
  },
};

function mapApplicationStatusToPipelineStage(status: string | null | undefined): PipelineStage {
  const normalized = (status || "").toLowerCase().trim().replace(/[\s-]+/g, "_");
  if (normalized === "applied" || normalized === "new") return "Applied";
  if (normalized === "under_review" || normalized === "screening" || normalized === "reviewed") return "Under Review";
  if (normalized === "shortlisted") return "Shortlisted";
  if (normalized === "interview_scheduled" || normalized === "interview") return "Interview Scheduled";
  if (normalized === "interview_completed") return "Interview Completed";
  if (normalized === "interview_selected") return "Interview Selected";
  if (normalized === "interview_rejected") return "Interview Rejected";
  if (normalized === "offered" || normalized === "offer_given") return "Offered";
  if (normalized === "joined" || normalized === "hired" || normalized === "hire") return "Joined";
  if (normalized === "rejected") return "Rejected";
  if (normalized === "on_hold") return "On Hold";
  return "Applied";
}

// ─── Status Color Helper ──────────────────────────────────────────────────────

function statusColor(status: string) {
  const stage = mapApplicationStatusToPipelineStage(status);
  switch (stage) {
    case "Applied": return "bg-gray-100 text-gray-700";
    case "Under Review": return "bg-blue-100 text-blue-700";
    case "Shortlisted": return "bg-pink-100 text-pink-700";
    case "Interview Scheduled": return "bg-purple-100 text-purple-700";
    case "Interview Completed": return "bg-indigo-100 text-indigo-700";
    case "Interview Selected": return "bg-teal-100 text-teal-700";
    case "Interview Rejected": return "bg-red-100 text-red-700";
    case "Offered": return "bg-orange-100 text-orange-700";
    case "Joined": return "bg-emerald-100 text-emerald-700";
    case "Rejected": return "bg-red-100 text-red-700";
    case "On Hold": return "bg-amber-100 text-amber-700";
    default: return "bg-gray-100 text-gray-700";
  }
}

const STATUS_TRANSITIONS: Record<PipelineStage, PipelineStage[]> = {
  Applied: ["Under Review"],
  "Under Review": ["Shortlisted"],
  Shortlisted: ["Interview Scheduled"],
  "Interview Scheduled": ["Interview Completed"],
  "Interview Completed": ["Interview Selected", "Interview Rejected"],
  "Interview Selected": ["Offered", "Interview Rejected"],
  "Interview Rejected": ["Under Review"],
  Offered: ["Joined", "Rejected"],
  Joined: [],
  Rejected: ["Under Review"],
  "On Hold": ["Under Review"],
};

// ─── Career Timeline Component (Naukri-style) ────────────────────────────────

function CareerTimeline({ experience, education }: { experience: Experience[]; education: Education[] }) {
  return (
    <div className="space-y-6">
      {/* Work Experience Timeline */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Briefcase className="h-5 w-5 text-[#FF2B2B]" />
          <h4 className="font-semibold text-[#3A1F1F] text-base">Work Experience</h4>
          <span className="text-sm text-[#8A8A8A]">({experience.length} jobs)</span>
        </div>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-[#FF2B2B] via-[#ff6b6b] to-[#ffb3b3]" />
          <div className="space-y-0">
            {experience.map((exp, idx) => (
              <div key={idx} className="relative flex gap-4 pb-6 last:pb-0">
                {/* Timeline dot */}
                <div className="relative z-10 flex-shrink-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md ${idx === 0 ? "bg-[#FF2B2B]" : "bg-[#8A8A8A]"}`}>
                    {exp.current ? <Zap className="h-4 w-4" /> : <Briefcase className="h-4 w-4" />}
                  </div>
                </div>
                {/* Content */}
                <div className={`flex-1 rounded-xl p-4 border ${idx === 0 ? "bg-red-50 border-red-100" : "bg-white border-gray-100"} shadow-sm`}>
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div>
                      <h5 className="font-semibold text-[#3A1F1F] text-sm">{exp.title}</h5>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Building2 className="h-3.5 w-3.5 text-[#FF2B2B]" />
                        <span className="text-sm text-[#FF2B2B] font-medium">{exp.company}</span>
                        {exp.current && <Badge className="bg-green-100 text-green-700 text-xs py-0 px-1.5 ml-1">Current</Badge>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-xs text-[#8A8A8A]">
                        <Calendar className="h-3 w-3" />
                        <span>{exp.from} – {exp.to}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-[#8A8A8A] mt-0.5">
                        <MapPin className="h-3 w-3" />
                        <span>{exp.location}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-[#5A5A5A] mt-2 leading-relaxed">{exp.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Education Timeline */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <GraduationCap className="h-5 w-5 text-[#FF2B2B]" />
          <h4 className="font-semibold text-[#3A1F1F] text-base">Education</h4>
        </div>
        <div className="relative">
          <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-blue-400 to-blue-100" />
          <div className="space-y-0">
            {education.map((edu, idx) => (
              <div key={idx} className="relative flex gap-4 pb-6 last:pb-0">
                <div className="relative z-10 flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center shadow-md">
                    <GraduationCap className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div className="flex-1 rounded-xl p-4 border bg-blue-50 border-blue-100 shadow-sm">
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div>
                      <h5 className="font-semibold text-[#3A1F1F] text-sm">{edu.degree} in {edu.field}</h5>
                      <div className="flex items-center gap-1 mt-0.5">
                        <BookOpen className="h-3.5 w-3.5 text-blue-500" />
                        <span className="text-sm text-blue-600 font-medium">{edu.institution}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-xs text-[#8A8A8A]">
                        <Calendar className="h-3 w-3" />
                        <span>{edu.from} – {edu.to}</span>
                      </div>
                      {edu.score && (
                        <div className="flex items-center gap-1 text-xs text-blue-600 mt-0.5 font-medium">
                          <Award className="h-3 w-3" />
                          <span>{edu.score}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Candidate Profile Modal ─────────────────────────────────────────────────

function CandidateProfileModal({ candidate, open, onClose }: { candidate: Candidate; open: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-[#3A1F1F] to-[#6B3A3A] p-6 rounded-t-lg">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 bg-[#FF2B2B] rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg flex-shrink-0">
              {candidate.initials}
            </div>
            <div className="flex-1 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{candidate.name}</h2>
                  <p className="text-red-200 text-sm mt-0.5">{candidate.headline}</p>
                  <div className="flex items-center gap-3 mt-2 text-red-100 text-sm flex-wrap">
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{candidate.location}</span>
                    <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{candidate.totalExp}</span>
                    <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{candidate.currentCompany}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="bg-white/20 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-white">{candidate.matchScore}%</div>
                    <div className="text-xs text-red-200">Match Score</div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                <Button size="sm" className="bg-[#FF2B2B] hover:bg-[#e02525] text-white text-xs rounded-full" onClick={() => window.open(`mailto:${candidate.email}?subject=Resume Request`, "_blank")}>
                  <Download className="h-3 w-3 mr-1" /> Request Resume
                </Button>
                <Button size="sm" variant="outline" className="border-white/40 text-white hover:bg-white/20 text-xs rounded-full" onClick={() => { if (candidate.email) window.location.href = `mailto:${candidate.email}`; }}>
                  <Mail className="h-3 w-3 mr-1" /> Send Message
                </Button>
                <Button size="sm" variant="outline" className="border-white/40 text-white hover:bg-white/20 text-xs rounded-full" onClick={() => { if (candidate.phone) window.location.href = `tel:${candidate.phone}`; }}>
                  <Phone className="h-3 w-3 mr-1" /> Call
                </Button>
                <Button size="sm" variant="outline" className="border-white/40 text-white hover:bg-white/20 text-xs rounded-full" onClick={() => { if (candidate.email) window.location.href = `mailto:${candidate.email}?subject=Interview Invitation`; }}>
                  <Video className="h-3 w-3 mr-1" /> Schedule Interview
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Quick Info Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Notice Period", value: candidate.noticePeriod, icon: Clock },
              { label: "Current CTC", value: candidate.currentSalary, icon: TrendingUp },
              { label: "Expected CTC", value: candidate.expectedSalary, icon: Target },
              { label: "Resume Score", value: `${candidate.resumeScore}/100`, icon: Star },
            ].map((item, i) => (
              <div key={i} className="bg-[#F6F6F6] rounded-xl p-3 text-center">
                <item.icon className="h-4 w-4 text-[#FF2B2B] mx-auto mb-1" />
                <div className="text-sm font-semibold text-[#3A1F1F]">{item.value}</div>
                <div className="text-xs text-[#8A8A8A]">{item.label}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full justify-start mb-6 bg-[#F6F6F6] rounded-xl p-1">
              <TabsTrigger value="overview" className="rounded-lg text-sm">Overview</TabsTrigger>
              <TabsTrigger value="career" className="rounded-lg text-sm">Career Line</TabsTrigger>
              <TabsTrigger value="skills" className="rounded-lg text-sm">Skills</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="space-y-4">
                {candidate.about && (
                  <div className="bg-[#F6F6F6] rounded-xl p-4">
                    <h4 className="font-semibold text-[#3A1F1F] mb-2 text-sm">Professional Summary</h4>
                    <p className="text-sm text-[#5A5A5A] leading-relaxed">{candidate.about}</p>
                  </div>
                )}
                <div className="bg-[#F6F6F6] rounded-xl p-4">
                  <h4 className="font-semibold text-[#3A1F1F] mb-2 text-sm">Contact Information</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2 text-[#5A5A5A]"><Mail className="h-4 w-4 text-[#FF2B2B]" />{candidate.email}</div>
                    <div className="flex items-center gap-2 text-[#5A5A5A]"><Phone className="h-4 w-4 text-[#FF2B2B]" />{candidate.phone}</div>
                  </div>
                </div>
                <div className="bg-[#F6F6F6] rounded-xl p-4">
                  <h4 className="font-semibold text-[#3A1F1F] mb-2 text-sm">Applied For</h4>
                  <p className="text-sm text-[#5A5A5A]">{candidate.appliedFor} — {candidate.appliedDate}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-[#3A1F1F] mb-2 text-sm">Current Status</h4>
                  <div className="flex gap-2 flex-wrap">
                    {["Applied", "Under Review", "Shortlisted", "Interview Scheduled", "Interview Completed", "Interview Selected", "Interview Rejected", "Offered", "Joined", "Rejected", "On Hold"].map(s => (
                      <Badge key={s} className={`cursor-pointer text-xs ${candidate.status === s ? statusColor(s) + " ring-2 ring-offset-1 ring-[#FF2B2B]" : "bg-gray-100 text-gray-500"}`}>
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="career">
              <CareerTimeline experience={candidate.experience} education={candidate.education} />
            </TabsContent>

            <TabsContent value="skills">
              <div>
                <h4 className="font-semibold text-[#3A1F1F] mb-3 text-sm">Key Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {candidate.skills.map((skill, i) => (
                    <Badge key={i} className="bg-[#ECECF4] text-[#3A1F1F] text-sm py-1.5 px-3">{skill}</Badge>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function RecruiterDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { recruiterProfile, user, loading: authLoading, signOut } = useAuth();

  // Auth guard — redirect to sign-in if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/signin", { replace: true });
    }
  }, [authLoading, user, navigate]);

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!recruiterProfile?.id) return;
    const [{ data }, { count }] = await Promise.all([
      supabase
        .from("notifications")
        .select("*")
        .eq("user_id", recruiterProfile.id)
        .eq("user_type", "recruiter")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", recruiterProfile.id)
        .eq("user_type", "recruiter")
        .eq("is_read", false),
    ]);
    if (data) {
      setNotifications(data);
      setUnreadCount(count || 0);
    }
  }, [recruiterProfile?.id]);

  useEffect(() => {
    fetchNotifications();
    // Real-time subscription
    if (!recruiterProfile?.id) return;
    const channel = supabase
      .channel("recruiter-notifications")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${recruiterProfile.id}`,
      }, () => fetchNotifications())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [recruiterProfile?.id, fetchNotifications]);

  const markAllRead = async () => {
    if (!recruiterProfile?.id) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", recruiterProfile.id).eq("user_type", "recruiter");
    fetchNotifications();
  };

  const getRecruiterNotificationPath = useCallback((notification: Notification): string => {
    const text = `${notification.type} ${notification.title || ""} ${notification.message || ""}`.toLowerCase();

    if (
      notification.type === "application" ||
      text.includes("application") ||
      text.includes("applied") ||
      text.includes("interview")
    ) {
      return "/recruiter/dashboard/applicants";
    }

    if (
      notification.type === "reposted" ||
      notification.type === "expired" ||
      notification.type === "expiry_warning" ||
      text.includes("job posted") ||
      text.includes("reposted") ||
      text.includes("refreshed") ||
      text.includes("reactivated") ||
      text.includes("expired")
    ) {
      return "/recruiter/dashboard/manage-jobs";
    }

    if (text.includes("profile") || text.includes("company")) {
      return "/recruiter/dashboard/company-profile";
    }

    return "/recruiter/dashboard";
  }, []);

  const handleNotificationClick = useCallback(async (notification: Notification) => {
    if (recruiterProfile?.id && !notification.is_read) {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notification.id)
        .eq("user_id", recruiterProfile.id)
        .eq("user_type", "recruiter");
    }

    setNotificationsOpen(false);
    fetchNotifications();
    navigate(getRecruiterNotificationPath(notification));
  }, [fetchNotifications, getRecruiterNotificationPath, navigate, recruiterProfile?.id]);

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

  // On root dashboard path: check company profile completion and redirect if incomplete
  const recruiterCheckRef = useRef(false);
  const isRootPath = location.pathname === "/recruiter/dashboard" || location.pathname === "/recruiter/dashboard/";
  const [checkingCompletion, setCheckingCompletion] = useState(isRootPath);

  useEffect(() => {
    if (authLoading || !recruiterProfile || !user || recruiterCheckRef.current) return;
    recruiterCheckRef.current = true;
    if (!isRootPath) { setCheckingCompletion(false); return; }
    const rp = recruiterProfile;
    let score = 0;
    if (rp.recruiter_name) score += 10;
    if (rp.company_name) score += 15;
    if (rp.phone) score += 5;
    if (rp.industry) score += 15;
    if (rp.company_size) score += 10;
    if (rp.company_type) score += 5;
    if ((rp.company_description || "").trim().length > 20) score += 20;
    if (rp.location) score += 10;
    if (rp.website) score += 10;
    setCheckingCompletion(false);
    if (score < 100) navigate("/recruiter/dashboard/company-profile", { replace: true });
  }, [authLoading, recruiterProfile, user, navigate, isRootPath]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const companyInitials = recruiterProfile?.company_name
    ? recruiterProfile.company_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "RC";

  const currentTab = () => {
    const path = location.pathname;
    if (path.includes("manage-jobs")) return "manage-jobs";
    if (path.includes("applicants")) return "applicants";
    if (path.includes("company-profile")) return "company-profile";
    if (path.includes("search-candidates")) return "search-candidates";
    if (path.includes("analytics") || path.includes("articles")) return "analytics";
    if (path.includes("post-job")) return "post-job";
    if (path.includes("plans")) return "plans";
    return "dashboard";
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", path: "/recruiter/dashboard" },
    { id: "post-job", label: "Post Job", path: "/recruiter/dashboard/post-job" },
    { id: "manage-jobs", label: "Manage Jobs", path: "/recruiter/dashboard/manage-jobs" },
    { id: "search-candidates", label: "Search Candidates", path: "/recruiter/dashboard/search-candidates" },
    { id: "applicants", label: "Applicants", path: "/recruiter/dashboard/applicants" },
    { id: "analytics", label: "Analytics", path: "/recruiter/dashboard/analytics" },
    { id: "company-profile", label: "Company Profile", path: "/recruiter/dashboard/company-profile" },
    { id: "plans", label: "Plans", path: "/recruiter/dashboard/plans" },
  ];

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
        userType="recruiter"
        userEmail={user.email}
        autoOpenKey="recruiter-dashboard"
      />

      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link to="/recruiter/dashboard" className="flex items-center gap-3">
              <img src={logoImage} alt="RhirePro Logo" className="w-10 h-10" />
              <div>
                <div className="text-2xl font-bold text-[#3A1F1F]">Rhire<span className="text-[#FF2B2B]">Pro</span></div>
                <div className="text-xs text-[#8A8A8A]">Recruiter</div>
              </div>
            </Link>

            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map(item => (
                <Link key={item.id} to={item.path}>
                  <Button
                    variant={currentTab() === item.id ? "default" : "ghost"}
                    className={`text-sm rounded-full px-4 ${currentTab() === item.id ? "bg-[#FF2B2B] hover:bg-[#e02525]" : ""}`}
                    size="sm"
                  >
                    {item.label}
                  </Button>
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <div className="relative" ref={notifRef}>
                <Button variant="ghost" size="icon" className="relative" onClick={() => {
                  const opening = !notificationsOpen;
                  setNotificationsOpen(opening);
                  if (opening) { fetchNotifications(); setTimeout(markAllRead, 1500); }
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
                      <div className="space-y-2 max-h-72 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="text-sm text-[#8A8A8A] text-center py-4">No notifications yet</p>
                        ) : notifications.map((n) => (
                          <div key={n.id} onClick={() => handleNotificationClick(n)} className={`flex gap-3 p-2 rounded-lg cursor-pointer ${!n.is_read ? "bg-red-50" : "hover:bg-[#F6F6F6]"}`}>
                            <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-[#FF2B2B]" />
                            <div>
                              <p className="text-sm font-medium text-[#3A1F1F]">{n.title}</p>
                              <p className="text-xs text-[#8A8A8A]">{n.message}</p>
                              <p className="text-xs text-[#BABABA] mt-0.5">{new Date(n.created_at).toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <div className="w-8 h-8 bg-[#FF2B2B] rounded-full flex items-center justify-center text-white text-xs font-bold">{companyInitials}</div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-[#3A1F1F]">{recruiterProfile?.company_name || "Company"}</p>
                    <p className="text-xs text-[#8A8A8A]">{recruiterProfile?.email || ""}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/recruiter/dashboard/company-profile")}>
                    <Building2 className="h-4 w-4 mr-2" /> Company Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-500">
                    <LogOut className="h-4 w-4 mr-2" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                className="border-[#FF2B2B] text-[#FF2B2B] hover:bg-[#FF2B2B] hover:text-white rounded-full"
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" /> Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <Routes>
        <Route index element={<DashboardOverview />} />
        <Route path="post-job" element={<PostJobPage />} />
        <Route path="manage-jobs" element={<ManageJobsPage />} />
        <Route path="search-candidates" element={<SearchCandidatesPage />} />
        <Route path="applicants" element={<ApplicantsPage />} />
        <Route path="applicants/:applicantId/profile" element={<ApplicantProfilePage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="articles/new" element={<ArticleEditorPage />} />
        <Route path="articles/:articleId/edit" element={<ArticleEditorPage />} />
        <Route path="company-profile" element={<CompanyProfilePage />} />
        <Route path="plans" element={<PlansPage />} />
      </Routes>
    </div>
  );
}

// ─── Dashboard Overview ───────────────────────────────────────────────────────

function DashboardOverview() {
  const navigate = useNavigate();
  const { recruiterProfile } = useAuth();
  const [dbJobs, setDbJobs] = useState<Job[]>([]);
  const [dbApplications, setDbApplications] = useState<Array<Pick<Application, "id" | "job_id" | "status" | "applied_at">>>([]);
  const [totalApplicantsCount, setTotalApplicantsCount] = useState<number>(0);
  const [interviewsScheduledCount, setInterviewsScheduledCount] = useState<number>(0);
  const [positionsFilledCount, setPositionsFilledCount] = useState<number>(0);
  const [recentApplicants, setRecentApplicants] = useState<Array<{
    id: string;
    initials: string;
    name: string;
    currentCompany: string;
    currentTitle: string;
    status: Application["status"];
    appliedDate: string;
    matchScore: number;
  }>>([]);
  const [pipelineLoading, setPipelineLoading] = useState(true);
  const [pipelineError, setPipelineError] = useState("");
  const [upcomingInterviews, setUpcomingInterviews] = useState<Array<{
    name: string;
    role: string;
    time: string;
    type: string;
  }>>([]);

  const recruiterCompletion = useMemo(() => {
    if (!recruiterProfile) return 0;
    let score = 0;
    if (recruiterProfile.recruiter_name) score += 10;
    if (recruiterProfile.company_name) score += 15;
    if (recruiterProfile.phone) score += 5;
    if (recruiterProfile.industry) score += 15;
    if (recruiterProfile.company_size) score += 10;
    if (recruiterProfile.company_type) score += 5;
    if ((recruiterProfile.company_description || "").trim().length > 20) score += 20;
    if (recruiterProfile.location) score += 10;
    if (recruiterProfile.website) score += 10;
    return Math.min(100, score);
  }, [recruiterProfile]);

  useEffect(() => {
    if (!recruiterProfile?.id) return;
    const load = async () => {
      setPipelineLoading(true);
      setPipelineError("");
      const { data: jobs, error: jobsError } = await supabase
        .from("jobs")
        .select("*")
        .eq("recruiter_id", recruiterProfile.id)
        .order("created_at", { ascending: false });

      if (jobsError) {
        setPipelineError(jobsError.message || "Failed to load pipeline data");
        setPipelineLoading(false);
        return;
      }

      const recruiterJobs = (jobs || []).filter(job => !isJobExpired(job));
      const sortedRecruiterJobs = recruiterJobs.sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setDbJobs(sortedRecruiterJobs);

      const { data: recruiterScopedApps, error: recruiterScopedAppsError } = await supabase
        .from("applications")
        .select("id, job_id, status, applied_at")
        .eq("recruiter_id", recruiterProfile.id)
        .order("applied_at", { ascending: false });

      if (recruiterScopedAppsError) {
        setPipelineError(recruiterScopedAppsError.message || "Failed to load pipeline data");
      }

      const recruiterScoped = (recruiterScopedApps as Array<Pick<Application, "id" | "job_id" | "status" | "applied_at">>) || [];
      let jobScoped: Array<Pick<Application, "id" | "job_id" | "status" | "applied_at">> = [];

      // Include legacy rows where recruiter_id may be null but job_id belongs to this recruiter.
      if (recruiterJobs.length > 0) {
        const jobIds = recruiterJobs.map(job => job.id);
        const { data: jobScopedApps } = await supabase
          .from("applications")
          .select("id, job_id, status, applied_at")
          .in("job_id", jobIds)
          .order("applied_at", { ascending: false });
        jobScoped = (jobScopedApps as Array<Pick<Application, "id" | "job_id" | "status" | "applied_at">>) || [];
      }

      const merged = new Map<string, Pick<Application, "id" | "job_id" | "status" | "applied_at">>();
      for (const app of [...recruiterScoped, ...jobScoped]) {
        if (app?.id) merged.set(app.id, app);
      }

      setDbApplications(Array.from(merged.values()));

      if (recruiterJobs.length > 0) {
        const jobIds = recruiterJobs.map(job => job.id);
        const { data: recentApps } = await supabase
          .from("applications")
          .select("id, status, applied_at, profile:profiles(first_name, last_name, current_company, current_title)")
          .in("job_id", jobIds)
          .order("applied_at", { ascending: false })
          .limit(3);

        const formattedRecentApplicants = ((recentApps || []) as Array<{
          id: string;
          status: Application["status"];
          applied_at: string;
          profile?: {
            first_name?: string | null;
            last_name?: string | null;
            current_company?: string | null;
            current_title?: string | null;
          } | null;
        }>).map((app) => {
          const firstName = app.profile?.first_name?.trim() || "";
          const lastName = app.profile?.last_name?.trim() || "";
          const fullName = `${firstName} ${lastName}`.trim() || "Applicant";
          const initials = fullName
            .split(" ")
            .filter(Boolean)
            .map((part) => part[0])
            .join("")
            .toUpperCase()
            .slice(0, 2) || "AP";

          return {
            id: app.id,
            initials,
            name: fullName,
            currentCompany: app.profile?.current_company?.trim() || "Current company not provided",
            currentTitle: app.profile?.current_title?.trim() || "Current title not provided",
            status: app.status,
            appliedDate: app.applied_at ? new Date(app.applied_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "N/A",
            matchScore: Math.floor(70 + (app.id.charCodeAt(0) % 25)),
          };
        });

        setRecentApplicants(formattedRecentApplicants);
      } else {
        setRecentApplicants([]);
      }

      let fetchedInterviews: any[] = [];
      try {
        const { data, error } = await supabase
          .from("applications")
          .select(`
            id,
            status,
            applied_at,
            job:jobs(title),
            profile:profiles(first_name, last_name),
            interview_details:interview_details(updated_at, meeting_url)
          `)
          .eq("recruiter_id", recruiterProfile.id)
          .eq("status", "Interview Scheduled")
          .order("applied_at", { ascending: false })
          .limit(3);

        if (!error && data) {
          fetchedInterviews = data;
        } else {
          const { data: fallbackData } = await supabase
            .from("applications")
            .select(`
              id,
              status,
              applied_at,
              job:jobs(title),
              profile:profiles(first_name, last_name)
            `)
            .eq("recruiter_id", recruiterProfile.id)
            .eq("status", "Interview Scheduled")
            .order("applied_at", { ascending: false })
            .limit(3);
          if (fallbackData) {
            fetchedInterviews = fallbackData;
          }
        }
      } catch (err) {
        console.error("Failed to load upcoming interviews:", err);
      }

      const formatted = fetchedInterviews.map(app => {
        const firstName = app.profile?.first_name || "";
        const lastName = app.profile?.last_name || "";
        const fullName = `${firstName} ${lastName}`.trim() || "Candidate";
        const role = app.job?.title || "Applicant";
        const meetingUrl = app.interview_details?.meeting_url;
        const type = meetingUrl ? "Video Call" : "In-Person";

        const dateObj = app.interview_details?.updated_at ? new Date(app.interview_details.updated_at) : new Date(app.applied_at);
        const time = dateObj.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) + ", " + dateObj.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

        return {
          name: fullName,
          role,
          time,
          type
        };
      });
      setUpcomingInterviews(formatted);

      const mergedApps = Array.from(merged.values());
      const totalApps = mergedApps.length;
      const interviews = mergedApps.filter(app => mapApplicationStatusToPipelineStage(app.status) === "Interview Scheduled").length;
      const filled = mergedApps.filter(app => mapApplicationStatusToPipelineStage(app.status) === "Joined").length;

      setTotalApplicantsCount(totalApps);
      setInterviewsScheduledCount(interviews);
      setPositionsFilledCount(filled);

      setPipelineLoading(false);
    };
    load();
    const channel = supabase.channel(`dashboard-overview-data-${recruiterProfile.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "applications" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [recruiterProfile?.id]);

  const activeJobs = dbJobs.filter(j => j.status === "Active").length;
  const totalApplicants = dbApplications.length;
  const pipelineByJob = useMemo(() => {
    const initial = () => ({
      Applied: 0,
      "Under Review": 0,
      Shortlisted: 0,
      "Interview Scheduled": 0,
      "Interview Completed": 0,
      "Interview Selected": 0,
      "Interview Rejected": 0,
      Offered: 0,
      Joined: 0,
      Rejected: 0,
      "On Hold": 0,
    });
    const byJob = new Map<string, ReturnType<typeof initial>>();
    for (const app of dbApplications) {
      const jobId = app?.job_id;
      if (!jobId) continue;
      if (!byJob.has(jobId)) byJob.set(jobId, initial());
      const stage = mapApplicationStatusToPipelineStage(app.status);
      const counts = byJob.get(jobId);
      if (counts) counts[stage] += 1;
    }
    return byJob;
  }, [dbApplications]);

  const pipelineJobs = useMemo(() => {
    const latestAppliedByJob = new Map<string, number>();

    for (const app of dbApplications) {
      if (!app.job_id || !app.applied_at) continue;
      const appliedAt = new Date(app.applied_at).getTime();
      if (Number.isNaN(appliedAt)) continue;
      const currentLatest = latestAppliedByJob.get(app.job_id) || 0;
      if (appliedAt > currentLatest) latestAppliedByJob.set(app.job_id, appliedAt);
    }

    return [...dbJobs].sort((a, b) => {
      const aLatestAppliedAt = latestAppliedByJob.get(a.id);
      const bLatestAppliedAt = latestAppliedByJob.get(b.id);

      if (aLatestAppliedAt && bLatestAppliedAt) return bLatestAppliedAt - aLatestAppliedAt;
      if (aLatestAppliedAt) return -1;
      if (bLatestAppliedAt) return 1;

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [dbApplications, dbJobs]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const stats = [
    { label: "Active Jobs", value: String(activeJobs), change: "Live postings", icon: Briefcase, color: "text-blue-600", bg: "bg-blue-50", path: "/recruiter/dashboard/manage-jobs" },
    { label: "Total Applicants", value: String(totalApplicantsCount), change: "Across all jobs", icon: Users, color: "text-green-600", bg: "bg-green-50", path: "/recruiter/dashboard/applicants" },
    { label: "Interviews Scheduled", value: String(interviewsScheduledCount), change: "Next: Today 3PM", icon: Calendar, color: "text-purple-600", bg: "bg-purple-50", path: "/recruiter/dashboard/applicants?status=Interview Scheduled" },
    { label: "Positions Filled", value: String(positionsFilledCount), change: "This month", icon: CheckCircle, color: "text-[#FF2B2B]", bg: "bg-red-50", path: "/recruiter/dashboard/applicants?status=Joined" },
  ];

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Welcome Bar */}
      <div className="bg-gradient-to-r from-[#3A1F1F] to-[#6B3A3A] rounded-2xl p-6 text-white flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{greeting}, {recruiterProfile?.recruiter_name || "Recruiter"}! 👋</h1>
          <p className="text-red-200 text-sm mt-1">You have <span className="text-white font-semibold">{dbApplications.filter(a => a.status === "New").length || 0} new applications</span> awaiting review</p>
        </div>
        <Button onClick={() => navigate("/recruiter/dashboard/post-job")} className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full">
          <Plus className="mr-2 h-4 w-4" /> Post New Job
        </Button>
      </div>

      {/* Company Profile Completion Banner */}
      {recruiterCompletion < 100 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-orange-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-orange-50 rounded-full flex items-center justify-center flex-shrink-0">
                <Building2 className="h-4 w-4 text-orange-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#3A1F1F]">Complete your company profile</p>
                <p className="text-xs text-[#8A8A8A]">
                  {recruiterCompletion < 50
                    ? "A complete profile builds trust with job seekers."
                    : "Almost there! Finish your company details to attract better candidates."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className={`text-2xl font-bold ${recruiterCompletion >= 80 ? "text-green-600" : recruiterCompletion >= 50 ? "text-yellow-600" : "text-[#FF2B2B]"}`}>
                {recruiterCompletion}%
              </span>
              <Link to="/recruiter/dashboard/company-profile">
                <Button size="sm" className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full text-xs">
                  Complete Profile
                </Button>
              </Link>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${recruiterCompletion >= 80 ? "bg-green-500" : recruiterCompletion >= 50 ? "bg-yellow-500" : "bg-[#FF2B2B]"}`}
              style={{ width: `${recruiterCompletion}%` }}
            />
          </div>
          {(() => {
            const missing = [
              { label: "HR Contact Name", done: !!recruiterProfile?.recruiter_name },
              { label: "Company Name", done: !!recruiterProfile?.company_name },
              { label: "Phone", done: !!recruiterProfile?.phone },
              { label: "Industry", done: !!recruiterProfile?.industry },
              { label: "Company Size", done: !!recruiterProfile?.company_size },
              { label: "Company Type", done: !!recruiterProfile?.company_type },
              { label: "About Company", done: (recruiterProfile?.company_description || "").trim().length > 20 },
              { label: "Location", done: !!recruiterProfile?.location },
              { label: "Website", done: !!recruiterProfile?.website },
            ].filter(item => !item.done);
            return missing.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {missing.map(({ label }) => (
                  <span key={label} className="px-2 py-0.5 rounded-full text-xs bg-orange-50 text-orange-600 border border-orange-100">
                    ○ {label}
                  </span>
                ))}
              </div>
            ) : null;
          })()}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div
            key={i}
            onClick={() => s.path && navigate(s.path)}
            className="bg-white rounded-2xl p-5 shadow-sm cursor-pointer hover:shadow-md transition-all duration-200"
          >
            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <div className="text-2xl font-bold text-[#3A1F1F]">{s.value}</div>
            <div className="text-sm font-medium text-[#3A1F1F]">{s.label}</div>
            <div className="text-xs text-[#8A8A8A] mt-0.5">{s.change}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Job Pipeline Summary */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-[#3A1F1F]">Application Pipeline</h2>
            <Link to="/recruiter/dashboard/manage-jobs"><Button variant="ghost" size="sm" className="text-[#FF2B2B] text-xs">View All</Button></Link>
          </div>
          <div className="space-y-3">
            {pipelineLoading && (
              <div className="border border-gray-100 rounded-xl p-3 text-sm text-[#8A8A8A]">Loading pipeline...</div>
            )}
            {!pipelineLoading && pipelineError && (
              <div className="border border-red-100 bg-red-50 rounded-xl p-3 text-sm text-red-600">{pipelineError}</div>
            )}
            {!pipelineLoading && !pipelineError && dbJobs.length === 0 && (
              <div className="border border-gray-100 rounded-xl p-3 text-sm text-[#8A8A8A]">No jobs available yet.</div>
            )}
            {!pipelineLoading && !pipelineError && pipelineJobs.slice(0, 3).map(job => {
              const counts = pipelineByJob.get(job.id) || {
                Applied: 0,
                "Under Review": 0,
                Shortlisted: 0,
                "Interview Scheduled": 0,
                "Interview Completed": 0,
                "Interview Selected": 0,
                "Interview Rejected": 0,
                Offered: 0,
                Joined: 0,
                Rejected: 0,
                "On Hold": 0,
              };
              const total = Object.values(counts).reduce((a, b) => a + b, 0);
              const pct = (value: number) => (total > 0 ? (value / total) * 100 : 0);
              const actionStages = [
                { label: "Applied", value: counts.Applied, color: "bg-gray-300", title: `Applied: ${counts.Applied}` },
                { label: "Under Review", value: counts["Under Review"], color: "bg-blue-400", title: `Under Review: ${counts["Under Review"]}` },
                { label: "Shortlisted", value: counts.Shortlisted, color: "bg-pink-400", title: `Shortlisted: ${counts.Shortlisted}` },
                { label: "Interview", value: counts["Interview Scheduled"] + counts["Interview Completed"], color: "bg-purple-400", title: `Interview: ${counts["Interview Scheduled"] + counts["Interview Completed"]}` },
                { label: "Selected", value: counts["Interview Selected"], color: "bg-teal-400", title: `Selected: ${counts["Interview Selected"]}` },
                { label: "Interview Rejected", value: counts["Interview Rejected"], color: "bg-red-300", title: `Interview Rejected: ${counts["Interview Rejected"]}` },
                { label: "Offered", value: counts.Offered, color: "bg-orange-400", title: `Offered: ${counts.Offered}` },
                { label: "Joined", value: counts.Joined, color: "bg-emerald-500", title: `Joined: ${counts.Joined}` },
                { label: "Rejected", value: counts.Rejected, color: "bg-red-400", title: `Rejected: ${counts.Rejected}` },
                { label: "On Hold", value: counts["On Hold"], color: "bg-amber-400", title: `On Hold: ${counts["On Hold"]}` },
              ];
              const visibleActionLabels = actionStages.filter(stage => (
                ["Applied", "Under Review", "Shortlisted", "Interview"].includes(stage.label) || stage.value > 0
              ));
              return (
                <div key={job.id} className="border border-gray-100 rounded-xl p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-[#3A1F1F]">{job.title}</span>
                    <Badge className={job.status === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"} >{job.status}</Badge>
                  </div>
                  <div className="flex gap-1 h-2 rounded-full overflow-hidden">
                    {actionStages.map(stage => (
                      <div key={`${job.id}-${stage.label}`} className={stage.color} style={{ width: `${pct(stage.value)}%` }} title={stage.title} />
                    ))}
                  </div>
                  <div className="flex gap-3 mt-1.5 text-xs text-[#8A8A8A]">
                    {visibleActionLabels.map(stage => (
                      <span key={`${job.id}-${stage.label}-label`}>{stage.label}: {stage.value}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Interviews */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-[#3A1F1F]">Upcoming Interviews</h2>
            <Button variant="ghost" size="sm" className="text-[#FF2B2B] text-xs" onClick={() => navigate("/recruiter/dashboard/applicants")}>View All</Button>
          </div>
          <div className="space-y-3">
            {upcomingInterviews.length === 0 ? (
              <p className="text-sm text-[#8A8A8A] text-center py-4">No upcoming interviews scheduled</p>
            ) : (
              upcomingInterviews.map((iv, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-[#F6F6F6] rounded-xl">
                  <div className="w-10 h-10 bg-[#FF2B2B] rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {iv.name.split(" ").filter(Boolean).map(n => n[0]).join("")}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#3A1F1F]">{iv.name}</p>
                    <p className="text-xs text-[#8A8A8A]">{iv.role}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-[#3A1F1F]">{iv.time}</p>
                    <Badge className="bg-purple-100 text-purple-700 text-xs mt-0.5">{iv.type}</Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Applicants */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-[#3A1F1F]">Recent Applicants</h2>
            <Link to="/recruiter/dashboard/applicants"><Button variant="ghost" size="sm" className="text-[#FF2B2B] text-xs">View All</Button></Link>
          </div>
          <div className="space-y-3">
            {recentApplicants.length === 0 ? (
              <p className="text-sm text-[#8A8A8A] text-center py-4">No recent applicants</p>
            ) : (
              recentApplicants.map(applicant => (
                <div key={applicant.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:bg-[#F6F6F6] transition-colors">
                  <div className="w-10 h-10 bg-[#FF2B2B] rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {applicant.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#3A1F1F]">{applicant.name}</p>
                    <p className="text-xs text-[#8A8A8A] truncate">{applicant.currentTitle} at {applicant.currentCompany}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <Badge className={`text-xs ${statusColor(applicant.status)}`}>{applicant.status}</Badge>
                    <p className="text-xs text-[#8A8A8A] mt-0.5">{applicant.appliedDate}</p>
                  </div>
                  <div className="flex-shrink-0 bg-green-50 rounded-lg px-2 py-1 text-center">
                    <div className="text-sm font-bold text-green-600">{applicant.matchScore}%</div>
                    <div className="text-xs text-[#8A8A8A]">match</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recently Posted Jobs */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-[#3A1F1F]">Recently Posted Jobs</h2>
            <Link to="/recruiter/dashboard/manage-jobs"><Button variant="ghost" size="sm" className="text-[#FF2B2B] text-xs">View All</Button></Link>
          </div>
          <div className="space-y-3">
            {dbJobs.length === 0 ? (
              <p className="text-sm text-[#8A8A8A] text-center py-4">No jobs posted yet</p>
            ) : (
              dbJobs.slice(0, 3).map(job => (
                <div key={job.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:bg-[#F6F6F6] transition-colors">
                  <div className="w-10 h-10 bg-[#3A1F1F] rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#3A1F1F] truncate">{job.title}</p>
                    <p className="text-xs text-[#8A8A8A] truncate">{job.location || "Location not provided"} • {job.work_mode || "Full-time"}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <Badge className={job.status === "Active" ? "bg-green-100 text-green-700 text-xs" : "bg-gray-100 text-gray-600 text-xs"}>{job.status}</Badge>
                    <p className="text-xs text-[#8A8A8A] mt-0.5">{new Date(job.created_at).toLocaleDateString("en-US", { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Post Job Page ────────────────────────────────────────────────────────────

function PostJobPage() {
  const { recruiterProfile } = useAuth();
  const navigate = useNavigate();
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");
  const [postSuccess, setPostSuccess] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [activeSub, setActiveSub] = useState<RecruiterSubscription | null>(null);
  const [todayPostCount, setTodayPostCount] = useState(0);
  const [subLoading, setSubLoading] = useState(true);
  const [showSkillInput, setShowSkillInput] = useState(false);
  const [skillPickerOpen, setSkillPickerOpen] = useState(false);
  const [skillSearch, setSkillSearch] = useState("");
  const skillFieldRef = useRef<HTMLDivElement>(null);
  const [departmentPickerOpen, setDepartmentPickerOpen] = useState(false);
  const [departmentSearch, setDepartmentSearch] = useState("");
  const departmentFieldRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    jobTitle: "", jobDescription: "", rolesResponsibilities: "", requirements: "",
    location: "", workMode: "",
    salaryMin: "", salaryMax: "",
    experienceMin: "", experienceMax: "",
    skills: "", employmentType: "", industry: "",
    openings: "1", education: "", perks: [] as string[], department: "",
    interviewMode: "",
  });

  // Fetch active subscription and today's post count
  useEffect(() => {
    if (!recruiterProfile?.id) return;
    const load = async () => {
      const now = new Date().toISOString();
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

      const [{ data: sub }, { count }] = await Promise.all([
        supabase
          .from("recruiter_subscriptions")
          .select("*")
          .eq("recruiter_id", recruiterProfile.id)
          .eq("status", "active")
          .gte("expires_at", now)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("jobs")
          .select("id", { count: "exact", head: true })
          .eq("recruiter_id", recruiterProfile.id)
          .gte("created_at", todayStart.toISOString()),
      ]);
      setActiveSub(sub ?? null);
      setTodayPostCount(count ?? 0);
      setSubLoading(false);
    };
    load();
  }, [recruiterProfile?.id]);

  const dailyLimit = activeSub
    ? (activeSub.daily_job_posts ?? Infinity)
    : FREE_DAILY_POST_LIMIT;

  const isLimitReached = todayPostCount >= dailyLimit;
  const selectedSkills = useMemo(
    () => formData.skills.split(",").map(s => s.trim()).filter(Boolean),
    [formData.skills],
  );
  const isSalaryRangeInvalid =
    Boolean(formData.salaryMin && formData.salaryMax) &&
    Number(formData.salaryMax) < Number(formData.salaryMin);
  const filteredSkillOptions = useMemo(() => {
    const query = skillSearch.trim().toLowerCase();
    const options = query ? SEARCH_SUGGESTION_DATASET : SKILL_OPTIONS;
    return options.filter(skill => !query || skill.toLowerCase().includes(query)).slice(0, 120);
  }, [skillSearch]);
  const filteredDepartmentOptions = useMemo(() => {
    const query = departmentSearch.trim().toLowerCase();
    if (!query) return DEPARTMENT_OPTIONS;
    const startsWith = DEPARTMENT_OPTIONS.filter(department => department.toLowerCase().startsWith(query));
    const includes = DEPARTMENT_OPTIONS.filter(department => {
      const normalized = department.toLowerCase();
      return !normalized.startsWith(query) && normalized.includes(query);
    });
    return [...startsWith, ...includes];
  }, [departmentSearch]);

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
    if (!departmentPickerOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!departmentFieldRef.current?.contains(event.target as Node)) {
        setDepartmentPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [departmentPickerOpen]);

  useEffect(() => {
    setDepartmentSearch(formData.department);
  }, [formData.department]);

  const addSkill = (skill: string) => {
    const s = skill.trim();
    if (!s) return;
    const alreadySelected = selectedSkills.some(existing => existing.toLowerCase() === s.toLowerCase());
    if (!alreadySelected) {
      setFormData(prev => ({ ...prev, skills: [...selectedSkills, s].join(", ") }));
    }
    setSkillSearch("");
    setSkillPickerOpen(false);
    setShowSkillInput(false);
  };

  const removeSkill = (skill: string) => {
    const updated = selectedSkills.filter(s => s !== skill);
    setFormData(prev => ({ ...prev, skills: updated.join(", ") }));
  };

  const perkOptions = ["Health Insurance", "Work from Home", "Flexible Hours", "5 Days a Week", "Free Meals", "Stock Options", "Annual Bonus", "Paid Sick Leave"];
  const togglePerk = (p: string) => {
    setFormData(prev => ({
      ...prev,
      perks: prev.perks.includes(p) ? prev.perks.filter(x => x !== p) : [...prev.perks, p]
    }));
  };

  const bulletPrefix = "\u2022 ";

  const normalizeBulletList = (value: string) =>
    value
      .split("\n")
      .map(line => {
        if (!line) return "";

        const existingBullet = line.match(/^(\u2022|[*-]|\d+[.)])\s*/);
        const text = existingBullet ? line.slice(existingBullet[0].length) : line;
        return `${bulletPrefix}${text}`;
      })
      .join("\n");

  const handleBulletListChange = (field: "rolesResponsibilities" | "requirements", value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: normalizeBulletList(value),
    }));
  };

  const handleBulletListKeyDown = (
    field: "rolesResponsibilities" | "requirements",
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    const target = event.currentTarget;
    const { selectionStart, selectionEnd, value } = target;

    if (event.key === "Enter") {
      event.preventDefault();
      const before = value.slice(0, selectionStart);
      const after = value.slice(selectionEnd);
      const nextValue = `${before}${value ? `\n${bulletPrefix}` : bulletPrefix}${after}`;

      setFormData(prev => ({
        ...prev,
        [field]: nextValue,
      }));

      requestAnimationFrame(() => {
        const nextCursor = selectionStart + (value ? 3 : 2);
        target.setSelectionRange(nextCursor, nextCursor);
      });
      return;
    }

    if (event.key !== "Backspace" || selectionStart !== selectionEnd) return;

    const currentLineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
    const nextLineBreak = value.indexOf("\n", selectionStart);
    const currentLineEnd = nextLineBreak === -1 ? value.length : nextLineBreak;
    const currentLine = value.slice(currentLineStart, currentLineEnd);

    if (currentLine !== bulletPrefix) return;

    event.preventDefault();

    const removeStart = currentLineStart > 0 ? currentLineStart - 1 : currentLineStart;
    const removeEnd = currentLineEnd < value.length ? currentLineEnd + 1 : currentLineEnd;
    const nextValue = `${value.slice(0, removeStart)}${value.slice(removeEnd)}`;
    const nextCursor = currentLineStart > 0 ? currentLineStart - 1 : 0;

    setFormData(prev => ({
      ...prev,
      [field]: nextValue,
    }));

    requestAnimationFrame(() => {
      target.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPostError("");
    if (!recruiterProfile?.id) { setPostError("Please sign in as a recruiter."); return; }
    if (isLimitReached) {
      setPostError(
        activeSub
          ? `You've reached your plan's limit of ${dailyLimit} job post${dailyLimit === 1 ? "" : "s"} today.`
          : `Free accounts can post only ${FREE_DAILY_POST_LIMIT} job per day. Upgrade to post more.`
      );
      return;
    }
    if (!formData.salaryMin || !formData.salaryMax) {
      setPostError("Please select both minimum and maximum salary.");
      return;
    }
    if (isSalaryRangeInvalid) {
      setPostError("Maximum salary must be greater than or equal to minimum salary.");
      return;
    }
    setPosting(true);
    try {
      const deadline = buildJobExpiryTimestamp();
      const skillsArr = formData.skills.split(",").map(s => s.trim()).filter(Boolean);
      const { error } = await supabase.from("jobs").insert({
        recruiter_id: recruiterProfile.id,
        title: formData.jobTitle,
        description: formData.jobDescription,
        roles_responsibilities: formData.rolesResponsibilities || null,
        requirements: formData.requirements || null,
        company_name: recruiterProfile.company_name || "",
        location: formData.location,
        work_mode: formData.workMode,
        salary_min: Number(formData.salaryMin),
        salary_max: Number(formData.salaryMax),
        salary_type: "LPA",
        experience_min: formData.experienceMin ? Number(formData.experienceMin) : null,
        experience_max: formData.experienceMax ? Number(formData.experienceMax) : null,
        employment_type: formData.employmentType,
        industry: formData.industry,
        department: formData.department,
        skills: skillsArr,
        perks: formData.perks,
        education: formData.education,
        interview_mode: formData.interviewMode,
        openings: Number(formData.openings) || 1,
        deadline,
        deadline_time: null,
        status: "Active",
      });
      if (error) throw error;
      setPostSuccess(true);
      setShowPreview(false);
      setTimeout(() => { setPostSuccess(false); navigate("/recruiter/dashboard/manage-jobs"); }, 2000);
      setFormData({ jobTitle:"",jobDescription:"",rolesResponsibilities:"",requirements:"",location:"",workMode:"",salaryMin:"",salaryMax:"",experienceMin:"",experienceMax:"",skills:"",employmentType:"",industry:"",openings:"1",education:"",perks:[],department:"",interviewMode:"" });
      setShowSkillInput(false);
      setSkillPickerOpen(false);
      setSkillSearch("");
    } catch (err: unknown) {
      setPostError(err instanceof Error ? err.message : "Failed to post job.");
    } finally {
      setPosting(false);
    }
  };

  // ── Job Preview Modal ──────────────────────────────────────
  const skillsArr = formData.skills.split(",").map(s => s.trim()).filter(Boolean);

  if (showPreview) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setShowPreview(false)} className="flex items-center gap-1.5 text-[#FF2B2B] text-sm font-medium hover:underline">
            ← Back to Edit
          </button>
          <span className="text-[#8A8A8A]">·</span>
          <span className="text-[#8A8A8A] text-sm">Preview — this is how your job will appear to candidates</span>
        </div>

        {postSuccess && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 mb-4 text-sm font-medium">✓ Job posted successfully! Redirecting...</div>}
        {postError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-4 text-sm">{postError}</div>}

        {/* Preview Card */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden mb-6">
          {/* Header */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-[#FF2B2B] rounded-xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                {(recruiterProfile?.company_name || "C")[0]}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-[#3A1F1F]">{formData.jobTitle || "Job Title"}</h1>
                <p className="text-[#FF2B2B] font-medium mt-0.5">{recruiterProfile?.company_name || "Your Company"}</p>
                <div className="flex flex-wrap gap-3 mt-3 text-sm text-[#5A5A5A]">
                  {formData.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{formData.location}</span>}
                  {formData.experienceMin && <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{formData.experienceMin}–{formData.experienceMax} yrs</span>}
                  {formData.salaryMin && formData.salaryMax && <span className="flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" />{formatSalaryRangeFromValues(formData.salaryMin, formData.salaryMax)}</span>}
                  {formData.workMode && <span className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" />{formData.workMode}</span>}
                  {formData.employmentType && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formData.employmentType}</span>}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <Badge className="bg-green-100 text-green-700 text-xs mb-1">Active</Badge>
                <p className="text-xs text-[#8A8A8A]">Posted just now</p>
                {formData.openings && <p className="text-xs text-[#8A8A8A] mt-0.5">{formData.openings} opening{Number(formData.openings) > 1 ? "s" : ""}</p>}
              </div>
            </div>
            {skillsArr.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4">
                {skillsArr.map((s, i) => <Badge key={i} className="bg-[#ECECF4] text-[#3A1F1F] text-xs">{s}</Badge>)}
              </div>
            )}
            {formData.perks.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {formData.perks.map((p, i) => <Badge key={i} className="bg-green-50 text-green-700 border border-green-100 text-xs">{p}</Badge>)}
              </div>
            )}
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            {formData.jobDescription && (
              <div>
                <h2 className="text-base font-semibold text-[#3A1F1F] mb-2">About the Role</h2>
                <SafeHtml
                  content={formData.jobDescription}
                  className="text-sm text-[#5A5A5A] leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:mt-1.5 [&_h3]:mb-1 [&_a]:text-[#FF2B2B] [&_a]:underline"
                />
              </div>
            )}
            {formData.rolesResponsibilities && (
              <div>
                <h2 className="text-base font-semibold text-[#3A1F1F] mb-2">Roles & Responsibilities</h2>
                <SafeHtml
                  content={formData.rolesResponsibilities}
                  className="text-sm text-[#5A5A5A] leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:mt-1.5 [&_h3]:mb-1 [&_a]:text-[#FF2B2B] [&_a]:underline"
                />
              </div>
            )}
            {formData.requirements && (
              <div>
                <h2 className="text-base font-semibold text-[#3A1F1F] mb-2">Requirements</h2>
                <SafeHtml
                  content={formData.requirements}
                  className="text-sm text-[#5A5A5A] leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:mt-1.5 [&_h3]:mb-1 [&_a]:text-[#FF2B2B] [&_a]:underline"
                />
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-gray-100">
              {formData.education && <div><p className="text-xs text-[#8A8A8A]">Min. Education</p><p className="text-sm font-medium text-[#3A1F1F]">{formData.education}</p></div>}
              {formData.department && <div><p className="text-xs text-[#8A8A8A]">Department</p><p className="text-sm font-medium text-[#3A1F1F]">{formData.department}</p></div>}
              {formData.industry && <div><p className="text-xs text-[#8A8A8A]">Industry</p><p className="text-sm font-medium text-[#3A1F1F]">{formData.industry}</p></div>}
              {formData.interviewMode && <div><p className="text-xs text-[#8A8A8A]">Interview Mode</p><p className="text-sm font-medium text-[#3A1F1F]">{formData.interviewMode}</p></div>}
              <div>
                <p className="text-xs text-[#8A8A8A]">Expires</p>
                <p className="text-sm font-medium text-[#3A1F1F]">{JOB_EXPIRY_DAYS} days after posting</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setShowPreview(false)} className="flex-1 border-gray-200 rounded-full">
            Edit Job
          </Button>
          <Button onClick={() => handleSubmit()} disabled={posting} className="flex-1 bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full py-6">
            {posting ? "Publishing..." : "Confirm & Post Job"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-[#3A1F1F] mb-4">Post a New Job</h1>

      {/* Plan usage banner */}
      {!subLoading && (
        <div className={`mb-6 rounded-xl p-4 flex items-center justify-between gap-4 ${isLimitReached ? "bg-red-50 border border-red-200" : "bg-[#FF2B2B]/5 border border-[#FF2B2B]/20"}`}>
          <div className="flex items-center gap-3">
            {activeSub ? (
              <Crown className="h-5 w-5 text-[#FF2B2B] flex-shrink-0" />
            ) : (
              <CreditCard className="h-5 w-5 text-[#8A8A8A] flex-shrink-0" />
            )}
            <div>
              {activeSub ? (
                <p className="text-sm font-medium text-[#3A1F1F]">
                  {getPlanById(activeSub.plan_id)?.name ?? "Active Plan"} &nbsp;·&nbsp;
                  <span className={isLimitReached ? "text-red-600" : "text-[#FF2B2B]"}>
                    {todayPostCount} / {dailyLimit === Infinity ? "∞" : dailyLimit} posts today
                  </span>
                </p>
              ) : (
                <p className="text-sm font-medium text-[#3A1F1F]">
                  Free plan &nbsp;·&nbsp;
                  <span className={isLimitReached ? "text-red-600" : "text-[#FF2B2B]"}>
                    {todayPostCount} / {FREE_DAILY_POST_LIMIT} post today
                  </span>
                </p>
              )}
              {isLimitReached && (
                <p className="text-xs text-red-600 mt-0.5">
                  Daily limit reached. {activeSub ? "Upgrade your plan for more posts." : "Purchase a plan to post more jobs."}
                </p>
              )}
            </div>
          </div>
          {isLimitReached && (
            <Button
              size="sm"
              onClick={() => navigate("/recruiter/dashboard/plans")}
              className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full whitespace-nowrap flex-shrink-0"
            >
              <Zap className="mr-1.5 h-3.5 w-3.5" /> Upgrade Plan
            </Button>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl p-8 shadow-md">
        {postSuccess && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 mb-4 text-sm font-medium">✓ Job posted successfully! Redirecting to Manage Jobs...</div>}
        {postError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-4 text-sm">{postError}</div>}
        <form onSubmit={e => {
          e.preventDefault();
          if (!formData.jobDescription.replace(/<[^>]*>/g, "").trim()) {
            setPostError("Please fill out the 'About the Role' field.");
            return;
          }
          if (selectedSkills.length === 0) {
            setPostError("Please add at least one key skill.");
            setShowSkillInput(true);
            setSkillPickerOpen(true);
            return;
          }
          if (!formData.salaryMin || !formData.salaryMax) {
            setPostError("Please select both minimum and maximum salary.");
            return;
          }
          if (isSalaryRangeInvalid) {
            setPostError("Maximum salary must be greater than or equal to minimum salary.");
            return;
          }
          setPostError("");
          setShowPreview(true);
        }} className="space-y-6">
          {/* Basic Info */}
          <div className="border-b pb-6">
            <h2 className="text-lg font-semibold text-[#3A1F1F] mb-4">Basic Information</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Job Title *</label>
                <Input value={formData.jobTitle} onChange={e => setFormData({ ...formData, jobTitle: e.target.value })} className="bg-[#F6F6F6] border-gray-200 rounded-xl" placeholder="Enter job title" required />
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Department</label>
                <div className="relative" ref={departmentFieldRef}>
                  <div className="relative">
                    <Input
                      value={departmentSearch}
                      onFocus={() => setDepartmentPickerOpen(true)}
                      onChange={(e) => {
                        setDepartmentSearch(e.target.value);
                        setFormData({ ...formData, department: e.target.value });
                        setDepartmentPickerOpen(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const firstDepartment = filteredDepartmentOptions[0] || departmentSearch.trim();
                          setFormData({ ...formData, department: firstDepartment });
                          setDepartmentSearch(firstDepartment);
                          setDepartmentPickerOpen(false);
                        }
                        if (e.key === "Escape") setDepartmentPickerOpen(false);
                      }}
                      className="bg-[#F6F6F6] border-gray-200 rounded-xl pr-10"
                      placeholder="Search or select department"
                    />
                    <button
                      type="button"
                      onClick={() => setDepartmentPickerOpen(open => !open)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8A8A] hover:text-[#3A1F1F]"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                  {departmentPickerOpen && (
                    <div className="absolute left-0 right-0 top-full z-[80] mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                      <div className="max-h-72 overflow-y-auto p-1">
                        {filteredDepartmentOptions.length === 0 ? (
                          <button
                            type="button"
                            onClick={() => {
                              const typedDepartment = departmentSearch.trim();
                              setFormData({ ...formData, department: typedDepartment });
                              setDepartmentPickerOpen(false);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[#3A1F1F] hover:bg-[#FFF0F0]"
                          >
                            <Plus className="h-4 w-4 text-[#FF2B2B]" />
                            <span>Add "{departmentSearch.trim()}"</span>
                          </button>
                        ) : (
                          filteredDepartmentOptions.map((department) => {
                            const selected = formData.department.toLowerCase() === department.toLowerCase();
                            return (
                              <button
                                key={department}
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, department });
                                  setDepartmentSearch(department);
                                  setDepartmentPickerOpen(false);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[#3A1F1F] hover:bg-[#FFF0F0]"
                              >
                                <Check className={`h-4 w-4 ${selected ? "text-[#FF2B2B] opacity-100" : "opacity-0"}`} />
                                <span>{department}</span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Industry *</label>
                <Select value={formData.industry} onValueChange={v => setFormData({ ...formData, industry: v })}>
                  <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-xl"><SelectValue placeholder="Select industry" /></SelectTrigger>
                  <SelectContent>
                    {["IT / Software", "BFSI", "Manufacturing", "Healthcare", "Education", "E-commerce", "Consulting", "Media"].map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Employment Type *</label>
                <Select value={formData.employmentType} onValueChange={v => setFormData({ ...formData, employmentType: v })}>
                  <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-xl"><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {["Full-time", "Part-time", "Contract", "Internship", "Freelance"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Work Mode *</label>
                <Select value={formData.workMode} onValueChange={v => setFormData({ ...formData, workMode: v })}>
                  <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-xl"><SelectValue placeholder="Select work mode" /></SelectTrigger>
                  <SelectContent>
                    {["Work from Office", "Work from Home", "Hybrid"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Location & Openings */}
          <div className="border-b pb-6">
            <h2 className="text-lg font-semibold text-[#3A1F1F] mb-4">Location & Openings</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Location *</label>
                <LocationAutocomplete
                  value={formData.location}
                  onChange={location => setFormData({ ...formData, location })}
                  placeholder="Search Indian city"
                  required
                />
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Number of Openings</label>
                <Input type="number" min="1" value={formData.openings} onChange={e => setFormData({ ...formData, openings: e.target.value })} className="bg-[#F6F6F6] border-gray-200 rounded-xl" />
              </div>
            </div>
          </div>

          {/* Salary & Experience */}
          <div className="border-b pb-6">
            <h2 className="text-lg font-semibold text-[#3A1F1F] mb-4">Salary & Experience</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Salary Offered *</label>
                <div className="flex gap-2 items-center">
                  <SalaryCombobox
                    value={formData.salaryMin}
                    onChange={v => setFormData({ ...formData, salaryMin: v })}
                    placeholder="Search or Select"
                  />
                  <span className="text-[#8A8A8A]">–</span>
                  <SalaryCombobox
                    value={formData.salaryMax}
                    onChange={v => setFormData({ ...formData, salaryMax: v })}
                    placeholder="Search or Select"
                  />
                </div>
                {isSalaryRangeInvalid && (
                  <p className="text-xs text-red-500 mt-1.5">Maximum salary must be greater than or equal to minimum salary.</p>
                )}
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Experience Required *</label>
                <div className="flex gap-2 items-center">
                  <Input type="number" min="0" value={formData.experienceMin} onChange={e => setFormData({ ...formData, experienceMin: e.target.value })} className="bg-[#F6F6F6] border-gray-200 rounded-xl" placeholder="Min yrs" />
                  <span className="text-[#8A8A8A]">–</span>
                  <Input type="number" min="0" value={formData.experienceMax} onChange={e => setFormData({ ...formData, experienceMax: e.target.value })} className="bg-[#F6F6F6] border-gray-200 rounded-xl" placeholder="Max yrs" />
                </div>
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Minimum Education</label>
                <Select value={formData.education} onValueChange={v => setFormData({ ...formData, education: v })}>
                  <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-xl"><SelectValue placeholder="Select qualification" /></SelectTrigger>
                  <SelectContent>
                    {["10th Pass", "12th Pass", "Diploma", "B.Tech/B.E.", "B.Com/BA/B.Sc", "MBA/PGDM", "M.Tech/ME", "PhD"].map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Interview Mode</label>
                <Select value={formData.interviewMode} onValueChange={v => setFormData({ ...formData, interviewMode: v })}>
                  <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-xl"><SelectValue placeholder="Select mode" /></SelectTrigger>
                  <SelectContent>
                    {["In-Person", "Video Call", "Telephonic", "Walk-in"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Skills */}
          <div className="border-b pb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-[#3A1F1F]">Key Skills</h2>
              <Button
                type="button"
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
              {selectedSkills.map((skill) => (
                <span key={skill} className="flex items-center gap-1 bg-[#ECECF4] text-[#3A1F1F] px-3 py-1.5 rounded-full text-sm font-medium">
                  {skill}
                  <button type="button" onClick={() => removeSkill(skill)} className="ml-1 text-[#8A8A8A] hover:text-[#FF2B2B]">
                    <XCircle className="h-3 w-3" />
                  </button>
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
                          const firstOption = filteredSkillOptions.find(skill => !selectedSkills.some(s => s.toLowerCase() === skill.toLowerCase()));
                          addSkill(firstOption || skillSearch);
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
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                  {skillPickerOpen && (
                    <div className="absolute left-0 right-0 top-full z-[80] mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                      <div className="max-h-72 overflow-y-auto p-1">
                        {filteredSkillOptions.length === 0 ? (
                          <button
                            type="button"
                            onClick={() => addSkill(skillSearch)}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[#3A1F1F] hover:bg-[#FFF0F0]"
                          >
                            <Plus className="h-4 w-4 text-[#FF2B2B]" />
                            <span>Add "{skillSearch.trim()}"</span>
                          </button>
                        ) : (
                          filteredSkillOptions.map((skill) => {
                            const selected = selectedSkills.some(s => s.toLowerCase() === skill.toLowerCase());
                            return (
                              <button
                                key={skill}
                                type="button"
                                onClick={() => addSkill(skill)}
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
                  type="button"
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
            <p className="text-xs text-[#8A8A8A] mt-1">Candidates with these skills will be highlighted</p>
            <input type="hidden" value={formData.skills} required />
          </div>

          {/* Job Description */}
          <div className="border-b pb-6">
            <h2 className="text-lg font-semibold text-[#3A1F1F] mb-4">Job Description</h2>
            <div className="space-y-4">
              <div>
                <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">About the Role *</label>
                <RichTextEditor
                  value={formData.jobDescription}
                  onChange={val => setFormData({ ...formData, jobDescription: val })}
                  placeholder="Brief overview of the role and what the candidate will be working on..."
                />
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Roles & Responsibilities</label>
                <RichTextEditor
                  value={formData.rolesResponsibilities}
                  onChange={val => setFormData({ ...formData, rolesResponsibilities: val })}
                  placeholder="Enter roles & responsibilities..."
                />
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Requirements / Qualifications</label>
                <RichTextEditor
                  value={formData.requirements}
                  onChange={val => setFormData({ ...formData, requirements: val })}
                  placeholder="Enter requirements & qualifications..."
                />
              </div>
            </div>
          </div>

          {/* Perks */}
          <div className="border-b pb-6">
            <h2 className="text-lg font-semibold text-[#3A1F1F] mb-4">Perks & Benefits</h2>
            <div className="flex flex-wrap gap-2">
              {perkOptions.map(p => (
                <button key={p} type="button" onClick={() => togglePerk(p)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${formData.perks.includes(p) ? "bg-[#FF2B2B] text-white border-[#FF2B2B]" : "bg-white text-[#3A1F1F] border-gray-200 hover:border-[#FF2B2B]"}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full py-6 text-base font-semibold">
            Preview Job Before Posting →
          </Button>
        </form>
      </div>
    </div>
  );
}

// ─── Manage Jobs Page ─────────────────────────────────────────────────────────

function ManageJobsPage() {
  const navigate = useNavigate();
  const { recruiterProfile } = useAuth();
  const [jobs, setJobs] = useState<(Job & { applicant_count?: number })[]>([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [editForm, setEditForm] = useState({ title: "", location: "", salaryMin: "", salaryMax: "", salaryType: "LPA", employmentType: "", workMode: "", openings: "1", skills: "" });
  const [saving, setSaving] = useState(false);
  const [refreshingJobId, setRefreshingJobId] = useState<string | null>(null);

  const isEditSalaryRangeInvalid =
    Boolean(editForm.salaryMin && editForm.salaryMax) &&
    Number(editForm.salaryMax) < Number(editForm.salaryMin);

  const openEdit = (job: Job) => {
    setEditingJob(job);
    setEditForm({
      title: job.title,
      location: job.location || "",
      salaryMin: getSalaryFormValue(job.salary_min),
      salaryMax: getSalaryFormValue(job.salary_max),
      salaryType: "LPA",
      employmentType: job.employment_type || "",
      workMode: job.work_mode || "",
      openings: String(job.openings),
      skills: (job.skills || []).join(", "),
    });
  };

  const saveEdit = async () => {
    if (!editingJob) return;
    if (!editForm.salaryMin || !editForm.salaryMax) return;
    if (isEditSalaryRangeInvalid) return;
    setSaving(true);
    const skillsArr = editForm.skills.split(",").map(s => s.trim()).filter(Boolean);
    await supabase.from("jobs").update({
      title: editForm.title,
      location: editForm.location,
      salary_min: Number(editForm.salaryMin),
      salary_max: Number(editForm.salaryMax),
      salary_type: "LPA",
      employment_type: editForm.employmentType,
      work_mode: editForm.workMode,
      openings: Number(editForm.openings) || 1,
      skills: skillsArr,
    }).eq("id", editingJob.id);
    setJobs(prev => prev.map(j => j.id === editingJob.id ? {
      ...j, title: editForm.title, location: editForm.location,
      salary_min: Number(editForm.salaryMin),
      salary_max: Number(editForm.salaryMax),
      salary_type: "LPA", employment_type: editForm.employmentType,
      work_mode: editForm.workMode, openings: Number(editForm.openings) || 1,
      skills: skillsArr,
    } : j));
    setSaving(false);
    setEditingJob(null);
  };

  const fetchJobs = useCallback(async () => {
    if (!recruiterProfile?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("jobs")
      .select("*")
      .eq("recruiter_id", recruiterProfile.id)
      .order("created_at", { ascending: false });
    if (data) {
      // Fetch applicant counts
      const withCounts = await Promise.all(data.map(async (job) => {
        const { count } = await supabase.from("applications").select("*", { count: "exact", head: true }).eq("job_id", job.id);
        return { ...job, applicant_count: count || 0 };
      }));
      const repairedJobs = withCounts.map(job => ({ ...job, status: getEffectiveJobStatus(job) }));
      const staleActiveExpiredIds = withCounts
        .filter(job => (job.status === "Active" || job.status === "Paused") && getEffectiveJobStatus(job) === "Expired")
        .map(job => job.id);
      const staleExpiredIds = withCounts
        .filter(job => job.status === "Expired" && getEffectiveJobStatus(job) === "Active")
        .map(job => job.id);

      await Promise.all([
        staleActiveExpiredIds.length > 0
          ? supabase.from("jobs").update({ status: "Expired" }).in("id", staleActiveExpiredIds)
          : Promise.resolve(),
        staleExpiredIds.length > 0
          ? supabase.from("jobs").update({ status: "Active" }).in("id", staleExpiredIds)
          : Promise.resolve(),
      ]);

      const sortedJobs = repairedJobs.sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setJobs(sortedJobs);
    }
    setLoading(false);
  }, [recruiterProfile?.id]);

  useEffect(() => {
    fetchJobs();
    if (!recruiterProfile?.id) return;
    const channel = supabase.channel(`manage-jobs-realtime-${recruiterProfile.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, fetchJobs)
      .on("postgres_changes", { event: "*", schema: "public", table: "applications" }, fetchJobs)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [recruiterProfile?.id, fetchJobs]);

  const filtered = filter === "All" ? jobs : jobs.filter(j => getEffectiveJobStatus(j) === filter);

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "Active" ? "Paused" : "Active";
    await supabase.from("jobs").update({ status: newStatus }).eq("id", id);
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status: newStatus as "Active" | "Paused" | "Closed" | "Expired" } : j));
  };

  const refreshJob = async (job: Job) => {
    const deadline = buildJobExpiryTimestamp();
    const nowString = new Date().toISOString();
    setRefreshingJobId(job.id);
    const { error } = await supabase
      .from("jobs")
      .update({ deadline, deadline_time: null, status: "Active", created_at: nowString })
      .eq("id", job.id);
    setRefreshingJobId(null);

    if (error) return;

    const repostMessage = `Your job '${job.title}' has been successfully reposted and is active for another ${JOB_EXPIRY_DAYS} days.`;
    const { error: notificationError } = await supabase.from("notifications").upsert({
      user_id: job.recruiter_id,
      user_type: "recruiter",
      title: "Job Reposted",
      message: repostMessage,
      type: "reposted",
      job_id: job.id,
      related_id: job.id,
      notification_key: `job:${job.id}:reposted:${Math.floor(new Date(deadline).getTime() / 1000)}`,
      is_read: false,
    }, { onConflict: "notification_key" });

    if (notificationError) {
      console.error("Failed to create repost notification:", notificationError.message);
      await supabase.from("notifications").insert({
        user_id: job.recruiter_id,
        user_type: "recruiter",
        title: "Job Reposted",
        message: repostMessage,
        type: "job_alert",
        related_id: job.id,
        is_read: false,
      });
    }

    setJobs(prev => prev.map(j => j.id === job.id ? {
      ...j,
      deadline,
      deadline_time: null,
      status: "Active",
      created_at: nowString,
    } : j));
  };

  const closeJob = async (id: string) => {
    if (!confirm("Close this job? Applicant history will stay attached to this job.")) return;
    await supabase.from("jobs").update({ status: "Closed" }).eq("id", id);
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status: "Closed" } : j));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-[#3A1F1F]">Manage Jobs</h1>
        <div className="flex gap-3">
          <div className="flex gap-1 bg-white rounded-full p-1 shadow-sm">
            {["All", "Active", "Paused", "Expired", "Closed"].map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 rounded-full text-sm transition-colors ${filter === f ? "bg-[#FF2B2B] text-white" : "text-[#8A8A8A] hover:text-[#3A1F1F]"}`}>{f}</button>
            ))}
          </div>
          <Button onClick={() => navigate("/recruiter/dashboard/post-job")} className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full">
            <Plus className="mr-2 h-4 w-4" /> Post Job
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#8A8A8A]">Loading jobs...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
          <Briefcase className="h-12 w-12 text-gray-200 mx-auto mb-4" />
          <p className="text-[#8A8A8A] text-lg">No jobs yet. Post your first job!</p>
          <Button onClick={() => navigate("/recruiter/dashboard/post-job")} className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full mt-4">
            <Plus className="mr-2 h-4 w-4" /> Post a Job
          </Button>
        </div>
      ) : (
      <div className="space-y-4">
        {filtered.map(job => {
          const effectiveStatus = getEffectiveJobStatus(job);
          const badgeClass = effectiveStatus === "Active"
            ? "bg-green-100 text-green-700"
            : "bg-gray-100 text-gray-600";

          return (
          <div key={job.id} className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-start flex-wrap gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3
                    className="text-xl font-semibold text-[#3A1F1F] cursor-pointer hover:text-[#FF2B2B] hover:underline transition-all duration-200"
                    onClick={() => navigate(`/recruiter/dashboard/applicants?job=${encodeURIComponent(job.title)}`)}
                  >
                    {job.title}
                  </h3>
                  <Badge className={badgeClass}>{effectiveStatus}</Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-[#8A8A8A] flex-wrap">
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location}</span>
                  <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{job.employment_type}</span>
                  <span className="flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" />{formatJobSalary(job)}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />Posted {new Date(job.created_at).toLocaleDateString()}</span>
                  {job.deadline && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Expires {formatJobDeadline(job)} ({getJobDaysRemaining(job)} day{getJobDaysRemaining(job) === 1 ? "" : "s"} left)
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <JobShareButton jobId={job.id} title={job.title} className="relative" />
                {effectiveStatus === "Expired" ? (
                  <Button variant="outline" size="icon" className="border-gray-200 rounded-full" onClick={() => refreshJob(job)} disabled={refreshingJobId === job.id} title={`Refresh for ${JOB_EXPIRY_DAYS} days`}>
                    <RefreshCw className={`h-4 w-4 text-green-500 ${refreshingJobId === job.id ? "animate-spin" : ""}`} />
                  </Button>
                ) : (
                  <Button variant="outline" size="icon" className="border-gray-200 rounded-full" onClick={() => toggleStatus(job.id, effectiveStatus)} title={effectiveStatus === "Active" ? "Pause" : "Activate"}>
                    {effectiveStatus === "Active" ? <Pause className="h-4 w-4 text-[#8A8A8A]" /> : <RefreshCw className="h-4 w-4 text-green-500" />}
                  </Button>
                )}
                <Button variant="outline" size="icon" className="border-gray-200 rounded-full" onClick={() => navigate(`/recruiter/dashboard/applicants?job=${encodeURIComponent(job.title)}`)} title="View Applicants">
                  <Users className="h-4 w-4 text-[#FF2B2B]" />
                </Button>
                <Button variant="outline" size="icon" className="border-gray-200 rounded-full" onClick={() => openEdit(job)} title="Edit Job"><Edit className="h-4 w-4 text-[#3A1F1F]" /></Button>
                <Button variant="outline" size="icon" className="border-gray-200 rounded-full" onClick={() => closeJob(job.id)} title="Close Job"><Trash2 className="h-4 w-4 text-[#FF2B2B]" /></Button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
              <div
                className="text-center cursor-pointer group"
                onClick={() => navigate(`/recruiter/dashboard/applicants?job=${encodeURIComponent(job.title)}`)}
              >
                <div className="text-xl font-bold text-[#3A1F1F] group-hover:text-[#FF2B2B] transition-all duration-200">{(job as any).applicant_count ?? 0}</div>
                <div className="text-xs text-[#8A8A8A] group-hover:underline">Applicants</div>
              </div>
              <div className="text-center"><div className="text-xl font-bold text-blue-600">{job.views ?? 0}</div><div className="text-xs text-[#8A8A8A]">Job Views</div></div>
              <div className="text-center"><div className="text-xl font-bold text-green-600">{job.openings}</div><div className="text-xs text-[#8A8A8A]">Openings</div></div>
            </div>
            {job.skills && job.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {job.skills.slice(0, 5).map((s, i) => <Badge key={i} className="bg-[#ECECF4] text-[#3A1F1F] text-xs">{s}</Badge>)}
              </div>
            )}
          </div>
          );
        })}
      </div>
      )}

      {/* Edit Job Dialog */}
      <Dialog open={!!editingJob} onOpenChange={(o) => { if (!o) setEditingJob(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Job</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="block text-sm font-medium text-[#3A1F1F] mb-1">Job Title *</label>
              <Input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} className="bg-[#F6F6F6] border-gray-200 rounded-xl" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3A1F1F] mb-1">Location</label>
              <LocationAutocomplete
                value={editForm.location}
                onChange={location => setEditForm(f => ({ ...f, location }))}
                placeholder="Search Indian city"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[#3A1F1F] mb-1">Employment Type</label>
                <Select value={editForm.employmentType} onValueChange={v => setEditForm(f => ({ ...f, employmentType: v }))}>
                  <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{["Full-time","Part-time","Contract","Internship","Freelance"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#3A1F1F] mb-1">Work Mode</label>
                <Select value={editForm.workMode} onValueChange={v => setEditForm(f => ({ ...f, workMode: v }))}>
                  <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{["Work from Office","Work from Home","Hybrid"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3A1F1F] mb-1">Salary Offered *</label>
              <div className="flex gap-2 items-center">
                <SalaryCombobox
                  value={editForm.salaryMin}
                  onChange={v => setEditForm(f => ({ ...f, salaryMin: v }))}
                  placeholder="Search or Select"
                />
                <span className="text-[#8A8A8A]">–</span>
                <SalaryCombobox
                  value={editForm.salaryMax}
                  onChange={v => setEditForm(f => ({ ...f, salaryMax: v }))}
                  placeholder="Search or Select"
                />
              </div>
              {isEditSalaryRangeInvalid && (
                <p className="text-xs text-red-500 mt-1.5">Maximum salary must be greater than or equal to minimum salary.</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3A1F1F] mb-1">Number of Openings</label>
              <Input type="number" min="1" value={editForm.openings} onChange={e => setEditForm(f => ({ ...f, openings: e.target.value }))} className="bg-[#F6F6F6] border-gray-200 rounded-xl w-24" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3A1F1F] mb-1">Key Skills (comma separated)</label>
              <Input value={editForm.skills} onChange={e => setEditForm(f => ({ ...f, skills: e.target.value }))} className="bg-[#F6F6F6] border-gray-200 rounded-xl" placeholder="Enter required skills" />
            </div>
            <div className="flex gap-3 pt-2">
              <Button className="flex-1 bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full" onClick={saveEdit} disabled={saving || !editForm.title || !editForm.salaryMin || !editForm.salaryMax || isEditSalaryRangeInvalid}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button variant="outline" className="rounded-full" onClick={() => setEditingJob(null)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Search Candidates Page ───────────────────────────────────────────────────

interface DBCandidate extends Profile {
  work_experience?: WorkExperience[];
  education?: EduType[];
}

type AppliedJdSearchApplication = {
  profile: DBCandidate | null;
  job: Job | null;
};

function SearchCandidatesPage() {
  const { recruiterProfile } = useAuth();
  // ── Search state ──────────────────────────────────────────
  const [keywords, setKeywords]       = useState("");
  const [location, setLocation]       = useState("");
  const [expMin, setExpMin]           = useState("");
  const [expMax, setExpMax]           = useState("");
  const [curSalMin, setCurSalMin]     = useState("");
  const [curSalMax, setCurSalMax]     = useState("");
  const [expSalMax, setExpSalMax]     = useState("");
  const [noticePeriod, setNoticePeriod] = useState("");
  const [education, setEducation]     = useState("");
  const [industry, setIndustry]       = useState("");
  const [currentCompany, setCurrentCompany] = useState("");
  const [expType, setExpType]         = useState("");
  const [skillTags, setSkillTags]     = useState<string[]>([]);
  const [skillInput, setSkillInput]   = useState("");
  const [skillSuggestionsOpen, setSkillSuggestionsOpen] = useState(false);
  const searchKeywordRef = useRef<HTMLDivElement>(null);

  const [results, setResults]         = useState<DBCandidate[]>([]);
  const [searching, setSearching]     = useState(false);
  const [searched, setSearched]       = useState(false);
  const [profileModal, setProfileModal] = useState<DBCandidate | null>(null);
  const [sortBy, setSortBy]           = useState("relevant");
  const [shortlisted, setShortlisted] = useState<Set<string>>(new Set());
  const [interviewInvited, setInterviewInvited] = useState<Set<string>>(new Set());

  const toggleShortlist = (id: string) => setShortlisted(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const toggleInterview = (id: string) => setInterviewInvited(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  // ── Helpers ───────────────────────────────────────────────
  // Compute total years of experience from total_experience text OR from work_experience records
  const parseExp = (c: DBCandidate) => {
    // 1. Try total_experience field first (seeded profiles have "5 years 3 months")
    if (c.total_experience) {
      const m = c.total_experience.match(/(\d+)/);
      if (m) return parseInt(m[1]);
    }
    // 2. Fallback: calculate from work_experience records (newly registered profiles)
    const exps = c.work_experience || [];
    if (exps.length === 0) return 0;
    let totalMonths = 0;
    const now = new Date();
    exps.forEach(exp => {
      const parseDate = (s: string | null | undefined): Date => {
        if (!s) return now;
        // "Jan 2022", "2022", "Present"
        if (s.toLowerCase() === "present") return now;
        const d = new Date(s);
        return isNaN(d.getTime()) ? now : d;
      };
      const start = parseDate(exp.start_date);
      const end = exp.is_current ? now : parseDate(exp.end_date);
      totalMonths += Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
    });
    return Math.floor(totalMonths / 12);
  };

  // Parse salary: handles "18 LPA", "18", "18.5 LPA", "18.5", "18 lakh" etc.
  const parseSal = (s: string | null) => {
    if (!s) return 0;
    const m = s.match(/(\d+\.?\d*)/);
    return m ? parseFloat(m[1]) : 0;
  };

  // Parse notice: handles "30 days", "1 month", "2 months", "Immediate", "60"
  const parseNotice = (s: string | null) => {
    if (!s) return 999;
    const lower = s.toLowerCase();
    if (lower.includes("immediate") || lower === "0") return 0;
    // Convert months to days
    const monthMatch = lower.match(/(\d+)\s*month/);
    if (monthMatch) return parseInt(monthMatch[1]) * 30;
    const dayMatch = lower.match(/(\d+)/);
    return dayMatch ? parseInt(dayMatch[1]) : 999;
  };

  const jdMatchesKeyword = (job: Job | null, keyword: string): boolean => {
    if (!job) return false;
    const keywordLower = keyword.trim().toLowerCase();
    if (!keywordLower) return false;

    const jdText = [
      job.title,
      job.company_name,
      job.industry,
      job.department,
      job.description,
      job.roles_responsibilities,
      job.requirements,
      job.education,
      job.employment_type,
      ...(job.skills || []),
    ].filter(Boolean).join(" ").toLowerCase();

    return jdText.includes(keywordLower) || (job.skills || []).some(skill => skillsMatch(skill, keyword));
  };

  // ── Skill tag management ──────────────────────────────────
  const addSkillTag = (tag: string) => {
    const t = tag.trim();
    if (t && !skillTags.includes(t)) setSkillTags(prev => [...prev, t]);
    setSkillInput("");
  };

  const filteredKeywordSuggestions = useMemo(() => {
    const query = keywords.trim().toLowerCase();
    if (!query) return [];
    return SEARCH_SUGGESTION_DATASET
      .filter(item => item.toLowerCase().includes(query))
      .slice(0, 12);
  }, [keywords]);

  useEffect(() => {
    if (!skillSuggestionsOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!searchKeywordRef.current?.contains(event.target as Node)) {
        setSkillSuggestionsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [skillSuggestionsOpen]);

  // ── Main search ───────────────────────────────────────────
  const handleSearch = async () => {
    setSearching(true);
    setSearched(true);
    try {
      let q = supabase
        .from("profiles")
        .select("*, work_experience(*), education(*)");

      // Server-side: keyword search across text columns (token-based)
      if (keywords.trim()) {
        const tokens = keywords.trim().toLowerCase().split(/\s+/).filter(Boolean);
        tokens.forEach(token => {
          q = q.or(
            `first_name.ilike.%${token}%,last_name.ilike.%${token}%,` +
            `headline.ilike.%${token}%,current_title.ilike.%${token}%,` +
            `current_company.ilike.%${token}%,about.ilike.%${token}%`
          );
        });
      }
      // Server-side: location
      if (location.trim()) q = q.ilike("location", `%${location.trim()}%`);
      // Server-side: current company override
      if (currentCompany.trim()) q = q.ilike("current_company", `%${currentCompany.trim()}%`);
      const { data } = await q.limit(200);
      let raw = (data || []) as DBCandidate[];

      // Skill keyword also searches the skills array column
      if (keywords.trim()) {
        const tokens = keywords.trim().toLowerCase().split(/\s+/).filter(Boolean);
        const allSkillTerms = tokens.flatMap(token => getSkillSearchTerms(token)).slice(0, 30);
        if (allSkillTerms.length > 0) {
          const { data: skillMatches } = await supabase
            .from("profiles")
            .select("*, work_experience(*), education(*)")
            .overlaps("skills", allSkillTerms);
          if (skillMatches) {
            const ids = new Set(raw.map(r => r.id));
            (skillMatches as DBCandidate[]).forEach(sm => { if (!ids.has(sm.id)) raw.push(sm); });
          }
        }
      }

      // ── Client-side filters ──────────────────────────────────────────────────
      if (keywords.trim()) {
        let broadSkillQuery = supabase
          .from("profiles")
          .select("*, work_experience(*), education(*)");
        if (location.trim()) broadSkillQuery = broadSkillQuery.ilike("location", `%${location.trim()}%`);
        if (currentCompany.trim()) broadSkillQuery = broadSkillQuery.ilike("current_company", `%${currentCompany.trim()}%`);

        const { data: broadSkillCandidates } = await broadSkillQuery.limit(1000);
        if (broadSkillCandidates) {
          const ids = new Set(raw.map(r => r.id));
          const tokens = keywords.trim().toLowerCase().split(/\s+/).filter(Boolean);
          (broadSkillCandidates as DBCandidate[]).forEach(candidate => {
            if (!ids.has(candidate.id)) {
              const hasSkillMatch = (candidate.skills || []).some(skill => 
                tokens.some(token => skillsMatch(skill, token))
              );
              if (hasSkillMatch) {
                raw.push(candidate);
                ids.add(candidate.id);
              }
            }
          });
        }

        const tokens = keywords.trim().toLowerCase().split(/\s+/).filter(Boolean);
        raw = raw.filter(candidate => {
          const searchableText = [
            candidate.first_name,
            candidate.last_name,
            candidate.headline,
            candidate.current_title,
            candidate.current_company,
            candidate.about,
            candidate.location,
          ].filter(Boolean).join(" ").toLowerCase();

          return tokens.every(token =>
            searchableText.includes(token) ||
            (candidate.skills || []).some(skill => skillsMatch(skill, token))
          );
        });
      }

      // Experience type (client-side so null values aren't excluded)
      if (expType) {
        raw = raw.filter(c => {
          if (c.experience_type) return c.experience_type === expType;
          // Infer from computed experience when field is null
          const yrs = parseExp(c);
          if (expType === "fresher") return yrs <= 1;
          return yrs > 1;
        });
      }
      // Experience years
      raw = raw.filter(c => {
        const exp = parseExp(c);
        if (expMin && exp < parseInt(expMin)) return false;
        if (expMax && exp > parseInt(expMax)) return false;
        return true;
      });
      // Current salary
      raw = raw.filter(c => {
        const sal = parseSal(c.current_salary);
        if (curSalMin && sal < parseFloat(curSalMin)) return false;
        if (curSalMax && sal > parseFloat(curSalMax)) return false;
        return true;
      });
      // Expected salary
      raw = raw.filter(c => {
        if (!expSalMax) return true;
        return parseSal(c.expected_salary) <= parseFloat(expSalMax);
      });
      // Notice period — convert notice period to days for comparison
      raw = raw.filter(c => {
        if (!noticePeriod) return true;
        const np = parseNotice(c.notice_period);
        if (noticePeriod === "immediate") return np === 0;
        return np <= parseInt(noticePeriod);
      });
      // Education
      raw = raw.filter(c => {
        if (!education) return true;
        const eduList = (c.education || []) as EduType[];
        return eduList.some(e =>
          `${e.degree} ${e.field}`.toLowerCase().includes(education.toLowerCase())
        );
      });
      // Skill tags (all must match)
      raw = raw.filter(c => {
        if (skillTags.length === 0) return true;
        const cSkills = c.skills || [];
        return skillTags.every(tag => cSkills.some(s => skillsMatch(s, tag)));
      });

      // Sort
      if (sortBy === "exp_desc") raw.sort((a, b) => parseExp(b) - parseExp(a));
      else if (sortBy === "exp_asc") raw.sort((a, b) => parseExp(a) - parseExp(b));
      else if (sortBy === "salary_asc") raw.sort((a, b) => parseSal(a.expected_salary) - parseSal(b.expected_salary));
      else if (sortBy === "recent") raw.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      if (raw.length > 0) {
        const candidateIds = raw.map(c => c.id).filter(Boolean);
        if (candidateIds.length > 0) {
          void supabase.rpc("increment_recruiter_searches", { target_profile_ids: candidateIds }).then(({ error }) => {
            if (error) console.warn("Failed to increment recruiter searches (migration might not be run):", error.message);
          });
        }
      }

      setResults(raw);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    handleSearch();
  }, []);

  const clearAllFilters = () => {
    setExpMin(""); setExpMax(""); setCurSalMin(""); setCurSalMax("");
    setExpSalMax(""); setNoticePeriod(""); setEducation("");
    setIndustry(""); setCurrentCompany(""); setExpType(""); setSkillTags([]);
  };

  const activeFilterCount = [expMin, expMax, curSalMin, curSalMax, expSalMax, noticePeriod, education, industry, currentCompany, expType].filter(Boolean).length + skillTags.length;

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-[#3A1F1F] mb-5">Search Candidates</h1>

      {/* ── Top Search Bar (Naukri-style) ── */}
      <div className="bg-white rounded-2xl shadow-md p-4 mb-5">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]" ref={searchKeywordRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A8A8A]" />
            <Input
              value={keywords}
              onFocus={() => setSkillSuggestionsOpen(true)}
              onChange={e => {
                setKeywords(e.target.value);
                setSkillSuggestionsOpen(true);
              }}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSearch();
                }
                if (e.key === "Escape") {
                  setSkillSuggestionsOpen(false);
                }
              }}
              className="pl-9 bg-[#F6F6F6] border-gray-200 rounded-xl"
              placeholder="Skills, designation, company name..."
            />
            {skillSuggestionsOpen && filteredKeywordSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                <div className="max-h-72 overflow-y-auto">
                  {filteredKeywordSuggestions.map(skill => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => {
                        setKeywords(skill);
                        setSkillSuggestionsOpen(false);
                      }}
                      className="flex w-full items-center px-3 py-2 text-left text-sm text-[#3A1F1F] hover:bg-[#FFF0F0]"
                    >
                      <span>{skill}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <LocationAutocomplete
            value={location}
            onChange={setLocation}
            onEnter={handleSearch}
            placeholder="Location"
            className="min-w-[160px]"
          />
          <Button onClick={handleSearch} disabled={searching} className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-xl px-6">
            <Search className="h-4 w-4 mr-2" /> {searching ? "Searching..." : "Search"}
          </Button>
        </div>

        {/* Quick experience chips */}
        <div className="flex gap-2 mt-3 flex-wrap items-center">
          <span className="text-xs text-[#8A8A8A] font-medium">Quick:</span>
          {[["Fresher", "", "1"], ["1-3 yrs", "1", "3"], ["3-5 yrs", "3", "5"], ["5-8 yrs", "5", "8"], ["8-12 yrs", "8", "12"], ["12+ yrs", "12", "99"]].map(([label, min, max]) => (
            <button key={label}
              onClick={() => { setExpMin(min); setExpMax(max === "1" ? "1" : max); if (min === "") setExpType("fresher"); else setExpType("experienced"); }}
              className={`px-3 py-1 rounded-full text-xs border transition-colors ${expMin === min && expMax === max ? "bg-[#FF2B2B] text-white border-[#FF2B2B]" : "border-gray-200 text-[#5A5A5A] hover:border-[#FF2B2B]"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-5 items-start">
        {/* ── LEFT: Filter Sidebar (Naukri ResdEx style) ── */}
        <div className="w-64 flex-shrink-0 space-y-0 bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-[#3A1F1F]">Refine Results</h3>
            {activeFilterCount > 0 && (
              <button onClick={clearAllFilters} className="text-xs text-[#FF2B2B] hover:underline">Clear all ({activeFilterCount})</button>
            )}
          </div>

          {/* Experience */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-[#3A1F1F] mb-2 uppercase tracking-wide">Experience</p>
            <div className="flex gap-2 items-center">
              <Select value={expMin || "any"} onValueChange={v => setExpMin(v === "any" ? "" : v)}>
                <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-lg text-xs h-8 flex-1"><SelectValue placeholder="Min" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {[0,1,2,3,4,5,6,7,8,10,12,15].map(y => <SelectItem key={y} value={String(y)}>{y} yr</SelectItem>)}
                </SelectContent>
              </Select>
              <span className="text-[#8A8A8A] text-xs">–</span>
              <Select value={expMax || "any"} onValueChange={v => setExpMax(v === "any" ? "" : v)}>
                <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-lg text-xs h-8 flex-1"><SelectValue placeholder="Max" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {[1,2,3,5,7,10,12,15,20,25].map(y => <SelectItem key={y} value={String(y)}>{y} yr</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Candidate Type */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-[#3A1F1F] mb-2 uppercase tracking-wide">Candidate Type</p>
            <div className="space-y-1.5">
              {[["", "All"], ["fresher", "Freshers only"], ["experienced", "Experienced only"]].map(([val, label]) => (
                <label key={val} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="expType" value={val} checked={expType === val} onChange={() => setExpType(val)} className="accent-[#FF2B2B]" />
                  <span className="text-xs text-[#3A1F1F]">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Current Salary */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-[#3A1F1F] mb-2 uppercase tracking-wide">Current CTC (LPA)</p>
            <div className="flex gap-2 items-center">
              <Input value={curSalMin} onChange={e => setCurSalMin(e.target.value)} type="number" min="0" className="bg-[#F6F6F6] border-gray-200 rounded-lg text-xs h-8 flex-1" placeholder="Min" />
              <span className="text-[#8A8A8A] text-xs">–</span>
              <Input value={curSalMax} onChange={e => setCurSalMax(e.target.value)} type="number" min="0" className="bg-[#F6F6F6] border-gray-200 rounded-lg text-xs h-8 flex-1" placeholder="Max" />
            </div>
          </div>

          {/* Expected Salary */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-[#3A1F1F] mb-2 uppercase tracking-wide">Expected CTC (up to LPA)</p>
            <Select value={expSalMax || "any"} onValueChange={v => setExpSalMax(v === "any" ? "" : v)}>
              <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-lg text-xs h-8"><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                {[5,8,10,12,15,20,25,30,40,50].map(v => <SelectItem key={v} value={String(v)}>{v} LPA</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Notice Period */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-[#3A1F1F] mb-2 uppercase tracking-wide">Notice Period</p>
            <div className="space-y-1.5">
              {[["", "Any"], ["immediate", "Immediate joiner"], ["15", "≤ 15 days"], ["30", "≤ 30 days"], ["60", "≤ 60 days"]].map(([val, label]) => (
                <label key={val} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="notice" value={val} checked={noticePeriod === val} onChange={() => setNoticePeriod(val)} className="accent-[#FF2B2B]" />
                  <span className="text-xs text-[#3A1F1F]">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Education */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-[#3A1F1F] mb-2 uppercase tracking-wide">Education</p>
            <Select value={education || "any"} onValueChange={v => setEducation(v === "any" ? "" : v)}>
              <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-lg text-xs h-8"><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                {["B.Tech","M.Tech","MBA","B.Com","BCA","MCA","B.Sc","M.Sc","PhD","Diploma"].map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Current Company */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-[#3A1F1F] mb-2 uppercase tracking-wide">Current Company</p>
            <Input value={currentCompany} onChange={e => setCurrentCompany(e.target.value)} className="bg-[#F6F6F6] border-gray-200 rounded-lg text-xs h-8" placeholder="Enter company name" />
          </div>

          {/* Skills */}
          <div className="px-4 py-3">
            <p className="text-xs font-semibold text-[#3A1F1F] mb-2 uppercase tracking-wide">Skills</p>
            <div className="flex gap-1.5 mb-2 flex-wrap">
              {skillTags.map(tag => (
                <span key={tag} className="flex items-center gap-1 bg-[#FF2B2B] text-white text-xs px-2 py-0.5 rounded-full">
                  {tag}
                  <button onClick={() => setSkillTags(prev => prev.filter(t => t !== tag))} className="ml-0.5 hover:opacity-75">×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-1">
              <Input
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addSkillTag(skillInput); } }}
                className="bg-[#F6F6F6] border-gray-200 rounded-lg text-xs h-8 flex-1"
                placeholder="Type skill + Enter"
              />
              <button onClick={() => addSkillTag(skillInput)} className="px-2 py-1 bg-[#FF2B2B] text-white rounded-lg text-xs hover:bg-[#e02525]">+</button>
            </div>
          </div>

          {/* Apply Filters button */}
          <div className="px-4 pb-4">
            <Button onClick={handleSearch} disabled={searching} className="w-full bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-xl text-sm">
              {searching ? "Searching..." : "Apply Filters"}
            </Button>
          </div>
        </div>

        {/* ── RIGHT: Results ── */}
        <div className="flex-1 min-w-0">
          {!searched ? (
            <div className="text-center py-20 text-[#8A8A8A]">
              <Search className="h-16 w-16 mx-auto mb-4 text-gray-200" />
              <p className="text-lg font-medium">Search for candidates</p>
              <p className="text-sm mt-1">Enter keywords, skills or designation above and click Search</p>
            </div>
          ) : searching ? (
            <div className="text-center py-20 text-[#8A8A8A]">
              <div className="w-8 h-8 border-4 border-[#FF2B2B] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p>Searching candidates...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
              <Users className="h-12 w-12 text-gray-200 mx-auto mb-4" />
              <p className="text-[#8A8A8A] text-lg">No candidates found matching your criteria.</p>
              <p className="text-sm text-[#8A8A8A] mt-1">Try broadening your search or removing some filters.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-[#5A5A5A]"><span className="font-semibold text-[#3A1F1F]">{results.length}</span> candidate{results.length !== 1 ? "s" : ""} found</p>
                <Select value={sortBy} onValueChange={v => { setSortBy(v); }}>
                  <SelectTrigger className="w-44 bg-white border-gray-200 rounded-xl text-sm h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevant">Most Relevant</SelectItem>
                    <SelectItem value="recent">Newest Profile</SelectItem>
                    <SelectItem value="exp_desc">Most Experienced</SelectItem>
                    <SelectItem value="exp_asc">Least Experienced</SelectItem>
                    <SelectItem value="salary_asc">Lowest Expected CTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                {results.map(c => {
                  const name = getCandidateDisplayName(c);
                  const initials = getCandidateInitials(name);
                  const skills = c.skills || [];
                  const workExp = c.work_experience || [];

                  // Normalize experience display — use stored text or compute from work history
                  const expYrs = parseExp(c);
                  const displayExp = c.total_experience
                    ? c.total_experience
                    : expYrs > 0 ? `${expYrs} yr${expYrs !== 1 ? "s" : ""}`
                    : c.experience_type === "fresher" ? "Fresher" : null;

                  // Normalize salary — append "LPA" if missing
                  const fmtSal = (s: string | null) => {
                    if (!s) return null;
                    const lower = s.toLowerCase();
                    if (lower.includes("lpa") || lower.includes("lakh") || lower.includes("k") || lower.includes("month")) return s;
                    return /^\d/.test(s.trim()) ? `${s} LPA` : s;
                  };

                  return (
                    <div key={c.id} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                      <div className="p-5">
                        <div className="flex items-start gap-4">
                          {/* Avatar */}
                          <div className="w-14 h-14 rounded-2xl flex-shrink-0 overflow-hidden bg-[#FF2B2B] flex items-center justify-center text-white font-bold text-lg">
                            {c.avatar_url
                              ? <img src={c.avatar_url} alt={name} className="w-full h-full object-cover" />
                              : initials}
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Name + Match */}
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              <div>
                                <h3 className="text-base font-semibold text-[#3A1F1F]">{name}</h3>
                                <p className="text-sm text-[#5A5A5A]">
                                  {c.headline || c.current_title || (workExp[0] ? workExp[0].title : "")}
                                  {(c.current_company || workExp[0]?.company) && (
                                    <span> at <span className="text-[#FF2B2B] font-medium">{c.current_company || workExp[0].company}</span></span>
                                  )}
                                </p>
                              </div>
                            </div>

                            {/* Key info row */}
                            <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-[#5A5A5A]">
                              {c.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-[#8A8A8A]" />{c.location}</span>}
                              {displayExp && <span className="flex items-center gap-1"><Briefcase className="h-3 w-3 text-[#8A8A8A]" />{displayExp}</span>}
                              {fmtSal(c.current_salary) && <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3 text-[#8A8A8A]" />Current: <span className="font-medium text-[#3A1F1F]">{fmtSal(c.current_salary)}</span></span>}
                              {fmtSal(c.expected_salary) && <span className="flex items-center gap-1"><Target className="h-3 w-3 text-[#8A8A8A]" />Expected: <span className="font-medium text-[#FF2B2B]">{fmtSal(c.expected_salary)}</span></span>}
                              {c.notice_period && <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-[#8A8A8A]" />Notice: <span className="font-medium text-[#3A1F1F]">{c.notice_period}</span></span>}
                            </div>

                            {/* Current role from work_exp */}
                            {workExp.length > 0 && (
                              <p className="text-xs text-[#8A8A8A] mt-1">
                                <span className="font-medium text-[#3A1F1F]">{workExp[0].title}</span> at {workExp[0].company} · {workExp[0].start_date} – {workExp[0].is_current ? "Present" : workExp[0].end_date}
                              </p>
                            )}

                            {/* Skills */}
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {skills.slice(0, 6).map((s: string, i: number) => (
                                <Badge key={i} className={`text-xs ${skillTags.some(t => s.toLowerCase().includes(t.toLowerCase())) ? "bg-[#FF2B2B] text-white" : "bg-[#ECECF4] text-[#3A1F1F]"}`}>{s}</Badge>
                              ))}
                              {skills.length > 6 && <Badge className="bg-gray-100 text-[#8A8A8A] text-xs">+{skills.length - 6}</Badge>}
                            </div>

                            {/* About — clamped to 2 lines */}
                            {c.about && <p className="mt-1.5 text-xs text-[#5A5A5A] line-clamp-2 leading-relaxed overflow-hidden">{c.about}</p>}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 flex-wrap">
                          <Button size="sm" onClick={() => {
                            setProfileModal(c);
                            if (c?.id) {
                              void supabase.rpc("increment_profile_views", { target_profile_id: c.id }).then(({ error }) => {
                                if (error) console.warn("Failed to increment profile views (migration might not be run):", error.message);
                              });
                            }
                          }} className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full text-xs h-7">
                            <Eye className="h-3.5 w-3.5 mr-1" /> View Full Profile
                          </Button>
                          <Button size="sm" variant={shortlisted.has(c.id) ? "default" : "outline"} className={shortlisted.has(c.id) ? "bg-pink-600 hover:bg-pink-700 text-white rounded-full text-xs h-7" : "border-pink-500 text-pink-600 hover:bg-pink-50 rounded-full text-xs h-7"} onClick={() => toggleShortlist(c.id)}>
                            <ThumbsUp className="h-3.5 w-3.5 mr-1" /> {shortlisted.has(c.id) ? "Shortlisted" : "Shortlist"}
                          </Button>
                          <Button size="sm" variant="outline" className="border-gray-200 rounded-full text-xs h-7" onClick={() => { if (c.email) window.location.href = `mailto:${c.email}`; }}>
                            <Mail className="h-3.5 w-3.5 mr-1" /> Message
                          </Button>
                          <Button size="sm" variant={interviewInvited.has(c.id) ? "default" : "outline"} className={interviewInvited.has(c.id) ? "bg-purple-600 hover:bg-purple-700 text-white rounded-full text-xs h-7" : "border-purple-400 text-purple-600 hover:bg-purple-50 rounded-full text-xs h-7"} onClick={() => toggleInterview(c.id)}>
                            <Video className="h-3.5 w-3.5 mr-1" /> {interviewInvited.has(c.id) ? "Invited" : "Interview"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Full Profile Modal (Naukri-style) ── */}
      {profileModal && (() => {
        const c = profileModal;
        const name = getCandidateDisplayName(c);
        const initials = getCandidateInitials(name);
        const workExp = c.work_experience || [];
        const eduList = c.education || [];
        const skills = c.skills || [];
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setProfileModal(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              {/* Header — avatar + name fully inside banner, no negative margin */}
              <div className="bg-gradient-to-r from-[#3A1F1F] to-[#FF2B2B] rounded-t-2xl px-6 py-5 relative">
                <button onClick={() => setProfileModal(null)} className="absolute top-3 right-4 text-white/70 hover:text-white text-2xl leading-none font-bold">×</button>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl border-2 border-white/40 shadow overflow-hidden bg-white/20 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                    {c.avatar_url
                      ? <img src={c.avatar_url} alt={name} className="w-full h-full object-cover" />
                      : initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-white truncate">{name}</h2>
                    <p className="text-sm text-white/80 truncate">
                      {c.headline || c.current_title}
                      {c.current_company && <span> · {c.current_company}</span>}
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-6 pb-6 pt-5">

                {/* Quick stats grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-[#F6F6F6] rounded-xl mb-5">
                  {[
                    { label: "Experience", value: c.total_experience },
                    { label: "Location", value: c.location },
                    { label: "Current CTC", value: c.current_salary },
                    { label: "Expected CTC", value: c.expected_salary, highlight: true },
                    { label: "Notice Period", value: c.notice_period },
                    { label: "Phone", value: c.phone },
                    { label: "Email", value: c.email },
                    { label: "Candidate Type", value: c.experience_type ? (c.experience_type === "fresher" ? "Fresher" : "Experienced") : null },
                  ].filter(item => item.value).map((item, i) => (
                    <div key={i}>
                      <p className="text-xs text-[#8A8A8A]">{item.label}</p>
                      <p className={`text-sm font-semibold truncate ${(item as any).highlight ? "text-[#FF2B2B]" : "text-[#3A1F1F]"}`}>{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 flex-wrap mb-5">
                  <Button size="sm" variant={shortlisted.has(c.id) ? "default" : "outline"} className={shortlisted.has(c.id) ? "bg-pink-600 hover:bg-pink-700 text-white rounded-full text-xs" : "border-pink-500 text-pink-600 hover:bg-pink-50 rounded-full text-xs"} onClick={() => toggleShortlist(c.id)}><ThumbsUp className="h-3.5 w-3.5 mr-1" /> {shortlisted.has(c.id) ? "Shortlisted ✓" : "Shortlist"}</Button>
                  <Button size="sm" variant={interviewInvited.has(c.id) ? "default" : "outline"} className={interviewInvited.has(c.id) ? "bg-purple-600 hover:bg-purple-700 text-white rounded-full text-xs" : "border-purple-400 text-purple-600 hover:bg-purple-50 rounded-full text-xs"} onClick={() => toggleInterview(c.id)}><Video className="h-3.5 w-3.5 mr-1" /> {interviewInvited.has(c.id) ? "Invited ✓" : "Schedule Interview"}</Button>
                  <Button size="sm" variant="outline" className="border-gray-200 rounded-full text-xs" onClick={() => { if (c.email) window.location.href = `mailto:${c.email}`; }}><Mail className="h-3.5 w-3.5 mr-1" /> Send Message</Button>
                  {c.linkedin_url && <a href={c.linkedin_url} target="_blank" rel="noreferrer"><Button size="sm" variant="outline" className="border-blue-400 text-blue-600 hover:bg-blue-50 rounded-full text-xs">LinkedIn</Button></a>}
                  {c.portfolio_url && <a href={c.portfolio_url} target="_blank" rel="noreferrer"><Button size="sm" variant="outline" className="border-gray-300 rounded-full text-xs"><Globe className="h-3.5 w-3.5 mr-1" /> Portfolio</Button></a>}
                </div>

                {/* Profile Summary */}
                {c.about && (
                  <div className="mb-5">
                    <h3 className="text-sm font-bold text-[#3A1F1F] mb-2 flex items-center gap-2"><User className="h-4 w-4 text-[#FF2B2B]" /> Profile Summary</h3>
                    <p className="text-sm text-[#5A5A5A] leading-relaxed bg-[#F6F6F6] rounded-xl p-3 border-l-4 border-[#FF2B2B]">{c.about}</p>
                  </div>
                )}

                {/* Skills */}
                {skills.length > 0 && (
                  <div className="mb-5">
                    <h3 className="text-sm font-bold text-[#3A1F1F] mb-2 flex items-center gap-2"><Star className="h-4 w-4 text-[#FF2B2B]" /> Key Skills</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {skills.map((s: string, i: number) => (
                        <Badge key={i} className={`text-xs ${skillTags.some(t => s.toLowerCase().includes(t.toLowerCase())) ? "bg-[#FF2B2B] text-white" : "bg-[#ECECF4] text-[#3A1F1F]"}`}>{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Work Experience */}
                {workExp.length > 0 && (
                  <div className="mb-5">
                    <h3 className="text-sm font-bold text-[#3A1F1F] mb-3 flex items-center gap-2"><Briefcase className="h-4 w-4 text-[#FF2B2B]" /> Work Experience</h3>
                    <div className="relative">
                      <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gradient-to-b from-[#FF2B2B] to-red-100" />
                      <div className="space-y-3">
                        {workExp.map((exp, i) => (
                          <div key={i} className="flex gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${i === 0 ? "bg-[#FF2B2B]" : "bg-gray-300"}`}>
                              <Briefcase className="h-3.5 w-3.5 text-white" />
                            </div>
                            <div className={`flex-1 rounded-xl p-3 border text-sm ${i === 0 ? "bg-red-50 border-red-100" : "bg-white border-gray-100"}`}>
                              <div className="flex justify-between flex-wrap gap-1">
                                <div>
                                  <p className="font-semibold text-[#3A1F1F]">{exp.title}</p>
                                  <p className="text-[#FF2B2B] text-xs font-medium">{exp.company}{exp.location ? ` · ${exp.location}` : ""}</p>
                                </div>
                                <p className="text-xs text-[#8A8A8A] flex-shrink-0">{exp.start_date} – {exp.is_current ? "Present" : exp.end_date}</p>
                              </div>
                              {exp.description && <p className="text-xs text-[#5A5A5A] mt-1.5 leading-relaxed">{exp.description}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Education */}
                {eduList.length > 0 && (
                  <div className="mb-5">
                    <h3 className="text-sm font-bold text-[#3A1F1F] mb-3 flex items-center gap-2"><GraduationCap className="h-4 w-4 text-blue-500" /> Education</h3>
                    <div className="space-y-2">
                      {eduList.map((e, i) => (
                        <div key={i} className="flex gap-3 bg-blue-50 border border-blue-100 rounded-xl p-3">
                          <GraduationCap className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold text-[#3A1F1F]">{e.degree} in {e.field}</p>
                            <p className="text-xs text-blue-600 font-medium">{e.institution}</p>
                            <p className="text-xs text-[#8A8A8A]">{e.start_year} – {e.end_year}{e.score ? ` · ${e.score}` : ""}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resume */}
                {c.resume_url && (
                  <div>
                    <h3 className="text-sm font-bold text-[#3A1F1F] mb-2 flex items-center gap-2"><FileText className="h-4 w-4 text-[#FF2B2B]" /> Resume</h3>
                    <a href={c.resume_url} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF2B2B] text-white text-sm rounded-full hover:bg-[#e02525] transition-colors">
                      <Download className="h-4 w-4" /> Download Resume
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── Applicants Page ──────────────────────────────────────────────────────────

interface AppWithProfile extends Application {
  profile: Profile & { work_experience: WorkExperience[]; education: EduType[] };
  job: Job;
}

function getCandidateDisplayName(profile?: Profile | null) {
  if (!profile) return "Unknown Candidate";

  const firstName = profile.first_name?.trim() || "";
  const lastName = profile.last_name?.trim() || "";
  const splitName = `${firstName} ${lastName}`.trim();
  if (splitName) return splitName;

  const googleName = ((profile as any).full_name || (profile as any).name || "").trim();
  if (googleName) return googleName;

  const emailName = profile.email?.split("@")[0]?.replace(/[._-]+/g, " ").trim() || "";
  return emailName || "Unknown Candidate";
}

function getCandidateInitials(name: string, fallback = "UC") {
  return name
    .split(" ")
    .filter(Boolean)
    .map(part => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || fallback;
}

function getResumeUrl(applicant: Pick<Application, "resume_url"> & { profile?: Pick<Profile, "resume_url"> | null }): string | null {
  return applicant.profile?.resume_url || applicant.resume_url || null;
}

function ApplicantsPage() {
  const { recruiterProfile } = useAuth();
  const location = useLocation();
  const [applicants, setApplicants] = useState<AppWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(() => {
    const queryStatus = new URLSearchParams(window.location.search).get("status");
    return queryStatus || "All";
  });
  const [jobFilter, setJobFilter] = useState(() => {
    const queryJob = new URLSearchParams(window.location.search).get("job");
    return queryJob || "All";
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [expandedCareer, setExpandedCareer] = useState<string | null>(null);
  const [profileModal, setProfileModal] = useState<AppWithProfile | null>(null);

  // Naukri-style advanced filters
  const [expMin, setExpMin] = useState("");
  const [expMax, setExpMax] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [salaryFilter, setSalaryFilter] = useState("");
  const [noticePeriodFilter, setNoticePeriodFilter] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [skillDropdownOpen, setSkillDropdownOpen] = useState(false);
  const skillFilterRef = useRef<HTMLDivElement>(null);
  const [interviewModalApplicant, setInterviewModalApplicant] = useState<AppWithProfile | null>(null);
  const [feedbackModalApplicant, setFeedbackModalApplicant] = useState<AppWithProfile | null>(null);
  const [offerModalApplicant, setOfferModalApplicant] = useState<AppWithProfile | null>(null);
  const [isSendingInterviewDetails, setIsSendingInterviewDetails] = useState(false);
  const [isSendingInterviewFeedback, setIsSendingInterviewFeedback] = useState(false);
  const [isSendingOfferDetails, setIsSendingOfferDetails] = useState(false);
  const [feedbackInitialRound, setFeedbackInitialRound] = useState<"L1" | "L2" | "L3" | "HR Round">("L1");
  const [statusUpdateInFlight, setStatusUpdateInFlight] = useState<Set<string>>(new Set());
  const [optimisticStatusByApplicant, setOptimisticStatusByApplicant] = useState<Record<string, Application["status"]>>({});
  const [resumePreview, setResumePreview] = useState<{ url: string; candidateName: string } | null>(null);

  const getEffectiveApplicationStatus = useCallback(
    (applicant: AppWithProfile) => optimisticStatusByApplicant[applicant.id] ?? applicant.status,
    [optimisticStatusByApplicant]
  );

  const getEffectiveApplicationStage = useCallback(
    (applicant: AppWithProfile) => mapApplicationStatusToPipelineStage(getEffectiveApplicationStatus(applicant)),
    [getEffectiveApplicationStatus]
  );

  const fetchApplicants = useCallback(async () => {
    if (!recruiterProfile?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("applications")
      .select("*, profile:profiles(*, work_experience(*), education(*)), job:jobs(title,id)")
      .eq("recruiter_id", recruiterProfile.id)
      .order("applied_at", { ascending: false });
    if (data) setApplicants(data as AppWithProfile[]);
    setLoading(false);
  }, [recruiterProfile?.id]);

  useEffect(() => { fetchApplicants(); }, [fetchApplicants]);

  useEffect(() => {
    if (!recruiterProfile?.id) return;
    const channel = supabase.channel("applicants-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "applications" }, () => fetchApplicants())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "applications" }, () => fetchApplicants())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [recruiterProfile?.id, fetchApplicants]);

  const statuses = ["All", ...PIPELINE_STAGES];
  const jobTitles = ["All", ...Array.from(new Set(applicants.map(a => a.job?.title).filter(Boolean)))];

  const filteredFilterSkillOptions = useMemo(() => {
    const query = skillFilter.trim().toLowerCase();
    const options = query ? SEARCH_SUGGESTION_DATASET : SKILL_OPTIONS;
    return options.filter(skill => !query || skill.toLowerCase().includes(query)).slice(0, 50);
  }, [skillFilter]);

  useEffect(() => {
    const queryStatus = new URLSearchParams(location.search).get("status") || "All";
    if (statuses.includes(queryStatus)) setStatusFilter(queryStatus);
  }, [location.search]);

  useEffect(() => {
    const queryJob = new URLSearchParams(location.search).get("job") || "All";
    setJobFilter(queryJob);
  }, [location.search]);

  useEffect(() => {
    if (!skillDropdownOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!skillFilterRef.current?.contains(event.target as Node)) {
        setSkillDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [skillDropdownOpen]);

  const parseExpYears = (exp: string | null) => {
    if (!exp) return 0;
    const m = exp.match(/(\d+)/);
    return m ? parseInt(m[1]) : 0;
  };

  const parseSalaryNum = (sal: string | null) => {
    if (!sal) return 0;
    const m = sal.match(/(\d+)/);
    return m ? parseInt(m[1]) : 0;
  };

  const activeFilterCount = [expMin, expMax, locationFilter, salaryFilter, noticePeriodFilter, skillFilter].filter(Boolean).length;

  const filtered = applicants
    .filter(a => statusFilter === "All" || getEffectiveApplicationStage(a) === statusFilter)
    .filter(a => jobFilter === "All" || a.job?.title === jobFilter)
    .filter(a => {
      if (!searchTerm) return true;
      const p = a.profile;
      const name = getCandidateDisplayName(p).toLowerCase();
      const skills = (p?.skills || []).join(" ").toLowerCase();
      return name.includes(searchTerm.toLowerCase()) || skills.includes(searchTerm.toLowerCase());
    })
    .filter(a => {
      const p = a.profile;
      const exp = parseExpYears(p?.total_experience ?? null);
      if (expMin && exp < parseInt(expMin)) return false;
      if (expMax && exp > parseInt(expMax)) return false;
      return true;
    })
    .filter(a => {
      if (!locationFilter) return true;
      return (a.profile?.location || "").toLowerCase().includes(locationFilter.toLowerCase());
    })
    .filter(a => {
      if (!salaryFilter) return true;
      const expected = parseSalaryNum(a.profile?.expected_salary ?? null);
      return expected <= parseInt(salaryFilter);
    })
    .filter(a => {
      if (!noticePeriodFilter) return true;
      const np = (a.profile?.notice_period || "").toLowerCase();
      if (noticePeriodFilter === "immediate") return np.includes("immediate") || np.includes("0");
      if (noticePeriodFilter === "15") return parseInt(np) <= 15;
      if (noticePeriodFilter === "30") return parseInt(np) <= 30;
      if (noticePeriodFilter === "60") return parseInt(np) <= 60;
      return true;
    })
    .filter(a => {
      if (!skillFilter) return true;
      const skills = a.profile?.skills || [];
      return skills.some((s: string) => skillsMatch(s, skillFilter));
    });

  const sortedApplicants = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortBy === "match") {
        const scoreA = Math.floor(70 + (a.id.charCodeAt(0) % 25));
        const scoreB = Math.floor(70 + (b.id.charCodeAt(0) % 25));
        return scoreB - scoreA;
      }
      return new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime();
    });
  }, [filtered, sortBy]);

  const updateStatus = async (id: string, newStatus: Application["status"]) => {
    const statusWriteAttempts: Record<Application["status"], string[]> = {
      Applied: ["Applied", "New", "applied"],
      New: ["Applied", "New", "applied"],
      "Under Review": ["Under Review", "Reviewed", "Screening"],
      Screening: ["Under Review", "Reviewed", "Screening"],
      Reviewed: ["Under Review", "Reviewed", "Screening"],
      Shortlisted: ["Shortlisted", "shortlisted"],
      "Interview Scheduled": ["Interview Scheduled", "interview_scheduled"],
      "Interview Completed": ["Interview Completed"],
      "Interview Selected": ["Interview Selected"],
      "Interview Rejected": ["Interview Rejected"],
      Offered: ["Offered", "offered"],
      Joined: ["Joined", "Hired", "hired"],
      Hired: ["Joined", "Hired", "hired"],
      Rejected: ["Rejected", "rejected"],
      "On Hold": ["On Hold"],
    };

    const attempts = statusWriteAttempts[newStatus] || [newStatus];
    let lastError: { message?: string } | null = null;

    for (const candidateStatus of attempts) {
      const { error } = await supabase
        .from("applications")
        .update({ status: candidateStatus as Application["status"] })
        .eq("id", id);

      if (!error) {
        const resolved = candidateStatus as Application["status"];
        setApplicants(prev => prev.map(a => a.id === id ? { ...a, status: resolved } : a));
        return resolved;
      }
      lastError = error;
    }

    console.error(`Failed to update application status for ${id} to ${newStatus}:`, lastError?.message || "Unknown error");
    return false;
  };

  const openProfileAndMoveToScreening = async (applicant: AppWithProfile) => {
    setProfileModal(prev => {
      if (prev?.id === applicant.id) {
        return { ...prev };
      }
      return { ...applicant };
    });
    if (applicant.profile_id) {
      void supabase.rpc("increment_profile_views", { target_profile_id: applicant.profile_id }).then(({ error }) => {
        if (error) console.warn("Failed to increment profile views (migration might not be run):", error.message);
      });
    }
  };

  const handleInterviewStatusRequest = (applicant: AppWithProfile) => {
    setInterviewModalApplicant(applicant);
  };

  const handleOfferStatusRequest = (applicant: AppWithProfile) => {
    setOfferModalApplicant(applicant);
  };

  const resolveLatestRoundForApplication = async (applicationId: string): Promise<"L1" | "L2" | "L3" | "HR Round"> => {
    const { data } = await supabase
      .from("interview_details")
      .select("interview_message, updated_at")
      .eq("application_id", applicationId)
      .order("updated_at", { ascending: false })
      .limit(1);

    const message = data?.[0]?.interview_message || "";
    const match = message.match(/^round:\s*(.+)$/im)?.[1]?.trim().toUpperCase();
    if (match === "L2") return "L2";
    if (match === "L3") return "L3";
    if (match === "HR ROUND") return "HR Round";
    return "L1";
  };

  const handleInterviewFeedbackRequest = async (applicant: AppWithProfile) => {
    const initialRound = await resolveLatestRoundForApplication(applicant.id);
    setFeedbackInitialRound(initialRound);
    setFeedbackModalApplicant(applicant);
  };

  const quickUpdateStatus = async (applicantId: string, nextStatus: Application["status"]) => {
    if (statusUpdateInFlight.has(applicantId)) return;

    const currentStatus = applicants.find(a => a.id === applicantId)?.status;
    if (currentStatus && mapApplicationStatusToPipelineStage(currentStatus) === "Joined" && nextStatus === "Joined") {
      return;
    }

    setOptimisticStatusByApplicant(prev => ({ ...prev, [applicantId]: nextStatus }));
    setStatusUpdateInFlight(prev => new Set(prev).add(applicantId));
    let updated: Application["status"] | false = false;

    try {
      // Hire should behave exactly like other actions: one direct status update only.
      updated = await updateStatus(applicantId, nextStatus);

      if (updated) {
        const resolvedStatus = updated;
        setProfileModal(prev => prev && prev.id === applicantId ? { ...prev, status: resolvedStatus } : prev);
      } else {
        // Fallback for development/testing: update local state even if DB rejects the new status due to unmigrated constraints
        console.warn(`Database update failed. Applying fallback state update for status "${nextStatus}" (local testing only).`);
        setApplicants(prev => prev.map(a => a.id === applicantId ? { ...a, status: nextStatus } : a));
        setProfileModal(prev => prev && prev.id === applicantId ? { ...prev, status: nextStatus } : prev);
      }
    } finally {
      setOptimisticStatusByApplicant(prev => {
        const { [applicantId]: _removed, ...rest } = prev;
        return rest;
      });
      setStatusUpdateInFlight(prev => {
        const next = new Set(prev);
        next.delete(applicantId);
        return next;
      });
    }
  };

  const handleStatusDropdownSelect = async (applicant: AppWithProfile, nextStage: PipelineStage) => {
    const currentStage = getEffectiveApplicationStage(applicant);
    if (nextStage === currentStage) return;
    if (!STATUS_TRANSITIONS[currentStage].includes(nextStage)) return;

    if (nextStage === "Interview Scheduled") {
      handleInterviewStatusRequest(applicant);
      return;
    }
    if (nextStage === "Offered") {
      handleOfferStatusRequest(applicant);
      return;
    }
    await quickUpdateStatus(applicant.id, nextStage);
  };

  const sendInterviewDetails = async (message: string, meetingUrl: string, round: "L1" | "L2" | "L3" | "HR Round") => {
    if (!interviewModalApplicant) return;
    if (!recruiterProfile?.id) return;
    setIsSendingInterviewDetails(true);

    const targetApplicant = interviewModalApplicant;
    const companyName = recruiterProfile?.company_name || "Recruiter Team";
    const nowIso = new Date().toISOString();
    const normalizedMeetingUrl = meetingUrl.trim();
    const formattedInterviewMessage = [`Round: ${round}`, `Meeting URL: ${normalizedMeetingUrl}`, "", message].join("\n");

    const statusUpdatePromise = supabase
      .from("applications")
      .update({ status: "Interview Scheduled" })
      .eq("id", targetApplicant.id);

    const interviewDetailsPromise = supabase
      .from("interview_details")
      .upsert(
        {
          application_id: targetApplicant.id,
          recruiter_id: recruiterProfile.id,
          candidate_id: targetApplicant.profile_id,
          interview_message: formattedInterviewMessage,
          meeting_url: normalizedMeetingUrl,
          status: "Interview Scheduled",
        },
        { onConflict: "application_id" },
      );

    const notificationPromise = supabase
      .from("notifications")
      .insert({
        user_id: targetApplicant.profile_id,
        user_type: "jobseeker",
        title: `Interview Details from ${companyName}`,
        message: [
          `Status: Interview Scheduled`,
          `Round: ${round}`,
          `Company: ${companyName}`,
          `Updated: ${new Date(nowIso).toLocaleString()}`,
          `Meeting URL: ${normalizedMeetingUrl}`,
          "",
          message,
        ].join("\n"),
        type: "status_change",
        is_read: false,
        related_id: targetApplicant.id,
      });

    const [{ error: statusError }, { error: interviewDetailsError }, { error: notificationError }] = await Promise.all([
      statusUpdatePromise,
      interviewDetailsPromise,
      notificationPromise,
    ]);

    setIsSendingInterviewDetails(false);

    if (statusError) {
      console.error("Failed to update interview status:", statusError.message);
      return;
    }

    if (interviewDetailsError) {
      console.error("Failed to save interview details:", interviewDetailsError.message);
      return;
    }

    if (notificationError) {
      console.error("Failed to send interview details notification:", notificationError.message);
    }

    setApplicants(prev => prev.map(a => a.id === targetApplicant.id ? { ...a, status: "Interview Scheduled" } : a));
    setProfileModal(prev => prev && prev.id === targetApplicant.id ? { ...prev, status: "Interview Scheduled" } : prev);
    setInterviewModalApplicant(null);
  };

  const sendOfferDetails = async (message: string, offerLetterFile: File) => {
    if (!offerModalApplicant) return;
    if (!recruiterProfile?.id) return;
    setIsSendingOfferDetails(true);

    const targetApplicant = offerModalApplicant;
    const companyName = recruiterProfile?.company_name || "Recruiter Team";
    const nowIso = new Date().toISOString();
    const safeFileName = `${Date.now()}-${offerLetterFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const filePath = `${targetApplicant.profile_id}/${targetApplicant.id}/${safeFileName}`;

    let offerLetterUrl: string | null = null;
    const uploadResult = await supabase.storage
      .from("offer-letters")
      .upload(filePath, offerLetterFile, { upsert: true });

    if (uploadResult.error) {
      console.error("Failed to upload offer letter:", uploadResult.error.message);
      setIsSendingOfferDetails(false);
      window.alert(`Offer letter upload failed: ${uploadResult.error.message}`);
      return;
    }

    const { data } = supabase.storage.from("offer-letters").getPublicUrl(filePath);
    offerLetterUrl = data.publicUrl || null;

    const statusUpdatePromise = supabase
      .from("applications")
      .update({ status: "Offered" })
      .eq("id", targetApplicant.id);

    const notificationPromise = supabase
      .from("notifications")
      .insert({
        user_id: targetApplicant.profile_id,
        user_type: "jobseeker",
        title: `Offer Letter from ${companyName}`,
        message: [
          "Status: Offered",
          `Company: ${companyName}`,
          `Updated: ${new Date(nowIso).toLocaleString()}`,
          `Offer Letter: ${offerLetterFile.name}`,
          `Offer Letter URL: ${offerLetterUrl || "N/A"}`,
          `Offer Letter Path: ${filePath}`,
          "",
          message,
        ].join("\n"),
        type: "status_change",
        is_read: false,
        related_id: targetApplicant.id,
      });

    const [{ error: statusError }, { error: notificationError }] = await Promise.all([
      statusUpdatePromise,
      notificationPromise,
    ]);

    setIsSendingOfferDetails(false);

    if (statusError) {
      console.error("Failed to update offer status:", statusError.message);
      return;
    }

    if (notificationError) {
      console.error("Failed to send offer notification:", notificationError.message);
    }

    setApplicants(prev => prev.map(a => a.id === targetApplicant.id ? { ...a, status: "Offered" } : a));
    setProfileModal(prev => prev && prev.id === targetApplicant.id ? { ...prev, status: "Offered" } : prev);
    setOfferModalApplicant(null);
  };

  const sendInterviewFeedback = async (
    round: "L1" | "L2" | "L3" | "HR Round",
    feedback: string,
    nextRoundDiscussion: string,
  ) => {
    if (!feedbackModalApplicant) return;
    if (!recruiterProfile?.id) return;
    setIsSendingInterviewFeedback(true);

    const targetApplicant = feedbackModalApplicant;
    const companyName = recruiterProfile.company_name || "Recruiter Team";
    const nowIso = new Date().toISOString();
    const feedbackMessageBody = [
      "Interview Feedback:",
      feedback,
      "",
      "Next Round Discussion:",
      nextRoundDiscussion || "N/A",
    ].join("\n");

    const { error } = await supabase.from("notifications").insert({
      user_id: targetApplicant.profile_id,
      user_type: "jobseeker",
      title: `Interview Feedback from ${companyName}`,
      message: [
        "Status: Interview Scheduled",
        `Round: ${round}`,
        `Company: ${companyName}`,
        `Updated: ${new Date(nowIso).toLocaleString()}`,
        "",
        feedbackMessageBody,
      ].join("\n"),
      type: "status_change",
      is_read: false,
      related_id: targetApplicant.id,
    });

    setIsSendingInterviewFeedback(false);

    if (error) {
      console.error("Failed to send interview feedback:", error.message);
      return;
    }

    setFeedbackModalApplicant(null);
  };

  const moveToOptions = (currentStage: PipelineStage): PipelineStage[] => {
    return [currentStage, ...STATUS_TRANSITIONS[currentStage]];
  };

  const renderStageActions = (applicant: AppWithProfile) => {
    const stage = getEffectiveApplicationStage(applicant);
    const resumeUrl = getResumeUrl(applicant);
    const candidateName = getCandidateDisplayName(applicant.profile);
    const isUpdating = statusUpdateInFlight.has(applicant.id);
    const isLockedAfterHire = stage === "Joined";
    const disableActions = isUpdating;
    const isInterviewActive = stage === "Interview Scheduled";
    const isInterviewCompleteActive = stage === "Interview Completed";
    const isInterviewSelectActive = stage === "Interview Selected";
    const isInterviewRejectActive = stage === "Interview Rejected";
    const isShortlistActive = stage === "Shortlisted";
    const isOfferActive = stage === "Offered";
    const isRejectActive = stage === "Rejected";
    const isHireActive = stage === "Joined";
    const isOnHoldActive = stage === "On Hold";
    const fadedAfterHire = isLockedAfterHire ? "opacity-40" : "";
    const disabledOpacityClass = "disabled:opacity-40";
    const shortlistDisabledClass = isShortlistActive ? "disabled:opacity-100" : "disabled:opacity-40";
    const interviewDisabledClass = isInterviewActive ? "disabled:opacity-100" : "disabled:opacity-40";
    const interviewCompleteDisabledClass = isInterviewCompleteActive ? "disabled:opacity-100" : "disabled:opacity-40";
    const interviewSelectDisabledClass = isInterviewSelectActive ? "disabled:opacity-100" : "disabled:opacity-40";
    const interviewRejectDisabledClass = isInterviewRejectActive ? "disabled:opacity-100" : "disabled:opacity-40";
    const offerDisabledClass = isOfferActive ? "disabled:opacity-100" : "disabled:opacity-40";
    const hireDisabledClass = isHireActive ? "disabled:opacity-100" : "disabled:opacity-40";
    const rejectDisabledClass = isRejectActive ? "disabled:opacity-100" : "disabled:opacity-40";
    const onHoldDisabledClass = isOnHoldActive ? "disabled:opacity-100" : "disabled:opacity-40";
    const openMail = () => { if (applicant.profile?.email) window.location.href = `mailto:${applicant.profile.email}`; };
    const viewBtn = (
      <Button size="sm" variant="outline" className="border-2 border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-full text-xs h-7" asChild>
        <a href={`/recruiter/dashboard/applicants/${applicant.id}/profile`} target="_blank" rel="noopener noreferrer">
          <User className="h-3 w-3 mr-1" /> View Profile
        </a>
      </Button>
    );
    const messageBtn = (
      <Button size="sm" variant="outline" className="border-2 border-gray-400 bg-gray-50 text-[#3A1F1F] hover:bg-gray-100 rounded-full text-xs h-7" onClick={openMail}>
        <Mail className="h-3.5 w-3.5 mr-1" /> Message
      </Button>
    );
    const canShortlist = stage === "Under Review" || stage === "Shortlisted";
    const canInterview = stage === "Shortlisted" || stage === "Interview Scheduled";
    const canInterviewComplete = stage === "Interview Scheduled" || stage === "Interview Completed";
    const canInterviewSelect = stage === "Interview Completed" || stage === "Interview Selected";
    const canInterviewReject = stage === "Interview Completed" || stage === "Interview Selected" || stage === "Interview Rejected";
    const canOffer = stage === "Interview Selected" || stage === "Offered";
    const canHire = stage === "Offered" || stage === "Joined";
    const canReject = stage === "Offered" || stage === "Interview Selected" || stage === "Rejected";
    const canOnHold = stage !== "Joined" && stage !== "Rejected" && stage !== "On Hold";

    return (
      <div className="flex flex-wrap gap-2 justify-end">
        {viewBtn}
        {messageBtn}
        <Button size="sm" variant="outline" disabled={disableActions || !canShortlist} className={`${isShortlistActive ? "border-2 border-pink-600 bg-pink-50 text-pink-700" : "border-pink-500 text-pink-600 hover:bg-pink-50 opacity-40"} rounded-full text-xs h-7 ${shortlistDisabledClass} ${fadedAfterHire}`} onClick={() => void quickUpdateStatus(applicant.id, "Shortlisted")}><ThumbsUp className="h-3.5 w-3.5 mr-1" /> Shortlist</Button>
        <Button size="sm" variant="outline" disabled={disableActions || !canInterview} className={`${isInterviewActive ? "border-2 border-purple-600 bg-purple-50 text-purple-700" : "border-purple-400 text-purple-600 hover:bg-purple-50 opacity-40"} rounded-full text-xs h-7 ${interviewDisabledClass} ${fadedAfterHire}`} onClick={() => handleInterviewStatusRequest(applicant)}><Video className="h-3.5 w-3.5 mr-1" /> {stage === "Interview Scheduled" ? "Schedule Next Round" : "Interview"}</Button>
        {(stage === "Interview Scheduled" || stage === "Interview Completed") && (
          <Button size="sm" variant="outline" disabled={disableActions} className={`border-purple-300 text-purple-700 hover:bg-purple-50 rounded-full text-xs h-7 ${disabledOpacityClass} ${fadedAfterHire}`} onClick={() => void handleInterviewFeedbackRequest(applicant)}>
            Add Feedback
          </Button>
        )}
        <Button size="sm" variant="outline" disabled={disableActions || !canInterviewComplete} className={`${isInterviewCompleteActive ? "border-2 border-indigo-600 bg-indigo-50 text-indigo-700" : "border-indigo-400 text-indigo-600 hover:bg-indigo-50 opacity-40"} rounded-full text-xs h-7 ${interviewCompleteDisabledClass} ${fadedAfterHire}`} onClick={() => void quickUpdateStatus(applicant.id, "Interview Completed")}>Interview Complete</Button>
        <Button size="sm" variant="outline" disabled={disableActions || !canInterviewSelect} className={`${isInterviewSelectActive ? "border-2 border-teal-600 bg-teal-50 text-teal-700" : "border-teal-400 text-teal-600 hover:bg-teal-50 opacity-40"} rounded-full text-xs h-7 ${interviewSelectDisabledClass} ${fadedAfterHire}`} onClick={() => void quickUpdateStatus(applicant.id, "Interview Selected")}>Interview Select</Button>
        <Button size="sm" variant="outline" disabled={disableActions || !canInterviewReject} className={`${isInterviewRejectActive ? "border-2 border-red-600 bg-red-50 text-red-700" : "border-red-400 text-red-600 hover:bg-red-50 opacity-40"} rounded-full text-xs h-7 ${interviewRejectDisabledClass} ${fadedAfterHire}`} onClick={() => void quickUpdateStatus(applicant.id, "Interview Rejected")}>Interview Reject</Button>
        <Button size="sm" variant="outline" disabled={disableActions || !canOffer} className={`${isOfferActive ? "border-2 border-orange-600 bg-orange-50 text-orange-700" : "border-orange-400 text-orange-700 hover:bg-orange-50 opacity-40"} rounded-full text-xs h-7 ${offerDisabledClass} ${fadedAfterHire}`} onClick={() => handleOfferStatusRequest(applicant)}><Award className="h-3.5 w-3.5 mr-1" /> Offer</Button>
        {isHireActive ? (
          <Button size="sm" variant="outline" disabled className="border-emerald-500 text-emerald-700 bg-emerald-100 ring-1 ring-emerald-300 rounded-full text-xs h-7 disabled:opacity-100"><Check className="h-3.5 w-3.5 mr-1" /> Joined</Button>
        ) : (
          <Button size="sm" variant="outline" disabled={disableActions || !canHire} className={`${isHireActive ? "border-2 border-emerald-600 bg-emerald-50 text-emerald-700" : "border-emerald-500 text-emerald-600 hover:bg-emerald-50 opacity-40"} rounded-full text-xs h-7 ${hireDisabledClass}`} onClick={() => void quickUpdateStatus(applicant.id, "Joined")}>Hire</Button>
        )}
        <Button size="sm" variant="outline" disabled={disableActions || !canReject} className={`${isRejectActive ? "border-2 border-red-600 bg-red-50 text-red-700" : "border-red-400 text-red-500 hover:bg-red-50 opacity-40"} rounded-full text-xs h-7 ${rejectDisabledClass} ${fadedAfterHire}`} onClick={() => void quickUpdateStatus(applicant.id, "Rejected")}><ThumbsDown className="h-3.5 w-3.5 mr-1" /> Reject</Button>
        <Button size="sm" variant="outline" disabled={disableActions || !canOnHold} className={`${isOnHoldActive ? "border-2 border-amber-600 bg-amber-50 text-amber-700" : "border-amber-400 text-amber-600 hover:bg-amber-50 opacity-40"} rounded-full text-xs h-7 ${onHoldDisabledClass} ${fadedAfterHire}`} onClick={() => void quickUpdateStatus(applicant.id, "On Hold")}>On Hold</Button>
        {(stage === "Rejected" || stage === "On Hold" || stage === "Interview Rejected") && <Button size="sm" variant="outline" disabled={disableActions} className={`border-[#8B5E3C] text-[#8B5E3C] hover:bg-[#F5EEE8] rounded-full text-xs h-7 ${disabledOpacityClass} ${fadedAfterHire}`} onClick={() => void quickUpdateStatus(applicant.id, "Under Review")}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Restore Candidate</Button>}
      </div>
    );
  };

  const statusCounts = statuses.slice(1).reduce((acc, s) => ({
    ...acc,
    [s]: applicants.filter(a => mapApplicationStatusToPipelineStage(a.status) === s).length
  }), {} as Record<string, number>);

  const exportCSV = () => {
    const rows = [
      ["Name", "Email", "Phone", "Job", "Status", "Applied At", "Experience", "Skills"],
      ...sortedApplicants.map(a => {
        const p = a.profile;
        const name = getCandidateDisplayName(p);
        return [
          name,
          p?.email || "",
          p?.phone || "",
          a.job?.title || "",
          a.status,
          new Date(a.applied_at).toLocaleDateString(),
          p?.total_experience || "",
          (p?.skills || []).join("; "),
        ];
      }),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "applicants.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-[#3A1F1F]">Applicants</h1>
        <Button variant="outline" className="border-gray-200 rounded-full text-sm" onClick={exportCSV}>
          <Download className="h-4 w-4 mr-1.5" /> Export CSV
        </Button>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {statuses.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap border transition-colors ${statusFilter === s ? "bg-[#FF2B2B] text-white border-[#FF2B2B]" : "bg-white border-gray-200 text-[#5A5A5A] hover:border-[#FF2B2B]"}`}>
            {s}
            {s !== "All" && statusCounts[s] > 0 && (
              <span className={`ml-1.5 text-xs rounded-full px-1.5 py-0.5 ${statusFilter === s ? "bg-white/30" : "bg-gray-100"}`}>{statusCounts[s]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Search + Filter row */}
      <div className="flex gap-3 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A8A8A]" />
          <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 bg-white border-gray-200 rounded-xl" placeholder="Search by name or skill..." />
        </div>
        <Select value={jobFilter} onValueChange={setJobFilter}>
          <SelectTrigger className="w-52 bg-white border-gray-200 rounded-xl"><SelectValue placeholder="Filter by job" /></SelectTrigger>
          <SelectContent>{jobTitles.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-40 bg-white border-gray-200 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="match">Match Score</SelectItem>
          </SelectContent>
        </Select>
        <button onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${showFilters || activeFilterCount > 0 ? "bg-[#FF2B2B] text-white border-[#FF2B2B]" : "bg-white border-gray-200 text-[#5A5A5A] hover:border-[#FF2B2B]"}`}>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" /></svg>
          Filters {activeFilterCount > 0 && <span className={`text-xs rounded-full px-1.5 py-0.5 font-bold ${showFilters || activeFilterCount > 0 ? "bg-white text-[#FF2B2B]" : "bg-[#FF2B2B] text-white"}`}>{activeFilterCount}</span>}
        </button>
      </div>

      {/* Naukri-style Advanced Filters Panel */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#3A1F1F] text-sm">Advanced Filters</h3>
            {activeFilterCount > 0 && (
              <button onClick={() => { setExpMin(""); setExpMax(""); setLocationFilter(""); setSalaryFilter(""); setNoticePeriodFilter(""); setSkillFilter(""); }}
                className="text-xs text-[#FF2B2B] hover:underline">Clear all filters</button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#5A5A5A] mb-1.5">Experience (Min yrs)</label>
              <Select value={expMin || "any"} onValueChange={v => setExpMin(v === "any" ? "" : v)}>
                <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-xl text-sm h-9"><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {[0,1,2,3,4,5,6,7,8,10,12,15].map(y => <SelectItem key={y} value={String(y)}>{y} yr{y !== 1 ? "s" : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5A5A5A] mb-1.5">Experience (Max yrs)</label>
              <Select value={expMax || "any"} onValueChange={v => setExpMax(v === "any" ? "" : v)}>
                <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-xl text-sm h-9"><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {[1,2,3,4,5,6,7,8,10,12,15,20].map(y => <SelectItem key={y} value={String(y)}>{y} yr{y !== 1 ? "s" : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5A5A5A] mb-1.5">Location</label>
              <LocationAutocomplete
                value={locationFilter}
                onChange={setLocationFilter}
                placeholder="Enter location"
                inputClassName="text-sm h-9"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5A5A5A] mb-1.5">Exp. Salary (up to)</label>
              <Select value={salaryFilter || "any"} onValueChange={v => setSalaryFilter(v === "any" ? "" : v)}>
                <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-xl text-sm h-9"><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {[10,15,20,25,30,40,50].map(v => <SelectItem key={v} value={String(v)}>{v} LPA</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5A5A5A] mb-1.5">Notice Period</label>
              <Select value={noticePeriodFilter || "any"} onValueChange={v => setNoticePeriodFilter(v === "any" ? "" : v)}>
                <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-xl text-sm h-9"><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="15">≤ 15 days</SelectItem>
                  <SelectItem value="30">≤ 30 days</SelectItem>
                  <SelectItem value="60">≤ 60 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="relative" ref={skillFilterRef}>
              <label className="block text-xs font-medium text-[#5A5A5A] mb-1.5">Skill</label>
              <div className="relative">
                <Input
                  value={skillFilter}
                  onChange={e => {
                    setSkillFilter(e.target.value);
                    setSkillDropdownOpen(true);
                  }}
                  onFocus={() => setSkillDropdownOpen(true)}
                  className="bg-[#F6F6F6] border-gray-200 rounded-xl text-sm h-9 pr-8"
                  placeholder="Enter skill"
                />
                <button
                  type="button"
                  onClick={() => setSkillDropdownOpen(open => !open)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A8A8A] hover:text-[#3A1F1F]"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
              {skillDropdownOpen && (
                <div className="absolute left-0 right-0 top-full z-[100] mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                  <div className="max-h-48 overflow-y-auto p-1">
                    {filteredFilterSkillOptions.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-[#8A8A8A]">No matching skills</div>
                    ) : (
                      filteredFilterSkillOptions.map((skill) => (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => {
                            setSkillFilter(skill);
                            setSkillDropdownOpen(false);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs text-[#3A1F1F] hover:bg-[#FFF0F0]"
                        >
                          <Check className={`h-3.5 w-3.5 ${skillFilter.toLowerCase() === skill.toLowerCase() ? "text-[#FF2B2B] opacity-100" : "opacity-0"}`} />
                          <span>{skill}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <p className="text-sm text-[#8A8A8A] mb-4">{filtered.length} applicant{filtered.length !== 1 ? "s" : ""}</p>

      {loading ? (
        <div className="text-center py-12 text-[#8A8A8A]">Loading applicants...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
          <Users className="h-12 w-12 text-gray-200 mx-auto mb-4" />
          <p className="text-[#8A8A8A] text-lg">No applicants match your filters.</p>
        </div>
      ) : (
      <div className="space-y-3">
        {sortedApplicants.map(applicant => {
          const p = applicant.profile;
          const name = getCandidateDisplayName(p);
          const initials = getCandidateInitials(name);
          const skills = p?.skills || [];
          const workExp = p?.work_experience || [];
          const edu = p?.education || [];
          const matchScore = Math.floor(70 + (applicant.id.charCodeAt(0) % 25));
          return (
          <div key={applicant.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-14 h-14 rounded-2xl flex-shrink-0 overflow-hidden bg-[#FF2B2B] flex items-center justify-center text-white font-bold text-lg">
                  {p?.avatar_url
                    ? <img src={p.avatar_url} alt={name} className="w-full h-full object-cover" />
                    : initials}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Name + Match */}
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="text-base font-semibold text-[#3A1F1F]">{name}</h3>
                      <p className="text-sm text-[#5A5A5A] mt-0.5">{p?.current_title}{p?.current_company ? <span> at <span className="text-[#FF2B2B] font-medium">{p.current_company}</span></span> : ""}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-center bg-green-50 border border-green-100 rounded-xl px-3 py-1">
                        <div className="text-base font-bold text-green-600">{matchScore}%</div>
                        <div className="text-xs text-[#8A8A8A]">Match</div>
                      </div>
                    </div>
                  </div>

                  {/* Applied for + Date */}
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-[#8A8A8A]">
                    <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>Applied for <span className="text-[#3A1F1F] font-medium">{applicant.job?.title || "—"}</span></span>
                    <span>·</span>
                    <span>{new Date(applicant.applied_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </div>

                  {/* Location · Expected Salary · Notice */}
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-[#5A5A5A] flex-wrap">
                    {p?.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-[#8A8A8A]" />{p.location}</span>}
                    {p?.expected_salary && <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3 text-[#8A8A8A]" />Exp: <span className="font-medium text-[#3A1F1F]">{p.expected_salary}</span></span>}
                    {p?.notice_period && <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-[#8A8A8A]" />Notice: <span className="font-medium text-[#3A1F1F]">{p.notice_period}</span></span>}
                    {p?.total_experience && <span className="flex items-center gap-1"><Briefcase className="h-3 w-3 text-[#8A8A8A]" />{p.total_experience}</span>}
                  </div>

                  {/* Skills */}
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {skills.slice(0, 5).map((skill: string, i: number) => (
                      <Badge key={i} className="bg-[#ECECF4] text-[#3A1F1F] text-xs">{skill}</Badge>
                    ))}
                    {skills.length > 5 && <Badge className="bg-gray-100 text-[#8A8A8A] text-xs">+{skills.length - 5} more</Badge>}
                  </div>

                  {/* Summary */}
                  {p?.about && (
                    <p className="mt-2.5 text-xs text-[#5A5A5A] leading-relaxed line-clamp-2">{p.about}</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 flex-wrap gap-2.5">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge className={`text-xs ${statusColor(getEffectiveApplicationStatus(applicant))}`}>{getEffectiveApplicationStage(applicant)}</Badge>
                  <Select
                    value={getEffectiveApplicationStage(applicant)}
                    onValueChange={(value) => {
                      void handleStatusDropdownSelect(applicant, value as PipelineStage);
                    }}
                  >
                    <SelectTrigger className="h-7 min-w-[140px] rounded-full border-gray-200 text-xs">
                      <span>Move to</span>
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {moveToOptions(getEffectiveApplicationStage(applicant)).map((stage) => (
                        <SelectItem key={stage} value={stage} className="text-xs">
                          {stage}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="ml-auto">
                  {renderStageActions(applicant)}
                </div>
              </div>
            </div>

            {/* Career Timeline — Naukri horizontal style with gap detection + tooltips */}
            {(workExp.length > 0 || edu.length > 0) && (() => {
              const parseDateToVal = (d: string | null | undefined): number | null => {
                if (!d) return null;
                const mn = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
                const parts = d.toLowerCase().split(/[\s\-\/]+/);
                let year = 0, month = 1;
                for (const p of parts) {
                  const n = parseInt(p);
                  if (!isNaN(n) && n > 1900) year = n;
                  else if (!isNaN(n) && n >= 1 && n <= 12) month = n;
                  else { const mi = mn.indexOf(p.slice(0,3)); if (mi >= 0) month = mi + 1; }
                }
                return year ? year * 12 + month : null;
              };
              const fmtLabel = (val: number, isCurrent = false) => {
                if (isCurrent) return "till date";
                const year = Math.floor(val / 12);
                const month = val % 12 || 12;
                const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][month - 1];
                return month === 1 ? `${year}` : `${m} '${String(year).slice(2)}`;
              };
              type TSpan = {startVal: number; endVal: number; type: 'work'|'edu'; tooltip: string};
              const spans: TSpan[] = [];
              const nowVal = new Date().getFullYear() * 12 + new Date().getMonth() + 1;
              edu.forEach(e => {
                const startYear = e.start_year ? Number(e.start_year) : null;
                const endYear = e.end_year ? Number(e.end_year) : null;
                const s = startYear ? startYear * 12 + 1 : null;
                const en = endYear ? endYear * 12 + 6 : null;
                if (s && en && en > s) spans.push({startVal: s, endVal: en, type: 'edu', tooltip: `Education: ${e.degree}${e.field ? " in " + e.field : ""} · ${e.institution}`});
              });
              workExp.forEach(exp => {
                const s = parseDateToVal(exp.start_date);
                const en = exp.is_current ? nowVal : parseDateToVal(exp.end_date);
                if (s && en && en > s) spans.push({startVal: s, endVal: en, type: 'work', tooltip: `${exp.title} at ${exp.company}`});
              });
              if (spans.length === 0) return null;
              // Collect all unique breakpoints
              const valSet = new Set<number>();
              spans.forEach(s => { valSet.add(s.startVal); valSet.add(s.endVal); });
              const sortedVals = Array.from(valSet).sort((a, b) => a - b);
              if (sortedVals.length < 2) return null;
              const minVal = sortedVals[0];
              const maxVal = sortedVals[sortedVals.length - 1];
              const range = maxVal - minVal || 1;
              const toPct = (v: number) => Math.max(0, Math.min(100, ((v - minVal) / range) * 100));
              // Build event points with tooltip info
              type TEvt = {val: number; pct: number; label: string; type: 'work'|'edu'; tooltips: string[]};
              const evtMap = new Map<number, TEvt>();
              sortedVals.forEach(v => {
                const isCurrent = v === nowVal && workExp.some(e => e.is_current);
                const associated = spans.filter(s => s.startVal === v || s.endVal === v);
                const type = associated.some(s => s.type === 'work') ? 'work' : 'edu';
                evtMap.set(v, {val: v, pct: toPct(v), label: fmtLabel(v, isCurrent), type, tooltips: associated.map(s => s.tooltip)});
              });
              const evts = Array.from(evtMap.values());
              // Segments: determine color per gap
              const segments = evts.slice(0, -1).map((ev, i) => {
                const next = evts[i + 1];
                const mid = (ev.val + next.val) / 2;
                const covering = spans.filter(s => s.startVal <= mid && s.endVal >= mid);
                const hasWork = covering.some(s => s.type === 'work');
                const hasEdu = covering.some(s => s.type === 'edu');
                let color = '#D1D5DB';
                if (hasWork && hasEdu) color = 'linear-gradient(to right,#60A5FA,#A78BFA)';
                else if (hasWork) color = '#A78BFA';
                else if (hasEdu) color = '#60A5FA';
                return {leftPct: ev.pct, widthPct: next.pct - ev.pct, color, isGap: !hasWork && !hasEdu};
              });
              return (
                <div className="border-t border-gray-100 px-5 pt-3 pb-3">
                  <div className="relative" style={{height: 56}}>
                    {/* Segments (colored + grey gaps) */}
                    {segments.map((seg, i) => (
                      <div key={i} className="absolute h-0.5" style={{left: `${seg.leftPct}%`, width: `${seg.widthPct}%`, top: 22, background: seg.color}} />
                    ))}
                    {/* Gap labels */}
                    {segments.filter(s => s.isGap).map((seg, i) => (
                      <div key={i} className="absolute flex flex-col items-center" style={{left: `${seg.leftPct + seg.widthPct / 2}%`, transform: 'translateX(-50%)', top: 15}}>
                        <span className="text-[8px] text-gray-400 bg-white px-1 rounded whitespace-nowrap border border-gray-200">gap</span>
                      </div>
                    ))}
                    {/* Event markers with hover tooltips */}
                    {evts.map((ev, i) => {
                      const Icon = ev.type === 'edu' ? GraduationCap : Briefcase;
                      const color = ev.type === 'edu' ? '#60A5FA' : '#A78BFA';
                      return (
                        <div key={i} className="absolute flex flex-col items-center group/tip cursor-default" style={{left: `${ev.pct}%`, transform: 'translateX(-50%)', top: 0, width: 44}}>
                          {/* Tooltip — appears above marker */}
                          <div className="absolute bottom-[calc(100%+4px)] left-1/2 -translate-x-1/2 hidden group-hover/tip:flex flex-col gap-0.5 bg-[#1C1C1C] text-white rounded-lg px-2.5 py-1.5 z-30 shadow-xl pointer-events-none min-w-max max-w-[220px]">
                            {ev.tooltips.map((t, ti) => (
                              <span key={ti} className="text-[10px] leading-snug">{t}</span>
                            ))}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1C1C1C]" />
                          </div>
                          <Icon style={{color, width: 13, height: 13, flexShrink: 0}} />
                          <div className="w-2.5 h-2.5 bg-white border-2 rotate-45 mt-0.5 flex-shrink-0" style={{borderColor: color}} />
                          <span className="text-[9px] text-[#8A8A8A] whitespace-nowrap mt-0.5 leading-tight text-center">{ev.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
          );
        })}
      </div>
      )}


      <InterviewDetailsModal
        open={Boolean(interviewModalApplicant)}
        onOpenChange={(open) => {
          if (!open && !isSendingInterviewDetails) {
            setInterviewModalApplicant(null);
          }
        }}
        onSubmit={sendInterviewDetails}
        submitting={isSendingInterviewDetails}
      />
      <OfferDetailsModal
        open={Boolean(offerModalApplicant)}
        onOpenChange={(open) => {
          if (!open && !isSendingOfferDetails) {
            setOfferModalApplicant(null);
          }
        }}
        onSubmit={sendOfferDetails}
        submitting={isSendingOfferDetails}
      />
      <InterviewFeedbackModal
        open={Boolean(feedbackModalApplicant)}
        onOpenChange={(open) => {
          if (!open && !isSendingInterviewFeedback) {
            setFeedbackModalApplicant(null);
          }
        }}
        onSubmit={sendInterviewFeedback}
        submitting={isSendingInterviewFeedback}
        initialRound={feedbackInitialRound}
      />
      <ResumePreviewDialog resume={resumePreview} onClose={() => setResumePreview(null)} />
    </div>
  );
}

// ─── Analytics Page ───────────────────────────────────────────────────────────

function AnalyticsPage() {
  const { recruiterProfile } = useAuth();
  const navigate = useNavigate();
  const activeTimerLastTickAtRef = useRef(Date.now());
  const [activeTimerNow, setActiveTimerNow] = useState(Date.now());
  const [reportLoading, setReportLoading] = useState(false);
  const [reportCopied, setReportCopied] = useState(false);
  const [reportUrl, setReportUrl] = useState("");
  const [reportError, setReportError] = useState("");
  const [totalJobsPosted, setTotalJobsPosted] = useState<number | null>(null);
  const [totalApplications, setTotalApplications] = useState<number | null>(null);
  const [avgTimeToHire, setAvgTimeToHire] = useState<string>("—");
  const [jobViews, setJobViews] = useState<number | null>(null);
  const [offerAcceptanceRate, setOfferAcceptanceRate] = useState<string>("—");
  const [profileVisitRate, setProfileVisitRate] = useState<string>("—");
  const [timePeriod, setTimePeriod] = useState("30d");
  const [applicationsGrowth, setApplicationsGrowth] = useState<string>("+0%");
  const [funnelCounts, setFunnelCounts] = useState({
    reviewed: 0,
    shortlisted: 0,
    interviewScheduled: 0,
    selectedInInterview: 0,
    offered: 0,
    hired: 0,
  });
  const [articleSaved, setArticleSaved] = useState(false);
  const [articleError, setArticleError] = useState("");
  const [publishedArticles, setPublishedArticles] = useState<RecruiterArticle[]>([]);

  const toLocalDateKey = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const getDateDiffDays = useCallback((fromDateKey: string, toDateKey: string) => {
    const fromDate = new Date(`${fromDateKey}T00:00:00`);
    const toDate = new Date(`${toDateKey}T00:00:00`);
    return Math.max(0, Math.floor((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000)));
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setActiveTimerNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    async function loadRecruiterArticles() {
      if (!recruiterProfile?.id) return;

      const { data, error } = await supabase
        .from("recruiter_articles")
        .select("*")
        .eq("recruiter_id", recruiterProfile.id)
        .order("created_at", { ascending: false });

      if (error) {
        setArticleError(error.message);
        return;
      }

      setArticleError("");
      setPublishedArticles((data || []) as RecruiterArticle[]);
    }

    void loadRecruiterArticles();
  }, [recruiterProfile?.id]);

  useEffect(() => {
    if (!recruiterProfile?.id) {
      setAvgTimeToHire("—");
      activeTimerLastTickAtRef.current = activeTimerNow;
      return;
    }

    const todayKey = toLocalDateKey(activeTimerNow);
    const storageKey = `rhirepro:recruiter-active-time:${recruiterProfile.id}`;
    const elapsedSeconds = Math.max(0, Math.floor((activeTimerNow - activeTimerLastTickAtRef.current) / 1000));
    const tickSeconds = document.hidden ? 0 : Math.min(elapsedSeconds, 5);
    activeTimerLastTickAtRef.current = activeTimerNow;

    let firstActiveDateKey = todayKey;
    let currentDateKey = todayKey;
    let todayActiveSeconds = 0;

    try {
      const storedRaw = localStorage.getItem(storageKey);
      const stored = storedRaw
        ? JSON.parse(storedRaw) as { firstActiveDateKey?: string; currentDateKey?: string; todayActiveSeconds?: number }
        : {};

      firstActiveDateKey = stored.firstActiveDateKey || todayKey;
      currentDateKey = stored.currentDateKey || todayKey;
      todayActiveSeconds = typeof stored.todayActiveSeconds === "number" ? stored.todayActiveSeconds : 0;
    } catch {
      firstActiveDateKey = todayKey;
      currentDateKey = todayKey;
      todayActiveSeconds = 0;
    }

    if (currentDateKey !== todayKey) {
      currentDateKey = todayKey;
      todayActiveSeconds = 0;
    }

    todayActiveSeconds += tickSeconds;

    try {
      localStorage.setItem(storageKey, JSON.stringify({
        firstActiveDateKey,
        currentDateKey,
        todayActiveSeconds,
      }));
    } catch {
      // Keep the visible timer working even if browser storage is unavailable.
    }

    const activeDays = getDateDiffDays(firstActiveDateKey, todayKey);
    const activeHours = Math.floor(todayActiveSeconds / 3600);
    const activeMins = Math.floor((todayActiveSeconds % 3600) / 60);
    const pad = (n: number) => String(n).padStart(2, "0");

    setAvgTimeToHire(`${activeDays}:${pad(activeHours)}:${pad(activeMins)}`);
  }, [activeTimerNow, getDateDiffDays, recruiterProfile?.id, toLocalDateKey]);

  useEffect(() => {
    async function loadAnalyticsMetrics() {
      if (!recruiterProfile?.id) return;

      try {
        const [jobsRes, appsRes] = await Promise.all([
          supabase
            .from("jobs")
            .select("id, created_at, status, views")
            .eq("recruiter_id", recruiterProfile.id),
          supabase
            .from("applications")
            .select("job_id, applied_at, status, profile_id")
            .eq("recruiter_id", recruiterProfile.id),
        ]);

        if (jobsRes.error || appsRes.error) {
          setTotalJobsPosted(null);
          setTotalApplications(null);
          setJobViews(null);
          setOfferAcceptanceRate("—");
          setProfileVisitRate("—");
          setApplicationsGrowth("+0%");
          setFunnelCounts({ reviewed: 0, shortlisted: 0, interviewScheduled: 0, selectedInInterview: 0, offered: 0, hired: 0 });
          return;
        }

        const now = new Date();
        const days = timePeriod === "7d" ? 7 : timePeriod === "90d" ? 90 : 30;
        const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        const prevCutoff = new Date(cutoff.getTime() - days * 24 * 60 * 60 * 1000);

        const jobs = (jobsRes.data || []) as { id: string; created_at: string; status: string; views: number | null }[];
        const applications = (appsRes.data || []) as { job_id: string; applied_at: string; status: string | null; profile_id: string }[];

        const filteredJobs = jobs.filter(job => new Date(job.created_at) >= cutoff);
        const filteredApplications = applications.filter(app => app.applied_at && new Date(app.applied_at) >= cutoff);
        const prevApplications = applications.filter(app => app.applied_at && new Date(app.applied_at) >= prevCutoff && new Date(app.applied_at) < cutoff);

        setTotalJobsPosted(filteredJobs.length);
        setTotalApplications(filteredApplications.length);
        setFunnelCounts(filteredApplications.reduce((counts, application) => {
          const stage = mapApplicationStatusToPipelineStage(application.status);
          const normalizedStatus = (application.status || "").toLowerCase().trim().replace(/[\s-]+/g, "_");

          if (stage === "Under Review") counts.reviewed += 1;
          if (stage === "Shortlisted") counts.shortlisted += 1;
          if (stage === "Interview Scheduled") counts.interviewScheduled += 1;
          if (
            normalizedStatus === "selected_in_interview" ||
            normalizedStatus === "interview_selected" ||
            normalizedStatus === "selected_after_interview"
          ) counts.selectedInInterview += 1;
          if (stage === "Offered") counts.offered += 1;
          if (stage === "Joined") counts.hired += 1;

          return counts;
        }, { reviewed: 0, shortlisted: 0, interviewScheduled: 0, selectedInInterview: 0, offered: 0, hired: 0 }));

        const currentCount = filteredApplications.length;
        const prevCount = prevApplications.length;
        let growthText = "+0%";
        
        if (prevCount === 0 && currentCount > 0) {
          growthText = "New";
        } else if (prevCount === 0 && currentCount === 0) {
          growthText = "No activity";
        } else if (prevCount > 0) {
          const growth = Math.round(((currentCount - prevCount) / prevCount) * 100);
          growthText = growth > 0 ? `+${growth}%` : `${growth}%`;
        }
        setApplicationsGrowth(growthText);

        const profileViews = new Set(
          filteredApplications.map(app => app.profile_id)
        ).size;
        const profileAppearances = filteredApplications.length;
        setJobViews(profileViews);

        const offeredCount = filteredApplications.filter((application) => application.status === "Offered").length;
        setOfferAcceptanceRate(filteredApplications.length > 0 ? `${Math.round((offeredCount / filteredApplications.length) * 100)}%` : "—");
        setProfileVisitRate(profileAppearances > 0 ? `${Math.round((profileViews / profileAppearances) * 100)}%` : "—");
      } catch {
        setTotalJobsPosted(null);
        setTotalApplications(null);
        setJobViews(null);
        setOfferAcceptanceRate("—");
        setProfileVisitRate("—");
        setApplicationsGrowth("+0%");
        setFunnelCounts({ reviewed: 0, shortlisted: 0, interviewScheduled: 0, selectedInInterview: 0, offered: 0, hired: 0 });
      }
    }

    loadAnalyticsMetrics();
  }, [recruiterProfile?.id, timePeriod]);


  const generateAndShareReport = async () => {
    if (!recruiterProfile?.id) return;
    setReportLoading(true);
    setReportError("");
    try {
      const { generateReportHTML } = await import("../../lib/reportGenerator");

      const [jobsRes, appsRes] = await Promise.all([
        supabase
          .from("jobs")
          .select("id, title, status, employment_type, location, views, openings, created_at")
          .eq("recruiter_id", recruiterProfile.id),
        supabase
          .from("applications")
          .select("status, job_id")
          .eq("recruiter_id", recruiterProfile.id),
      ]);

      const html = generateReportHTML(
        {
          company_name:   recruiterProfile.company_name ?? null,
          recruiter_name: recruiterProfile.recruiter_name ?? null,
          logo_url:       recruiterProfile.logo_url ?? null,
          industry:       recruiterProfile.industry ?? null,
          location:       recruiterProfile.location ?? null,
          tagline:        recruiterProfile.tagline ?? null,
          website:        recruiterProfile.website ?? null,
        },
        (jobsRes.data || []) as Parameters<typeof generateReportHTML>[1],
        (appsRes.data || []) as Parameters<typeof generateReportHTML>[2]
      );

      const fileName = `${recruiterProfile.id}.html`;
      const { error: uploadErr } = await supabase.storage
        .from("reports")
        .upload(fileName, new Blob([html], { type: "text/html;charset=utf-8" }), {
          upsert: true,
          contentType: "text/html;charset=utf-8",
        });

      if (uploadErr) throw new Error(uploadErr.message);

      const { data: urlData } = supabase.storage.from("reports").getPublicUrl(fileName);
      const url = urlData.publicUrl;
      setReportUrl(url);
      await navigator.clipboard.writeText(url);
      setReportCopied(true);
      setTimeout(() => setReportCopied(false), 4000);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setReportLoading(false);
    }
  };

  const openCreateArticleDialog = () => {
    navigate("/recruiter/dashboard/articles/new");
  };

  const openEditArticleDialog = (article: RecruiterArticle) => {
    navigate(`/recruiter/dashboard/articles/${article.id}/edit`);
  };

  const deleteArticle = async (articleId: string) => {
    const { error } = await supabase.from("recruiter_articles").delete().eq("id", articleId);
    if (error) {
      setArticleError(error.message);
      return;
    }

    setArticleError("");
    setPublishedArticles((articles) => articles.filter((article) => article.id !== articleId));
    setArticleSaved(true);
    setTimeout(() => setArticleSaved(false), 3500);
  };

  const metrics = [
    { label: "Total Jobs Posted", value: totalJobsPosted !== null ? `${totalJobsPosted}` : "—", sub: timePeriod === "7d" ? "Last 7 days" : timePeriod === "90d" ? "Last 90 days" : "Last 30 days", icon: Briefcase, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Total Applications", value: totalApplications !== null ? `${totalApplications}` : "—", sub: `${applicationsGrowth} vs previous ${timePeriod === "7d" ? "7 days" : timePeriod === "90d" ? "90 days" : "30 days"}`, icon: Users, color: "text-green-600", bg: "bg-green-50" },
    { label: "day : hr : min", value: avgTimeToHire, sub: "Industry avg: 25 days", icon: Clock, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Offer Acceptance Rate", value: offerAcceptanceRate, sub: "+5% vs last quarter", icon: CheckCircle, color: "text-[#FF2B2B]", bg: "bg-red-50" },
    { label: "Job Views", value: jobViews !== null ? jobViews.toLocaleString() : "—", sub: "Across all active jobs", icon: Eye, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Profile View Rate", value: profileVisitRate, sub: "Profile Appearances", icon: TrendingUp, color: "text-teal-600", bg: "bg-teal-50" },
  ];

  const sourceData = [
    { source: "Direct Search", count: 142, pct: 33 },
    { source: "Recommended by Naukri", count: 98, pct: 23 },
    { source: "Job Alert Email", count: 87, pct: 20 },
    { source: "Similar Jobs", count: 65, pct: 15 },
    { source: "Social Share", count: 36, pct: 9 },
  ];

  const totalApplicationsValue = totalApplications ?? 0;
  const formatFunnelPct = (pct: number) => Number.isInteger(pct) ? String(pct) : pct.toFixed(1);
  const funnelData = [
    { stage: "Total Candidates", count: totalApplicationsValue, color: "#BFDBFE", icon: Users, width: 100 },
    { stage: "Shortlisted", count: funnelCounts.shortlisted, color: "#A7F3D0", icon: FileText, width: 90 },
    { stage: "No. of Candidates Interviews", count: funnelCounts.interviewScheduled, color: "#FEF3C7", icon: Calendar, width: 80 },
    { stage: "Selected in Interview", count: funnelCounts.selectedInInterview, color: "#FED7AA", icon: CheckCircle, width: 70 },
    { stage: "Offer", count: funnelCounts.offered, color: "#FECACA", icon: Mail, width: 60 },
    { stage: "Hired", count: funnelCounts.hired, color: "#FCA5A5", icon: User, width: 50 },
  ];

  const jobPerformance = jobsData.map(j => ({
    ...j,
    ctr: `${((j.applicants / j.views) * 100).toFixed(1)}%`,
  }));

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[#3A1F1F]">Analytics</h1>
        <div className="flex gap-2">
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="w-36 bg-white border-gray-200 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={reportCopied ? "default" : "outline"}
            className={reportCopied ? "bg-green-600 hover:bg-green-700 text-white rounded-full" : "border-[#FF2B2B] text-[#FF2B2B] hover:bg-red-50 rounded-full"}
            onClick={generateAndShareReport}
            disabled={reportLoading}
          >
            {reportLoading
              ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Generating…</>
              : reportCopied
                ? <><CheckCircle className="h-4 w-4 mr-1.5" /> Link copied!</>
                : <><Share2 className="h-4 w-4 mr-1.5" /> Share Report</>}
          </Button>
          {reportUrl && (
            <Button variant="outline" className="border-gray-200 rounded-full text-xs max-w-[180px]" onClick={() => window.open(reportUrl, "_blank")}>
              <ExternalLink className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
              <span className="truncate">View Report</span>
            </Button>
          )}
        </div>
      </div>

      {reportError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm flex items-start gap-2">
          <span className="font-medium">Report error:</span> {reportError}
          <span className="text-xs text-red-500 mt-0.5 block">Make sure the <code className="bg-red-100 px-1 rounded">reports</code> storage bucket exists and is public in your Supabase dashboard.</span>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {metrics.map((m, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm">
            <div className={`w-10 h-10 ${m.bg} rounded-xl flex items-center justify-center mb-3`}>
              <m.icon className={`h-5 w-5 ${m.color}`} />
            </div>
            <div className="text-2xl font-bold text-[#3A1F1F]">{m.value}</div>
            <div className="text-sm font-medium text-[#3A1F1F]">{m.label}</div>
            <div className="text-xs text-[#8A8A8A] mt-0.5">{m.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Application Source */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold text-[#3A1F1F] mb-4">Application Sources</h2>
          <div className="space-y-3">
            {sourceData.map((s, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[#3A1F1F]">{s.source}</span>
                  <span className="text-[#8A8A8A]">{s.count} ({s.pct}%)</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#FF2B2B] rounded-full transition-all" style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pipeline Funnel */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-center text-2xl font-bold text-[#3A1F1F] mb-5">Hiring Funnel</h2>
          <div className="space-y-2.5">
            {funnelData.map((stage, i) => {
              const pct = totalApplicationsValue > 0 ? (stage.count / totalApplicationsValue) * 100 : 0;
              const Icon = stage.icon;

              return (
                <div
                  key={stage.stage}
                  className="relative mx-auto h-[68px] max-w-full overflow-visible"
                  style={{ width: `${stage.width}%` }}
                >
                  <div
                    className="absolute inset-0 shadow-sm"
                    style={{
                      backgroundColor: stage.color,
                      clipPath: "polygon(0 0, 100% 0, 92% 100%, 8% 100%)",
                    }}
                  />
                  <div className="relative grid h-full grid-cols-[38px_minmax(0,1fr)_68px] items-center gap-2 px-[12%] sm:grid-cols-[44px_minmax(0,1fr)_78px] sm:gap-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#FF2B2B] shadow-sm sm:h-11 sm:w-11">
                      <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold leading-tight text-[#3A1F1F]">{stage.stage}</p>
                      <p className="mt-0.5 whitespace-nowrap text-xs font-medium text-[#5A5A5A]">{stage.count} candidates</p>
                    </div>
                    <div className="min-w-0 text-right">
                      <p className="text-lg font-bold leading-none text-[#3A1F1F] sm:text-xl">{formatFunnelPct(pct)}%</p>
                      <p className="mt-1 text-[11px] font-medium leading-tight text-[#5A5A5A]">of total</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Job Performance Table */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="font-bold text-[#3A1F1F] mb-4">Job Performance</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-2 text-[#8A8A8A] font-medium">Job Title</th>
                <th className="text-center py-3 px-2 text-[#8A8A8A] font-medium">Status</th>
                <th className="text-center py-3 px-2 text-[#8A8A8A] font-medium">Views</th>
                <th className="text-center py-3 px-2 text-[#8A8A8A] font-medium">Applicants</th>
                <th className="text-center py-3 px-2 text-[#8A8A8A] font-medium">CTR</th>
                <th className="text-center py-3 px-2 text-[#8A8A8A] font-medium">Shortlisted</th>
                <th className="text-center py-3 px-2 text-[#8A8A8A] font-medium">Offered</th>
              </tr>
            </thead>
            <tbody>
              {jobPerformance.map((job, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-[#F6F6F6]">
                  <td className="py-3 px-2 font-medium text-[#3A1F1F]">{job.title}</td>
                  <td className="py-3 px-2 text-center">
                    <Badge className={job.status === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>{job.status}</Badge>
                  </td>
                  <td className="py-3 px-2 text-center text-[#5A5A5A]">{job.views.toLocaleString()}</td>
                  <td className="py-3 px-2 text-center text-[#5A5A5A]">{job.applicants}</td>
                  <td className="py-3 px-2 text-center text-blue-600 font-medium">{job.ctr}</td>
                  <td className="py-3 px-2 text-center text-pink-600 font-medium">{job.pipeline.shortlisted}</td>
                  <td className="py-3 px-2 text-center text-orange-600 font-medium">{job.pipeline.offered}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm mt-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center">
                <FileText className="h-5 w-5 text-[#FF2B2B]" />
              </div>
              <div>
                <h2 className="font-bold text-[#3A1F1F]">Article Publishing</h2>
                <p className="text-sm text-[#8A8A8A]">Share hiring insights, company culture stories, and practical career guidance with candidates.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              {ARTICLE_CATEGORY_OPTIONS.slice(0, 6).map((category) => (
                <Badge key={category} className="bg-[#F6F6F6] text-[#5A5A5A] hover:bg-[#F6F6F6]">
                  {category}
                </Badge>
              ))}
            </div>
          </div>

          <Button className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full w-full sm:w-auto" onClick={openCreateArticleDialog}>
            <Plus className="h-4 w-4 mr-1.5" /> Create Article
          </Button>
        </div>

        {articleSaved && (
          <div className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Article deleted successfully.
          </div>
        )}

        {articleError && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Article error: {articleError}
          </div>
        )}

        {publishedArticles.length > 0 && (
          <div className="mt-5 border border-gray-100 rounded-2xl p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="font-semibold text-[#3A1F1F]">Created Articles</h3>
              <Badge className="bg-red-50 text-[#FF2B2B] hover:bg-red-50">
                {publishedArticles.length} article{publishedArticles.length === 1 ? "" : "s"}
              </Badge>
            </div>
            <div className="space-y-4">
              {publishedArticles.map((article) => (
                <div key={article.id} className="grid md:grid-cols-[180px_1fr_auto] gap-4 items-start border-t border-gray-100 pt-4 first:border-t-0 first:pt-0">
                  <div className="aspect-video rounded-xl bg-[#F6F6F6] border border-gray-100 overflow-hidden flex items-center justify-center">
                    {article.cover_image_url ? (
                      <img src={article.cover_image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <FileText className="h-8 w-8 text-[#FF2B2B]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge className="bg-red-50 text-[#FF2B2B] hover:bg-red-50">{article.category}</Badge>
                      <span className="text-xs text-[#8A8A8A]">{article.read_time} min read</span>
                    </div>
                    <h4 className="text-lg font-bold text-[#3A1F1F] leading-tight">{article.title}</h4>
                    <p className="text-sm text-[#6A6A6A] mt-2 line-clamp-2">
                      {toArticleCardText(article)}
                    </p>
                    <div className="mt-3 text-xs text-[#8A8A8A]">
                      {recruiterProfile?.company_name || "Your Company"}
                    </div>
                  </div>
                  <div className="flex md:flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full border-gray-200 text-[#3A1F1F]"
                      onClick={() => openEditArticleDialog(article)}
                    >
                      <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full border-red-100 text-[#FF2B2B] hover:bg-red-50"
                      onClick={() => deleteArticle(article.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Company Profile Page ─────────────────────────────────────────────────────

function ArticleEditorPage() {
  const { recruiterProfile } = useAuth();
  const navigate = useNavigate();
  const { articleId } = useParams();
  const isEditing = Boolean(articleId);
  const [existingArticle, setExistingArticle] = useState<RecruiterArticle | null>(null);
  const [articleLoading, setArticleLoading] = useState(isEditing);
  const [articleError, setArticleError] = useState("");
  const [articleDraft, setArticleDraft] = useState<RecruiterArticleDraft>(createEmptyArticleDraft);
  const [articleImagePreview, setArticleImagePreview] = useState("");

  useEffect(() => {
    async function loadArticleForEdit() {
      if (!articleId) return;

      setArticleLoading(true);
      const { data, error } = await supabase
        .from("recruiter_articles")
        .select("*")
        .eq("id", articleId)
        .single();

      if (error || !data) {
        setArticleError(error?.message || "Article not found");
        setExistingArticle(null);
        setArticleLoading(false);
        return;
      }

      const article = data as RecruiterArticle;
      setExistingArticle(article);
      setArticleDraft({
        title: article.title,
        category: article.category,
        summary: article.summary || "",
        keyTakeaway: article.key_takeaway || "",
        content: article.content,
        imageName: article.cover_image_name || "",
      });
      setArticleImagePreview(article.cover_image_url || "");
      setArticleError("");
      setArticleLoading(false);
    }

    void loadArticleForEdit();
  }, [articleId]);

  const articleWordCount = articleDraft.content.trim() ? articleDraft.content.trim().split(/\s+/).length : 0;
  const articleReadTime = Math.max(1, Math.ceil(articleWordCount / 180));
  const canPublishArticle = articleDraft.title.trim().length > 0 && articleDraft.content.trim().length > 0;

  const handleArticleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setArticleDraft((draft) => ({ ...draft, imageName: file.name }));
    const reader = new FileReader();
    reader.onload = () => {
      setArticleImagePreview(typeof reader.result === "string" ? reader.result : "");
    };
    reader.readAsDataURL(file);
    event.currentTarget.value = "";
  };

  const resetArticleDraft = () => {
    setArticleDraft(existingArticle ? {
      title: existingArticle.title,
      category: existingArticle.category,
      summary: existingArticle.summary || "",
      keyTakeaway: existingArticle.key_takeaway || "",
      content: existingArticle.content,
      imageName: existingArticle.cover_image_name || "",
    } : createEmptyArticleDraft());
    setArticleImagePreview(existingArticle?.cover_image_url || "");
  };

  const publishArticleDraft = async () => {
    if (!recruiterProfile?.id) return;
    const title = articleDraft.title.trim();
    const content = articleDraft.content.trim();
    if (!title || !content) return;

    const readTime = Math.max(1, Math.ceil(content.split(/\s+/).length / 180));
    const articlePayload = {
      recruiter_id: recruiterProfile.id,
      title,
      category: articleDraft.category,
      summary: articleDraft.summary.trim(),
      key_takeaway: articleDraft.keyTakeaway.trim(),
      content,
      cover_image_name: articleDraft.imageName,
      cover_image_url: articleImagePreview,
      read_time: readTime,
      status: "Published",
    };

    const { error } = articleId
      ? await supabase.from("recruiter_articles").update(articlePayload).eq("id", articleId)
      : await supabase.from("recruiter_articles").insert(articlePayload);

    if (error) {
      setArticleError(error.message);
      return;
    }

    navigate("/recruiter/dashboard/analytics");
  };

  if (articleLoading) {
    return (
      <div className="min-h-[calc(100vh-76px)] bg-[#F6F6F6] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF2B2B]" />
      </div>
    );
  }

  if (isEditing && !existingArticle) {
    return (
      <div className="container mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <FileText className="h-10 w-10 text-[#FF2B2B] mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-[#3A1F1F]">Article not found</h1>
          <p className="text-sm text-[#8A8A8A] mt-2">The article may have been deleted.</p>
          <Button className="mt-5 bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full" onClick={() => navigate("/recruiter/dashboard/analytics")}>
            Back to Analytics
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-76px)] bg-[#F6F6F6]">
      <div className="border-b border-gray-100 bg-white sticky top-[73px] z-40">
        <div className="container mx-auto px-4 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="outline" size="icon" className="rounded-full border-gray-200 flex-shrink-0" onClick={() => navigate("/recruiter/dashboard/analytics")}>
              <ArrowRight className="h-4 w-4 rotate-180" />
            </Button>
            <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
              <BookOpen className="h-5 w-5 text-[#FF2B2B]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-[#3A1F1F] truncate">{isEditing ? "Edit Article" : "Article Writing Studio"}</h1>
              <p className="text-xs text-[#8A8A8A]">{articleWordCount} words - {articleReadTime} min read</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" className="rounded-full" onClick={resetArticleDraft}>Clear</Button>
            <Button className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full" onClick={publishArticleDraft} disabled={!canPublishArticle}>
              <FileText className="h-4 w-4 mr-1.5" /> {isEditing ? "Update Article" : "Publish Article"}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {articleError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Article error: {articleError}
          </div>
        )}
        <div className="grid xl:grid-cols-[minmax(0,1fr)_340px] gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 min-h-[760px]">
            <div className="max-w-3xl mx-auto px-5 sm:px-12 py-10">
              <Input
                value={articleDraft.title}
                onChange={(event) => setArticleDraft((draft) => ({ ...draft, title: event.target.value }))}
                className="border-0 border-b border-gray-100 rounded-none px-0 pb-5 h-auto text-3xl sm:text-4xl font-bold text-[#3A1F1F] shadow-none focus-visible:ring-0 placeholder:text-gray-300"
                placeholder="Give your article a strong title"
              />
              <div className="flex flex-wrap items-center gap-3 mt-5 text-sm text-[#8A8A8A]">
                <Badge className="bg-red-50 text-[#FF2B2B] hover:bg-red-50">{articleDraft.category}</Badge>
                <span>{recruiterProfile?.company_name || "Your Company"}</span>
                <span>{articleReadTime} min read</span>
              </div>
              {articleImagePreview && (
                <div className="mt-7 aspect-[16/7] rounded-2xl overflow-hidden border border-gray-100">
                  <img src={articleImagePreview} alt="Article cover preview" className="w-full h-full object-cover" />
                </div>
              )}
              <Textarea
                value={articleDraft.content}
                onChange={(event) => setArticleDraft((draft) => ({ ...draft, content: event.target.value }))}
                className="mt-8 min-h-[560px] resize-none border-0 rounded-none bg-transparent px-0 text-base sm:text-lg leading-8 text-[#3A1F1F] shadow-none focus-visible:ring-0 placeholder:text-gray-400"
                placeholder="Start writing your article here..."
              />
            </div>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-[160px] h-fit">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-[#3A1F1F] mb-4">Article Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Category</label>
                  <Select value={articleDraft.category} onValueChange={(category) => setArticleDraft((draft) => ({ ...draft, category }))}>
                    <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ARTICLE_CATEGORY_OPTIONS.map((category) => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Cover Image</label>
                  <label className="aspect-video rounded-xl bg-[#F6F6F6] border border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-red-50 hover:border-red-200 overflow-hidden">
                    {articleImagePreview ? (
                      <img src={articleImagePreview} alt="Article cover preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center px-4">
                        <Upload className="h-8 w-8 text-[#FF2B2B] mx-auto mb-2" />
                        <p className="text-xs text-[#8A8A8A]">Upload cover image</p>
                      </div>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleArticleImageUpload} />
                  </label>
                  {articleDraft.imageName && <p className="text-xs text-[#8A8A8A] mt-2 truncate">{articleDraft.imageName}</p>}
                </div>

                <div>
                  <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Short Summary</label>
                  <Textarea
                    value={articleDraft.summary}
                    onChange={(event) => setArticleDraft((draft) => ({ ...draft, summary: event.target.value }))}
                    className="bg-[#F6F6F6] border-gray-200 rounded-xl min-h-[120px]"
                    rows={4}
                    placeholder="A brief preview for readers"
                  />
                </div>

                <div>
                  <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Key Takeaway</label>
                  <Textarea
                    value={articleDraft.keyTakeaway}
                    onChange={(event) => setArticleDraft((draft) => ({ ...draft, keyTakeaway: event.target.value }))}
                    className="bg-[#F6F6F6] border-gray-200 rounded-xl min-h-[120px]"
                    rows={4}
                    placeholder="The final point readers should remember"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-[#3A1F1F] mb-4">Preview</h3>
              <Badge className="bg-red-50 text-[#FF2B2B] hover:bg-red-50 mb-3">{articleDraft.category}</Badge>
              <h4 className="font-bold text-[#3A1F1F] leading-snug">{articleDraft.title || "Your article title will appear here"}</h4>
              <p className="text-sm text-[#6A6A6A] mt-2 line-clamp-4">
                {articleDraft.summary || articleDraft.content || "Add a summary or start writing to preview the article card."}
              </p>
              <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-[#8A8A8A] flex items-center justify-between">
                <span>{articleWordCount} words</span>
                <span>{articleReadTime} min read</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function CompanyProfilePage() {
  const { recruiterProfile, refreshProfile } = useAuth();
  const [profile, setProfile] = useState({
    companyName: "", industry: "", companySize: "", type: "", founded: "",
    description: "", website: "", location: "", linkedin: "", cin: "",
    tagline: "", phone: "", recruiterName: "", logoUrl: "", coverImageUrl: "", coverImageName: "",
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState<"logo" | "cover" | null>(null);
  const [saveError, setSaveError] = useState("");
  const [brandingError, setBrandingError] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const companyCompletion = useMemo(() => {
    let score = 0;
    if (profile.recruiterName) score += 10;
    if (profile.companyName) score += 15;
    if (profile.phone) score += 5;
    if (profile.industry) score += 15;
    if (profile.companySize) score += 10;
    if (profile.type) score += 5;
    if (profile.description.trim().length > 20) score += 20;
    if (profile.location) score += 10;
    if (profile.website) score += 10;
    return Math.min(100, score);
  }, [profile]);

  useEffect(() => {
    if (recruiterProfile) {
      setProfile({
        companyName: recruiterProfile.company_name || "",
        industry: recruiterProfile.industry || "",
        companySize: recruiterProfile.company_size || "",
        type: recruiterProfile.company_type || "",
        founded: "",
        description: recruiterProfile.company_description || "",
        website: recruiterProfile.website || "",
        location: recruiterProfile.location || "",
        linkedin: recruiterProfile.linkedin_url || "",
        cin: recruiterProfile.cin || "",
        tagline: recruiterProfile.tagline || "",
        phone: recruiterProfile.phone || "",
        recruiterName: recruiterProfile.recruiter_name || "",
        logoUrl: recruiterProfile.logo_url || "",
        coverImageUrl: recruiterProfile.cover_image_url || "",
        coverImageName: recruiterProfile.cover_image_name || "",
      });
    }
  }, [recruiterProfile]);

  const handleBrandingUpload = async (asset: "logo" | "cover", event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file || !recruiterProfile?.id) return;

    if (!file.type.startsWith("image/")) {
      setBrandingError("Please choose an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setBrandingError("Image must be smaller than 5 MB.");
      return;
    }

    setUploadingAsset(asset);
    setBrandingError("");

    const localPreviewUrl = URL.createObjectURL(file);
    setProfile((current) => asset === "logo"
      ? { ...current, logoUrl: localPreviewUrl }
      : { ...current, coverImageUrl: localPreviewUrl, coverImageName: file.name });

    try {
      const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
      const filePath = `recruiter-branding/${recruiterProfile.id}/${asset}-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;
      const updatePayload = asset === "logo"
        ? { logo_url: publicUrl }
        : { cover_image_url: publicUrl, cover_image_name: file.name };
      const { error: updateError } = await supabase
        .from("recruiter_profiles")
        .update(updatePayload)
        .eq("id", recruiterProfile.id);

      if (updateError) throw updateError;

      setProfile((current) => asset === "logo"
        ? { ...current, logoUrl: publicUrl }
        : { ...current, coverImageUrl: publicUrl, coverImageName: file.name });
      await refreshProfile();
    } catch (err: unknown) {
      setBrandingError(err instanceof Error ? err.message : `Failed to upload ${asset === "logo" ? "logo" : "cover photo"}.`);
    } finally {
      URL.revokeObjectURL(localPreviewUrl);
      setUploadingAsset(null);
    }
  };

  const handleBrandingDelete = async (asset: "logo" | "cover") => {
    if (!recruiterProfile?.id) return;
    setUploadingAsset(asset);
    setBrandingError("");
    try {
      const updatePayload = asset === "logo"
        ? { logo_url: null }
        : { cover_image_url: null, cover_image_name: null };
      const { error: updateError } = await supabase
        .from("recruiter_profiles")
        .update(updatePayload)
        .eq("id", recruiterProfile.id);

      if (updateError) throw updateError;

      setProfile((current) => asset === "logo"
        ? { ...current, logoUrl: "" }
        : { ...current, coverImageUrl: "", coverImageName: "" });
      await refreshProfile();
    } catch (err: unknown) {
      setBrandingError(err instanceof Error ? err.message : `Failed to delete ${asset === "logo" ? "logo" : "cover photo"}.`);
    } finally {
      setUploadingAsset(null);
    }
  };

  const handleSave = async () => {
    if (!recruiterProfile?.id) return;
    setSaving(true);
    setSaveError("");
    try {
      const { error } = await supabase.from("recruiter_profiles").update({
        company_name: profile.companyName,
        industry: profile.industry,
        company_size: profile.companySize,
        company_type: profile.type,
        company_description: profile.description,
        website: profile.website,
        location: profile.location,
        linkedin_url: profile.linkedin,
        cin: profile.cin,
        tagline: profile.tagline,
        phone: profile.phone,
        recruiter_name: profile.recruiterName,
      }).eq("id", recruiterProfile.id);
      if (error) throw error;
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-[#3A1F1F] mb-6">Company Profile</h1>

      {/* Completion Banner — hidden when profile is 100% complete */}
      {companyCompletion < 100 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-[#3A1F1F]">Profile Completion</h3>
              <p className="text-sm text-[#8A8A8A]">
                {companyCompletion < 50
                  ? "Add more details so candidates can trust your job postings."
                  : companyCompletion < 80
                    ? "Almost there! A complete profile attracts better applicants."
                    : "Looking great! Just a few more details to go."}
              </p>
            </div>
            <div className={`text-3xl font-bold ${companyCompletion >= 80 ? "text-green-600" : companyCompletion >= 50 ? "text-yellow-600" : "text-[#FF2B2B]"}`}>
              {companyCompletion}%
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${companyCompletion >= 80 ? "bg-green-500" : companyCompletion >= 50 ? "bg-yellow-500" : "bg-[#FF2B2B]"}`}
              style={{ width: `${companyCompletion}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { label: "HR Contact", done: !!profile.recruiterName },
              { label: "Company Name", done: !!profile.companyName },
              { label: "Phone", done: !!profile.phone },
              { label: "Industry", done: !!profile.industry },
              { label: "Company Size", done: !!profile.companySize },
              { label: "Company Type", done: !!profile.type },
              { label: "About Company", done: profile.description.trim().length > 20 },
              { label: "Location", done: !!profile.location },
              { label: "Website", done: !!profile.website },
            ].map(({ label, done }) => (
              <span key={label} className={`px-2 py-1 rounded-full text-xs ${done ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                {done ? "✓" : "○"} {label}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Logo & Cover */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="h-40 sm:h-48 bg-gradient-to-r from-[#3A1F1F] to-[#FF2B2B] relative overflow-hidden">
            {profile.coverImageUrl ? (
              <img src={profile.coverImageUrl} alt="Company cover" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-r from-[#3A1F1F]/35 to-[#FF2B2B]/20" />
            )}
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => handleBrandingUpload("cover", event)}
            />
            <div className="absolute right-4 top-2.5 flex items-center gap-2">
              {profile.coverImageUrl && (
                <Button
                  size="icon"
                  variant="outline"
                  className="bg-white/90 hover:bg-[#FF2B2B] text-[#FF2B2B] hover:text-white border-0 rounded-full h-8 w-8 flex items-center justify-center transition-colors"
                  disabled={uploadingAsset === "cover"}
                  onClick={() => handleBrandingDelete("cover")}
                  title="Delete Cover Photo"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="bg-white/90 hover:bg-[#FF2B2B] text-[#3A1F1F] hover:text-white border-0 rounded-full text-xs transition-colors"
                disabled={uploadingAsset === "cover"}
                onClick={() => coverInputRef.current?.click()}
              >
                {uploadingAsset === "cover" ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
                Cover Photo
              </Button>
            </div>
          </div>
          <div className="pl-5 pr-4 sm:pl-6 sm:pr-4 pb-6 min-h-[128px]">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 -mt-12 relative z-10">
              <div className="w-24 h-24 bg-[#FF2B2B] rounded-2xl border-4 border-white flex items-center justify-center shadow-lg overflow-hidden flex-shrink-0">
                {profile.logoUrl ? (
                  <img src={profile.logoUrl} alt={`${profile.companyName || "Company"} logo`} className="h-full w-full object-cover" />
                ) : (
                  <Building2 className="h-10 w-10 text-white" />
                )}
              </div>
              <div className="pt-1 sm:pt-14 flex-1 min-w-0">
                <h2 className="text-xl font-bold text-[#3A1F1F] truncate">{profile.companyName || "Company Name"}</h2>
                <p className="text-sm text-[#8A8A8A] truncate">{profile.tagline || "Add a tagline to introduce your company"}</p>
              </div>
              <div className="pt-1 sm:pt-14 sm:flex-shrink-0 flex items-center gap-2">
                {profile.logoUrl && (
                  <Button
                    size="icon"
                    variant="outline"
                    className="border-red-200 text-[#FF2B2B] hover:bg-[#FF2B2B] hover:text-white rounded-full h-8 w-8 flex items-center justify-center transition-colors"
                    disabled={uploadingAsset === "logo"}
                    onClick={() => handleBrandingDelete("logo")}
                    title="Delete Logo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => handleBrandingUpload("logo", event)}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white border border-gray-200 hover:border-[#FF2B2B] text-[#3A1F1F] hover:bg-[#FF2B2B] hover:text-white rounded-full text-xs transition-colors shadow-sm"
                  disabled={uploadingAsset === "logo"}
                  onClick={() => logoInputRef.current?.click()}
                >
                  {uploadingAsset === "logo" ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
                  Upload Logo
                </Button>
              </div>
            </div>
            {brandingError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {brandingError}
              </div>
            )}
          </div>
        </div>

        {/* Basic Info */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-[#3A1F1F] mb-4">Basic Information</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Company Name *</label>
              <Input value={profile.companyName} onChange={e => setProfile({ ...profile, companyName: e.target.value })} className="bg-[#F6F6F6] border-gray-200 rounded-xl" placeholder="Enter company name" />
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Tagline</label>
              <Input value={profile.tagline} onChange={e => setProfile({ ...profile, tagline: e.target.value })} className="bg-[#F6F6F6] border-gray-200 rounded-xl" placeholder="Enter company tagline" />
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Industry *</label>
              <Select value={profile.industry} onValueChange={v => setProfile({ ...profile, industry: v })}>
                <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-xl"><SelectValue placeholder="Select industry" /></SelectTrigger>
                <SelectContent>
                  {["IT / Software", "BFSI", "Manufacturing", "Healthcare", "Education", "E-commerce", "Consulting"].map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Company Type</label>
              <Select value={profile.type} onValueChange={v => setProfile({ ...profile, type: v })}>
                <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Startup", "SME", "MNC", "Indian MNC", "Fortune 500", "Public Sector"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Company Size</label>
              <Select value={profile.companySize} onValueChange={v => setProfile({ ...profile, companySize: v })}>
                <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5001+"].map(s => <SelectItem key={s} value={s}>{s} employees</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Founded Year</label>
              <Input value={profile.founded} onChange={e => setProfile({ ...profile, founded: e.target.value })} className="bg-[#F6F6F6] border-gray-200 rounded-xl" placeholder="Enter founded year" />
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Your Name (HR Contact)</label>
              <Input value={profile.recruiterName} onChange={e => setProfile({ ...profile, recruiterName: e.target.value })} className="bg-[#F6F6F6] border-gray-200 rounded-xl" placeholder="Enter contact name" />
            </div>
          </div>
        </div>

        {/* About */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-[#3A1F1F] mb-4">About Company</h3>
          <Textarea value={profile.description} onChange={e => setProfile({ ...profile, description: e.target.value })} className="bg-[#F6F6F6] border-gray-200 rounded-xl" rows={5} placeholder="Describe your company culture, products, and mission..." />
          <p className="text-xs text-[#8A8A8A] mt-1">{profile.description.length}/2000 characters</p>
        </div>

        {/* Contact & Social */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-[#3A1F1F] mb-4">Contact & Social</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Headquarters</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A8A8A]" />
                <Input value={profile.location} onChange={e => setProfile({ ...profile, location: e.target.value })} className="pl-9 bg-[#F6F6F6] border-gray-200 rounded-xl" placeholder="City, State" />
              </div>
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Website</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A8A8A]" />
                <Input value={profile.website} onChange={e => setProfile({ ...profile, website: e.target.value })} className="pl-9 bg-[#F6F6F6] border-gray-200 rounded-xl" placeholder="https://..." />
              </div>
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">LinkedIn</label>
              <div className="relative">
                <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A8A8A]" />
                <Input value={profile.linkedin} onChange={e => setProfile({ ...profile, linkedin: e.target.value })} className="pl-9 bg-[#F6F6F6] border-gray-200 rounded-xl" placeholder="LinkedIn company URL" />
              </div>
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">CIN Number</label>
              <Input value={profile.cin} onChange={e => setProfile({ ...profile, cin: e.target.value })} className="bg-[#F6F6F6] border-gray-200 rounded-xl" placeholder="Corporate Identity Number" />
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Phone</label>
              <Input value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} className="bg-[#F6F6F6] border-gray-200 rounded-xl" placeholder="Enter phone number" />
            </div>
          </div>
        </div>

        {saveError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{saveError}</div>}
        <Button onClick={handleSave} disabled={saving} className={`w-full rounded-full py-6 text-white transition-colors ${saved ? "bg-green-500 hover:bg-green-600" : "bg-[#FF2B2B] hover:bg-[#e02525]"}`}>
          {saved ? <><CheckCircle className="mr-2 h-4 w-4" /> Saved Successfully!</> : saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

// ─── Plans Page ───────────────────────────────────────────────────────────────

function PlansPage() {
  const navigate = useNavigate();
  const { recruiterProfile } = useAuth();
  const [activeSub, setActiveSub] = useState<RecruiterSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<ReturnType<typeof validatePromo>>(null);
  const [promoSuccess, setPromoSuccess] = useState("");

  useEffect(() => {
    if (!recruiterProfile?.id) return;
    const load = async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("recruiter_subscriptions")
        .select("*")
        .eq("recruiter_id", recruiterProfile.id)
        .eq("status", "active")
        .gte("expires_at", now)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setActiveSub(data ?? null);
      setLoading(false);
    };
    load();
  }, [recruiterProfile?.id]);

  const handleApplyPromo = () => {
    const found = validatePromo(promoInput);
    if (!found) {
      setPromoError("Invalid promo code. Try RHIRE10, RHIRE20, HIRE50, or NEWJOIN.");
      setAppliedPromo(null);
      setPromoSuccess("");
      return;
    }
    setAppliedPromo(found);
    setPromoError("");
    setPromoSuccess(`${found.label} applied!`);
  };

  const handlePurchase = (planId: string) => {
    const plan = getPlanById(planId)!;
    const priceBreakdown = getPlanPriceBreakdown(plan, appliedPromo);
    const params = new URLSearchParams({
      plan: planId,
      amount: String(priceBreakdown.basePrice),
      final: String(priceBreakdown.totalAmount),
      discount: String(priceBreakdown.discountAmount),
      promo: appliedPromo?.code ?? "",
    });
    navigate(`/recruiter/payment?${params.toString()}`);
  };

  const activePlan = activeSub ? getPlanById(activeSub.plan_id) : null;
  const daysLeft = activeSub
    ? Math.max(0, Math.ceil((new Date(activeSub.expires_at).getTime() - Date.now()) / 86400000))
    : 0;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#FF2B2B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-3xl font-bold text-[#3A1F1F] mb-2">Recruiter Plans</h1>
      <p className="text-[#8A8A8A] mb-8">Manage your subscription and unlock more hiring power.</p>

      {/* Current Plan Card */}
      {activeSub && activePlan ? (
        <div className="bg-gradient-to-r from-[#FF2B2B] to-[#c41e1e] rounded-2xl p-6 text-white mb-8 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Crown className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-white/70 text-sm">Current Plan</p>
              <h2 className="text-2xl font-bold">{activePlan.name}</h2>
              <p className="text-white/80 text-sm">
                {activePlan.dailyJobPosts === null ? "Unlimited" : activePlan.dailyJobPosts} daily job posts
                &nbsp;·&nbsp; {daysLeft} days remaining
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-white/70 text-sm">Expires</p>
            <p className="font-semibold">{new Date(activeSub.expires_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
          </div>
        </div>
      ) : (
        <div className="bg-[#3A1F1F] rounded-2xl p-5 mb-8 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <CreditCard className="h-6 w-6 text-[#FF2B2B]" />
            <div>
              <p className="text-white font-medium">No active plan</p>
              <p className="text-white/60 text-sm">Free plan: {FREE_DAILY_POST_LIMIT} job post per day. Upgrade to post more.</p>
            </div>
          </div>
        </div>
      )}

      {/* Promo Code Bar */}
      <div className="bg-white rounded-2xl p-5 shadow-md mb-8">
        <h3 className="text-sm font-semibold text-[#3A1F1F] mb-3 flex items-center gap-2">
          <Tag className="h-4 w-4 text-[#FF2B2B]" /> Have a promo code?
        </h3>
        {appliedPromo ? (
          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-semibold text-green-700">{appliedPromo.code}</span>
              <span className="text-xs text-green-600">({promoSuccess})</span>
            </div>
            <button
              onClick={() => { setAppliedPromo(null); setPromoInput(""); setPromoSuccess(""); setPromoError(""); }}
              className="text-xs text-red-500 hover:underline"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              value={promoInput}
              onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoError(""); }}
              placeholder="Enter promo code (e.g. RHIRE10)"
              className="rounded-xl border-gray-200 uppercase font-mono"
              onKeyDown={e => e.key === "Enter" && handleApplyPromo()}
            />
            <Button
              onClick={handleApplyPromo}
              variant="outline"
              className="border-[#FF2B2B] text-[#FF2B2B] hover:bg-[#FF2B2B] hover:text-white rounded-xl"
            >
              Apply
            </Button>
          </div>
        )}
        {promoError && <p className="text-xs text-red-500 mt-1.5">{promoError}</p>}
      </div>

      {/* Plan Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {PLANS.map(plan => {
          const isCurrentPlan = activeSub?.plan_id === plan.id;
          const priceBreakdown = getPlanPriceBreakdown(plan, appliedPromo);
          const { basePrice, discountAmount, gstAmount, totalAmount } = priceBreakdown;

          return (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl p-6 shadow-md border-2 transition-all ${
                isCurrentPlan
                  ? "border-[#FF2B2B]"
                  : plan.popular
                  ? "border-[#FF2B2B]/40"
                  : "border-gray-100"
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-xl font-bold text-[#3A1F1F]">{plan.name}</h3>
                {isCurrentPlan && (
                  <span className="bg-[#FF2B2B] text-white text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> Active
                  </span>
                )}
                {!isCurrentPlan && plan.popular && (
                  <span className="bg-[#ECECF4] text-[#3A1F1F] text-xs px-2.5 py-1 rounded-full font-semibold">
                    Popular
                  </span>
                )}
              </div>

              {/* Pricing */}
              <div className="mb-1">
                <div className="flex items-baseline gap-1">
                  {discountAmount > 0 && (
                    <span className="text-lg text-[#8A8A8A] line-through">₹{basePrice + gstAmount}</span>
                  )}
                  <span className="text-4xl font-bold text-[#3A1F1F]">₹{basePrice}</span>
                  <span className="text-[#8A8A8A] text-sm">/{plan.period}</span>
                </div>
                <p className="text-xs text-[#8A8A8A]">+ GST ₹{gstAmount} · Total ₹{totalAmount}</p>
                {discountAmount > 0 && (
                  <p className="text-xs text-green-600 font-medium">You save ₹{discountAmount}</p>
                )}
              </div>
              <p className="text-xs text-[#FF2B2B] font-medium mb-5">
                {plan.dailyJobPosts === null ? "Unlimited" : plan.dailyJobPosts} daily job posts
              </p>

              {/* Features */}
              <ul className="space-y-2 mb-6">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-[#FF2B2B] flex-shrink-0" />
                    <span className="text-[#8A8A8A]">{f}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {isCurrentPlan ? (
                <Button disabled className="w-full rounded-full bg-green-100 text-green-700 cursor-default">
                  <CheckCircle className="mr-2 h-4 w-4" /> Current Plan
                </Button>
              ) : (
                <Button
                  onClick={() => handlePurchase(plan.id)}
                  className={`w-full rounded-full ${
                    plan.popular
                      ? "bg-[#FF2B2B] hover:bg-[#e02525] text-white"
                      : "bg-white border-2 border-[#FF2B2B] text-[#FF2B2B] hover:bg-[#FF2B2B] hover:text-white"
                  }`}
                >
                  {activeSub ? "Upgrade to this Plan" : "Purchase Plan"} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* FAQ / note */}
      <div className="mt-8 bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold text-[#3A1F1F] mb-3">Plan Notes</h3>
        <ul className="space-y-2 text-sm text-[#8A8A8A]">
          <li className="flex items-start gap-2"><ShieldCheck className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" /> Each plan is valid for 30 days from purchase date.</li>
          <li className="flex items-start gap-2"><ShieldCheck className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" /> Upgrading replaces your current plan immediately.</li>
          <li className="flex items-start gap-2"><ShieldCheck className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" /> Free accounts can post 1 job per day without any plan.</li>
          <li className="flex items-start gap-2"><ShieldCheck className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" /> Payment is processed securely via PhonePe UPI.</li>
        </ul>
      </div>
    </div>
  );
}

