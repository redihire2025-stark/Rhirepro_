import { Users, CheckCircle2, ArrowRight, Search, Target, BarChart3, Globe, Star } from "lucide-react";
import { Button } from "../../components/ui/button";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router";
import PublicHeader from "../../components/PublicHeader";
import PublicFooter from "../../components/PublicFooter";

const benefits = [
  {
    icon: Search,
    title: "Wide Talent Pool",
    description: "Access a vast database of pre-screened candidates across all industries and experience levels.",
  },
  {
    icon: Target,
    title: "Precision Matching",
    description: "Our experts identify candidates who align with your company culture, skill requirements, and growth goals.",
  },
  {
    icon: BarChart3,
    title: "Data-Driven Insights",
    description: "Leverage market intelligence and analytics to make informed hiring decisions faster.",
  },
  {
    icon: Globe,
    title: "Multi-Channel Reach",
    description: "We source talent through job boards, social networks, referrals, and our proprietary network.",
  },
];

const steps = [
  { step: "01", title: "Discovery Call", description: "We understand your hiring needs, culture, and ideal candidate profile." },
  { step: "02", title: "Talent Search", description: "Our team actively sources and screens candidates from multiple channels." },
  { step: "03", title: "Candidate Shortlist", description: "You receive a curated list of qualified candidates with detailed profiles." },
  { step: "04", title: "Interview & Hire", description: "We coordinate interviews and support the offer process through to onboarding." },
];

export default function TalentSourcingPage() {
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
                  Talent Sourcing
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-[#3A1F1F] mb-4">
                Talent Sourcing
              </h1>
              <p className="text-[#8A8A8A] max-w-lg text-lg">
                Connect with top talent across industries. We find the right people so you can build high-performing teams that drive real results.
              </p>
              <Button
                onClick={() => navigate("/signin")}
                className="mt-6 bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full px-8 py-5"
              >
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center justify-center w-full md:w-auto">
              <div className="w-64 h-48 bg-gradient-to-br from-[#FF2B2B]/10 to-[#FF2B2B]/30 rounded-2xl flex items-center justify-center">
                <Users className="h-24 w-24 text-[#FF2B2B]" />
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
              WHY CHOOSE US
            </span>
            <h2 className="text-4xl font-bold text-[#3A1F1F] mb-4">Why Our Talent Sourcing Works</h2>
            <p className="text-[#8A8A8A] max-w-2xl mx-auto">
              We combine technology with human expertise to deliver candidates who don't just fill roles — they elevate teams.
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

      {/* How it works */}
      <section className="bg-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <span className="inline-block bg-[#FF2B2B] text-white px-4 py-1 rounded-full text-sm mb-4">
              HOW IT WORKS
            </span>
            <h2 className="text-4xl font-bold text-[#3A1F1F] mb-4">Our Sourcing Process</h2>
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
                "Dedicated talent sourcing specialist",
                "Multi-platform candidate search (LinkedIn, job boards, referrals)",
                "Resume screening and shortlisting",
                "Initial candidate assessments",
                "Weekly progress reports",
                "Interview scheduling support",
                "Salary benchmarking insights",
                "Post-hire follow-up for 30 days",
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
              { value: "15K+", label: "Candidates Sourced" },
              { value: "98%", label: "Client Satisfaction" },
              { value: "12 Days", label: "Avg. Time to Hire" },
              { value: "500+", label: "Companies Served" },
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
            Ready to Build Your Dream Team?
          </h2>
          <p className="text-[#8A8A8A] mb-8 max-w-xl mx-auto">
            Let our talent sourcing experts find the right candidates for your open roles — fast.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button
              onClick={() => navigate("/recruiter/signin")}
              className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full px-8 py-5"
            >
              Start Hiring <ArrowRight className="ml-2 h-4 w-4" />
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
