import { useEffect, useMemo, useRef, useState } from "react";
import { Menu, MapPin, DollarSign, Clock, ChevronRight, Facebook, Instagram, Twitter, Bell, Star, ArrowRight, Globe, Calendar } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "../components/ui/sheet";
import { useNavigate, useParams, Link } from "react-router";
import logoImage from "../../logo/logo.png";
import { supabase, type Job as DBJob } from "../../lib/supabase";
import { decryptPhone } from "../../lib/phoneProtection";
import { formatJobSalary, isJobVisibleToSeekers } from "../../lib/jobs";
import { isIndianLocation } from "../../lib/locationData";
import { useAuth } from "../../lib/auth-context";
import { SafeHtml } from "../components/ui/safe-html";
import { extractTextFromHtml } from "../../lib/recruiterJobHelpers";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import PublicFooter from "../components/PublicFooter";
import ProfileCompletionModal, { checkApplicationRequirements } from "../components/ProfileCompletionModal";

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

function splitBulletContent(value: string | null, fallback: string): string[] {

  if (!value) return [fallback];

  return value
    .split(/\r?\n|[•]/)
    .map((item) => item.trim().replace(/^[-*]\s*/, ""))
    .filter(Boolean);
}

export default function JobDetailPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [job, setJob] = useState<DBJob | null>(null);
  const [relatedJobs, setRelatedJobs] = useState<DBJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  // Which job id has already had its view counted on this mount, so React
  // StrictMode's double-invoke in development does not count twice.
  const countedViewRef = useRef<string | null>(null);
  const navigate = useNavigate();
  const { id } = useParams();
  const { role, profile, signOut } = useAuth();
  const [profileCompletionModalOpen, setProfileCompletionModalOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function fetchJobData() {
      if (!id) {
        setLoadError("Job not found.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError("");

      const { data: currentJob, error: jobError } = await supabase
        .from("jobs")
        .select(
          // Explicit column list, not "*": this page is public, and selecting every
          // column would require anon to hold SELECT on recruiter email and internal
          // billing/verification fields. Keep in sync with the anon grant in
          // supabase/rls_public_exposure_fix.sql.
          "*, recruiter:recruiter_profiles(id, recruiter_name, company_name, company_size, company_type, industry, company_description, website, location, logo_url, cover_image_url, tagline, linkedin_url, cin, founded, phone)"
        )
        .eq("id", id)
        .maybeSingle();

      if (!mounted) return;

      // Count the view. jobs.views was never incremented anywhere, which is why
      // the recruiter Analytics Job Views tile and the CTR column sat at 0 across
      // all 1016 jobs. Fire-and-forget — a failed counter must not stop the page
      // rendering.
      if (currentJob && !jobError && countedViewRef.current !== currentJob.id) {
        countedViewRef.current = currentJob.id;
        void supabase.rpc("increment_job_views", { p_job_id: currentJob.id });
      }

      if (jobError || !currentJob || !isJobVisibleToSeekers(currentJob) || !isIndianLocation(currentJob.location)) {
        setJob(null);
        setRelatedJobs([]);
        setLoadError("This job is unavailable or no longer active.");
        setLoading(false);
        return;
      }

      setJob(currentJob);

      const { data: related } = await supabase
        .from("jobs")
        .select("*")
        .eq("status", "Active")
        .neq("id", currentJob.id)
        .order("created_at", { ascending: false })
        .limit(6);

      if (!mounted) return;

      setRelatedJobs(
        (related || [])
          .filter((item) => isJobVisibleToSeekers(item) && isIndianLocation(item.location))
          .slice(0, 3)
      );
      setLoading(false);
    }

    fetchJobData();
    return () => {
      mounted = false;
    };
  }, [id]);

  const currentJob = useMemo(() => {
    if (!job) return null;

    return {
      id: job.id,
      title: job.title,
      company: job.recruiter?.company_name || job.company_name,
      location: job.location || "India",
      salary: formatJobSalary(job),
      type: job.employment_type || job.work_mode || "Full-time",
      experience:
        job.experience_min || job.experience_max
          ? `${job.experience_min || 0}-${job.experience_max || job.experience_min || 0} years`
          : "Experience not specified",
      description: job.description || "Detailed description will be shared by the recruiter.",
      responsibilities: splitBulletContent(job.roles_responsibilities, "Role responsibilities will be shared by the recruiter."),
      qualifications: splitBulletContent(job.requirements, "Job requirements will be shared by the recruiter."),
      rawResponsibilities: job.roles_responsibilities,
      rawQualifications: job.requirements,
      preferredJoiningTime: job.preferred_joining_time || null,
      additionalInfo: [
        job.work_mode ? `Work mode: ${job.work_mode}` : "",
        job.preferred_joining_time ? `Preferred joining time: ${job.preferred_joining_time}` : "",
        job.interview_mode ? `Interview mode: ${job.interview_mode}` : "",
        job.education ? `Education: ${job.education}` : "",
        job.openings ? `Openings: ${job.openings}` : "",
      ]
        .filter(Boolean)
        .join(" | "),
    };
  }, [job]);

  const handleApplyClick = () => {
    if (role === "jobseeker") {
      // Validate 3 mandatory fields: Professional Summary, Resume Upload, Preferred Job Settings
      const reqStatus = checkApplicationRequirements(profile);
      if (!reqStatus.isComplete) {
        setProfileCompletionModalOpen(true);
        return;
      }
      navigate("/jobseeker/dashboard");
      return;
    }

    navigate(`/jobseeker/signin?redirect=${encodeURIComponent(`/job/${currentJob?.id || id || ""}`)}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F6F6] flex items-center justify-center">
        <p className="text-[#8A8A8A] text-lg">Loading job details...</p>
      </div>
    );
  }

  if (!job || !currentJob) {
    return (
      <div className="min-h-screen bg-[#F6F6F6] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-[#3A1F1F] text-xl font-semibold mb-3">{loadError || "Job not found."}</p>
          <Button className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full" onClick={() => navigate("/jobs")}>
            Back to Jobs
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F6F6]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(profile ? '/jobseeker/dashboard' : '/')}>
            <img src={logoImage} alt="RhirePro Logo" className="w-10 h-10" />
            <div className="text-xl font-bold text-[#3A1F1F]">
              Rhire<span className="text-[#FF2B2B]">Pro</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          {profile ? (
            <nav className="hidden md:flex items-center gap-4">
              <button onClick={() => navigate('/jobseeker/dashboard')} className="text-[#3A1F1F] hover:text-[#FF2B2B] font-medium text-sm px-3 py-1.5 transition-colors">
                Find a Job
              </button>
              <button onClick={() => navigate('/jobseeker/dashboard/profile')} className="text-[#3A1F1F] hover:text-[#FF2B2B] font-medium text-sm px-3 py-1.5 transition-colors">
                Profile
              </button>
              <button onClick={() => navigate('/jobseeker/dashboard/analytics')} className="bg-[#FF2B2B] text-white font-medium text-sm px-4 py-1.5 rounded-full transition-colors">
                Job Analytics
              </button>
              <button onClick={() => navigate('/jobseeker/dashboard/insights')} className="text-[#3A1F1F] hover:text-[#FF2B2B] font-medium text-sm px-3 py-1.5 transition-colors">
                Career Insights
              </button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void signOut()}
                className="rounded-full border-gray-200 text-[#3A1F1F] hover:bg-gray-50 text-xs ml-2"
              >
                Sign Out
              </Button>
            </nav>
          ) : (
            <nav className="hidden md:flex items-center gap-8">
              <button onClick={() => navigate('/')} className="text-[#3A1F1F] hover:text-[#FF2B2B] transition-colors">
                Home
              </button>
              <button onClick={() => navigate('/')} className="text-[#3A1F1F] hover:text-[#FF2B2B] transition-colors">
                About Us
              </button>
              <Button
                onClick={() => navigate('/jobs')}
                className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full px-6"
              >
                Jobs
              </Button>
              <button onClick={() => navigate('/')} className="text-[#3A1F1F] hover:text-[#FF2B2B] transition-colors">
                Contact Us
              </button>
            </nav>
          )}

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
                Navigation options
              </SheetDescription>
              <div className="flex flex-col gap-6 mt-8">
                <h3 className="text-xl font-semibold text-[#3A1F1F]">Welcome to RhirePro</h3>
                {profile ? (
                  <>
                    <Button className="w-full bg-[#FF2B2B] text-white rounded-full" onClick={() => { setIsMenuOpen(false); navigate('/jobseeker/dashboard'); }}>
                      Find a Job
                    </Button>
                    <Button className="w-full bg-[#FF2B2B] text-white rounded-full" onClick={() => { setIsMenuOpen(false); navigate('/jobseeker/dashboard/analytics'); }}>
                      Job Analytics
                    </Button>
                    <Button variant="outline" className="w-full rounded-full" onClick={() => { setIsMenuOpen(false); void signOut(); }}>
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="mb-6 md:mb-0 flex-1">
              <div className="flex items-center gap-2 text-sm text-[#8A8A8A] mb-4">
                <a href="/jobs" className="hover:text-[#FF2B2B]">Jobs</a>
                <ChevronRight className="h-4 w-4" />
                <span className="text-[#FF2B2B] border border-[#FF2B2B] px-3 py-1 rounded-full">
                  Job Detail
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-[#3A1F1F] mb-4">
                Job Overview and Requirements
              </h1>
              <p className="text-[#8A8A8A] max-w-lg">
                View detailed information about this position's requirements and how to apply. Take the next step in your career today.
              </p>
            </div>
            <div className="flex gap-4 items-center">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=600&q=80"
                alt="Job Overview"
                className="rounded-2xl h-44 w-52 object-cover shadow-md border border-gray-100"
              />
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80"
                alt="Team Workspace"
                className="rounded-2xl h-36 w-36 mt-6 object-cover shadow-md border border-gray-100"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Job Details Section */}
      <section className="bg-[#ECECF4] py-16">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Sidebar - Related Jobs. Comes first in the DOM for desktop's
                left column, but that put Featured Jobs above the actual job
                someone opened a shared link for on mobile — order-last there. */}
            <div className="order-2 lg:order-1 lg:col-span-1 space-y-6">
              <div className="bg-white rounded-2xl p-6 shadow-md">
                <h3 className="text-xl font-bold text-[#3A1F1F] mb-4">Featured Jobs</h3>
                <div className="space-y-4">
                  {relatedJobs.map((job) => (
                    <div 
                      key={job.id}
                      className="border-b border-gray-100 pb-4 last:border-0 cursor-pointer hover:bg-gray-50 p-3 rounded-xl transition-colors"
                      onClick={() => navigate(`/job/${job.id}`)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-bold text-[#3A1F1F] mb-1">{job.title}</h4>
                          <p className="text-sm text-[#8A8A8A] mb-2">{extractTextFromHtml(job.description || "Explore this opportunity.").substring(0, 60)}...</p>
                        </div>
                        <div className="w-3 h-3 bg-[#FF2B2B] rounded-full flex-shrink-0"></div>
                      </div>
                      <div className="space-y-1 text-xs text-[#8A8A8A] mb-3">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-[#FF2B2B]" />
                          {Array.isArray(job.locations) && job.locations.length > 0 ? job.locations.join(", ") : (job.location || "India")}
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-[#FF2B2B]" />
                          {formatJobSalary(job)}
                        </div>
                      </div>
                      <Button className="w-full bg-white border border-[#FF2B2B] text-[#FF2B2B] hover:bg-[#FF2B2B] hover:text-white rounded-full text-sm py-2">
                        Apply Now
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-md">
                <h3 className="text-xl font-bold text-[#3A1F1F] mb-4">{currentJob.company}</h3>
                <h4 className="font-bold text-[#3A1F1F] mb-2">{currentJob.title}</h4>
                <p className="text-sm text-[#8A8A8A] mb-4">
                  {extractTextFromHtml(currentJob.description).substring(0, 140)}...
                </p>
                <div className="space-y-2 text-sm text-[#8A8A8A] mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#FF2B2B]" />
                    {Array.isArray((currentJob as any).locations) && (currentJob as any).locations.length > 0
                      ? (currentJob as any).locations.join(", ")
                      : currentJob.location}
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-[#FF2B2B]" />
                    {currentJob.salary}
                  </div>
                </div>
                <Button asChild className="w-full bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full cursor-pointer">
                  <Link to="/jobs" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                    Explore More Jobs
                  </Link>
                </Button>
              </div>
            </div>

            {/* Main Content */}
            <div className="order-1 lg:order-2 lg:col-span-2 space-y-6">
              {/* Job Header Card */}
              <div className="bg-white rounded-2xl p-8 shadow-md">
                <div className="flex items-center gap-4 mb-6">
                  {job.recruiter?.logo_url ? (
                    <img src={job.recruiter.logo_url} alt="" className="w-16 h-16 rounded-2xl object-cover border border-gray-200" />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center text-[#FF2B2B] font-bold text-2xl border border-gray-200">
                      {currentJob.company[0]?.toUpperCase() || "C"}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="inline-block bg-[#FF2B2B] text-white px-3 py-1 rounded-full text-xs font-semibold">
                        {currentJob.company}
                      </span>
                      {job.recruiter && (
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium">Verified Company</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
                      <h2 className="text-3xl font-bold text-[#3A1F1F]">{currentJob.title}</h2>
                      {job?.created_at && (
                        <span className="text-sm text-[#8A8A8A] font-medium bg-[#ECECF4] px-3 py-1.5 rounded-full shrink-0">
                          Posted {new Date(job.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-start gap-6 mb-6 pb-6 border-b border-gray-100">
                  <div className="flex items-start gap-3 text-[#8A8A8A] min-w-[150px] max-w-full flex-1">
                    <MapPin className="h-5 w-5 text-[#FF2B2B] shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs text-[#8A8A8A] mb-0.5">Location</p>
                      <p className="font-semibold text-[#3A1F1F] text-sm break-words">
                        {Array.isArray((currentJob as any).locations) && (currentJob as any).locations.length > 0
                          ? (currentJob as any).locations.join(", ")
                          : currentJob.location}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 text-[#8A8A8A] min-w-[130px]">
                    <DollarSign className="h-5 w-5 text-[#FF2B2B] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-[#8A8A8A] mb-0.5">Salary</p>
                      <p className="font-semibold text-[#3A1F1F] text-sm whitespace-nowrap">{currentJob.salary}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 text-[#8A8A8A] min-w-[130px]">
                    <Clock className="h-5 w-5 text-[#FF2B2B] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-[#8A8A8A] mb-0.5">Experience</p>
                      <p className="font-semibold text-[#3A1F1F] text-sm whitespace-nowrap">{currentJob.experience}</p>
                    </div>
                  </div>
                </div>

                <Button className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full px-12 py-6" onClick={handleApplyClick}>
                  Apply Now
                </Button>
              </div>

              {/* Job Description */}
              <div className="bg-white rounded-2xl p-8 shadow-md">
                <h3 className="text-2xl font-bold text-[#3A1F1F] mb-4">Job Description :</h3>
                <div className="rich-text-content text-[#8A8A8A] leading-relaxed mb-6 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:mt-1.5 [&_h3]:mb-1 [&_a]:text-[#FF2B2B] [&_a]:underline">
                  <SafeHtml content={currentJob.description} />
                </div>

                {currentJob.rawResponsibilities && currentJob.rawResponsibilities.trim() && (
                  <>
                    <h3 className="text-2xl font-bold text-[#3A1F1F] mb-4 mt-8">Key Responsibilities:</h3>
                    {/<[a-z][\s\S]*>/i.test(currentJob.rawResponsibilities) ? (
                      <div className="rich-text-content text-[#8A8A8A] leading-relaxed mb-6 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:mt-1.5 [&_h3]:mb-1 [&_a]:text-[#FF2B2B] [&_a]:underline">
                        <SafeHtml content={currentJob.rawResponsibilities} />
                      </div>
                    ) : (
                      <ul className="space-y-3 mb-6">
                        {currentJob.responsibilities.map((item, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-[#FF2B2B] rounded-full mt-2 flex-shrink-0"></div>
                            <span className="text-[#8A8A8A]">{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}

                {currentJob.rawQualifications && currentJob.rawQualifications.trim() && (
                  <>
                    <h3 className="text-2xl font-bold text-[#3A1F1F] mb-4 mt-8">Qualifications:</h3>
                    {/<[a-z][\s\S]*>/i.test(currentJob.rawQualifications) ? (
                      <div className="rich-text-content text-[#8A8A8A] leading-relaxed mb-6 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:mt-1.5 [&_h3]:mb-1 [&_a]:text-[#FF2B2B] [&_a]:underline">
                        <SafeHtml content={currentJob.rawQualifications} />
                      </div>
                    ) : (
                      <ul className="space-y-3 mb-6">
                        {currentJob.qualifications.map((item, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-[#FF2B2B] rounded-full mt-2 flex-shrink-0"></div>
                            <span className="text-[#8A8A8A]">{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}

                {job.skills && job.skills.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-2xl font-bold text-[#3A1F1F] mb-3">Key Skills:</h3>
                    <div className="flex flex-wrap gap-2">
                      {job.skills.map((s, i) => (
                        <span key={i} className="bg-[#ECECF4] text-[#3A1F1F] text-sm px-3.5 py-1.5 rounded-full font-medium">{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {job.perks && job.perks.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-2xl font-bold text-[#3A1F1F] mb-3">Perks & Benefits:</h3>
                    <div className="flex flex-wrap gap-2">
                      {job.perks.map((p, i) => (
                        <span key={i} className="bg-green-50 text-green-700 text-sm px-3.5 py-1.5 rounded-full font-medium">{p}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Additional Job Details & Requirements */}
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <h3 className="text-2xl font-bold text-[#3A1F1F] mb-4">Job Details & Requirements :</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6 bg-[#F8F9FB] rounded-2xl p-5 border border-gray-100">
                    <div>
                      <p className="text-xs text-[#8A8A8A] mb-0.5">Employment Type</p>
                      <p className="font-semibold text-[#3A1F1F] text-sm">{job.employment_type || "Full-time"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#8A8A8A] mb-0.5">Work Mode</p>
                      <p className="font-semibold text-[#3A1F1F] text-sm">{job.work_mode || "Work from Office"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#8A8A8A] mb-0.5">Qualification / Degree</p>
                      <p className="font-semibold text-[#3A1F1F] text-sm">{job.education || "Any Graduate / Relevant Degree"}</p>
                    </div>
                    {job.specialization && (
                      <div>
                        <p className="text-xs text-[#8A8A8A] mb-0.5">Specialization</p>
                        <p className="font-semibold text-[#3A1F1F] text-sm">{job.specialization}</p>
                      </div>
                    )}
                    {job.department && (
                      <div>
                        <p className="text-xs text-[#8A8A8A] mb-0.5">Department</p>
                        <p className="font-semibold text-[#3A1F1F] text-sm">{job.department}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-[#8A8A8A] mb-0.5">Industry</p>
                      <p className="font-semibold text-[#3A1F1F] text-sm">
                        {Array.isArray(job.industries) && job.industries.length > 0
                          ? job.industries.join(", ")
                          : (job.industry || "IT / Software")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#8A8A8A] mb-0.5">Notice Period / Joining</p>
                      <p className="font-semibold text-[#3A1F1F] text-sm">{job.preferred_joining_time || currentJob.preferredJoiningTime || "Immediate / Negotiable"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#8A8A8A] mb-0.5">Interview Mode</p>
                      <p className="font-semibold text-[#3A1F1F] text-sm">{job.interview_mode || "In-Person"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#8A8A8A] mb-0.5">Number of Openings</p>
                      <p className="font-semibold text-[#3A1F1F] text-sm">{job.openings || 1} {Number(job.openings || 1) > 1 ? "Openings" : "Opening"}</p>
                    </div>
                  </div>
                </div>

                <Button className="mt-8 bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full px-12 py-6" onClick={handleApplyClick}>
                  Apply Now
                </Button>

                {job.recruiter && (
                  <div className="mt-8 pt-6 border-t border-gray-200 space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
                      <h3 className="text-xl font-bold text-[#3A1F1F]">Company Profile</h3>
                      {job.recruiter.website && (
                        <a href={job.recruiter.website} target="_blank" rel="noreferrer" className="text-sm text-[#FF2B2B] hover:underline flex items-center gap-1 font-medium">
                          <Globe className="h-4 w-4" /> Visit Website
                        </a>
                      )}
                    </div>

                    {job.recruiter.tagline && (
                      <p className="text-base italic text-[#5A5A5A] border-l-4 border-[#FF2B2B] pl-3 mb-4">
                        "{job.recruiter.tagline}"
                      </p>
                    )}

                    {(() => {
                      const { aboutCompany, companyInfo } = parseCompanyDescription(job.recruiter.company_description);
                      const hasAbout = aboutCompany && aboutCompany !== "<p><br></p>" && aboutCompany !== "<p></p>";
                      const hasInfo = companyInfo && companyInfo !== "<p><br></p>" && companyInfo !== "<p></p>";

                      return (
                        <>
                          {hasAbout && (
                            <div className="mb-4">
                              <h4 className="font-bold text-[#3A1F1F] text-base mb-1.5">About Company</h4>
                              <div className="text-base text-[#6A6A6A] leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:mt-1.5 [&_h3]:mb-1 [&_a]:text-[#FF2B2B] [&_a]:underline">
                                <SafeHtml content={aboutCompany} />
                              </div>
                            </div>
                          )}

                          <h4 className={`font-bold text-[#3A1F1F] text-base mb-1.5 mt-4 ${
                            (job.recruiter.tagline || hasAbout)
                              ? "pt-3 border-t border-gray-100"
                              : ""
                          }`}>
                            Company Information
                          </h4>

                          {hasInfo && (
                            <div className="text-base text-[#6A6A6A] leading-relaxed mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:mt-1.5 [&_h3]:mb-1 [&_a]:text-[#FF2B2B] [&_a]:underline">
                              <SafeHtml content={companyInfo} />
                            </div>
                          )}
                        </>
                      );
                    })()}
                    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 mt-3">
                      {job.recruiter.industry && (
                        <div>
                          <span className="text-[#8A8A8A] block text-sm mb-0.5">Industry</span>
                          <span className="font-semibold text-[#3A1F1F] text-base">{job.recruiter.industry}</span>
                        </div>
                      )}
                      {job.recruiter.company_type && (
                        <div>
                          <span className="text-[#8A8A8A] block text-sm mb-0.5">Company Type</span>
                          <span className="font-semibold text-[#3A1F1F] text-base">{job.recruiter.company_type}</span>
                        </div>
                      )}
                      {job.recruiter.company_size && (
                        <div>
                          <span className="text-[#8A8A8A] block text-sm mb-0.5">Company Size</span>
                          <span className="font-semibold text-[#3A1F1F] text-base">{job.recruiter.company_size} employees</span>
                        </div>
                      )}
                      {job.recruiter.founded && (
                        <div>
                          <span className="text-[#8A8A8A] block text-sm mb-0.5">Founded Year</span>
                          <span className="font-semibold text-[#3A1F1F] text-base">{job.recruiter.founded}</span>
                        </div>
                      )}
                      {job.recruiter.location && (
                        <div>
                          <span className="text-[#8A8A8A] block text-sm mb-0.5">Headquarters</span>
                          <span className="font-semibold text-[#3A1F1F] text-base flex items-center gap-0.5">
                            <MapPin className="h-3.5 w-3.5 text-[#FF2B2B]" /> {job.recruiter.location}
                          </span>
                        </div>
                      )}
                      {job.recruiter.phone && (
                        <div>
                          <span className="text-[#8A8A8A] block text-sm mb-0.5">Phone</span>
                          <span className="font-semibold text-[#3A1F1F] text-base">{decryptPhone(job.recruiter.phone)}</span>
                        </div>
                      )}
                      {job.recruiter.cin && (
                        <div>
                          <span className="text-[#8A8A8A] block text-sm mb-0.5">CIN Number</span>
                          <span className="font-semibold text-[#3A1F1F] text-base">{job.recruiter.cin}</span>
                        </div>
                      )}
                      {job.recruiter.recruiter_name && (
                        <div>
                          <span className="text-[#8A8A8A] block text-sm mb-0.5">HR Contact</span>
                          <span className="font-semibold text-[#3A1F1F] text-base">{job.recruiter.recruiter_name}</span>
                        </div>
                      )}
                      {job.recruiter.website && (
                        <div className="col-span-2 md:col-span-3">
                          <span className="text-[#8A8A8A] block text-sm mb-0.5">Website</span>
                          <a href={job.recruiter.website} target="_blank" rel="noreferrer" className="font-semibold text-[#FF2B2B] hover:underline truncate block text-base">
                            {job.recruiter.website}
                          </a>
                        </div>
                      )}
                      {job.recruiter.linkedin_url && (
                        <div className="col-span-2 md:col-span-3">
                          <span className="text-[#8A8A8A] block text-sm mb-0.5">LinkedIn</span>
                          <a href={job.recruiter.linkedin_url} target="_blank" rel="noreferrer" className="font-semibold text-[#FF2B2B] hover:underline truncate block text-base">
                            {job.recruiter.linkedin_url}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <PublicFooter />

      <ProfileCompletionModal
        isOpen={profileCompletionModalOpen}
        onClose={() => setProfileCompletionModalOpen(false)}
        profile={profile}
        jobTitle={currentJob?.title}
        onNavigateToProfile={() => navigate("/jobseeker/dashboard/profile")}
      />
    </div>
  );
}
