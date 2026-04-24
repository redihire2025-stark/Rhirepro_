import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, Routes, Route, Link, useLocation } from "react-router";
import { supabase, Job, Application, Notification, Profile, WorkExperience, Education as EduType, RecruiterSubscription } from "../../lib/supabase";
import { buildJobDeadlineTimestamp, formatJobDeadline, getEffectiveJobStatus, getJobDeadlineDateValue, isJobExpired } from "../../lib/jobs";
import { PLANS, FREE_DAILY_POST_LIMIT, getPlanById, validatePromo, applyPromo } from "../../lib/plans";
import logoImage from "../../logo/logo.png";
import { useAuth } from "../../lib/auth-context";
import {
  Bell, LogOut, Plus, Edit, Pause, Trash2, User, Upload, Building2,
  Search, Filter, Download, Mail, Phone, MapPin, Calendar, Clock,
  Briefcase, GraduationCap, Star, ChevronDown, ChevronRight, Eye,
  BarChart2, TrendingUp, Users, FileText, CheckCircle, XCircle,
  MessageSquare, Video, Award, BookOpen, Globe, Linkedin, Share2,
  ArrowRight, Target, Zap, RefreshCw, MoreVertical, ThumbsUp, ThumbsDown, ExternalLink, Loader2,
  CreditCard, Tag, ShieldCheck, Crown,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "../components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import FeedbackPopup from "../components/FeedbackPopup";

// ─── Types ──────────────────────────────────────────────────────────────────

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
  status: "New" | "Reviewed" | "Shortlisted" | "Interview Scheduled" | "Offered" | "Rejected";
  matchScore: number;
  resumeScore: number;
  about?: string;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const candidatesData: Candidate[] = [
  {
    id: 1,
    name: "Arjun Mehta",
    initials: "AM",
    headline: "Senior Data Analyst | Python | SQL | Power BI",
    totalExp: "5 years 3 months",
    currentCompany: "Infosys Ltd.",
    currentTitle: "Data Analyst",
    location: "Bengaluru, Karnataka",
    email: "arjun.mehta@email.com",
    phone: "+91 98765 43210",
    noticePeriod: "30 days",
    currentSalary: "12 LPA",
    expectedSalary: "18 LPA",
    skills: ["Python", "SQL", "Power BI", "Tableau", "Machine Learning", "Pandas", "NumPy"],
    appliedFor: "Senior Data Analyst",
    appliedDate: "2 days ago",
    status: "New",
    matchScore: 92,
    resumeScore: 88,
    experience: [
      {
        company: "Infosys Ltd.",
        title: "Data Analyst",
        from: "Jan 2022",
        to: "Present",
        current: true,
        location: "Bengaluru",
        description: "Led end-to-end data pipeline development, reduced reporting time by 40%. Managed dashboards for 3 business units using Power BI and Tableau."
      },
      {
        company: "Wipro Technologies",
        title: "Junior Data Analyst",
        from: "Jun 2020",
        to: "Dec 2021",
        current: false,
        location: "Hyderabad",
        description: "Worked on ETL processes, SQL optimisation and built automated reporting systems. Collaborated with cross-functional teams."
      },
      {
        company: "StartupXYZ",
        title: "Data Science Intern",
        from: "Jan 2020",
        to: "May 2020",
        current: false,
        location: "Pune",
        description: "Developed predictive models using Python. Performed EDA on large datasets."
      }
    ],
    education: [
      {
        institution: "IIT Bombay",
        degree: "B.Tech",
        field: "Computer Science & Engineering",
        from: "2016",
        to: "2020",
        score: "8.6 CGPA"
      }
    ]
  },
  {
    id: 2,
    name: "Priya Sharma",
    initials: "PS",
    headline: "ML Engineer | Deep Learning | TensorFlow | NLP",
    totalExp: "6 years 1 month",
    currentCompany: "Google India Pvt. Ltd.",
    currentTitle: "Machine Learning Engineer",
    location: "Hyderabad, Telangana",
    email: "priya.sharma@email.com",
    phone: "+91 87654 32109",
    noticePeriod: "60 days",
    currentSalary: "28 LPA",
    expectedSalary: "38 LPA",
    skills: ["Python", "TensorFlow", "PyTorch", "NLP", "Deep Learning", "Kubernetes", "MLOps"],
    appliedFor: "Senior Data Analyst",
    appliedDate: "1 week ago",
    status: "Reviewed",
    matchScore: 87,
    resumeScore: 94,
    experience: [
      {
        company: "Google India Pvt. Ltd.",
        title: "Machine Learning Engineer",
        from: "Mar 2021",
        to: "Present",
        current: true,
        location: "Hyderabad",
        description: "Designed and deployed large-scale NLP models serving 10M+ users. Improved model accuracy by 15% using advanced fine-tuning techniques."
      },
      {
        company: "Microsoft IDC",
        title: "Software Engineer II",
        from: "Jul 2019",
        to: "Feb 2021",
        current: false,
        location: "Hyderabad",
        description: "Built ML pipelines for Azure Cognitive Services. Developed APIs serving enterprise clients."
      },
      {
        company: "Amazon India",
        title: "SDE Intern",
        from: "May 2018",
        to: "Jul 2018",
        current: false,
        location: "Bengaluru",
        description: "Worked on recommendation engine improvements for Amazon.in."
      }
    ],
    education: [
      {
        institution: "IIT Delhi",
        degree: "M.Tech",
        field: "Artificial Intelligence",
        from: "2018",
        to: "2019",
        score: "9.1 CGPA"
      },
      {
        institution: "NIT Warangal",
        degree: "B.Tech",
        field: "Electronics & Communication",
        from: "2014",
        to: "2018",
        score: "8.9 CGPA"
      }
    ]
  },
  {
    id: 3,
    name: "Rohan Gupta",
    initials: "RG",
    headline: "Marketing Manager | Growth Hacking | SEO | Performance Marketing",
    totalExp: "4 years 8 months",
    currentCompany: "Zomato",
    currentTitle: "Marketing Manager",
    location: "New Delhi, NCR",
    email: "rohan.gupta@email.com",
    phone: "+91 76543 21098",
    noticePeriod: "45 days",
    currentSalary: "15 LPA",
    expectedSalary: "22 LPA",
    skills: ["SEO", "Google Ads", "Meta Ads", "Content Strategy", "Analytics", "CRM", "A/B Testing"],
    appliedFor: "Marketing Manager",
    appliedDate: "3 days ago",
    status: "Shortlisted",
    matchScore: 95,
    resumeScore: 91,
    experience: [
      {
        company: "Zomato",
        title: "Marketing Manager",
        from: "Apr 2022",
        to: "Present",
        current: true,
        location: "Gurugram",
        description: "Managed ₹2Cr monthly marketing budget. Drove 35% increase in app installs through performance campaigns. Led a team of 8 marketing specialists."
      },
      {
        company: "Swiggy",
        title: "Digital Marketing Executive",
        from: "Sep 2020",
        to: "Mar 2022",
        current: false,
        location: "Bengaluru",
        description: "Ran multi-channel campaigns across Google, Meta, and YouTube. Achieved 40% reduction in CPA."
      },
      {
        company: "MakeMyTrip",
        title: "Marketing Intern",
        from: "Jan 2020",
        to: "Jun 2020",
        current: false,
        location: "New Delhi",
        description: "Assisted in SEO audits and content calendar management."
      }
    ],
    education: [
      {
        institution: "IIM Lucknow",
        degree: "MBA",
        field: "Marketing & Strategy",
        from: "2018",
        to: "2020",
        score: "3.8/4.0 GPA"
      },
      {
        institution: "Delhi University",
        degree: "B.Com (Hons.)",
        field: "Commerce",
        from: "2015",
        to: "2018",
        score: "87%"
      }
    ]
  },
  {
    id: 4,
    name: "Sneha Verma",
    initials: "SV",
    headline: "UI/UX Designer | Figma | Design Systems | User Research",
    totalExp: "3 years 5 months",
    currentCompany: "Flipkart",
    currentTitle: "Product Designer",
    location: "Bengaluru, Karnataka",
    email: "sneha.verma@email.com",
    phone: "+91 65432 10987",
    noticePeriod: "30 days",
    currentSalary: "14 LPA",
    expectedSalary: "20 LPA",
    skills: ["Figma", "Adobe XD", "Prototyping", "User Research", "Design Systems", "Wireframing", "Usability Testing"],
    appliedFor: "Product Designer",
    appliedDate: "5 days ago",
    status: "Interview Scheduled",
    matchScore: 89,
    resumeScore: 86,
    experience: [
      {
        company: "Flipkart",
        title: "Product Designer",
        from: "Nov 2022",
        to: "Present",
        current: true,
        location: "Bengaluru",
        description: "Redesigned checkout flow increasing conversion by 22%. Led design system overhaul covering 200+ components. Collaborated with PM and engineering teams."
      },
      {
        company: "PayTM",
        title: "UI/UX Designer",
        from: "Oct 2021",
        to: "Oct 2022",
        current: false,
        location: "Noida",
        description: "Created high-fidelity prototypes for PayTM Money app. Conducted 50+ user interviews and usability sessions."
      }
    ],
    education: [
      {
        institution: "NID Ahmedabad",
        degree: "M.Des",
        field: "Interaction Design",
        from: "2019",
        to: "2021",
        score: "First Class"
      },
      {
        institution: "Pune University",
        degree: "B.E.",
        field: "Information Technology",
        from: "2015",
        to: "2019",
        score: "8.2 CGPA"
      }
    ]
  }
];

const jobsData = [
  { id: 1, title: "Senior Data Analyst", applicants: 45, views: 1240, status: "Active", posted: "2 days ago", location: "Bengaluru", type: "Full-time", salary: "15-25 LPA", pipeline: { new: 12, reviewed: 18, shortlisted: 9, interview: 4, offered: 2 } },
  { id: 2, title: "Marketing Manager", applicants: 32, views: 867, status: "Active", posted: "1 week ago", location: "New Delhi", type: "Full-time", salary: "18-28 LPA", pipeline: { new: 8, reviewed: 14, shortlisted: 7, interview: 2, offered: 1 } },
  { id: 3, title: "Product Designer", applicants: 28, views: 654, status: "Paused", posted: "2 weeks ago", location: "Bengaluru", type: "Full-time", salary: "12-20 LPA", pipeline: { new: 4, reviewed: 12, shortlisted: 8, interview: 3, offered: 1 } },
  { id: 4, title: "Software Engineer", applicants: 67, views: 2100, status: "Active", posted: "3 days ago", location: "Hyderabad", type: "Full-time", salary: "20-40 LPA", pipeline: { new: 22, reviewed: 28, shortlisted: 11, interview: 5, offered: 1 } },
];

// ─── Status Color Helper ──────────────────────────────────────────────────────

function statusColor(status: string) {
  switch (status) {
    case "New": return "bg-gray-100 text-gray-700";
    case "Reviewed": return "bg-blue-100 text-blue-700";
    case "Shortlisted": return "bg-green-100 text-green-700";
    case "Interview Scheduled": return "bg-purple-100 text-purple-700";
    case "Offered": return "bg-yellow-100 text-yellow-700";
    case "Rejected": return "bg-red-100 text-red-700";
    default: return "bg-gray-100 text-gray-700";
  }
}

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
                    {["New", "Reviewed", "Shortlisted", "Interview Scheduled", "Offered", "Rejected"].map(s => (
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
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", recruiterProfile.id)
      .eq("user_type", "recruiter")
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter((n: Notification) => !n.is_read).length);
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
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", recruiterProfile.id);
    fetchNotifications();
  };

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
    if (path.includes("analytics")) return "analytics";
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
                          <div key={n.id} className={`flex gap-3 p-2 rounded-lg cursor-pointer ${!n.is_read ? "bg-red-50" : "hover:bg-[#F6F6F6]"}`}>
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
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <div className="w-8 h-8 bg-[#FF2B2B] rounded-full flex items-center justify-center text-white text-xs font-bold">{companyInitials}</div>
                  </Button>
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
        <Route path="analytics" element={<AnalyticsPage />} />
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
  const [dbApplications, setDbApplications] = useState<Application[]>([]);

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
      const { data: jobs } = await supabase.from("jobs").select("*").eq("recruiter_id", recruiterProfile.id).order("created_at", { ascending: false });
      if (jobs) setDbJobs(jobs.filter(job => !isJobExpired(job)));
      const { data: apps } = await supabase.from("applications").select("*, profile:profiles(first_name,last_name,current_title,current_company), job:jobs(title)").eq("recruiter_id", recruiterProfile.id).order("applied_at", { ascending: false }).limit(5);
      if (apps) setDbApplications(apps as Application[]);
    };
    load();
  }, [recruiterProfile?.id]);

  const activeJobs = dbJobs.filter(j => j.status === "Active").length;
  const totalApplicants = dbApplications.length;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const stats = [
    { label: "Active Jobs", value: String(activeJobs || dbJobs.length || "—"), change: "Live postings", icon: Briefcase, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Total Applicants", value: String(totalApplicants || "—"), change: "Across all jobs", icon: Users, color: "text-green-600", bg: "bg-green-50" },
    { label: "Interviews Scheduled", value: "8", change: "Next: Today 3PM", icon: Calendar, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Positions Filled", value: "5", change: "This month", icon: CheckCircle, color: "text-[#FF2B2B]", bg: "bg-red-50" },
  ];

  const recentApplicants = candidatesData.slice(0, 3);
  const upcomingInterviews = [
    { name: "Sneha Verma", role: "Product Designer", time: "Today, 3:00 PM", type: "Video Call" },
    { name: "Arjun Mehta", role: "Senior Data Analyst", time: "Tomorrow, 11:00 AM", type: "In-Person" },
    { name: "Rohan Gupta", role: "Marketing Manager", time: "Mar 12, 2:00 PM", type: "Video Call" },
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
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm">
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
            {jobsData.slice(0, 3).map(job => {
              const total = Object.values(job.pipeline).reduce((a, b) => a + b, 0);
              return (
                <div key={job.id} className="border border-gray-100 rounded-xl p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-[#3A1F1F]">{job.title}</span>
                    <Badge className={job.status === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"} >{job.status}</Badge>
                  </div>
                  <div className="flex gap-1 h-2 rounded-full overflow-hidden">
                    <div className="bg-gray-300" style={{ width: `${(job.pipeline.new / total) * 100}%` }} title={`New: ${job.pipeline.new}`} />
                    <div className="bg-blue-400" style={{ width: `${(job.pipeline.reviewed / total) * 100}%` }} title={`Reviewed: ${job.pipeline.reviewed}`} />
                    <div className="bg-green-400" style={{ width: `${(job.pipeline.shortlisted / total) * 100}%` }} title={`Shortlisted: ${job.pipeline.shortlisted}`} />
                    <div className="bg-purple-400" style={{ width: `${(job.pipeline.interview / total) * 100}%` }} title={`Interview: ${job.pipeline.interview}`} />
                    <div className="bg-yellow-400" style={{ width: `${(job.pipeline.offered / total) * 100}%` }} title={`Offered: ${job.pipeline.offered}`} />
                  </div>
                  <div className="flex gap-3 mt-1.5 text-xs text-[#8A8A8A]">
                    <span>New: {job.pipeline.new}</span>
                    <span>Reviewed: {job.pipeline.reviewed}</span>
                    <span>Shortlisted: {job.pipeline.shortlisted}</span>
                    <span>Interview: {job.pipeline.interview}</span>
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
            {upcomingInterviews.map((iv, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-[#F6F6F6] rounded-xl">
                <div className="w-10 h-10 bg-[#FF2B2B] rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {iv.name.split(" ").map(n => n[0]).join("")}
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
            ))}
          </div>
        </div>
      </div>

      {/* Recent Applicants */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-[#3A1F1F]">Recent Applicants</h2>
          <Link to="/recruiter/dashboard/applicants"><Button variant="ghost" size="sm" className="text-[#FF2B2B] text-xs">View All</Button></Link>
        </div>
        <div className="space-y-3">
          {recentApplicants.map(applicant => (
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
          ))}
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
  const [formData, setFormData] = useState({
    jobTitle: "", jobDescription: "", rolesResponsibilities: "", requirements: "",
    location: "", workMode: "",
    salaryMin: "", salaryMax: "", salaryType: "LPA",
    experienceMin: "", experienceMax: "",
    skills: "", employmentType: "", industry: "",
    openings: "1", education: "", perks: [] as string[], department: "",
    interviewMode: "", applicationDeadline: "", applicationDeadlineTime: "",
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

  const perkOptions = ["Health Insurance", "Work from Home", "Flexible Hours", "5 Days a Week", "Free Meals", "Stock Options", "Annual Bonus", "Paid Sick Leave"];
  const togglePerk = (p: string) => {
    setFormData(prev => ({
      ...prev,
      perks: prev.perks.includes(p) ? prev.perks.filter(x => x !== p) : [...prev.perks, p]
    }));
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
    setPosting(true);
    try {
      const deadline = buildJobDeadlineTimestamp(formData.applicationDeadline, formData.applicationDeadlineTime);
      const deadlineTime = deadline ? (formData.applicationDeadlineTime || null) : null;
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
        salary_min: formData.salaryMin ? Number(formData.salaryMin) : null,
        salary_max: formData.salaryMax ? Number(formData.salaryMax) : null,
        salary_type: formData.salaryType,
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
        deadline_time: deadlineTime,
        status: "Active",
      });
      if (error) throw error;
      setPostSuccess(true);
      setShowPreview(false);
      setTimeout(() => { setPostSuccess(false); navigate("/recruiter/dashboard/manage-jobs"); }, 2000);
      setFormData({ jobTitle:"",jobDescription:"",rolesResponsibilities:"",requirements:"",location:"",workMode:"",salaryMin:"",salaryMax:"",salaryType:"LPA",experienceMin:"",experienceMax:"",skills:"",employmentType:"",industry:"",openings:"1",education:"",perks:[],department:"",interviewMode:"",applicationDeadline:"",applicationDeadlineTime:"" });
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
                  {formData.salaryMin && <span className="flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" />{formData.salaryMin}–{formData.salaryMax} {formData.salaryType}</span>}
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
                <p className="text-sm text-[#5A5A5A] leading-relaxed whitespace-pre-line">{formData.jobDescription}</p>
              </div>
            )}
            {formData.rolesResponsibilities && (
              <div>
                <h2 className="text-base font-semibold text-[#3A1F1F] mb-2">Roles & Responsibilities</h2>
                <div className="text-sm text-[#5A5A5A] leading-relaxed whitespace-pre-line">{formData.rolesResponsibilities}</div>
              </div>
            )}
            {formData.requirements && (
              <div>
                <h2 className="text-base font-semibold text-[#3A1F1F] mb-2">Requirements</h2>
                <div className="text-sm text-[#5A5A5A] leading-relaxed whitespace-pre-line">{formData.requirements}</div>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-gray-100">
              {formData.education && <div><p className="text-xs text-[#8A8A8A]">Min. Education</p><p className="text-sm font-medium text-[#3A1F1F]">{formData.education}</p></div>}
              {formData.department && <div><p className="text-xs text-[#8A8A8A]">Department</p><p className="text-sm font-medium text-[#3A1F1F]">{formData.department}</p></div>}
              {formData.industry && <div><p className="text-xs text-[#8A8A8A]">Industry</p><p className="text-sm font-medium text-[#3A1F1F]">{formData.industry}</p></div>}
              {formData.interviewMode && <div><p className="text-xs text-[#8A8A8A]">Interview Mode</p><p className="text-sm font-medium text-[#3A1F1F]">{formData.interviewMode}</p></div>}
              {formData.applicationDeadline && (
                <div>
                  <p className="text-xs text-[#8A8A8A]">Apply By</p>
                  <p className="text-sm font-medium text-[#3A1F1F]">
                    {formatJobDeadline({
                      deadline: buildJobDeadlineTimestamp(formData.applicationDeadline, formData.applicationDeadlineTime),
                      deadline_time: formData.applicationDeadlineTime || null,
                    })}
                  </p>
                </div>
              )}
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
        <form onSubmit={e => { e.preventDefault(); setShowPreview(true); }} className="space-y-6">
          {/* Basic Info */}
          <div className="border-b pb-6">
            <h2 className="text-lg font-semibold text-[#3A1F1F] mb-4">Basic Information</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Job Title *</label>
                <Input value={formData.jobTitle} onChange={e => setFormData({ ...formData, jobTitle: e.target.value })} className="bg-[#F6F6F6] border-gray-200 rounded-xl" placeholder="e.g. Senior Data Analyst" required />
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Department</label>
                <Input value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} className="bg-[#F6F6F6] border-gray-200 rounded-xl" placeholder="e.g. Engineering, Marketing" />
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
                <Input value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} className="bg-[#F6F6F6] border-gray-200 rounded-xl" placeholder="e.g. Bengaluru, Karnataka" required />
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
                <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Salary Range *</label>
                <div className="flex gap-2 items-center">
                  <Input type="number" value={formData.salaryMin} onChange={e => setFormData({ ...formData, salaryMin: e.target.value })} className="bg-[#F6F6F6] border-gray-200 rounded-xl" placeholder="Min" />
                  <span className="text-[#8A8A8A]">–</span>
                  <Input type="number" value={formData.salaryMax} onChange={e => setFormData({ ...formData, salaryMax: e.target.value })} className="bg-[#F6F6F6] border-gray-200 rounded-xl" placeholder="Max" />
                  <Select value={formData.salaryType} onValueChange={v => setFormData({ ...formData, salaryType: v })}>
                    <SelectTrigger className="w-24 bg-[#F6F6F6] border-gray-200 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="LPA">LPA</SelectItem><SelectItem value="Monthly">Monthly</SelectItem></SelectContent>
                  </Select>
                </div>
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
            <h2 className="text-lg font-semibold text-[#3A1F1F] mb-4">Key Skills</h2>
            <div>
              <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Key Skills *</label>
              <Input value={formData.skills} onChange={e => setFormData({ ...formData, skills: e.target.value })} className="bg-[#F6F6F6] border-gray-200 rounded-xl" placeholder="Python, SQL, Tableau (comma separated)" required />
              <p className="text-xs text-[#8A8A8A] mt-1">Candidates with these skills will be highlighted</p>
            </div>
          </div>

          {/* Job Description */}
          <div className="border-b pb-6">
            <h2 className="text-lg font-semibold text-[#3A1F1F] mb-4">Job Description</h2>
            <div className="space-y-4">
              <div>
                <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">About the Role *</label>
                <Textarea value={formData.jobDescription} onChange={e => setFormData({ ...formData, jobDescription: e.target.value })} className="bg-[#F6F6F6] border-gray-200 rounded-xl" rows={4} placeholder="Brief overview of the role and what the candidate will be working on..." required />
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Roles & Responsibilities</label>
                <Textarea value={formData.rolesResponsibilities} onChange={e => setFormData({ ...formData, rolesResponsibilities: e.target.value })} className="bg-[#F6F6F6] border-gray-200 rounded-xl" rows={6} placeholder={"• Lead end-to-end development of features\n• Collaborate with cross-functional teams\n• Review code and mentor junior developers\n• Drive technical decisions and architecture"} />
                <p className="text-xs text-[#8A8A8A] mt-1">Use bullet points (•) or numbered lists for clarity</p>
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Requirements / Qualifications</label>
                <Textarea value={formData.requirements} onChange={e => setFormData({ ...formData, requirements: e.target.value })} className="bg-[#F6F6F6] border-gray-200 rounded-xl" rows={5} placeholder={"• 3+ years of experience with React and Node.js\n• Strong understanding of REST APIs\n• Experience with cloud platforms (AWS/GCP)\n• Excellent communication skills"} />
                <p className="text-xs text-[#8A8A8A] mt-1">List must-have and nice-to-have qualifications</p>
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

          {/* Application Deadline */}
          <div>
            <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Application Deadline</label>
            <div className="flex flex-wrap gap-3">
              <Input type="date" value={formData.applicationDeadline} onChange={e => setFormData({ ...formData, applicationDeadline: e.target.value })} className="bg-[#F6F6F6] border-gray-200 rounded-xl w-auto" />
              <Input type="time" value={formData.applicationDeadlineTime} onChange={e => setFormData({ ...formData, applicationDeadlineTime: e.target.value })} className="bg-[#F6F6F6] border-gray-200 rounded-xl w-auto" />
            </div>
            <p className="text-xs text-[#8A8A8A] mt-1">Leave time empty to keep the current date-only expiry behavior.</p>
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
  const [editForm, setEditForm] = useState({ title: "", location: "", salaryMin: "", salaryMax: "", salaryType: "LPA", employmentType: "", workMode: "", openings: "1", skills: "", deadlineDate: "", deadlineTime: "" });
  const [saving, setSaving] = useState(false);
  const isExpired = useCallback((job: Job) => isJobExpired(job), []);

  const openEdit = (job: Job) => {
    setEditingJob(job);
    setEditForm({
      title: job.title,
      location: job.location || "",
      salaryMin: job.salary_min ? String(job.salary_min) : "",
      salaryMax: job.salary_max ? String(job.salary_max) : "",
      salaryType: job.salary_type || "LPA",
      employmentType: job.employment_type || "",
      workMode: job.work_mode || "",
      openings: String(job.openings),
      skills: (job.skills || []).join(", "),
      deadlineDate: getJobDeadlineDateValue(job),
      deadlineTime: job.deadline_time || "",
    });
  };

  const saveEdit = async () => {
    if (!editingJob) return;
    setSaving(true);
    const skillsArr = editForm.skills.split(",").map(s => s.trim()).filter(Boolean);
    const deadline = buildJobDeadlineTimestamp(editForm.deadlineDate, editForm.deadlineTime);
    const deadlineTime = deadline ? (editForm.deadlineTime || null) : null;
    await supabase.from("jobs").update({
      title: editForm.title,
      location: editForm.location,
      salary_min: editForm.salaryMin ? Number(editForm.salaryMin) : null,
      salary_max: editForm.salaryMax ? Number(editForm.salaryMax) : null,
      salary_type: editForm.salaryType,
      employment_type: editForm.employmentType,
      work_mode: editForm.workMode,
      openings: Number(editForm.openings) || 1,
      skills: skillsArr,
      deadline,
      deadline_time: deadlineTime,
    }).eq("id", editingJob.id);
    setJobs(prev => prev.map(j => j.id === editingJob.id ? {
      ...j, title: editForm.title, location: editForm.location,
      salary_min: editForm.salaryMin ? Number(editForm.salaryMin) : null,
      salary_max: editForm.salaryMax ? Number(editForm.salaryMax) : null,
      salary_type: editForm.salaryType, employment_type: editForm.employmentType,
      work_mode: editForm.workMode, openings: Number(editForm.openings) || 1,
      skills: skillsArr,
      deadline,
      deadline_time: deadlineTime,
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
      const repairedJobs = withCounts.map(job => ({
        ...job,
        status: getEffectiveJobStatus(job),
      }));
      const staleExpiredIds = withCounts
        .filter(job => job.status === "Expired" && getEffectiveJobStatus(job) === "Active")
        .map(job => job.id);

      if (staleExpiredIds.length > 0) {
        await supabase
          .from("jobs")
          .update({ status: "Active" })
          .in("id", staleExpiredIds);
      }

      setJobs(repairedJobs);
    }
    setLoading(false);
  }, [recruiterProfile?.id]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const visibleJobs = jobs.filter(j => getEffectiveJobStatus(j) !== "Expired" && !isExpired(j));
  const filtered = filter === "All" ? visibleJobs : visibleJobs.filter(j => getEffectiveJobStatus(j) === filter);

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "Active" ? "Paused" : "Active";
    await supabase.from("jobs").update({ status: newStatus }).eq("id", id);
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status: newStatus as "Active" | "Paused" | "Closed" | "Expired" } : j));
  };

  const deleteJob = async (id: string) => {
    if (!confirm("Delete this job? This will also remove all applications.")) return;
    await supabase.from("jobs").delete().eq("id", id);
    setJobs(prev => prev.filter(j => j.id !== id));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-[#3A1F1F]">Manage Jobs</h1>
        <div className="flex gap-3">
          <div className="flex gap-1 bg-white rounded-full p-1 shadow-sm">
            {["All", "Active", "Paused"].map(f => (
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
                  <h3 className="text-xl font-semibold text-[#3A1F1F]">{job.title}</h3>
                  <Badge className={badgeClass}>{effectiveStatus}</Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-[#8A8A8A] flex-wrap">
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location}</span>
                  <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{job.employment_type}</span>
                  {job.salary_min && <span className="flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" />{job.salary_min}–{job.salary_max} {job.salary_type}</span>}
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />Posted {new Date(job.created_at).toLocaleDateString()}</span>
                  {job.deadline && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Apply by {formatJobDeadline(job)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" className="border-gray-200 rounded-full" onClick={() => toggleStatus(job.id, effectiveStatus)} title={effectiveStatus === "Active" ? "Pause" : "Activate"}>
                  {effectiveStatus === "Active" ? <Pause className="h-4 w-4 text-[#8A8A8A]" /> : <RefreshCw className="h-4 w-4 text-green-500" />}
                </Button>
                <Button variant="outline" size="icon" className="border-gray-200 rounded-full" onClick={() => openEdit(job)} title="Edit Job"><Edit className="h-4 w-4 text-[#3A1F1F]" /></Button>
                <Button variant="outline" size="icon" className="border-gray-200 rounded-full" onClick={() => deleteJob(job.id)}><Trash2 className="h-4 w-4 text-[#FF2B2B]" /></Button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
              <div className="text-center"><div className="text-xl font-bold text-[#3A1F1F]">{(job as any).applicant_count ?? 0}</div><div className="text-xs text-[#8A8A8A]">Applicants</div></div>
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
              <Input value={editForm.location} onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))} className="bg-[#F6F6F6] border-gray-200 rounded-xl" />
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
              <label className="block text-sm font-medium text-[#3A1F1F] mb-1">Salary Range</label>
              <div className="flex gap-2 items-center">
                <Input type="number" value={editForm.salaryMin} onChange={e => setEditForm(f => ({ ...f, salaryMin: e.target.value }))} className="bg-[#F6F6F6] border-gray-200 rounded-xl" placeholder="Min" />
                <span className="text-[#8A8A8A]">–</span>
                <Input type="number" value={editForm.salaryMax} onChange={e => setEditForm(f => ({ ...f, salaryMax: e.target.value }))} className="bg-[#F6F6F6] border-gray-200 rounded-xl" placeholder="Max" />
                <Select value={editForm.salaryType} onValueChange={v => setEditForm(f => ({ ...f, salaryType: v }))}>
                  <SelectTrigger className="w-24 bg-[#F6F6F6] border-gray-200 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="LPA">LPA</SelectItem><SelectItem value="Monthly">Monthly</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3A1F1F] mb-1">Number of Openings</label>
              <Input type="number" min="1" value={editForm.openings} onChange={e => setEditForm(f => ({ ...f, openings: e.target.value }))} className="bg-[#F6F6F6] border-gray-200 rounded-xl w-24" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3A1F1F] mb-1">Key Skills (comma separated)</label>
              <Input value={editForm.skills} onChange={e => setEditForm(f => ({ ...f, skills: e.target.value }))} className="bg-[#F6F6F6] border-gray-200 rounded-xl" placeholder="Python, SQL, React" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3A1F1F] mb-1">Application Deadline</label>
              <div className="flex flex-wrap gap-3">
                <Input type="date" value={editForm.deadlineDate} onChange={e => setEditForm(f => ({ ...f, deadlineDate: e.target.value }))} className="bg-[#F6F6F6] border-gray-200 rounded-xl w-auto" />
                <Input type="time" value={editForm.deadlineTime} onChange={e => setEditForm(f => ({ ...f, deadlineTime: e.target.value }))} className="bg-[#F6F6F6] border-gray-200 rounded-xl w-auto" />
              </div>
              <p className="text-xs text-[#8A8A8A] mt-1">Leave time empty to keep date-only expiry.</p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button className="flex-1 bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full" onClick={saveEdit} disabled={saving || !editForm.title}>
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

function SearchCandidatesPage() {
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

  // ── Skill tag management ──────────────────────────────────
  const addSkillTag = (tag: string) => {
    const t = tag.trim();
    if (t && !skillTags.includes(t)) setSkillTags(prev => [...prev, t]);
    setSkillInput("");
  };

  // ── Main search ───────────────────────────────────────────
  const handleSearch = async () => {
    setSearching(true);
    setSearched(true);
    try {
      let q = supabase
        .from("profiles")
        .select("*, work_experience(*), education(*)");

      // Server-side: keyword search across text columns
      if (keywords.trim()) {
        const kw = keywords.trim();
        q = q.or(
          `first_name.ilike.%${kw}%,last_name.ilike.%${kw}%,` +
          `headline.ilike.%${kw}%,current_title.ilike.%${kw}%,` +
          `current_company.ilike.%${kw}%,about.ilike.%${kw}%`
        );
      }
      // Server-side: location
      if (location.trim()) q = q.ilike("location", `%${location.trim()}%`);
      // Server-side: current company override
      if (currentCompany.trim()) q = q.ilike("current_company", `%${currentCompany.trim()}%`);
      const { data } = await q.limit(200);
      let raw = (data || []) as DBCandidate[];

      // Skill keyword also searches the skills array column
      if (keywords.trim()) {
        const { data: skillMatches } = await supabase
          .from("profiles")
          .select("*, work_experience(*), education(*)")
          .contains("skills", [keywords.trim()]);
        if (skillMatches) {
          const ids = new Set(raw.map(r => r.id));
          (skillMatches as DBCandidate[]).forEach(sm => { if (!ids.has(sm.id)) raw.push(sm); });
        }
      }

      // ── Client-side filters ──────────────────────────────────────────────────
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
        const cSkills = (c.skills || []).map(s => s.toLowerCase());
        return skillTags.every(tag => cSkills.some(s => s.includes(tag.toLowerCase())));
      });

      // Sort
      if (sortBy === "exp_desc") raw.sort((a, b) => parseExp(b) - parseExp(a));
      else if (sortBy === "exp_asc") raw.sort((a, b) => parseExp(a) - parseExp(b));
      else if (sortBy === "salary_asc") raw.sort((a, b) => parseSal(a.expected_salary) - parseSal(b.expected_salary));
      else if (sortBy === "recent") raw.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setResults(raw);
    } finally {
      setSearching(false);
    }
  };

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
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A8A8A]" />
            <Input
              value={keywords}
              onChange={e => setKeywords(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleSearch(); }}
              className="pl-9 bg-[#F6F6F6] border-gray-200 rounded-xl"
              placeholder="Skills, designation, company name..."
            />
          </div>
          <div className="relative min-w-[160px]">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A8A8A]" />
            <Input
              value={location}
              onChange={e => setLocation(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleSearch(); }}
              className="pl-9 bg-[#F6F6F6] border-gray-200 rounded-xl"
              placeholder="Location"
            />
          </div>
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
            <Input value={currentCompany} onChange={e => setCurrentCompany(e.target.value)} className="bg-[#F6F6F6] border-gray-200 rounded-lg text-xs h-8" placeholder="e.g. Infosys" />
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
                  const name = `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Unknown";
                  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
                  const skills = c.skills || [];
                  const workExp = c.work_experience || [];
                  const matchScore = Math.floor(72 + (c.id.charCodeAt(0) % 23));

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
                              <div className="bg-green-50 border border-green-100 rounded-xl px-3 py-1 text-center flex-shrink-0">
                                <div className="text-base font-bold text-green-600">{matchScore}%</div>
                                <div className="text-xs text-[#8A8A8A]">Match</div>
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
                          <Button size="sm" onClick={() => setProfileModal(c)} className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full text-xs h-7">
                            <Eye className="h-3.5 w-3.5 mr-1" /> View Full Profile
                          </Button>
                          <Button size="sm" variant={shortlisted.has(c.id) ? "default" : "outline"} className={shortlisted.has(c.id) ? "bg-green-600 hover:bg-green-700 text-white rounded-full text-xs h-7" : "border-green-500 text-green-600 hover:bg-green-50 rounded-full text-xs h-7"} onClick={() => toggleShortlist(c.id)}>
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
        const name = `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Unknown";
        const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
        const workExp = c.work_experience || [];
        const eduList = c.education || [];
        const skills = c.skills || [];
        const matchScore = Math.floor(72 + (c.id.charCodeAt(0) % 23));
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
                  <div className="bg-white/20 border border-white/30 rounded-xl px-3 py-1.5 text-center flex-shrink-0">
                    <div className="text-lg font-bold text-white">{matchScore}%</div>
                    <div className="text-xs text-white/70">Match</div>
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
                  <Button size="sm" variant={shortlisted.has(c.id) ? "default" : "outline"} className={shortlisted.has(c.id) ? "bg-green-600 hover:bg-green-700 text-white rounded-full text-xs" : "border-green-500 text-green-600 hover:bg-green-50 rounded-full text-xs"} onClick={() => toggleShortlist(c.id)}><ThumbsUp className="h-3.5 w-3.5 mr-1" /> {shortlisted.has(c.id) ? "Shortlisted ✓" : "Shortlist"}</Button>
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

function ApplicantsPage() {
  const { recruiterProfile } = useAuth();
  const [applicants, setApplicants] = useState<AppWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");
  const [jobFilter, setJobFilter] = useState("All");
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
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "applications", filter: `recruiter_id=eq.${recruiterProfile.id}` }, () => fetchApplicants())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [recruiterProfile?.id, fetchApplicants]);

  const statuses = ["All", "New", "Reviewed", "Shortlisted", "Interview Scheduled", "Offered", "Rejected"];
  const jobTitles = ["All", ...Array.from(new Set(applicants.map(a => a.job?.title).filter(Boolean)))];

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
    .filter(a => statusFilter === "All" || a.status === statusFilter)
    .filter(a => jobFilter === "All" || a.job?.title === jobFilter)
    .filter(a => {
      if (!searchTerm) return true;
      const p = a.profile;
      const name = `${p?.first_name || ""} ${p?.last_name || ""}`.toLowerCase();
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
      const skills = (a.profile?.skills || []).map((s: string) => s.toLowerCase());
      return skills.some(s => s.includes(skillFilter.toLowerCase()));
    });

  const updateStatus = async (id: string, newStatus: Application["status"]) => {
    await supabase.from("applications").update({ status: newStatus }).eq("id", id);
    setApplicants(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
  };

  const statusCounts = statuses.slice(1).reduce((acc, s) => ({
    ...acc,
    [s]: applicants.filter(a => a.status === s).length
  }), {} as Record<string, number>);

  const exportCSV = () => {
    const rows = [
      ["Name", "Email", "Phone", "Job", "Status", "Applied At", "Experience", "Skills"],
      ...filtered.map(a => {
        const p = a.profile;
        const name = `${p?.first_name || ""} ${p?.last_name || ""}`.trim();
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
              <Input value={locationFilter} onChange={e => setLocationFilter(e.target.value)} className="bg-[#F6F6F6] border-gray-200 rounded-xl text-sm h-9" placeholder="e.g. Bengaluru" />
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
            <div>
              <label className="block text-xs font-medium text-[#5A5A5A] mb-1.5">Skill</label>
              <Input value={skillFilter} onChange={e => setSkillFilter(e.target.value)} className="bg-[#F6F6F6] border-gray-200 rounded-xl text-sm h-9" placeholder="e.g. Python" />
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
        {filtered.map(applicant => {
          const p = applicant.profile;
          const name = p ? `${p.first_name || ""} ${p.last_name || ""}`.trim() : "Unknown";
          const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
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
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`text-xs ${statusColor(applicant.status)}`}>{applicant.status}</Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="border-gray-200 rounded-full text-xs h-7">
                        Move to <ChevronDown className="h-3 w-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {(["New", "Reviewed", "Shortlisted", "Interview Scheduled", "Offered", "Rejected"] as const).map(s => (
                        <DropdownMenuItem key={s} onClick={() => updateStatus(applicant.id, s)}>
                          <span className={`w-2 h-2 rounded-full mr-2 inline-block ${statusColor(s).split(" ")[0]}`} />
                          {s}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  <Button size="sm" variant="outline" className="border-blue-300 text-blue-600 hover:bg-blue-50 rounded-full text-xs h-7" onClick={() => setProfileModal(applicant)}>
                    <User className="h-3 w-3 mr-1" /> View Profile
                  </Button>
                  <Button size="sm" variant="outline" className="border-gray-200 rounded-full text-xs h-7" onClick={() => { if (applicant.profile?.email) window.location.href = `mailto:${applicant.profile.email}`; }}><Mail className="h-3.5 w-3.5 mr-1" /> Message</Button>
                  <Button size="sm" variant="outline" className="border-purple-400 text-purple-600 hover:bg-purple-50 rounded-full text-xs h-7" onClick={() => updateStatus(applicant.id, "Interview Scheduled")}><Video className="h-3.5 w-3.5 mr-1" /> Interview</Button>
                  <Button size="sm" variant="outline" className="border-green-500 text-green-600 hover:bg-green-50 rounded-full text-xs h-7" onClick={() => updateStatus(applicant.id, "Shortlisted")}><ThumbsUp className="h-3.5 w-3.5 mr-1" /> Shortlist</Button>
                  <Button size="sm" variant="outline" className="border-red-400 text-red-500 hover:bg-red-50 rounded-full text-xs h-7" onClick={() => updateStatus(applicant.id, "Rejected")}><ThumbsDown className="h-3.5 w-3.5 mr-1" /> Reject</Button>
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
                const s = e.start_year ? e.start_year * 12 + 1 : null;
                const en = e.end_year ? e.end_year * 12 + 6 : null;
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

      {/* ── Full Profile Modal (Naukri-style) ── */}
      {profileModal && (() => {
        const p = profileModal.profile;
        const name = p ? `${p.first_name || ""} ${p.last_name || ""}`.trim() : "Unknown";
        const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
        const workExp = p?.work_experience || [];
        const edu = p?.education || [];
        const skills = p?.skills || [];
        const matchScore = Math.floor(70 + (profileModal.id.charCodeAt(0) % 25));
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setProfileModal(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              {/* Header — fully inside banner */}
              <div className="bg-gradient-to-r from-[#3A1F1F] to-[#FF2B2B] rounded-t-2xl px-6 py-5 relative">
                <button onClick={() => setProfileModal(null)} className="absolute top-3 right-4 text-white/70 hover:text-white text-2xl leading-none font-bold">×</button>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl border-2 border-white/40 shadow overflow-hidden bg-white/20 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                    {p?.avatar_url
                      ? <img src={p.avatar_url} alt={name} className="w-full h-full object-cover" />
                      : initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-white truncate">{name}</h2>
                    <p className="text-sm text-white/80 truncate">{p?.headline || `${p?.current_title || ""}${p?.current_company ? ` · ${p.current_company}` : ""}`}</p>
                  </div>
                  <div className="bg-white/20 border border-white/30 rounded-xl px-3 py-1.5 text-center flex-shrink-0">
                    <div className="text-lg font-bold text-white">{matchScore}%</div>
                    <div className="text-xs text-white/70">Match</div>
                  </div>
                </div>
              </div>

              <div className="px-6 pb-6 pt-5">

                {/* Key Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 p-4 bg-[#F6F6F6] rounded-xl">
                  <div>
                    <p className="text-xs text-[#8A8A8A]">Experience</p>
                    <p className="text-sm font-semibold text-[#3A1F1F]">{p?.total_experience || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#8A8A8A]">Location</p>
                    <p className="text-sm font-semibold text-[#3A1F1F]">{p?.location || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#8A8A8A]">Current Salary</p>
                    <p className="text-sm font-semibold text-[#3A1F1F]">{p?.current_salary || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#8A8A8A]">Expected Salary</p>
                    <p className="text-sm font-semibold text-[#FF2B2B]">{p?.expected_salary || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#8A8A8A]">Notice Period</p>
                    <p className="text-sm font-semibold text-[#3A1F1F]">{p?.notice_period || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#8A8A8A]">Phone</p>
                    <p className="text-sm font-semibold text-[#3A1F1F]">{p?.phone || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#8A8A8A]">Email</p>
                    <p className="text-sm font-semibold text-[#3A1F1F] truncate">{p?.email || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#8A8A8A]">Applied For</p>
                    <p className="text-sm font-semibold text-[#3A1F1F] truncate">{profileModal.job?.title || "—"}</p>
                  </div>
                </div>

                {/* Status + Actions */}
                <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                  <Badge className={`${statusColor(profileModal.status)}`}>{profileModal.status}</Badge>
                  <div className="flex gap-2 flex-wrap">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="border-gray-200 rounded-full text-xs">
                          Change Status <ChevronDown className="h-3 w-3 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {(["New", "Reviewed", "Shortlisted", "Interview Scheduled", "Offered", "Rejected"] as const).map(s => (
                          <DropdownMenuItem key={s} onClick={() => { updateStatus(profileModal.id, s); setProfileModal(prev => prev ? { ...prev, status: s } : null); }}>
                            <span className={`w-2 h-2 rounded-full mr-2 inline-block ${statusColor(s).split(" ")[0]}`} />{s}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button size="sm" variant="outline" className="border-green-500 text-green-600 hover:bg-green-50 rounded-full text-xs" onClick={() => { updateStatus(profileModal.id, "Shortlisted"); setProfileModal(prev => prev ? { ...prev, status: "Shortlisted" } : null); }}><ThumbsUp className="h-3.5 w-3.5 mr-1" /> Shortlist</Button>
                    <Button size="sm" variant="outline" className="border-purple-400 text-purple-600 hover:bg-purple-50 rounded-full text-xs" onClick={() => { updateStatus(profileModal.id, "Interview Scheduled"); setProfileModal(prev => prev ? { ...prev, status: "Interview Scheduled" } : null); }}><Video className="h-3.5 w-3.5 mr-1" /> Interview</Button>
                    <Button size="sm" variant="outline" className="border-gray-200 rounded-full text-xs" onClick={() => { if (profileModal.profile?.email) window.location.href = `mailto:${profileModal.profile.email}`; }}><Mail className="h-3.5 w-3.5 mr-1" /> Message</Button>
                  </div>
                </div>

                {/* About */}
                {p?.about && (
                  <div className="mb-5">
                    <h3 className="text-sm font-bold text-[#3A1F1F] mb-2 flex items-center gap-2"><User className="h-4 w-4 text-[#FF2B2B]" /> Profile Summary</h3>
                    <p className="text-sm text-[#5A5A5A] leading-relaxed bg-[#F6F6F6] rounded-xl p-3 border-l-2 border-[#FF2B2B]">{p.about}</p>
                  </div>
                )}

                {/* Skills */}
                {skills.length > 0 && (
                  <div className="mb-5">
                    <h3 className="text-sm font-bold text-[#3A1F1F] mb-2 flex items-center gap-2"><Star className="h-4 w-4 text-[#FF2B2B]" /> Key Skills</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {skills.map((s: string, i: number) => <Badge key={i} className="bg-[#ECECF4] text-[#3A1F1F] text-xs">{s}</Badge>)}
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
                {edu.length > 0 && (
                  <div className="mb-5">
                    <h3 className="text-sm font-bold text-[#3A1F1F] mb-3 flex items-center gap-2"><GraduationCap className="h-4 w-4 text-blue-500" /> Education</h3>
                    <div className="space-y-2">
                      {edu.map((e, i) => (
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
                {profileModal.resume_url && (
                  <div>
                    <h3 className="text-sm font-bold text-[#3A1F1F] mb-2 flex items-center gap-2"><FileText className="h-4 w-4 text-[#FF2B2B]" /> Resume</h3>
                    <a href={profileModal.resume_url} target="_blank" rel="noreferrer"
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

// ─── Analytics Page ───────────────────────────────────────────────────────────

function AnalyticsPage() {
  const { recruiterProfile } = useAuth();
  const [reportLoading, setReportLoading] = useState(false);
  const [reportCopied, setReportCopied] = useState(false);
  const [reportUrl, setReportUrl] = useState("");
  const [reportError, setReportError] = useState("");

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

  const metrics = [
    { label: "Total Jobs Posted", value: "12", sub: "Last 30 days", icon: Briefcase, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Total Applications", value: "428", sub: "+15% vs last month", icon: Users, color: "text-green-600", bg: "bg-green-50" },
    { label: "Avg. Time to Hire", value: "18 days", sub: "Industry avg: 25 days", icon: Clock, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Offer Acceptance Rate", value: "78%", sub: "+5% vs last quarter", icon: CheckCircle, color: "text-[#FF2B2B]", bg: "bg-red-50" },
    { label: "Job Views", value: "6,861", sub: "Across all active jobs", icon: Eye, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Profile Visit Rate", value: "34%", sub: "Views → Applications", icon: TrendingUp, color: "text-teal-600", bg: "bg-teal-50" },
  ];

  const sourceData = [
    { source: "Direct Search", count: 142, pct: 33 },
    { source: "Recommended by Naukri", count: 98, pct: 23 },
    { source: "Job Alert Email", count: 87, pct: 20 },
    { source: "Similar Jobs", count: 65, pct: 15 },
    { source: "Social Share", count: 36, pct: 9 },
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
          <Select defaultValue="30d">
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
          <h2 className="font-bold text-[#3A1F1F] mb-4">Hiring Funnel</h2>
          <div className="space-y-2">
            {[
              { stage: "Total Applicants", count: 172, color: "bg-gray-400" },
              { stage: "Reviewed", count: 124, color: "bg-blue-400" },
              { stage: "Shortlisted", count: 48, color: "bg-green-400" },
              { stage: "Interview Scheduled", count: 18, color: "bg-purple-400" },
              { stage: "Offer Given", count: 8, color: "bg-yellow-400" },
              { stage: "Hired", count: 5, color: "bg-[#FF2B2B]" },
            ].map((stage, i, arr) => (
              <div key={i}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-[#3A1F1F]">{stage.stage}</span>
                  <span className="text-[#8A8A8A] font-medium">{stage.count}</span>
                </div>
                <div className="h-8 bg-gray-50 rounded-lg overflow-hidden relative">
                  <div className={`h-full ${stage.color} rounded-lg flex items-center px-3 text-white text-xs font-medium transition-all`}
                    style={{ width: `${(stage.count / arr[0].count) * 100}%` }}>
                    {((stage.count / arr[0].count) * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            ))}
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
                  <td className="py-3 px-2 text-center text-green-600 font-medium">{job.pipeline.shortlisted}</td>
                  <td className="py-3 px-2 text-center text-yellow-600 font-medium">{job.pipeline.offered}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Company Profile Page ─────────────────────────────────────────────────────

function CompanyProfilePage() {
  const { recruiterProfile, refreshProfile } = useAuth();
  const [profile, setProfile] = useState({
    companyName: "", industry: "", companySize: "", type: "", founded: "",
    description: "", website: "", location: "", linkedin: "", cin: "",
    tagline: "", phone: "", recruiterName: "",
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

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
      });
    }
  }, [recruiterProfile]);

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
          <div className="h-32 bg-gradient-to-r from-[#3A1F1F] to-[#FF2B2B] relative">
            <Button size="sm" variant="outline" className="absolute right-4 top-4 bg-white/80 border-0 rounded-full text-xs">
              <Upload className="h-3.5 w-3.5 mr-1" /> Cover Photo
            </Button>
          </div>
          <div className="px-6 pb-6">
            <div className="flex items-end gap-4 -mt-10">
              <div className="w-20 h-20 bg-[#FF2B2B] rounded-2xl border-4 border-white flex items-center justify-center shadow-lg">
                <Building2 className="h-10 w-10 text-white" />
              </div>
              <div className="pb-2 flex-1">
                <h2 className="text-xl font-bold text-[#3A1F1F]">{profile.companyName}</h2>
                <p className="text-sm text-[#8A8A8A]">{profile.tagline}</p>
              </div>
              <div className="pb-2">
                <Button size="sm" className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full text-xs">
                  <Upload className="h-3.5 w-3.5 mr-1" /> Upload Logo
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-[#3A1F1F] mb-4">Basic Information</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Company Name *</label>
              <Input value={profile.companyName} onChange={e => setProfile({ ...profile, companyName: e.target.value })} className="bg-[#F6F6F6] border-gray-200 rounded-xl" />
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Tagline</label>
              <Input value={profile.tagline} onChange={e => setProfile({ ...profile, tagline: e.target.value })} className="bg-[#F6F6F6] border-gray-200 rounded-xl" placeholder="Your company motto" />
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Industry *</label>
              <Select value={profile.industry} onValueChange={v => setProfile({ ...profile, industry: v })}>
                <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-xl"><SelectValue /></SelectTrigger>
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
              <Input value={profile.founded} onChange={e => setProfile({ ...profile, founded: e.target.value })} className="bg-[#F6F6F6] border-gray-200 rounded-xl" placeholder="e.g. 2010" />
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Your Name (HR Contact)</label>
              <Input value={profile.recruiterName} onChange={e => setProfile({ ...profile, recruiterName: e.target.value })} className="bg-[#F6F6F6] border-gray-200 rounded-xl" placeholder="e.g. Anita Rao" />
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
              <Input value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} className="bg-[#F6F6F6] border-gray-200 rounded-xl" placeholder="+91 22 6789 0123" />
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
      setPromoError("Invalid promo code. Try RHIRE20, HIRE50, or NEWJOIN.");
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
    const finalPrice = appliedPromo ? applyPromo(plan.price, appliedPromo) : plan.price;
    const discount = plan.price - finalPrice;
    const params = new URLSearchParams({
      plan: planId,
      amount: String(plan.price),
      final: String(finalPrice),
      discount: String(discount),
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
              placeholder="Enter promo code (e.g. RHIRE20)"
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
          const finalPrice = appliedPromo ? applyPromo(plan.price, appliedPromo) : plan.price;
          const discount = plan.price - finalPrice;

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
                  {discount > 0 && (
                    <span className="text-lg text-[#8A8A8A] line-through">₹{plan.price}</span>
                  )}
                  <span className="text-4xl font-bold text-[#3A1F1F]">₹{finalPrice}</span>
                  <span className="text-[#8A8A8A] text-sm">/{plan.period}</span>
                </div>
                {discount > 0 && (
                  <p className="text-xs text-green-600 font-medium">You save ₹{discount}</p>
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

