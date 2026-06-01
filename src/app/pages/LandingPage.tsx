import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Menu,
  X,
  Bell,
  Play,
  Star,
  MapPin,
  DollarSign,
  Clock,
  ArrowRight,
  CheckCircle2,
  Users,
  Briefcase,
  TrendingUp,
  Award,
  BookOpen,
  Facebook,
  Instagram,
  Twitter,
  BadgeCheck,
  Quote,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/ui/accordion";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from "../components/ui/sheet";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "../components/ui/carousel";
import { useNavigate } from "react-router";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { useAuth } from "../../lib/auth-context";
import JobShareButton from "../components/JobShareButton";

import { PLANS, calculateGst } from "../../lib/plans";
import { supabase, type Job as DBJob, type RecruiterArticle } from "../../lib/supabase";
import { formatJobSalary, isJobVisibleToSeekers } from "../../lib/jobs";
import { getRecommendedJobs, recordJobInteraction } from "../../lib/jobRecommendations";
import { isIndianLocation } from "../../lib/locationData";
import {
  assignBalancedCategories,
  getAvailableJobCategories,
  getRandomJobCategories,
  type JobCategory,
} from "../../lib/jobCategorization";

const logoImage = new URL("../../logo/logo.png", import.meta.url).href;

type DisplayJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  type: string;
  featured: boolean;
  category: JobCategory | null;
  description: string;
  dbJob?: DBJob;
};

function formatLocation(job: DBJob): string {
  if (job.location?.trim()) return job.location;
  if (job.work_mode?.trim()) return job.work_mode;
  return "India";
}

function formatType(job: DBJob): string {
  if (job.employment_type?.trim()) return job.employment_type;
  if (job.work_mode?.trim()) return job.work_mode;
  if (job.department?.trim()) return job.department;
  return "Full-time";
}

function formatDescription(job: DBJob): string {
  if (job.description?.trim()) return job.description;
  if (job.roles_responsibilities?.trim()) return job.roles_responsibilities;
  if (job.requirements?.trim()) return job.requirements;

  const parts = [
    job.department?.trim(),
    job.industry?.trim(),
    job.skills?.length ? `Skills: ${job.skills.slice(0, 3).join(", ")}` : "",
  ].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(" | ");
  }

  return "Explore this opportunity and apply now.";
}

type LandingTestimonial = {
  id: string;
  name: string;
  role: string;
  rating: number;
  text: string;
  image: string | null;
};

type SupabaseLandingTestimonial = {
  feedback_id: string;
  user_id: string;
  user_type: "jobseeker" | "recruiter";
  rating: number;
  comment: string | null;
  reviewer_name: string | null;
  reviewer_role: string | null;
  image_url: string | null;
};

type DirectFeedbackReview = {
  id: string;
  user_id: string;
  user_type: "jobseeker" | "recruiter";
  user_email: string | null;
  rating: number;
  comment: string | null;
};

const TESTIMONIAL_LIMIT = 4;

const fallbackTestimonials: LandingTestimonial[] = [
  {
    id: "fallback-sneha-iyer",
    name: "Sneha Iyer",
    role: "Software Engineer",
    rating: 5,
    text: "RhirePro made my job search feel focused instead of overwhelming. The matched roles were relevant to my skills, and I received timely updates that helped me prepare with confidence before every interview.",
    image:
      "https://plus.unsplash.com/premium_photo-1682089806994-abcccbaa953a?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: "fallback-rahul-sharma",
    name: "Rahul Sharma",
    role: "Full Stack Developer",
    rating: 5,
    text: "I liked how quickly RhirePro connected me with companies that were actually hiring for my experience level. The platform saved me hours of searching and made each application feel more intentional.",
    image:
      "https://images.unsplash.com/photo-1612681051163-6c1ad652d143?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: "fallback-priya-reddy",
    name: "Priya Reddy",
    role: "Frontend Developer",
    rating: 5,
    text: "The recommendations were much better than the usual job boards I had been using. I discovered roles that matched my frontend background, salary expectations, and preferred location without having to filter endlessly.",
    image:
      "https://images.pexels.com/photos/7648312/pexels-photo-7648312.jpeg?_gl=1*oy4rdb*_ga*MTg0OTEwNDE3NC4xNzY3MDc1ODM4*_ga_8JE65Q40S6*czE3NzQ1MTQwNDQkbzIkZzEkdDE3NzQ1MTQzOTUkajQ5JGwwJGgw",
  },
  {
    id: "fallback-karthik-kumar",
    name: "Karthik Kumar",
    role: "React Developer",
    rating: 5,
    text: "RhirePro helped me stay organized throughout the hiring process. From finding suitable React roles to tracking progress after applying, the experience felt professional, clear, and genuinely useful.",
    image:
      "https://images.unsplash.com/photo-1729157661483-ed21901ed892?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
];

const shuffleItems = <T,>(items: T[]) =>
  [...items].sort(() => Math.random() - 0.5);

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

const getNameFromEmail = (email: string | null) => {
  const emailName = email?.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  if (!emailName) return "RhirePro User";

  return emailName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
};

const getReviewText = (comment: string | null, rating: number) =>
  comment?.trim() || `Rated RhirePro ${rating} out of 5 stars.`;

const pickUniqueTestimonials = (
  realTestimonials: LandingTestimonial[],
): LandingTestimonial[] => {
  const unique = new Map<string, LandingTestimonial>();

  shuffleItems(realTestimonials).forEach((testimonial) => {
    if (!unique.has(testimonial.id)) {
      unique.set(testimonial.id, testimonial);
    }
  });

  const selected = Array.from(unique.values()).slice(0, TESTIMONIAL_LIMIT);
  const fallbackSlots = TESTIMONIAL_LIMIT - selected.length;

  if (fallbackSlots > 0) {
    selected.push(...shuffleItems(fallbackTestimonials).slice(0, fallbackSlots));
  }

  return shuffleItems(selected);
};

export default function LandingPage() {
  const [activeSection, setActiveSection] = useState("home");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("Standard Plan");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [jobs, setJobs] = useState<DisplayJob[]>([]);
  const [visibleCategories, setVisibleCategories] = useState<JobCategory[]>([]);
  const [testimonials, setTestimonials] = useState<LandingTestimonial[]>(() =>
    pickUniqueTestimonials([]),
  );
  const [testimonialCarouselApi, setTestimonialCarouselApi] = useState<CarouselApi>();
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [testimonialSlideCount, setTestimonialSlideCount] = useState(0);
  const navigate = useNavigate();
  const { user, role, profile } = useAuth();

  const updateTestimonialCarousel = useCallback((api: CarouselApi) => {
    if (!api) return;
    setTestimonialSlideCount(api.scrollSnapList().length);
    setActiveTestimonial(api.selectedScrollSnap());
  }, []);

  useEffect(() => {
    if (!testimonialCarouselApi) return;

    updateTestimonialCarousel(testimonialCarouselApi);
    testimonialCarouselApi.on("select", updateTestimonialCarousel);
    testimonialCarouselApi.on("reInit", updateTestimonialCarousel);

    return () => {
      testimonialCarouselApi.off("select", updateTestimonialCarousel);
      testimonialCarouselApi.off("reInit", updateTestimonialCarousel);
    };
  }, [testimonialCarouselApi, updateTestimonialCarousel, testimonials.length]);

  useEffect(() => {
    if (!testimonialCarouselApi || testimonials.length <= 1) return;

    const autoSlide = window.setInterval(() => {
      testimonialCarouselApi.scrollNext();
    }, 5500);

    return () => window.clearInterval(autoSlide);
  }, [testimonialCarouselApi, testimonials.length]);

  const handlePurchasePlan = (planName: string) => {
    const plan = PLANS.find(p => p.name === planName);
    if (!plan) return;
    if (user && role === "recruiter") {
      navigate(`/recruiter/plan-details?plan=${plan.id}`);
    } else {
      navigate(`/signin?redirect=plan&plan=${plan.id}`);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadFeedbackTestimonials = async () => {
      const { data, error } = await supabase.rpc("get_landing_testimonials", {
        testimonial_limit: 24,
      });

      let realTestimonials: LandingTestimonial[] = [];

      if (!error && data) {
        realTestimonials = (data as SupabaseLandingTestimonial[])
          .map((review) => {
            const rating = Math.max(1, Math.min(5, Number(review.rating) || 5));

            return {
              id: review.user_id || review.feedback_id,
              name: review.reviewer_name?.trim() || "RhirePro User",
              role:
                review.reviewer_role?.trim() ||
                (review.user_type === "recruiter" ? "Recruiter" : "Job Seeker"),
              rating,
              text: getReviewText(review.comment, rating),
              image: review.image_url?.trim() || null,
            };
          })
          .filter((review) => review.name);
      }

      if (realTestimonials.length === 0) {
        const { data: feedbackData } = await supabase
          .from("feedback")
          .select("id,user_id,user_type,user_email,rating,comment")
          .order("created_at", { ascending: false })
          .limit(24);

        realTestimonials = ((feedbackData || []) as DirectFeedbackReview[])
          .map((review) => {
            const rating = Math.max(1, Math.min(5, Number(review.rating) || 5));

            return {
              id: review.user_id || review.id,
              name: getNameFromEmail(review.user_email),
              role: review.user_type === "recruiter" ? "Recruiter" : "Job Seeker",
              rating,
              text: getReviewText(review.comment, rating),
              image: null,
            };
          })
          .filter((review) => review.name);
      }

      if (!isMounted) return;

      setTestimonials(pickUniqueTestimonials(realTestimonials));
    };

    loadFeedbackTestimonials();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      // Update scroll state for header
      setIsScrolled(window.scrollY > 20);

      // Update active section
      const sections = ["home", "about", "services", "jobs", "contact"];
      const scrollPosition = window.scrollY + 150;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (
            scrollPosition >= offsetTop &&
            scrollPosition < offsetTop + offsetHeight
          ) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Call once on mount
    return () =>
      window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    let mounted = true;

    async function fetchLandingJobs() {
      const [{ data: jobsData }, applicationsRes, savedRes] = await Promise.all([
        supabase
          .from("jobs")
          .select("*")
          .eq("status", "Active")
          .order("created_at", { ascending: false }),
        profile?.id
          ? supabase.from("applications").select("job_id").eq("profile_id", profile.id)
          : Promise.resolve({ data: [] as { job_id: string }[] }),
        profile?.id
          ? supabase.from("saved_jobs").select("job_id").eq("profile_id", profile.id)
          : Promise.resolve({ data: [] as { job_id: string }[] }),
      ]);

      if (!mounted) return;

      const applicationIds = (applicationsRes.data || []).map((item) => item.job_id);
      const savedIds = (savedRes.data || []).map((item) => item.job_id);

      const visibleIndianJobs = assignBalancedCategories((jobsData || [])
        .filter((job) => isJobVisibleToSeekers(job) && isIndianLocation(job.location))
        .map((job) => ({
          id: job.id,
          title: job.title,
          company: job.company_name,
          location: formatLocation(job),
          salary: formatJobSalary(job),
          type: formatType(job),
          category: null,
          description: formatDescription(job),
          featured: false,
          dbJob: job,
        })));

      const recommended = getRecommendedJobs(visibleIndianJobs, {
        userId: role === "jobseeker" ? profile?.id : null,
        profile: role === "jobseeker" ? profile : null,
        appliedJobIds: applicationIds,
        savedJobIds: savedIds,
      });

      const preparedJobs = recommended.map((job, index) => ({ ...job, featured: index < 3 }));
      const availableCategories = getAvailableJobCategories(preparedJobs);

      setJobs(preparedJobs);
      setVisibleCategories(getRandomJobCategories(availableCategories, 3));
    }

    fetchLandingJobs();
    return () => {
      mounted = false;
    };
  }, [profile, role]);

  useEffect(() => {
    if (selectedCategory !== "ALL" && !visibleCategories.includes(selectedCategory as JobCategory)) {
      setSelectedCategory("ALL");
    }
  }, [selectedCategory, visibleCategories]);

  const categoryTabs = useMemo(() => ["ALL", ...visibleCategories], [visibleCategories]);

  const categoryJobs = useMemo(
    () =>
      jobs.filter((job) =>
        selectedCategory === "ALL"
          ? visibleCategories.length === 0 || (job.category !== null && visibleCategories.includes(job.category))
          : job.category === selectedCategory
      ),
    [jobs, selectedCategory, visibleCategories]
  );

  const visibleCategoryJobs = useMemo(() => {
    if (selectedCategory !== "ALL") return categoryJobs.slice(0, 9);

    const grouped = new Map<JobCategory, DisplayJob[]>();
    visibleCategories.forEach((category) => grouped.set(category, []));

    categoryJobs.forEach((job) => {
      if (job.category && grouped.has(job.category)) {
        grouped.get(job.category)?.push(job);
      }
    });

    const mixed: DisplayJob[] = [];
    while (mixed.length < 9) {
      let addedInRound = false;
      for (const key of visibleCategories) {
        const nextJob = grouped.get(key)?.shift();
        if (nextJob) {
          mixed.push(nextJob);
          addedInRound = true;
          if (mixed.length >= 9) break;
        }
      }
      if (!addedInRound) break;
    }

    return mixed;
  }, [categoryJobs, selectedCategory, visibleCategories]);

  const services = [
    {
      title: "Talent Sourcing",
      description:
        "Connect with top talent across industries to find the perfect candidates for your organization.",
      icon: Users,
    },
    {
      title: "Executive Search",
      description:
        "Specialized recruitment for senior leadership positions that drive your company forward.",
      icon: Award,
    },
    {
      title: "Job Matching",
      description:
        "AI-powered algorithms match candidates with opportunities based on skills and culture fit.",
      icon: Briefcase,
    },
    {
      title: "Employer Branding",
      description:
        "Build and promote your employer brand to attract the best talent in your industry.",
      icon: TrendingUp,
    },
    {
      title: "Career Coaching & Resume Review",
      description:
        "Expert guidance to help candidates present themselves effectively.",
      icon: CheckCircle2,
    },
    {
      title: "Contract & Project-Based Hiring",
      description:
        "Flexible hiring solutions for temporary and project-based needs.",
      icon: Clock,
    },
  ];

  const blogs = [
    {
      title: "Why Soft Skills Matter More Than Ever",
      description:
        "Explore why employers are prioritizing soft skills and how you can showcase yours effectively.",
      date: "March 1, 2026",
      category: "Career Tips",
    },
    {
      title: "How Companies Are Battling Talent Shortages",
      description:
        "Discover innovative strategies companies use to attract and retain top talent in competitive markets.",
      date: "February 28, 2026",
      category: "Industry Insights",
    },
    {
      title: "Recruiters Now Focus on Candidate Experience",
      description:
        "Learn how the recruitment landscape is shifting to prioritize candidate satisfaction and engagement.",
      date: "February 25, 2026",
      category: "Trends",
    },
    {
      title: "How to Stand Out in a Competitive Market",
      description:
        "Expert advice on differentiating yourself from other candidates in today's job market.",
      date: "February 20, 2026",
      category: "Job Search",
    },
    {
      title: "Why Employer Branding Matters in 2025",
      description:
        "Understanding the impact of company culture and reputation more than ever before.",
      date: "February 15, 2026",
      category: "Employer Tips",
    },
    {
      title: "Remote Work Continues to Dominate",
      description:
        "Analyzing the lasting impact of remote work and hybrid models on the job market.",
      date: "February 10, 2026",
      category: "Work Trends",
    },
  ];
  const [publishedArticles, setPublishedArticles] = useState<RecruiterArticle[]>([]);

  useEffect(() => {
    async function loadPublishedArticles() {
      const { data } = await supabase
        .from("recruiter_articles")
        .select("*")
        .eq("status", "Published")
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(3);

      if (data) setPublishedArticles(data as RecruiterArticle[]);
    }

    void loadPublishedArticles();
  }, []);

  const recentPublishedArticles = publishedArticles.slice(0, 3);
  const landingArticles = recentPublishedArticles.length > 0
    ? recentPublishedArticles.map((article) => ({
      id: article.id,
      title: article.title,
      description: article.summary || article.content,
      category: article.category,
      image: article.cover_image_url || "",
      isDatabaseArticle: true,
    }))
    : blogs.slice(0, 3).map((blog, index) => ({
      id: String(index + 1),
      title: blog.title,
      description: blog.description,
      category: blog.category,
      image: [
        "https://images.unsplash.com/photo-1754885262663-470bb3c5e1f2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYXJlZXIlMjBncm93dGglMjBwcm9mZXNzaW9uYWwlMjBzdWNjZXNzfGVufDF8fHx8MTc3MjgyMjQ4OXww&ixlib=rb-4.1.0&q=80&w=1080",
        "https://images.unsplash.com/photo-1758518730162-09a142505bfd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0YWxlbnQlMjBhY3F1aXNpdGlvbiUyMGhpcmluZyUyMHByb2Nlc3N8ZW58MXx8fHwxNzcyODIyNTA4fDA&ixlib=rb-4.1.0&q=80&w=1080",
        "https://images.unsplash.com/photo-1626065838283-d338b7702fed?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZW1vdGUlMjB3b3JrJTIwaG9tZSUyMG9mZmljZXxlbnwxfHx8fDE3NzI3MTU3NjZ8MA&ixlib=rb-4.1.0&q=80&w=1080",
      ][index],
      isDatabaseArticle: false,
    }));

  const faqs = [
    {
      question:
        "How do I create an account and start applying?",
      answer:
        "Click on the 'Get Started' button and choose whether you're a job seeker or recruiter. Fill out the registration form with your details and you'll be ready to start applying or posting jobs.",
    },
    {
      question: "How do I track the status of my application?",
      answer:
        "Once you're logged in to your dashboard, navigate to the 'Job Analytics' section where you can see all your applications and their current status.",
    },
    {
      question: "Is my company information kept confidential?",
      answer:
        "Yes, we take privacy seriously. All your information is encrypted and stored securely. We never share your data without your explicit permission.",
    },
    {
      question:
        "Will I be notified if I'm selected for an interview?",
      answer:
        "Absolutely! You'll receive email notifications and in-app alerts whenever there's an update on your application or if you're selected for an interview.",
    },
  ];

  const pricingPlans = PLANS;

  const stats = [
    { value: "25+", label: "Years Experience" },
    { value: "30", label: "Industry Experts" },
    { value: "15K+", label: "Jobs Posted" },
  ];

  return (
    <div className="min-h-screen bg-[#F6F6F6]">
      {/* Header */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${isScrolled ? "bg-white/95 backdrop-blur-sm shadow-lg" : "bg-white shadow-sm"}`}
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <img
              src={logoImage}
              alt="RhirePro Logo"
              className="w-10 h-10"
            />
            <div className="text-2xl font-bold text-[#3A1F1F]">
              Rhire<span className="text-[#FF2B2B]">Pro</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-4">
            <button
              onClick={() => scrollToSection("home")}
              className={`px-4 py-2 rounded-full transition-all ${activeSection === "home"
                ? "bg-[#FF2B2B] text-white"
                : "text-[#3A1F1F] hover:bg-[#ECECF4]"
                }`}
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection("about")}
              className={`px-4 py-2 rounded-full transition-all ${activeSection === "about"
                ? "bg-[#FF2B2B] text-white"
                : "text-[#3A1F1F] hover:bg-[#ECECF4]"
                }`}
            >
              About Us
            </button>
            <button
              onClick={() => scrollToSection("services")}
              className={`px-4 py-2 rounded-full transition-all ${activeSection === "services"
                ? "bg-[#FF2B2B] text-white"
                : "text-[#3A1F1F] hover:bg-[#ECECF4]"
                }`}
            >
              Services
            </button>
            <button
              onClick={() => scrollToSection("jobs")}
              className={`px-4 py-2 rounded-full transition-all ${activeSection === "jobs"
                ? "bg-[#FF2B2B] text-white"
                : "text-[#3A1F1F] hover:bg-[#ECECF4]"
                }`}
            >
              Jobs
            </button>
            <button
              onClick={() => scrollToSection("contact")}
              className={`px-4 py-2 rounded-full transition-all ${activeSection === "contact"
                ? "bg-[#FF2B2B] text-white"
                : "text-[#3A1F1F] hover:bg-[#ECECF4]"
                }`}
            >
              Contact Us
            </button>
            {/* Login Button for Desktop */}
            <Button
              onClick={() => navigate("/signin")}
              className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full px-6"
            >
              Login
            </Button>
          </nav>

          {/* Mobile Hamburger Menu */}
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <button className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Menu className="h-6 w-6 text-[#3A1F1F]" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-80 bg-white"
            >
              <SheetTitle className="sr-only">
                Navigation Menu
              </SheetTitle>
              <SheetDescription className="sr-only">
                Sign in options for job seekers and recruiters
              </SheetDescription>
              <div className="flex flex-col gap-6 mt-8">
                <div className="flex items-center gap-3 mb-4">
                  <img
                    src={logoImage}
                    alt="RhirePro Logo"
                    className="w-12 h-12"
                  />
                  <h3 className="text-2xl font-bold text-[#3A1F1F]">
                    Rhire
                    <span className="text-[#FF2B2B]">Pro</span>
                  </h3>
                </div>
                <p className="text-[#8A8A8A] text-sm">
                  Welcome! Sign in to access your dashboard and
                  explore opportunities.
                </p>
                <Button
                  className="w-full bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full"
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigate("/jobseeker/signin");
                  }}
                >
                  Job Seeker Sign In
                </Button>
                <Button
                  className="w-full bg-[#3A1F1F] hover:bg-[#2A1010] text-white rounded-full"
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigate("/recruiter/signin");
                  }}
                >
                  Recruiter Sign In
                </Button>
                <div className="border-t border-gray-200 mt-4 pt-4">
                  <p className="text-sm text-[#8A8A8A] mb-3">
                    Quick Links
                  </p>
                  <div className="space-y-2">
                    <button
                      className="w-full text-left px-4 py-2 rounded-lg hover:bg-[#ECECF4] text-[#3A1F1F]"
                      onClick={() => {
                        setIsMenuOpen(false);
                        scrollToSection("home");
                      }}
                    >
                      Home
                    </button>
                    <button
                      className="w-full text-left px-4 py-2 rounded-lg hover:bg-[#ECECF4] text-[#3A1F1F]"
                      onClick={() => {
                        setIsMenuOpen(false);
                        scrollToSection("about");
                      }}
                    >
                      About Us
                    </button>
                    <button
                      className="w-full text-left px-4 py-2 rounded-lg hover:bg-[#ECECF4] text-[#3A1F1F]"
                      onClick={() => {
                        setIsMenuOpen(false);
                        navigate("/jobs");
                      }}
                    >
                      Browse Jobs
                    </button>
                    <button
                      className="w-full text-left px-4 py-2 rounded-lg hover:bg-[#ECECF4] text-[#3A1F1F]"
                      onClick={() => {
                        setIsMenuOpen(false);
                        navigate("/services");
                      }}
                    >
                      Our Services
                    </button>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Hero Section */}
      <section id="home" className="bg-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl md:text-6xl font-bold text-[#3A1F1F] mb-6 leading-tight">
                The Fastest Way to Your Next Role
              </h1>
              <p className="text-lg text-[#8A8A8A] mb-8">
                Browse curated job openings across various
                industries that match your skills and career
                goals.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button onClick={() => navigate("/signin")} className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full px-8 py-6">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <a
                  href="https://www.youtube.com/watch?v=lJ8G9KlOITQ"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center"
                >
                  <Button
                    variant="outline"
                    className="border-2 border-[#3A1F1F] text-[#3A1F1F] hover:bg-[#3A1F1F] hover:text-white rounded-full px-8 py-6"
                  >
                    <Play className="mr-2 h-5 w-5" />
                    Play Video
                  </Button>
                </a>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1758518732175-5d608ba3abdf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBidXNpbmVzcyUyMHRlYW0lMjBtZWV0aW5nfGVufDF8fHx8MTc3Mjc2MTA0MHww&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Professional business team"
                className="rounded-2xl h-64 w-full object-cover"
              />
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1758520144661-73849bde0da1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYXBweSUyMG9mZmljZSUyMHdvcmtlcnMlMjBjZWxlYnJhdGluZ3xlbnwxfHx8fDE3NzI4MjIyMTN8MA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Happy office workers"
                className="rounded-2xl h-64 w-full object-cover mt-8"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Scrolling Banner */}
      <section className="bg-[#F6F6F6] overflow-hidden relative h-24 my-12">
        {/* First Diagonal Strip (Light Grey - Top-left to Bottom-right) */}
        <div className="absolute w-[150%] left-[-25%] top-4 -rotate-3 bg-[#ECECF4] py-3 z-10">
          <div className="flex animate-scroll-marquee whitespace-nowrap">
            <div className="flex items-center gap-16 pr-16">
              {[...Array(10)].map((_, i) => (
                <span
                  key={i}
                  className="text-2xl md:text-3xl font-bold text-[#3A1F1F]"
                >
                  Hire Smarter. Work Better.
                </span>
              ))}
            </div>
            <div className="flex items-center gap-16 pr-16">
              {[...Array(10)].map((_, i) => (
                <span
                  key={i}
                  className="text-2xl md:text-3xl font-bold text-[#3A1F1F]"
                >
                  Hire Smarter. Work Better.
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Second Diagonal Strip (Red - Bottom-left to Top-right - crossing) */}
        <div className="absolute w-[150%] left-[-25%] top-12 rotate-3 bg-[#FF2B2B] py-3 z-20">
          <div className="flex animate-scroll-marquee-reverse whitespace-nowrap">
            <div className="flex items-center gap-16 pr-16">
              {[...Array(10)].map((_, i) => (
                <span
                  key={i}
                  className="text-2xl md:text-3xl font-bold text-white"
                >
                  Hire Smarter. Work Better.
                </span>
              ))}
            </div>
            <div className="flex items-center gap-16 pr-16">
              {[...Array(10)].map((_, i) => (
                <span
                  key={i}
                  className="text-2xl md:text-3xl font-bold text-white"
                >
                  Hire Smarter. Work Better.
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="bg-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <span className="inline-block bg-[#FF2B2B] text-white px-4 py-1 rounded-full text-sm mb-4">
              ABOUT US
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-[#3A1F1F] mb-4">
              Connecting Ambition with Opportunity
            </h2>
            <p className="text-lg text-[#8A8A8A] max-w-3xl mx-auto">
              We help job seekers and recruiters make the
              connections that match your passion and career
              goals.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1646153114001-495dfb56506d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBvZmZpY2UlMjB3b3Jrc3BhY2UlMjB0ZWNobm9sb2d5fGVufDF8fHx8MTc3Mjc4MTA1MXww&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Modern office workspace"
              className="rounded-2xl h-96 w-full object-cover"
            />
            <div className="space-y-6">
              <div className="flex gap-4">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1758518730380-04c8e0d57b68?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxociUyMG1hbmFnZXIlMjBpbnRlcnZpZXdpbmclMjBjYW5kaWRhdGV8ZW58MXx8fHwxNzcyODIyNTAzfDA&ixlib=rb-4.1.0&q=80&w=1080"
                  alt="HR interview"
                  className="rounded-2xl h-48 flex-1 object-cover"
                />
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1769839271768-aee5469799ee?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBjb25zdWx0YW50JTIwcHJlc2VudGF0aW9ufGVufDF8fHx8MTc3MjgyMjUwNnww&ixlib=rb-4.1.0&q=80&w=1080"
                  alt="Professional consultant"
                  className="rounded-2xl h-48 flex-1 object-cover"
                />
              </div>
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1739298061766-e2751d92e9db?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaXZlcnNlJTIwYnVzaW5lc3MlMjB0ZWFtJTIwd29ya2luZ3xlbnwxfHx8fDE3NzI4MjI1MDV8MA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Diverse team working"
                className="rounded-2xl h-48 w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-[#5B5B72] py-16">
        <div className="container mx-auto px-4">
          <div className="text-center text-white max-w-2xl mx-auto">
            <p className="text-lg mb-2">
              "We’re not just leading the way in hiring — we’re
              building the path that connects talent with
              opportunity."
            </p>
            <p className="text-sm text-white/80">
              — Rhirepro Team
            </p>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section
        id="services"
        className="bg-white py-16 md:py-24"
      >
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <span className="inline-block bg-[#FF2B2B] text-white px-4 py-1 rounded-full text-sm mb-4">
              SERVICES
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-[#3A1F1F] mb-4">
              Connecting Ambition with Opportunity
            </h2>
            <p className="text-lg text-[#8A8A8A] max-w-3xl mx-auto">
              We help job seekers and recruiters make the right
              connections.
            </p>
          </div>

          <div className="space-y-6 max-w-4xl mx-auto">
            {services.map((service, index) => {
              const Icon = service.icon;
              return (
                <div
                  key={index}
                  className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-all border border-gray-100 flex items-start gap-6"
                >
                  <div className="bg-gray-200 rounded-xl h-24 w-32 flex-shrink-0"></div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-[#3A1F1F] mb-2">
                      {service.title}
                    </h3>
                    <p className="text-[#8A8A8A] mb-4">
                      {service.description}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-[#FF2B2B] rounded-full flex items-center justify-center flex-shrink-0">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-[#5B5B72] py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Take the Next Step in Your Career
          </h2>
          <p className="text-white/90 mb-8 text-lg max-w-2xl mx-auto">
            Join thousands of professionals who have found their
            dream jobs through RhirePro
          </p>
          <Button onClick={() => navigate("/jobs")} className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full px-8 py-6 text-lg">
            Explore <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="bg-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <span className="inline-block bg-[#FF2B2B] text-white px-4 py-1 rounded-full text-sm mb-4">
              RECRUITMENT
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-[#3A1F1F] mb-4">
              Find the Perfect Plan to Hire Smarter
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan, index) => {
              const isSelected = selectedPlan === plan.name;
              return (
                <div
                  key={index}
                  onClick={() => setSelectedPlan(plan.name)}
                  className={`bg-white rounded-2xl p-8 shadow-md hover:shadow-xl transition-all cursor-pointer border-2 ${isSelected
                    ? "border-[#FF2B2B] scale-105"
                    : "border-gray-200 hover:border-[#FF2B2B]/40"
                    }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-2xl font-bold text-[#3A1F1F] flex items-center gap-2">
                      {plan.name}
                      {isSelected && <BadgeCheck className="h-6 w-6 text-[#FF2B2B]" />}
                    </h3>
                    {plan.popular && (
                      <span className="bg-[#FF2B2B] text-white text-xs px-3 py-1 rounded-full font-semibold">
                        Popular
                      </span>
                    )}
                  </div>
                  <div className="mb-6">
                    <span className="text-5xl font-bold text-[#3A1F1F]">
                      ₹{plan.price}
                    </span>
                    <span className="text-[#8A8A8A]">
                      /{plan.period}
                    </span>
                    <p className="mt-1 text-xs text-[#8A8A8A]">
                      + GST ₹{calculateGst(plan.price)}
                    </p>
                  </div>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePurchasePlan(plan.name);
                    }}
                    className="w-full rounded-full py-6 mb-6 bg-[#FF2B2B] hover:bg-[#e02525] text-white"
                  >
                    Purchase Plan <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-3"
                      >
                        <BadgeCheck className="h-5 w-5 text-[#FF2B2B] flex-shrink-0 mt-0.5" />
                        <span className="text-[#8A8A8A]">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="bg-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <span className="inline-block bg-[#FF2B2B] text-white px-4 py-1 rounded-full text-sm mb-4">
              TESTIMONIALS
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-[#3A1F1F] mb-4">
              From Job Hunt to Career Happiness
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-12 max-w-6xl mx-auto items-stretch">
            <ImageWithFallback
              src="https://images.pexels.com/photos/4965012/pexels-photo-4965012.jpeg?_gl=1*z0o6rt*_ga*MTg0OTEwNDE3NC4xNzY3MDc1ODM4*_ga_8JE65Q40S6*czE3NzQ1MTQwNDQkbzIkZzEkdDE3NzQ1MTQxMDIkajIkbDAkaDA."
              alt="Career success professional"
              className="rounded-2xl h-80 md:h-full min-h-[350px] w-full object-cover"
            />
            <div className="relative flex min-h-[350px] flex-col justify-between">
              <Carousel
                setApi={setTestimonialCarouselApi}
                opts={{
                  align: "start",
                  loop: true,
                }}
                className="w-full"
                aria-label="Customer testimonials"
              >
                <CarouselContent className="-ml-5">
                  {testimonials.map((testimonial, index) => {
                    const isActive = index === activeTestimonial;

                    return (
                      <CarouselItem key={testimonial.id} className="pl-5">
                        <article
                          className={`flex h-full min-h-[350px] flex-col rounded-2xl border bg-white p-7 shadow-sm transition-all duration-300 sm:p-8 ${isActive
                            ? "border-[#FF2B2B]/25 shadow-xl shadow-[#3A1F1F]/10"
                            : "border-gray-100 shadow-md"
                            }`}
                        >
                          <div className="mb-5 flex items-center justify-between gap-4">
                            <div className="flex gap-1.5" aria-label={`${testimonial.rating} out of 5 stars`}>
                              {[1, 2, 3, 4, 5].map((value) => (
                                <Star
                                  key={value}
                                  className={`h-5 w-5 ${value <= testimonial.rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-300"
                                    }`}
                                />
                              ))}
                            </div>
                            <Quote className="h-9 w-9 flex-shrink-0 text-[#FF2B2B]/25" aria-hidden="true" />
                          </div>

                          <p className="line-clamp-6 flex-1 text-lg leading-8 text-[#5F5F5F] sm:text-xl sm:leading-9">
                            {testimonial.text}
                          </p>

                          <div className="mt-6 flex items-center gap-4 border-t border-gray-100 pt-5">
                            {testimonial.image ? (
                              <ImageWithFallback
                                src={testimonial.image}
                                alt={testimonial.name}
                                className="h-12 w-12 rounded-full object-cover ring-2 ring-[#FF2B2B]/10"
                              />
                            ) : (
                              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#3A1F1F] text-sm font-semibold text-white">
                                {getInitials(testimonial.name)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-[#3A1F1F]">
                                {testimonial.name}
                              </p>
                              <p className="truncate text-sm text-[#8A8A8A]">
                                {testimonial.role}
                              </p>
                            </div>
                          </div>
                        </article>
                      </CarouselItem>
                    );
                  })}
                </CarouselContent>

                <div className="mt-7 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2" aria-label="Testimonial slides">
                    {Array.from({ length: testimonialSlideCount }).map((_, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => testimonialCarouselApi?.scrollTo(index)}
                        className={`h-2.5 rounded-full transition-all ${index === activeTestimonial
                          ? "w-8 bg-[#FF2B2B]"
                          : "w-2.5 bg-[#3A1F1F]/20 hover:bg-[#3A1F1F]/40"
                          }`}
                        aria-label={`Go to testimonial ${index + 1}`}
                        aria-current={index === activeTestimonial ? "true" : undefined}
                      />
                    ))}
                  </div>
                  <div className="relative flex items-center gap-3">
                    <CarouselPrevious className="static h-10 w-10 translate-x-0 translate-y-0 border-[#3A1F1F]/15 bg-white text-[#3A1F1F] shadow-sm hover:bg-[#FFF4F4] hover:text-[#FF2B2B]" />
                    <CarouselNext className="static h-10 w-10 translate-x-0 translate-y-0 border-[#3A1F1F]/15 bg-white text-[#3A1F1F] shadow-sm hover:bg-[#FFF4F4] hover:text-[#FF2B2B]" />
                  </div>
                </div>
              </Carousel>
            </div>
          </div>
        </div>
      </section>

      {/* Job Listings Section */}
      <section id="jobs" className="bg-[#ECECF4] py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <span className="inline-block bg-[#FF2B2B] text-white px-4 py-1 rounded-full text-sm mb-4">
              JOB LISTINGS
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-[#3A1F1F] mb-4">
              Turn Your Passion into a Career
            </h2>
            <p className="text-lg text-[#8A8A8A] max-w-3xl mx-auto">
              Discover opportunities that align with your
              passion and career goals.
            </p>
          </div>

          {/* Job Filter Tags */}
          <div className="flex flex-wrap gap-3 justify-center mb-12">
            {categoryTabs.map((cat) => (
              <Button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-full px-6 ${selectedCategory === cat
                  ? "bg-[#FF2B2B] hover:bg-[#e02525] text-white"
                  : "bg-white border-2 border-gray-300 text-[#3A1F1F] hover:bg-[#FF2B2B] hover:text-white hover:border-[#FF2B2B]"
                  }`}
              >
                {cat}
              </Button>
            ))}
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {visibleCategoryJobs.map((job) => (
              <div
                key={job.id}
                className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-shadow relative"
              >
                <JobShareButton jobId={job.id} title={job.title} className="absolute right-5 top-5" />
                <div className="mb-4 flex items-start justify-between">
                  <div className="pr-12">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-[#8A8A8A]">
                        {job.company}
                      </span>
                      <BadgeCheck className="h-4 w-4 text-[#FF2B2B]" />
                    </div>
                    <h3 className="text-xl font-bold text-[#3A1F1F]">
                      {job.title}
                    </h3>
                  </div>
                </div>
                <p className="text-[#8A8A8A] text-sm mb-4">
                  {job.description}
                </p>
                <div className="space-y-2 mb-6">
                  <div className="flex items-center text-sm text-[#8A8A8A]">
                    <MapPin className="h-4 w-4 mr-2 text-[#FF2B2B]" />
                    {job.location}
                  </div>
                  <div className="flex items-center text-sm text-[#8A8A8A]">
                    <DollarSign className="h-4 w-4 mr-2 text-[#FF2B2B]" />
                    {job.salary}
                  </div>
                  <div className="flex items-center text-sm text-[#8A8A8A]">
                    <Clock className="h-4 w-4 mr-2 text-[#FF2B2B]" />
                    {job.type}
                  </div>
                </div>
                <Button
                  onClick={() => {
                    if (job.dbJob) {
                      recordJobInteraction(job.dbJob, role === "jobseeker" ? profile?.id : null);
                    }
                    navigate(`/job/${job.id}`);
                  }}
                  className="w-full bg-white border-2 border-[#FF2B2B] text-[#FF2B2B] hover:bg-[#FF2B2B] hover:text-white rounded-full"
                >
                  Apply Now
                </Button>
              </div>
            ))}
          </div>
          {selectedCategory !== "ALL" && categoryJobs.length === 0 && jobs.length > 0 && (
            <div className="text-center py-10">
              <p className="text-[#8A8A8A] text-base">No posted jobs found in this category yet.</p>
            </div>
          )}
          {jobs.length === 0 && (
            <div className="text-center py-10">
              <p className="text-[#8A8A8A] text-lg">No Indian jobs posted yet.</p>
            </div>
          )}
        </div>
      </section>

      {/* Blog Section */}
      <section className="bg-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <span className="inline-block bg-[#FF2B2B] text-white px-4 py-1 rounded-full text-sm mb-4">
              LATEST ARTICLE
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-[#3A1F1F] mb-4">
              Discover What's New in Recruitment
            </h2>
            <p className="text-lg text-[#8A8A8A] max-w-3xl mx-auto">
              Stay informed with the latest updates, trends, and
              insights that keep you informed.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {landingArticles.map((article) => (
              <div key={article.id} className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-shadow border border-gray-100">
                {article.image ? (
                  <ImageWithFallback src={article.image} alt={article.title} className="h-56 w-full object-cover" />
                ) : (
                  <div className="h-56 w-full bg-[#ECECF4] flex items-center justify-center">
                    <BookOpen className="h-10 w-10 text-[#FF2B2B]" />
                  </div>
                )}
                <div className="p-6">
                  <span className="inline-block bg-[#ECECF4] text-[#3A1F1F] px-3 py-1 rounded-full text-sm mb-3">
                    {article.category}
                  </span>
                  <h3 className="text-xl font-bold text-[#3A1F1F] mb-3">{article.title}</h3>
                  <p className="text-[#8A8A8A] mb-4 line-clamp-3">{article.description}</p>
                  <Button
                    variant="link"
                    className="text-[#FF2B2B] p-0 h-auto font-semibold"
                    onClick={() => navigate(`/blog/${article.id}`)}
                  >
                    Read More{" "}
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden">
            <div className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-shadow border border-gray-100">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1690192435015-319c1d5065b2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzb2Z0JTIwc2tplHMlMjwY29tbXVuaWNhdGlvbiUyMHRlYW13b3JrfGVufDF8fHx8MTc3MjgwODE4Nnww&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Soft skills communication"
                className="h-56 w-full object-cover"
              />
              <div className="p-6">
                <span className="inline-block bg-[#ECECF4] text-[#3A1F1F] px-3 py-1 rounded-full text-sm mb-3">
                  Career Tips
                </span>
                <h3 className="text-xl font-bold text-[#3A1F1F] mb-3">
                  Why Soft Skills Matter More Than Ever
                </h3>
                <p className="text-[#8A8A8A] mb-4">
                  Explore why employers are prioritizing soft
                  skills and how you can showcase yours
                  effectively.
                </p>
                <Button
                  variant="link"
                  className="text-[#FF2B2B] p-0 h-auto font-semibold"
                  onClick={() => navigate("/blog/1")}
                >
                  Read More{" "}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-shadow border border-gray-100">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1758518730162-09a142505bfd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0YWxlbnQlMjBhY3F1aXNpdGlvbiUyMGhpcmluZyUyMHByb2Nlc3N8ZW58MXx8fHwxNzcyODIyNTA4fDA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Talent acquisition"
                className="h-56 w-full object-cover"
              />
              <div className="p-6">
                <span className="inline-block bg-[#ECECF4] text-[#3A1F1F] px-3 py-1 rounded-full text-sm mb-3">
                  Industry Insights
                </span>
                <h3 className="text-xl font-bold text-[#3A1F1F] mb-3">
                  How Companies Are Battling Talent Shortages
                </h3>
                <p className="text-[#8A8A8A] mb-4">
                  Discover innovative strategies companies use
                  to attract and retain top talent in
                  competitive markets.
                </p>
                <Button
                  variant="link"
                  className="text-[#FF2B2B] p-0 h-auto font-semibold"
                  onClick={() => navigate("/blog/2")}
                >
                  Read More{" "}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-shadow border border-gray-100">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1626065838283-d338b7702fed?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZW1vdGUlMjB3b3JrJTIwaG9tZSUyMG9mZmljZXxlbnwxfHx8fDE3NzI3MTU3NjZ8MA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Remote work"
                className="h-56 w-full object-cover"
              />
              <div className="p-6">
                <span className="inline-block bg-[#ECECF4] text-[#3A1F1F] px-3 py-1 rounded-full text-sm mb-3">
                  Trends
                </span>
                <h3 className="text-xl font-bold text-[#3A1F1F] mb-3">
                  Recruiters Now Focus on Candidate Experience
                </h3>
                <p className="text-[#8A8A8A] mb-4">
                  Learn how the recruitment landscape is
                  shifting to prioritize candidate satisfaction
                  and engagement.
                </p>
                <Button
                  variant="link"
                  className="text-[#FF2B2B] p-0 h-auto font-semibold"
                  onClick={() => navigate("/blog/3")}
                >
                  Read More{" "}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* All You Need Section */}
      <section className="bg-[#ECECF4] py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block bg-[#FF2B2B] text-white px-4 py-1 rounded-full text-sm mb-4">
                BLOG
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-[#3A1F1F] mb-6">
                All You Need to Know Before You Start
              </h2>
              <p className="text-lg text-[#8A8A8A] mb-8">
                Browse curated guides, tips, and resources to
                help you succeed in your job search or
                recruitment efforts.
              </p>
              <Button className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full px-8 py-6">
                Explore <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-6">
                  <div className="bg-gray-300 rounded-xl h-32 mb-4"></div>
                  <h4 className="font-semibold text-[#3A1F1F] mb-2">
                    Career Growth Tips
                  </h4>
                  <p className="text-sm text-[#8A8A8A]">
                    Essential strategies for advancing your
                    professional journey.
                  </p>
                </div>
              </div>
              <div className="space-y-4 mt-8">
                <div className="bg-white rounded-2xl p-6">
                  <div className="bg-gray-300 rounded-xl h-32 mb-4"></div>
                  <h4 className="font-semibold text-[#3A1F1F] mb-2">
                    Resume Building
                  </h4>
                  <p className="text-sm text-[#8A8A8A]">
                    Create impactful resumes that get noticed by
                    recruiters.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-white py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-12">
            <span className="inline-block bg-[#FF2B2B] text-white px-4 py-1 rounded-full text-sm mb-4">
              FAQ
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-[#3A1F1F] mb-4">
              All You Need to Know Before You Start
            </h2>
          </div>

          <Accordion
            type="single"
            collapsible
            className="space-y-4"
          >
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-white rounded-2xl border border-gray-200 px-6"
              >
                <AccordionTrigger className="text-left text-[#3A1F1F] hover:text-[#FF2B2B] font-semibold">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-[#8A8A8A]">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Contact Section */}
      <section
        id="contact"
        className="bg-[#ECECF4] py-16 md:py-24"
      >
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-[#3A1F1F] mb-4">
              Get In Touch
            </h2>
            <p className="text-lg text-[#8A8A8A] max-w-2xl mx-auto">
              Have questions? We're here to help. Reach out to our team.
            </p>
          </div>

          <div className="flex justify-center">
            <div className="bg-white rounded-2xl p-8 md:p-12 shadow-lg max-w-2xl w-full">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-[#FF2B2B] rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-[#3A1F1F] mb-3">
                  Connect With Us
                </h3>
                <p className="text-[#8A8A8A] mb-6">
                  Send us an email and we'll get back to you as soon as possible
                </p>
                <a
                  href="mailto:support@rhirepro.com"
                  className="inline-flex items-center gap-2 text-[#FF2B2B] hover:text-[#e02525] text-lg font-semibold transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  support@rhirepro.com
                </a>
              </div>

              <div className="border-t border-gray-200 pt-8">
                <p className="text-sm text-[#8A8A8A] text-center mb-4">
                  Or click the button below to compose a message in your email client
                </p>
                <Button
                  onClick={() => window.location.href = 'mailto:support@rhirepro.com?subject=Inquiry from RhirePro&body=Hello RhirePro Team,%0D%0A%0D%0AI would like to inquire about...'}
                  className="w-full bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full py-6 text-base"
                >
                  Send Email Message
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#FF2B2B] text-white py-10">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 mb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Work With Purpose.
                <br />
                Grow With Us.
              </h2>
              {/* Newsletter */}
              <div className="bg-white rounded-full p-1.5 flex items-center gap-2">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-transparent border-0 text-[#3A1F1F] placeholder:text-gray-400 flex-1 focus-visible:ring-0 text-sm"
                  placeholder="Email"
                />
                <Button className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full px-6 py-2 text-sm">
                  Subscribe Now{" "}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <h4 className="font-bold mb-3 text-sm">
                Company
              </h4>
              <ul className="space-y-1.5 text-white/80 text-sm">
                <li>
                  <a
                    href="#home"
                    className="hover:text-white transition-colors"
                  >
                    Home
                  </a>
                </li>
                <li>
                  <a
                    href="#about"
                    className="hover:text-white transition-colors"
                  >
                    About Us
                  </a>
                </li>
                <li>
                  <a
                    href="/services"
                    className="hover:text-white transition-colors"
                  >
                    Services
                  </a>
                </li>
                <li>
                  <a
                    href="#contact"
                    className="hover:text-white transition-colors"
                  >
                    Contact Us
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-3 text-sm">
                Services
              </h4>
              <ul className="space-y-1.5 text-white/80 text-sm">
                <li>
                  <a
                    href="/services#talent-sourcing"
                    className="hover:text-white transition-colors"
                  >
                    Talent Sourcing
                  </a>
                </li>
                <li>
                  <a
                    href="/services#executive-search"
                    className="hover:text-white transition-colors"
                  >
                    Executive Search
                  </a>
                </li>
                <li>
                  <a
                    href="/services#contract-hiring"
                    className="hover:text-white transition-colors"
                  >
                    Project-Based Hiring
                  </a>
                </li>
                <li>
                  <a
                    href="/services#career-coaching"
                    className="hover:text-white transition-colors"
                  >
                    Career Coaching
                  </a>
                </li>
                <li>
                  <a
                    href="/services#job-matching"
                    className="hover:text-white transition-colors"
                  >
                    Job Matching
                  </a>
                </li>
                <li>
                  <a
                    href="/services#employer-branding"
                    className="hover:text-white transition-colors"
                  >
                    Branding Support
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/20 pt-6 flex flex-col md:flex-row justify-between items-center gap-3 text-white/80 text-xs">
            <p>Copyright © 2025 RhirePro. All Rights Reserved.</p>
            <div className="flex gap-4">
              <a href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
