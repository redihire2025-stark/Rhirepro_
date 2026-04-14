import { useEffect, useMemo, useState } from "react";
import { Menu, MapPin, DollarSign, Clock, ChevronRight, Facebook, Instagram, Twitter, Bell, Star, ArrowRight } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "../components/ui/sheet";
import { useNavigate, useParams } from "react-router";
import logoImage from "../../logo/logo.png";
import { supabase, type Job as DBJob } from "../../lib/supabase";
import { isJobVisibleToSeekers } from "../../lib/jobs";

const INDIAN_LOCATION_MARKERS = [
  "india", "bharat", "andhra pradesh", "arunachal pradesh", "assam", "bihar",
  "chhattisgarh", "goa", "gujarat", "haryana", "himachal pradesh", "jharkhand",
  "karnataka", "kerala", "madhya pradesh", "maharashtra", "manipur", "meghalaya",
  "mizoram", "nagaland", "odisha", "punjab", "rajasthan", "sikkim", "tamil nadu",
  "telangana", "tripura", "uttar pradesh", "uttarakhand", "west bengal", "delhi",
  "new delhi", "ncr", "jammu", "kashmir", "ladakh", "lakshadweep",
  "andaman", "nicobar", "bengaluru", "bangalore", "mumbai", "pune", "hyderabad",
  "chennai", "kolkata", "noida", "gurugram", "gurgaon", "faridabad", "ghaziabad",
  "jaipur", "ahmedabad", "surat", "vadodara", "indore", "bhopal", "kochi",
  "coimbatore", "madurai", "trivandrum", "thiruvananthapuram", "visakhapatnam",
  "vijayawada", "nagpur", "nashik", "lucknow", "kanpur", "patna", "ranchi",
  "bhubaneswar", "guwahati", "mohali", "chandigarh"
];

function isIndianJobLocation(location: string | null): boolean {
  if (!location) return false;
  const normalized = location.toLowerCase();
  return INDIAN_LOCATION_MARKERS.some((marker) => normalized.includes(marker));
}

function formatSalary(job: DBJob): string {
  if (job.salary_min && job.salary_max && job.salary_type) {
    return `${job.salary_min}-${job.salary_max} ${job.salary_type}`;
  }
  if (job.salary_min && job.salary_type) {
    return `${job.salary_min}+ ${job.salary_type}`;
  }
  return "Salary not disclosed";
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
  const navigate = useNavigate();
  const { id } = useParams();

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
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (!mounted) return;

      if (jobError || !currentJob || !isJobVisibleToSeekers(currentJob) || !isIndianJobLocation(currentJob.location)) {
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
          .filter((item) => isJobVisibleToSeekers(item) && isIndianJobLocation(item.location))
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
      company: job.company_name,
      location: job.location || "India",
      salary: formatSalary(job),
      type: job.employment_type || job.work_mode || "Full-time",
      experience:
        job.experience_min || job.experience_max
          ? `${job.experience_min || 0}-${job.experience_max || job.experience_min || 0} years`
          : "Experience not specified",
      description: job.description || "Detailed description will be shared by the recruiter.",
      responsibilities: splitBulletContent(job.roles_responsibilities, "Role responsibilities will be shared by the recruiter."),
      qualifications: splitBulletContent(job.requirements, "Job requirements will be shared by the recruiter."),
      additionalInfo: [
        job.work_mode ? `Work mode: ${job.work_mode}` : "",
        job.education ? `Education: ${job.education}` : "",
        job.openings ? `Openings: ${job.openings}` : "",
      ]
        .filter(Boolean)
        .join(" | "),
    };
  }, [job]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F6F6] flex items-center justify-center">
        <p className="text-[#8A8A8A] text-lg">Loading job details...</p>
      </div>
    );
  }

  if (!currentJob) {
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
              onClick={() => navigate('/jobs')}
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
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-300 rounded-2xl h-48 w-56"></div>
              <div className="bg-gray-400 rounded-2xl h-40 w-40 mt-8"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Job Details Section */}
      <section className="bg-[#ECECF4] py-16">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Sidebar - Related Jobs */}
            <div className="lg:col-span-1 space-y-6">
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
                          <p className="text-sm text-[#8A8A8A] mb-2">{(job.description || "Explore this opportunity.").substring(0, 60)}...</p>
                        </div>
                        <div className="w-3 h-3 bg-[#FF2B2B] rounded-full flex-shrink-0"></div>
                      </div>
                      <div className="space-y-1 text-xs text-[#8A8A8A] mb-3">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-[#FF2B2B]" />
                          {job.location || "India"}
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-[#FF2B2B]" />
                          {formatSalary(job)}
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
                  {currentJob.description.substring(0, 140)}...
                </p>
                <div className="space-y-2 text-sm text-[#8A8A8A] mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#FF2B2B]" />
                    {currentJob.location}
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-[#FF2B2B]" />
                    {currentJob.salary}
                  </div>
                </div>
                <Button className="w-full bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full" onClick={() => navigate("/jobs")}>
                  Explore More Jobs
                </Button>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Job Header Card */}
              <div className="bg-white rounded-2xl p-8 shadow-md">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="inline-block bg-[#FF2B2B] text-white px-3 py-1 rounded-full text-sm">
                        {currentJob.company}
                      </span>
                      <div className="w-3 h-3 bg-[#FF2B2B] rounded-full"></div>
                    </div>
                    <h2 className="text-3xl font-bold text-[#3A1F1F] mb-4">{currentJob.title}</h2>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div className="flex items-center gap-3 text-[#8A8A8A]">
                    <MapPin className="h-5 w-5 text-[#FF2B2B]" />
                    <div>
                      <p className="text-xs">Location</p>
                      <p className="font-semibold text-[#3A1F1F]">{currentJob.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[#8A8A8A]">
                    <DollarSign className="h-5 w-5 text-[#FF2B2B]" />
                    <div>
                      <p className="text-xs">Salary</p>
                      <p className="font-semibold text-[#3A1F1F]">{currentJob.salary}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[#8A8A8A]">
                    <Clock className="h-5 w-5 text-[#FF2B2B]" />
                    <div>
                      <p className="text-xs">Experience</p>
                      <p className="font-semibold text-[#3A1F1F]">{currentJob.experience}</p>
                    </div>
                  </div>
                </div>

                <Button className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full px-12 py-6">
                  Apply Now
                </Button>
              </div>

              {/* Job Description */}
              <div className="bg-white rounded-2xl p-8 shadow-md">
                <h3 className="text-2xl font-bold text-[#3A1F1F] mb-4">Job Description :</h3>
                <p className="text-[#8A8A8A] leading-relaxed mb-6">
                  {currentJob.description}
                </p>

                <h3 className="text-2xl font-bold text-[#3A1F1F] mb-4 mt-8">Key Responsibilities:</h3>
                <ul className="space-y-3 mb-6">
                  {currentJob.responsibilities.map((item, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-[#FF2B2B] rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-[#8A8A8A]">{item}</span>
                    </li>
                  ))}
                </ul>

                <h3 className="text-2xl font-bold text-[#3A1F1F] mb-4 mt-8">Qualifications:</h3>
                <ul className="space-y-3 mb-6">
                  {currentJob.qualifications.map((item, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-[#FF2B2B] rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-[#8A8A8A]">{item}</span>
                    </li>
                  ))}
                </ul>

                {currentJob.additionalInfo && (
                  <p className="text-[#8A8A8A] text-sm italic mt-8">
                    {currentJob.additionalInfo}
                  </p>
                )}

                <Button className="mt-8 bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full px-12 py-6">
                  Apply Now
                </Button>
              </div>
            </div>
          </div>
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
