import { CheckCircle2, ArrowRight, BookOpen, MessageSquare, FileText, TrendingUp, Star } from "lucide-react";
import { Button } from "../../components/ui/button";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router";
import PublicHeader from "../../components/PublicHeader";
import PublicFooter from "../../components/PublicFooter";

const benefits = [
  {
    icon: MessageSquare,
    title: "1-on-1 Coaching",
    description: "Personalised sessions with experienced career coaches who understand your industry and goals.",
  },
  {
    icon: FileText,
    title: "Resume & Profile Overhaul",
    description: "Expert review and rewrite of your CV, LinkedIn, and portfolio to stand out from the crowd.",
  },
  {
    icon: BookOpen,
    title: "Interview Preparation",
    description: "Mock interviews, STAR-method coaching, and real feedback to help you walk in confident.",
  },
  {
    icon: TrendingUp,
    title: "Career Roadmap",
    description: "Clarity on your next steps with a personalised growth plan aligned to your ambitions.",
  },
];

const steps = [
  { step: "01", title: "Intro Session", description: "A free 30-minute session to understand your background and career goals." },
  { step: "02", title: "Assessment", description: "Skills gap analysis, strengths mapping, and priority-setting for your journey." },
  { step: "03", title: "Coaching Program", description: "Structured sessions covering resume, interview prep, networking, and mindset." },
  { step: "04", title: "Ongoing Support", description: "Continued check-ins until you land the role you deserve." },
];

export default function CareerCoachingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F6F6F6]">
      <PublicHeader />

      {/* Hero */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="mb-6 md:mb-0 flex-1">
              <div className="flex items-center gap-2 text-sm text-[#8A8A8A] mb-4">
                <a href="/" className="hover:text-[#FF2B2B]">Home</a>
                <ChevronRight className="h-4 w-4" />
                <a href="/services" className="hover:text-[#FF2B2B]">Services</a>
                <ChevronRight className="h-4 w-4" />
                <span className="text-[#FF2B2B] border border-[#FF2B2B] px-3 py-1 rounded-full">
                  Career Coaching
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-[#3A1F1F] mb-4">
                Career Coaching & Resume Review
              </h1>
              <p className="text-[#8A8A8A] max-w-lg text-lg">
                Expert guidance to help you present yourself effectively, ace interviews, and take control of your career trajectory.
              </p>
              <Button
                onClick={() => navigate("/jobseeker/signin")}
                className="mt-6 bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full px-8 py-5"
              >
                Book a Session <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center justify-center w-full md:w-auto">
              <div className="w-64 h-48 bg-gradient-to-br from-[#FF2B2B]/10 to-[#FF2B2B]/30 rounded-2xl flex items-center justify-center">
                <TrendingUp className="h-24 w-24 text-[#FF2B2B]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-[#F6F6F6] py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <span className="inline-block bg-[#FF2B2B] text-white px-4 py-1 rounded-full text-sm mb-4">
              WHAT WE OFFER
            </span>
            <h2 className="text-4xl font-bold text-[#3A1F1F] mb-4">Everything You Need to Land the Role</h2>
            <p className="text-[#8A8A8A] max-w-2xl mx-auto">
              From polishing your resume to walking you through mock interviews, our coaches have helped thousands advance their careers.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((b, i) => {
              const Icon = b.icon;
              return (
                <div key={i} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                  <div className="w-12 h-12 bg-[#FF2B2B]/10 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-[#FF2B2B]" />
                  </div>
                  <h3 className="text-lg font-bold text-[#3A1F1F] mb-2">{b.title}</h3>
                  <p className="text-[#8A8A8A] text-sm leading-relaxed">{b.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="bg-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <span className="inline-block bg-[#FF2B2B] text-white px-4 py-1 rounded-full text-sm mb-4">
              YOUR JOURNEY
            </span>
            <h2 className="text-4xl font-bold text-[#3A1F1F] mb-4">How Career Coaching Works</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {steps.map((s, i) => (
              <div key={i} className="text-center">
                <div className="w-14 h-14 bg-[#FF2B2B] text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {s.step}
                </div>
                <h3 className="font-bold text-[#3A1F1F] mb-2">{s.title}</h3>
                <p className="text-[#8A8A8A] text-sm">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What's included */}
      <section className="bg-[#F6F6F6] py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-[#3A1F1F] mb-3">What's Included</h2>
          </div>
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <ul className="space-y-4">
              {[
                "Free 30-minute introductory coaching call",
                "Professional resume rewrite and formatting",
                "LinkedIn profile optimisation",
                "Cover letter templates and customization guidance",
                "3 mock interview sessions with detailed feedback",
                "Salary negotiation coaching",
                "Personal branding strategy",
                "Job search strategy and networking plan",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-[#FF2B2B] flex-shrink-0" />
                  <span className="text-[#3A1F1F]">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-[#5B5B72] py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
            {[
              { value: "8K+", label: "Candidates Coached" },
              { value: "89%", label: "Land Interviews" },
              { value: "2x", label: "Avg. Salary Increase" },
              { value: "4.9★", label: "Coach Rating" },
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-4xl font-bold mb-2">{stat.value}</div>
                <div className="text-white/80 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4 text-center">
          <Star className="h-10 w-10 text-[#FF2B2B] mx-auto mb-4" />
          <h2 className="text-3xl md:text-4xl font-bold text-[#3A1F1F] mb-4">
            Your Next Role Starts Here
          </h2>
          <p className="text-[#8A8A8A] mb-8 max-w-xl mx-auto">
            Stop guessing and start getting results. Our coaches give you the edge to stand out and succeed.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button
              onClick={() => navigate("/jobseeker/signin")}
              className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full px-8 py-5"
            >
              Book a Coach <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              onClick={() => navigate("/services")}
              variant="outline"
              className="border-[#FF2B2B] text-[#FF2B2B] hover:bg-[#FF2B2B] hover:text-white rounded-full px-8 py-5"
            >
              View All Services
            </Button>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
