import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { supabase, Profile, Application } from "../../lib/supabase";
import { useAuth } from "../../lib/auth-context";
import {
  User, MapPin, Phone, Mail, Globe, Star, Briefcase, GraduationCap,
  Award, FileText, Download, Loader2, ArrowLeft, ShieldAlert,
  Calendar, Clock, Check, Building2, Eye, ExternalLink, Linkedin, Minimize2
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
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
  startYear: string;
  endYear: string;
  score: string;
}

interface Project {
  id: number;
  name: string;
  url: string;
  startYear: string;
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
      let profData;
      // 1. Fetch Application
      const { data: appData, error: appError } = await supabase
        .from("applications")
        .select("*, job:jobs(title, id)")
        .eq("id", id)
        .single();

      if (appError || !appData) {
        // Fallback: Try to fetch profile directly assuming applicantId is the profile ID
        const { data: directProf, error: directProfErr } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", id)
          .single();

        if (directProfErr || !directProf) {
          setError("Candidate profile not found or could not be loaded.");
          setLoading(false);
          return;
        }
        profData = directProf;
        setApplication(null);
      } else {
        // 2. Validate recruiter access permission
        if (appData.recruiter_id !== recruiterProfile.id) {
          setError("Access Denied: You do not have permission to view this applicant's profile.");
          setLoading(false);
          return;
        }
        setApplication(appData);

        // 3. Fetch candidate profile
        const { data: pData, error: pError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", appData.profile_id)
          .single();

        if (pError || !pData) {
          setError("Candidate profile not found or could not be loaded.");
          setLoading(false);
          return;
        }
        profData = pData;
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
          college: e.institution, startYear: e.start_year || "",
          endYear: e.end_year || "", score: e.score || "",
        }));
        setEducation(mappedEdu);
      }

      let mappedProj: Project[] = [];
      if (projRes.data) {
        mappedProj = projRes.data.map(p => ({
          id: p.id, name: p.name, url: p.url || "",
          startYear: p.start_year || "", endYear: p.end_year || "", description: p.description || "",
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
          void supabase.rpc("increment_profile_views", { target_profile_id: profData.id }).then(({ error: viewError }) => {
            if (viewError) {
              console.warn("Failed to increment profile views:", viewError.message);
              localStorage.removeItem(viewKey);
            }
          });
        }
      }

      // 6. Resolve resume url
      const rawResumeUrl = profData.resume_url || appData?.resume_url || null;
      let resolvedUrl = null;
      let previewUrl = null;

      if (rawResumeUrl) {
        setResumeUrl(rawResumeUrl);
        
        // Increment resumes used by recruiter profile (only once per recruiter per candidate)
        if (recruiterProfile?.id && profData.id) {
          const resumeViewKey = `viewed_resume_${recruiterProfile.id}_${profData.id}`;
          if (!localStorage.getItem(resumeViewKey)) {
            localStorage.setItem(resumeViewKey, "true");
            void supabase.rpc("increment_recruiter_resumes", { p_recruiter_id: recruiterProfile.id }).then(({ error: rErr }) => {
              if (rErr) {
                console.warn("Failed to increment resumes used count:", rErr.message);
                localStorage.removeItem(resumeViewKey);
              }
            });
          }
        }

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
  }, [resumeUrl]);

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
  const matchScore = Math.floor(70 + (id?.charCodeAt(0) || 0) % 25);

  return (
    <div className="min-h-screen bg-[#F6F6F6] flex flex-col font-sans">
      {/* Main Grid Content */}
      <main className="flex-1 w-full px-4 py-6 lg:px-8">
        {/* Inner page navigation bar */}
        <div className="flex justify-between items-center mb-6 bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="rounded-full hover:bg-gray-100" onClick={() => navigate(application ? "/recruiter/dashboard/applicants" : "/recruiter/dashboard/search-candidates")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to {application ? "Applicants" : "Candidate Search"}
            </Button>
            <span className="text-xs font-semibold px-2.5 py-1 bg-red-50 text-[#FF2B2B] border border-red-100 rounded-full">Profile Review Mode</span>
          </div>
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
                      <h2 className="text-2xl font-bold text-[#3A1F1F]">{name}</h2>
                      <p className="text-[#FF2B2B] font-medium">{profile?.headline || "Jobseeker"}</p>
                    </div>
                    <div className="bg-green-50 border border-green-100 rounded-xl px-3 py-1.5 text-center flex-shrink-0">
                      <div className="text-lg font-bold text-green-600">{matchScore}%</div>
                      <div className="text-xs text-green-500 font-medium">Job Match</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-sm text-[#8A8A8A]">
                    {profile?.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4 text-[#8A8A8A]" />{profile.location}</span>}
                    {profile?.phone && <span className="flex items-center gap-1"><Phone className="h-4 w-4 text-[#8A8A8A]" />{profile.phone}</span>}
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

            {/* Professional Summary */}
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <h3 className="text-lg font-bold text-[#3A1F1F] mb-3">Professional Summary</h3>
              <p className="text-[#8A8A8A] leading-relaxed text-sm whitespace-pre-wrap">
                {profile?.about || <span className="italic text-gray-400">No professional summary added.</span>}
              </p>
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
                      {exp.description && <p className="text-[#8A8A8A] text-sm mt-2 leading-relaxed whitespace-pre-wrap">{exp.description}</p>}
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
                        {edu.startYear} – {edu.endYear}{edu.score ? ` • Score: ${edu.score}` : ""}
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
                      <p className="text-[#8A8A8A] text-xs mt-0.5">{proj.startYear} – {proj.endYear}</p>
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
                        {cert.issueDate && `Issued: ${cert.issueDate}`}
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
                  {profile?.preferred_location || "—"}
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

          </div>

          {/* Right Column: Embedded Resume Preview & Download */}
          <div className="flex flex-col">
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
