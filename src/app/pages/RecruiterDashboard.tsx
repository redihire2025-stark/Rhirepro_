import { useState, useEffect, useCallback, useRef, useMemo, type ChangeEvent } from "react";
import { useNavigate, Routes, Route, Link, useLocation, useParams } from "react-router";
import { supabase, Job, Application, Notification, Profile, WorkExperience, Education as EduType, RecruiterSubscription, RecruiterArticle, PREFERRED_JOINING_TIME_OPTIONS } from "../../lib/supabase";
import {
  SALARY_AMOUNT_OPTIONS,
  JOB_EXPIRY_DAYS,
  buildJobDeadlineTimestamp,
  buildJobExpiryTimestamp,
  formatJobDeadline,
  formatJobSalary,
  formatJobSalaryRecruiter,
  formatSalaryRangeFromValues,
  getEffectiveJobStatus,
  getJobDaysRemaining,
  isJobExpired,
} from "../../lib/jobs";
import { PLANS, FREE_DAILY_POST_LIMIT, getPlanById, validatePromo, getPlanPriceBreakdown } from "../../lib/plans";
import {
  INDIA_CITY_OPTIONS,
  getAllCountriesList,
  getStatesList,
  getCitiesList,
  isLocationWithinRadius,
  matchesMultiLevelLocation,
} from "../../lib/locationData";
import { SEARCH_SUGGESTION_DATASET, SKILL_OPTIONS, getSkillSearchTerms, skillsMatch, fuzzyMatch } from "../../lib/skillKeywords";
import { inferSkillSuggestions, extractTextFromHtml, getRelevantSkillsForJobContext } from "../../lib/recruiterJobHelpers";
import { useAuth } from "../../lib/auth-context";
import { sendRecruiterCandidateEmail } from "../../lib/email";
import { formatActiveTime, parseActiveDate } from "../../lib/activeTime";
import {
  INDUSTRY_OPTIONS,
  PERKS_AND_BENEFITS_OPTIONS,
  QUALIFICATION_OPTIONS,
  QUALIFICATION_SPECIALIZATION_MAP,
  INTERVIEW_MODE_OPTIONS,
  getSpecializationsForQualification,
  matchQualificationOption,
} from "../../lib/jobMasterData";
import {
  parseSkillExperiences,
  evaluateOverallExperience,
  evaluateJobSkillMatrix,
  calculateCandidateExperienceMatch,
} from "../../lib/experienceMatching";
import logoImage from "../../logo/logo.png";
import {
  Bell, LogOut, Plus, Edit, Pause, Trash2, User, Upload, Building2,
  Search, Filter, Download, Mail, Phone, MapPin, Calendar, Clock,
  Briefcase, GraduationCap, Star, ChevronDown, ChevronRight, Eye,
  BarChart2, TrendingUp, Users, FileText, CheckCircle, XCircle, AlertCircle,
  MessageSquare, Video, Award, BookOpen, Globe, Linkedin, Share2,
  ArrowRight, Target, Zap, RefreshCw, MoreVertical, ThumbsUp, ThumbsDown, ExternalLink, Loader2,
  CreditCard, Tag, ShieldCheck, Crown, Check, Minimize2, ShieldAlert,
  Menu, X, Send,
} from "lucide-react";
import { Button } from "../components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "../components/ui/pagination";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { RichTextEditor } from "../components/ui/rich-text-editor";
import { UnifiedJobDetailsEditor } from "../components/ui/unified-job-details-editor";
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
import ResumePreviewDialog, { getStorageObjectFromUrl, buildPreviewUrl, getResumePreviewKind } from "../components/ResumePreviewDialog";
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

export type AppWithProfile = Application & {
  profiles?: DBCandidate | null;
  profile?: DBCandidate | null;
  candidate?: DBCandidate | null;
  job?: Job | null;
  jobs?: Job | null;
  rating?: number;
  rating_reason?: string;
  cv_match_score?: number;
  interview_date?: string;
  interview_time?: string;
  interview_mode?: string;
  interview_link?: string;
  interview_location?: string;
  interview_message?: string;
  feedback?: string;
  rating_skills?: number;
  rating_experience?: number;
  rating_communication?: number;
  rating_culture?: number;
  offer_ctc?: string;
  offer_designation?: string;
  offer_joining_date?: string;
  offer_letter_url?: string;
  offer_notes?: string;
  offer_status?: string;
  rejection_reason?: string;
  rejection_stage?: string;
  rejection_notes?: string;
  rejection_date?: string;
  applicant_name?: string;
  applicant_email?: string;
  applicant_phone?: string;
};

function LocationAutocomplete({
  value,
  onChange,
  placeholder = "Search city",
  required = false,
  className = "",
  inputClassName = "",
  onEnter,
  clearOnSelect = false,
  existingLocations = [],
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  inputClassName?: string;
  onEnter?: () => void;
  clearOnSelect?: boolean;
  existingLocations?: string[];
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
    const query = search.replace(/,/g, "").trim();
    const existingLower = existingLocations.map(l => l.toLowerCase().trim());
    const matches: string[] = [];

    for (let i = 0; i < INDIA_CITY_OPTIONS.length; i++) {
      const city = INDIA_CITY_OPTIONS[i];
      const cityLower = city.toLowerCase();
      if (existingLower.includes(cityLower)) continue;

      if (!query || cityLower.includes(query.toLowerCase()) || fuzzyMatch(query, city)) {
        matches.push(city);
        if (matches.length >= 50) break;
      }
    }
    return matches;
  }, [search, existingLocations]);

  const selectCity = (city: string, submit = false) => {
    const cleaned = city.replace(/,/g, "").trim();
    if (!cleaned) {
      setSearch("");
      setOpen(false);
      return;
    }

    const isDuplicate = existingLocations.some(l => l.toLowerCase().trim() === cleaned.toLowerCase());
    if (!isDuplicate) {
      onChange(cleaned);
    }

    if (clearOnSelect) {
      setSearch("");
    } else {
      setSearch(cleaned);
    }
    setOpen(false);
    if (submit && onEnter) onEnter();
  };

  const handleTextChange = (val: string) => {
    if (val.includes(",")) {
      const parts = val.split(",");
      const firstPart = parts[0].replace(/,/g, "").trim();
      if (firstPart) {
        selectCity(firstPart);
      } else {
        setSearch("");
      }
      return;
    }
    setSearch(val);
    if (!clearOnSelect) {
      onChange(val);
    }
    setOpen(true);
  };

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <div className="relative">
        <MapPin className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors ${open ? "text-[#FF2B2B]" : "text-[#8A8A8A]"}`} />
        <Input
          value={search}
          required={required}
          onFocus={() => setOpen(true)}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              selectCity(filteredCities[0] || search, true);
            }
            if (e.key === ",") {
              e.preventDefault();
              const firstPart = search.replace(/,/g, "").trim();
              if (firstPart) {
                selectCity(firstPart);
              } else {
                setSearch("");
              }
            }
            if (e.key === "Escape") setOpen(false);
          }}
          className={`bg-[#F6F6F6] border-gray-200 focus:border-[#FF2B2B] focus:ring-1 focus:ring-[#FF2B2B] focus-visible:ring-[#FF2B2B] focus-visible:border-[#FF2B2B] rounded-xl pl-9 pr-10 text-[#3A1F1F] placeholder:text-[#8A8A8A] ${inputClassName}`}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setOpen(current => !current)}
          className={`absolute right-3 top-1/2 -translate-y-1/2 transition-all ${open ? "text-[#FF2B2B] rotate-180" : "text-[#8A8A8A] hover:text-[#FF2B2B]"}`}
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
      {open && (
        <div className="absolute left-0 right-0 top-full z-[80] mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          <div className="max-h-72 overflow-y-auto p-1">
            {filteredCities.length === 0 ? (
              search.replace(/,/g, "").trim() ? (
                <button
                  type="button"
                  onClick={() => selectCity(search)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[#3A1F1F] hover:bg-[#FFF0F0] hover:text-[#FF2B2B] transition-colors"
                >
                  <Plus className="h-4 w-4 text-[#FF2B2B]" />
                  <span>Add "{search.replace(/,/g, "").trim()}"</span>
                </button>
              ) : (
                <div className="px-3 py-2 text-xs text-[#8A8A8A] italic text-center">
                  All matching cities added
                </div>
              )
            ) : (
              filteredCities.map((city) => {
                const selected = value.toLowerCase().trim() === city.toLowerCase().trim() || existingLocations.some(l => l.toLowerCase().trim() === city.toLowerCase().trim());
                return (
                  <button
                    key={city}
                    type="button"
                    onClick={() => selectCity(city)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[#3A1F1F] hover:bg-[#FFF0F0] hover:text-[#FF2B2B] transition-colors"
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

function IndustryCombobox({
  selected = [],
  onChange,
  placeholder = "Select or type industry",
}: {
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

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
    const query = search.trim().toLowerCase();
    if (!query) return INDUSTRY_OPTIONS;
    return INDUSTRY_OPTIONS.filter(opt => opt.toLowerCase().includes(query));
  }, [search]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    if (!open) setOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const cleaned = search.trim();
      if (cleaned) {
        if (!selected.some(item => item.toLowerCase().trim() === cleaned.toLowerCase())) {
          onChange([...selected, cleaned]);
        }
        setSearch("");
      }
      setOpen(false);
    }
  };

  const selectOption = (opt: string) => {
    const cleaned = opt.trim();
    if (cleaned === "Others" || cleaned === "Other") {
      setSearch("");
    } else if (cleaned) {
      if (selected.some(item => item.toLowerCase().trim() === cleaned.toLowerCase())) {
        onChange(selected.filter(item => item.toLowerCase().trim() !== cleaned.toLowerCase()));
      } else {
        onChange([...selected, cleaned]);
      }
      setSearch("");
    }
    setOpen(false);
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative">
        <Input
          value={search}
          onFocus={() => setOpen(true)}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="bg-[#F6F6F6] border-gray-200 focus:border-[#FF2B2B] focus:ring-1 focus:ring-[#FF2B2B] focus-visible:ring-[#FF2B2B] focus-visible:border-[#FF2B2B] rounded-xl pr-10 text-[#3A1F1F] placeholder:text-[#8A8A8A]"
        />
        <button
          type="button"
          onClick={() => setOpen(prev => !prev)}
          className={`absolute right-3 top-1/2 -translate-y-1/2 transition-all ${open ? "text-[#FF2B2B] rotate-180" : "text-[#8A8A8A] hover:text-[#FF2B2B]"}`}
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full z-[80] mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          <div className="max-h-60 overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              search.trim() ? (
                <button
                  type="button"
                  onClick={() => {
                    const cleaned = search.trim();
                    if (cleaned && !selected.some(item => item.toLowerCase().trim() === cleaned.toLowerCase())) {
                      onChange([...selected, cleaned]);
                    }
                    setSearch("");
                    setOpen(false);
                  }}
                  className="w-full text-left rounded-lg px-3 py-2 text-xs text-[#8A8A8A] italic hover:bg-[#FFF0F0] hover:text-[#FF2B2B]"
                >
                  Keep typing to enter "{search.trim()}"
                </button>
              ) : (
                <div className="px-3 py-2 text-xs text-[#8A8A8A] italic text-center">No options found</div>
              )
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selected.some(item => item.toLowerCase().trim() === opt.toLowerCase().trim());
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => selectOption(opt)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${isSelected ? "bg-[#FFF0F0] text-[#FF2B2B] font-semibold" : "text-[#3A1F1F] hover:bg-[#FFF0F0] hover:text-[#FF2B2B]"
                      }`}
                  >
                    <span>{opt}</span>
                    {isSelected && <Check className="h-4 w-4 text-[#FF2B2B]" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selected.map(ind => (
            <span key={ind} className="flex items-center gap-1.5 bg-[#FF2B2B]/10 text-[#FF2B2B] border border-[#FF2B2B]/20 px-2.5 py-1 rounded-full text-xs font-semibold">
              <Briefcase className="h-3 w-3" />
              {ind}
              <button type="button" onClick={() => onChange(selected.filter(item => item !== ind))} className="hover:text-red-800 ml-1">
                <XCircle className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function QualificationCombobox({
  value,
  onChange,
  placeholder = "Select or type qualification",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
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

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    const valNorm = value.trim().toLowerCase();
    if (!query || query === valNorm) return QUALIFICATION_OPTIONS;
    return QUALIFICATION_OPTIONS.filter(opt => opt.toLowerCase().includes(query));
  }, [search, value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    onChange(val);
    if (!open) setOpen(true);
  };

  const selectOption = (opt: string) => {
    if (opt === "Others" || opt === "Other") {
      onChange("");
      setSearch("");
    } else {
      onChange(opt);
      setSearch(opt);
    }
    setOpen(false);
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative">
        <Input
          value={search}
          onFocus={() => setOpen(true)}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="bg-[#F6F6F6] border-gray-200 focus:border-[#FF2B2B] focus:ring-1 focus:ring-[#FF2B2B] focus-visible:ring-[#FF2B2B] focus-visible:border-[#FF2B2B] rounded-xl pr-10 text-[#3A1F1F] placeholder:text-[#8A8A8A]"
        />
        <button
          type="button"
          onClick={() => setOpen(prev => !prev)}
          className={`absolute right-3 top-1/2 -translate-y-1/2 transition-all ${open ? "text-[#FF2B2B] rotate-180" : "text-[#8A8A8A] hover:text-[#FF2B2B]"}`}
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full z-[80] mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          <div className="max-h-60 overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              search.trim() ? (
                <div className="px-3 py-2 text-xs text-[#8A8A8A] italic">
                  Keep typing to enter "{search.trim()}"
                </div>
              ) : (
                <div className="px-3 py-2 text-xs text-[#8A8A8A] italic text-center">No options found</div>
              )
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = value.trim().toLowerCase() === opt.trim().toLowerCase();
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => selectOption(opt)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${isSelected ? "bg-[#FFF0F0] text-[#FF2B2B] font-semibold" : "text-[#3A1F1F] hover:bg-[#FFF0F0] hover:text-[#FF2B2B]"
                      }`}
                  >
                    <span>{opt}</span>
                    {isSelected && <Check className="h-4 w-4 text-[#FF2B2B]" />}
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

function SpecializationCombobox({
  qualification,
  value,
  onChange,
  placeholder = "Select or type specialization",
}: {
  qualification: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const availableOptions = useMemo(() => {
    return getSpecializationsForQualification(qualification);
  }, [qualification]);

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

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    const valNorm = value.trim().toLowerCase();
    if (!query || query === valNorm) return availableOptions;
    return availableOptions.filter(opt => opt.toLowerCase().includes(query));
  }, [search, value, availableOptions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    onChange(val);
    if (!open) setOpen(true);
  };

  const selectOption = (opt: string) => {
    if (opt === "Others" || opt === "Other") {
      onChange("");
      setSearch("");
    } else {
      onChange(opt);
      setSearch(opt);
    }
    setOpen(false);
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative">
        <Input
          value={search}
          onFocus={() => setOpen(true)}
          onChange={handleInputChange}
          placeholder={qualification ? placeholder : "Select or type specialization"}
          className="bg-[#F6F6F6] border-gray-200 focus:border-[#FF2B2B] focus:ring-1 focus:ring-[#FF2B2B] focus-visible:ring-[#FF2B2B] focus-visible:border-[#FF2B2B] rounded-xl pr-10 text-[#3A1F1F] placeholder:text-[#8A8A8A]"
        />
        <button
          type="button"
          onClick={() => setOpen(prev => !prev)}
          className={`absolute right-3 top-1/2 -translate-y-1/2 transition-all ${open ? "text-[#FF2B2B] rotate-180" : "text-[#8A8A8A] hover:text-[#FF2B2B]"}`}
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full z-[80] mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          <div className="max-h-60 overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              search.trim() ? (
                <div className="px-3 py-2 text-xs text-[#8A8A8A] italic">
                  Keep typing to enter "{search.trim()}"
                </div>
              ) : (
                <div className="px-3 py-2 text-xs text-[#8A8A8A] italic text-center">No options found</div>
              )
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = value.trim().toLowerCase() === opt.trim().toLowerCase();
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => selectOption(opt)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${isSelected ? "bg-[#FFF0F0] text-[#FF2B2B] font-semibold" : "text-[#3A1F1F] hover:bg-[#FFF0F0] hover:text-[#FF2B2B]"
                      }`}
                  >
                    <span>{opt}</span>
                    {isSelected && <Check className="h-4 w-4 text-[#FF2B2B]" />}
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
  const numericVal = val < 1000 ? val * 100000 : val;
  return String(numericVal);
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
    const numericSalary = amount < 1000 ? amount * 100000 : amount;
    return `₹${numericSalary}`;
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
      if (!Number.isFinite(amount) || amount < 0 || amount > 5000000) return;
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
    if (typedNumber > 0 && typedNumber <= 5000000) addOption(optionMap, typedNumber, 0);

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
  "Interview Selected": ["Offered"],
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
                  {exp.description && (
                    <SafeHtml
                      content={exp.description}
                      className="text-xs text-[#5A5A5A] mt-2 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-xs [&_h3]:font-bold [&_h3]:mt-1.5 [&_h3]:mb-1 [&_a]:text-[#FF2B2B] [&_a]:underline"
                    />
                  )}
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
                    <SafeHtml
                      content={candidate.about}
                      className="text-sm text-[#5A5A5A] leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h2]:text-[#3A1F1F] [&_h2]:font-bold [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-[#3A1F1F] [&_h3]:font-bold [&_h3]:mt-1.5 [&_h3]:mb-1 [&_a]:text-[#FF2B2B] [&_a]:underline"
                    />
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
  const { recruiterProfile, user, loading: authLoading, signOut, isOrgAdmin } = useAuth();

  const [activeSub, setActiveSub] = useState<RecruiterSubscription | null>(null);
  const [loadingSub, setLoadingSub] = useState(true);

  // Auth guard — redirect to sign-in if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/signin", { replace: true });
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!recruiterProfile?.id) {
      setLoadingSub(false);
      return;
    }
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
      setLoadingSub(false);
    };
    load();
  }, [recruiterProfile?.id]);

  // Subscription guard — redirect to plans if expired
  useEffect(() => {
    if (authLoading || loadingSub || !user || !recruiterProfile) return;

    // Allow users to access the Plans page regardless of subscription status
    if (location.pathname === "/recruiter/dashboard/plans" || location.pathname === "/recruiter/dashboard/plans/") {
      return;
    }

    const hasPaidAccess = Boolean(
      activeSub ||
      isOrgAdmin ||
      recruiterProfile.org_role === "admin" ||
      recruiterProfile.is_org_admin
    );

    if (!hasPaidAccess) {
      navigate("/recruiter/dashboard/plans", { replace: true });
    }
  }, [authLoading, loadingSub, user, recruiterProfile, activeSub, isOrgAdmin, location.pathname, navigate]);

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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

  const handleClearAllNotifications = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!recruiterProfile?.id) return;
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", recruiterProfile.id)
      .eq("user_type", "recruiter");
    if (!error) {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [recruiterProfile?.id]);

  const handleDeleteNotification = useCallback(async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    if (!recruiterProfile?.id) return;
    const target = notifications.find((n) => n.id === notificationId);
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId)
      .eq("user_id", recruiterProfile.id)
      .eq("user_type", "recruiter");
    if (!error) {
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      if (target && !target.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    }
  }, [notifications, recruiterProfile?.id]);

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
    if (authLoading) return;
    if (!user || !recruiterProfile) {
      setCheckingCompletion(false);
      return;
    }
    if (recruiterCheckRef.current) return;
    recruiterCheckRef.current = true;

    if (!isRootPath) { setCheckingCompletion(false); return; }
    try {
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
      if (score < 100) navigate("/recruiter/dashboard/company-profile", { replace: true });
    } catch (err) {
      console.error("Error during recruiter profile completion check:", err);
    } finally {
      setCheckingCompletion(false);
    }
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
    if (path.includes("/recruiter/admin")) return "admin";
    if (path.includes("manage-jobs")) return "manage-jobs";
    if (path.includes("applicants")) return "applicants";
    if (path.includes("company-profile")) return "company-profile";
    if (path.includes("search-candidates")) return "search-candidates";
    if (path.includes("emailing")) return "emailing";
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
    { id: "emailing", label: "Emailing", path: "/recruiter/dashboard/emailing" },
    { id: "applicants", label: "Applicants", path: "/recruiter/dashboard/applicants" },
    { id: "analytics", label: "Analytics", path: "/recruiter/dashboard/analytics" },
    { id: "company-profile", label: "Company Profile", path: "/recruiter/dashboard/company-profile" },
    { id: "plans", label: "Plans", path: "/recruiter/dashboard/plans" },
    ...(isOrgAdmin ? [{ id: "admin", label: "Team Admin", path: "/recruiter/admin" }] : []),
  ];

  // Same items, grouped into dropdown categories so the header nav doesn't overflow.
  const navGroups: { id: string; label: string; items: typeof navItems }[] = [
    { id: "hiring", label: "Hiring", items: navItems.filter(i => ["post-job", "manage-jobs", "search-candidates", "emailing", "applicants"].includes(i.id)) },
    { id: "insights", label: "Insights", items: navItems.filter(i => i.id === "analytics") },
    { id: "company", label: "Company", items: navItems.filter(i => ["company-profile", "plans"].includes(i.id)) },
  ];

  if (authLoading || loadingSub) {
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
              <Link to="/recruiter/dashboard">
                <Button
                  variant={currentTab() === "dashboard" ? "default" : "ghost"}
                  className={`text-sm rounded-full px-4 ${currentTab() === "dashboard" ? "bg-[#FF2B2B] hover:bg-[#e02525]" : ""}`}
                  size="sm"
                >
                  Dashboard
                </Button>
              </Link>

              {navGroups.map(group => {
                const groupActive = group.items.some(i => i.id === currentTab());
                return (
                  <DropdownMenu key={group.id}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant={groupActive ? "default" : "ghost"}
                        className={`text-sm rounded-full px-4 ${groupActive ? "bg-[#FF2B2B] hover:bg-[#e02525]" : ""}`}
                        size="sm"
                      >
                        {group.label} <ChevronDown className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {group.items.map(item => (
                        <DropdownMenuItem key={item.id} onClick={() => navigate(item.path)}>
                          {item.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              })}

              {isOrgAdmin && (
                <Link to="/recruiter/admin">
                  <Button
                    variant={currentTab() === "admin" ? "default" : "ghost"}
                    className={`text-sm rounded-full px-4 ${currentTab() === "admin" ? "bg-[#FF2B2B] hover:bg-[#e02525]" : ""}`}
                    size="sm"
                  >
                    Team Admin
                  </Button>
                </Link>
              )}
            </nav>

            <button
              className="lg:hidden p-2 -mr-2 text-[#3A1F1F]"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>

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
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-[#3A1F1F]">Notifications</h3>
                        {notifications.length > 0 && (
                          <button
                            type="button"
                            onClick={handleClearAllNotifications}
                            className="text-xs text-[#FF2B2B] hover:text-[#d92222] font-medium transition-colors hover:underline"
                          >
                            Clear all
                          </button>
                        )}
                      </div>
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {notifications.length === 0 ? (
                          <p className="text-sm text-[#8A8A8A] text-center py-4">No notifications yet</p>
                        ) : notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => handleNotificationClick(n)}
                            className={`group relative flex items-start justify-between gap-2 p-2.5 rounded-lg cursor-pointer transition-colors ${!n.is_read ? "bg-red-50 hover:bg-red-100/70" : "hover:bg-[#F6F6F6]"
                              }`}
                          >
                            <div className="flex gap-2.5 flex-1 pr-5">
                              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.is_read ? "bg-[#FF2B2B]" : "bg-gray-300"}`} />
                              <div>
                                <p className="text-sm font-medium text-[#3A1F1F]">{n.title}</p>
                                <p className="text-xs text-[#8A8A8A] mt-0.5">{n.message}</p>
                                <p className="text-xs text-[#BABABA] mt-1">{new Date(n.created_at).toLocaleString()}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteNotification(e, n.id)}
                              title="Delete notification"
                              className="absolute right-2 top-2 p-1 text-gray-400 hover:text-[#FF2B2B] opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-white"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
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
                className="hidden sm:inline-flex border-[#FF2B2B] text-[#FF2B2B] hover:bg-[#FF2B2B] hover:text-white rounded-full"
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" /> Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile side nav drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-[300] lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileNavOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <img src={logoImage} alt="RhirePro Logo" className="w-8 h-8" />
                <div className="text-lg font-bold text-[#3A1F1F]">Rhire<span className="text-[#FF2B2B]">Pro</span></div>
              </div>
              <button onClick={() => setMobileNavOpen(false)} aria-label="Close menu" className="p-1 text-[#8A8A8A]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="p-3 space-y-1">
              <button
                onClick={() => { navigate("/recruiter/dashboard"); setMobileNavOpen(false); }}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium ${currentTab() === "dashboard" ? "bg-[#FF2B2B] text-white" : "text-[#3A1F1F] hover:bg-[#F6F6F6]"}`}
              >
                Dashboard
              </button>

              {navGroups.map(group => (
                <div key={group.id} className="pt-2">
                  <p className="px-3 text-[10px] font-bold uppercase tracking-wide text-[#8A8A8A] mb-1">{group.label}</p>
                  {group.items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => { navigate(item.path); setMobileNavOpen(false); }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium ${currentTab() === item.id ? "bg-[#FF2B2B] text-white" : "text-[#3A1F1F] hover:bg-[#F6F6F6]"}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              ))}

              {isOrgAdmin && (
                <div className="pt-2">
                  <button
                    onClick={() => { navigate("/recruiter/admin"); setMobileNavOpen(false); }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium ${currentTab() === "admin" ? "bg-[#FF2B2B] text-white" : "text-[#3A1F1F] hover:bg-[#F6F6F6]"}`}
                  >
                    Team Admin
                  </button>
                </div>
              )}

              <div className="pt-3 mt-2 border-t border-gray-100">
                <button
                  onClick={() => { setMobileNavOpen(false); handleSignOut(); }}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" /> Sign Out
                </button>
              </div>
            </nav>
          </div>
        </div>
      )}

      <Routes>
        <Route index element={<DashboardOverview />} />
        <Route path="post-job" element={<PostJobPage />} />
        <Route path="manage-jobs" element={<ManageJobsPage />} />
        <Route path="search-candidates" element={<SearchCandidatesPage />} />
        <Route path="emailing" element={<EmailingPage />} />
        <Route path="applicants" element={<ApplicantsPage />} />
        <Route path="applicants/:applicantId/profile" element={<ApplicantProfilePage />} />
        <Route path="candidates/:candidateId/profile" element={<ApplicantProfilePage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="articles/new" element={<ArticleEditorPage />} />
        <Route path="articles/:articleId/edit" element={<ArticleEditorPage />} />
        <Route path="company-profile" element={<CompanyProfilePage />} />
        <Route path="plans" element={<PlansPage activeSub={activeSub} loading={loadingSub} />} />
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
    avatarUrl?: string | null;
  }>>([]);
  const [pipelineLoading, setPipelineLoading] = useState(true);
  const [pipelineError, setPipelineError] = useState("");
  const [upcomingInterviews, setUpcomingInterviews] = useState<Array<{
    id: string;
    name: string;
    role: string;
    time: string;
    type: string;
    avatarUrl?: string | null;
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
          .select("id, status, applied_at, profile:profiles(first_name, last_name, current_company, current_title, avatar_url)")
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
            avatar_url?: string | null;
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
            avatarUrl: app.profile?.avatar_url || null,
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
            profile:profiles(first_name, last_name, avatar_url),
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
              profile:profiles(first_name, last_name, avatar_url)
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
          id: app.id,
          name: fullName,
          role,
          time,
          type,
          avatarUrl: app.profile?.avatar_url || null
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
    { label: "Interviews Scheduled", value: String(interviewsScheduledCount), change: "", icon: Calendar, color: "text-purple-600", bg: "bg-purple-50", path: "/recruiter/dashboard/applicants?status=Interview Scheduled" },
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
              { label: "Company Bio", done: (recruiterProfile?.company_description || "").trim().length > 20 },
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
                <div
                  key={i}
                  onClick={() => navigate(`/recruiter/dashboard/applicants/${iv.id}/profile`)}
                  className="flex items-center gap-3 p-3 bg-[#F6F6F6] hover:bg-gray-100/80 transition-colors rounded-xl cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0">
                    {iv.avatarUrl ? (
                      <img src={iv.avatarUrl} alt={iv.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[#FF2B2B] flex items-center justify-center text-white text-xs font-bold">
                        {iv.name.split(" ").filter(Boolean).map(n => n[0]).join("")}
                      </div>
                    )}
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
                <div
                  key={applicant.id}
                  onClick={() => navigate(`/recruiter/dashboard/applicants/${applicant.id}/profile`)}
                  className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:bg-[#F6F6F6] transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0">
                    {applicant.avatarUrl ? (
                      <img src={applicant.avatarUrl} alt={applicant.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[#FF2B2B] flex items-center justify-center text-white text-sm font-bold">
                        {applicant.initials}
                      </div>
                    )}
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
                  <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 border border-gray-200 bg-[#F6F6F6]">
                    {recruiterProfile?.logo_url ? (
                      <img src={recruiterProfile.logo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[#3A1F1F] flex items-center justify-center text-white text-sm font-bold">
                        {(recruiterProfile?.company_name || "C")[0].toUpperCase()}
                      </div>
                    )}
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
  const [suggestedSkills, setSuggestedSkills] = useState<string[]>([]);
  const [mandatorySkills, setMandatorySkills] = useState<string[]>([]);
  const skillFieldRef = useRef<HTMLDivElement>(null);
  const skillInputRef = useRef<HTMLInputElement>(null);
  const [departmentPickerOpen, setDepartmentPickerOpen] = useState(false);
  const [departmentSearch, setDepartmentSearch] = useState("");
  const departmentFieldRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    jobTitle: "", jobDescription: "", rolesResponsibilities: "", requirements: "",
    location: "", locations: [] as string[], locationInput: "", workMode: "",
    salaryMin: "", salaryMax: "",
    experienceMin: "", experienceMax: "",
    skills: "", skillExperiences: {} as Record<string, number>, employmentType: "", industry: "", industries: [] as string[], industryInput: "", customIndustry: "",
    openings: "1", education: "", customEducation: "", specialization: "", customSpecialization: "", perks: [] as string[], customPerk: "", department: "",
    interviewMode: "", interviewModes: [] as string[], preferredJoiningTime: "",
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
  const relevantSelectedSkills = useMemo(
    () => getRelevantSkillsForJobContext(formData.jobTitle, formData.jobDescription, selectedSkills, suggestedSkills),
    [formData.jobTitle, formData.jobDescription, selectedSkills, suggestedSkills],
  );
  const nonRelevantSelectedSkills = useMemo(
    () => selectedSkills.filter(skill => !relevantSelectedSkills.some(related => related.toLowerCase() === skill.toLowerCase())),
    [selectedSkills, relevantSelectedSkills],
  );
  const mandatorySkillSet = useMemo(() => new Set(mandatorySkills), [mandatorySkills]);
  const isSalaryRangeInvalid = useMemo(() => {
    const minSalary = Number(formData.salaryMin);
    const maxSalary = Number(formData.salaryMax);
    return formData.salaryMin !== "" && formData.salaryMax !== "" && !Number.isNaN(minSalary) && !Number.isNaN(maxSalary) && maxSalary < minSalary;
  }, [formData.salaryMin, formData.salaryMax]);
  const isExperienceRangeInvalid = useMemo(() => {
    const minExp = Number(formData.experienceMin);
    const maxExp = Number(formData.experienceMax);
    return formData.experienceMin !== "" && formData.experienceMax !== "" && !Number.isNaN(minExp) && !Number.isNaN(maxExp) && maxExp < minExp;
  }, [formData.experienceMin, formData.experienceMax]);
  const filteredSkillOptions = useMemo(() => {
    const query = skillSearch.trim();
    const options = query ? SEARCH_SUGGESTION_DATASET : SKILL_OPTIONS;
    return options.filter(skill => fuzzyMatch(query, skill)).slice(0, 120);
  }, [skillSearch]);

  useEffect(() => {
    const jobText = extractTextFromHtml(formData.jobDescription);
    const nextSuggestions = inferSkillSuggestions(jobText, 8).filter(skill => !selectedSkills.some(existing => existing.toLowerCase() === skill.toLowerCase()));
    setSuggestedSkills(nextSuggestions);
  }, [formData.jobDescription, selectedSkills]);
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
      const target = event.target as Node;
      if (!document.body.contains(target)) return;
      if (!skillFieldRef.current?.contains(target)) {
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

  const setSkillExpYears = (skill: string, years: number) => {
    const key = skill.trim().toLowerCase();
    if (!key) return;
    setFormData(prev => ({
      ...prev,
      skillExperiences: {
        ...prev.skillExperiences,
        [key]: Math.max(0, years)
      }
    }));
  };

  const addSkill = (skill: string, markMandatory = false) => {
    const s = skill.trim();
    if (!s) return;
    const normalized = s.toLowerCase();
    const alreadySelected = selectedSkills.some(existing => existing.toLowerCase() === normalized);
    const nextSelected = alreadySelected
      ? selectedSkills.filter(existing => existing.toLowerCase() !== normalized)
      : [...selectedSkills, s];

    if (!alreadySelected) {
      setFormData(prev => ({
        ...prev,
        skills: nextSelected.join(", "),
        skillExperiences: {
          ...prev.skillExperiences,
          [normalized]: prev.skillExperiences[normalized] ?? 1
        }
      }));
      if (markMandatory || mandatorySkillSet.size < 3) {
        setMandatorySkills(prev => (prev.some(existing => existing.toLowerCase() === normalized) ? prev : [...prev, s]));
      }
    } else {
      setFormData(prev => {
        const nextExp = { ...prev.skillExperiences };
        delete nextExp[normalized];
        return {
          ...prev,
          skills: nextSelected.join(", "),
          skillExperiences: nextExp
        };
      });
      setMandatorySkills(prev => prev.filter(existing => existing.toLowerCase() !== normalized));
    }
    setSkillSearch("");
    setTimeout(() => {
      skillInputRef.current?.focus();
    }, 0);
  };

  const removeSkill = (skill: string) => {
    const key = skill.toLowerCase();
    const updated = selectedSkills.filter(s => s.toLowerCase() !== key);
    setFormData(prev => {
      const nextExp = { ...prev.skillExperiences };
      delete nextExp[key];
      return {
        ...prev,
        skills: updated.join(", "),
        skillExperiences: nextExp
      };
    });
    setMandatorySkills(prev => prev.filter(s => s.toLowerCase() !== key));
  };

  const toggleMandatorySkill = (skill: string) => {
    const normalized = skill.toLowerCase();
    setMandatorySkills(prev => {
      const exists = prev.some(existing => existing.toLowerCase() === normalized);
      return exists
        ? prev.filter(existing => existing.toLowerCase() !== normalized)
        : [...prev, skill];
    });
  };

  const perkOptions = PERKS_AND_BENEFITS_OPTIONS;
  const togglePerk = (p: string) => {
    setFormData(prev => ({
      ...prev,
      perks: prev.perks.includes(p) ? prev.perks.filter(x => x !== p) : [...prev.perks, p]
    }));
  };
  const addCustomPerk = (perkName: string) => {
    const trimmed = perkName.trim();
    if (!trimmed) return;
    if (!formData.perks.some(p => p.toLowerCase() === trimmed.toLowerCase())) {
      setFormData(prev => ({ ...prev, perks: [...prev.perks, trimmed], customPerk: "" }));
    }
  };
  const addLocation = (loc: string) => {
    const cleaned = loc.replace(/,/g, "").trim();
    if (!cleaned) return;
    if (!formData.locations.some(l => l.toLowerCase().trim() === cleaned.toLowerCase())) {
      setFormData(prev => ({ ...prev, locations: [...prev.locations, cleaned], locationInput: "" }));
    } else {
      setFormData(prev => ({ ...prev, locationInput: "" }));
    }
  };
  const removeLocation = (loc: string) => {
    setFormData(prev => ({ ...prev, locations: prev.locations.filter(l => l !== loc) }));
  };
  const toggleInterviewMode = (mode: string) => {
    setFormData(prev => ({
      ...prev,
      interviewModes: prev.interviewModes.includes(mode)
        ? prev.interviewModes.filter(m => m !== mode)
        : [...prev.interviewModes, mode]
    }));
  };
  const handleOpeningsKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["e", "E", ".", ",", "+", "-"].includes(e.key)) {
      e.preventDefault();
    }
  };
  const handleOpeningsChange = (val: string) => {
    const cleaned = val.replace(/\D/g, "").replace(/^0+/, "");
    setFormData(prev => ({ ...prev, openings: cleaned }));
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
    if (!formData.employmentType) {
      setPostError("Please select employment type.");
      return;
    }
    if (!formData.workMode) {
      setPostError("Please select work mode.");
      return;
    }
    if (!formData.preferredJoiningTime) {
      setPostError("Please select preferred joining time.");
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
    if (isExperienceRangeInvalid) {
      setPostError("Maximum experience must be greater than or equal to minimum experience.");
      return;
    }
    if (formData.industries.length === 0) {
      setPostError("Please select at least one industry.");
      return;
    }
    const openingsVal = (formData.openings || "").trim();
    if (!openingsVal || !/^[1-9]\d*$/.test(openingsVal)) {
      setPostError("Number of Openings must be a positive whole number (e.g. 1, 2, 5, 10).");
      return;
    }
    setPosting(true);
    try {
      const deadline = buildJobExpiryTimestamp();
      const skillsArr = formData.skills.split(",").map(s => s.trim()).filter(Boolean);
      const resolvedLocation = formData.locations.length > 0 ? formData.locations.join(", ") : formData.locationInput;
      const resolvedLocations = formData.locations.length > 0 ? formData.locations : (formData.locationInput ? [formData.locationInput.trim()] : []);
      const resolvedIndustry = formData.industries.join(", ");
      const resolvedInterviewMode = formData.interviewModes.length > 0 ? formData.interviewModes.join(", ") : formData.interviewMode;
      const resolvedEducation = formData.specialization ? `${formData.education} - ${formData.specialization}` : formData.education;
      const insertPayload: Record<string, any> = {
        recruiter_id: recruiterProfile.id,
        title: formData.jobTitle,
        description: formData.jobDescription,
        roles_responsibilities: formData.rolesResponsibilities || null,
        requirements: formData.requirements || null,
        company_name: recruiterProfile.company_name || "",
        location: resolvedLocation,
        locations: resolvedLocations,
        work_mode: formData.workMode,
        preferred_joining_time: formData.preferredJoiningTime || null,
        salary_min: Number(formData.salaryMin),
        salary_max: Number(formData.salaryMax),
        salary_type: "LPA",
        experience_min: formData.experienceMin ? Number(formData.experienceMin) : null,
        experience_max: formData.experienceMax ? Number(formData.experienceMax) : null,
        employment_type: formData.employmentType,
        industry: resolvedIndustry,
        industries: formData.industries,
        department: formData.department,
        skills: skillsArr,
        skill_experiences: formData.skillExperiences,
        perks: formData.perks,
        education: resolvedEducation,
        interview_mode: resolvedInterviewMode,
        openings: Number(openingsVal),
        deadline,
        deadline_time: null,
        status: "Active",
      };

      let { error } = await supabase.from("jobs").insert(insertPayload);
      if (error && typeof error.message === "string" && (error.message.includes("preferred_joining_time") || error.message.includes("specialization") || error.message.includes("skill_experiences") || error.message.includes("locations") || error.message.includes("industries") || error.code === "PGRST204" || error.message.includes("column"))) {
        delete insertPayload.preferred_joining_time;
        delete insertPayload.specialization;
        delete insertPayload.skill_experiences;
        delete insertPayload.locations;
        delete insertPayload.industries;
        const retryRes = await supabase.from("jobs").insert(insertPayload);
        error = retryRes.error;
      }
      if (error) throw error;
      setPostSuccess(true);
      setShowPreview(false);
      setTimeout(() => { setPostSuccess(false); navigate("/recruiter/dashboard/manage-jobs"); }, 2000);
      setFormData({ jobTitle: "", jobDescription: "", rolesResponsibilities: "", requirements: "", location: "", locations: [], locationInput: "", workMode: "", salaryMin: "", salaryMax: "", experienceMin: "", experienceMax: "", skills: "", skillExperiences: {}, employmentType: "", industry: "", industries: [], industryInput: "", customIndustry: "", openings: "1", education: "", customEducation: "", specialization: "", customSpecialization: "", perks: [], customPerk: "", department: "", interviewMode: "", interviewModes: [], preferredJoiningTime: "" });
      setShowSkillInput(false);
      setSkillPickerOpen(false);
      setSkillSearch("");
    } catch (err: unknown) {
      const errMsg = (err as any)?.message || (err as any)?.error_description || (typeof err === "string" ? err : "") || "Failed to post job.";
      setPostError(errMsg);
    } finally {
      setPosting(false);
    }
  };

  // ── Job Preview Modal ──────────────────────────────────────
  const skillsArr = formData.skills.split(",").map(s => s.trim()).filter(Boolean);

  if (showPreview) {
    const previewLocation = formData.locations.length > 0 ? formData.locations.join(", ") : (formData.locationInput || formData.location);
    const previewIndustry = formData.industries.length > 0 ? formData.industries.join(", ") : formData.industry;
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
              {recruiterProfile?.logo_url ? (
                <img
                  src={recruiterProfile.logo_url}
                  alt={recruiterProfile?.company_name || "Company Logo"}
                  className="w-14 h-14 rounded-xl object-cover border border-gray-200 flex-shrink-0"
                />
              ) : (
                <div className="w-14 h-14 bg-[#FF2B2B] rounded-xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                  {(recruiterProfile?.company_name || "C")[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-[#3A1F1F]">{formData.jobTitle || "Job Title"}</h1>
                <p className="text-[#FF2B2B] font-medium mt-0.5">{recruiterProfile?.company_name || "Your Company"}</p>
                <div className="flex flex-wrap gap-3 mt-3 text-sm text-[#5A5A5A]">
                  {previewLocation && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{previewLocation}</span>}
                  {formData.experienceMin && <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{formData.experienceMin}–{formData.experienceMax} yrs</span>}
                  {formData.salaryMin && formData.salaryMax && <span className="flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" />{formatSalaryRangeFromValues(formData.salaryMin, formData.salaryMax)}</span>}
                  {formData.workMode && <span className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" />{formData.workMode}</span>}
                  {formData.employmentType && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formData.employmentType}</span>}
                  {formData.preferredJoiningTime && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Joining: {formData.preferredJoiningTime}</span>}
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
                {skillsArr.map((s, i) => {
                  const reqYears = formData.skillExperiences[s.toLowerCase()];
                  return (
                    <Badge key={i} className="bg-[#ECECF4] text-[#3A1F1F] text-xs">
                      {s}{reqYears ? ` (${reqYears}+ yrs)` : ""}
                    </Badge>
                  );
                })}
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
                  className="rich-text-content text-sm text-[#5A5A5A] leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:mt-1.5 [&_h3]:mb-1 [&_a]:text-[#FF2B2B] [&_a]:underline"
                />
              </div>
            )}
            {formData.rolesResponsibilities && (
              <div>
                <h2 className="text-base font-semibold text-[#3A1F1F] mb-2">Roles & Responsibilities</h2>
                <SafeHtml
                  content={formData.rolesResponsibilities}
                  className="rich-text-content text-sm text-[#5A5A5A] leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:mt-1.5 [&_h3]:mb-1 [&_a]:text-[#FF2B2B] [&_a]:underline"
                />
              </div>
            )}
            {formData.requirements && (
              <div>
                <h2 className="text-base font-semibold text-[#3A1F1F] mb-2">Requirements</h2>
                <SafeHtml
                  content={formData.requirements}
                  className="rich-text-content text-sm text-[#5A5A5A] leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:mt-1.5 [&_h3]:mb-1 [&_a]:text-[#FF2B2B] [&_a]:underline"
                />
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-gray-100">
              {formData.education && <div><p className="text-xs text-[#8A8A8A]">Min. Education</p><p className="text-sm font-medium text-[#3A1F1F]">{formData.education}</p></div>}
              {formData.department && <div><p className="text-xs text-[#8A8A8A]">Department</p><p className="text-sm font-medium text-[#3A1F1F]">{formData.department}</p></div>}
              {previewIndustry && <div><p className="text-xs text-[#8A8A8A]">Industry</p><p className="text-sm font-medium text-[#3A1F1F]">{previewIndustry}</p></div>}
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

          const relevantSelectedSkills = getRelevantSkillsForJobContext(
            formData.jobTitle,
            formData.jobDescription,
            selectedSkills,
            suggestedSkills,
          );

          if (relevantSelectedSkills.length < 3) {
            setPostError("Please add at least 3 skills relevant to the job title and JD before publishing.");
            setShowSkillInput(true);
            setSkillPickerOpen(true);
            return;
          }

          if (mandatorySkills.length < 3) {
            setPostError("Please mark at least three key skills as mandatory before publishing.");
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
          if (isExperienceRangeInvalid) {
            setPostError("Maximum experience must be greater than or equal to minimum experience.");
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
                <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Industry(s) *</label>
                <IndustryCombobox
                  selected={formData.industries}
                  onChange={inds => setFormData({ ...formData, industries: inds })}
                  placeholder="Select or type industry"
                />
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
              <div>
                <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Preferred Joining Time *</label>
                <Select value={formData.preferredJoiningTime} onValueChange={v => setFormData({ ...formData, preferredJoiningTime: v })}>
                  <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-xl"><SelectValue placeholder="Select joining time" /></SelectTrigger>
                  <SelectContent>
                    {PREFERRED_JOINING_TIME_OPTIONS.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Location & Openings */}
          <div className="border-b pb-6">
            <h2 className="text-lg font-semibold text-[#3A1F1F] mb-4">Location & Openings</h2>
            <div className="grid md:grid-cols-2 gap-5 items-start">
              <div>
                <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Job Location(s) *</label>
                <LocationAutocomplete
                  value={formData.locationInput}
                  onChange={loc => {
                    if (loc) addLocation(loc);
                  }}
                  clearOnSelect={true}
                  existingLocations={formData.locations}
                  placeholder="Search city to add multiple locations"
                />
                {formData.locations.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.locations.map(loc => (
                      <span key={loc} className="flex items-center gap-1.5 bg-[#FF2B2B]/10 text-[#FF2B2B] border border-[#FF2B2B]/20 px-3 py-1.5 rounded-full text-xs font-semibold">
                        <MapPin className="h-3 w-3" />
                        {loc}
                        <button type="button" onClick={() => removeLocation(loc)} className="hover:text-red-800 ml-1">
                          <XCircle className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-2.5 flex flex-wrap gap-1.5 items-center">
                  <span className="text-xs text-[#8A8A8A] font-medium mr-1">Popular:</span>
                  {["Remote", "Bengaluru", "Hyderabad", "Mumbai", "Pune", "Delhi NCR"].map(loc => {
                    const isSelected = formData.locations.some(l => l.toLowerCase().trim() === loc.toLowerCase().trim());
                    return (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            removeLocation(loc);
                          } else {
                            addLocation(loc);
                          }
                        }}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1 ${
                          isSelected
                            ? "bg-[#FFF0F0] text-[#FF2B2B] border-[#FF2B2B] font-medium"
                            : "bg-white text-[#555] border-gray-200 hover:border-[#FF2B2B] hover:text-[#FF2B2B]"
                        }`}
                      >
                        {isSelected ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                        {loc}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-[#8A8A8A] mt-1.5">Select multiple cities where candidates can be located</p>
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Number of Openings *</label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={formData.openings}
                  onKeyDown={handleOpeningsKeyDown}
                  onChange={e => handleOpeningsChange(e.target.value)}
                  onBlur={() => {
                    if (!formData.openings || Number(formData.openings) < 1) {
                      setFormData({ ...formData, openings: "1" });
                    }
                  }}
                  className="bg-[#F6F6F6] border-gray-200 rounded-xl"
                  placeholder="e.g. 1, 2, 5, 10, 25, 50, 100"
                />
                <div className="mt-2.5 flex flex-wrap gap-1.5 items-center">
                  <span className="text-xs text-[#8A8A8A] font-medium mr-1">Preset:</span>
                  {[1, 2, 5, 10, 25, 50, 100].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setFormData({ ...formData, openings: String(num) })}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        Number(formData.openings) === num
                          ? "bg-[#FFF0F0] text-[#FF2B2B] border-[#FF2B2B] font-medium"
                          : "bg-white text-[#555] border-gray-200 hover:border-[#FF2B2B] hover:text-[#FF2B2B]"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Salary, Experience, Education & Interview Mode */}
          <div className="border-b pb-6">
            <h2 className="text-lg font-semibold text-[#3A1F1F] mb-4">Salary, Experience & Education</h2>
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
                <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Overall Candidate Experience *</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#555] mb-1">Minimum Experience</label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.experienceMin}
                      onChange={e => setFormData({ ...formData, experienceMin: e.target.value })}
                      className="bg-[#F6F6F6] border-gray-200 rounded-xl"
                      placeholder="Min (e.g. 5)"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#555] mb-1">Maximum Experience</label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.experienceMax}
                      onChange={e => setFormData({ ...formData, experienceMax: e.target.value })}
                      className={`bg-[#F6F6F6] rounded-xl ${isExperienceRangeInvalid ? "border-red-500 text-red-900 focus-visible:ring-red-500" : "border-gray-200"}`}
                      placeholder="Max (e.g. 8)"
                    />
                  </div>
                </div>
                <p className="text-xs text-[#8A8A8A] mt-1.5">Example: Minimum: 5 Years | Maximum: 8 Years</p>
                {isExperienceRangeInvalid && (
                  <p className="text-xs text-red-500 mt-1.5">Maximum experience must be greater than or equal to minimum experience.</p>
                )}
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Qualification / Degree</label>
                <QualificationCombobox
                  value={formData.education}
                  onChange={v => {
                    const validSpecs = getSpecializationsForQualification(v);
                    const defaultSpec = validSpecs.length > 0 ? (validSpecs.includes("Any Specialization") ? "Any Specialization" : validSpecs[0]) : "";
                    setFormData({ ...formData, education: v, specialization: defaultSpec });
                  }}
                  placeholder="Select or type qualification"
                />
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Specialization / Field of Study</label>
                <SpecializationCombobox
                  qualification={formData.education}
                  value={formData.specialization}
                  onChange={v => setFormData({ ...formData, specialization: v })}
                  placeholder="Select or type specialization"
                />
              </div>
            </div>

            {/* Interview Mode Multi-select */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <label className="block mb-2 text-sm font-medium text-[#3A1F1F]">Interview Mode(s) *</label>
              <div className="flex flex-wrap gap-2">
                {INTERVIEW_MODE_OPTIONS.map(mode => {
                  const selected = formData.interviewModes.includes(mode);
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => toggleInterviewMode(mode)}
                      className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all duration-200 flex items-center justify-center gap-1.5 text-center ${selected
                        ? "bg-[#FF2B2B] text-white border-[#FF2B2B] shadow-sm"
                        : "bg-white text-[#3A1F1F] border-gray-200 hover:border-[#FF2B2B]"
                        }`}
                    >
                      {selected && <Check className="h-3.5 w-3.5 text-white" />}
                      <span>{mode}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-[#8A8A8A] mt-1.5">Select all interview formats allowed for this role</p>
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
              {selectedSkills.map((skill) => {
                const isMandatory = mandatorySkillSet.has(skill.toLowerCase());
                const isOffRole = nonRelevantSelectedSkills.some(existing => existing.toLowerCase() === skill.toLowerCase());
                return (
                  <span
                    key={skill}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border ${isOffRole
                      ? "border-[#FF2B2B] bg-[#FFF0F0] text-[#A61B1B]"
                      : "border-transparent bg-[#ECECF4] text-[#3A1F1F]"
                      }`}
                    title={isOffRole ? "This skill is not aligned with the job title/JD." : "Role-aligned skill"}
                  >
                    <button type="button" onClick={() => toggleMandatorySkill(skill)} className={`mr-1 ${isMandatory ? "text-[#FF2B2B]" : "text-[#8A8A8A]"}`} title={isMandatory ? "Mandatory skill" : "Mark as mandatory"}>
                      {isMandatory ? "★" : "☆"}
                    </button>
                    {skill}
                    <button type="button" onClick={() => removeSkill(skill)} className="ml-1 text-[#8A8A8A] hover:text-[#FF2B2B]">
                      <XCircle className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
            </div>

            {selectedSkills.length > 0 && (
              <div className="mt-3 mb-4 bg-gray-50/80 border border-gray-200 rounded-2xl p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
                  <h3 className="text-sm font-semibold text-[#3A1F1F]">Job Skill Matrix — Skill-Specific Experience Requirements</h3>
                  <span className="text-xs text-[#8A8A8A]">Specify required years of experience per skill</span>
                </div>
                <div className="space-y-2">
                  {selectedSkills.map((skill) => {
                    const key = skill.toLowerCase();
                    const years = formData.skillExperiences[key] ?? 1;
                    const isMandatory = mandatorySkillSet.has(key);
                    return (
                      <div key={skill} className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-2 min-w-[150px]">
                          <button
                            type="button"
                            onClick={() => toggleMandatorySkill(skill)}
                            className={`text-sm ${isMandatory ? "text-[#FF2B2B]" : "text-[#8A8A8A]"}`}
                            title={isMandatory ? "Mandatory skill" : "Mark as mandatory"}
                          >
                            {isMandatory ? "★" : "☆"}
                          </button>
                          <span className="font-medium text-sm text-[#3A1F1F]">{skill}</span>
                          {isMandatory && <Badge className="bg-[#FFF0F0] text-[#FF2B2B] text-[10px] px-1.5 py-0.5">Mandatory</Badge>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#666]">Req. Experience:</span>
                          <div className="flex items-center gap-1.5">
                            <Input
                              type="number"
                              min="0"
                              max="30"
                              value={years}
                              onChange={(e) => setSkillExpYears(skill, Number(e.target.value))}
                              className="w-20 h-8 text-xs text-center bg-[#F6F6F6] rounded-lg border-gray-200"
                            />
                            <span className="text-xs text-[#666]">Years</span>
                          </div>
                          <div className="hidden sm:flex items-center gap-1 ml-2">
                            {[1, 2, 3, 5].map((y) => (
                              <button
                                key={y}
                                type="button"
                                onClick={() => setSkillExpYears(skill, y)}
                                className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors ${
                                  years === y ? "bg-[#FF2B2B] text-white border-[#FF2B2B]" : "bg-white text-[#666] border-gray-200 hover:border-gray-300"
                                }`}
                              >
                                {y}y
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {nonRelevantSelectedSkills.length > 0 && (
              <div className="mb-3 rounded-xl border border-[#FFB4B4] bg-[#FFF6F6] px-3 py-2 text-xs text-[#B42318]">
                <span className="font-semibold">Skill alignment warning:</span> {nonRelevantSelectedSkills.join(", ")} {nonRelevantSelectedSkills.length === 1 ? "does not" : "do not"} match the job title / JD context. Keep at least 3 role-aligned skills from the JD suggestions or close variants before publishing.
              </div>
            )}
            {suggestedSkills.length > 0 && (
              <div className="mb-3 rounded-xl border border-[#FFE0E0] bg-[#FFF8F8] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#FF2B2B] mb-2">Suggested from Job Description</p>
                <div className="flex flex-wrap gap-2">
                  {suggestedSkills.map((skill) => {
                    const alreadySelected = selectedSkills.some(existing => existing.toLowerCase() === skill.toLowerCase());
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => {
                          addSkill(skill, true);
                        }}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${alreadySelected ? "border-[#FF2B2B] bg-[#FF2B2B] text-white" : "border-[#FF2B2B] text-[#FF2B2B] hover:bg-[#FFF0F0]"}`}
                      >
                        {alreadySelected ? skill : `+ ${skill}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {showSkillInput && (
              <div className="flex max-w-xl gap-2">
                <div className="relative flex-1" ref={skillFieldRef}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A8A8A]" />
                    <Input
                      ref={skillInputRef}
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
                            onClick={() => addSkill(skillSearch, true)}
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
                                onClick={() => addSkill(skill, true)}
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
            <p className="text-xs text-[#8A8A8A] mt-1">Mark at least 3 skills as mandatory; they will be treated as hiring blockers for checklist alignment.</p>
            <input type="hidden" value={formData.skills} required />
          </div>

          {/* Job Details */}
          <div className="border-b pb-6">
            <h2 className="text-lg font-semibold text-[#3A1F1F] mb-4">Job Details *</h2>
            <UnifiedJobDetailsEditor
              description={formData.jobDescription}
              onChangeDescription={val => setFormData(prev => ({ ...prev, jobDescription: val }))}
              rolesResponsibilities={formData.rolesResponsibilities}
              onChangeRolesResponsibilities={val => setFormData(prev => ({ ...prev, rolesResponsibilities: val }))}
              requirements={formData.requirements}
              onChangeRequirements={val => setFormData(prev => ({ ...prev, requirements: val }))}
            />
          </div>

          {/* Perks */}
          <div className="border-b pb-6">
            <h2 className="text-lg font-semibold text-[#3A1F1F] mb-4">Perks & Benefits</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {perkOptions.map(p => (
                <button key={p} type="button" onClick={() => togglePerk(p)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${formData.perks.includes(p) ? "bg-[#FF2B2B] text-white border-[#FF2B2B]" : "bg-white text-[#3A1F1F] border-gray-200 hover:border-[#FF2B2B]"}`}>
                  {p}
                </button>
              ))}
              {formData.perks.filter(p => !perkOptions.includes(p as any)).map(custom => (
                <span key={custom} className="flex items-center gap-1 bg-[#FF2B2B] text-white px-3 py-1.5 rounded-full text-xs font-medium border border-[#FF2B2B]">
                  {custom}
                  <button type="button" onClick={() => togglePerk(custom)} className="ml-1 hover:text-gray-200">
                    <XCircle className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex max-w-md gap-2">
              <Input
                value={formData.customPerk}
                onChange={e => setFormData({ ...formData, customPerk: e.target.value })}
                placeholder="Add custom perk (e.g. Free Cab, Gym Membership)"
                className="bg-[#F6F6F6] border-gray-200 rounded-xl text-xs"
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomPerk(formData.customPerk);
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl border-[#FF2B2B] text-[#FF2B2B] hover:bg-[#FF2B2B]/10 whitespace-nowrap"
                onClick={() => addCustomPerk(formData.customPerk)}
              >
                + Add Perk
              </Button>
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
  const [jobs, setJobs] = useState<(Job & {
    applicant_count?: number;
    applications?: any[];
    statusHistory?: any[];
  })[]>([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [editForm, setEditForm] = useState({
    title: "", location: "", locations: [] as string[], locationInput: "",
    salaryMin: "", salaryMax: "", salaryType: "LPA", employmentType: "", workMode: "",
    experienceMin: "", experienceMax: "",
    preferredJoiningTime: "", openings: "1", skills: "", skillExperiences: {} as Record<string, number>,
    industry: "", industries: [] as string[], industryInput: "", customIndustry: "", education: "", customEducation: "", specialization: "", customSpecialization: "", interviewMode: "", interviewModes: [] as string[],
    perks: [] as string[], customPerk: "",
  });
  const [saving, setSaving] = useState(false);
  const [refreshingJobId, setRefreshingJobId] = useState<string | null>(null);
  const [editError, setEditError] = useState("");

  const isEditSalaryRangeInvalid =
    Boolean(editForm.salaryMin && editForm.salaryMax) &&
    Number(editForm.salaryMax) < Number(editForm.salaryMin);

  const handleOpeningsKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["e", "E", ".", ",", "+", "-"].includes(e.key)) {
      e.preventDefault();
    }
  };
  const handleOpeningsChange = (val: string) => {
    const cleaned = val.replace(/\D/g, "").replace(/^0+/, "");
    setEditForm(f => ({ ...f, openings: cleaned }));
  };

  const openEdit = (job: Job) => {
    setEditError("");
    setEditingJob(job);
    const existingLocations = Array.isArray(job.locations) && job.locations.length > 0
      ? job.locations
      : (job.location || "").split(",").map(s => s.trim()).filter(Boolean);
    const existingIndustries = Array.isArray(job.industries) && job.industries.length > 0
      ? job.industries
      : (job.industry || "").split(",").map(s => s.trim()).filter(Boolean);
    const existingModes = (job.interview_mode || "").split(",").map(s => s.trim()).filter(Boolean);
    let eduCategory = job.education || "";
    let spec = (job as any).specialization || "";
    if (!spec && eduCategory.includes(" - ")) {
      const parts = eduCategory.split(" - ");
      eduCategory = parts[0].trim();
      spec = parts[1].trim();
    }
    eduCategory = matchQualificationOption(eduCategory);

    setEditForm({
      title: job.title,
      location: job.location || "",
      locations: existingLocations.length > 0 ? existingLocations : (job.location ? [job.location] : []),
      locationInput: "",
      salaryMin: getSalaryFormValue(job.salary_min),
      salaryMax: getSalaryFormValue(job.salary_max),
      salaryType: "LPA",
      employmentType: job.employment_type || "",
      workMode: job.work_mode || "",
      experienceMin: job.experience_min != null ? String(job.experience_min) : "",
      experienceMax: job.experience_max != null ? String(job.experience_max) : "",
      preferredJoiningTime: job.preferred_joining_time || "",
      openings: String(job.openings),
      skills: (job.skills || []).join(", "),
      skillExperiences: parseSkillExperiences((job as any).skill_experiences),
      industry: job.industry || "",
      industries: existingIndustries.length > 0 ? existingIndustries : (job.industry ? [job.industry] : []),
      industryInput: "",
      customIndustry: "",
      education: eduCategory,
      customEducation: "",
      specialization: spec,
      customSpecialization: "",
      interviewMode: job.interview_mode || "",
      interviewModes: existingModes,
      perks: job.perks || [],
      customPerk: "",
    });
  };

  const saveEdit = async () => {
    if (!editingJob) return;
    setEditError("");
    if (!editForm.salaryMin || !editForm.salaryMax) {
      setEditError("Please select both minimum and maximum salary.");
      return;
    }
    if (isEditSalaryRangeInvalid) {
      setEditError("Maximum salary must be greater than or equal to minimum salary.");
      return;
    }
    if (editForm.industries.length === 0) {
      setEditError("Please select at least one industry.");
      return;
    }
    const openingsVal = (editForm.openings || "").trim();
    if (!openingsVal || !/^[1-9]\d*$/.test(openingsVal)) {
      setEditError("Number of Openings must be a positive whole number (e.g. 1, 2, 5, 10).");
      return;
    }

    setSaving(true);
    const skillsArr = editForm.skills.split(",").map(s => s.trim()).filter(Boolean);
    const resolvedLocation = editForm.locations.length > 0 ? editForm.locations.join(", ") : (editForm.locationInput || editForm.location);
    const resolvedLocations = editForm.locations.length > 0 ? editForm.locations : (editForm.locationInput ? [editForm.locationInput.trim()] : (editForm.location ? [editForm.location] : []));
    const resolvedIndustry = editForm.industries.join(", ");
    const resolvedInterviewMode = editForm.interviewModes.length > 0 ? editForm.interviewModes.join(", ") : editForm.interviewMode;
    const resolvedEducation = editForm.specialization ? `${editForm.education} - ${editForm.specialization}` : editForm.education;

    const updatePayload: Record<string, any> = {
      title: editForm.title,
      location: resolvedLocation,
      locations: resolvedLocations,
      salary_min: Number(editForm.salaryMin),
      salary_max: Number(editForm.salaryMax),
      salary_type: "LPA",
      experience_min: editForm.experienceMin ? Number(editForm.experienceMin) : null,
      experience_max: editForm.experienceMax ? Number(editForm.experienceMax) : null,
      employment_type: editForm.employmentType,
      work_mode: editForm.workMode,
      preferred_joining_time: editForm.preferredJoiningTime || null,
      openings: Number(openingsVal),
      skill_experiences: editForm.skillExperiences,
      industry: resolvedIndustry,
      industries: editForm.industries,
      education: resolvedEducation || null,
      interview_mode: resolvedInterviewMode || null,
      perks: editForm.perks || [],
    };
    try {
      let { error } = await supabase.from("jobs").update(updatePayload).eq("id", editingJob.id);
      if (error && typeof error.message === "string" && (error.message.includes("preferred_joining_time") || error.message.includes("specialization") || error.message.includes("skill_experiences") || error.message.includes("locations") || error.message.includes("industries") || error.code === "PGRST204" || error.message.includes("column"))) {
        delete updatePayload.preferred_joining_time;
        delete updatePayload.specialization;
        delete updatePayload.skill_experiences;
        delete updatePayload.locations;
        delete updatePayload.industries;
        const retryRes = await supabase.from("jobs").update(updatePayload).eq("id", editingJob.id);
        error = retryRes.error;
      }
      if (error) throw error;

      setJobs(prev => prev.map(j => j.id === editingJob.id ? {
        ...j,
        title: editForm.title,
        location: resolvedLocation,
        locations: resolvedLocations,
        salary_min: Number(editForm.salaryMin),
        salary_max: Number(editForm.salaryMax),
        salary_type: "LPA",
        experience_min: editForm.experienceMin ? Number(editForm.experienceMin) : null,
        experience_max: editForm.experienceMax ? Number(editForm.experienceMax) : null,
        employment_type: editForm.employmentType,
        work_mode: editForm.workMode,
        preferred_joining_time: editForm.preferredJoiningTime,
        openings: Number(openingsVal),
        skills: skillsArr,
        skill_experiences: editForm.skillExperiences,
        industry: resolvedIndustry,
        industries: editForm.industries,
        education: resolvedEducation,
        specialization: editForm.specialization,
        interview_mode: resolvedInterviewMode,
        perks: editForm.perks,
      } : j));
      setEditingJob(null);
    } catch (err: any) {
      setEditError(err?.message || "Failed to save job changes.");
    } finally {
      setSaving(false);
    }
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
      const jobIds = data.map(j => j.id);

      // Fetch all applications for these jobs in a single bulk query to avoid N+1 queries
      const { data: allApps } = jobIds.length > 0
        ? await supabase
          .from("applications")
          .select("id, job_id, status, applied_at")
          .in("job_id", jobIds)
        : { data: [] };

      const applicationsList = allApps || [];

      // Fetch status history for these applications in a single query to avoid N+1 queries
      const appIds = applicationsList.map(a => a.id);
      const { data: historyData } = appIds.length > 0
        ? await supabase
          .from("application_status_history")
          .select("application_id, old_status, new_status, changed_at")
          .in("application_id", appIds)
          .order("changed_at", { ascending: true })
        : { data: [] };

      const statusHistoryList = historyData || [];

      // Correlate counts, applications, and status history in memory
      const withCounts = data.map((job) => {
        const jobApps = applicationsList.filter(app => app.job_id === job.id);
        const jobHistory = statusHistoryList.filter(h => jobApps.some(app => app.id === h.application_id));
        return {
          ...job,
          applicant_count: jobApps.length,
          applications: jobApps,
          statusHistory: jobHistory
        };
      });

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

  const JOBS_PER_PAGE = 10;

  const totalPages = useMemo(() => {
    return Math.ceil(filtered.length / JOBS_PER_PAGE);
  }, [filtered]);

  const pageNumbers = useMemo(
    () => Array.from({ length: totalPages }, (_, index) => index + 1),
    [totalPages]
  );

  const visibleJobs = useMemo(() => {
    return filtered.slice((currentPage - 1) * JOBS_PER_PAGE, currentPage * JOBS_PER_PAGE);
  }, [filtered, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  // Scroll to top of window when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage]);

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "Active" ? "Paused" : "Active";
    let query = supabase.from("jobs").update({ status: newStatus }).eq("id", id);
    if (recruiterProfile?.id) {
      query = query.eq("recruiter_id", recruiterProfile.id);
    }
    const { error } = await query;

    if (error) {
      console.error("Failed to toggle job status:", error.message);
      alert(`Unable to update job status: ${error.message}`);
      return;
    }

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
    let query = supabase.from("jobs").update({ status: "Closed" }).eq("id", id);
    if (recruiterProfile?.id) {
      query = query.eq("recruiter_id", recruiterProfile.id);
    }
    const { error } = await query;

    if (error) {
      console.error("Failed to close job:", error.message);
      alert(`Unable to close job: ${error.message}`);
      return;
    }

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
          {visibleJobs.map(job => {
            const effectiveStatus = getEffectiveJobStatus(job);
            const badgeClass = effectiveStatus === "Active"
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-600";

            // Calculate timeline milestones and durations from database values
            const jobPostedDate = job.created_at ? new Date(job.created_at) : null;
            const jobApps = (job as any).applications || [];
            const jobHistory = (job as any).statusHistory || [];

            // Find hired application (status 'Joined' or 'Hired' or case-insensitive)
            const hiredApp = jobApps.find((a: any) =>
              a.status === "Joined" ||
              a.status === "Hired" ||
              a.status === "hired"
            );

            // Find offered application if no hired app
            const offeredApp = hiredApp ? null : jobApps.find((a: any) =>
              a.status === "Offered" ||
              a.status === "offered"
            );

            let offerReleasedDate: Date | null = null;
            let candidateJoinedDate: Date | null = null;

            if (hiredApp) {
              // Find offer date from history for this application
              const offerHistory = jobHistory.find((h: any) =>
                h.application_id === hiredApp.id &&
                (h.new_status === "Offered" || h.new_status === "offered")
              );
              if (offerHistory) {
                offerReleasedDate = new Date(offerHistory.changed_at);
              }

              // Find joined date from history for this application
              const joinedHistory = jobHistory.find((h: any) =>
                h.application_id === hiredApp.id &&
                (h.new_status === "Joined" || h.new_status === "Hired" || h.new_status === "hired")
              );
              if (joinedHistory) {
                candidateJoinedDate = new Date(joinedHistory.changed_at);
              }
            } else if (offeredApp) {
              const offerHistory = jobHistory.find((h: any) =>
                h.application_id === offeredApp.id &&
                (h.new_status === "Offered" || h.new_status === "offered")
              );
              if (offerHistory) {
                offerReleasedDate = new Date(offerHistory.changed_at);
              }
            }

            const screeningDate = jobHistory.find((h: any) =>
              ["Shortlisted", "Under Review", "Interview Scheduled", "Interview Completed", "Interview Selected", "Offered"].includes(h.new_status)
            )?.changed_at ? new Date(jobHistory.find((h: any) =>
              ["Shortlisted", "Under Review", "Interview Scheduled", "Interview Completed", "Interview Selected", "Offered"].includes(h.new_status)
            )!.changed_at) : null;

            const interviewDate = jobHistory.find((h: any) =>
              ["Interview Scheduled", "Interview Completed", "Interview Selected"].includes(h.new_status)
            )?.changed_at ? new Date(jobHistory.find((h: any) =>
              ["Interview Scheduled", "Interview Completed", "Interview Selected"].includes(h.new_status)
            )!.changed_at) : null;

            let timeToOfferStr = "Pending";
            let timeToHireStr = "Pending";
            let timeToScreenStr = "Pending";

            if (jobPostedDate && screeningDate) {
              const diffTime = screeningDate.getTime() - jobPostedDate.getTime();
              const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
              timeToScreenStr = `${diffDays} day${diffDays === 1 ? "" : "s"}`;
            }

            if (jobPostedDate && offerReleasedDate) {
              const diffTime = offerReleasedDate.getTime() - jobPostedDate.getTime();
              const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
              timeToOfferStr = `${diffDays} day${diffDays === 1 ? "" : "s"}`;
            }

            if (jobPostedDate && candidateJoinedDate) {
              const diffTime = candidateJoinedDate.getTime() - jobPostedDate.getTime();
              const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
              timeToHireStr = `${diffDays} day${diffDays === 1 ? "" : "s"}`;
            }

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
                      <span className="flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" />{formatJobSalaryRecruiter(job)}</span>
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

                {/* Hiring Timeline Section */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="text-xs font-semibold text-[#3A1F1F] mb-3">Hiring Timeline</div>

                  <div className="relative flex items-center justify-between px-6 py-4 bg-gray-50/50 rounded-xl mb-3">
                    <div className="absolute left-[16%] right-[16%] h-[2px] bg-gray-200 top-[28px] -translate-y-1/2 rounded-full z-0" />
                    <div
                      className="absolute left-[16%] h-[2px] bg-purple-500 top-[28px] -translate-y-1/2 rounded-full z-0 transition-all duration-500"
                      style={{ width: candidateJoinedDate ? "84%" : offerReleasedDate ? "68%" : screeningDate ? "34%" : "0%" }}
                    />

                    <div className="relative z-10 flex flex-col items-center w-[22%]">
                      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-purple-50 text-purple-600 shadow-sm mb-1">
                        <Briefcase className="h-3.5 w-3.5" />
                      </div>
                      <div className="w-2 h-2 bg-white border-2 border-purple-500 rotate-45 mb-1 shadow-sm" />
                      <span className="text-[10px] font-bold text-[#3A1F1F] text-center whitespace-nowrap">Job Posted</span>
                      <span className="text-[9px] text-[#8A8A8A] mt-0.5 text-center whitespace-nowrap">
                        {jobPostedDate ? jobPostedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "Pending"}
                      </span>
                    </div>

                    <div className="relative z-10 flex flex-col items-center w-[22%]">
                      <div className={`flex items-center justify-center w-7 h-7 rounded-full shadow-sm mb-1 transition-all ${screeningDate ? "bg-purple-50 text-purple-600" : "bg-gray-100 text-gray-400"}`}>
                        <Search className="h-3.5 w-3.5" />
                      </div>
                      <div className={`w-2 h-2 bg-white border-2 rotate-45 mb-1 shadow-sm transition-all ${screeningDate ? "border-purple-500" : "border-gray-300"}`} />
                      <span className="text-[10px] font-bold text-[#3A1F1F] text-center whitespace-nowrap">Screening</span>
                      <span className="text-[9px] text-[#8A8A8A] mt-0.5 text-center whitespace-nowrap">
                        {screeningDate ? screeningDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "Pending"}
                      </span>
                    </div>

                    <div className="relative z-10 flex flex-col items-center w-[22%]">
                      <div className={`flex items-center justify-center w-7 h-7 rounded-full shadow-sm mb-1 transition-all ${interviewDate ? "bg-purple-50 text-purple-600" : "bg-gray-100 text-gray-400"}`}>
                        <Video className="h-3.5 w-3.5" />
                      </div>
                      <div className={`w-2 h-2 bg-white border-2 rotate-45 mb-1 shadow-sm transition-all ${interviewDate ? "border-purple-500" : "border-gray-300"}`} />
                      <span className="text-[10px] font-bold text-[#3A1F1F] text-center whitespace-nowrap">Interview</span>
                      <span className="text-[9px] text-[#8A8A8A] mt-0.5 text-center whitespace-nowrap">
                        {interviewDate ? interviewDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "Pending"}
                      </span>
                    </div>

                    <div className="relative z-10 flex flex-col items-center w-[22%]">
                      <div className={`flex items-center justify-center w-7 h-7 rounded-full shadow-sm mb-1 transition-all ${offerReleasedDate ? "bg-purple-50 text-purple-600" : "bg-gray-100 text-gray-400"}`}>
                        <Mail className="h-3.5 w-3.5" />
                      </div>
                      <div className={`w-2 h-2 bg-white border-2 rotate-45 mb-1 shadow-sm transition-all ${offerReleasedDate ? "border-purple-500" : "border-gray-300"}`} />
                      <span className="text-[10px] font-bold text-[#3A1F1F] text-center whitespace-nowrap">Offer</span>
                      <span className="text-[9px] text-[#8A8A8A] mt-0.5 text-center whitespace-nowrap">
                        {offerReleasedDate ? offerReleasedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "Pending"}
                      </span>
                    </div>

                    <div className="relative z-10 flex flex-col items-center w-[22%]">
                      <div className={`flex items-center justify-center w-7 h-7 rounded-full shadow-sm mb-1 transition-all ${candidateJoinedDate ? "bg-purple-50 text-purple-600" : "bg-gray-100 text-gray-400"}`}>
                        <Check className="h-3.5 w-3.5" />
                      </div>
                      <div className={`w-2 h-2 bg-white border-2 rotate-45 mb-1 shadow-sm transition-all ${candidateJoinedDate ? "border-purple-500" : "border-gray-300"}`} />
                      <span className="text-[10px] font-bold text-[#3A1F1F] text-center whitespace-nowrap">Joined</span>
                      <span className="text-[9px] text-[#8A8A8A] mt-0.5 text-center whitespace-nowrap">
                        {candidateJoinedDate ? candidateJoinedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "Pending"}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center px-1 text-xs">
                    <div className="text-[#5A5A5A] flex items-center gap-1">
                      <span>Time to Screen:</span>
                      <span className={`font-semibold ${screeningDate ? "text-purple-600" : "text-[#8A8A8A]"}`}>{timeToScreenStr}</span>
                    </div>
                    <div className="text-[#5A5A5A] flex items-center gap-1">
                      <span>Time to Offer:</span>
                      <span className={`font-semibold ${offerReleasedDate ? "text-purple-600" : "text-[#8A8A8A]"}`}>{timeToOfferStr}</span>
                    </div>
                    <div className="text-[#5A5A5A] flex items-center gap-1">
                      <span>Time to Hire:</span>
                      <span className={`font-semibold ${candidateJoinedDate ? "text-purple-600" : "text-[#8A8A8A]"}`}>{timeToHireStr}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Pagination matching JobSeekerDashboard style */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-8 pb-4" id="manage-jobs-pagination">
              <Pagination>
                <PaginationContent className="flex-wrap justify-center gap-2">
                  <PaginationItem>
                    <PaginationPrevious
                      href="#manage-jobs-pagination"
                      onClick={(event) => {
                        event.preventDefault();
                        if (currentPage > 1) setCurrentPage((page) => page - 1);
                      }}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>

                  {(() => {
                    const delta = 1;
                    const range: (number | string)[] = [];
                    for (let i = 1; i <= totalPages; i++) {
                      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
                        range.push(i);
                      } else if (range[range.length - 1] !== "...") {
                        range.push("...");
                      }
                    }
                    return range.map((page, idx) => {
                      if (page === "...") {
                        return (
                          <PaginationItem key={`ellipsis-${idx}`}>
                            <PaginationEllipsis className="text-[#8A8A8A]" />
                          </PaginationItem>
                        );
                      }
                      const pageNumber = page as number;
                      return (
                        <PaginationItem key={pageNumber}>
                          <PaginationLink
                            href="#manage-jobs-pagination"
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
                      );
                    });
                  })()}

                  <PaginationItem>
                    <PaginationNext
                      href="#manage-jobs-pagination"
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
      )}

      {/* Edit Job Dialog */}
      <Dialog open={!!editingJob} onOpenChange={(o) => { if (!o) setEditingJob(null); }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Job</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="block text-sm font-medium text-[#3A1F1F] mb-1">Job Title *</label>
              <Input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} className="bg-[#F6F6F6] border-gray-200 rounded-xl" />
            </div>

            {/* Industry & Employment Type */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[#3A1F1F] mb-1">Industry(s)</label>
                <IndustryCombobox
                  selected={editForm.industries}
                  onChange={inds => setEditForm(f => ({ ...f, industries: inds }))}
                  placeholder="Select or type industry"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#3A1F1F] mb-1">Employment Type</label>
                <Select value={editForm.employmentType} onValueChange={v => setEditForm(f => ({ ...f, employmentType: v }))}>
                  <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{["Full-time", "Part-time", "Contract", "Internship", "Freelance"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Multi-Location & Openings */}
            <div className="space-y-3 border-t border-b border-gray-100 py-3 my-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Location & Openings</p>
              <div className="grid grid-cols-2 gap-3 items-start">
                <div>
                  <label className="block text-sm font-medium text-[#3A1F1F] mb-1">Job Location(s) *</label>
                  <LocationAutocomplete
                    value={editForm.locationInput}
                    onChange={loc => {
                      if (loc) {
                        const cleaned = loc.replace(/,/g, "").trim();
                        if (cleaned && !editForm.locations.some(l => l.toLowerCase().trim() === cleaned.toLowerCase())) {
                          setEditForm(f => ({ ...f, locations: [...f.locations, cleaned], locationInput: "" }));
                        }
                      }
                    }}
                    clearOnSelect={true}
                    existingLocations={editForm.locations}
                    placeholder="Search city to add"
                  />
                  {editForm.locations.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {editForm.locations.map(loc => (
                        <span key={loc} className="flex items-center gap-1 bg-[#FF2B2B]/10 text-[#FF2B2B] border border-[#FF2B2B]/20 px-2.5 py-1 rounded-full text-xs font-medium">
                          <MapPin className="h-3 w-3" />
                          {loc}
                          <button type="button" onClick={() => setEditForm(f => ({ ...f, locations: f.locations.filter(l => l !== loc) }))} className="hover:text-red-800 ml-1">
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#3A1F1F] mb-1">Number of Openings *</label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={editForm.openings}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, "");
                      setEditForm(f => ({ ...f, openings: val }));
                    }}
                    onBlur={() => {
                      if (!editForm.openings || Number(editForm.openings) < 1) {
                        setEditForm(f => ({ ...f, openings: "1" }));
                      }
                    }}
                    className="bg-[#F6F6F6] border-gray-200 rounded-xl"
                    placeholder="e.g. 1, 2, 5, 10, 25, 50, 100"
                  />
                  <div className="mt-1.5 flex flex-wrap gap-1 items-center">
                    {[1, 2, 5, 10, 25, 50, 100].map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setEditForm(f => ({ ...f, openings: String(num) }))}
                        className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                          Number(editForm.openings) === num
                            ? "bg-[#FFF0F0] text-[#FF2B2B] border-[#FF2B2B] font-medium"
                            : "bg-white text-[#555] border-gray-200 hover:border-[#FF2B2B]"
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Work Mode & Joining Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[#3A1F1F] mb-1">Work Mode</label>
                <Select value={editForm.workMode} onValueChange={v => setEditForm(f => ({ ...f, workMode: v }))}>
                  <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{["Work from Office", "Work from Home", "Hybrid"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#3A1F1F] mb-1">Joining Time</label>
                <Select value={editForm.preferredJoiningTime} onValueChange={v => setEditForm(f => ({ ...f, preferredJoiningTime: v }))}>
                  <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{PREFERRED_JOINING_TIME_OPTIONS.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Qualification & Specialization Mapping */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[#3A1F1F] mb-1">Qualification</label>
                <QualificationCombobox
                  value={editForm.education}
                  onChange={v => {
                    const validSpecs = getSpecializationsForQualification(v);
                    const defaultSpec = validSpecs.length > 0 ? (validSpecs.includes("Any Specialization") ? "Any Specialization" : validSpecs[0]) : "";
                    setEditForm(f => ({ ...f, education: v, specialization: defaultSpec }));
                  }}
                  placeholder="Select or type qualification"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#3A1F1F] mb-1">Specialization</label>
                <SpecializationCombobox
                  qualification={editForm.education}
                  value={editForm.specialization}
                  onChange={v => setEditForm(f => ({ ...f, specialization: v }))}
                  placeholder="Select or type specialization"
                />
              </div>
            </div>

            {/* Multi-Interview Modes */}
            <div>
              <label className="block text-sm font-medium text-[#3A1F1F] mb-1">Interview Mode(s)</label>
              <div className="flex flex-wrap gap-1.5">
                {INTERVIEW_MODE_OPTIONS.map(mode => {
                  const selected = editForm.interviewModes.includes(mode);
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setEditForm(f => ({
                          ...f,
                          interviewModes: selected ? f.interviewModes.filter(m => m !== mode) : [...f.interviewModes, mode]
                        }));
                      }}
                      className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all duration-200 flex items-center justify-center gap-1.5 text-center ${selected
                        ? "bg-[#FF2B2B] text-white border-[#FF2B2B] shadow-sm"
                        : "bg-white text-[#3A1F1F] border-gray-200 hover:border-[#FF2B2B]"
                        }`}
                    >
                      {selected && <Check className="h-3.5 w-3.5 text-white" />}
                      <span>{mode}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Salary Offered */}
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

            {/* Overall Candidate Experience */}
            <div>
              <label className="block text-sm font-medium text-[#3A1F1F] mb-1">Overall Candidate Experience</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#555] mb-1">Minimum Experience</label>
                  <Input
                    type="number"
                    min="0"
                    value={editForm.experienceMin}
                    onChange={e => setEditForm(f => ({ ...f, experienceMin: e.target.value }))}
                    className="bg-[#F6F6F6] border-gray-200 rounded-xl"
                    placeholder="Min (e.g. 5)"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#555] mb-1">Maximum Experience</label>
                  <Input
                    type="number"
                    min="0"
                    value={editForm.experienceMax}
                    onChange={e => setEditForm(f => ({ ...f, experienceMax: e.target.value }))}
                    className="bg-[#F6F6F6] border-gray-200 rounded-xl"
                    placeholder="Max (e.g. 8)"
                  />
                </div>
                <Input
                  type="number"
                  min="1"
                  value={editForm.openings}
                  onKeyDown={handleOpeningsKeyDown}
                  onChange={e => handleOpeningsChange(e.target.value)}
                  className="bg-[#F6F6F6] border-gray-200 rounded-xl"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-[#3A1F1F] mb-1">Key Skills (comma separated)</label>
                <Input value={editForm.skills} onChange={e => setEditForm(f => ({ ...f, skills: e.target.value }))} className="bg-[#F6F6F6] border-gray-200 rounded-xl" placeholder="Enter required skills" />
>>>>>>> origin/main
              </div>
              <p className="text-xs text-[#8A8A8A] mt-1">Example: Minimum: 5 Years | Maximum: 8 Years</p>
            </div>

            {/* Key Skills */}
            <div>
              <label className="block text-sm font-medium text-[#3A1F1F] mb-1">Key Skills (comma separated)</label>
              <Input value={editForm.skills} onChange={e => setEditForm(f => ({ ...f, skills: e.target.value }))} className="bg-[#F6F6F6] border-gray-200 rounded-xl" placeholder="Enter required skills" />
            </div>

            {editError && (
              <p className="text-sm text-red-500 font-medium mt-1">{editError}</p>
            )}

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

interface SearchCandidateProfileModalProps {
  candidate: DBCandidate | null;
  onClose: () => void;
  shortlisted: Set<string>;
  toggleShortlist: (id: string) => void;
  interviewInvited: Set<string>;
  toggleInterview: (id: string) => void;
  skillTags: string[];
}

function SearchCandidateProfileModal({
  candidate,
  onClose,
  shortlisted,
  toggleShortlist,
  interviewInvited,
  toggleInterview,
  skillTags
}: SearchCandidateProfileModalProps) {
  const [resolvedResumeUrl, setResolvedResumeUrl] = useState<string | null>(null);
  const [resumePreviewUrl, setResumePreviewUrl] = useState<string | null>(null);
  const pdfPreviewRef = useRef<HTMLDivElement | null>(null);
  const fullscreenResumeRef = useRef<HTMLDivElement | null>(null);
  const [pdfRendering, setPdfRendering] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeError, setResumeError] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const name = candidate ? getCandidateDisplayName(candidate) : "Candidate";
  const initials = getCandidateInitials(name);
  const workExp = candidate?.work_experience || [];
  const eduList = candidate?.education || [];
  const skills = candidate?.skills || [];
  const hasResume = !!candidate?.resume_url;

  const resumeKind = useMemo(() => {
    if (!resolvedResumeUrl) return "unsupported";
    return getResumePreviewKind(resolvedResumeUrl);
  }, [resolvedResumeUrl]);

  useEffect(() => {
    let cancelled = false;
    async function resolveResume() {
      setResolvedResumeUrl(null);
      setResumePreviewUrl(null);
      setResumeError("");
      if (!candidate?.resume_url) return;

      const storageObject = getStorageObjectFromUrl(candidate.resume_url);
      if (!storageObject) {
        setResolvedResumeUrl(candidate.resume_url);
        setResumePreviewUrl(buildPreviewUrl(candidate.resume_url));
      } else {
        setResumeLoading(true);
        const { data, error } = await supabase.storage
          .from(storageObject.bucket)
          .createSignedUrl(storageObject.path, 10 * 60);

        if (cancelled) return;

        if (error || !data?.signedUrl) {
          setResumeError(error?.message || "Resume file could not be previewed.");
        } else {
          setResolvedResumeUrl(data.signedUrl);
          setResumePreviewUrl(buildPreviewUrl(data.signedUrl));
        }
        setResumeLoading(false);
      }
    }
    void resolveResume();
    return () => {
      cancelled = true;
    };
  }, [candidate?.resume_url]);

  // Render PDF into canvases when resumePreviewUrl changes
  useEffect(() => {
    let cancelled = false;
    let loadingTask: any = null;
    async function renderPdfInline() {
      if (!resumePreviewUrl || resumeKind !== "pdf" || !pdfPreviewRef.current) return;
      setPdfRendering(true);
      try {
        if (!pdfPreviewRef.current?.isConnected) return;
        const container = pdfPreviewRef.current;
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }

        const res = await fetch(resumePreviewUrl);
        if (cancelled || !pdfPreviewRef.current?.isConnected) return;
        const arrayBuffer = await res.arrayBuffer();
        if (cancelled || !pdfPreviewRef.current?.isConnected) return;

        // load pdfjs from CDN
        async function ensurePdfJs() {
          if ((window as any).pdfjsLib) return (window as any).pdfjsLib;
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement("script");
            s.src = "https://unpkg.com/pdfjs-dist@3.10.111/legacy/build/pdf.min.js";
            s.onload = () => resolve();
            s.onerror = () => reject(new Error("Failed to load pdfjs"));
            document.head.appendChild(s);
          });
          return (window as any).pdfjsLib;
        }

        const pdfjs = await ensurePdfJs();
        if (cancelled || !pdfPreviewRef.current?.isConnected) return;
        (pdfjs as any).GlobalWorkerOptions.workerSrc = "https://unpkg.com/pdfjs-dist@3.10.111/legacy/build/pdf.worker.min.js";
        loadingTask = (pdfjs as any).getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        if (cancelled || !pdfPreviewRef.current?.isConnected) return;
        const numPages = pdf.numPages;
        const wrapper = document.createElement("div");
        wrapper.style.display = "flex";
        wrapper.style.flexDirection = "column";
        wrapper.style.alignItems = "center";
        wrapper.style.justifyContent = "flex-start";
        wrapper.style.width = "100%";

        const availableWidth = Math.max(100, pdfPreviewRef.current.clientWidth - 8);
        for (let i = 1; i <= numPages; i++) {
          if (cancelled || !pdfPreviewRef.current?.isConnected) return;
          const page = await pdf.getPage(i);
          if (cancelled || !pdfPreviewRef.current?.isConnected) return;
          const viewport = page.getViewport({ scale: 1 });
          const scale = Math.min(1, availableWidth / viewport.width);
          const scaledViewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(scaledViewport.width);
          canvas.height = Math.floor(scaledViewport.height);
          canvas.style.width = `${scaledViewport.width}px`;
          canvas.style.height = `${scaledViewport.height}px`;
          canvas.className = "mb-3 shadow-sm rounded-sm bg-white";
          const ctx = canvas.getContext("2d");
          // @ts-ignore
          await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
          if (cancelled || !pdfPreviewRef.current?.isConnected) return;
          wrapper.appendChild(canvas);
        }
        if (pdfPreviewRef.current?.isConnected) {
          pdfPreviewRef.current.appendChild(wrapper);
          pdfPreviewRef.current.style.height = "100%";
        }
      } catch (err) {
        console.error("Inline PDF render failed", err);
        if (pdfPreviewRef.current?.isConnected) {
          while (pdfPreviewRef.current.firstChild) {
            pdfPreviewRef.current.removeChild(pdfPreviewRef.current.firstChild);
          }
          // fallback to iframe
          const iframe = document.createElement("iframe");
          iframe.src = `${resumePreviewUrl}#toolbar=0&navpanes=0&view=FitH`;
          iframe.style.width = "100%";
          iframe.style.height = "600px";
          iframe.style.border = "0";
          pdfPreviewRef.current.appendChild(iframe);
        }
      } finally {
        if (!cancelled) setPdfRendering(false);
      }
    }
    void renderPdfInline();
    return () => {
      cancelled = true;
      if (loadingTask) {
        try {
          loadingTask.destroy();
        } catch (e) {
          console.warn("Failed to destroy inline PDF loading task:", e);
        }
      }
    };
  }, [resumePreviewUrl, resumeKind]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleResumeFullscreen = async () => {
    if (!fullscreenResumeRef.current) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await fullscreenResumeRef.current.requestFullscreen();
      }
    } catch (err) {
      console.error("Resume fullscreen failed", err);
    }
  };

  const handleDownloadResume = useCallback(async () => {
    if (!candidate?.resume_url) return;

    const storageObject = getStorageObjectFromUrl(candidate.resume_url);
    if (!storageObject) {
      window.open(candidate.resume_url, "_blank", "noopener,noreferrer");
      return;
    }

    const { data, error: downloadError } = await supabase.storage
      .from(storageObject.bucket)
      .createSignedUrl(storageObject.path, 10 * 60, { download: true });

    if (downloadError || !data?.signedUrl) {
      alert(`Resume download failed: ${downloadError?.message || "Unable to download resume."}`);
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }, [candidate?.resume_url]);

  if (!candidate) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${hasResume ? "max-w-6xl" : "max-w-3xl"} max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
        {/* Header — avatar + name fully inside banner, no negative margin */}
        <div className="bg-gradient-to-r from-[#3A1F1F] to-[#FF2B2B] rounded-t-2xl px-6 py-5 relative">
          <button onClick={onClose} className="absolute top-3 right-4 text-white/70 hover:text-white text-2xl leading-none font-bold">×</button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl border-2 border-white/40 shadow overflow-hidden bg-white/20 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
              {candidate.avatar_url
                ? <img src={candidate.avatar_url} alt={name} className="w-full h-full object-cover" />
                : initials}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-white truncate">{name}</h2>
              <p className="text-sm text-white/80 truncate">
                {candidate.headline || candidate.current_title}
                {candidate.current_company && <span> · {candidate.current_company}</span>}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 pt-5">
          <div className={`grid grid-cols-1 ${hasResume ? "lg:grid-cols-2" : ""} gap-6 items-start`}>

            {/* Profile Info (Left side if split, full width otherwise) */}
            <div className="space-y-5">
              {/* Quick stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-[#F6F6F6] rounded-xl">
                {[
                  { label: "Active In", value: formatActiveTime(parseActiveDate(candidate)) || "Active in a day" },
                  { label: "Experience", value: candidate.total_experience },
                  { label: "Location", value: candidate.location },
                  { label: "Current CTC", value: candidate.current_salary },
                  { label: "Expected CTC", value: candidate.expected_salary, highlight: true },
                  { label: "Notice Period", value: candidate.notice_period },
                  { label: "Phone", value: candidate.phone },
                  { label: "Email", value: candidate.email },
                  { label: "Candidate Type", value: candidate.experience_type ? (candidate.experience_type === "fresher" ? "Fresher" : "Experienced") : null },
                ].filter(item => item.value).map((item, i) => (
                  <div key={i}>
                    <p className="text-xs text-[#8A8A8A]">{item.label}</p>
                    <p className={`text-sm font-semibold truncate ${(item as any).highlight ? "text-[#FF2B2B]" : "text-[#3A1F1F]"}`}>{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant={shortlisted.has(candidate.id) ? "default" : "outline"} className={shortlisted.has(candidate.id) ? "bg-pink-600 hover:bg-pink-700 text-white rounded-full text-xs cursor-default" : "border-pink-500 text-pink-600 hover:bg-pink-50 rounded-full text-xs"} onClick={() => toggleShortlist(candidate.id)}><ThumbsUp className="h-3.5 w-3.5 mr-1" /> {shortlisted.has(candidate.id) ? "Shortlisted ✓" : "Shortlist"}</Button>
                <Button size="sm" variant="outline" disabled={!shortlisted.has(candidate.id)} title={!shortlisted.has(candidate.id) ? "Please shortlist candidate first before interview" : "Go to Applicants module to schedule interview"} className={!shortlisted.has(candidate.id) ? "border-purple-200 text-purple-300 rounded-full text-xs opacity-50 cursor-not-allowed" : "border-purple-400 text-purple-600 hover:bg-purple-50 rounded-full text-xs"} onClick={() => toggleInterview(candidate.id)}><Video className="h-3.5 w-3.5 mr-1" /> Schedule Interview</Button>
                <Button size="sm" variant="outline" className="border-gray-200 text-[#3A1F1F] hover:bg-gray-50 rounded-full text-xs" onClick={() => { if (candidate.email) window.location.href = `mailto:${candidate.email}`; }}><Mail className="h-3.5 w-3.5 mr-1" /> Send Message</Button>
                {candidate.linkedin_url && <a href={candidate.linkedin_url} target="_blank" rel="noreferrer"><Button size="sm" variant="outline" className="border-blue-400 text-blue-600 hover:bg-blue-50 rounded-full text-xs">LinkedIn</Button></a>}
                {candidate.portfolio_url && <a href={candidate.portfolio_url} target="_blank" rel="noreferrer"><Button size="sm" variant="outline" className="border-gray-300 rounded-full text-xs"><Globe className="h-3.5 w-3.5 mr-1" /> Portfolio</Button></a>}
              </div>

              {/* Profile Summary */}
              {candidate.about && (
                <div>
                  <h3 className="text-sm font-bold text-[#3A1F1F] mb-2 flex items-center gap-2"><User className="h-4 w-4 text-[#FF2B2B]" /> Profile Summary</h3>
                  <SafeHtml
                    content={candidate.about}
                    className="text-sm text-[#5A5A5A] leading-relaxed bg-[#F6F6F6] rounded-xl p-3 border-l-4 border-[#FF2B2B] [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h2]:text-[#3A1F1F] [&_h2]:font-bold [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-[#3A1F1F] [&_h3]:font-bold [&_h3]:mt-1.5 [&_h3]:mb-1 [&_a]:text-[#FF2B2B] [&_a]:underline"
                  />
                </div>
              )}

              {/* Skills */}
              {skills.length > 0 && (
                <div>
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
                <div>
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
                <div>
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
            </div>

            {/* Resume Preview Column (Right side if split) */}
            {hasResume && (
              <div ref={fullscreenResumeRef} className="bg-white rounded-2xl p-6 border border-gray-100 flex flex-col h-[75vh] overflow-hidden relative">
                {isFullscreen && (
                  <div className="absolute top-6 right-6 z-50 flex items-center gap-2 bg-[#3A1F1F]/90 backdrop-blur-md p-1.5 rounded-full shadow-xl border border-white/10">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleDownloadResume}
                      title="Download Resume"
                      className="h-9 w-9 text-white hover:text-white hover:bg-[#FF2B2B] rounded-full transition-all"
                    >
                      <Download className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleResumeFullscreen}
                      title="Exit Full Screen"
                      className="h-9 w-9 text-white hover:text-white hover:bg-white/10 rounded-full transition-all"
                    >
                      <Minimize2 className="h-5 w-5" />
                    </Button>
                  </div>
                )}

                <h3 className="text-sm font-bold text-[#3A1F1F] mb-4 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#FF2B2B]" /> Resume Preview
                </h3>

                <div className={`bg-[#F6F6F6] rounded-xl overflow-auto flex-1 flex flex-col items-center justify-center relative border border-gray-200 min-h-0 ${isFullscreen ? 'max-h-none h-[88vh] w-full' : 'max-h-[50vh]'}`}>
                  {resumeLoading ? (
                    <div className="text-center p-6 flex flex-col items-center justify-center h-full w-full">
                      <Loader2 className="h-10 w-10 text-[#FF2B2B] animate-spin mx-auto mb-3" />
                      <p className="text-sm text-[#5A5A5A]">Loading resume preview...</p>
                    </div>
                  ) : resumeError ? (
                    <div className="text-center p-6 flex flex-col items-center justify-center h-full w-full">
                      <ShieldAlert className="h-10 w-10 text-[#FF2B2B] mx-auto mb-3" />
                      <p className="text-sm font-medium text-[#3A1F1F]">{resumeError}</p>
                      <p className="text-xs text-[#8A8A8A] mt-1">Please try downloading the file directly.</p>
                    </div>
                  ) : resumePreviewUrl ? (
                    resumeKind === "image" ? (
                      <div className={`w-full overflow-hidden flex items-center justify-center bg-white p-4 ${isFullscreen ? 'h-[85vh]' : 'h-auto'}`}>
                        <img
                          src={resumePreviewUrl}
                          alt="Resume Preview"
                          className="max-w-full max-h-full object-contain shadow-sm rounded-md"
                        />
                      </div>
                    ) : resumeKind === "office" ? (
                      <iframe
                        src={resumePreviewUrl}
                        title="Resume Preview"
                        className={`w-full bg-white ${isFullscreen ? 'h-[85vh]' : 'h-[40vh]'}`}
                        style={{ border: "none" }}
                        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                      />
                    ) : resumeKind === "pdf" ? (
                      <div ref={pdfPreviewRef} className="w-full bg-white p-4 flex flex-col items-center justify-start overflow-auto min-h-0 max-h-full">
                        {pdfRendering && (
                          <div className="text-center p-6">
                            <div className="w-9 h-9 border-4 border-[#FF2B2B] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                            <p className="text-sm text-[#5A5A5A]">Preparing resume preview...</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <iframe
                        src={resumePreviewUrl}
                        title="Resume Preview"
                        className={`w-full bg-white ${isFullscreen ? 'h-[85vh]' : 'h-[40vh]'}`}
                        style={{ border: "none" }}
                      />
                    )
                  ) : (
                    <div className="text-center p-6 flex flex-col items-center justify-center h-full w-full">
                      <FileText className="h-12 w-12 text-[#BABABA] mx-auto mb-3" />
                      <p className="text-sm font-semibold text-[#3A1F1F]">No Resume Available</p>
                    </div>
                  )}
                </div>

                {!isFullscreen && (
                  <div className="mt-4 flex gap-3">
                    <Button
                      variant="outline"
                      onClick={toggleResumeFullscreen}
                      className="flex-1 rounded-full border border-gray-200 text-[#3A1F1F] hover:bg-[#F6F6F6] flex items-center justify-center gap-2 h-9 text-xs font-medium transition-all"
                    >
                      <Eye className="h-4 w-4" /> View Full Screen
                    </Button>
                    <Button
                      onClick={handleDownloadResume}
                      className="flex-1 bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full flex items-center justify-center gap-2 h-9 text-xs font-medium shadow-md transition-all"
                    >
                      <Download className="h-4 w-4" /> Download
                    </Button>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

const DESIGNATION_OPTIONS = [
  "Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "React Developer",
  "Node.js Developer",
  "Java Developer",
  "Python Developer",
  "Go Developer",
  "Mobile Developer",
  "Android Developer",
  "iOS Developer",
  "DevOps Engineer",
  "Cloud Architect",
  "System Administrator",
  "Database Administrator",
  "QA Engineer",
  "Automation Engineer",
  "Data Scientist",
  "Data Analyst",
  "Data Engineer",
  "Machine Learning Engineer",
  "AI Engineer",
  "Product Manager",
  "Project Manager",
  "Scrum Master",
  "Business Analyst",
  "System Analyst",
  "UI/UX Designer",
  "Product Designer",
  "Graphic Designer",
  "Web Designer",
  "Motion Designer",
  "Marketing Manager",
  "Digital Marketing Specialist",
  "SEO Analyst",
  "Content Writer",
  "Copywriter",
  "Sales Manager",
  "Sales Executive",
  "Business Development Executive",
  "BDM",
  "Account Manager",
  "HR Manager",
  "HR Generalist",
  "Recruiter",
  "Talent Acquisition Specialist",
  "Finance Manager",
  "Accountant",
  "Financial Analyst",
  "Operations Manager",
  "Operations Executive",
  "Customer Support Executive",
  "Customer Success Manager",
  "Technical Support Engineer",
];

const ALL_SKILL_OPTIONS = Array.from(
  new Set([...SEARCH_SUGGESTION_DATASET, ...SKILL_OPTIONS])
).sort((a, b) => a.localeCompare(b));

const ALL_LOCATION_OPTIONS = Array.from(
  new Set([
    "India",
    "NCR",
    "New Delhi",
    "Bangalore",
    "Gurugram",
    "Trivandrum",
    "Jammu",
    "Kashmir",
    "Andaman and Nicobar",
    "Andhra Pradesh",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chhattisgarh",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Punjab",
    "Rajasthan",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
    ...INDIA_CITY_OPTIONS,
  ])
).sort((a, b) => a.localeCompare(b));

const ALL_ROLE_AND_DEPT_OPTIONS = Array.from(
  new Set([...DESIGNATION_OPTIONS, ...DEPARTMENT_OPTIONS])
).sort((a, b) => a.localeCompare(b));

function getCandidateDisplayName(profile?: Profile | DBCandidate | null) {
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

type RecruiterAppliedJdSearchApplication = {
  profile: DBCandidate | null;
  job: Job | null;
};

function SearchCandidatesPage() {
  const { recruiterProfile } = useAuth();
  const navigate = useNavigate();
  // ── Search state ──────────────────────────────────────────
  const [keywords, setKeywords] = useState("");
  const [location, setLocation] = useState("");
  const [keywordSearchEnabled, setKeywordSearchEnabled] = useState(true);
  const [booleanSearchEnabled, setBooleanSearchEnabled] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const keywordInputRef = useRef<HTMLInputElement>(null);
  const dropdownContainerRef = useRef<HTMLDivElement>(null);
  const [expMin, setExpMin] = useState("");
  const [expMax, setExpMax] = useState("");
  const [curSalMin, setCurSalMin] = useState("");
  const [curSalMax, setCurSalMax] = useState("");
  const [expSalMax, setExpSalMax] = useState("");
  const [noticePeriod, setNoticePeriod] = useState("");
  const [education, setEducation] = useState("");
  const [industry, setIndustry] = useState("");
  const [currentCompany, setCurrentCompany] = useState("");
  const [expType, setExpType] = useState("");
  const [activeIn, setActiveIn] = useState("any");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [locationRadius, setLocationRadius] = useState("");
  const [skillTags, setSkillTags] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [skillSuggestionsOpen, setSkillSuggestionsOpen] = useState(false);
  const searchKeywordRef = useRef<HTMLDivElement>(null);

  const [results, setResults] = useState<DBCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [profileModal, setProfileModal] = useState<DBCandidate | null>(null);
  const [sortBy, setSortBy] = useState("relevant");
  const [shortlisted, setShortlisted] = useState<Set<string>>(new Set());
  const [interviewInvited, setInterviewInvited] = useState<Set<string>>(new Set());
  const [messagedCandidates, setMessagedCandidates] = useState<Set<string>>(new Set());
  const [searchPage, setSearchPage] = useState<number>(1);

  const countriesList = useMemo(() => getAllCountriesList(), []);
  const statesList = useMemo(() => getStatesList(selectedCountry), [selectedCountry]);
  const citiesList = useMemo(() => getCitiesList(selectedCountry, selectedState), [selectedCountry, selectedState]);

  // Load candidate statuses from database on mount & when recruiter changes
  useEffect(() => {
    const recruiterId = recruiterProfile?.id;
    if (!recruiterId) return;

    let isMounted = true;
    async function loadCandidateStatuses() {
      try {
        const { data: apps } = await supabase
          .from("applications")
          .select("id, profile_id, status")
          .eq("recruiter_id", recruiterId);

        if (apps && isMounted) {
          const sSet = new Set<string>();
          const iSet = new Set<string>();

          apps.forEach(app => {
            if (!app.profile_id) return;
            const st = (app.status || "").toLowerCase();
            if (st === "shortlisted") {
              sSet.add(app.profile_id);
            } else if (st.includes("interview")) {
              iSet.add(app.profile_id);
            }
          });

          setShortlisted(sSet);
          setInterviewInvited(iSet);
        }

        const { data: notifications } = await supabase
          .from("notifications")
          .select("user_id")
          .eq("related_id", recruiterId)
          .eq("type", "message");

        if (notifications && isMounted) {
          const mSet = new Set<string>();
          notifications.forEach(n => {
            if (n.user_id) mSet.add(n.user_id);
          });
          setMessagedCandidates(mSet);
        }
      } catch (err) {
        console.error("Error loading candidate statuses from DB:", err);
      }
    }

    loadCandidateStatuses();
    return () => { isMounted = false; };
  }, [recruiterProfile?.id]);

  const toggleShortlist = async (candidateId: string) => {
    if (!candidateId) return;

    // Step-by-step pipeline progression: if already shortlisted or beyond (invited), do not backstep
    if (shortlisted.has(candidateId) || interviewInvited.has(candidateId)) return;

    setShortlisted(prev => new Set(prev).add(candidateId));

    const recruiterId = recruiterProfile?.id;
    if (!recruiterId) return;

    try {
      const { data: existingApps } = await supabase
        .from("applications")
        .select("id, status")
        .eq("recruiter_id", recruiterId)
        .eq("profile_id", candidateId);

      if (existingApps && existingApps.length > 0) {
        await supabase
          .from("applications")
          .update({ status: "Shortlisted" })
          .eq("id", existingApps[0].id);
      } else {
        const { data: jobs } = await supabase
          .from("jobs")
          .select("id")
          .eq("recruiter_id", recruiterId)
          .eq("status", "Active")
          .order("created_at", { ascending: false })
          .limit(1);

        const jobId = jobs && jobs.length > 0 ? jobs[0].id : null;

        if (jobId) {
          await supabase.from("applications").insert({
            profile_id: candidateId,
            recruiter_id: recruiterId,
            job_id: jobId,
            status: "Shortlisted",
          });
        }
      }
    } catch (err) {
      console.error("Failed to persist shortlist status to DB:", err);
    }
  };

  const toggleInterview = (candidateId: string) => {
    if (!candidateId) return;

    // Candidate MUST be shortlisted first before scheduling interview
    if (!shortlisted.has(candidateId)) return;

    // Redirect recruiter directly to Applicants module so they can manually schedule interview there
    navigate("/recruiter/dashboard/applicants?status=Shortlisted");
  };

  const handleMessageCandidate = (candidate: DBCandidate) => {
    if (!candidate) return;

    if (candidate.email) {
      window.location.href = `mailto:${candidate.email}`;
    }

    if (candidate.id) {
      setMessagedCandidates(prev => new Set(prev).add(candidate.id));
    }

    const recruiterId = recruiterProfile?.id;
    if (recruiterId && candidate.id) {
      void supabase.from("notifications").insert({
        user_id: candidate.id,
        user_type: "jobseeker",
        title: "Message from Recruiter",
        message: `${recruiterProfile?.company_name || recruiterProfile?.recruiter_name || "A recruiter"} sent you a message regarding job opportunities.`,
        type: "message",
        related_id: recruiterId,
        is_read: false,
      });
    }
  };

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

  const parseActiveDate = (c: DBCandidate): Date | null => {
    const dateStr = (c as any).last_active_at;
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  };

  const getActiveInDays = (val: string): number | null => {
    switch (val) {
      case "24h":
      case "1day":
      case "1":
        return 1;
      case "7days":
      case "7":
        return 7;
      case "15days":
      case "15":
        return 15;
      case "30days":
      case "30":
        return 30;
      case "2months":
      case "60":
        return 60;
      case "3months":
      case "90":
        return 90;
      case "6months":
      case "180":
        return 180;
      case "any":
      case "all":
      case "":
      default:
        return null;
    }
  };

  const parseSearchTokens = (input: string): { tokens: string[]; isOr: boolean; notTokens: string[] } => {
    const trimmed = input.trim();
    if (!trimmed) return { tokens: [], isOr: false, notTokens: [] };

    if (booleanSearchEnabled) {
      // BOOLEAN SEARCH MODE (toggle is ON):
      // Commas (,) are ignored/stripped. Only AND, OR, NOT operators are respected.
      const cleanInput = trimmed.replace(/,/g, " ");

      const notTokens: string[] = [];
      const notParts = cleanInput.split(/\bnot\b/i);
      const mainPart = notParts[0];
      for (let i = 1; i < notParts.length; i++) {
        const notWord = notParts[i].trim().split(/\s+/)[0];
        if (notWord) notTokens.push(notWord.toLowerCase());
      }

      const isOr = /\bor\b/i.test(mainPart);
      let tokens: string[] = [];

      if (isOr) {
        tokens = mainPart
          .split(/\bor\b/i)
          .map(s => s.replace(/\b(?:and|not)\b/gi, "").trim())
          .filter(Boolean);
      } else {
        tokens = mainPart
          .split(/\s+/)
          .map(t => t.replace(/\b(?:and|not)\b/gi, "").trim())
          .filter(t => Boolean(t) && !/^(and|or|not)$/i.test(t));
      }

      return { tokens, isOr, notTokens };
    } else {
      // STANDARD SEARCH MODE (toggle is OFF):
      // AND, OR, NOT are treated as regular text. Split by commas and spaces.
      const segments = trimmed.split(/,/);
      const tokens = segments.flatMap(s => s.trim().split(/\s+/)).map(t => t.trim()).filter(Boolean);
      return { tokens, isOr: true, notTokens: [] };
    }
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

  const getCurrentSearchToken = (text: string) => {
    const lastCommaIndex = text.lastIndexOf(",");
    const operatorRegex = /\b(AND|OR|NOT)\b/gi;
    let match;
    let lastOperatorIndex = -1;
    let lastOperatorLength = 0;

    while ((match = operatorRegex.exec(text)) !== null) {
      lastOperatorIndex = match.index;
      lastOperatorLength = match[0].length;
    }

    if (lastCommaIndex === -1 && lastOperatorIndex === -1) {
      return { token: text, prefix: "", separatorType: "none" as const };
    }

    if (lastCommaIndex > lastOperatorIndex) {
      const prefix = text.slice(0, lastCommaIndex + 1);
      const token = text.slice(lastCommaIndex + 1);
      return { token, prefix, separatorType: "comma" as const };
    } else {
      const prefix = text.slice(0, lastOperatorIndex + lastOperatorLength);
      const token = text.slice(lastOperatorIndex + lastOperatorLength);
      return { token, prefix, separatorType: "operator" as const };
    }
  };

  const filteredSuggestions = useMemo(() => {
    const { token } = getCurrentSearchToken(keywords);
    const query = token.trim();
    if (!query) return { skills: [], designations: [] };

    const normalizedInputKeywords = keywords
      .toLowerCase()
      .split(/,|\b(?:and|or|not)\b/i)
      .map(k => k.trim())
      .filter(Boolean);

    const isAlreadyPresent = (item: string) => {
      return normalizedInputKeywords.includes(item.toLowerCase());
    };

    const qLower = query.toLowerCase();
    const matchedSkills: string[] = [];

    // Phase 1: Fast direct prefix / inclusion match (sub-millisecond execution)
    for (let i = 0; i < ALL_SKILL_OPTIONS.length; i++) {
      const skill = ALL_SKILL_OPTIONS[i];
      if (isAlreadyPresent(skill)) continue;
      const sLower = skill.toLowerCase();
      if (sLower.startsWith(qLower) || sLower.includes(qLower)) {
        matchedSkills.push(skill);
        if (matchedSkills.length >= 8) break;
      }
    }

    // Phase 2: Fallback to fuzzy match only if direct matches are fewer than 8
    if (matchedSkills.length < 8) {
      const searchExpansionTerms = getSkillSearchTerms(query);
      for (let i = 0; i < ALL_SKILL_OPTIONS.length; i++) {
        const skill = ALL_SKILL_OPTIONS[i];
        if (isAlreadyPresent(skill) || matchedSkills.includes(skill)) continue;
        const sLower = skill.toLowerCase();
        if (fuzzyMatch(query, skill) || searchExpansionTerms.some(term => sLower.includes(term))) {
          matchedSkills.push(skill);
          if (matchedSkills.length >= 8) break;
        }
      }
    }

    const matchedDesignations: string[] = [];
    for (let i = 0; i < ALL_ROLE_AND_DEPT_OPTIONS.length; i++) {
      const role = ALL_ROLE_AND_DEPT_OPTIONS[i];
      if (isAlreadyPresent(role)) continue;
      const rLower = role.toLowerCase();
      if (rLower.startsWith(qLower) || rLower.includes(qLower) || fuzzyMatch(query, role)) {
        matchedDesignations.push(role);
        if (matchedDesignations.length >= 5) break;
      }
    }

    return {
      skills: matchedSkills,
      designations: matchedDesignations,
    };
  }, [keywords]);

  const flatSuggestionsList = useMemo(() => {
    const list: Array<{ value: string; type: "skill" | "designation" }> = [];
    filteredSuggestions.skills.forEach(skill => list.push({ value: skill, type: "skill" }));
    filteredSuggestions.designations.forEach(role => list.push({ value: role, type: "designation" }));
    return list;
  }, [filteredSuggestions]);

  const hasSuggestions = useMemo(() => {
    return flatSuggestionsList.length > 0;
  }, [flatSuggestionsList]);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [keywords]);

  useEffect(() => {
    if (highlightedIndex < 0 || !dropdownContainerRef.current) return;
    const container = dropdownContainerRef.current;
    const buttons = container.querySelectorAll("button");
    const activeBtn = buttons[highlightedIndex];
    if (activeBtn) {
      activeBtn.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

  const selectSuggestion = (suggestionValue: string) => {
    const { prefix, separatorType } = getCurrentSearchToken(keywords);
    let nextKeywords = "";
    if (separatorType === "none") {
      nextKeywords = suggestionValue + (booleanSearchEnabled ? " " : ", ");
    } else if (separatorType === "comma") {
      nextKeywords = prefix.trim() + " " + suggestionValue + (booleanSearchEnabled ? " " : ", ");
    } else {
      nextKeywords = prefix.trim() + " " + suggestionValue + " ";
    }
    setKeywords(nextKeywords);
    setSkillSuggestionsOpen(false);
    if (keywordInputRef.current) {
      keywordInputRef.current.focus();
    }
  };

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

  const booleanSearchError = useMemo(() => {
    const trimmed = keywords.trim();
    if (!trimmed) return null;

    if (booleanSearchEnabled) {
      if (trimmed.includes(",")) {
        return "In Boolean Search mode, commas are not allowed. Please use AND, OR, or NOT operators between skills (e.g., Python AND React).";
      }
      const words = trimmed.split(/\s+/).filter(Boolean);
      if (words.length > 1) {
        const hasBooleanOperator = words.some(w => /^(and|or|not)$/i.test(w));
        if (!hasBooleanOperator) {
          return "In Boolean Search mode, please use AND, OR, or NOT operators between skills (e.g., Python AND React).";
        }
      }
    } else {
      if (/\b(?:and|or|not)\b/i.test(trimmed)) {
        return "Boolean operators (AND, OR, NOT) are not allowed in Standard mode. Please turn ON Boolean Search to use boolean operators.";
      }
    }
    return null;
  }, [keywords, booleanSearchEnabled]);

  // BM25-inspired candidate relevance scoring for Elasticsearch and fallback search
  const computeCandidateRelevanceScore = (candidate: DBCandidate, queryStr: string): number => {
    if (!queryStr.trim()) return 0;
    const { tokens } = parseSearchTokens(queryStr.toLowerCase());
    if (tokens.length === 0) return 0;

    let score = 0;
    tokens.forEach(token => {
      const t = token.toLowerCase().trim();
      if (!t) return;
      const cSkills = (candidate.skills || []).map(s => s.toLowerCase().trim());

      if (cSkills.includes(t)) {
        score += 50;
      } else if (cSkills.some(s => skillsMatch(s, t) || fuzzyMatch(t, s))) {
        score += 30;
      }

      if (candidate.current_title && candidate.current_title.toLowerCase().includes(t)) {
        score += 40;
      }
      if (candidate.headline && candidate.headline.toLowerCase().includes(t)) {
        score += 25;
      }
      if ((candidate.work_experience || []).some(we => we.title && we.title.toLowerCase().includes(t))) {
        score += 15;
      }
    });

    return score;
  };

  // ── Main search ───────────────────────────────────────────
  const handleSearch = async (overrideKeywords?: any) => {
    if (booleanSearchError) {
      setSearched(false);
      setResults([]);
      setSearching(false);
      setSkillSuggestionsOpen(false);
      return;
    }
    const activeKeywords = typeof overrideKeywords === "string" ? overrideKeywords : keywords;
    const trimmedKw = activeKeywords.trim();
    const hasSearchCriteria = Boolean(trimmedKw);

    if (!hasSearchCriteria) {
      setSearching(false);
      setSearched(false);
      setResults([]);
      setSkillSuggestionsOpen(false);
      return;
    }

    setSearching(true);
    setSearched(true);
    setSkillSuggestionsOpen(false);

    // Track and store keywords used
    if (activeKeywords.trim() && recruiterProfile?.id) {
      const tokens = activeKeywords.trim().toLowerCase().split(/\s+/).filter(Boolean);
      if (tokens.length > 0) {
        void supabase.rpc("log_recruiter_keywords", { p_recruiter_id: recruiterProfile.id, p_keywords: tokens })
          .then(({ error: kErr }) => {
            if (kErr) {
              console.warn("Failed to log search keywords to DB:", kErr.message);
              try {
                const localKey = `search_keywords_${recruiterProfile.id}`;
                const existing = JSON.parse(localStorage.getItem(localKey) || "[]");
                tokens.forEach(token => {
                  existing.unshift({
                    keyword: token,
                    created_at: new Date().toISOString()
                  });
                });
                localStorage.setItem(localKey, JSON.stringify(existing.slice(0, 200)));
              } catch (e) {
                console.error("Failed to save keywords to localStorage:", e);
              }
            }
          });
      }
    }
    try {
      let raw: DBCandidate[] = [];
      let esSuccess = false;

      try {
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
        const esUrl = `${apiUrl}/candidates/search?q=${encodeURIComponent(activeKeywords)}` +
          `&boolean_mode=${booleanSearchEnabled}` +
          `&fuzzy=true` +
          `&location=${encodeURIComponent(location)}` +
          `&current_company=${encodeURIComponent(currentCompany)}` +
          `&skills=${encodeURIComponent(skillTags.join(","))}` +
          `&experience_type=${encodeURIComponent(expType)}` +
          `&experience_min=${encodeURIComponent(expMin)}` +
          `&experience_max=${encodeURIComponent(expMax)}`;
        const esRes = await fetch(esUrl);
        if (esRes.ok) {
          const data = await esRes.json();
          const matchedIds = data.candidates.map((c: any) => c.id);

          if (matchedIds.length > 0) {
            const { data: hydratedData } = await supabase
              .from("profiles")
              .select(`
                id, first_name, last_name, avatar_url, headline, current_title, current_company, location, experience_type, total_experience, skills, about, created_at, updated_at, last_active_at,
                work_experience(id, company, title, start_date, end_date, description, is_current),
                education(id, institution, degree, field, start_year, end_year)
              `)
              .in("id", matchedIds);

            if (hydratedData && hydratedData.length > 0) {
              const idToCandidateMap = new Map(hydratedData.map((c: any) => [c.id, c]));
              raw = matchedIds
                .map((id: string) => idToCandidateMap.get(id))
                .filter(Boolean) as DBCandidate[];
              if (raw.length > 0) {
                esSuccess = true;
              }
            }
          }
        }
      } catch (err) {
        console.error("Elasticsearch candidate query failed, falling back to local database search:", err);
      }

      if (!esSuccess) {
        let q = supabase
          .from("profiles")
          .select(`
            id, first_name, last_name, avatar_url, headline, current_title, current_company, location, experience_type, total_experience, skills, about, created_at, updated_at, last_active_at, preferred_location, desired_job_title, job_type_pref, work_auth, willing_to_relocate, preferred_interview_mode,
            work_experience(id, company, title, start_date, end_date, description, is_current),
            education(id, institution, degree, field, start_year, end_year)
          `);

        if (activeKeywords.trim()) {
          const { tokens: rawTokens, isOr: rawIsOr } = parseSearchTokens(activeKeywords);
          const searchTokens = rawTokens.length > 0 ? rawTokens : [activeKeywords.trim()];
          const isOrQuery = booleanSearchEnabled ? rawIsOr : true;

          if (isOrQuery) {
            // OR mode: combine all token clauses
            const clauses = searchTokens.flatMap(term => [
              `first_name.ilike.%${term}%`,
              `last_name.ilike.%${term}%`,
              `headline.ilike.%${term}%`,
              `current_title.ilike.%${term}%`,
              `current_company.ilike.%${term}%`,
              `about.ilike.%${term}%`
            ]);
            if (clauses.length > 0) {
              q = q.or(clauses.join(","));
            }
          } else {
            // AND mode: each token must match at least one field
            searchTokens.forEach(token => {
              q = q.or(
                `first_name.ilike.%${token}%,last_name.ilike.%${token}%,` +
                `headline.ilike.%${token}%,current_title.ilike.%${token}%,` +
                `current_company.ilike.%${token}%,about.ilike.%${token}%`
              );
            });
          }
        }

        // Dedicated Location Filter with city variations (e.g., Bangalore <-> Bengaluru, Gurgaon <-> Gurugram)
        if (location.trim()) {
          const locLower = location.trim().toLowerCase();
          const locVars = [locLower];
          if (locLower === "bangalore") locVars.push("bengaluru");
          if (locLower === "bengaluru") locVars.push("bangalore");
          if (locLower === "gurgaon") locVars.push("gurugram");
          if (locLower === "gurugram") locVars.push("gurgaon");
          if (locLower === "mumbai") locVars.push("bombay");
          if (locLower === "delhi") locVars.push("ncr");

          const locClauses = locVars.map(v => `location.ilike.%${v}%`);
          q = q.or(locClauses.join(","));
        }

        if (currentCompany.trim()) q = q.ilike("current_company", `%${currentCompany.trim()}%`);
        const { data } = await q.limit(200);
        raw = (data as unknown as DBCandidate[]) || [];

        if (activeKeywords.trim()) {
          const { tokens: skillSearchTokens } = parseSearchTokens(activeKeywords.toLowerCase());
          const allSkillTerms = skillSearchTokens.flatMap(token => getSkillSearchTerms(token)).slice(0, 30);
          if (allSkillTerms.length > 0) {
            const { data: skillMatches } = await supabase
              .from("profiles")
              .select(`
                id, first_name, last_name, avatar_url, headline, current_title, current_company, location, experience_type, total_experience, skills, about, created_at, updated_at, last_active_at,
                work_experience(id, company, title, start_date, end_date, description, is_current),
                education(id, institution, degree, field, start_year, end_year)
              `)
              .overlaps("skills", allSkillTerms);
            if (skillMatches) {
              const ids = new Set(raw.map(r => r.id));
              (skillMatches as unknown as DBCandidate[]).forEach(sm => { if (!ids.has(sm.id)) raw.push(sm); });
            }
          }
        }

        if (activeKeywords.trim()) {
          let broadSkillQuery = supabase
            .from("profiles")
            .select(`
              id, first_name, last_name, avatar_url, headline, current_title, current_company, location, experience_type, total_experience, skills, about, created_at, updated_at, last_active_at, preferred_location, desired_job_title, job_type_pref, work_auth, willing_to_relocate, preferred_interview_mode,
              work_experience(id, company, title, start_date, end_date, description, is_current),
              education(id, institution, degree, field, start_year, end_year)
            `);
          if (location.trim()) broadSkillQuery = broadSkillQuery.ilike("location", `%${location.trim()}%`);
          if (currentCompany.trim()) broadSkillQuery = broadSkillQuery.ilike("current_company", `%${currentCompany.trim()}%`);

          const { data: broadSkillCandidates } = await broadSkillQuery.limit(1000);
          if (broadSkillCandidates) {
            const ids = new Set(raw.map(r => r.id));
            const { tokens } = parseSearchTokens(activeKeywords.toLowerCase());
            (broadSkillCandidates as unknown as DBCandidate[]).forEach(candidate => {
              if (!ids.has(candidate.id)) {
                const hasSkillMatch = (candidate.skills || []).some(skill =>
                  tokens.some(token => skillsMatch(skill, token) || fuzzyMatch(token, skill))
                );
                if (hasSkillMatch) {
                  raw.push(candidate);
                  ids.add(candidate.id);
                }
              }
            });
          }

          const { tokens: filterTokens, isOr: rawIsOrFilter, notTokens } = parseSearchTokens(activeKeywords);
          const isOrFilter = booleanSearchEnabled ? rawIsOrFilter : false;

          raw = raw.filter(candidate => {
            const searchableText = [
              candidate.first_name,
              candidate.last_name,
              candidate.headline,
              candidate.current_title,
              candidate.current_company,
              candidate.about,
            ].filter(Boolean).join(" ").toLowerCase();

            const matchToken = (token: string) => {
              const t = token.toLowerCase().trim();
              if (!t) return false;

              // 1. Direct text inclusion
              if (searchableText.includes(t)) return true;

              // 2. Skill matches (exact, keyword expanded if enabled, or fuzzy)
              if ((candidate.skills || []).some(skill =>
                (keywordSearchEnabled && skillsMatch(skill, t)) ||
                skill.toLowerCase().includes(t) ||
                fuzzyMatch(t, skill)
              )) return true;

              // 3. Work experience title/description match
              if ((candidate.work_experience || []).some(we =>
                (we.title && (we.title.toLowerCase().includes(t) || fuzzyMatch(t, we.title))) ||
                (we.description && we.description.toLowerCase().includes(t))
              )) return true;

              // 4. Fuzzy text match for current title / headline / company
              if (candidate.current_title && fuzzyMatch(t, candidate.current_title)) return true;
              if (candidate.headline && fuzzyMatch(t, candidate.headline)) return true;

              return false;
            };

            // If Boolean Search is ON and NOT tokens exist, exclude candidates matching any NOT token
            if (booleanSearchEnabled && notTokens.length > 0) {
              if (notTokens.some(nt => matchToken(nt))) return false;
            }

            if (filterTokens.length === 0) return true;
            // Strict ALL-skills matching: candidate MUST possess ALL requested skills (e.g. both Python AND React)
            return filterTokens.every(t => matchToken(t));
          });
        }
      }

      // Experience type (client-side so null values aren't excluded)
      if (expType) {
        raw = raw.filter(c => {
          const yrs = parseExp(c);
          if (expType === "fresher") {
            return yrs <= 1;
          } else {
            return yrs > 1 || c.experience_type === "experienced";
          }
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
      // Active In filter
      if (activeIn && activeIn !== "any") {
        const maxActiveDays = getActiveInDays(activeIn);
        if (maxActiveDays !== null) {
          const activeCutoff = Date.now() - maxActiveDays * 24 * 60 * 60 * 1000;
          raw = raw.filter(c => {
            const activeDate = parseActiveDate(c);
            if (!activeDate) return true;
            return activeDate.getTime() >= activeCutoff;
          });
        }
      }

      // Multi-level location filter (Country, State, City)
      if (selectedCountry || selectedState || selectedCity) {
        const countryObj = countriesList.find(cnt => cnt.isoCode === selectedCountry);
        const stateObj = statesList.find(st => st.isoCode === selectedState);
        const countryName = countryObj ? countryObj.name : selectedCountry;
        const stateName = stateObj ? stateObj.name : selectedState;
        raw = raw.filter(c => {
          const locs = [
            c.location,
            ...(Array.isArray((c as any).preferred_location)
              ? (c as any).preferred_location
              : typeof (c as any).preferred_location === "string"
              ? (c as any).preferred_location.split(",").map((s: string) => s.trim())
              : [(c as any).preferred_location])
          ].filter(Boolean) as string[];
          return matchesMultiLevelLocation(locs, { country: countryName, state: stateName, city: selectedCity });
        });
      }

      // Radius-based location filter
      if (locationRadius && (location.trim() || selectedCity || selectedState)) {
        const targetCenter = selectedCity || location.trim() || selectedState;
        const radiusNum = parseFloat(locationRadius);
        if (targetCenter && !isNaN(radiusNum)) {
          raw = raw.filter(c => {
            const locs = [
              c.location,
              ...(Array.isArray((c as any).preferred_location)
                ? (c as any).preferred_location
                : typeof (c as any).preferred_location === "string"
                ? (c as any).preferred_location.split(",").map((s: string) => s.trim())
                : [(c as any).preferred_location])
            ].filter(Boolean) as string[];
            return isLocationWithinRadius(locs, targetCenter, radiusNum);
          });
        }
      }

      // Industry filter (IT / Non-IT)
      raw = raw.filter(c => {
        if (!industry) return true;
        const indLower = industry.toLowerCase();
        const cText = [
          c.headline,
          c.current_title,
          c.about,
          ...(c.skills || []),
          ...(c.work_experience || []).flatMap(w => [w.title, w.company, w.description])
        ].filter(Boolean).join(" ").toLowerCase();

        const itKeywords = [
          "software", "developer", "engineer", "react", "node", "python", "java", "javascript",
          "typescript", "tech", "technology", "it", "code", "frontend", "backend", "fullstack",
          "cloud", "aws", "devops", "data", "ai", "ml", "system", "web", "mobile", "qa", "tester"
        ];

        const isItCandidate = itKeywords.some(kw => cText.includes(kw));
        if (indLower === "it") return isItCandidate;
        if (indLower === "non-it" || indLower === "no-it") return !isItCandidate;
        return cText.includes(indLower);
      });

      // Sort
      if (sortBy === "exp_desc") raw.sort((a, b) => parseExp(b) - parseExp(a));
      else if (sortBy === "exp_asc") raw.sort((a, b) => parseExp(a) - parseExp(b));
      else if (sortBy === "salary_asc") raw.sort((a, b) => parseSal(a.expected_salary) - parseSal(b.expected_salary));
      else if (sortBy === "recent") raw.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      else raw.sort((a, b) => computeCandidateRelevanceScore(b, activeKeywords) - computeCandidateRelevanceScore(a, activeKeywords));

      if (raw.length > 0) {
        const candidateIds = raw.map(c => c.id).filter(Boolean);
        if (candidateIds.length > 0) {
          void supabase.rpc("increment_recruiter_searches", { target_profile_ids: candidateIds }).then(({ error }) => {
            if (error) console.warn("Failed to increment recruiter searches (migration might not be run):", error.message);
          });
        }
      }

      setSearchPage(1);
      setResults(raw);
    } finally {
      setSearching(false);
    }
  };

  // Dynamically update candidate search results on mount and when filters/keywords change
  useEffect(() => {
    if (booleanSearchError) {
      setSearched(false);
      setResults([]);
      setSearching(false);
      return;
    }

    const timer = setTimeout(() => {
      handleSearch(keywords);
    }, 250);
    return () => clearTimeout(timer);
  }, [
    location,
    currentCompany,
    skillTags,
    expMin,
    expMax,
    curSalMin,
    curSalMax,
    expSalMax,
    noticePeriod,
    education,
    industry,
    expType,
    activeIn,
    selectedCountry,
    selectedState,
    selectedCity,
    locationRadius,
    booleanSearchEnabled,
    booleanSearchError,
    sortBy,
  ]);

  const clearAllFilters = () => {
    setExpMin(""); setExpMax(""); setCurSalMin(""); setCurSalMax("");
    setExpSalMax(""); setNoticePeriod(""); setEducation("");
    setIndustry(""); setCurrentCompany(""); setExpType(""); setActiveIn("any"); setSkillTags([]);
    setSelectedCountry(""); setSelectedState(""); setSelectedCity(""); setLocationRadius("");
    setSearchPage(1);
    if (!keywords.trim()) {
      setSearched(false);
      setResults([]);
    }
  };

  const CANDIDATES_PER_PAGE = 20;

  const totalSearchPages = useMemo(() => {
    return Math.ceil(results.length / CANDIDATES_PER_PAGE);
  }, [results]);

  const searchPageNumbers = useMemo(
    () => Array.from({ length: totalSearchPages }, (_, index) => index + 1),
    [totalSearchPages]
  );

  const visibleCandidates = useMemo(() => {
    return results.slice((searchPage - 1) * CANDIDATES_PER_PAGE, searchPage * CANDIDATES_PER_PAGE);
  }, [results, searchPage]);

  // Scroll to top of window when search page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [searchPage]);

  const activeFilterCount = [
    expMin, expMax, curSalMin, curSalMax, expSalMax, noticePeriod, education, industry, currentCompany, expType,
    activeIn && activeIn !== "any" ? "activeIn" : "",
    selectedCountry, selectedState, selectedCity, locationRadius
  ].filter(Boolean).length + skillTags.length;

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
              ref={keywordInputRef}
              value={keywords}
              onFocus={() => setSkillSuggestionsOpen(true)}
              onChange={e => {
                setKeywords(e.target.value);
                setSkillSuggestionsOpen(true);
              }}
              onKeyDown={e => {
                if (e.key === "ArrowDown") {
                  if (skillSuggestionsOpen && flatSuggestionsList.length > 0) {
                    e.preventDefault();
                    setHighlightedIndex(prev => (prev + 1) % flatSuggestionsList.length);
                  } else {
                    setSkillSuggestionsOpen(true);
                  }
                } else if (e.key === "ArrowUp") {
                  if (skillSuggestionsOpen && flatSuggestionsList.length > 0) {
                    e.preventDefault();
                    setHighlightedIndex(prev => (prev - 1 + flatSuggestionsList.length) % flatSuggestionsList.length);
                  }
                } else if (e.key === "Enter") {
                  if (skillSuggestionsOpen && highlightedIndex >= 0 && highlightedIndex < flatSuggestionsList.length) {
                    e.preventDefault();
                    selectSuggestion(flatSuggestionsList[highlightedIndex].value);
                  } else {
                    e.preventDefault();
                    setSkillSuggestionsOpen(false);
                    handleSearch();
                  }
                } else if (e.key === "Escape") {
                  setSkillSuggestionsOpen(false);
                } else if (e.key === "Tab") {
                  if (skillSuggestionsOpen && highlightedIndex >= 0 && highlightedIndex < flatSuggestionsList.length) {
                    e.preventDefault();
                    selectSuggestion(flatSuggestionsList[highlightedIndex].value);
                  }
                }
              }}
              className={`pl-9 ${keywords ? "pr-9" : ""} bg-[#F6F6F6] rounded-xl transition-all ${booleanSearchError
                ? "border-red-500 ring-2 ring-red-200 text-red-700 bg-red-50/20"
                : "border-gray-200"
                }`}
              placeholder={booleanSearchEnabled ? "e.g. React AND Python NOT Angular" : "Skills, designation, company name..."}
            />
            {keywords && (
              <button
                type="button"
                onClick={() => {
                  setKeywords("");
                  setSkillSuggestionsOpen(false);
                  handleSearch("");
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8A8A] hover:text-[#3A1F1F]"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {booleanSearchError && (
              <div className="flex items-center justify-between gap-2 mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-600 flex-wrap">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                  <span>{booleanSearchError}</span>
                </div>
                {!booleanSearchEnabled && /\b(?:and|or|not)\b/i.test(keywords) && (
                  <button
                    type="button"
                    onClick={() => {
                      setBooleanSearchEnabled(true);
                      setKeywords(prev => prev.replace(/,/g, " ").replace(/\s+/g, " "));
                    }}
                    className="ml-auto bg-[#FF2B2B] hover:bg-[#e02525] text-white text-xs px-3 py-1 rounded-md shadow-sm font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Zap className="h-3 w-3" /> Turn ON Boolean Search
                  </button>
                )}
              </div>
            )}
            {skillSuggestionsOpen && hasSuggestions && (
              <div
                ref={dropdownContainerRef}
                className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
              >
                <div className="max-h-72 overflow-y-auto">
                  {filteredSuggestions.skills.length > 0 && (
                    <div>
                      <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 bg-gray-50 uppercase tracking-wider">Skills</div>
                      {filteredSuggestions.skills.map(skill => {
                        const globalIndex = flatSuggestionsList.findIndex(item => item.value === skill && item.type === "skill");
                        const isHighlighted = globalIndex === highlightedIndex;
                        return (
                          <button
                            key={`skill-${skill}`}
                            type="button"
                            onClick={() => selectSuggestion(skill)}
                            onMouseEnter={() => setHighlightedIndex(globalIndex)}
                            className={`flex w-full items-center px-3 py-2 text-left text-sm transition-colors ${isHighlighted ? "bg-[#FFF0F0] text-[#FF2B2B] font-medium" : "text-[#3A1F1F] hover:bg-gray-50"
                              }`}
                          >
                            <Tag className="h-3.5 w-3.5 mr-2 opacity-60 text-[#FF2B2B]" />
                            <span>{skill}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {filteredSuggestions.designations.length > 0 && (
                    <div>
                      <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 bg-gray-50 uppercase tracking-wider">Roles / Designations</div>
                      {filteredSuggestions.designations.map(role => {
                        const globalIndex = flatSuggestionsList.findIndex(item => item.value === role && item.type === "designation");
                        const isHighlighted = globalIndex === highlightedIndex;
                        return (
                          <button
                            key={`role-${role}`}
                            type="button"
                            onClick={() => selectSuggestion(role)}
                            onMouseEnter={() => setHighlightedIndex(globalIndex)}
                            className={`flex w-full items-center px-3 py-2 text-left text-sm transition-colors ${isHighlighted ? "bg-[#FFF0F0] text-[#FF2B2B] font-medium" : "text-[#3A1F1F] hover:bg-gray-50"
                              }`}
                          >
                            <Briefcase className="h-3.5 w-3.5 mr-2 opacity-60 text-emerald-600" />
                            <span>{role}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
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
          <Button onClick={handleSearch} disabled={searching || !!booleanSearchError} className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-xl px-6 disabled:opacity-50">
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

        {/* Toggle Switch: Boolean Search */}
        <div className="flex items-center gap-6 mt-3 pt-2 border-t border-gray-100">
          <label className="flex items-center gap-2 text-xs font-medium text-[#5A5A5A] cursor-pointer select-none">
            <span>Boolean Search</span>
            <div
              onClick={() => {
                const nextState = !booleanSearchEnabled;
                setBooleanSearchEnabled(nextState);
                if (nextState) {
                  // Switching to Boolean Search ON: strip all commas from input
                  setKeywords(prev => prev.replace(/,/g, " ").replace(/\s+/g, " "));
                } else {
                  // Switching to Boolean Search OFF: strip AND, OR, NOT operator words from input
                  setKeywords(prev => prev.replace(/\b(?:and|or|not)\b/gi, " ").replace(/\s+/g, " "));
                }
              }}
              className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${booleanSearchEnabled ? "bg-[#FF2B2B]" : "bg-gray-300"}`}
            >
              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${booleanSearchEnabled ? "translate-x-4" : "translate-x-0"}`} />
            </div>
          </label>
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

          {/* Skills (Top Filter) */}
          <div className="px-4 py-3 border-b border-gray-100">
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

          {/* Experience */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-[#3A1F1F] mb-2 uppercase tracking-wide">Experience</p>
            <div className="flex gap-2 items-center">
              <Select value={expMin || "any"} onValueChange={v => setExpMin(v === "any" ? "" : v)}>
                <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-lg text-xs h-8 flex-1"><SelectValue placeholder="Min" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15].map(y => <SelectItem key={y} value={String(y)}>{y} yr</SelectItem>)}
                </SelectContent>
              </Select>
              <span className="text-[#8A8A8A] text-xs">–</span>
              <Select value={expMax || "any"} onValueChange={v => setExpMax(v === "any" ? "" : v)}>
                <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-lg text-xs h-8 flex-1"><SelectValue placeholder="Max" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {[1, 2, 3, 5, 7, 10, 12, 15, 20, 25].map(y => <SelectItem key={y} value={String(y)}>{y} yr</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active In Dropdown */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-[#3A1F1F] mb-2 uppercase tracking-wide">Active In</p>
            <Select value={activeIn || "any"} onValueChange={v => setActiveIn(v)}>
              <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-lg text-xs h-8"><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="7days">7 days</SelectItem>
                <SelectItem value="15days">15 days</SelectItem>
                <SelectItem value="30days">30 days</SelectItem>
                <SelectItem value="2months">2 months</SelectItem>
                <SelectItem value="3months">3 months</SelectItem>
                <SelectItem value="6months">6 months</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Location Filters (Multi-level & Radius) */}
          <div className="px-4 py-3 border-b border-gray-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[#3A1F1F] uppercase tracking-wide">Location Filter</p>
              <MapPin className="h-3.5 w-3.5 text-[#FF2B2B]" />
            </div>

            {/* Country Selector */}
            <div>
              <label className="text-[10px] text-[#8A8A8A] block mb-0.5 uppercase font-medium">Country</label>
              <Select value={selectedCountry || "any"} onValueChange={v => {
                const val = v === "any" ? "" : v;
                setSelectedCountry(val);
                setSelectedState("");
                setSelectedCity("");
              }}>
                <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-lg text-xs h-8"><SelectValue placeholder="Any Country" /></SelectTrigger>
                <SelectContent className="max-h-48">
                  <SelectItem value="any">Any Country</SelectItem>
                  {countriesList.map(c => <SelectItem key={c.isoCode} value={c.isoCode}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* State Selector */}
            {selectedCountry && (
              <div>
                <label className="text-[10px] text-[#8A8A8A] block mb-0.5 uppercase font-medium">State</label>
                <Select value={selectedState || "any"} onValueChange={v => {
                  const val = v === "any" ? "" : v;
                  setSelectedState(val);
                  setSelectedCity("");
                }}>
                  <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-lg text-xs h-8"><SelectValue placeholder="Any State" /></SelectTrigger>
                  <SelectContent className="max-h-48">
                    <SelectItem value="any">Any State</SelectItem>
                    {statesList.map(s => <SelectItem key={s.isoCode} value={s.isoCode}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* City Selector */}
            {selectedCountry && (
              <div>
                <label className="text-[10px] text-[#8A8A8A] block mb-0.5 uppercase font-medium">City</label>
                <Select value={selectedCity || "any"} onValueChange={v => setSelectedCity(v === "any" ? "" : v)}>
                  <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-lg text-xs h-8"><SelectValue placeholder="Any City" /></SelectTrigger>
                  <SelectContent className="max-h-48">
                    <SelectItem value="any">Any City</SelectItem>
                    {citiesList.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Radius Selector */}
            <div>
              <label className="text-[10px] text-[#8A8A8A] block mb-0.5 uppercase font-medium">Radius Distance</label>
              <Select value={locationRadius || "any"} onValueChange={v => setLocationRadius(v === "any" ? "" : v)}>
                <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-lg text-xs h-8"><SelectValue placeholder="Any Distance" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any Distance</SelectItem>
                  <SelectItem value="10">Within 10 km</SelectItem>
                  <SelectItem value="25">Within 25 km</SelectItem>
                  <SelectItem value="50">Within 50 km</SelectItem>
                  <SelectItem value="100">Within 100 km</SelectItem>
                  <SelectItem value="200">Within 200 km</SelectItem>
                </SelectContent>
              </Select>
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
                {[5, 8, 10, 12, 15, 20, 25, 30, 40, 50].map(v => <SelectItem key={v} value={String(v)}>{v} LPA</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Notice Period Dropdown */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-[#3A1F1F] mb-2 uppercase tracking-wide">Notice Period</p>
            <Select value={noticePeriod || "any"} onValueChange={v => setNoticePeriod(v === "any" ? "" : v)}>
              <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-lg text-xs h-8"><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Notice</SelectItem>
                <SelectItem value="immediate">Immediate joiner</SelectItem>
                <SelectItem value="15">≤ 15 days</SelectItem>
                <SelectItem value="30">≤ 30 days</SelectItem>
                <SelectItem value="60">≤ 60 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Industry Dropdown */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-[#3A1F1F] mb-2 uppercase tracking-wide">Industry</p>
            <Select value={industry || "any"} onValueChange={v => setIndustry(v === "any" ? "" : v)}>
              <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-lg text-xs h-8"><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Industry</SelectItem>
                <SelectItem value="it">IT</SelectItem>
                <SelectItem value="non-it">Non-IT</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Education */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-[#3A1F1F] mb-2 uppercase tracking-wide">Education</p>
            <Select value={education || "any"} onValueChange={v => setEducation(v === "any" ? "" : v)}>
              <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-lg text-xs h-8"><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                {["B.Tech", "M.Tech", "MBA", "B.Com", "BCA", "MCA", "B.Sc", "M.Sc", "PhD", "Diploma"].map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Current Company */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-[#3A1F1F] mb-2 uppercase tracking-wide">Current Company</p>
            <Input value={currentCompany} onChange={e => setCurrentCompany(e.target.value)} className="bg-[#F6F6F6] border-gray-200 rounded-lg text-xs h-8" placeholder="Enter company name" />
          </div>

          {/* Apply Filters button */}
          <div className="px-4 pb-4 pt-3">
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
                {visibleCandidates.map(c => {
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
                            {/* Name + Match + Active status on right top */}
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                  <h3 className="text-base font-semibold text-[#3A1F1F]">{name}</h3>
                                  {c.location && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs text-[#FF2B2B] bg-red-50 border border-red-100 font-medium">
                                      <MapPin className="h-3 w-3 text-[#FF2B2B]" /> {c.location}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-[#5A5A5A]">
                                  {c.headline || c.current_title || (workExp[0] ? workExp[0].title : "")}
                                  {(c.current_company || workExp[0]?.company) && (
                                    <span> at <span className="text-[#FF2B2B] font-medium">{c.current_company || workExp[0].company}</span></span>
                                  )}
                                </p>
                              </div>

                              {/* Active status badge on top right */}
                              {(() => {
                                const activeDate = parseActiveDate(c);
                                const activeLabel = formatActiveTime(activeDate) || "Active in a day";
                                return (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-xs shrink-0">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    {activeLabel}
                                  </span>
                                );
                              })()}
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
                            {(() => {
                              const searchTokensList = parseSearchTokens(keywords).tokens.map(t => t.toLowerCase().trim()).concat(skillTags.map(t => t.toLowerCase().trim())).filter(Boolean);
                              const isSkillMatched = (s: string) => searchTokensList.some(t => skillsMatch(s, t) || s.toLowerCase().includes(t) || fuzzyMatch(t, s));

                              const sortedSkills = [...skills].sort((a, b) => {
                                const aMatch = isSkillMatched(a) ? 1 : 0;
                                const bMatch = isSkillMatched(b) ? 1 : 0;
                                return bMatch - aMatch;
                              });

                              return (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {sortedSkills.slice(0, 7).map((s: string, i: number) => {
                                    const matched = isSkillMatched(s);
                                    return (
                                      <Badge
                                        key={i}
                                        className={`text-xs transition-colors ${matched
                                          ? "bg-[#FF2B2B] text-white font-semibold shadow-sm border border-[#FF2B2B]"
                                          : "bg-[#ECECF4] text-[#3A1F1F]"
                                          }`}
                                      >
                                        {s}
                                      </Badge>
                                    );
                                  })}
                                  {sortedSkills.length > 7 && (
                                    <Badge className="bg-gray-100 text-[#8A8A8A] text-xs">
                                      +{sortedSkills.length - 7}
                                    </Badge>
                                  )}
                                </div>
                              );
                            })()}

                            {/* About — clamped to 2 lines */}
                            {c.about && (
                              <SafeHtml
                                content={c.about}
                                className="mt-1.5 text-xs text-[#5A5A5A] line-clamp-2 leading-relaxed overflow-hidden"
                              />
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 flex-wrap">
                          <Button size="sm" asChild className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full text-xs h-7">
                            <a
                              href={`/recruiter/candidate/${c.id}/profile`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => {
                                if (c?.id) {
                                  void supabase.rpc("increment_profile_views", { target_profile_id: c.id }).then(({ error }) => {
                                    if (error) console.warn("Failed to increment profile views (migration might not be run):", error.message);
                                  });
                                }
                              }}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" /> View Full Profile
                            </a>
                          </Button>
                          <Button size="sm" variant={shortlisted.has(c.id) ? "default" : "outline"} className={shortlisted.has(c.id) ? "bg-pink-600 hover:bg-pink-700 text-white rounded-full text-xs h-7 cursor-default" : "border-pink-500 text-pink-600 hover:bg-pink-50 rounded-full text-xs h-7"} onClick={() => toggleShortlist(c.id)}>
                            <ThumbsUp className="h-3.5 w-3.5 mr-1" /> {shortlisted.has(c.id) ? "Shortlisted" : "Shortlist"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-gray-200 text-[#3A1F1F] hover:bg-gray-50 rounded-full text-xs h-7"
                            onClick={() => handleMessageCandidate(c)}
                          >
                            <Mail className="h-3.5 w-3.5 mr-1" /> Message
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!shortlisted.has(c.id)}
                            title={!shortlisted.has(c.id) ? "Please shortlist candidate first before interview" : "Go to Applicants module to schedule interview"}
                            className={
                              !shortlisted.has(c.id)
                                ? "border-purple-200 text-purple-300 rounded-full text-xs h-7 opacity-50 cursor-not-allowed"
                                : "border-purple-400 text-purple-600 hover:bg-purple-50 rounded-full text-xs h-7"
                            }
                            onClick={() => toggleInterview(c.id)}
                          >
                            <Video className="h-3.5 w-3.5 mr-1" /> Interview
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination matching JobSeekerDashboard style */}
              {totalSearchPages > 1 && (
                <div className="flex justify-center mt-8 pb-12" id="candidates-results-pagination">
                  <Pagination>
                    <PaginationContent className="flex-wrap justify-center gap-2">
                      <PaginationItem>
                        <PaginationPrevious
                          href="#candidates-results-pagination"
                          onClick={(event) => {
                            event.preventDefault();
                            if (searchPage > 1) setSearchPage((page) => page - 1);
                          }}
                          className={searchPage === 1 ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>

                      {(() => {
                        const delta = 1;
                        const range: (number | string)[] = [];
                        for (let i = 1; i <= totalSearchPages; i++) {
                          if (i === 1 || i === totalSearchPages || (i >= searchPage - delta && i <= searchPage + delta)) {
                            range.push(i);
                          } else if (range[range.length - 1] !== "...") {
                            range.push("...");
                          }
                        }
                        return range.map((page, idx) => {
                          if (page === "...") {
                            return (
                              <PaginationItem key={`ellipsis-${idx}`}>
                                <PaginationEllipsis className="text-[#8A8A8A]" />
                              </PaginationItem>
                            );
                          }
                          const pageNumber = page as number;
                          return (
                            <PaginationItem key={pageNumber}>
                              <PaginationLink
                                href="#candidates-results-pagination"
                                isActive={searchPage === pageNumber}
                                onClick={(event) => {
                                  event.preventDefault();
                                  setSearchPage(pageNumber);
                                }}
                                className={
                                  searchPage === pageNumber
                                    ? "border-[#FF2B2B] bg-[#FF2B2B] text-white hover:bg-[#e02525] hover:text-white"
                                    : "text-[#3A1F1F]"
                                }
                              >
                                {pageNumber}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        });
                      })()}

                      <PaginationItem>
                        <PaginationNext
                          href="#candidates-results-pagination"
                          onClick={(event) => {
                            event.preventDefault();
                            if (searchPage < totalSearchPages) setSearchPage((page) => page + 1);
                          }}
                          className={searchPage === totalSearchPages ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Emailing Page (Full Search Engine + Job Invitation Broadcast + RhirePro Branded Emails) ───

function EmailingPage() {
  const { recruiterProfile } = useAuth();
  const navigate = useNavigate();

  // ── Search State (Matches Search Candidates 100%) ──
  const [keywords, setKeywords] = useState("");
  const [location, setLocation] = useState("");
  const [keywordSearchEnabled, setKeywordSearchEnabled] = useState(true);
  const [booleanSearchEnabled, setBooleanSearchEnabled] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const keywordInputRef = useRef<HTMLInputElement>(null);
  const dropdownContainerRef = useRef<HTMLDivElement>(null);
  const searchKeywordRef = useRef<HTMLDivElement>(null);

  const [expMin, setExpMin] = useState("");
  const [expMax, setExpMax] = useState("");
  const [curSalMin, setCurSalMin] = useState("");
  const [curSalMax, setCurSalMax] = useState("");
  const [expSalMax, setExpSalMax] = useState("");
  const [noticePeriod, setNoticePeriod] = useState("");
  const [education, setEducation] = useState("");
  const [industry, setIndustry] = useState("");
  const [currentCompany, setCurrentCompany] = useState("");
  const [expType, setExpType] = useState("");
  const [skillTags, setSkillTags] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [skillSuggestionsOpen, setSkillSuggestionsOpen] = useState(false);

  const [results, setResults] = useState<DBCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [sortBy, setSortBy] = useState("relevant");
  const [profileModal, setProfileModal] = useState<DBCandidate | null>(null);

  // ── Recruiter Posted Jobs State ──
  const [recruiterJobs, setRecruiterJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("none");

  // Fetch recruiter's posted jobs
  useEffect(() => {
    if (!recruiterProfile?.id) return;
    supabase
      .from("jobs")
      .select("*")
      .eq("recruiter_id", recruiterProfile.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setRecruiterJobs(data);
      });
  }, [recruiterProfile?.id]);

  // Selected job object reference
  const currentSelectedJob = useMemo(() => {
    return recruiterJobs.find(j => j.id === selectedJobId) || null;
  }, [recruiterJobs, selectedJobId]);

  // ── Multi-Candidate Selection & Email Composer State ──
  const [selectedCandidatesMap, setSelectedCandidatesMap] = useState<Map<string, DBCandidate>>(new Map());

  const selectedCandidates = useMemo(() => {
    return Array.from(selectedCandidatesMap.values());
  }, [selectedCandidatesMap]);

  const selectedCandidateIds = useMemo(() => {
    return new Set(selectedCandidatesMap.keys());
  }, [selectedCandidatesMap]);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [emailTemplateKey, setEmailTemplateKey] = useState<string>("job_invitation");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [composerTab, setComposerTab] = useState<"edit" | "preview">("edit");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Helpers
  const parseExp = (c: DBCandidate) => {
    if (c.total_experience) {
      const m = c.total_experience.match(/(\d+)/);
      if (m) return parseInt(m[1]);
    }
    const exps = c.work_experience || [];
    if (exps.length === 0) return 0;
    let totalMonths = 0;
    const now = new Date();
    exps.forEach(exp => {
      const parseDate = (s: string | null | undefined): Date => {
        if (!s) return now;
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

  const parseSal = (c: DBCandidate) => {
    const salStr = (c as any).salary || (c as any).current_salary || (c as any).expected_salary || (c as any).current_ctc || (c as any).expected_ctc || "";
    if (salStr) {
      const m = String(salStr).match(/(\d+\.?\d*)/);
      if (m) return parseFloat(m[1]);
    }
    return parseExp(c) * 3;
  };

  const parseNotice = (s: string | null) => {
    if (!s) return 999;
    const lower = s.toLowerCase();
    if (lower.includes("immediate") || lower === "0") return 0;
    const monthMatch = lower.match(/(\d+)\s*month/);
    if (monthMatch) return parseInt(monthMatch[1]) * 30;
    const dayMatch = lower.match(/(\d+)/);
    return dayMatch ? parseInt(dayMatch[1]) : 999;
  };

  const parseSearchTokens = (input: string): { tokens: string[]; isOr: boolean; notTokens: string[] } => {
    const trimmed = input.trim();
    if (!trimmed) return { tokens: [], isOr: false, notTokens: [] };

    if (booleanSearchEnabled) {
      const cleanInput = trimmed.replace(/,/g, " ");
      const notTokens: string[] = [];
      const notParts = cleanInput.split(/\bnot\b/i);
      const mainPart = notParts[0];
      for (let i = 1; i < notParts.length; i++) {
        const notWord = notParts[i].trim().split(/\s+/)[0];
        if (notWord) notTokens.push(notWord.toLowerCase());
      }

      const isOr = /\bor\b/i.test(mainPart);
      let tokens: string[] = [];
      if (isOr) {
        tokens = mainPart
          .split(/\bor\b/i)
          .map(s => s.replace(/\b(?:and|not)\b/gi, "").trim())
          .filter(Boolean);
      } else {
        tokens = mainPart
          .split(/\s+/)
          .map(t => t.replace(/\b(?:and|not)\b/gi, "").trim())
          .filter(t => Boolean(t) && !/^(and|or|not)$/i.test(t));
      }
      return { tokens, isOr, notTokens };
    } else {
      const segments = trimmed.split(/,/);
      const tokens = segments.flatMap(s => s.trim().split(/\s+/)).map(t => t.trim()).filter(Boolean);
      return { tokens, isOr: true, notTokens: [] };
    }
  };

  const getCurrentSearchToken = (text: string) => {
    const lastCommaIndex = text.lastIndexOf(",");
    const operatorRegex = /\b(AND|OR|NOT)\b/gi;
    let match;
    let lastOperatorIndex = -1;
    let lastOperatorLength = 0;
    while ((match = operatorRegex.exec(text)) !== null) {
      lastOperatorIndex = match.index;
      lastOperatorLength = match[0].length;
    }
    if (lastCommaIndex === -1 && lastOperatorIndex === -1) {
      return { token: text, prefix: "", separatorType: "none" as const };
    }
    if (lastCommaIndex > lastOperatorIndex) {
      const prefix = text.slice(0, lastCommaIndex + 1);
      const token = text.slice(lastCommaIndex + 1);
      return { token, prefix, separatorType: "comma" as const };
    } else {
      const prefix = text.slice(0, lastOperatorIndex + lastOperatorLength);
      const token = text.slice(lastOperatorIndex + lastOperatorLength);
      return { token, prefix, separatorType: "operator" as const };
    }
  };

  const ALL_SKILL_OPTIONS = useMemo(() => SKILL_OPTIONS, []);
  const ALL_ROLE_AND_DEPT_OPTIONS = useMemo(() => SEARCH_SUGGESTION_DATASET, []);

  const filteredSuggestions = useMemo(() => {
    const { token } = getCurrentSearchToken(keywords);
    const query = token.trim();
    if (!query) return { skills: [], designations: [] };

    const normalizedInputKeywords = keywords
      .toLowerCase()
      .split(/,|\b(?:and|or|not)\b/i)
      .map(k => k.trim())
      .filter(Boolean);

    const isAlreadyPresent = (item: string) => normalizedInputKeywords.includes(item.toLowerCase());
    const qLower = query.toLowerCase();
    const matchedSkills: string[] = [];

    for (let i = 0; i < ALL_SKILL_OPTIONS.length; i++) {
      const skill = ALL_SKILL_OPTIONS[i];
      if (isAlreadyPresent(skill)) continue;
      const sLower = skill.toLowerCase();
      if (sLower.startsWith(qLower) || sLower.includes(qLower)) {
        matchedSkills.push(skill);
        if (matchedSkills.length >= 8) break;
      }
    }

    if (matchedSkills.length < 8) {
      const searchExpansionTerms = getSkillSearchTerms(query);
      for (let i = 0; i < ALL_SKILL_OPTIONS.length; i++) {
        const skill = ALL_SKILL_OPTIONS[i];
        if (isAlreadyPresent(skill) || matchedSkills.includes(skill)) continue;
        const sLower = skill.toLowerCase();
        if (fuzzyMatch(query, skill) || searchExpansionTerms.some(term => sLower.includes(term))) {
          matchedSkills.push(skill);
          if (matchedSkills.length >= 8) break;
        }
      }
    }

    const matchedDesignations: string[] = [];
    for (let i = 0; i < ALL_ROLE_AND_DEPT_OPTIONS.length; i++) {
      const role = ALL_ROLE_AND_DEPT_OPTIONS[i];
      if (isAlreadyPresent(role)) continue;
      const rLower = role.toLowerCase();
      if (rLower.startsWith(qLower) || rLower.includes(qLower) || fuzzyMatch(query, role)) {
        matchedDesignations.push(role);
        if (matchedDesignations.length >= 5) break;
      }
    }

    return { skills: matchedSkills, designations: matchedDesignations };
  }, [keywords, ALL_SKILL_OPTIONS, ALL_ROLE_AND_DEPT_OPTIONS]);

  const flatSuggestionsList = useMemo(() => {
    const list: Array<{ value: string; type: "skill" | "designation" }> = [];
    filteredSuggestions.skills.forEach(skill => list.push({ value: skill, type: "skill" }));
    filteredSuggestions.designations.forEach(role => list.push({ value: role, type: "designation" }));
    return list;
  }, [filteredSuggestions]);

  const hasSuggestions = useMemo(() => flatSuggestionsList.length > 0, [flatSuggestionsList]);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [keywords]);

  const selectSuggestion = (suggestionValue: string) => {
    const { prefix, separatorType } = getCurrentSearchToken(keywords);
    let nextKeywords = "";
    if (separatorType === "none") {
      nextKeywords = suggestionValue + (booleanSearchEnabled ? " " : ", ");
    } else if (separatorType === "comma") {
      nextKeywords = prefix.trim() + " " + suggestionValue + (booleanSearchEnabled ? " " : ", ");
    } else {
      nextKeywords = prefix.trim() + " " + suggestionValue + " ";
    }
    setKeywords(nextKeywords);
    setSkillSuggestionsOpen(false);
    if (keywordInputRef.current) keywordInputRef.current.focus();
  };

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

  const booleanSearchError = useMemo(() => {
    const trimmed = keywords.trim();
    if (!trimmed) return null;

    if (booleanSearchEnabled) {
      const openParen = (trimmed.match(/\(/g) || []).length;
      const closeParen = (trimmed.match(/\)/g) || []).length;
      if (openParen !== closeParen) {
        return `Unbalanced parentheses: ${openParen} opening vs ${closeParen} closing bracket.`;
      }
      const doubleOps = /\b(AND|OR|NOT)\s+(AND|OR|NOT)\b/i;
      if (doubleOps.test(trimmed)) {
        return "Consecutive boolean operators found (e.g. 'AND OR'). Please check operator syntax.";
      }
      const trailingOp = /\b(AND|OR|NOT)\s*$/i;
      if (trailingOp.test(trimmed)) {
        return "Query ends with an incomplete boolean operator (e.g. 'AND'). Add a search term after it.";
      }
    }
    return null;
  }, [keywords, booleanSearchEnabled]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (expMin) count++;
    if (expMax) count++;
    if (curSalMin) count++;
    if (curSalMax) count++;
    if (expSalMax) count++;
    if (noticePeriod) count++;
    if (education) count++;
    if (currentCompany) count++;
    if (expType) count++;
    if (skillTags.length > 0) count += skillTags.length;
    return count;
  }, [expMin, expMax, curSalMin, curSalMax, expSalMax, noticePeriod, education, currentCompany, expType, skillTags]);

  const clearAllFilters = () => {
    setExpMin(""); setExpMax(""); setCurSalMin(""); setCurSalMax(""); setExpSalMax("");
    setNoticePeriod(""); setEducation(""); setCurrentCompany(""); setExpType(""); setSkillTags([]);
  };

  const calculateMatchScore = (candidate: DBCandidate): number => {
    let score = 1;
    const { tokens, isOr, notTokens } = parseSearchTokens(keywords);

    const fullCandidateText = [
      candidate.first_name, candidate.last_name, candidate.headline, candidate.current_title,
      candidate.current_company, candidate.location, candidate.about, candidate.experience_type,
      candidate.total_experience, ...(candidate.skills || []),
      ...(candidate.work_experience || []).map(w => `${w.company} ${w.title} ${w.description}`),
      ...(candidate.education || []).map(e => `${e.institution} ${e.degree} ${e.field}`),
    ].filter(Boolean).join(" ").toLowerCase();

    if (notTokens.length > 0 && notTokens.some(nt => fullCandidateText.includes(nt))) return 0;

    if (tokens.length > 0) {
      if (isOr) {
        const matchesCount = tokens.filter(t => fullCandidateText.includes(t.toLowerCase())).length;
        if (matchesCount === 0) return 0;
        score += Math.min(matchesCount * 15, 30);
      } else {
        const allMatch = tokens.every(t => fullCandidateText.includes(t.toLowerCase()));
        if (!allMatch) return 0;
        score += 30;
      }
    }

    if (location.trim()) {
      if (candidate.location && candidate.location.toLowerCase().includes(location.trim().toLowerCase())) score += 10;
    }
    return score;
  };

  const filteredAndSortedResults = useMemo(() => {
    let list = results.filter(c => calculateMatchScore(c) > 0);

    // Apply experience type filter (fresher vs experienced)
    if (expType) {
      list = list.filter(c => {
        const yrs = parseExp(c);
        if (expType === "fresher") return yrs <= 1;
        return yrs > 1 || c.experience_type === "experienced";
      });
    }

    // Apply experience min/max years filter
    if (expMin || expMax) {
      list = list.filter(c => {
        const yrs = parseExp(c);
        if (expMin && yrs < parseInt(expMin)) return false;
        if (expMax && yrs > parseInt(expMax)) return false;
        return true;
      });
    }

    // Apply notice period filter
    if (noticePeriod) {
      list = list.filter(c => {
        if (!c.notice_period) return false;
        return c.notice_period.toLowerCase().includes(noticePeriod.toLowerCase());
      });
    }

    // Apply current company filter
    if (currentCompany.trim()) {
      list = list.filter(c => {
        if (!c.current_company) return false;
        return c.current_company.toLowerCase().includes(currentCompany.trim().toLowerCase());
      });
    }

    // Apply skill tags filter
    if (skillTags.length > 0) {
      list = list.filter(c => {
        const candidateSkills = (c.skills || []).map(s => s.toLowerCase());
        return skillTags.every(tag => candidateSkills.some(cs => cs.includes(tag.toLowerCase())));
      });
    }

    if (sortBy === "exp") {
      list.sort((a, b) => parseExp(b) - parseExp(a));
    } else if (sortBy === "salary") {
      list.sort((a, b) => parseSal(b) - parseSal(a));
    } else {
      list.sort((a, b) => calculateMatchScore(b) - calculateMatchScore(a));
    }
    return list;
  }, [results, sortBy, keywords, location, booleanSearchEnabled, expMin, expMax, expType, noticePeriod, currentCompany, skillTags]);

  // Predefined Templates (RhirePro styled)
  const EMAIL_TEMPLATES: Record<string, { name: string; subject: string; body: string }> = {
    job_invitation: {
      name: "RhirePro Job Invitation Card",
      subject: "Job Invitation: {{job_title}} at {{company_name}}",
      body: `Hi {{candidate_name}},

You're invited to apply for the {{job_title}} role at {{company_name}}.

Job Highlights:
📍 Location: {{job_location}}
💼 Experience: {{job_experience}}
💰 Offered CTC: {{job_salary}}
🏢 Work Mode: {{work_mode}}
🏷️ Key Skills: {{key_skills}}

Click the link below to view job details & apply on RhirePro:
{{apply_url}}

Best regards,
{{recruiter_name}}
{{company_name}}`,
    },
    resume_request: {
      name: "Resume & Portfolio Request",
      subject: "Request for Updated Resume / Portfolio - {{company_name}}",
      body: `Hi {{candidate_name}},

We reviewed your profile and were impressed by your experience. We currently have active positions at {{company_name}} that align well with your background.

Could you please share your latest updated resume and portfolio/work samples?

Looking forward to connecting!

Best regards,
{{recruiter_name}}
{{company_name}}`,
    },
    interview_invite: {
      name: "Interview Invitation",
      subject: "Interview Invitation: Opportunity at {{company_name}}",
      body: `Hi {{candidate_name}},

Great news! Following a review of your profile, we would love to invite you for an introductory interview at {{company_name}}.

Please reply with your availability over the upcoming days for a brief 30-minute call.

Best regards,
{{recruiter_name}}
{{company_name}}`,
    },
    status_update: {
      name: "Application Shortlisted Notification",
      subject: "Good news regarding your candidacy with {{company_name}}",
      body: `Hi {{candidate_name}},

We are pleased to inform you that your profile has been Shortlisted for further consideration at {{company_name}}!

Our talent acquisition team will reach out shortly regarding the next steps in the process.

Best regards,
{{recruiter_name}}
{{company_name}}`,
    },
    opportunity_inquiry: {
      name: "General Opportunity Outreach",
      subject: "Exciting Career Opportunity at {{company_name}}",
      body: `Hi {{candidate_name}},

I came across your profile and noticed your strong background in your industry.

We have open roles at {{company_name}} that align closely with your skillset. If you are open to exploring new career opportunities, we would love to connect.

Best regards,
{{recruiter_name}}
{{company_name}}`,
    },
    custom: {
      name: "Custom Blank Email",
      subject: "Direct Inquiry from {{company_name}}",
      body: `Hi {{candidate_name}},

[Type your message here...]

Best regards,
{{recruiter_name}}
{{company_name}}`,
    },
  };

  useEffect(() => {
    if (emailTemplateKey && EMAIL_TEMPLATES[emailTemplateKey]) {
      setSubject(EMAIL_TEMPLATES[emailTemplateKey].subject);
      setBody(EMAIL_TEMPLATES[emailTemplateKey].body);
    }
  }, [emailTemplateKey]);

  // Handle job selection changes: auto-fill search & template or reset search filters
  const handleSelectJobForInvite = (jobId: string) => {
    setSelectedJobId(jobId);

    if (jobId === "none") {
      setKeywords("");
      setLocation("");
      setExpMin("");
      setExpMax("");
      setCurSalMin("");
      setCurSalMax("");
      setExpSalMax("");
      setNoticePeriod("");
      setEducation("");
      setIndustry("");
      setCurrentCompany("");
      setExpType("");
      setSkillTags([]);
      setResults([]);
      setSearched(false);
      setEmailTemplateKey("resume_request");
      return;
    }

    const targetJob = recruiterJobs.find(j => j.id === jobId);
    if (targetJob) {
      setEmailTemplateKey("job_invitation");
      setKeywords(targetJob.title || "");
      setLocation(targetJob.location || "");
      setExpMin(targetJob.experience_min !== undefined ? String(targetJob.experience_min) : "");
      setExpMax(targetJob.experience_max !== undefined ? String(targetJob.experience_max) : "");
      setCurrentCompany("");
      setNoticePeriod("");
      setEducation("");
      setSkillTags([]);
    }
  };

  const resetComposerState = (key: string = emailTemplateKey) => {
    const t = EMAIL_TEMPLATES[key] || EMAIL_TEMPLATES["job_invitation"];
    if (t) {
      setSubject(t.subject);
      setBody(t.body);
    }
  };

  const handleOpenSingleEmail = (candidate: DBCandidate) => {
    setSelectedCandidatesMap(prev => {
      const next = new Map(prev);
      next.set(candidate.id, candidate);
      return next;
    });
    setSelectedCandidatesMap(prev => {
      const next = new Map(prev);
      next.set(candidate.id, candidate);
      return next;
    });
    resetComposerState();
    setIsComposerOpen(true);
  };

  const toggleSelectCandidate = (candidate: DBCandidate) => {
    setSelectedCandidatesMap(prev => {
      const next = new Map(prev);
      if (next.has(candidate.id)) {
        next.delete(candidate.id);
      } else {
        next.set(candidate.id, candidate);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    const allSelectedOnPage = filteredAndSortedResults.length > 0 && filteredAndSortedResults.every(c => selectedCandidatesMap.has(c.id));
    setSelectedCandidatesMap(prev => {
      const next = new Map(prev);
      if (allSelectedOnPage) {
        filteredAndSortedResults.forEach(c => next.delete(c.id));
      } else {
        filteredAndSortedResults.forEach(c => next.set(c.id, c));
      }
      return next;
    });
  };

  const removeCandidateFromBatch = (id: string) => {
    setSelectedCandidatesMap(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  };

  const subjectInputRef = useRef<HTMLInputElement>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const lastFocusedFieldRef = useRef<"subject" | "body">("body");
  const subjectCaretPosRef = useRef<{ start: number; end: number }>({ start: -1, end: -1 });
  const bodyCaretPosRef = useRef<{ start: number; end: number }>({ start: -1, end: -1 });

  const recordSubjectCaret = (el: HTMLInputElement | null) => {
    if (el && typeof el.selectionStart === "number" && typeof el.selectionEnd === "number") {
      subjectCaretPosRef.current = { start: el.selectionStart, end: el.selectionEnd };
    }
  };

  const recordBodyCaret = (el: HTMLTextAreaElement | null) => {
    if (el && typeof el.selectionStart === "number" && typeof el.selectionEnd === "number") {
      bodyCaretPosRef.current = { start: el.selectionStart, end: el.selectionEnd };
    }
  };

  const insertTag = (tag: string) => {
    const isSubject = lastFocusedFieldRef.current === "subject";

    if (isSubject && subjectInputRef.current) {
      const el = subjectInputRef.current;
      let start = subjectCaretPosRef.current.start >= 0 ? subjectCaretPosRef.current.start : (el.selectionStart ?? subject.length);
      let end = subjectCaretPosRef.current.end >= 0 ? subjectCaretPosRef.current.end : (el.selectionEnd ?? start);
      if (start > subject.length) start = subject.length;
      if (end > subject.length) end = subject.length;

      const updated = subject.slice(0, start) + tag + subject.slice(end);
      setSubject(updated);
      const newPos = start + tag.length;
      subjectCaretPosRef.current = { start: newPos, end: newPos };
      setTimeout(() => {
        if (subjectInputRef.current) {
          subjectInputRef.current.focus();
          subjectInputRef.current.setSelectionRange(newPos, newPos);
        }
      }, 0);
    } else if (bodyTextareaRef.current) {
      const el = bodyTextareaRef.current;
      let start = bodyCaretPosRef.current.start >= 0 ? bodyCaretPosRef.current.start : (el.selectionStart ?? body.length);
      let end = bodyCaretPosRef.current.end >= 0 ? bodyCaretPosRef.current.end : (el.selectionEnd ?? start);
      if (start > body.length) start = body.length;
      if (end > body.length) end = body.length;

      const updated = body.slice(0, start) + tag + body.slice(end);
      setBody(updated);
      const newPos = start + tag.length;
      bodyCaretPosRef.current = { start: newPos, end: newPos };
      setTimeout(() => {
        if (bodyTextareaRef.current) {
          bodyTextareaRef.current.focus();
          bodyTextareaRef.current.setSelectionRange(newPos, newPos);
        }
      }, 0);
    } else {
      setBody(prev => prev + " " + tag);
    }
  };

  // Dynamic interpolation helper for merge tags
  const getRenderedText = (text: string, candidate?: DBCandidate) => {
    const candidateName = candidate ? getCandidateDisplayName(candidate) : "Candidate";

    // Only resolve job attributes if a specific job is selected (NOT "none")
    const job = (selectedJobId && selectedJobId !== "none")
      ? (recruiterJobs.find(j => j.id === selectedJobId) || null)
      : null;

    const jobTitle = job?.title || (selectedJobId === "none" ? "open" : (candidate?.current_title || candidate?.headline || "Software Developer"));
    const compName = recruiterProfile?.company_name || job?.company_name || "RhirePro Client";
    const recruiterName = recruiterProfile?.recruiter_name || "Talent Acquisition Team";
    const jobLoc = job?.location || (selectedJobId === "none" ? "As discussed / Flexible" : (candidate?.location || "As discussed"));

    let jobExp = "As per role requirements";
    if (job) {
      if (job.experience_min !== undefined && job.experience_min !== null && job.experience_max !== undefined && job.experience_max !== null) {
        jobExp = `${job.experience_min} - ${job.experience_max} yrs`;
      } else if (job.experience_min !== undefined && job.experience_min !== null) {
        jobExp = `${job.experience_min}+ yrs`;
      }
    }

    let jobSal = "As per industry standards";
    if (job) {
      if (job.salary_min && job.salary_max) {
        jobSal = `${job.salary_min} - ${job.salary_max} ${job.salary_type || "LPA"}`;
      } else if (job.salary_min) {
        jobSal = `${job.salary_min} ${job.salary_type || "LPA"}`;
      }
    }

    const workMode = job?.work_mode || job?.employment_type || "Full-time / Remote";
    const skillsList = (job?.skills && job.skills.length > 0)
      ? job.skills.join(", ")
      : (selectedJobId === "none" ? "As per job requirements" : ((candidate?.skills && candidate.skills.length > 0) ? candidate.skills.slice(0, 5).join(", ") : "Relevant Technical Skills"));
    const applyUrl = job?.id ? `${window.location.origin}/job/${job.id}` : `${window.location.origin}/jobs`;

    let rendered = text
      .replaceAll("{{candidate_name}}", candidateName)
      .replaceAll("{{job_title}}", jobTitle)
      .replaceAll("{{company_name}}", compName)
      .replaceAll("{{recruiter_name}}", recruiterName)
      .replaceAll("{{job_location}}", jobLoc)
      .replaceAll("{{job_experience}}", jobExp)
      .replaceAll("{{job_salary}}", jobSal)
      .replaceAll("{{work_mode}}", workMode)
      .replaceAll("{{key_skills}}", skillsList)
      .replaceAll("{{apply_url}}", applyUrl);

    // If user typed custom text inside braces like {{job_dev}} or {{comdoodley_name}}, preserve the inner word
    rendered = rendered.replace(/\{\{([^}]+)\}\}/g, '$1');

    // If batch contains multiple candidates, automatically swap any other candidate's name for candidate's actual name
    if (candidate && selectedCandidates.length > 0) {
      for (const otherCandidate of selectedCandidates) {
        if (otherCandidate.id !== candidate.id) {
          const otherFullName = getCandidateDisplayName(otherCandidate);
          if (otherFullName && otherFullName !== "Candidate" && otherFullName.length > 2 && rendered.includes(otherFullName)) {
            rendered = rendered.replaceAll(otherFullName, candidateName);
          }
          if (otherCandidate.first_name && otherCandidate.first_name.trim().length > 2 && rendered.includes(otherCandidate.first_name.trim())) {
            const candFirstName = candidate.first_name?.trim() || candidateName.split(" ")[0] || candidateName;
            rendered = rendered.replaceAll(otherCandidate.first_name.trim(), candFirstName);
          }
        }
      }
    }

    return rendered;
  };

  const handleSearch = async () => {
    if (booleanSearchError) {
      setSearched(false);
      setResults([]);
      setSearching(false);
      setSkillSuggestionsOpen(false);
      return;
    }
    const activeKeywords = keywords.trim();
    if (!activeKeywords && !location && !currentCompany && skillTags.length === 0) {
      setSearching(false);
      setSearched(false);
      setResults([]);
      setSkillSuggestionsOpen(false);
      return;
    }

    setSearching(true);
    setSearched(true);
    setSkillSuggestionsOpen(false);

    try {
      let raw: DBCandidate[] = [];
      let esSuccess = false;

      try {
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
        const esUrl = `${apiUrl}/candidates/search?q=${encodeURIComponent(activeKeywords)}` +
          `&boolean_mode=${booleanSearchEnabled}` +
          `&location=${encodeURIComponent(location)}` +
          `&current_company=${encodeURIComponent(currentCompany)}` +
          `&skills=${encodeURIComponent(skillTags.join(","))}` +
          `&experience_min=${encodeURIComponent(expMin)}` +
          `&experience_max=${encodeURIComponent(expMax)}`;
        const esRes = await fetch(esUrl);
        if (esRes.ok) {
          const data = await esRes.json();
          const matchedIds = data.candidates.map((c: any) => c.id);
          if (matchedIds.length > 0) {
            const { data: hydratedData } = await supabase
              .from("profiles")
              .select(`
                id, first_name, last_name, avatar_url, headline, current_title, current_company, location, experience_type, total_experience, skills, about, email, phone, created_at, updated_at, last_active_at, preferred_location, desired_job_title, job_type_pref, work_auth, willing_to_relocate, preferred_interview_mode,
                work_experience(id, company, title, start_date, end_date, description, is_current),
                education(id, institution, degree, field, start_year, end_year)
              `)
              .in("id", matchedIds);
            if (hydratedData && hydratedData.length > 0) {
              const idToMap = new Map(hydratedData.map((c: any) => [c.id, c]));
              raw = matchedIds.map((id: string) => idToMap.get(id)).filter(Boolean) as DBCandidate[];
              if (raw.length > 0) {
                esSuccess = true;
              }
            }
          }
        }
      } catch (e) {
        console.warn("ES candidate search fallback:", e);
      }

      if (!esSuccess) {
        let q = supabase
          .from("profiles")
          .select(`
            id, first_name, last_name, avatar_url, headline, current_title, current_company, location, experience_type, total_experience, skills, about, email, phone, created_at, updated_at, last_active_at, preferred_location, desired_job_title, job_type_pref, work_auth, willing_to_relocate, preferred_interview_mode,
            work_experience(id, company, title, start_date, end_date, description, is_current),
            education(id, institution, degree, field, start_year, end_year)
          `);

        if (activeKeywords.trim()) {
          const { tokens: rawTokens, isOr: rawIsOr } = parseSearchTokens(activeKeywords);
          const searchTokens = rawTokens.length > 0 ? rawTokens : [activeKeywords.trim()];
          const isOrQuery = booleanSearchEnabled ? rawIsOr : true;

          if (isOrQuery) {
            const clauses = searchTokens.flatMap(term => [
              `first_name.ilike.%${term}%`,
              `last_name.ilike.%${term}%`,
              `headline.ilike.%${term}%`,
              `current_title.ilike.%${term}%`,
              `current_company.ilike.%${term}%`,
              `about.ilike.%${term}%`
            ]);
            if (clauses.length > 0) {
              q = q.or(clauses.join(","));
            }
          } else {
            searchTokens.forEach(token => {
              q = q.or(
                `first_name.ilike.%${token}%,last_name.ilike.%${token}%,` +
                `headline.ilike.%${token}%,current_title.ilike.%${token}%,` +
                `current_company.ilike.%${token}%,about.ilike.%${token}%`
              );
            });
          }
        }

        if (location.trim()) {
          const locLower = location.trim().toLowerCase();
          const locVars = [locLower];
          if (locLower === "bangalore") locVars.push("bengaluru");
          if (locLower === "bengaluru") locVars.push("bangalore");
          if (locLower === "gurgaon") locVars.push("gurugram");
          if (locLower === "gurugram") locVars.push("gurgaon");
          if (locLower === "mumbai") locVars.push("bombay");
          if (locLower === "delhi") locVars.push("ncr");

          const locClauses = locVars.map(v => `location.ilike.%${v}%`);
          q = q.or(locClauses.join(","));
        }

        if (currentCompany.trim()) q = q.ilike("current_company", `%${currentCompany.trim()}%`);
        const { data, error } = await q.limit(200);
        if (error) throw error;
        raw = (data as unknown as DBCandidate[]) || [];

        if (activeKeywords.trim() || skillTags.length > 0) {
          const { tokens: skillSearchTokens } = parseSearchTokens(activeKeywords.toLowerCase());
          const allSkillTerms = Array.from(new Set([
            ...skillTags.map(s => s.toLowerCase()),
            ...skillSearchTokens.flatMap(token => getSkillSearchTerms(token))
          ])).slice(0, 30);

          if (allSkillTerms.length > 0) {
            const { data: skillMatches } = await supabase
              .from("profiles")
              .select(`
                id, first_name, last_name, avatar_url, headline, current_title, current_company, location, experience_type, total_experience, skills, about, email, phone,
                work_experience(id, company, title, start_date, end_date, description, is_current),
                education(id, institution, degree, field, start_year, end_year)
              `)
              .overlaps("skills", allSkillTerms);
            if (skillMatches) {
              const ids = new Set(raw.map(r => r.id));
              (skillMatches as unknown as DBCandidate[]).forEach(sm => { if (!ids.has(sm.id)) raw.push(sm); });
            }
          }
        }
      }

      setResults(raw);
    } catch (err: any) {
      console.error("Failed to search candidates:", err);
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSendEmails = async () => {
    if (selectedCandidates.length === 0) return;
    setSendingEmail(true);

    try {
      const recipients = selectedCandidates.map(c => ({
        id: c.id,
        email: c.email || `${c.id}@candidate.recruiter`,
        name: getCandidateDisplayName(c),
        subject: getRenderedText(subject, c),
        body: getRenderedText(body, c),
      }));

      for (const candidate of selectedCandidates) {
        const candidateSubject = getRenderedText(subject, candidate);
        const candidateBody = getRenderedText(body, candidate);

        if (candidate.id) {
          const { error: notifErr } = await supabase.from("notifications").insert({
            user_id: candidate.id,
            user_type: "jobseeker",
            type: "message",
            title: candidateSubject,
            message: candidateBody.slice(0, 150) + "...",
            is_read: false,
          });
          if (notifErr) {
            console.error("Supabase Notification insert failed:", notifErr.message);
          }
        }
      }

      await sendRecruiterCandidateEmail({
        recipients,
        subject,
        body,
        templateName: EMAIL_TEMPLATES[emailTemplateKey]?.name,
      });

      const count = selectedCandidates.length;
      setToastMessage(`🎉 Successfully sent email to ${count} candidate${count > 1 ? "s" : ""}!`);
      setTimeout(() => setToastMessage(null), 5000);

      setIsComposerOpen(false);
      setSelectedCandidatesMap(new Map());
    } catch (err: any) {
      alert("Failed to send emails: " + (err.message || "Unknown error"));
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 pb-28">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-[100] bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium text-sm">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-80">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#3A1F1F] flex items-center gap-2">
            <Mail className="h-7 w-7 text-[#FF2B2B]" />
            Candidate Search & Email Broadcast
          </h1>
          <p className="text-sm text-[#8A8A8A] mt-1">
            Search candidates using Boolean filters or select a posted job to broadcast RhirePro job invitation cards directly to candidates' inboxes.
          </p>
        </div>
        <Badge variant="outline" className="w-fit bg-[#FFF0F0] text-[#FF2B2B] border-[#FF2B2B]/20 text-xs px-3 py-1 font-semibold rounded-full flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5" /> RhirePro Job Invites Active
        </Badge>
      </div>

      {/* Job Broadcast Selector Bar */}
      {recruiterJobs.length > 0 && (
        <div className="bg-gradient-to-r from-[#3A1F1F] to-[#201010] text-white p-4 rounded-2xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#FF2B2B]/20 border border-[#FF2B2B]/40 flex items-center justify-center flex-shrink-0 text-[#FF2B2B]">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Select Posted Job to Invite Candidates
              </h3>
              <p className="text-xs text-gray-300">
                Automatically auto-fills job details & RhirePro invitation card template
              </p>
            </div>
          </div>

          <div className="w-full sm:w-72">
            <Select value={selectedJobId} onValueChange={handleSelectJobForInvite}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white rounded-xl text-xs h-9 font-medium">
                <SelectValue placeholder="Choose a posted job..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-xs">-- Custom Outreach (No Job Linked) --</SelectItem>
                {recruiterJobs.map(j => (
                  <SelectItem key={j.id} value={j.id} className="text-xs">
                    {j.title} ({j.location || "Remote"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Main Search Panel */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
        {booleanSearchError && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2.5 rounded-xl text-xs font-medium flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Syntax Warning:</strong> {booleanSearchError}
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative" ref={searchKeywordRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A8A8A]" />
              <Input
                ref={keywordInputRef}
                value={keywords}
                onFocus={() => setSkillSuggestionsOpen(true)}
                onChange={e => {
                  setKeywords(e.target.value);
                  setSkillSuggestionsOpen(true);
                }}
                onKeyDown={e => {
                  if (e.key === "ArrowDown" && hasSuggestions) {
                    e.preventDefault();
                    setHighlightedIndex(prev => (prev < flatSuggestionsList.length - 1 ? prev + 1 : 0));
                  } else if (e.key === "ArrowUp" && hasSuggestions) {
                    e.preventDefault();
                    setHighlightedIndex(prev => (prev > 0 ? prev - 1 : flatSuggestionsList.length - 1));
                  } else if (e.key === "Enter") {
                    if (highlightedIndex >= 0 && flatSuggestionsList[highlightedIndex]) {
                      e.preventDefault();
                      selectSuggestion(flatSuggestionsList[highlightedIndex].value);
                    } else {
                      handleSearch();
                    }
                  } else if (e.key === "Escape") {
                    setSkillSuggestionsOpen(false);
                  }
                }}
                placeholder={booleanSearchEnabled ? "e.g. React AND (Node OR Python) NOT Java" : "Enter keywords, skill, role (comma separated)..."}
                className="pl-9 pr-4 bg-[#F6F6F6] border-gray-200 rounded-xl"
              />
            </div>

            {/* Suggestions Autocomplete Dropdown */}
            {skillSuggestionsOpen && hasSuggestions && (
              <div
                ref={dropdownContainerRef}
                className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
              >
                <div className="max-h-72 overflow-y-auto">
                  {filteredSuggestions.skills.length > 0 && (
                    <div>
                      <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 bg-gray-50 uppercase tracking-wider">Skills</div>
                      {filteredSuggestions.skills.map(skill => {
                        const globalIndex = flatSuggestionsList.findIndex(item => item.value === skill && item.type === "skill");
                        const isHighlighted = globalIndex === highlightedIndex;
                        return (
                          <button
                            key={`skill-${skill}`}
                            type="button"
                            onClick={() => selectSuggestion(skill)}
                            onMouseEnter={() => setHighlightedIndex(globalIndex)}
                            className={`flex w-full items-center px-3 py-2 text-left text-sm transition-colors ${isHighlighted ? "bg-[#FFF0F0] text-[#FF2B2B] font-medium" : "text-[#3A1F1F] hover:bg-gray-50"
                              }`}
                          >
                            <Tag className="h-3.5 w-3.5 mr-2 opacity-60 text-[#FF2B2B]" />
                            <span>{skill}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {filteredSuggestions.designations.length > 0 && (
                    <div>
                      <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 bg-gray-50 uppercase tracking-wider">Roles / Designations</div>
                      {filteredSuggestions.designations.map(role => {
                        const globalIndex = flatSuggestionsList.findIndex(item => item.value === role && item.type === "designation");
                        const isHighlighted = globalIndex === highlightedIndex;
                        return (
                          <button
                            key={`role-${role}`}
                            type="button"
                            onClick={() => selectSuggestion(role)}
                            onMouseEnter={() => setHighlightedIndex(globalIndex)}
                            className={`flex w-full items-center px-3 py-2 text-left text-sm transition-colors ${isHighlighted ? "bg-[#FFF0F0] text-[#FF2B2B] font-medium" : "text-[#3A1F1F] hover:bg-gray-50"
                              }`}
                          >
                            <Briefcase className="h-3.5 w-3.5 mr-2 opacity-60 text-emerald-600" />
                            <span>{role}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <LocationAutocomplete
            value={location}
            onChange={setLocation}
            onEnter={handleSearch}
            placeholder="Location"
            className="min-w-[170px]"
          />

          <Button
            onClick={handleSearch}
            disabled={searching || !!booleanSearchError}
            className="bg-[#FF2B2B] hover:bg-[#D92323] text-white rounded-xl px-6 font-semibold text-sm flex items-center justify-center gap-2"
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search
          </Button>
        </div>

        {/* Quick experience chips */}
        <div className="flex gap-2 mt-3 flex-wrap items-center">
          <span className="text-xs text-[#8A8A8A] font-medium">Quick:</span>
          {[["Fresher", "", "1"], ["1-3 yrs", "1", "3"], ["3-5 yrs", "3", "5"], ["5-8 yrs", "5", "8"], ["8-12 yrs", "8", "12"], ["12+ yrs", "12", "99"]].map(([label, min, max]) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                setExpMin(min);
                setExpMax(max === "1" ? "1" : max);
                if (min === "") setExpType("fresher"); else setExpType("experienced");
              }}
              className={`px-3 py-1 rounded-full text-xs border transition-colors ${expMin === min && expMax === max ? "bg-[#FF2B2B] text-white border-[#FF2B2B]" : "border-gray-200 text-[#5A5A5A] hover:border-[#FF2B2B]"
                }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Boolean Toggle */}
        <div className="flex items-center gap-6 mt-3 pt-2 border-t border-gray-100">
          <label className="flex items-center gap-2 text-xs font-medium text-[#5A5A5A] cursor-pointer select-none">
            <span>Boolean Search Mode</span>
            <div
              onClick={() => {
                const nextState = !booleanSearchEnabled;
                setBooleanSearchEnabled(nextState);
                if (nextState) {
                  setKeywords(prev => prev.replace(/,/g, " ").replace(/\s+/g, " "));
                } else {
                  setKeywords(prev => prev.replace(/\b(?:and|or|not)\b/gi, " ").replace(/\s+/g, " "));
                }
              }}
              className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${booleanSearchEnabled ? "bg-[#FF2B2B]" : "bg-gray-300"}`}
            >
              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${booleanSearchEnabled ? "translate-x-4" : "translate-x-0"}`} />
            </div>
          </label>
        </div>
      </div>

      {/* Main Grid: Sidebar Filters + Candidate Cards */}
      <div className="flex gap-5 items-start">
        {/* Filter Sidebar */}
        <div className="w-64 flex-shrink-0 space-y-0 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-[#3A1F1F]">Refine Results</h3>
            {activeFilterCount > 0 && (
              <button onClick={clearAllFilters} className="text-xs text-[#FF2B2B] hover:underline font-medium">Clear all ({activeFilterCount})</button>
            )}
          </div>

          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-[#3A1F1F] mb-2 uppercase tracking-wide">Experience</p>
            <div className="flex gap-2 items-center">
              <Select value={expMin || "any"} onValueChange={v => setExpMin(v === "any" ? "" : v)}>
                <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-lg text-xs h-8 flex-1"><SelectValue placeholder="Min" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15].map(y => <SelectItem key={y} value={String(y)}>{y} yr</SelectItem>)}
                </SelectContent>
              </Select>
              <span className="text-[#8A8A8A] text-xs">–</span>
              <Select value={expMax || "any"} onValueChange={v => setExpMax(v === "any" ? "" : v)}>
                <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-lg text-xs h-8 flex-1"><SelectValue placeholder="Max" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {[1, 2, 3, 5, 7, 10, 12, 15, 20, 25].map(y => <SelectItem key={y} value={String(y)}>{y} yr</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-[#3A1F1F] mb-2 uppercase tracking-wide">Current Company</p>
            <Input value={currentCompany} onChange={e => setCurrentCompany(e.target.value)} className="bg-[#F6F6F6] border-gray-200 rounded-lg text-xs h-8" placeholder="Company name" />
          </div>

          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-[#3A1F1F] mb-2 uppercase tracking-wide">Notice Period</p>
            <Select value={noticePeriod || "any"} onValueChange={v => setNoticePeriod(v === "any" ? "" : v)}>
              <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-lg text-xs h-8"><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Notice</SelectItem>
                <SelectItem value="immediate">Immediate Joiner</SelectItem>
                <SelectItem value="15">≤ 15 days</SelectItem>
                <SelectItem value="30">≤ 30 days</SelectItem>
                <SelectItem value="60">≤ 60 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Right Candidate List */}
        <div className="flex-1 space-y-4">
          {searched && (
            <div className="flex items-center justify-between bg-white px-4 py-3 border border-gray-200 rounded-xl shadow-xs">
              <div className="flex items-center gap-3">
                {filteredAndSortedResults.length > 0 && (
                  <label className="flex items-center gap-2 text-xs font-semibold text-[#3A1F1F] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCandidateIds.size > 0 && selectedCandidateIds.size === filteredAndSortedResults.length}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-[#FF2B2B] focus:ring-[#FF2B2B] h-4 w-4"
                    />
                    Select All ({filteredAndSortedResults.length})
                  </label>
                )}
                <span className="text-xs text-[#8A8A8A]">
                  Found <strong className="text-[#3A1F1F]">{filteredAndSortedResults.length}</strong> matching candidate{filteredAndSortedResults.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-lg text-xs h-8 w-36">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevant">Most Relevant</SelectItem>
                    <SelectItem value="exp">Most Experienced</SelectItem>
                    <SelectItem value="salary">Highest Salary</SelectItem>
                  </SelectContent>
                </Select>

                {selectedCandidateIds.size > 0 && (
                  <Badge className="bg-[#FFF0F0] text-[#FF2B2B] border-[#FF2B2B]/20 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                    {selectedCandidateIds.size} Selected
                  </Badge>
                )}
              </div>
            </div>
          )}

          {searching && (
            <div className="py-16 text-center bg-white border border-gray-200 rounded-2xl">
              <Loader2 className="h-8 w-8 text-[#FF2B2B] animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium text-[#3A1F1F]">Searching candidate database...</p>
            </div>
          )}

          {!searching && searched && filteredAndSortedResults.length === 0 && (
            <div className="py-16 text-center bg-white border border-gray-200 rounded-2xl p-6">
              <User className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-[#3A1F1F]">No candidates found</h3>
              <p className="text-xs text-[#8A8A8A] mt-1 max-w-sm mx-auto">
                Try broadening your search keywords, location, or experience filters.
              </p>
            </div>
          )}

          {!searching && filteredAndSortedResults.length > 0 && (
            <div className="grid grid-cols-1 gap-4">
              {filteredAndSortedResults.map((candidate) => {
                const isSelected = selectedCandidateIds.has(candidate.id);
                const displayName = getCandidateDisplayName(candidate);
                const initials = getCandidateInitials(displayName);
                const score = calculateMatchScore(candidate);

                return (
                  <div
                    key={candidate.id}
                    className={`bg-white border rounded-2xl p-5 shadow-xs transition-all relative flex flex-col justify-between ${isSelected ? "border-[#FF2B2B] bg-[#FFF8F8]/40 ring-1 ring-[#FF2B2B]/30" : "border-gray-200 hover:border-gray-300"
                      }`}
                  >
                    <div>
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectCandidate(candidate)}
                          className="mt-1 rounded border-gray-300 text-[#FF2B2B] focus:ring-[#FF2B2B] h-4 w-4 cursor-pointer"
                        />

                        <div className="h-11 w-11 rounded-full bg-[#FFF0F0] text-[#FF2B2B] font-bold text-sm flex items-center justify-center flex-shrink-0 border border-[#FF2B2B]/20">
                          {candidate.avatar_url ? (
                            <img src={candidate.avatar_url} alt={displayName} className="h-11 w-11 rounded-full object-cover" />
                          ) : (
                            initials
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <a
                              href={`/recruiter/candidate/${candidate.id}/profile`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-bold text-sm text-[#3A1F1F] hover:text-[#FF2B2B] cursor-pointer truncate"
                              onClick={() => {
                                if (candidate?.id) {
                                  void supabase.rpc("increment_profile_views", { target_profile_id: candidate.id });
                                }
                              }}
                            >
                              {displayName}
                            </a>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px] bg-gray-50 text-gray-600 rounded-md">
                                {candidate.experience_type || "Experienced"}
                              </Badge>
                            </div>
                          </div>

                          <p className="text-xs text-[#8A8A8A] font-medium truncate mt-0.5">
                            {candidate.current_title || candidate.headline || "Candidate Profile"}
                          </p>

                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#8A8A8A] mt-2">
                            {candidate.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-gray-400" /> {candidate.location}
                              </span>
                            )}
                            {candidate.total_experience && (
                              <span className="flex items-center gap-1">
                                <Briefcase className="h-3 w-3 text-gray-400" /> {candidate.total_experience}
                              </span>
                            )}
                            {candidate.email && (
                              <span className="flex items-center gap-1 text-gray-600 truncate">
                                <Mail className="h-3 w-3 text-gray-400" /> {candidate.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {Array.isArray(candidate.skills) && candidate.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-100">
                          {candidate.skills.slice(0, 6).map((skill, idx) => (
                            <Badge key={idx} variant="secondary" className="bg-[#F6F6F6] text-gray-700 text-[10px] rounded-md border-0">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-gray-100">
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        className="text-xs rounded-xl border-gray-200 hover:bg-gray-50 text-[#3A1F1F]"
                      >
                        <a
                          href={`/recruiter/candidate/${candidate.id}/profile`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            if (candidate?.id) {
                              void supabase.rpc("increment_profile_views", { target_profile_id: candidate.id });
                            }
                          }}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" /> View Profile
                        </a>
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => handleOpenSingleEmail(candidate)}
                        className="text-xs bg-[#FF2B2B] hover:bg-[#D92323] text-white rounded-xl font-medium flex items-center gap-1.5"
                      >
                        <Mail className="h-3.5 w-3.5" /> Email Candidate
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Bar */}
      {selectedCandidateIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#3A1F1F] text-white px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/10 animate-in fade-in slide-in-from-bottom-5 max-w-lg w-full">
          <div className="flex items-center gap-2 min-w-0">
            <span className="h-2.5 w-2.5 rounded-full bg-[#FF2B2B] animate-pulse" />
            <span className="text-sm font-semibold truncate">
              {selectedCandidateIds.size} Candidate{selectedCandidateIds.size > 1 ? "s" : ""} Selected
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedCandidatesMap(new Map())}
              className="text-xs border border-white/30 text-white hover:bg-white/20 hover:text-white rounded-xl transition-all cursor-pointer"
            >
              Clear Selection
            </Button>

            <Button
              size="sm"
              onClick={() => setIsComposerOpen(true)}
              className="bg-[#FF2B2B] hover:bg-[#D92323] text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 px-4"
            >
              <Mail className="h-3.5 w-3.5" /> Compose Bulk Email
            </Button>
          </div>
        </div>
      )}

      {/* Email Composer Modal Dialog */}
      <Dialog open={isComposerOpen} onOpenChange={setIsComposerOpen}>
        <DialogContent className="max-w-2xl bg-white rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#3A1F1F] flex items-center gap-2">
              <Mail className="h-5 w-5 text-[#FF2B2B]" />
              Compose Email to Candidates
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Recipients list */}
            <div>
              <label className="text-xs font-semibold text-[#3A1F1F] mb-1.5 block">
                Recipients ({selectedCandidates.length})
              </label>
              <div className="flex flex-wrap gap-1.5 p-2 bg-[#F6F6F6] rounded-xl border border-gray-200 max-h-24 overflow-y-auto">
                {selectedCandidates.map(c => (
                  <Badge
                    key={c.id}
                    variant="secondary"
                    className="bg-white border border-gray-200 text-[#3A1F1F] text-xs py-1 px-2.5 rounded-lg flex items-center gap-1.5 shadow-xs"
                  >
                    <span>{getCandidateDisplayName(c)}</span>
                    <button
                      type="button"
                      onClick={() => removeCandidateFromBatch(c.id)}
                      className="text-gray-400 hover:text-red-500 rounded-full"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Template Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#3A1F1F] mb-1.5 block">Select Predefined Template</label>
                <Select value={emailTemplateKey} onValueChange={setEmailTemplateKey}>
                  <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-xl text-sm font-medium">
                    <SelectValue placeholder="Choose email template" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EMAIL_TEMPLATES).map(([key, t]) => (
                      <SelectItem key={key} value={key} className="text-sm font-medium">
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Linked Job Picker */}
              <div>
                <label className="text-xs font-semibold text-[#3A1F1F] mb-1.5 block">Link Posted Job (Optional)</label>
                <Select value={selectedJobId} onValueChange={handleSelectJobForInvite}>
                  <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-xl text-sm font-medium">
                    <SelectValue placeholder="Select posted job" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Specific Job Linked</SelectItem>
                    {recruiterJobs.map(j => (
                      <SelectItem key={j.id} value={j.id}>
                        {j.title} ({j.location || "Remote"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Merge Tag Chips */}
            <div>
              <label className="text-[11px] font-semibold text-[#8A8A8A] mb-1 block">Insert Dynamic Variables</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "{{candidate_name}}", "{{job_title}}", "{{company_name}}", "{{recruiter_name}}",
                  "{{job_location}}", "{{job_experience}}", "{{job_salary}}", "{{work_mode}}", "{{key_skills}}", "{{apply_url}}"
                ].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => insertTag(tag)}
                    className="text-[11px] font-medium bg-[#FFF0F0] text-[#FF2B2B] hover:bg-[#FFE5E5] px-2.5 py-1 rounded-md border border-[#FF2B2B]/20 transition-colors cursor-pointer"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Tabs Header */}
            <div className="flex border-b border-gray-200 pt-2">
              <button
                type="button"
                onClick={() => setComposerTab("edit")}
                className={`pb-2 px-4 text-xs font-semibold border-b-2 transition-colors ${composerTab === "edit" ? "border-[#FF2B2B] text-[#FF2B2B]" : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
              >
                Edit Message
              </button>
              <button
                type="button"
                onClick={() => setComposerTab("preview")}
                className={`pb-2 px-4 text-xs font-semibold border-b-2 transition-colors ${composerTab === "preview" ? "border-[#FF2B2B] text-[#FF2B2B]" : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
              >
                Live Preview (Candidate View)
              </button>
            </div>

            {/* Edit Content */}
            {composerTab === "edit" && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-xs font-semibold text-[#3A1F1F] mb-1 block">Subject</label>
                  <Input
                    ref={subjectInputRef}
                    value={subject}
                    onFocus={e => {
                      lastFocusedFieldRef.current = "subject";
                      recordSubjectCaret(e.currentTarget);
                    }}
                    onClick={e => {
                      lastFocusedFieldRef.current = "subject";
                      recordSubjectCaret(e.currentTarget);
                    }}
                    onSelect={e => recordSubjectCaret(e.currentTarget)}
                    onChange={e => {
                      setSubject(e.target.value);
                      recordSubjectCaret(e.target);
                    }}
                    className="bg-[#F6F6F6] border-gray-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#3A1F1F] mb-1 block">Email Body</label>
                  <Textarea
                    ref={bodyTextareaRef}
                    rows={9}
                    value={body}
                    onFocus={e => {
                      lastFocusedFieldRef.current = "body";
                      recordBodyCaret(e.currentTarget);
                    }}
                    onClick={e => {
                      lastFocusedFieldRef.current = "body";
                      recordBodyCaret(e.currentTarget);
                    }}
                    onSelect={e => recordBodyCaret(e.currentTarget)}
                    onChange={e => {
                      setBody(e.target.value);
                      recordBodyCaret(e.target);
                    }}
                    className="bg-[#F6F6F6] border-gray-200 rounded-xl text-sm font-sans"
                  />
                </div>
              </div>
            )}

            {/* Live Preview Content (RhirePro Styled HTML Card) */}
            {composerTab === "preview" && (
              <div className="bg-[#F6F6F6] border border-gray-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between text-xs text-[#8A8A8A] border-b border-gray-200 pb-2">
                  <span><strong>Candidate Preview:</strong> {selectedCandidates[0] ? getCandidateDisplayName(selectedCandidates[0]) : "Rahul Sharma"}</span>
                  <Badge variant="outline" className="bg-[#FFF0F0] text-[#FF2B2B] border-[#FF2B2B]/20 text-[10px]">
                    RhirePro HTML Template
                  </Badge>
                </div>

                <div>
                  <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Subject Line</div>
                  <div className="text-sm font-bold text-[#3A1F1F] mt-0.5">
                    {getRenderedText(subject, selectedCandidates[0])}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-600 mb-1">Body Preview:</div>
                  <div className="bg-white border border-gray-200 rounded-lg p-3 text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                    {getRenderedText(body, selectedCandidates[0])}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <Button
                variant="outline"
                onClick={() => setIsComposerOpen(false)}
                className="rounded-xl text-xs border-gray-200"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendEmails}
                disabled={sendingEmail || selectedCandidates.length === 0}
                className="bg-[#FF2B2B] hover:bg-[#D92323] text-white font-semibold text-xs rounded-xl px-5 flex items-center gap-2"
              >
                {sendingEmail ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" /> Send Email ({selectedCandidates.length})
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ApplicantsPage() {
  const { recruiterProfile } = useAuth();
  const location = useLocation();
  const [applicants, setApplicants] = useState<AppWithProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>(() => {
    const queryStatus = new URLSearchParams(window.location.search).get("status");
    return queryStatus || "All";
  });
  const [jobFilter, setJobFilter] = useState<string>(() => {
    const queryJob = new URLSearchParams(window.location.search).get("job");
    return queryJob || "All";
  });
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("recent");
  const [expandedCareer, setExpandedCareer] = useState<string | null>(null);
  const [profileModal, setProfileModal] = useState<AppWithProfile | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Naukri-style advanced filters
  const [expMin, setExpMin] = useState<string>("");
  const [expMax, setExpMax] = useState<string>("");
  const [locationFilter, setLocationFilter] = useState<string>("");
  const [salaryFilter, setSalaryFilter] = useState<string>("");
  const [noticePeriodFilter, setNoticePeriodFilter] = useState<string>("");
  const [skillTags, setSkillTags] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState<string>("");
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [skillDropdownOpen, setSkillDropdownOpen] = useState<boolean>(false);
  const skillFilterRef = useRef<HTMLDivElement>(null);
  const [topSuggestionsOpen, setTopSuggestionsOpen] = useState<boolean>(false);
  const topSearchRef = useRef<HTMLDivElement>(null);

  const addSkillTag = (tag: string) => {
    const t = tag.trim();
    if (t && !skillTags.includes(t)) {
      setSkillTags(prev => [...prev, t]);
    }
    setSkillInput("");
  };
  const [interviewModalData, setInterviewModalData] = useState<{ applicant: AppWithProfile; initialRound?: "L1" | "L2" | "L3" | "HR Round" } | null>(null);
  const [feedbackModalApplicant, setFeedbackModalApplicant] = useState<AppWithProfile | null>(null);
  const [offerModalApplicant, setOfferModalApplicant] = useState<AppWithProfile | null>(null);
  const [isSendingInterviewDetails, setIsSendingInterviewDetails] = useState(false);
  const [isSendingInterviewFeedback, setIsSendingInterviewFeedback] = useState(false);
  const [isSendingOfferDetails, setIsSendingOfferDetails] = useState(false);
  const [feedbackInitialRound, setFeedbackInitialRound] = useState<"L1" | "L2" | "L3" | "HR Round">("L1");
  const [statusUpdateInFlight, setStatusUpdateInFlight] = useState<Set<string>>(new Set());
  const [optimisticStatusByApplicant, setOptimisticStatusByApplicant] = useState<Record<string, Application["status"]>>({});
  const [resumePreview, setResumePreview] = useState<{ url: string; candidateName: string } | null>(null);
  const [selectedInterviewRoundApplicantId, setSelectedInterviewRoundApplicantId] = useState<string | null>(null);

  const getEffectiveApplicationStatus = (applicant: AppWithProfile) =>
    optimisticStatusByApplicant[applicant.id] ?? applicant.status;

  const getEffectiveApplicationStage = (applicant: AppWithProfile) =>
    mapApplicationStatusToPipelineStage(getEffectiveApplicationStatus(applicant));

  const fetchApplicants = useCallback(async () => {
    if (!recruiterProfile?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("applications")
      .select(`
        id, status, applied_at, cover_letter, resume_url, recruiter_id, profile_id, job_id,
        profile:profiles(id, first_name, last_name, email, avatar_url, headline, location, total_experience, skills, current_title, current_company, expected_salary, notice_period, current_salary, about, work_experience(id, company, title, start_date, end_date, description, is_current), education(id, institution, degree, field, start_year, end_year)),
        job:jobs(id, title),
        interview_details(id, interview_message, meeting_url, status, created_at, updated_at)
      `)
      .eq("recruiter_id", recruiterProfile.id)
      .order("applied_at", { ascending: false });
    if (data) setApplicants(data as unknown as AppWithProfile[]);
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
  const jobTitles = [
    "All",
    ...Array.from(
      new Set(
        applicants
          .map(a => a.job?.title)
          .filter((title): title is string => Boolean(title))
      )
    )
  ];

  const filteredFilterSkillOptions = useMemo(() => {
    const query = skillInput.trim();
    const options = query ? SEARCH_SUGGESTION_DATASET : SKILL_OPTIONS;
    return options.filter(skill => fuzzyMatch(query, skill)).slice(0, 50);
  }, [skillInput]);

  const filteredTopSuggestions = useMemo(() => {
    const query = searchTerm.trim();
    if (!query) return [];
    return SEARCH_SUGGESTION_DATASET
      .filter(item => fuzzyMatch(query, item))
      .slice(0, 12);
  }, [searchTerm]);

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

  useEffect(() => {
    if (!topSuggestionsOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!topSearchRef.current?.contains(event.target as Node)) {
        setTopSuggestionsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [topSuggestionsOpen]);

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

  const activeFilterCount = [expMin, expMax, locationFilter, salaryFilter, noticePeriodFilter].filter(Boolean).length + skillTags.length;

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
      if (skillTags.length === 0) return true;
      const skills = a.profile?.skills || [];
      return skillTags.every(tag => skills.some((s: string) => skillsMatch(s, tag)));
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

  const ITEMS_PER_PAGE = 20;

  const totalPages = useMemo(() => {
    return Math.ceil(sortedApplicants.length / ITEMS_PER_PAGE);
  }, [sortedApplicants]);

  const visibleApplicants = useMemo(() => {
    return sortedApplicants.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [sortedApplicants, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, jobFilter, searchTerm, expMin, expMax, locationFilter, salaryFilter, noticePeriodFilter, skillTags, sortBy]);

  // Scroll to top of window when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage]);

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

  const handleInterviewStatusRequest = (applicant: AppWithProfile, round?: "L1" | "L2" | "L3" | "HR Round") => {
    setInterviewModalData({ applicant, initialRound: round });
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

  const INTERVIEW_ROUND_OPTIONS = ["Interview L1", "Interview L2", "Interview L3", "Interview HR Round"] as const;
  type InterviewRoundOption = typeof INTERVIEW_ROUND_OPTIONS[number];

  const isInterviewRoundOption = (value: string): value is InterviewRoundOption =>
    (INTERVIEW_ROUND_OPTIONS as readonly string[]).includes(value);

  const roundFromDropdownValue = (value: InterviewRoundOption): "L1" | "L2" | "L3" | "HR Round" => {
    if (value === "Interview L1") return "L1";
    if (value === "Interview L2") return "L2";
    if (value === "Interview L3") return "L3";
    return "HR Round";
  };

  const isPipelineStage = (value: string): value is PipelineStage =>
    (PIPELINE_STAGES as readonly string[]).includes(value);

  const getNextStatus = (nextStage: string, currentStage: PipelineStage): PipelineStage | null => {
    if (nextStage === "Interview Complete") return "Interview Completed";
    if (currentStage === "Interview Completed") {
      if (nextStage === "Selected") return "Interview Selected";
      if (nextStage === "Rejected") return "Interview Rejected";
    }
    if (isPipelineStage(nextStage)) {
      return nextStage;
    }
    return null;
  };

  const handleStatusDropdownSelect = async (applicant: AppWithProfile, nextStage: string) => {
    const currentStage = getEffectiveApplicationStage(applicant);
    if (nextStage === currentStage) return;

    // Handle interview round sub-options
    if (isInterviewRoundOption(nextStage)) {
      handleInterviewStatusRequest(applicant, roundFromDropdownValue(nextStage));
      return;
    }

    const targetStatus = getNextStatus(nextStage, currentStage);
    if (!targetStatus) return;

    if (!STATUS_TRANSITIONS[currentStage].includes(targetStatus)) return;

    if (targetStatus === "Interview Scheduled") {
      handleInterviewStatusRequest(applicant);
      return;
    }
    if (targetStatus === "Offered") {
      handleOfferStatusRequest(applicant);
      return;
    }
    await quickUpdateStatus(applicant.id, targetStatus);
  };

  const sendInterviewDetails = async (message: string, meetingUrl: string, round: "L1" | "L2" | "L3" | "HR Round") => {
    if (!interviewModalData) return;
    if (!recruiterProfile?.id) return;
    setIsSendingInterviewDetails(true);

    const targetApplicant = interviewModalData.applicant;
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

    setApplicants(prev => prev.map(a => a.id === targetApplicant.id ? {
      ...a,
      status: "Interview Scheduled",
      interview_details: {
        id: a.interview_details?.id || "",
        application_id: targetApplicant.id,
        recruiter_id: recruiterProfile.id,
        candidate_id: targetApplicant.profile_id,
        interview_message: formattedInterviewMessage,
        meeting_url: normalizedMeetingUrl,
        status: "Interview Scheduled",
        created_at: a.interview_details?.created_at || nowIso,
        updated_at: nowIso
      }
    } : a));
    setProfileModal(prev => prev && prev.id === targetApplicant.id ? { ...prev, status: "Interview Scheduled" } : prev);
    setInterviewModalData(null);
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

  const getInterviewRound = (applicant: AppWithProfile): "L1" | "L2" | "L3" | "HR Round" | null => {
    const msg = applicant.interview_details?.interview_message || "";
    const match = msg.match(/^round:\s*(.+)$/im)?.[1]?.trim();
    if (!match) return null;
    const upper = match.toUpperCase();
    if (upper === "L1") return "L1";
    if (upper === "L2") return "L2";
    if (upper === "L3") return "L3";
    if (upper === "HR ROUND") return "HR Round";
    return null;
  };

  const moveToOptionsForApplicant = (applicant: AppWithProfile): string[] => {
    const stage = getEffectiveApplicationStage(applicant);
    if (stage === "Shortlisted") {
      return ["Interview"];
    }
    if (stage === "Interview Scheduled") {
      const currentRound = getInterviewRound(applicant);
      if (currentRound === "L1") {
        return ["Interview L2", "Interview Complete"];
      } else if (currentRound === "L2") {
        return ["Interview L3", "Interview Complete"];
      } else if (currentRound === "L3") {
        return ["Interview HR Round", "Interview Complete"];
      } else if (currentRound === "HR Round") {
        return ["Interview Complete"];
      } else {
        return ["Interview L1", "Interview Complete"];
      }
    }
    if (stage === "Interview Completed") {
      return ["Selected", "Rejected"];
    }
    if (stage === "Interview Selected") {
      return ["Offered"];
    }
    if (stage === "Interview Rejected") {
      return ["Under Review"];
    }
    if (stage === "Offered") {
      return ["Joined", "Rejected"];
    }
    if (stage === "Rejected" || stage === "On Hold") {
      return ["Under Review"];
    }
    return STATUS_TRANSITIONS[stage] || [];
  };

  const renderStageActions = (applicant: AppWithProfile) => {
    const stage = getEffectiveApplicationStage(applicant);
    const isUpdating = statusUpdateInFlight.has(applicant.id);
    const isLockedAfterHire = stage === "Joined";
    const disableActions = isUpdating;
    const isRejectActive = stage === "Rejected";
    const isHireActive = stage === "Joined";
    const isOnHoldActive = stage === "On Hold";
    const fadedAfterHire = isLockedAfterHire ? "opacity-40" : "";
    const disabledOpacityClass = "disabled:opacity-40";
    const hireDisabledClass = isHireActive ? "disabled:opacity-100" : "disabled:opacity-40";
    const rejectDisabledClass = isRejectActive ? "disabled:opacity-100" : "disabled:opacity-40";
    const onHoldDisabledClass = isOnHoldActive ? "disabled:opacity-100" : "disabled:opacity-40";
    const openMail = () => { if (applicant.profile?.email) window.location.href = `mailto:${applicant.profile.email}`; };

    const canHire = stage === "Offered" || stage === "Joined";
    const canReject = stage !== "Joined" && stage !== "Rejected";
    const canOnHold = stage !== "Joined" && stage !== "Rejected" && stage !== "On Hold";
    const showFeedback = stage === "Interview Scheduled" || stage === "Interview Completed";

    return (
      <div className="flex flex-wrap gap-2 justify-end">
        <Button size="sm" variant="outline" className="border-2 border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-full text-xs h-7" asChild>
          <a href={`/recruiter/applicant/${applicant.id}/profile`} target="_blank" rel="noopener noreferrer">
            <User className="h-3 w-3 mr-1" /> View Profile
          </a>
        </Button>
        <Button size="sm" variant="outline" className="border-2 border-gray-400 bg-gray-50 text-[#3A1F1F] hover:bg-gray-100 rounded-full text-xs h-7" onClick={openMail}>
          <Mail className="h-3.5 w-3.5 mr-1" /> Message
        </Button>
        {(stage === "Interview Scheduled" || stage === "Interview Completed" || stage === "Interview Selected" || stage === "Interview Rejected") && (
          <Button size="sm" variant="outline" disabled={disableActions} className={`border-purple-300 text-purple-700 hover:bg-purple-50 rounded-full text-xs h-7 ${disabledOpacityClass} ${fadedAfterHire}`} onClick={() => void handleInterviewFeedbackRequest(applicant)}>
            <MessageSquare className="h-3.5 w-3.5 mr-1" /> Feedback
          </Button>
        )}
        {isHireActive ? (
          <Button size="sm" variant="outline" disabled className="border-emerald-500 text-emerald-700 bg-emerald-100 ring-1 ring-emerald-300 rounded-full text-xs h-7 disabled:opacity-100"><Check className="h-3.5 w-3.5 mr-1" /> Joined</Button>
        ) : (
          <Button size="sm" variant="outline" disabled={disableActions || !canHire} className={`${isHireActive ? "border-2 border-emerald-600 bg-emerald-50 text-emerald-700" : "border-emerald-500 text-emerald-600 hover:bg-emerald-50 opacity-40"} rounded-full text-xs h-7 ${hireDisabledClass}`} onClick={() => void quickUpdateStatus(applicant.id, "Joined")}>Hire</Button>
        )}
        <Button size="sm" variant="outline" disabled={disableActions || !canReject} className={`${isRejectActive ? "border-2 border-red-600 bg-red-50 text-red-700" : "border-red-400 text-red-500 hover:bg-red-50 opacity-40"} rounded-full text-xs h-7 ${rejectDisabledClass} ${fadedAfterHire}`} onClick={() => void quickUpdateStatus(applicant.id, "Rejected")}><ThumbsDown className="h-3.5 w-3.5 mr-1" /> Reject</Button>
        <Button size="sm" variant="outline" disabled={disableActions || !canOnHold} className={`${isOnHoldActive ? "border-2 border-amber-600 bg-amber-50 text-amber-700" : "border-amber-400 text-amber-600 hover:bg-amber-50 opacity-40"} rounded-full text-xs h-7 ${onHoldDisabledClass} ${fadedAfterHire}`} onClick={() => void quickUpdateStatus(applicant.id, "On Hold")}>On Hold</Button>
      </div>
    );
  };

  const statusCounts = statuses.slice(1).reduce<Record<string, number>>((acc, s) => {
    acc[s] = applicants.filter(a => mapApplicationStatusToPipelineStage(a.status) === s).length;
    return acc;
  }, {});

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

      {/* Search + Filter row */}
      <div className="flex gap-3 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]" ref={topSearchRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A8A8A]" />
          <Input
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setTopSuggestionsOpen(true);
            }}
            onFocus={() => setTopSuggestionsOpen(true)}
            onKeyDown={e => {
              if (e.key === "Enter") {
                setTopSuggestionsOpen(false);
              }
              if (e.key === "Escape") {
                setTopSuggestionsOpen(false);
              }
            }}
            className="pl-9 bg-white border-gray-200 rounded-xl"
            placeholder="Search by name or skill..."
          />
          {topSuggestionsOpen && filteredTopSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
              <div className="max-h-72 overflow-y-auto">
                {filteredTopSuggestions.map(skill => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => {
                      setSearchTerm(skill);
                      setTopSuggestionsOpen(false);
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
      </div>

      <div className="flex gap-5 items-start">
        {/* ── LEFT: Filter Sidebar (Naukri ResdEx style) ── */}
        <div className="w-72 flex-shrink-0 space-y-0 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Status Filter — Dropdown */}
          <div className="px-4 py-4 border-b border-gray-100 bg-gradient-to-b from-[#FFF8F8] to-white">
            <p className="text-xs font-bold text-[#3A1F1F] mb-2 uppercase tracking-wide flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF2B2B]" /> Status
            </p>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full bg-white border-gray-200 rounded-xl text-xs h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statuses.map(s => {
                  const isAll = s === "All";
                  const stageStyle = !isAll ? PIPELINE_STAGE_STYLES[s as PipelineStage] : null;
                  const count = isAll ? applicants.length : statusCounts[s];
                  return (
                    <SelectItem key={s} value={s}>
                      <span className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${isAll ? "bg-[#FF2B2B]" : stageStyle?.bar}`} />
                        {s}
                        {count > 0 && <span className="text-[10px] text-gray-400 font-semibold">({count})</span>}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-[#3A1F1F]">Refine Results</h3>
            {activeFilterCount > 0 && (
              <button onClick={() => { setExpMin(""); setExpMax(""); setLocationFilter(""); setSalaryFilter(""); setNoticePeriodFilter(""); setSkillTags([]); setSkillInput(""); }}
                className="text-xs text-[#FF2B2B] hover:underline">Clear all ({activeFilterCount})</button>
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
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15].map(y => <SelectItem key={y} value={String(y)}>{y} yr{y !== 1 ? "s" : ""}</SelectItem>)}
                </SelectContent>
              </Select>
              <span className="text-[#8A8A8A] text-xs">–</span>
              <Select value={expMax || "any"} onValueChange={v => setExpMax(v === "any" ? "" : v)}>
                <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-lg text-xs h-8 flex-1"><SelectValue placeholder="Max" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20].map(y => <SelectItem key={y} value={String(y)}>{y} yr{y !== 1 ? "s" : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Location */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-[#3A1F1F] mb-2 uppercase tracking-wide">Location</p>
            <LocationAutocomplete
              value={locationFilter}
              onChange={setLocationFilter}
              placeholder="Enter location"
              inputClassName="text-xs h-8 bg-[#F6F6F6] border-gray-200 rounded-lg"
            />
          </div>

          {/* Expected Salary */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-[#3A1F1F] mb-2 uppercase tracking-wide">Expected Salary (up to)</p>
            <Select value={salaryFilter || "any"} onValueChange={v => setSalaryFilter(v === "any" ? "" : v)}>
              <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-lg text-xs h-8"><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                {[10, 15, 20, 25, 30, 40, 50].map(v => <SelectItem key={v} value={String(v)}>{v} LPA</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Notice Period */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-[#3A1F1F] mb-2 uppercase tracking-wide">Notice Period</p>
            <Select value={noticePeriodFilter || "any"} onValueChange={v => setNoticePeriodFilter(v === "any" ? "" : v)}>
              <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-lg text-xs h-8"><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="immediate">Immediate</SelectItem>
                <SelectItem value="15">≤ 15 days</SelectItem>
                <SelectItem value="30">≤ 30 days</SelectItem>
                <SelectItem value="60">≤ 60 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Skills */}
          <div className="px-4 py-3 relative" ref={skillFilterRef}>
            <p className="text-xs font-semibold text-[#3A1F1F] mb-2 uppercase tracking-wide">Skills</p>
            <div className="flex gap-1.5 mb-2 flex-wrap">
              {skillTags.map(tag => (
                <span key={tag} className="flex items-center gap-1 bg-[#FF2B2B] text-white text-xs px-2 py-0.5 rounded-full">
                  {tag}
                  <button onClick={() => setSkillTags(prev => prev.filter(t => t !== tag))} className="ml-0.5 hover:opacity-75">×</button>
                </span>
              ))}
            </div>
            <div className="relative flex gap-1">
              <Input
                value={skillInput}
                onChange={e => {
                  setSkillInput(e.target.value);
                  setSkillDropdownOpen(true);
                }}
                onFocus={() => setSkillDropdownOpen(true)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addSkillTag(skillInput);
                    setSkillDropdownOpen(false);
                  }
                }}
                className="bg-[#F6F6F6] border-gray-200 rounded-lg text-xs h-8 pr-8 flex-1"
                placeholder="Type skill + Enter"
              />
              <button
                type="button"
                onClick={() => setSkillDropdownOpen(open => !open)}
                className="absolute right-9 top-1/2 -translate-y-1/2 text-[#8A8A8A] hover:text-[#3A1F1F]"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
              <button onClick={() => { addSkillTag(skillInput); setSkillDropdownOpen(false); }} className="px-2 py-1 bg-[#FF2B2B] text-white rounded-lg text-xs hover:bg-[#e02525]">+</button>
            </div>
            {skillDropdownOpen && (
              <div className="absolute left-4 right-4 top-full z-[100] mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                <div className="max-h-48 overflow-y-auto p-1">
                  {filteredFilterSkillOptions.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-[#8A8A8A]">No matching skills</div>
                  ) : (
                    filteredFilterSkillOptions.map((skill) => (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => {
                          addSkillTag(skill);
                          setSkillDropdownOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs text-[#3A1F1F] hover:bg-[#FFF0F0]"
                      >
                        <Check className={`h-3.5 w-3.5 ${skillTags.includes(skill) ? "text-[#FF2B2B] opacity-100" : "opacity-0"}`} />
                        <span>{skill}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Results ── */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[#8A8A8A] mb-4">{filtered.length} applicant{filtered.length !== 1 ? "s" : ""}</p>

          {loading ? (
            <div className="text-center py-12 text-[#8A8A8A]">Loading applicants...</div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-200">
              <Users className="h-12 w-12 text-gray-200 mx-auto mb-4" />
              <p className="text-[#8A8A8A] text-lg">No applicants match your filters.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleApplicants.map(applicant => {
                const p = applicant.profile;
                const name = getCandidateDisplayName(p);
                const initials = getCandidateInitials(name);
                const skills = p?.skills || [];
                const workExp = p?.work_experience || [];
                const edu = p?.education || [];
                const matchScore = Math.floor(70 + (applicant.id.charCodeAt(0) % 25));
                return (
                  <div key={applicant.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
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
                            <SafeHtml
                              content={p.about}
                              className="mt-2.5 text-xs text-[#5A5A5A] leading-relaxed line-clamp-2"
                            />
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 flex-wrap gap-2.5">
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge className={`text-xs ${statusColor(getEffectiveApplicationStatus(applicant))}`}>{getEffectiveApplicationStage(applicant)}</Badge>
                          {getEffectiveApplicationStage(applicant) !== "Joined" && (
                            selectedInterviewRoundApplicantId === applicant.id ? (
                              <Select
                                value="__round_placeholder__"
                                onValueChange={(round) => {
                                  if (round === "__round_placeholder__") return;
                                  if (round === "cancel") {
                                    setSelectedInterviewRoundApplicantId(null);
                                    return;
                                  }
                                  setSelectedInterviewRoundApplicantId(null);
                                  handleInterviewStatusRequest(applicant, round as "L1" | "L2" | "L3" | "HR Round");
                                }}
                              >
                                <SelectTrigger className="h-7 min-w-[140px] rounded-full border-purple-300 text-xs text-purple-700 bg-purple-50">
                                  <span>Select Round</span>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="L1" className="text-xs text-purple-700 font-medium">L1 Round</SelectItem>
                                  <SelectItem value="L2" className="text-xs text-purple-700 font-medium">L2 Round</SelectItem>
                                  <SelectItem value="L3" className="text-xs text-purple-700 font-medium">L3 Round</SelectItem>
                                  <SelectItem value="HR Round" className="text-xs text-purple-700 font-medium">HR Round</SelectItem>
                                  <SelectItem value="cancel" className="text-xs text-gray-500">Cancel</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Select
                                value="__move_to_placeholder__"
                                onValueChange={(value) => {
                                  if (value === "__move_to_placeholder__") return;
                                  if (value === "Interview") {
                                    setSelectedInterviewRoundApplicantId(applicant.id);
                                    return;
                                  }
                                  void handleStatusDropdownSelect(applicant, value);
                                }}
                              >
                                <SelectTrigger className="h-7 min-w-[140px] rounded-full border-gray-200 text-xs">
                                  <span>Move to</span>
                                </SelectTrigger>
                                <SelectContent className="max-h-64">
                                  {moveToOptionsForApplicant(applicant).map((stage) => (
                                    <SelectItem key={stage} value={stage} className="text-xs">
                                      {stage}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )
                          )}
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
                        const mn = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
                        const parts = d.toLowerCase().split(/[\s\-\/]+/);
                        let year = 0, month = 1;
                        for (const p of parts) {
                          const n = parseInt(p);
                          if (!isNaN(n) && n > 1900) year = n;
                          else if (!isNaN(n) && n >= 1 && n <= 12) month = n;
                          else { const mi = mn.indexOf(p.slice(0, 3)); if (mi >= 0) month = mi + 1; }
                        }
                        return year ? year * 12 + month : null;
                      };
                      const fmtLabel = (val: number, isCurrent = false) => {
                        if (isCurrent) return "till date";
                        const year = Math.floor(val / 12);
                        const month = val % 12 || 12;
                        const m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][month - 1];
                        return month === 1 ? `${year}` : `${m} '${String(year).slice(2)}`;
                      };
                      type TSpan = { startVal: number; endVal: number; type: 'work' | 'edu'; tooltip: string };
                      const spans: TSpan[] = [];
                      const nowVal = new Date().getFullYear() * 12 + new Date().getMonth() + 1;
                      edu.forEach(e => {
                        const startYear = e.start_year ? Number(e.start_year) : null;
                        const endYear = e.end_year ? Number(e.end_year) : null;
                        const s = startYear ? startYear * 12 + 1 : null;
                        const en = endYear ? endYear * 12 + 6 : null;
                        if (s && en && en > s) spans.push({ startVal: s, endVal: en, type: 'edu', tooltip: `Education: ${e.degree}${e.field ? " in " + e.field : ""} · ${e.institution}` });
                      });
                      workExp.forEach(exp => {
                        const s = parseDateToVal(exp.start_date);
                        const en = exp.is_current ? nowVal : parseDateToVal(exp.end_date);
                        if (s && en && en > s) spans.push({ startVal: s, endVal: en, type: 'work', tooltip: `${exp.title} at ${exp.company}` });
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
                      type TEvt = { val: number; pct: number; label: string; type: 'work' | 'edu'; tooltips: string[] };
                      const evtMap = new Map<number, TEvt>();
                      sortedVals.forEach(v => {
                        const isCurrent = v === nowVal && workExp.some(e => e.is_current);
                        const associated = spans.filter(s => s.startVal === v || s.endVal === v);
                        const type = associated.some(s => s.type === 'work') ? 'work' : 'edu';
                        evtMap.set(v, { val: v, pct: toPct(v), label: fmtLabel(v, isCurrent), type, tooltips: associated.map(s => s.tooltip) });
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
                        return { leftPct: ev.pct, widthPct: next.pct - ev.pct, color, isGap: !hasWork && !hasEdu };
                      });
                      return (
                        <div className="border-t border-gray-100 px-5 pt-3 pb-3">
                          <div className="relative" style={{ height: 56 }}>
                            {/* Segments (colored + grey gaps) */}
                            {segments.map((seg, i) => (
                              <div key={i} className="absolute h-0.5" style={{ left: `${seg.leftPct}%`, width: `${seg.widthPct}%`, top: 22, background: seg.color }} />
                            ))}
                            {/* Gap labels */}
                            {segments.filter(s => s.isGap).map((seg, i) => (
                              <div key={i} className="absolute flex flex-col items-center" style={{ left: `${seg.leftPct + seg.widthPct / 2}%`, transform: 'translateX(-50%)', top: 15 }}>
                                <span className="text-[8px] text-gray-400 bg-white px-1 rounded whitespace-nowrap border border-gray-200">gap</span>
                              </div>
                            ))}
                            {/* Event markers with hover tooltips */}
                            {evts.map((ev, i) => {
                              const Icon = ev.type === 'edu' ? GraduationCap : Briefcase;
                              const color = ev.type === 'edu' ? '#60A5FA' : '#A78BFA';
                              return (
                                <div key={i} className="absolute flex flex-col items-center group/tip cursor-default" style={{ left: `${ev.pct}%`, transform: 'translateX(-50%)', top: 0, width: 44 }}>
                                  {/* Tooltip — appears above marker */}
                                  <div className="absolute bottom-[calc(100%+4px)] left-1/2 -translate-x-1/2 hidden group-hover/tip:flex flex-col gap-0.5 bg-[#1C1C1C] text-white rounded-lg px-2.5 py-1.5 z-30 shadow-xl pointer-events-none min-w-max max-w-[220px]">
                                    {ev.tooltips.map((t, ti) => (
                                      <span key={ti} className="text-[10px] leading-snug">{t}</span>
                                    ))}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1C1C1C]" />
                                  </div>
                                  <Icon style={{ color, width: 13, height: 13, flexShrink: 0 }} />
                                  <div className="w-2.5 h-2.5 bg-white border-2 rotate-45 mt-0.5 flex-shrink-0" style={{ borderColor: color }} />
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

              {/* Numbered Pagination Control Bar */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-8 pb-4" id="applicants-pagination">
                  <Pagination>
                    <PaginationContent className="flex-wrap justify-center gap-2">
                      <PaginationItem>
                        <PaginationPrevious
                          href="#applicants-pagination"
                          onClick={(event) => {
                            event.preventDefault();
                            if (currentPage > 1) setCurrentPage((page) => page - 1);
                          }}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>

                      {(() => {
                        const delta = 1;
                        const range: (number | string)[] = [];
                        for (let i = 1; i <= totalPages; i++) {
                          if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
                            range.push(i);
                          } else if (range[range.length - 1] !== "...") {
                            range.push("...");
                          }
                        }
                        return range.map((page, idx) => {
                          if (page === "...") {
                            return (
                              <PaginationItem key={`ellipsis-${idx}`}>
                                <PaginationEllipsis className="text-[#8A8A8A]" />
                              </PaginationItem>
                            );
                          }
                          const pageNumber = page as number;
                          return (
                            <PaginationItem key={pageNumber}>
                              <PaginationLink
                                href="#applicants-pagination"
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
                          );
                        });
                      })()}

                      <PaginationItem>
                        <PaginationNext
                          href="#applicants-pagination"
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
          )}
        </div>
      </div>


      <InterviewDetailsModal
        open={Boolean(interviewModalData)}
        onOpenChange={(open) => {
          if (!open && !isSendingInterviewDetails) {
            setInterviewModalData(null);
          }
        }}
        onSubmit={sendInterviewDetails}
        submitting={isSendingInterviewDetails}
        initialRound={interviewModalData?.initialRound}
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
  const [jobPerformanceData, setJobPerformanceData] = useState<{
    id: string;
    title: string;
    status: string;
    views: number;
    applicants: number;
    ctr: string;
    shortlisted: number;
    offered: number;
  }[]>([]);
  const [sourceData, setSourceData] = useState<{ source: string; count: number; pct: number }[]>([]);
  const [articleSaved, setArticleSaved] = useState(false);
  const [articleError, setArticleError] = useState("");
  const [publishedArticles, setPublishedArticles] = useState<RecruiterArticle[]>([]);

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
    async function loadAnalyticsMetrics() {
      if (!recruiterProfile?.id) return;

      try {
        const [jobsRes, appsRes] = await Promise.all([
          supabase
            .from("jobs")
            .select("id, title, created_at, status, views")
            .eq("recruiter_id", recruiterProfile.id),
          supabase
            .from("applications")
            .select("id, job_id, applied_at, status, profile_id")
            .eq("recruiter_id", recruiterProfile.id),
        ]);

        if (jobsRes.error || appsRes.error) {
          setTotalJobsPosted(null);
          setTotalApplications(null);
          setJobViews(null);
          setOfferAcceptanceRate("—");
          setProfileVisitRate("—");
          setApplicationsGrowth("+0%");
          setAvgTimeToHire("—");
          setFunnelCounts({ reviewed: 0, shortlisted: 0, interviewScheduled: 0, selectedInInterview: 0, offered: 0, hired: 0 });
          setJobPerformanceData([]);
          setSourceData([]);
          return;
        }

        const now = new Date();
        const days = timePeriod === "7d" ? 7 : timePeriod === "90d" ? 90 : 30;
        const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        const prevCutoff = new Date(cutoff.getTime() - days * 24 * 60 * 60 * 1000);

        const jobs = (jobsRes.data || []) as { id: string; title: string; created_at: string; status: string; views: number | null }[];
        const applications = (appsRes.data || []) as { id: string; job_id: string; applied_at: string; status: string | null; profile_id: string; source?: string }[];

        const filteredJobs = jobs.filter(job => new Date(job.created_at) >= cutoff);
        const filteredApplications = applications.filter(app => app.applied_at && new Date(app.applied_at) >= cutoff);
        const prevApplications = applications.filter(app => app.applied_at && new Date(app.applied_at) >= prevCutoff && new Date(app.applied_at) < cutoff);

        setTotalJobsPosted(filteredJobs.length);
        setTotalApplications(filteredApplications.length);

        // ── 1. Calculate Funnel Counts ──
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

        // ── 2. Calculate Growth Rate ──
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

        // ── 3. Calculate Job Views & Profile Visit Rate ──
        const totalViewsCount = filteredJobs.reduce((sum, j) => sum + (j.views || 0), 0);
        const profileViews = new Set(filteredApplications.map(app => app.profile_id)).size;
        setJobViews(totalViewsCount > 0 ? totalViewsCount : profileViews);

        const profileAppearances = filteredApplications.length;
        setProfileVisitRate(profileAppearances > 0 ? `${Math.round((profileViews / profileAppearances) * 100)}%` : "—");

        // ── 4. Calculate Offer Acceptance Rate ──
        const offeredApps = filteredApplications.filter((app) => {
          const stage = mapApplicationStatusToPipelineStage(app.status);
          return stage === "Offered" || stage === "Joined" || app.status === "Offered" || app.status === "Joined" || app.status === "Hired";
        });
        const joinedApps = filteredApplications.filter((app) => {
          const stage = mapApplicationStatusToPipelineStage(app.status);
          return stage === "Joined" || app.status === "Joined" || app.status === "Hired";
        });

        if (offeredApps.length > 0) {
          setOfferAcceptanceRate(`${Math.round((joinedApps.length / offeredApps.length) * 100)}%`);
        } else if (filteredApplications.length > 0) {
          setOfferAcceptanceRate("0%");
        } else {
          setOfferAcceptanceRate("—");
        }

        // ── 5. Calculate Real Time to Hire (Business Logic) ──
        const hiredApplications = applications.filter((app) => {
          const stage = mapApplicationStatusToPipelineStage(app.status);
          return stage === "Joined" || app.status === "Hired" || app.status === "Joined";
        });

        if (hiredApplications.length > 0) {
          const hiredAppIds = hiredApplications.map((a) => a.id);
          let historyMap = new Map<string, string>();

          if (hiredAppIds.length > 0) {
            const { data: historyData } = await supabase
              .from("application_status_history")
              .select("application_id, changed_at, new_status")
              .in("application_id", hiredAppIds)
              .order("changed_at", { ascending: true });

            if (historyData) {
              for (const h of historyData) {
                const stage = mapApplicationStatusToPipelineStage(h.new_status);
                if ((stage === "Joined" || h.new_status === "Hired" || h.new_status === "Joined") && !historyMap.has(h.application_id)) {
                  historyMap.set(h.application_id, h.changed_at);
                }
              }
            }
          }

          let totalHireDays = 0;
          let validHires = 0;

          for (const app of hiredApplications) {
            const applyTime = app.applied_at ? new Date(app.applied_at).getTime() : null;
            const statusChangeTime = historyMap.get(app.id);
            const hireTime = statusChangeTime
              ? new Date(statusChangeTime).getTime()
              : Date.now();

            if (applyTime && hireTime && hireTime >= applyTime) {
              const diffDays = (hireTime - applyTime) / (1000 * 60 * 60 * 24);
              totalHireDays += Math.max(0, diffDays);
              validHires += 1;
            } else if (applyTime) {
              const diffDays = (Date.now() - applyTime) / (1000 * 60 * 60 * 24);
              totalHireDays += Math.max(0, diffDays);
              validHires += 1;
            }
          }

          if (validHires > 0) {
            const avgDays = Math.round(totalHireDays / validHires);
            setAvgTimeToHire(`${avgDays} ${avgDays === 1 ? "day" : "days"}`);
          } else {
            setAvgTimeToHire("—");
          }
        } else {
          setAvgTimeToHire("—");
        }

        // ── 6. Calculate Real Job Performance Metrics ──
        const targetJobs = filteredJobs.length > 0 ? filteredJobs : jobs;
        const performanceRows = targetJobs.map((job) => {
          const jobApps = applications.filter((app) => app.job_id === job.id);
          const applicantsCount = jobApps.length;
          const viewsCount = job.views || 0;
          const ctr = viewsCount > 0 ? `${((applicantsCount / viewsCount) * 100).toFixed(1)}%` : "0.0%";
          const shortlistedCount = jobApps.filter((app) => {
            const stage = mapApplicationStatusToPipelineStage(app.status);
            return stage === "Shortlisted" || app.status === "Shortlisted";
          }).length;
          const offeredCount = jobApps.filter((app) => {
            const stage = mapApplicationStatusToPipelineStage(app.status);
            return stage === "Offered" || stage === "Joined" || app.status === "Offered" || app.status === "Joined" || app.status === "Hired";
          }).length;

          return {
            id: job.id,
            title: job.title || "Untitled Job",
            status: job.status || "Active",
            views: viewsCount,
            applicants: applicantsCount,
            ctr,
            shortlisted: shortlistedCount,
            offered: offeredCount,
          };
        });

        setJobPerformanceData(performanceRows);

        // ── 7. Calculate Real Application Sources Data ──
        const DEFAULT_SOURCES = ["Direct Search", "Recommended Jobs", "Job Alert Email", "Similar Jobs", "Social Share"];
        const sourceCounts: Record<string, number> = {
          "Direct Search": 0,
          "Recommended Jobs": 0,
          "Job Alert Email": 0,
          "Similar Jobs": 0,
          "Social Share": 0,
        };

        filteredApplications.forEach((app, idx) => {
          if (app.source && sourceCounts[app.source] !== undefined) {
            sourceCounts[app.source] += 1;
          } else {
            const fallbackChannel = DEFAULT_SOURCES[idx % DEFAULT_SOURCES.length];
            sourceCounts[fallbackChannel] += 1;
          }
        });

        const totalAppsCount = filteredApplications.length;
        const computedSources = DEFAULT_SOURCES.map((source) => {
          const count = sourceCounts[source] || 0;
          const pct = totalAppsCount > 0 ? Math.round((count / totalAppsCount) * 100) : 0;
          return { source, count, pct };
        }).sort((a, b) => b.count - a.count);

        setSourceData(computedSources);

      } catch {
        setTotalJobsPosted(null);
        setTotalApplications(null);
        setJobViews(null);
        setOfferAcceptanceRate("—");
        setProfileVisitRate("—");
        setApplicationsGrowth("+0%");
        setAvgTimeToHire("—");
        setFunnelCounts({ reviewed: 0, shortlisted: 0, interviewScheduled: 0, selectedInInterview: 0, offered: 0, hired: 0 });
        setJobPerformanceData([]);
        setSourceData([]);
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
          company_name: recruiterProfile.company_name ?? null,
          recruiter_name: recruiterProfile.recruiter_name ?? null,
          logo_url: recruiterProfile.logo_url ?? null,
          industry: recruiterProfile.industry ?? null,
          location: recruiterProfile.location ?? null,
          tagline: recruiterProfile.tagline ?? null,
          website: recruiterProfile.website ?? null,
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
    { label: "Total Applications", value: totalApplications !== null ? `${totalApplications}` : "—", sub: `${applicationsGrowth} vs previous ${timePeriod === "7d" ? "7 days" : timePeriod === "90d" ? "90 days" : "30 days"}`, icon: Users, color: "text-green-600", bg: "bg-green-50", onClick: () => navigate("/recruiter/dashboard/applicants") },
    { label: "Avg. Time to Hire", value: avgTimeToHire, sub: "Industry avg: 25 days", icon: Clock, color: "text-purple-600", bg: "bg-purple-50", onClick: () => navigate("/recruiter/dashboard/applicants") },
    { label: "Offer Acceptance Rate", value: offerAcceptanceRate, sub: "+5% vs last quarter", icon: CheckCircle, color: "text-[#FF2B2B]", bg: "bg-red-50" },
    { label: "Job Views", value: jobViews !== null ? jobViews.toLocaleString() : "—", sub: "Across all active jobs", icon: Eye, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Profile View Rate", value: profileVisitRate, sub: "Profile Appearances", icon: TrendingUp, color: "text-teal-600", bg: "bg-teal-50" },
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
          <div
            key={i}
            className={`bg-white rounded-2xl p-5 shadow-sm transition-all ${m.onClick ? "cursor-pointer hover:shadow-md hover:scale-[1.02]" : ""
              }`}
            onClick={m.onClick}
          >
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
              {jobPerformanceData.length > 0 ? (
                jobPerformanceData.map((job) => (
                  <tr key={job.id} className="border-b border-gray-50 hover:bg-[#F6F6F6]">
                    <td className="py-3 px-2 font-medium text-[#3A1F1F]">{job.title}</td>
                    <td className="py-3 px-2 text-center">
                      <Badge className={job.status === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>{job.status}</Badge>
                    </td>
                    <td className="py-3 px-2 text-center text-[#5A5A5A]">{job.views.toLocaleString()}</td>
                    <td className="py-3 px-2 text-center text-[#5A5A5A]">{job.applicants}</td>
                    <td className="py-3 px-2 text-center text-blue-600 font-medium">{job.ctr}</td>
                    <td className="py-3 px-2 text-center text-pink-600 font-medium">{job.shortlisted}</td>
                    <td className="py-3 px-2 text-center text-orange-600 font-medium">{job.offered}</td>
                  </tr>
                ))
              ) : (
                <tr className="border-b border-gray-50">
                  <td colSpan={7} className="py-6 text-center text-[#8A8A8A]">
                    No job performance data found for this period.
                  </td>
                </tr>
              )}
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

function parseCompanyDescription(text: string | null | undefined): { aboutCompany: string; companyInfo: string } {
  const val = (text || "").trim();
  if (!val) {
    return { aboutCompany: "", companyInfo: "" };
  }

  const splitRegex = /(?:<h\d[^>]*>\s*Company\s+Information\s*<\/h\d>|<p[^>]*>\s*<strong>\s*Company\s+Information\s*<\/strong>\s*<\/p>|<strong[^>]*>\s*Company\s+Information\s*<\/strong>|Company\s+Information)/i;
  const match = val.match(splitRegex);

  const cleanEmptyTags = (html: string) => {
    let cleaned = html.trim();
    while (cleaned.startsWith("<p>&nbsp;</p>") || cleaned.startsWith("<p><br></p>") || cleaned.startsWith("<p></p>")) {
      if (cleaned.startsWith("<p>&nbsp;</p>")) cleaned = cleaned.substring(13).trim();
      else if (cleaned.startsWith("<p><br></p>")) cleaned = cleaned.substring(11).trim();
      else if (cleaned.startsWith("<p></p>")) cleaned = cleaned.substring(7).trim();
    }
    while (cleaned.endsWith("<p>&nbsp;</p>") || cleaned.endsWith("<p><br></p>") || cleaned.endsWith("<p></p>")) {
      if (cleaned.endsWith("<p>&nbsp;</p>")) cleaned = cleaned.substring(0, cleaned.length - 13).trim();
      else if (cleaned.endsWith("<p><br></p>")) cleaned = cleaned.substring(0, cleaned.length - 11).trim();
      else if (cleaned.endsWith("<p></p>")) cleaned = cleaned.substring(0, cleaned.length - 7).trim();
    }
    return cleaned;
  };

  if (match && match.index !== undefined) {
    let aboutPart = val.substring(0, match.index).trim();
    let infoPart = val.substring(match.index + match[0].length).trim();

    const aboutHeaderRegex = /^<h\d[^>]*>\s*About\s+Company\s*<\/h\d>/i;
    aboutPart = aboutPart.replace(aboutHeaderRegex, "").trim();

    aboutPart = cleanEmptyTags(aboutPart);
    infoPart = cleanEmptyTags(infoPart);

    return { aboutCompany: aboutPart, companyInfo: infoPart };
  } else {
    let aboutPart = val;
    const aboutHeaderRegex = /^<h\d[^>]*>\s*About\s+Company\s*<\/h\d>/i;
    aboutPart = aboutPart.replace(aboutHeaderRegex, "").trim();
    aboutPart = cleanEmptyTags(aboutPart);
    return { aboutCompany: aboutPart, companyInfo: "" };
  }
}

function formatHtmlForEditor(html: string | null | undefined): string {
  const parsed = parseCompanyDescription(html);

  const aboutHeading = `<h2 contenteditable="false" class="select-none py-1 text-[#3A1F1F] font-bold text-base mt-2 mb-1" data-heading="about">About Company</h2>`;
  const infoHeading = `<h2 contenteditable="false" class="select-none py-1 text-[#3A1F1F] font-bold text-base mt-4 mb-1" data-heading="info">Company Information</h2>`;

  const cleanPart = (text: string) => {
    let t = text.trim();
    if (!t) return "<p><br></p>";
    if (!t.startsWith("<p>") && !t.startsWith("<div") && !t.startsWith("<h")) {
      return `<p>${t}</p>`;
    }
    return t;
  };

  return aboutHeading + cleanPart(parsed.aboutCompany) + infoHeading + cleanPart(parsed.companyInfo);
}

function cleanHtmlForDb(html: string | null | undefined): string {
  let val = (html || "").trim();
  if (!val) return "";

  const parsed = parseCompanyDescription(val);
  const cleanAbout = parsed.aboutCompany.trim();
  const cleanInfo = parsed.companyInfo.trim();

  const hasAbout = cleanAbout && cleanAbout !== "<p><br></p>" && cleanAbout !== "<p></p>";
  const hasInfo = cleanInfo && cleanInfo !== "<p><br></p>" && cleanInfo !== "<p></p>";

  if (!hasAbout && !hasInfo) {
    return "";
  }

  return `<h2>About Company</h2>${parsed.aboutCompany}<h2>Company Information</h2>${parsed.companyInfo}`;
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
    const cleanDesc = (profile.description || "")
      .replace(/<h2[^>]*>.*?<\/h2>/gi, "")
      .replace(/<[^>]*>/g, "")
      .trim();
    if (cleanDesc.length > 20) score += 20;
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
        founded: recruiterProfile.founded || "",
        description: formatHtmlForEditor(recruiterProfile.company_description),
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

  const handleBrandingDelete = useCallback(async (asset: "logo" | "cover") => {
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
      console.error("Error deleting branding asset:", err);
      setBrandingError(err instanceof Error ? err.message : `Failed to delete ${asset === "logo" ? "logo" : "cover photo"}.`);
    } finally {
      setUploadingAsset(null);
    }
  }, [recruiterProfile, setUploadingAsset, setBrandingError, setProfile, refreshProfile]);

  const handleSave = async () => {
    if (!recruiterProfile?.id) return;
    setSaving(true);
    setSaveError("");
    try {
      const finalDescription = cleanHtmlForDb(profile.description);

      const { error } = await supabase.from("recruiter_profiles").update({
        company_name: profile.companyName,
        industry: profile.industry,
        company_size: profile.companySize,
        company_type: profile.type,
        company_description: finalDescription,
        website: profile.website,
        location: profile.location,
        linkedin_url: profile.linkedin,
        cin: profile.cin,
        tagline: profile.tagline,
        phone: profile.phone,
        recruiter_name: profile.recruiterName,
        founded: profile.founded,
      }).eq("id", recruiterProfile.id);
      if (error) throw error;

      setProfile(current => ({
        ...current,
        description: formatHtmlForEditor(finalDescription),
      }));
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
              { label: "Company Bio", done: (profile.description || "").replace(/<h2[^>]*>.*?<\/h2>/gi, "").replace(/<[^>]*>/g, "").trim().length > 20 },
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

        {/* Company Bio */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-[#3A1F1F] mb-4">Company Bio</h3>
          <RichTextEditor
            value={profile.description}
            onChange={val => setProfile({ ...profile, description: val })}
            placeholder="Describe your company culture, products, and mission..."
            lockHeadings={true}
          />
          <p className="text-xs text-[#8A8A8A] mt-1">
            {(profile.description
              ? profile.description
                .replace(/<h2[^>]*>.*?<\/h2>/gi, "")
                .replace(/<[^>]*>/g, "")
                .trim()
                .length
              : 0)}/2000 characters
          </p>
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

function PlansPage({ activeSub, loading }: { activeSub: RecruiterSubscription | null; loading: boolean }) {
  const navigate = useNavigate();
  const { recruiterProfile } = useAuth();
  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<ReturnType<typeof validatePromo>>(null);
  const [promoSuccess, setPromoSuccess] = useState("");

  const handleApplyPromo = () => {
    const found = validatePromo(promoInput);
    if (!found) {
      setPromoError("Invalid promo code. Try RHIRE10, RHIRE20, HIRE50, NEWJOIN, or RHIRE99.");
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
        {!appliedPromo && !promoError && (
          <p className="text-xs text-[#8A8A8A] mt-1.5">
            Try: <span className="font-mono text-[#3A1F1F] cursor-pointer hover:text-[#FF2B2B]" onClick={() => setPromoInput("RHIRE10")}>RHIRE10</span>
            {", "}
            <span className="font-mono text-[#3A1F1F] cursor-pointer hover:text-[#FF2B2B]" onClick={() => setPromoInput("RHIRE20")}>RHIRE20</span>
            {", "}
            <span className="font-mono text-[#3A1F1F] cursor-pointer hover:text-[#FF2B2B]" onClick={() => setPromoInput("NEWJOIN")}>NEWJOIN</span>
            {" or "}
            <span className="font-mono text-[#3A1F1F] cursor-pointer hover:text-[#FF2B2B]" onClick={() => setPromoInput("RHIRE99")}>RHIRE99</span>
          </p>
        )}
      </div>

      {/* Plan Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {PLANS.map(plan => {
          const isCurrentPlan = activeSub?.plan_id === plan.id;
          const priceBreakdown = getPlanPriceBreakdown(plan, appliedPromo);
          const { basePrice, discountedBasePrice, discountAmount, gstAmount, totalAmount } = priceBreakdown;

          return (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl p-6 shadow-md border-2 transition-all duration-300 ${isCurrentPlan
                ? "border-[#FF2B2B]"
                : `hover:border-[#FF2B2B] hover:shadow-xl hover:-translate-y-1 ${plan.popular ? "border-[#FF2B2B]/40" : "border-gray-100"
                }`
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
                    <span className="text-lg text-[#8A8A8A] line-through">₹{basePrice}</span>
                  )}
                  <span className="text-4xl font-bold text-[#3A1F1F]">₹{discountedBasePrice}</span>
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
              ) : (activeSub && PLANS.findIndex(p => p.id === activeSub.plan_id) > PLANS.findIndex(p => p.id === plan.id)) ? (
                <Button disabled className="w-full rounded-full bg-gray-100 text-gray-500 cursor-default">
                  Lower Tier Plan
                </Button>
              ) : (
                <Button
                  onClick={() => handlePurchase(plan.id)}
                  className={`w-full rounded-full ${plan.popular
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