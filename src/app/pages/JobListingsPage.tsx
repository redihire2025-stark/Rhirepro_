import { useState } from "react";
import { Menu, Search, MapPin, DollarSign, Clock, Briefcase, ChevronRight, Facebook, Instagram, Twitter, Bell, Star, ArrowRight } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "../components/ui/sheet";
import { useNavigate } from "react-router";
import logoImage from "../../logo/logo.png";

export default function JobListingsPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  const categories = ["ALL", "DESIGN & CREATIVE", "ADMIN/BPO", "FINANCE & LEGAL"];

  const jobs = [
    { 
      id: 1, 
      title: "Data Analyst", 
      company: "TechCorp Inc.", 
      location: "New York, NY", 
      salary: "$70,000 - $90,000",
      type: "Full-time",
      description: "Analyze large datasets to extract insights, build reports and dashboards to support business decisions.",
      featured: true,
      category: "ADMIN/BPO"
    },
    { 
      id: 2, 
      title: "Graphic Designer", 
      company: "Creative Studios", 
      location: "Los Angeles, CA", 
      salary: "$60,000 - $80,000",
      type: "Full-time",
      description: "Create stunning visual designs for print media, digital platforms, and brand campaigns.",
      featured: true,
      category: "DESIGN & CREATIVE"
    },
    { 
      id: 3, 
      title: "Digital Marketing", 
      company: "Marketing Pro", 
      location: "Chicago, IL", 
      salary: "$65,000 - $85,000",
      type: "Full-time",
      description: "Plan and execute digital marketing strategies. Manage SEO/SEM, social media and content campaigns.",
      featured: false,
      category: "ADMIN/BPO"
    },
    { 
      id: 4, 
      title: "Content Strategist", 
      company: "Media Group", 
      location: "Austin, TX", 
      salary: "$70,000 - $95,000",
      type: "Full-time",
      description: "Develop content strategies that align with business goals and engage target audiences.",
      featured: false,
      category: "DESIGN & CREATIVE"
    },
    { 
      id: 5, 
      title: "Financial Analyst", 
      company: "Finance Corp", 
      location: "Boston, MA", 
      salary: "$75,000 - $100,000",
      type: "Full-time",
      description: "Analyze financial data and assist with forecasting and budgeting for improved efficiency.",
      featured: false,
      category: "FINANCE & LEGAL"
    },
    { 
      id: 6, 
      title: "Legal Officer", 
      company: "Law Firm LLC", 
      location: "Washington, DC", 
      salary: "$80,000 - $120,000",
      type: "Full-time",
      description: "Handle legal documents, ensure corporate compliance and advise on legal procedures.",
      featured: false,
      category: "FINANCE & LEGAL"
    },
    { 
      id: 7, 
      title: "Product Designer", 
      company: "Design Hub", 
      location: "San Francisco, CA", 
      salary: "$90,000 - $130,000",
      type: "Full-time",
      description: "Design state-of-the-art user-friendly products by combining user experience and visual design.",
      featured: false,
      category: "DESIGN & CREATIVE"
    },
    { 
      id: 8, 
      title: "SEO Specialist", 
      company: "SEO Masters", 
      location: "Seattle, WA", 
      salary: "$65,000 - $90,000",
      type: "Full-time",
      description: "Optimize website content and structure to improve search engine rankings and organic visibility.",
      featured: false,
      category: "ADMIN/BPO"
    },
    { 
      id: 9, 
      title: "Accountant", 
      company: "Accounting Plus", 
      location: "Miami, FL", 
      salary: "$60,000 - $85,000",
      type: "Full-time",
      description: "Manage day-to-day accounting tasks including AP/AR and assist with month-end recording.",
      featured: false,
      category: "FINANCE & LEGAL"
    },
    { 
      id: 10, 
      title: "Tax Specialist", 
      company: "Tax Solutions", 
      location: "Denver, CO", 
      salary: "$70,000 - $95,000",
      type: "Full-time",
      description: "Handle complex tax planning for individuals and corporations, ensuring efficient tax strategies.",
      featured: false,
      category: "FINANCE & LEGAL"
    },
    { 
      id: 11, 
      title: "Corporate Lawyer", 
      company: "Legal Experts", 
      location: "Chicago, IL", 
      salary: "$100,000 - $150,000",
      type: "Full-time",
      description: "Provide legal counsel on mergers, acquisitions, and complex corporate legal issues.",
      featured: false,
      category: "FINANCE & LEGAL"
    },
    { 
      id: 12, 
      title: "Email Marketing", 
      company: "Digital Agency", 
      location: "Portland, OR", 
      salary: "$60,000 - $80,000",
      type: "Full-time",
      description: "Design and execute email campaigns to drive customer engagement and increase ROI.",
      featured: false,
      category: "ADMIN/BPO"
    },
  ];

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         job.company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "ALL" || job.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <div className="mb-6 md:mb-0">
              <div className="flex items-center gap-2 text-sm text-[#8A8A8A] mb-4">
                <a href="/" className="hover:text-[#FF2B2B]">Home</a>
                <ChevronRight className="h-4 w-4" />
                <span className="text-[#FF2B2B] border border-[#FF2B2B] px-3 py-1 rounded-full">
                  JOB Detail
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-[#3A1F1F] mb-4">
                Find Your Next Opportunity Here
              </h1>
              <p className="text-[#8A8A8A] max-w-lg">
                Browse curated job openings across various industries that match your skills and career goals.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-300 rounded-2xl h-40 w-48"></div>
              <div className="bg-gray-400 rounded-2xl h-40 w-32 mt-8"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Job Listings Section */}
      <section className="bg-[#ECECF4] py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <span className="inline-block bg-[#FF2B2B] text-white px-4 py-1 rounded-full text-sm mb-4">
              JOB LISTINGS
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-[#3A1F1F] mb-4">
              Turn Your Passion into a Career
            </h2>
            <p className="text-lg text-[#8A8A8A] max-w-3xl mx-auto">
              Discover opportunities that align with your passion and career goals.
            </p>
          </div>

          {/* Search and Filters */}
          <div className="mb-8 max-w-4xl mx-auto">
            <div className="flex flex-wrap gap-3 justify-center mb-6">
              {categories.map((category) => (
                <Button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`rounded-full px-6 ${
                    selectedCategory === category
                      ? "bg-[#FF2B2B] hover:bg-[#e02525] text-white"
                      : "bg-white border-2 border-gray-300 text-[#3A1F1F] hover:bg-gray-100"
                  }`}
                >
                  {category}
                </Button>
              ))}
            </div>

            <div className="bg-white rounded-full p-2 flex items-center gap-2 shadow-md">
              <Search className="h-5 w-5 text-[#8A8A8A] ml-4" />
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-0 text-[#3A1F1F] placeholder:text-gray-400 flex-1 focus-visible:ring-0"
                placeholder="Search jobs by title or company..."
              />
              <Button className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full px-8">
                <Search className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Job Cards Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all relative cursor-pointer"
                onClick={() => navigate(`/job/${job.id}`)}
              >
                {job.featured && (
                  <div className="absolute top-4 right-4 w-3 h-3 bg-[#FF2B2B] rounded-full"></div>
                )}
                <div className="mb-4">
                  <span className="text-sm text-[#8A8A8A]">{job.company}</span>
                  <h3 className="text-xl font-bold text-[#3A1F1F] mt-1">{job.title}</h3>
                </div>
                <p className="text-[#8A8A8A] text-sm mb-4 line-clamp-2">
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
                <Button className="w-full bg-white border-2 border-[#FF2B2B] text-[#FF2B2B] hover:bg-[#FF2B2B] hover:text-white rounded-full">
                  Apply Now
                </Button>
              </div>
            ))}
          </div>

          {filteredJobs.length === 0 && (
            <div className="text-center py-16">
              <p className="text-[#8A8A8A] text-lg">No jobs found matching your criteria.</p>
            </div>
          )}
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