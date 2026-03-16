import { useState } from "react";
import { Menu, MapPin, DollarSign, Clock, ChevronRight, Facebook, Instagram, Twitter, Bell, Star, ArrowRight, Briefcase, Users } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "../components/ui/sheet";
import { useNavigate, useParams } from "react-router";
import logoImage from "../../logo/logo.png";

export default function JobDetailPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [email, setEmail] = useState("");
  const navigate = useNavigate();
  const { id } = useParams();

  // Sample job data (would come from API/database in real app)
  const currentJob = {
    id: 1,
    title: "Graphic Designer",
    company: "Verified Company",
    location: "Austin, TX",
    salary: "$85,000 - $95,000",
    type: "Full-time",
    experience: "2 years Min",
    description: "We are seeking a creative and detail-oriented Graphic Designer to join our team in Austin. As a Graphic Designer, you will play a key role in shaping the visual identity of our company. You'll be responsible for designing impactful print media, creating engaging digital content and ensuring brand consistency. The ideal candidate is passionate about design, highly collaborative, and capable of turning concepts into compelling visual narratives that inspire and engage.",
    responsibilities: [
      "Design visual content for social media, websites, marketing materials, and print campaigns.",
      "Collaborate with the marketing, product, and content teams to develop cohesive branding.",
      "Translate ideas about brand tone, look, and feel into impactful ideas to bring them to life.",
      "Maintain consistency in style, fonts, color schemes, and messaging across all materials.",
      "Prepare and package final designs for digital and print publication."
    ],
    qualifications: [
      "Proven experience as a Graphic Designer or in a similar creative role.",
      "Proficiency in Adobe Creative Suite (Photoshop, Illustrator, InDesign).",
      "Strong understanding of typography, color theory, and layout design.",
      "Excellent communication skills and the ability to meet deadlines.",
      "Attention to detail and commitment to producing polished, professional work.",
      "A portfolio showcasing relevant design projects."
    ],
    additionalInfo: "Let me know if you want this job description tailored to a specific industry (such as tech, fashion, or marketing), or if you need a version using a different layout or presentation."
  };

  const relatedJobs = [
    {
      id: 2,
      title: "Data Analyst",
      company: "Verified Company",
      location: "New York, NY",
      salary: "$70,000 - $90,000",
      type: "Full-time",
      description: "Analyze large datasets to extract insights, build reports and dashboards to support business decisions."
    },
    {
      id: 3,
      title: "Digital Marketing",
      company: "Content Solutions",
      location: "Remote",
      salary: "$70,000 - $85,000",
      type: "Full-time",
      description: "Plan and execute digital marketing strategies. Manage SEO/SEM, social media, and content campaigns."
    }
  ];

  return (
    <div className="min-h-screen bg-[#F6F6F6]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <img src={logoImage} alt="RhirePro Logo" className="w-10 h-10" />
            <div className="text-xl font-bold text-[#3A1F1F]">
              Rhire<span className="text-[#FF2B2B]">Pro</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <button onClick={() => navigate('/')} className="text-[#3A1F1F] hover:text-[#FF2B2B] transition-colors">
              Home
            </button>
            <button onClick={() => navigate('/')} className="text-[#3A1F1F] hover:text-[#FF2B2B] transition-colors">
              About Us
            </button>
            <Button
              onClick={() => navigate('/jobs')}
              className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full px-6"
            >
              Jobs
            </Button>
            <button onClick={() => navigate('/')} className="text-[#3A1F1F] hover:text-[#FF2B2B] transition-colors">
              Contact Us
            </button>
          </nav>

          {/* Hamburger Menu */}
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <button className="md:ml-4 p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Menu className="h-6 w-6 text-[#3A1F1F]" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 bg-white">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <SheetDescription className="sr-only">
                Sign in options for job seekers and recruiters
              </SheetDescription>
              <div className="flex flex-col gap-6 mt-8">
                <h3 className="text-xl font-semibold text-[#3A1F1F]">Welcome to RhirePro</h3>
                <Button 
                  className="w-full bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full"
                  onClick={() => navigate('/signin')}
                >
                  Job Seeker Sign In
                </Button>
                <Button 
                  className="w-full bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full"
                  onClick={() => navigate('/signin')}
                >
                  Recruiter Sign In
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="mb-6 md:mb-0 flex-1">
              <div className="flex items-center gap-2 text-sm text-[#8A8A8A] mb-4">
                <a href="/jobs" className="hover:text-[#FF2B2B]">Jobs</a>
                <ChevronRight className="h-4 w-4" />
                <span className="text-[#FF2B2B] border border-[#FF2B2B] px-3 py-1 rounded-full">
                  Job Detail
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-[#3A1F1F] mb-4">
                Job Overview and Requirements
              </h1>
              <p className="text-[#8A8A8A] max-w-lg">
                View detailed information about this position's requirements and how to apply. Take the next step in your career today.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-300 rounded-2xl h-48 w-56"></div>
              <div className="bg-gray-400 rounded-2xl h-40 w-40 mt-8"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Job Details Section */}
      <section className="bg-[#ECECF4] py-16">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Sidebar - Related Jobs */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-2xl p-6 shadow-md">
                <h3 className="text-xl font-bold text-[#3A1F1F] mb-4">Featured Jobs</h3>
                <div className="space-y-4">
                  {relatedJobs.map((job) => (
                    <div 
                      key={job.id}
                      className="border-b border-gray-100 pb-4 last:border-0 cursor-pointer hover:bg-gray-50 p-3 rounded-xl transition-colors"
                      onClick={() => navigate(`/job/${job.id}`)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-bold text-[#3A1F1F] mb-1">{job.title}</h4>
                          <p className="text-sm text-[#8A8A8A] mb-2">{job.description.substring(0, 60)}...</p>
                        </div>
                        <div className="w-3 h-3 bg-[#FF2B2B] rounded-full flex-shrink-0"></div>
                      </div>
                      <div className="space-y-1 text-xs text-[#8A8A8A] mb-3">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-[#FF2B2B]" />
                          {job.location}
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-[#FF2B2B]" />
                          {job.salary}
                        </div>
                      </div>
                      <Button className="w-full bg-white border border-[#FF2B2B] text-[#FF2B2B] hover:bg-[#FF2B2B] hover:text-white rounded-full text-sm py-2">
                        Apply Now
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-md">
                <h3 className="text-xl font-bold text-[#3A1F1F] mb-4">Content Solutions</h3>
                <h4 className="font-bold text-[#3A1F1F] mb-2">Digital Marketing</h4>
                <p className="text-sm text-[#8A8A8A] mb-4">
                  Plan and execute digital marketing strategies. Manage SEO/SEM, social media, and content campaigns.
                </p>
                <div className="space-y-2 text-sm text-[#8A8A8A] mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#FF2B2B]" />
                    $70,000 - $85,000
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-[#FF2B2B]" />
                    8 years Min
                  </div>
                </div>
                <Button className="w-full bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full">
                  Apply Now
                </Button>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Job Header Card */}
              <div className="bg-white rounded-2xl p-8 shadow-md">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="inline-block bg-[#FF2B2B] text-white px-3 py-1 rounded-full text-sm">
                        {currentJob.company}
                      </span>
                      <div className="w-3 h-3 bg-[#FF2B2B] rounded-full"></div>
                    </div>
                    <h2 className="text-3xl font-bold text-[#3A1F1F] mb-4">{currentJob.title}</h2>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div className="flex items-center gap-3 text-[#8A8A8A]">
                    <MapPin className="h-5 w-5 text-[#FF2B2B]" />
                    <div>
                      <p className="text-xs">Location</p>
                      <p className="font-semibold text-[#3A1F1F]">{currentJob.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[#8A8A8A]">
                    <DollarSign className="h-5 w-5 text-[#FF2B2B]" />
                    <div>
                      <p className="text-xs">Salary</p>
                      <p className="font-semibold text-[#3A1F1F]">{currentJob.salary}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[#8A8A8A]">
                    <Clock className="h-5 w-5 text-[#FF2B2B]" />
                    <div>
                      <p className="text-xs">Experience</p>
                      <p className="font-semibold text-[#3A1F1F]">{currentJob.experience}</p>
                    </div>
                  </div>
                </div>

                <Button className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full px-12 py-6">
                  Apply Now
                </Button>
              </div>

              {/* Job Description */}
              <div className="bg-white rounded-2xl p-8 shadow-md">
                <h3 className="text-2xl font-bold text-[#3A1F1F] mb-4">Job Description :</h3>
                <p className="text-[#8A8A8A] leading-relaxed mb-6">
                  {currentJob.description}
                </p>

                <h3 className="text-2xl font-bold text-[#3A1F1F] mb-4 mt-8">Key Responsibilities:</h3>
                <ul className="space-y-3 mb-6">
                  {currentJob.responsibilities.map((item, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-[#FF2B2B] rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-[#8A8A8A]">{item}</span>
                    </li>
                  ))}
                </ul>

                <h3 className="text-2xl font-bold text-[#3A1F1F] mb-4 mt-8">Qualifications:</h3>
                <ul className="space-y-3 mb-6">
                  {currentJob.qualifications.map((item, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-[#FF2B2B] rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-[#8A8A8A]">{item}</span>
                    </li>
                  ))}
                </ul>

                <p className="text-[#8A8A8A] text-sm italic mt-8">
                  {currentJob.additionalInfo}
                </p>

                <Button className="mt-8 bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full px-12 py-6">
                  Apply Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#FF2B2B] text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 mb-12">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Work With Purpose.<br />Grow With Us.
              </h2>
              <div className="space-y-3 text-white/90">
                <p className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  ID 123/201
                </p>
                <p className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  www.RhirePro.com
                </p>
                <p className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  0120 - 3532 - 510
                </p>
              </div>
              <div className="flex gap-4 mt-6">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                  <Facebook className="h-5 w-5 text-[#FF2B2B]" />
                </div>
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                  <Instagram className="h-5 w-5 text-[#FF2B2B]" />
                </div>
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                  <Twitter className="h-5 w-5 text-[#FF2B2B]" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h4 className="font-bold mb-4">Company</h4>
                <ul className="space-y-2 text-white/80">
                  <li><a href="/" className="hover:text-white transition-colors">Home</a></li>
                  <li><a href="/" className="hover:text-white transition-colors">About Us</a></li>
                  <li><a href="/services" className="hover:text-white transition-colors">Services</a></li>
                  <li><a href="/" className="hover:text-white transition-colors">Contact Us</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-4">Services</h4>
                <ul className="space-y-2 text-white/80">
                  <li><a href="#" className="hover:text-white transition-colors">Talent Sourcing</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Executive Search</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Project-Based Hiring</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Career Coaching</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Job Matching</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Branding Support</a></li>
                </ul>
              </div>
            </div>
          </div>

          {/* Newsletter */}
          <div className="bg-white rounded-full p-2 flex items-center gap-2 max-w-xl">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-transparent border-0 text-[#3A1F1F] placeholder:text-gray-400 flex-1 focus-visible:ring-0"
              placeholder="Email"
            />
            <Button className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full px-8">
              Subscribe Now <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <div className="border-t border-white/20 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-white/80 text-sm">
            <p>Copyright © 2025 RhirePro. All Rights Reserved.</p>
            <p>Privacy and Policy</p>
          </div>
        </div>
      </footer>
    </div>
  );
}