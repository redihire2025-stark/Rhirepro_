import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { supabase, Profile, Application } from "../../lib/supabase";
import { decryptPhone } from "../../lib/phoneProtection";
import { useAuth, SAFE_PROFILE_COLUMNS } from "../../lib/auth-context";
import { formatActiveTime, parseActiveDate } from "../../lib/activeTime";
import { formatMonthYear, formatYearMonthString } from "../../lib/monthYear";
import {
  User, MapPin, Phone, Mail, Globe, Star, Briefcase, GraduationCap,
  Award, FileText, Download, Loader2, ArrowLeft, ShieldAlert,
  Calendar, Clock, Check, Building2, Eye, ExternalLink, Linkedin, Minimize2,
  ThumbsUp, ThumbsDown, Pause
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { SafeHtml } from "../components/ui/safe-html";
import { toast } from "sonner";
import { getStorageObjectFromUrl, buildPreviewUrl, getResumePreviewKind } from "../components/ResumePreviewDialog";

// Singleton promise for loading pdfjs — prevents race conditions when multiple instances load simultaneously
let _pdfjsLoadPromise: Promise<any> | null = null;
function ensurePdfJs(): Promise<any> {
  if ((window as any).pdfjsLib) return Promise.resolve((window as any).pdfjsLib);
  if (!_pdfjsLoadPromise) {
    _pdfjsLoadPromise = new Promise<any>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://unpkg.com/pdfjs-dist@3.10.111/legacy/build/pdf.min.js";
      s.onload = () => {
        const lib = (window as any).pdfjsLib;
        if (lib) {
          lib.GlobalWorkerOptions.workerSrc = "https://unpkg.com/pdfjs-dist@3.10.111/legacy/build/pdf.worker.min.js";
        }
        resolve(lib);
      };
      s.onerror = () => {
        _pdfjsLoadPromise = null; // allow retry
        reject(new Error("Failed to load pdfjs"));
      };
      document.head.appendChild(s);
    });
  }
  return _pdfjsLoadPromise;
}
// Start preloading pdfjs immediately — don't wait for a PDF to render
void ensurePdfJs();

const logoImage = new URL("../../logo/logo.png", import.meta.url).href;

function splitPreferredLocations(value: string | string[] | null | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map((loc) => String(loc).trim()).filter(Boolean)));
  }
  const str = String(value).trim();
  if (!str) return [];
  if (str.startsWith("[") && str.endsWith("]")) {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) {
        return Array.from(new Set(parsed.map((loc) => String(loc).trim()).filter(Boolean)));
      }
    } catch {
      // fallback to comma split
    }
  }
  return Array.from(
    new Set(
      str
        .split(",")
        .map((loc) => loc.trim())
        .filter(Boolean)
    )
  );
}

interface WorkExp {
  id: string;
  title: string;
  company: string;
  location: string;
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  current: boolean;
  description: string;
}

interface Education {
  id: string;
  degree: string;
  field: string;
  college: string;
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  score: string;
}

interface Project {
  id: number;
  name: string;
  url: string;
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  description: string;
}

interface Certification {
  id: number;
  name: string;
  issuer: string;
  issueDate: string;
  credentialId: string;
}

interface Language {
  id: number;
  language: string;
  proficiency: string;
}

interface ApplicantProfile extends Profile {
  dob?: string | null;
  gender?: string | null;
  marital_status?: string | null;
  languages?: { language: string; proficiency: string }[] | null;
  desired_job_title?: string | null;
  job_type_pref?: string | null;
  preferred_location?: string | null;
  work_auth?: string | null;
  willing_to_relocate?: string | null;
}

// Memory cache to prevent reloading flicker when switching tabs
const profileCache: Record<string, {
  profile: ApplicantProfile | null;
  application: Application | null;
  experiences: WorkExp[];
  education: Education[];
  projects: Project[];
  certifications: Certification[];
  languages: Language[];
  resumeUrl: string | null;
  resolvedResumeUrl: string | null;
  resumePreviewUrl: string | null;
}> = {};

function CareerTimeline({ experiences, education }: { experiences: WorkExp[]; education: Education[] }) {
  const parseAnyDateToVal = (val: string | number | null | undefined, fallbackMonth = 1): number | null => {
    if (!val) return null;
    const str = String(val).trim();
    if (!str) return null;
    const mn = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const parts = str.toLowerCase().split(/[\s\-\/]+/);
    let year = 0, month = fallbackMonth;
    for (const p of parts) {
      const n = parseInt(p);
      if (!isNaN(n) && n > 1900) year = n;
      else if (!isNaN(n) && n >= 1 && n <= 12) month = n;
      else {
        const mi = mn.indexOf(p.slice(0, 3));
        if (mi >= 0) month = mi + 1;
      }
    }
    return year ? year * 12 + month : null;
  };

  const fmtLabel = (val: number, isCurrent = false) => {
    if (isCurrent) return "Present";
    const year = Math.floor(val / 12);
    const month = val % 12 || 12;
    const m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][month - 1];
    return month === 1 ? `${year}` : `${m} '${String(year).slice(2)}`;
  };

  type TSpan = { startVal: number; endVal: number; type: 'work' | 'edu'; tooltip: string };
  const spans: TSpan[] = [];
  const nowVal = new Date().getFullYear() * 12 + new Date().getMonth() + 1;

  education.forEach(e => {
    const s = parseAnyDateToVal(e.startYear ? `${e.startMonth || 'Jan'} ${e.startYear}` : e.startYear, 1);
    const en = parseAnyDateToVal(e.endYear ? `${e.endMonth || 'Jun'} ${e.endYear}` : e.endYear, 6);
    if (s && en && en > s) {
      spans.push({ startVal: s, endVal: en, type: 'edu', tooltip: `Education: ${e.degree}${e.field ? " in " + e.field : ""} · ${e.college}` });
    }
  });

  experiences.forEach(exp => {
    const s = parseAnyDateToVal(exp.startYear ? `${exp.startMonth || 'Jan'} ${exp.startYear}` : exp.startMonth, 1);
    const en = exp.current ? nowVal : parseAnyDateToVal(exp.endYear ? `${exp.endMonth || 'Dec'} ${exp.endYear}` : exp.endMonth, 12);
    if (s && en && en > s) {
      spans.push({ startVal: s, endVal: en, type: 'work', tooltip: `${exp.title} at ${exp.company}` });
    }
  });

  if (spans.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-md">
        <h3 className="text-lg font-bold text-[#3A1F1F] mb-2 flex items-center gap-2">
          <Clock className="h-5 w-5 text-[#FF2B2B]" /> Career & Education Timeline
        </h3>
        <p className="text-sm text-[#8A8A8A] italic">No work experience or education timeline records provided.</p>
      </div>
    );
  }

  const valSet = new Set<number>();
  spans.forEach(s => { valSet.add(s.startVal); valSet.add(s.endVal); });
  const sortedVals = Array.from(valSet).sort((a, b) => a - b);
  if (sortedVals.length < 2) return null;

  const minVal = sortedVals[0];
  const maxVal = sortedVals[sortedVals.length - 1];
  const range = maxVal - minVal || 1;
  const toPct = (v: number) => Math.max(0, Math.min(100, ((v - minVal) / range) * 100));

  type TEvt = { val: number; pct: number; label: string; type: 'work' | 'edu'; tooltips: string[] };
  const evtMap = new Map<number, TEvt>();
  sortedVals.forEach(v => {
    const isCurrent = v === nowVal && experiences.some(e => e.current);
    const associated = spans.filter(s => s.startVal === v || s.endVal === v);
    const type = associated.some(s => s.type === 'work') ? 'work' : 'edu';
    evtMap.set(v, { val: v, pct: toPct(v), label: fmtLabel(v, isCurrent), type, tooltips: associated.map(s => s.tooltip) });
  });
  const evts = Array.from(evtMap.values());

  const MIN_GAP_PCT = 7;
  const lastPctBySide: Record<"above" | "below", number> = { above: -999, below: -999 };
  const lastRowBySide: Record<"above" | "below", number> = { above: 0, below: 0 };
  const placed = evts.map((ev) => {
    const side: "above" | "below" = spans.some(sp => sp.endVal === ev.val) ? "above" : "below";
    const row = ev.pct - lastPctBySide[side] < MIN_GAP_PCT ? (lastRowBySide[side] === 0 ? 1 : 0) : 0;
    lastPctBySide[side] = ev.pct;
    lastRowBySide[side] = row;
    return { ...ev, side, row };
  });

  const AXIS_TOP = 46;
  const labelTop = (side: "above" | "below", row: number) =>
    side === "above" ? (row === 0 ? 22 : 6) : (row === 0 ? 56 : 72);

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
    <div className="bg-white rounded-2xl p-6 shadow-md">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-lg font-bold text-[#3A1F1F] flex items-center gap-2">
          <Clock className="h-5 w-5 text-[#FF2B2B]" /> Career & Education Timeline
        </h3>
        <div className="flex items-center gap-3 text-xs text-[#8A8A8A]">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#A78BFA]" /> Experience</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#60A5FA]" /> Education</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gray-300" /> Gap</span>
        </div>
      </div>
      <div className="relative pt-2" style={{ height: 96 }}>
        {segments.map((seg, i) => (
          <div key={i} className="absolute h-1 rounded-full" style={{ left: `${seg.leftPct}%`, width: `${seg.widthPct}%`, top: AXIS_TOP, background: seg.color }} />
        ))}
        {segments.filter(s => s.isGap).map((seg, i) => (
          <div key={i} className="absolute flex flex-col items-center" style={{ left: `${seg.leftPct + seg.widthPct / 2}%`, transform: "translateX(-50%)", top: AXIS_TOP - 9 }}>
            <span className="text-[9px] text-gray-500 bg-white px-1.5 py-0.5 rounded-full whitespace-nowrap border border-gray-200 shadow-2xs">gap</span>
          </div>
        ))}
        {placed.map((ev, i) => {
          const Icon = ev.type === "edu" ? GraduationCap : Briefcase;
          const color = ev.type === "edu" ? "#60A5FA" : "#A78BFA";
          return (
            <div key={i} className="absolute group/tip cursor-default" style={{ left: `${ev.pct}%`, transform: "translateX(-50%)", top: 0, height: 96 }}>
              <div className="absolute left-1/2 -translate-x-1/2 hidden group-hover/tip:flex flex-col gap-0.5 bg-[#1C1C1C] text-white rounded-lg px-2.5 py-1.5 z-30 shadow-xl pointer-events-none min-w-max max-w-[240px]" style={{ bottom: 96 - AXIS_TOP + 14 }}>
                {ev.tooltips.map((t, ti) => (
                  <span key={ti} className="text-[11px] leading-snug">{t}</span>
                ))}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1C1C1C]" />
              </div>
              <div className="absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 rotate-45 z-10 shadow-xs" style={{ top: AXIS_TOP - 4, borderColor: color }} />
              <div
                className="absolute left-1/2 -translate-x-1/2 border-l border-dashed border-gray-200"
                style={
                  ev.side === "above"
                    ? { top: labelTop(ev.side, ev.row) + 14, height: Math.max(0, AXIS_TOP - labelTop(ev.side, ev.row) - 18) }
                    : { top: AXIS_TOP + 8, height: Math.max(0, labelTop(ev.side, ev.row) - AXIS_TOP - 8) }
                }
              />
              <div
                className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white px-1 z-10"
                style={{ top: labelTop(ev.side, ev.row) }}
              >
                <Icon style={{ color, width: 12, height: 12, flexShrink: 0 }} />
                <span className="text-[10px] font-medium text-[#5A5A5A] whitespace-nowrap leading-tight">{ev.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ApplicantProfilePage() {
  const { applicantId, candidateId } = useParams();
  const id = applicantId || candidateId;
  const { recruiterProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const cachedData = id ? profileCache[id] : null;

  const [loading, setLoading] = useState(!cachedData);
  const [error, setError] = useState<string | null>(null);
  const [application, setApplication] = useState<Application | null>(cachedData?.application || null);
  const [profile, setProfile] = useState<ApplicantProfile | null>(cachedData?.profile || null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const handleStatusChange = async (newStatus: "Shortlisted" | "On Hold" | "Rejected") => {
    if (!application?.id) return;
    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from("applications")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", application.id);

      if (error) throw error;

      setApplication(prev => prev ? { ...prev, status: newStatus } : null);
      toast.success(`Candidate marked as "${newStatus}"`);
    } catch (err: any) {
      console.error("Failed to update status:", err);
      toast.error(err.message || "Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const [experiences, setExperiences] = useState<WorkExp[]>(cachedData?.experiences || []);
  const [education, setEducation] = useState<Education[]>(cachedData?.education || []);
  const [projects, setProjects] = useState<Project[]>(cachedData?.projects || []);
  const [certifications, setCertifications] = useState<Certification[]>(cachedData?.certifications || []);
  const [languages, setLanguages] = useState<Language[]>(cachedData?.languages || []);

  const [resumeUrl, setResumeUrl] = useState<string | null>(cachedData?.resumeUrl || null);
  const [resolvedResumeUrl, setResolvedResumeUrl] = useState<string | null>(cachedData?.resolvedResumeUrl || null);
  const [resumePreviewUrl, setResumePreviewUrl] = useState<string | null>(cachedData?.resumePreviewUrl || null);
  const pdfPreviewRef = useRef<HTMLDivElement | null>(null);
  const fullscreenResumeRef = useRef<HTMLDivElement | null>(null);
  const [pdfRendering, setPdfRendering] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeError, setResumeError] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const resumeKind = useMemo(() => {
    if (!resolvedResumeUrl) return "unsupported";
    return getResumePreviewKind(resolvedResumeUrl);
  }, [resolvedResumeUrl]);

  const fetchApplicantDetails = useCallback(async () => {
    if (!id || !recruiterProfile?.id) return;
    if (!profileCache[id]) {
      setLoading(true);
    }
    setError(null);

    try {
      let profData: ApplicantProfile | null = null;
      // 1. Fetch Application
      const { data: appData, error: appError } = await supabase
        .from("applications")
        .select("*, job:jobs(title, id, recruiter_id)")
        .eq("id", id)
        .maybeSingle();

      if (appError || !appData) {
        // Fallback: Try to fetch profile directly assuming id is the profile ID
        let directProf: ApplicantProfile | null = null;
        let directProfErr: any = null;

        const res1 = await supabase
          .from("profiles")
          .select(SAFE_PROFILE_COLUMNS)
          .eq("id", id)
          .maybeSingle();

        if (res1.data) {
          directProf = res1.data as ApplicantProfile;
        } else {
          // Fallback to select("*") in case SAFE_PROFILE_COLUMNS had a missing column error
          const res2 = await supabase
            .from("profiles")
            .select("*")
            .eq("id", id)
            .maybeSingle();
          directProf = res2.data as ApplicantProfile | null;
          directProfErr = res2.error;
        }

        if (directProfErr || !directProf) {
          delete profileCache[id];
          setError("Candidate profile not found or could not be loaded.");
          setLoading(false);
          return;
        }
        profData = directProf;
        setApplication(null);
      } else {
        // 2. Validate recruiter access permission
        const isAllowed =
          !appData.recruiter_id ||
          appData.recruiter_id === recruiterProfile.id ||
          appData.job?.recruiter_id === recruiterProfile.id ||
          recruiterProfile.is_org_admin;

        if (!isAllowed) {
          delete profileCache[id];
          setError("Access Denied: You do not have permission to view this applicant's profile.");
          setLoading(false);
          return;
        }
        setApplication(appData);

        // 3. Fetch candidate profile
        let pData: ApplicantProfile | null = null;
        let pError: any = null;

        const res1 = await supabase
          .from("profiles")
          .select(SAFE_PROFILE_COLUMNS)
          .eq("id", appData.profile_id)
          .maybeSingle();

        if (res1.data) {
          pData = res1.data as ApplicantProfile;
        } else {
          // Fallback to select("*") in case SAFE_PROFILE_COLUMNS had a column schema mismatch
          const res2 = await supabase
            .from("profiles")
            .select("*")
            .eq("id", appData.profile_id)
            .maybeSingle();
          pData = res2.data as ApplicantProfile | null;
          pError = res2.error;
        }

        if (pError || !pData) {
          // Additional fallback: in case 'id' was candidate's profile_id directly
          const fallbackRes = await supabase
            .from("profiles")
            .select("*")
            .eq("id", id)
            .maybeSingle();

          if (fallbackRes.data) {
            profData = fallbackRes.data as ApplicantProfile;
            setApplication(null);
          } else {
            delete profileCache[id];
            setError("Candidate profile not found or could not be loaded.");
            setLoading(false);
            return;
          }
        } else {
          profData = pData;
        }
      }

      setProfile(profData);

      // 4. Fetch related profile details in parallel
      const [expRes, eduRes, projRes, certRes] = await Promise.all([
        supabase.from("work_experience").select("*").eq("profile_id", profData.id).order("created_at", { ascending: false }),
        supabase.from("education").select("*").eq("profile_id", profData.id).order("created_at", { ascending: false }),
        supabase.from("projects").select("*").eq("profile_id", profData.id).order("created_at", { ascending: false }),
        supabase.from("certifications").select("*").eq("profile_id", profData.id).order("created_at", { ascending: false })
      ]);

      let mappedExp: WorkExp[] = [];
      if (expRes.data) {
        mappedExp = expRes.data.map(e => {
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
        });
        setExperiences(mappedExp);
      }

      let mappedEdu: Education[] = [];
      if (eduRes.data) {
        mappedEdu = eduRes.data.map(e => ({
          id: e.id, degree: e.degree, field: e.field || "",
          college: e.institution, startMonth: e.start_month || "", startYear: e.start_year || "",
          endMonth: e.end_month || "", endYear: e.end_year || "", score: e.score || "",
        }));
        setEducation(mappedEdu);
      }

      let mappedProj: Project[] = [];
      if (projRes.data) {
        mappedProj = projRes.data.map(p => ({
          id: p.id, name: p.name, url: p.url || "",
          startMonth: p.start_month || "", startYear: p.start_year || "",
          endMonth: p.end_month || "", endYear: p.end_year || "", description: p.description || "",
        }));
        setProjects(mappedProj);
      }

      let mappedCert: Certification[] = [];
      if (certRes.data) {
        mappedCert = certRes.data.map(c => ({
          id: c.id, name: c.name, issuer: c.issuer || "",
          issueDate: c.issue_date || "", credentialId: c.credential_id || "",
        }));
        setCertifications(mappedCert);
      }

      let mappedLang: Language[] = [];
      if (profData.languages?.length) {
        mappedLang = (profData.languages as { language: string; proficiency: string }[]).map((l, i) => ({ ...l, id: i }));
        setLanguages(mappedLang);
      }

      // 5. Increment profile views count (only once per recruiter per candidate to avoid duplicate counts on reload/reopen/realtime updates)
      if (profData.id && recruiterProfile?.id) {
        const viewKey = `viewed_profile_${recruiterProfile.id}_${profData.id}`;
        if (!localStorage.getItem(viewKey)) {
          localStorage.setItem(viewKey, "true");

          // Increment candidate profile views
          void supabase.rpc("increment_profile_views", { target_profile_id: profData.id }).then(({ error: viewError }) => {
            if (viewError) {
              console.warn("Failed to increment profile views:", viewError.message);
              localStorage.removeItem(viewKey);
            }
          });

          // Increment recruiter profiles viewed count
          void supabase.rpc("increment_recruiter_profiles_viewed", { p_recruiter_id: recruiterProfile.id }).then(({ error: recViewError }) => {
            if (recViewError) {
              console.warn("Failed to increment recruiter profiles viewed (migration might not be run):", recViewError.message);
              localStorage.removeItem(viewKey);
            }
          });

          // Tell the candidate their profile was viewed. Keyed per recruiter,
          // per candidate, per day and upserted, so a recruiter flicking back
          // and forth through a shortlist does not bury them in notifications.
          // notifications is published to Realtime, so the bell updates without
          // a reload. Best-effort: never let this break profile loading.
          const viewerName = recruiterProfile.company_name || recruiterProfile.recruiter_name || "A recruiter";
          void supabase
            .from("notifications")
            .upsert(
              {
                user_id: profData.id,
                user_type: "jobseeker",
                title: "Your profile was viewed",
                message: `A recruiter from ${viewerName} has viewed your profile.`,
                type: "profile_view",
                related_id: recruiterProfile.id,
                is_read: false,
                notification_key: `profile-view:${profData.id}:${recruiterProfile.id}:${new Date().toISOString().slice(0, 10)}`,
              },
              { onConflict: "notification_key" },
            )
            .then(({ error: notifyError }) => {
              if (notifyError) console.warn("Profile-view notification failed:", notifyError.message);
            });

          /*
           * Email as well as the bell. The in-app notification only reaches a
           * seeker who happens to be logged in, which is the opposite of the
           * people this is meant to bring back. The function re-checks the
           * once-per-day limit server side, so the localStorage guard above
           * being cleared cannot turn this into a mail flood.
           */
          void (async () => {
            try {
              const { data: sessionData } = await supabase.auth.getSession();
              const accessToken = sessionData.session?.access_token;
              if (!accessToken) return;
              const res = await fetch("/api/profile-view-email", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ profile_id: profData.id }),
              });
              if (!res.ok) {
                console.warn("Profile-view email failed:", res.status, await res.text().catch(() => ""));
              }
            } catch (mailErr) {
              console.warn("Profile-view email failed:", mailErr);
            }
          })();
        }
      }

      // 6. Resolve resume url
      const rawResumeUrl = profData.resume_url || appData?.resume_url || null;
      let resolvedUrl = null;
      let previewUrl = null;

      if (rawResumeUrl) {
        setResumeUrl(rawResumeUrl);

        const storageObject = getStorageObjectFromUrl(rawResumeUrl);
        if (!storageObject) {
          resolvedUrl = rawResumeUrl;
          previewUrl = buildPreviewUrl(rawResumeUrl);
          setResolvedResumeUrl(resolvedUrl);
          setResumePreviewUrl(previewUrl);
        } else {
          setResumeLoading(true);
          const { data: signData, error: signError } = await supabase.storage
            .from(storageObject.bucket)
            .createSignedUrl(storageObject.path, 10 * 60);

          if (signError) {
            setResumeError(signError.message || "Resume file could not be previewed.");
          } else if (signData?.signedUrl) {
            resolvedUrl = signData.signedUrl;
            previewUrl = buildPreviewUrl(signData.signedUrl);
            setResolvedResumeUrl(resolvedUrl);
            setResumePreviewUrl(previewUrl);
          }
          setResumeLoading(false);
        }
      }

      // Cache the loaded data
      if (id) {
        profileCache[id] = {
          profile: profData,
          application: appError || !appData ? null : appData,
          experiences: mappedExp,
          education: mappedEdu,
          projects: mappedProj,
          certifications: mappedCert,
          languages: mappedLang,
          resumeUrl: rawResumeUrl,
          resolvedResumeUrl: resolvedUrl,
          resumePreviewUrl: previewUrl,
        };
      }
    } catch (err) {
      console.error("Error fetching applicant details:", err);
      setError("An unexpected error occurred while fetching candidate information.");
    } finally {
      setLoading(false);
    }
  }, [id, recruiterProfile?.id]);

  useEffect(() => {
    if (!id) return;
    if (!authLoading && recruiterProfile?.id) {
      fetchApplicantDetails();
    }
  }, [id, authLoading, recruiterProfile, fetchApplicantDetails]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase.channel(`applicant-profile-realtime-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "applications", filter: `id=eq.${id}` }, () => {
        void fetchApplicantDetails();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, fetchApplicantDetails]);

  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase.channel(`applicant-candidate-realtime-${profile.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${profile.id}` }, () => {
        void fetchApplicantDetails();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.id, fetchApplicantDetails]);

  // Render PDF into canvases when resumePreviewUrl changes (for ApplicantProfile inline preview)
  useEffect(() => {
    let cancelled = false;
    let loadingTask: any = null;
    async function renderPdfInline() {
      if (!resumePreviewUrl || resumeKind !== "pdf" || !pdfPreviewRef.current) return;
      setPdfRendering(true);
      try {
        if (!pdfPreviewRef.current?.isConnected) return;
        const container = pdfPreviewRef.current;
        container.innerHTML = "";

        // Fetch PDF data and load pdfjs library in parallel for speed
        const [fetchRes, pdfjs] = await Promise.all([
          fetch(resumePreviewUrl),
          ensurePdfJs(),
        ]);
        if (cancelled || !pdfPreviewRef.current?.isConnected) return;
        const arrayBuffer = await fetchRes.arrayBuffer();
        if (cancelled || !pdfPreviewRef.current?.isConnected) return;
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
          pdfPreviewRef.current.innerHTML = "";
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

  // Was firing on fullscreen view too, under "resumes_used" — which the org
  // admin panel then labeled "Resumes Watched" while actually wanting a
  // download count. Now only the download action counts, so the number and
  // its label agree.
  const trackResumeDownload = useCallback(() => {
    if (!recruiterProfile?.id || !id) return;
    const resumeDownloadKey = `downloaded_resume_${recruiterProfile.id}_${id}`;
    if (!localStorage.getItem(resumeDownloadKey)) {
      localStorage.setItem(resumeDownloadKey, "true");
      void supabase.rpc("increment_recruiter_resumes", { p_recruiter_id: recruiterProfile.id }).then(({ error: rErr }) => {
        if (rErr) {
          console.warn("Failed to increment resumes downloaded count:", rErr.message);
          localStorage.removeItem(resumeDownloadKey);
        }
      });
    }
  }, [recruiterProfile, id]);

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
    if (!resumeUrl) return;
    trackResumeDownload();

    const storageObject = getStorageObjectFromUrl(resumeUrl);
    if (!storageObject) {
      window.open(resumeUrl, "_blank", "noopener,noreferrer");
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
  }, [resumeUrl, trackResumeDownload]);

  // Auth gate checks
  if (authLoading || (loading && !error)) {
    return (
      <div className="min-h-screen bg-[#F6F6F6] flex items-center justify-center font-sans">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#FF2B2B] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[#8A8A8A] text-sm">Loading candidate profile...</p>
        </div>
      </div>
    );
  }

  if (!recruiterProfile) {
    return (
      <div className="min-h-screen bg-[#F6F6F6] flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-2xl shadow-md p-8 max-w-md text-center">
          <ShieldAlert className="h-12 w-12 text-[#FF2B2B] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#3A1F1F] mb-2">Access Denied</h2>
          <p className="text-[#8A8A8A] text-sm mb-6">You must be logged in as a recruiter to access applicant profiles.</p>
          <Button className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full" onClick={() => navigate("/signin")}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F6F6F6] flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-2xl shadow-md p-8 max-w-md text-center">
          <ShieldAlert className="h-12 w-12 text-[#FF2B2B] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#3A1F1F] mb-2">Error</h2>
          <p className="text-[#8A8A8A] text-sm mb-6">{error}</p>
          <Button className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full" onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate("/recruiter/dashboard/applicants");
            }
          }}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Candidate";
  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase();
  /*
   * No match figure is shown here. The original was
   * Math.floor(70 + id.charCodeAt(0) % 25) — derived from the first character
   * of the route id, so it looked like an assessment while measuring nothing.
   * Showing nothing is better than showing that.
   */

  return (
    <div className="min-h-screen bg-[#F6F6F6] flex flex-col font-sans">
      {/* Main Grid Content */}
      <main className="flex-1 w-full px-4 py-6 lg:px-8">
        {/* Inner page navigation bar */}
        <div className="flex justify-between items-center mb-6 bg-white rounded-2xl p-4 shadow-sm flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="rounded-full hover:bg-gray-100" onClick={() => navigate(application ? "/recruiter/dashboard/applicants" : "/recruiter/dashboard/search-candidates")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to {application ? "Applicants" : "Candidate Search"}
            </Button>
            <span className="text-xs font-semibold px-2.5 py-1 bg-red-50 text-[#FF2B2B] border border-red-100 rounded-full">Profile Review Mode</span>
          </div>

          {/* Quick Screening Decision Actions */}
          {application && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={application.status === "Shortlisted" ? "default" : "outline"}
                disabled={updatingStatus}
                onClick={() => handleStatusChange("Shortlisted")}
                className={`rounded-full text-xs font-semibold h-8 px-3.5 transition-all ${
                  application.status === "Shortlisted"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-300"
                    : "border-emerald-500 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                }`}
              >
                <ThumbsUp className="h-3.5 w-3.5 mr-1.5" /> Shortlist
              </Button>

              <Button
                size="sm"
                variant={application.status === "On Hold" ? "default" : "outline"}
                disabled={updatingStatus}
                onClick={() => handleStatusChange("On Hold")}
                className={`rounded-full text-xs font-semibold h-8 px-3.5 transition-all ${
                  application.status === "On Hold"
                    ? "bg-amber-600 hover:bg-amber-700 text-white shadow-sm ring-2 ring-amber-300"
                    : "border-amber-500 text-amber-700 bg-amber-50 hover:bg-amber-100"
                }`}
              >
                <Pause className="h-3.5 w-3.5 mr-1.5" /> Hold
              </Button>

              <Button
                size="sm"
                variant={application.status === "Rejected" ? "default" : "outline"}
                disabled={updatingStatus}
                onClick={() => handleStatusChange("Rejected")}
                className={`rounded-full text-xs font-semibold h-8 px-3.5 transition-all ${
                  application.status === "Rejected"
                    ? "bg-red-600 hover:bg-red-700 text-white shadow-sm ring-2 ring-red-300"
                    : "border-red-500 text-red-600 bg-red-50 hover:bg-red-100"
                }`}
              >
                <ThumbsDown className="h-3.5 w-3.5 mr-1.5" /> Reject
              </Button>
            </div>
          )}

          <Button variant="outline" size="sm" className="rounded-full text-xs" onClick={() => window.close()}>
            Close Tab
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

          {/* Left Column: Read-Only Jobseeker Profile */}
          <div className="space-y-6">

            {/* Basic Info Section */}
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <div className="flex items-start gap-6 mb-6">
                <div className="w-20 h-20 bg-[#FF2B2B] rounded-full flex items-center justify-center text-white text-2xl font-bold border-2 border-white shadow-md overflow-hidden flex-shrink-0">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-2xl font-bold text-[#3A1F1F]">{name}</h2>
                        {(() => {
                          const activeDate = parseActiveDate(profile);
                          const activeLabel = formatActiveTime(activeDate);
                          if (!activeLabel) return null;
                          return (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              {activeLabel}
                            </span>
                          );
                        })()}
                      </div>
                      <p className="text-[#FF2B2B] font-medium">{profile?.headline || "Jobseeker"}</p>
                    </div>

                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-sm text-[#8A8A8A]">
                    {profile?.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4 text-[#8A8A8A]" />{profile.location}</span>}
                    {profile?.phone && <span className="flex items-center gap-1"><Phone className="h-4 w-4 text-[#8A8A8A]" />{decryptPhone(profile.phone)}</span>}
                    {profile?.email && <span className="flex items-center gap-1"><Mail className="h-4 w-4 text-[#8A8A8A]" />{profile.email}</span>}
                    {profile?.linkedin_url && (
                      <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[#FF2B2B] hover:underline">
                        <Linkedin className="h-4 w-4" />LinkedIn
                      </a>
                    )}
                    {profile?.portfolio_url && (
                      <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[#FF2B2B] hover:underline">
                        <Globe className="h-4 w-4" />Portfolio
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Grid of metadata */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border-t border-gray-100 pt-4 text-sm text-[#8A8A8A]">
                {profile?.dob && <div><span className="font-semibold text-[#3A1F1F] block">DOB</span> {profile.dob}</div>}
                {profile?.gender && <div><span className="font-semibold text-[#3A1F1F] block">Gender</span> {profile.gender}</div>}
                {profile?.marital_status && <div><span className="font-semibold text-[#3A1F1F] block">Marital Status</span> {profile.marital_status}</div>}
                {application?.job?.title && <div><span className="font-semibold text-[#3A1F1F] block">Applied Position</span> {application.job.title}</div>}
                {application?.applied_at && <div><span className="font-semibold text-[#3A1F1F] block">Application Date</span> {new Date(application.applied_at).toLocaleDateString()}</div>}
                {application?.status && <div><span className="font-semibold text-[#3A1F1F] block">Current Status</span> <Badge className="mt-0.5 bg-[#FF2B2B] text-white hover:bg-[#FF2B2B]/90">{application.status}</Badge></div>}
              </div>
            </div>

            {/* Career Timeline */}
            <CareerTimeline experiences={experiences} education={education} />

            {/* Professional Summary */}
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <h3 className="text-lg font-bold text-[#3A1F1F] mb-3">Professional Summary</h3>
              {profile?.about ? (
                <SafeHtml
                  content={profile.about}
                  className="text-[#8A8A8A] leading-relaxed text-sm [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h2]:text-[#3A1F1F] [&_h2]:font-bold [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-[#3A1F1F] [&_h3]:font-bold [&_h3]:mt-1.5 [&_h3]:mb-1 [&_a]:text-[#FF2B2B] [&_a]:underline"
                />
              ) : (
                <p className="text-[#8A8A8A] leading-relaxed text-sm">
                  <span className="italic text-gray-400">No professional summary added.</span>
                </p>
              )}
            </div>

            {/* Key Skills */}
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <h3 className="text-lg font-bold text-[#3A1F1F] mb-3">Key Skills</h3>
              <div className="flex flex-wrap gap-2">
                {profile?.skills && profile.skills.length > 0 ? (
                  profile.skills.map((skill: string) => (
                    <Badge key={skill} className="bg-[#ECECF4] text-[#3A1F1F] hover:bg-[#ECECF4] text-sm px-3 py-1.5 rounded-full font-medium border-0">
                      {skill}
                    </Badge>
                  ))
                ) : (
                  <span className="italic text-gray-400 text-sm">No skills listed.</span>
                )}
              </div>
            </div>


            {/* Work Experience */}
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <h3 className="text-lg font-bold text-[#3A1F1F] mb-4 flex items-center gap-2"><Briefcase className="h-5 w-5 text-[#FF2B2B]" /> Work Experience</h3>
              <div className="space-y-4">
                {experiences.length > 0 ? (
                  experiences.map((exp) => (
                    <div key={exp.id} className="border-l-2 border-[#FF2B2B] pl-4">
                      <h4 className="font-semibold text-[#3A1F1F] text-base">{exp.title}</h4>
                      <p className="text-[#FF2B2B] text-sm font-medium">{exp.company}{exp.location ? ` • ${exp.location}` : ""}</p>
                      <p className="text-[#8A8A8A] text-xs mt-0.5">
                        {exp.startMonth} {exp.startYear} – {exp.current ? "Present" : `${exp.endMonth} ${exp.endYear}`}
                      </p>
                      {exp.description && (
                        <SafeHtml
                          content={exp.description}
                          className="text-[#8A8A8A] text-sm mt-2 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h2]:text-[#3A1F1F] [&_h2]:font-bold [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-[#3A1F1F] [&_h3]:font-bold [&_h3]:mt-1.5 [&_h3]:mb-1 [&_a]:text-[#FF2B2B] [&_a]:underline"
                        />
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-[#8A8A8A] text-sm italic">No work experience listed.</p>
                )}
              </div>
            </div>

            {/* Education */}
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <h3 className="text-lg font-bold text-[#3A1F1F] mb-4 flex items-center gap-2"><GraduationCap className="h-5 w-5 text-[#FF2B2B]" /> Education</h3>
              <div className="space-y-4">
                {education.length > 0 ? (
                  education.map((edu) => (
                    <div key={edu.id} className="border-l-2 border-[#FF2B2B] pl-4">
                      <h4 className="font-semibold text-[#3A1F1F] text-base">{edu.degree}{edu.field ? ` in ${edu.field}` : ""}</h4>
                      <p className="text-[#8A8A8A] text-sm">{edu.college}</p>
                      <p className="text-[#8A8A8A] text-xs mt-0.5">
                        {formatMonthYear(edu.startMonth, edu.startYear)} – {formatMonthYear(edu.endMonth, edu.endYear)}{edu.score ? ` • Score: ${edu.score}` : ""}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-[#8A8A8A] text-sm italic">No education details listed.</p>
                )}
              </div>
            </div>

            {/* Projects */}
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <h3 className="text-lg font-bold text-[#3A1F1F] mb-4 flex items-center gap-2"><Globe className="h-5 w-5 text-[#FF2B2B]" /> Projects</h3>
              <div className="space-y-4">
                {projects.length > 0 ? (
                  projects.map((proj) => (
                    <div key={proj.id} className="border-l-2 border-[#FF2B2B] pl-4">
                      <h4 className="font-semibold text-[#3A1F1F] text-base">{proj.name}</h4>
                      {proj.url && (
                        <a href={proj.url} target="_blank" rel="noopener noreferrer" className="text-[#FF2B2B] text-xs hover:underline block mt-0.5 break-all">
                          {proj.url}
                        </a>
                      )}
                      <p className="text-[#8A8A8A] text-xs mt-0.5">{formatMonthYear(proj.startMonth, proj.startYear)} – {formatMonthYear(proj.endMonth, proj.endYear)}</p>
                      {proj.description && <p className="text-[#8A8A8A] text-sm mt-2 leading-relaxed whitespace-pre-wrap">{proj.description}</p>}
                    </div>
                  ))
                ) : (
                  <p className="text-[#8A8A8A] text-sm italic">No projects listed.</p>
                )}
              </div>
            </div>

            {/* Certifications */}
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <h3 className="text-lg font-bold text-[#3A1F1F] mb-4 flex items-center gap-2"><Award className="h-5 w-5 text-[#FF2B2B]" /> Certifications</h3>
              <div className="space-y-4">
                {certifications.length > 0 ? (
                  certifications.map((cert) => (
                    <div key={cert.id} className="border-l-2 border-[#FF2B2B] pl-4">
                      <h4 className="font-semibold text-[#3A1F1F] text-base">{cert.name}</h4>
                      {cert.issuer && <p className="text-[#8A8A8A] text-sm">{cert.issuer}</p>}
                      <p className="text-[#8A8A8A] text-xs mt-0.5">
                        {cert.issueDate && `Issued: ${formatYearMonthString(cert.issueDate)}`}
                        {cert.credentialId && ` • Credential ID: ${cert.credentialId}`}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-[#8A8A8A] text-sm italic">No certifications listed.</p>
                )}
              </div>
            </div>

            {/* Languages */}
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <h3 className="text-lg font-bold text-[#3A1F1F] mb-3">Languages</h3>
              <div className="flex flex-wrap gap-2">
                {languages.length > 0 ? (
                  languages.map((lang) => (
                    <Badge key={lang.id} className="bg-[#ECECF4] text-[#3A1F1F] hover:bg-[#ECECF4] text-sm px-3 py-1.5 rounded-full font-medium border-0">
                      {lang.language} <span className="text-[#8A8A8A] font-normal">({lang.proficiency})</span>
                    </Badge>
                  ))
                ) : (
                  <p className="text-[#8A8A8A] text-sm italic">No languages listed.</p>
                )}
              </div>
            </div>


          </div>

          {/* Right Column: Embedded Resume Preview & Download */}
          <div className="flex flex-col space-y-6">
            {/* Preferred Job Settings */}
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <h3 className="text-lg font-bold text-[#3A1F1F] mb-4 flex items-center gap-2"><Briefcase className="h-5 w-5 text-[#FF2B2B]" /> Preferred Job Settings</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-[#8A8A8A]">
                <div>
                  <span className="font-semibold text-[#3A1F1F] block">Desired Job Title</span>
                  {profile?.desired_job_title || "—"}
                </div>
                <div>
                  <span className="font-semibold text-[#3A1F1F] block">Job Type</span>
                  {profile?.job_type_pref || "—"}
                </div>
                <div>
                  <span className="font-semibold text-[#3A1F1F] block">Preferred Location</span>
                  {(() => {
                    const locs = splitPreferredLocations(profile?.preferred_location);
                    return locs.length > 0 ? (
                      <div className="flex gap-1.5 flex-wrap mt-1">
                        {locs.map((loc) => (
                          <Badge key={loc} className="bg-gray-100 text-[#3A1F1F] border border-gray-200 hover:bg-gray-100 text-xs rounded-full font-normal">
                            {loc}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span>{profile?.preferred_location || "—"}</span>
                    );
                  })()}
                </div>
                <div>
                  <span className="font-semibold text-[#3A1F1F] block">Current Salary</span>
                  {profile?.current_salary ? <span className="text-[#3A1F1F] font-semibold">{profile.current_salary}</span> : "—"}
                </div>
                <div>
                  <span className="font-semibold text-[#3A1F1F] block">Expected Salary</span>
                  {profile?.expected_salary ? <span className="text-[#FF2B2B] font-semibold">{profile.expected_salary}</span> : "—"}
                </div>
                <div>
                  <span className="font-semibold text-[#3A1F1F] block">Notice Period</span>
                  {profile?.notice_period || "—"}
                </div>
                <div>
                  <span className="font-semibold text-[#3A1F1F] block">Work Authorization</span>
                  {profile?.work_auth || "—"}
                </div>
                <div>
                  <span className="font-semibold text-[#3A1F1F] block">Willing to Relocate</span>
                  {profile?.willing_to_relocate || "—"}
                </div>
                <div>
                  <span className="font-semibold text-[#3A1F1F] block">Preferred Interview Mode</span>
                  <div className="flex gap-1.5 flex-wrap mt-1">
                    {(() => {
                      let modes: string[] = [];
                      if (profile?.preferred_interview_mode) {
                        if (Array.isArray(profile.preferred_interview_mode)) {
                          modes = profile.preferred_interview_mode;
                        } else if (typeof profile.preferred_interview_mode === "string") {
                          try {
                            const parsed = JSON.parse(profile.preferred_interview_mode);
                            if (Array.isArray(parsed)) {
                              modes = parsed;
                            }
                          } catch (e) {
                            modes = (profile.preferred_interview_mode as any).split(",").map((s: string) => s.trim()).filter(Boolean);
                          }
                        }
                      }
                      return modes.length > 0 ? (
                        modes.map((mode: string) => (
                          <Badge key={mode} className="bg-red-50 text-[#FF2B2B] border border-red-100 hover:bg-red-50 text-xs rounded-full">
                            {mode}
                          </Badge>
                        ))
                      ) : (
                        "—"
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            <div ref={fullscreenResumeRef} className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 flex flex-col flex-1 overflow-hidden relative">

              {/* Floating controls in Fullscreen Mode */}
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

              <h3 className="text-lg font-bold text-[#3A1F1F] mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#FF2B2B]" /> Resume Preview
              </h3>

              <div className={`bg-[#F6F6F6] rounded-xl overflow-auto flex-1 flex flex-col items-center justify-center relative border border-gray-200 min-h-0 ${isFullscreen ? 'max-h-none h-[88vh] w-full' : 'max-h-[65vh]'}`}>
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
                      className={`w-full bg-white ${isFullscreen ? 'h-[85vh]' : 'h-[60vh]'}`}
                      style={{ border: "none" }}
                      sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                    />
                  ) : resumeKind === "pdf" ? (
                    // PDF: render canvases into a container and size container to content height
                    <div className="w-full h-full relative flex flex-col min-h-0">
                      {pdfRendering && (
                        <div className="text-center p-6 absolute inset-0 bg-white/80 z-10 flex flex-col items-center justify-center">
                          <div className="w-9 h-9 border-4 border-[#FF2B2B] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                          <p className="text-sm text-[#5A5A5A]">Preparing resume preview...</p>
                        </div>
                      )}
                      <div ref={pdfPreviewRef} className="w-full bg-white p-4 flex flex-col items-center justify-start overflow-auto min-h-0 max-h-full" />
                    </div>
                  ) : (
                    <iframe
                      src={resumePreviewUrl}
                      title="Resume Preview"
                      className={`w-full bg-white ${isFullscreen ? 'h-[85vh]' : 'h-[60vh]'}`}
                      style={{ border: "none" }}
                    />
                  )
                ) : (
                  <div className="text-center p-6 flex flex-col items-center justify-center h-full w-full">
                    <FileText className="h-12 w-12 text-[#BABABA] mx-auto mb-3" />
                    <p className="text-sm font-semibold text-[#3A1F1F]">No Resume Available</p>
                    <p className="text-xs text-[#8A8A8A] mt-1">This candidate has not uploaded a resume.</p>
                  </div>
                )}
              </div>

              {resumeUrl && !isFullscreen && (
                <div className="mt-4 flex flex-col gap-3">
                  <Button
                    variant="outline"
                    onClick={toggleResumeFullscreen}
                    className="w-full rounded-full border border-gray-200 text-[#3A1F1F] hover:bg-[#F6F6F6] flex items-center justify-center gap-2 h-11 font-medium transition-all"
                  >
                    <Eye className="h-4 w-4" />
                    {isFullscreen ? "Exit Full Screen" : "View Full Screen"}
                  </Button>
                  <Button
                    onClick={handleDownloadResume}
                    className="w-full bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full flex items-center justify-center gap-2 h-11 font-medium shadow-md transition-all"
                  >
                    <Download className="h-4 w-4" /> Download Resume
                  </Button>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
