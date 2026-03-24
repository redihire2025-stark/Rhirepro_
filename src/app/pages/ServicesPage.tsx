import { ChevronRight, ArrowRight, Users, Award, Briefcase, TrendingUp, CheckCircle2, Clock, Star } from "lucide-react";
import { Button } from "../components/ui/button";
import { useNavigate } from "react-router";
import PublicHeader from "../components/PublicHeader";
import PublicFooter from "../components/PublicFooter";

export default function ServicesPage() {
  const navigate = useNavigate();

  const services = [
    {
      id: "talent-sourcing",
      page: "/services/talent-sourcing",
      title: "Talent Sourcing",
      description: "Connect with top talent across industries to find the perfect candidates for your organization and build high-performing teams.",
      icon: Users
    },
    {
      id: "executive-search",
      page: "/services/executive-search",
      title: "Executive Search",
      description: "Specialized recruitment for senior leadership positions that drive your company forward with strategic vision and expertise.",
      icon: Award
    },
    {
      id: "job-matching",
      page: "/services/job-matching",
      title: "Job Matching",
      description: "AI-powered algorithms match candidates with opportunities based on skills, experience, culture fit, and career goals.",
      icon: Briefcase
    },
    {
      id: "employer-branding",
      page: "/services/branding-support",
      title: "Employer Branding",
      description: "Build and promote your employer brand to attract the best talent in your industry and stand out from competitors.",
      icon: TrendingUp
    },
    {
      id: "career-coaching",
      page: "/services/career-coaching",
      title: "Career Coaching & Resume Review",
      description: "Expert guidance to help candidates present themselves effectively and maximize their career potential.",
      icon: CheckCircle2
    },
    {
      id: "contract-hiring",
      page: "/services/project-based-hiring",
      title: "Contract & Project-Based Hiring",
      description: "Flexible hiring solutions for temporary and project-based needs with vetted professionals ready to contribute.",
      icon: Clock
    },
  ];

  const pricingPlans = [
    {
      name: "Basic Plan",
      price: "₹320",
      period: "month",
      features: [
        "10 daily job posts",
        "Basic Analytics",
        "Email Support",
        "1 Team Member"
      ],
      popular: false
    },
    {
      name: "Standard Plan",
      price: "₹950",
      period: "month",
      features: [
        "50 daily job posts",
        "100+ job templates",
        "Advanced Analytics",
        "Priority Support",
        "5 Team Members"
      ],
      popular: true
    },
    {
      name: "Premium Plan",
      price: "₹2200",
      period: "month",
      features: [
        "Unlimited job posts",
        "Advanced hiring tools",
        "Dedicated Account Manager",
        "24/7 Premium Support",
        "Unlimited Team Members"
      ],
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-[#F6F6F6]">
      <PublicHeader />

      {/* Hero Section */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="mb-6 md:mb-0 flex-1">
              <div className="flex items-center gap-2 text-sm text-[#8A8A8A] mb-4">
                <a href="/" className="hover:text-[#FF2B2B]">Home</a>
                <ChevronRight className="h-4 w-4" />
                <span className="text-[#FF2B2B] border border-[#FF2B2B] px-3 py-1 rounded-full">
                  Services
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-[#3A1F1F] mb-4">
                Expert Services for Talent & Employers
              </h1>
              <p className="text-[#8A8A8A] max-w-lg">
                Discover our comprehensive range of recruitment services designed to connect talent with opportunity.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-300 rounded-2xl h-40 w-48"></div>
              <div className="bg-gray-400 rounded-2xl h-32 w-32 mt-8"></div>
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
            {services.map((service, index) => {
              const Icon = service.icon;
              return (
                <div
                  key={index}
                  id={service.id}
                  onClick={() => navigate(service.page)}
                  className="bg-white rounded-2xl p-8 shadow-md hover:shadow-xl transition-all border border-gray-100 flex items-start gap-6 cursor-pointer"
                >
                  <div className="bg-gray-200 rounded-xl h-32 w-40 flex-shrink-0"></div>
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
            {pricingPlans.map((plan, index) => (
              <div 
                key={index} 
                className={`bg-white rounded-2xl p-8 shadow-md hover:shadow-xl transition-shadow border ${
                  plan.popular ? 'border-[#FF2B2B] border-2' : 'border-gray-200'
                }`}
              >
                <h3 className="text-2xl font-bold text-[#3A1F1F] mb-2">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-5xl font-bold text-[#3A1F1F]">{plan.price}</span>
                  <span className="text-[#8A8A8A]">/{plan.period}</span>
                </div>
                <Button
                  onClick={() => navigate("/recruiter/plan-details")}
                  className={`w-full rounded-full py-6 mb-6 ${
                    plan.popular
                      ? 'bg-[#FF2B2B] hover:bg-[#e02525] text-white'
                      : 'bg-white border-2 border-[#FF2B2B] text-[#FF2B2B] hover:bg-[#FF2B2B] hover:text-white'
                  }`}
                >
                  Choose Plan <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
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
            <div className="bg-gray-300 rounded-2xl h-96"></div>
            <div className="flex items-center">
              <div className="bg-white rounded-2xl p-8 shadow-md border border-gray-100">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-[#8A8A8A] mb-6">
                  "RhirePro helped me land my dream job in just 2 weeks. The process was seamless and the support team was incredible!"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#FF2B2B] rounded-full"></div>
                  <div>
                    <p className="font-bold text-[#3A1F1F]">Sarah Johnson</p>
                    <p className="text-sm text-[#8A8A8A]">Software Engineer</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}