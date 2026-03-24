import { Award, CheckCircle2, ArrowRight, Shield, Eye, Handshake, Clock, Star } from "lucide-react";
import { Button } from "../../components/ui/button";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router";
import PublicHeader from "../../components/PublicHeader";
import PublicFooter from "../../components/PublicFooter";

const benefits = [
  {
    icon: Shield,
    title: "Confidential Process",
    description: "We handle sensitive leadership searches with complete discretion, protecting both client and candidate.",
  },
  {
    icon: Eye,
    title: "Deep Market Visibility",
    description: "Access passive candidates who aren't actively job seeking but are the perfect fit for senior roles.",
  },
  {
    icon: Handshake,
    title: "Executive-Level Expertise",
    description: "Our consultants have placed C-suite, VP, and Director-level talent across diverse industries.",
  },
  {
    icon: Clock,
    title: "Efficient Timeline",
    description: "Structured milestones ensure a focused search that respects your business timelines and priorities.",
  },
];

const steps = [
  { step: "01", title: "Role Definition", description: "We partner with you to define leadership competencies, culture fit, and strategic vision." },
  { step: "02", title: "Market Mapping", description: "In-depth research to identify and qualify top executives in your sector." },
  { step: "03", title: "Discreet Outreach", description: "Confidential engagement with shortlisted candidates on your behalf." },
  { step: "04", title: "Selection & Onboarding", description: "Assessment, reference checks, offer negotiation, and transition support." },
];

export default function ExecutiveSearchPage() {
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
                  Executive Search
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-[#3A1F1F] mb-4">
                Executive Search
              </h1>
              <p className="text-[#8A8A8A] max-w-lg text-lg">
                Specialized recruitment for senior leadership positions. We identify and attract executives who drive strategic vision, inspire teams, and deliver measurable results.
              </p>
              <Button
                onClick={() => navigate("/signin")}
                className="mt-6 bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full px-8 py-5"
              >
                Find Leaders <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center justify-center w-full md:w-auto">
              <div className="w-64 h-48 bg-gradient-to-br from-[#FF2B2B]/10 to-[#FF2B2B]/30 rounded-2xl flex items-center justify-center">
                <Award className="h-24 w-24 text-[#FF2B2B]" />
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
              OUR ADVANTAGE
            </span>
            <h2 className="text-4xl font-bold text-[#3A1F1F] mb-4">Why Leaders Choose RhirePro</h2>
            <p className="text-[#8A8A8A] max-w-2xl mx-auto">
              Executive hiring is high-stakes. Our dedicated search practice ensures you get the right leader, not just a fast hire.
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
              OUR PROCESS
            </span>
            <h2 className="text-4xl font-bold text-[#3A1F1F] mb-4">The Executive Search Journey</h2>
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
                "Senior consultant assigned to your search",
                "Comprehensive role and competency brief",
                "Confidential market mapping and candidate identification",
                "Executive-level candidate engagement and qualification",
                "Structured interview process design",
                "Reference and background verification",
                "Offer negotiation and facilitation",
                "90-day post-placement success review",
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
              { value: "500+", label: "Executives Placed" },
              { value: "95%", label: "Retention Rate at 12m" },
              { value: "28 Days", label: "Avg. Search Duration" },
              { value: "40+", label: "Industries Covered" },
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
            Find Your Next Great Leader
          </h2>
          <p className="text-[#8A8A8A] mb-8 max-w-xl mx-auto">
            Partner with RhirePro for a discreet, thorough executive search that transforms your leadership team.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button
              onClick={() => navigate("/recruiter/signin")}
              className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full px-8 py-5"
            >
              Start a Search <ArrowRight className="ml-2 h-4 w-4" />
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
