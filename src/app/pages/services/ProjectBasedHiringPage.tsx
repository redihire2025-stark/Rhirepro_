import { Clock, CheckCircle2, ArrowRight, Zap, RefreshCw, DollarSign, Users, Star } from "lucide-react";
import { Button } from "../../components/ui/button";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router";
import PublicHeader from "../../components/PublicHeader";
import PublicFooter from "../../components/PublicFooter";

const benefits = [
  {
    icon: Zap,
    title: "Fast Deployment",
    description: "Get vetted professionals on the ground within days, not weeks — built for urgent project needs.",
  },
  {
    icon: RefreshCw,
    title: "Flexible Engagements",
    description: "Scale your team up or down based on project phases without long-term commitments.",
  },
  {
    icon: DollarSign,
    title: "Cost-Effective",
    description: "Pay only for the talent you need, when you need it — no full-time overhead.",
  },
  {
    icon: Users,
    title: "Pre-Vetted Talent",
    description: "All contractors and project professionals are thoroughly assessed for skills and reliability.",
  },
];

const steps = [
  { step: "01", title: "Project Brief", description: "Share your project scope, timeline, required skills, and team size." },
  { step: "02", title: "Talent Matching", description: "We match you with vetted professionals available for your timeline." },
  { step: "03", title: "Rapid Onboarding", description: "Streamlined contracts and onboarding to get work started quickly." },
  { step: "04", title: "Ongoing Support", description: "We remain your point of contact for replacements, extensions, and wrap-up." },
];

const useCases = [
  "Product launches and feature sprints",
  "Software development and QA projects",
  "Marketing campaigns and content creation",
  "Data migration and IT infrastructure",
  "Seasonal business peaks",
  "Interim management coverage",
];

export default function ProjectBasedHiringPage() {
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
                  Project-Based Hiring
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-[#3A1F1F] mb-4">
                Project-Based Hiring
              </h1>
              <p className="text-[#8A8A8A] max-w-lg text-lg">
                Flexible, on-demand talent for your projects and contracts. Get skilled professionals exactly when you need them — without the cost of full-time hiring.
              </p>
              <Button
                onClick={() => navigate("/signin?role=recruiter")}
                className="mt-6 bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full px-8 py-5"
              >
                Find Project Talent <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center justify-center w-full md:w-auto">
              <img
                src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=500&q=80"
                alt="Contract & Project Hiring"
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
              WHY IT WORKS
            </span>
            <h2 className="text-4xl font-bold text-[#3A1F1F] mb-4">Hire for the Work, Not Forever</h2>
            <p className="text-[#8A8A8A] max-w-2xl mx-auto">
              Project-based hiring gives you the agility to respond to business needs without long-term overhead.
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
              HOW IT WORKS
            </span>
            <h2 className="text-4xl font-bold text-[#3A1F1F] mb-4">From Brief to Billable in Days</h2>
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

      {/* Use cases + inclusions */}
      <section className="bg-[#F6F6F6] py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <h3 className="text-2xl font-bold text-[#3A1F1F] mb-6">Common Use Cases</h3>
              <ul className="space-y-4">
                {useCases.map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-[#FF2B2B] flex-shrink-0" />
                    <span className="text-[#3A1F1F]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <h3 className="text-2xl font-bold text-[#3A1F1F] mb-6">What's Included</h3>
              <ul className="space-y-4">
                {[
                  "Project scope analysis and talent planning",
                  "Rapid candidate sourcing and screening",
                  "Contract and compliance management",
                  "Onboarding coordination",
                  "Performance monitoring throughout engagement",
                  "Easy extension or early termination process",
                  "Replacement guarantee within SLA",
                  "Dedicated account manager",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-[#FF2B2B] flex-shrink-0" />
                    <span className="text-[#3A1F1F]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-[#5B5B72] py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
            {[
              { value: "3 Days", label: "Avg. Deployment Time" },
              { value: "2K+", label: "Projects Staffed" },
              { value: "97%", label: "On-Time Delivery" },
              { value: "200+", label: "Skills Covered" },
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
            Got a Project? We've Got the Talent.
          </h2>
          <p className="text-[#8A8A8A] mb-8 max-w-xl mx-auto">
            Tell us about your project and we'll match you with the right professionals — ready to start immediately.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
             <Button
              onClick={() => navigate("/signin?role=recruiter")}
              className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full px-8 py-5"
            >
              Post a Project <ArrowRight className="ml-2 h-4 w-4" />
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
