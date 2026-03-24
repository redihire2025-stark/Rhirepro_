import { TrendingUp, CheckCircle2, ArrowRight, Megaphone, Palette, Globe, BarChart3, Star } from "lucide-react";
import { Button } from "../../components/ui/button";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router";
import PublicHeader from "../../components/PublicHeader";
import PublicFooter from "../../components/PublicFooter";

const benefits = [
  {
    icon: Megaphone,
    title: "Compelling Employer Story",
    description: "We help you articulate your company's mission, values, and culture in a way that resonates with top talent.",
  },
  {
    icon: Palette,
    title: "Visual Brand Identity",
    description: "From careers pages to job ads, we ensure your brand looks polished and professional everywhere candidates see it.",
  },
  {
    icon: Globe,
    title: "Multi-Channel Presence",
    description: "Amplify your employer brand across LinkedIn, Glassdoor, job boards, and social media.",
  },
  {
    icon: BarChart3,
    title: "Measurable Impact",
    description: "Track brand awareness metrics, application rates, and candidate quality improvements over time.",
  },
];

const steps = [
  { step: "01", title: "Brand Audit", description: "We assess your current employer brand perception and identify gaps vs. competitors." },
  { step: "02", title: "Strategy Development", description: "Create a tailored employer branding strategy aligned with your hiring goals." },
  { step: "03", title: "Content & Campaigns", description: "Develop engaging content — videos, testimonials, job ads, and social posts." },
  { step: "04", title: "Launch & Optimise", description: "Roll out campaigns, track performance, and continuously refine your brand presence." },
];

export default function BrandingSupportPage() {
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
                  Branding Support
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-[#3A1F1F] mb-4">
                Employer Branding Support
              </h1>
              <p className="text-[#8A8A8A] max-w-lg text-lg">
                Build and promote your employer brand to attract the best talent. Stand out from competitors and make candidates excited to join your team.
              </p>
              <Button
                onClick={() => navigate("/recruiter/signin")}
                className="mt-6 bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full px-8 py-5"
              >
                Elevate Your Brand <ArrowRight className="ml-2 h-4 w-4" />
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
              WHAT WE DO
            </span>
            <h2 className="text-4xl font-bold text-[#3A1F1F] mb-4">Why Employer Branding Matters</h2>
            <p className="text-[#8A8A8A] max-w-2xl mx-auto">
              Companies with strong employer brands receive 50% more qualified applicants and reduce cost-per-hire significantly.
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
            <h2 className="text-4xl font-bold text-[#3A1F1F] mb-4">How We Build Your Brand</h2>
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
                "Employer brand audit and competitor analysis",
                "Employee Value Proposition (EVP) development",
                "Careers page design and copywriting",
                "Job ad templates and tone-of-voice guide",
                "LinkedIn company page optimisation",
                "Employee testimonial content creation",
                "Social media content calendar",
                "Brand performance analytics and monthly reporting",
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
              { value: "50%", label: "More Applicants" },
              { value: "3x", label: "Faster Time to Fill" },
              { value: "40%", label: "Lower Cost-per-Hire" },
              { value: "300+", label: "Brands Supported" },
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
            Make Talent Come to You
          </h2>
          <p className="text-[#8A8A8A] mb-8 max-w-xl mx-auto">
            A strong employer brand is your most powerful recruitment tool. Let us help you build it.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button
              onClick={() => navigate("/recruiter/signin")}
              className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full px-8 py-5"
            >
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
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
