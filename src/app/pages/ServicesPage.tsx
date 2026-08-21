import { useState } from "react";
import { ChevronRight, ArrowRight, Users, Award, Briefcase, TrendingUp, CheckCircle2, Clock, Star } from "lucide-react";
import { Button } from "../components/ui/button";
import { useNavigate, Link } from "react-router";
import PublicHeader from "../components/PublicHeader";
import PublicFooter from "../components/PublicFooter";
import { PLANS, calculateGst } from "../../lib/plans";

const fallbackServices = [
  {
    id: "talent-sourcing",
    page: "/services/talent-sourcing",
    title: "Talent Sourcing",
    description: "Connect with top talent across industries to find the perfect candidates for your organization and build high-performing teams.",
    icon: "Users",
    image: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=500&q=80"
  },
  {
    id: "executive-search",
    page: "/services/executive-search",
    title: "Executive Search",
    description: "Specialized recruitment for senior leadership positions that drive your company forward with strategic vision and expertise.",
    icon: "Award",
    image: "https://images.unsplash.com/photo-1580894732444-8ecded7900cd?w=500&q=80"
  },
  {
    id: "job-matching",
    page: "/services/job-matching",
    title: "Job Matching",
    description: "AI-powered algorithms match candidates with opportunities based on skills, experience, culture fit, and career goals.",
    icon: "Briefcase",
    image: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=500&q=80"
  },
  {
    id: "employer-branding",
    page: "/services/branding-support",
    title: "Employer Branding",
    description: "Build and promote your employer brand to attract the best talent in your industry and stand out from competitors.",
    icon: "TrendingUp",
    image: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=500&q=80"
  },
  {
    id: "career-coaching",
    page: "/services/career-coaching",
    title: "Career Coaching & Resume Review",
    description: "Expert guidance to help candidates present themselves effectively and maximize their career potential.",
    icon: "CheckCircle2",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&q=80"
  },
  {
    id: "contract-hiring",
    page: "/services/project-based-hiring",
    title: "Contract & Project-Based Hiring",
    description: "Flexible hiring solutions for temporary and project-based needs with vetted professionals ready to contribute.",
    icon: "Clock",
    image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=500&q=80"
  }
];

export default function ServicesPage() {
  const navigate = useNavigate();
  const [servicesList] = useState<any[]>(fallbackServices);
  const [plansList] = useState<any[]>(PLANS);
  const [testimonialsList] = useState<any[]>([
    {
      name: "Sarah Johnson",
      role: "Software Engineer",
      rating: 5,
      comment: "RhirePro helped me land my dream job in just 2 weeks. The process was seamless and the support team was incredible!"
    }
  ]);

  // The services, plans and testimonials endpoints lived on a FastAPI service
  // that was never deployed, so these three calls always failed against
  // http://localhost:8000 in production and the page fell back to the local
  // constants below anyway. The Python simply returned hardcoded lists, so the
  // round-trip added nothing but console noise - the local data is the source
  // of truth now.

  const iconMap: Record<string, React.ComponentType<any>> = {
    Users,
    Award,
    Briefcase,
    TrendingUp,
    CheckCircle2,
    Clock,
    Star
  };

  return (
    <div className="min-h-screen bg-[#F6F6F6]">
      <PublicHeader />

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-white to-[#F6F6F6] py-16 animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="mb-6 md:mb-0 flex-1 transform transition-all duration-500">
              <div className="flex items-center gap-2 text-sm text-[#8A8A8A] mb-4">
                <Link to="/" className="hover:text-[#FF2B2B] transition-colors">Home</Link>
                <ChevronRight className="h-4 w-4 text-[#8A8A8A]" />
                <span className="text-[#FF2B2B] bg-[#FF2B2B]/10 border border-[#FF2B2B]/30 px-3 py-1 rounded-full font-medium">
                  Services
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-[#3A1F1F] mb-4 leading-tight">
                Expert Services for Talent & Employers
              </h1>
              <p className="text-[#8A8A8A] max-w-lg text-lg">
                Discover our comprehensive range of recruitment services designed to connect talent with opportunity.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <img
                src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&q=80"
                alt="Expert Services"
                className="rounded-2xl h-40 w-48 object-cover shadow-lg transform hover:scale-105 transition-transform duration-300"
              />
              <img
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&q=80"
                alt="Recruitment Team"
                className="rounded-2xl h-32 w-32 mt-8 object-cover shadow-lg transform hover:scale-105 transition-transform duration-300"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="bg-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <span className="inline-block bg-[#FF2B2B] text-white px-4 py-1 rounded-full text-sm mb-4">
              SERVICES
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-[#3A1F1F] mb-4">
              Connecting Ambition with Opportunity
            </h2>
            <p className="text-lg text-[#8A8A8A] max-w-3xl mx-auto">
              We help job seekers and recruiters make the right connections that drive success and growth.
            </p>
          </div>
          
          <div className="space-y-6 max-w-4xl mx-auto">
            {servicesList.map((service, index) => {
              const Icon = iconMap[service.icon] || Briefcase;
              return (
                <div
                  key={index}
                  id={service.id}
                  onClick={() => navigate(service.page)}
                  className="bg-white rounded-2xl p-8 shadow-md hover:shadow-xl transition-all border border-gray-100 flex items-start gap-6 cursor-pointer"
                >
                  <img
                    src={service.image}
                    alt={service.title}
                    className="rounded-xl h-32 w-40 object-cover flex-shrink-0"
                  />
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-[#3A1F1F] mb-3">{service.title}</h3>
                    <p className="text-[#8A8A8A] leading-relaxed">{service.description}</p>
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
            Join thousands of professionals who have found their dream jobs through RhirePro
          </p>
          <Button asChild className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full px-8 py-6 text-lg cursor-pointer">
            <Link to="/jobs" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
              Explore <ArrowRight className="ml-2 h-5 w-5 inline-block" />
            </Link>
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
            {plansList.map((plan, index) => (
              <div 
                key={index} 
                className={`bg-white rounded-2xl p-8 shadow-md hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 border-2 ${
                  plan.popular ? 'border-[#FF2B2B]' : 'border-gray-200 hover:border-[#FF2B2B]/60'
                }`}
              >
                <h3 className="text-2xl font-bold text-[#3A1F1F] mb-2">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-5xl font-bold text-[#3A1F1F]">₹{plan.price}</span>
                  <span className="text-[#8A8A8A]">/{plan.period}</span>
                  <p className="mt-1 text-xs text-[#8A8A8A]">+ GST ₹{calculateGst(plan.price)}</p>
                </div>
                <Button
                  onClick={() => navigate(`/recruiter/plan-details?plan=${plan.id}`)}
                  className={`w-full rounded-full py-6 mb-6 ${
                    plan.popular
                      ? 'bg-[#FF2B2B] hover:bg-[#e02525] text-white'
                      : 'bg-white border-2 border-[#FF2B2B] text-[#FF2B2B] hover:bg-[#FF2B2B] hover:text-white'
                  }`}
                >
                  Choose Plan <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <ul className="space-y-3">
                  {plan.features.map((feature: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-[#FF2B2B] flex-shrink-0 mt-0.5" />
                      <span className="text-[#8A8A8A]">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Smarter Work Banner */}
      <section className="bg-[#FF2B2B] py-12 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-8 text-white text-2xl md:text-4xl font-bold whitespace-nowrap">
            <span>Smarter. Work Better. Hire Smarter. Work Better. Hire Smarter. Work Better. Hire Smarter.</span>
          </div>
        </div>
      </section>

      {/* Testimonials Preview */}
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
          
          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <img
              src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&q=80"
              alt="Candidate Success"
              className="rounded-2xl h-96 w-full object-cover shadow-md"
            />
            <div className="flex items-center">
              {testimonialsList.length > 0 && (
                <div className="bg-white rounded-2xl p-8 shadow-md border border-gray-100 w-full">
                  <div className="flex mb-4">
                    {[...Array(testimonialsList[0].rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-[#8A8A8A] mb-6">
                    "{testimonialsList[0].comment}"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#FF2B2B] rounded-full flex items-center justify-center font-bold text-white text-lg">
                      {testimonialsList[0].name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-[#3A1F1F]">{testimonialsList[0].name}</p>
                      <p className="text-sm text-[#8A8A8A]">{testimonialsList[0].role}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
