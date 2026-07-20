import { Briefcase, CheckCircle2, ArrowRight, Cpu, Heart, Bell, BarChart3, Star } from "lucide-react";
import { Button } from "../../components/ui/button";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router";
import PublicHeader from "../../components/PublicHeader";
import PublicFooter from "../../components/PublicFooter";

const benefits = [
  {
    icon: Cpu,
    title: "AI-Powered Matching",
    description: "Smart algorithms analyse skills, experience, preferences, and culture fit to surface the best opportunities.",
  },
  {
    icon: Heart,
    title: "Curated for You",
    description: "No endless scrolling — receive a personalised shortlist of roles that truly match your profile.",
  },
  {
    icon: Bell,
    title: "Instant Alerts",
    description: "Get notified the moment a matching job goes live so you're always first to apply.",
  },
  {
    icon: BarChart3,
    title: "Match Score Insights",
    description: "Understand exactly why a job is a good fit with transparent compatibility scores and skill gap analysis.",
  },
];

const steps = [
  { step: "01", title: "Build Your Profile", description: "Add your skills, experience, preferences, location, and salary expectations." },
  { step: "02", title: "Smart Analysis", description: "Our algorithm analyses thousands of live roles against your profile in real-time." },
  { step: "03", title: "Receive Matches", description: "Get a ranked list of best-fit opportunities with match scores and insights." },
  { step: "04", title: "Apply with Confidence", description: "One-click applications with your saved profile, directly to screened employers." },
];

export default function JobMatchingPage() {
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
                  Job Matching
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-[#3A1F1F] mb-4">
                Job Matching
              </h1>
              <p className="text-[#8A8A8A] max-w-lg text-lg">
                AI-powered matching that connects job seekers with the right opportunities based on skills, experience, culture fit, and career aspirations.
              </p>
              <Button
                onClick={() => navigate("/signin?role=jobseeker")}
                className="mt-6 bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full px-8 py-5"
              >
                Find My Match <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center justify-center w-full md:w-auto">
              <img
                src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=500&q=80"
                alt="Job Matching"
                className="w-64 h-48 rounded-2xl object-cover shadow-md"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-[#F6F6F6] py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <span className="inline-block bg-[#FF2B2B] text-white px-4 py-1 rounded-full text-sm mb-4">
              HOW WE MATCH
            </span>
            <h2 className="text-4xl font-bold text-[#3A1F1F] mb-4">Smarter Matches, Better Outcomes</h2>
            <p className="text-[#8A8A8A] max-w-2xl mx-auto">
              Our matching engine goes beyond keywords — it understands context, trajectory, and what makes you thrive.
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
              THE PROCESS
            </span>
            <h2 className="text-4xl font-bold text-[#3A1F1F] mb-4">Your Path to the Right Role</h2>
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
            <h2 className="text-3xl font-bold text-[#3A1F1F] mb-3">Platform Features</h2>
          </div>
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <ul className="space-y-4">
              {[
                "AI-powered job compatibility scoring",
                "Skills gap analysis per role",
                "Culture and work-style fit indicators",
                "Real-time job alerts via email and push notifications",
                "One-click smart applications",
                "Application status tracking dashboard",
                "Recruiter direct messaging",
                "Salary range transparency per listing",
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
              { value: "50K+", label: "Active Job Seekers" },
              { value: "92%", label: "Match Accuracy" },
              { value: "7 Days", label: "Avg. Time to Offer" },
              { value: "10K+", label: "Live Job Listings" },
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
            Stop Searching. Start Matching.
          </h2>
          <p className="text-[#8A8A8A] mb-8 max-w-xl mx-auto">
            Create your free profile and let our AI surface the opportunities that are truly right for you.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
             <Button
              onClick={() => navigate("/signup?role=jobseeker")}
              className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full px-8 py-5"
            >
              Create Profile <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              onClick={() => navigate("/jobs")}
              variant="outline"
              className="border-[#FF2B2B] text-[#FF2B2B] hover:bg-[#FF2B2B] hover:text-white rounded-full px-8 py-5"
            >
              Browse Jobs
            </Button>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
