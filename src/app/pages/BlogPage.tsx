import { useState } from "react";
import { Menu, ChevronRight, Facebook, Instagram, Twitter, Bell, Star, ArrowRight, MapPin } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "../components/ui/sheet";
import { useNavigate } from "react-router";
import logoImage from "../../logo/logo.png";

export default function BlogPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  const blogs = [
    {
      id: 1,
      title: "Why Soft Skills Matter More Than Ever",
      description: "Explore why employers are prioritizing soft skills such as communication, teamwork, and adaptability, and learn how to showcase yours effectively in interviews and on your resume.",
      date: "March 1, 2026",
      category: "Career Tips"
    },
    {
      id: 2,
      title: "How Companies Are Battling Talent Shortages",
      description: "Discover innovative strategies companies are using to attract and retain top talent in competitive markets, from flexible work arrangements to enhanced benefits packages.",
      date: "February 28, 2026",
      category: "Industry Insights"
    },
    {
      id: 3,
      title: "Recruiters Now Focus on Candidate Experience",
      description: "Learn how the recruitment landscape is shifting to prioritize candidate satisfaction and engagement throughout the hiring process, creating better outcomes for all.",
      date: "February 25, 2026",
      category: "Trends"
    },
    {
      id: 4,
      title: "How to Stand Out in a Competitive Market",
      description: "Expert advice on differentiating yourself from other candidates in today's job market through personal branding and networking strategies.",
      date: "February 20, 2026",
      category: "Job Search"
    },
    {
      id: 5,
      title: "Why Employer Branding Matters in 2026",
      description: "Understanding the impact of company culture and reputation more than ever before, and how it influences top talent decision-making.",
      date: "February 15, 2026",
      category: "Employer Tips"
    },
    {
      id: 6,
      title: "Remote Work Continues to Dominate",
      description: "Analyzing the lasting impact of remote work and hybrid models on the job market and what it means for job seekers and employers alike.",
      date: "February 10, 2026",
      category: "Work Trends"
    },
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
            <Button 
              onClick={() => navigate('/')}
              className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full px-6"
            >
              Home
            </Button>
            <button onClick={() => navigate('/')} className="text-[#3A1F1F] hover:text-[#FF2B2B] transition-colors">
              About Us
            </button>
            <button className="text-[#3A1F1F] hover:text-[#FF2B2B] transition-colors">
              Pages
            </button>
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
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="mb-6 md:mb-0 flex-1">
              <div className="flex items-center gap-2 text-sm text-[#8A8A8A] mb-4">
                <a href="/" className="hover:text-[#FF2B2B]">Home</a>
                <ChevronRight className="h-4 w-4" />
                <span className="text-[#FF2B2B] border border-[#FF2B2B] px-3 py-1 rounded-full">
                  Blogs
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-[#3A1F1F] mb-4">
                Stay Updated with the Latest Trends
              </h1>
              <p className="text-[#8A8A8A] max-w-lg">
                Blog updates with industry news, educational trends, and company updates. Insights that keep you informed.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-300 rounded-2xl h-40 w-48"></div>
              <div className="bg-gray-400 rounded-2xl h-32 w-32 mt-8"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Blog Grid Section */}
      <section className="bg-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <span className="inline-block bg-[#FF2B2B] text-white px-4 py-1 rounded-full text-sm mb-4">
              LATEST ARTICLE
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-[#3A1F1F] mb-4">
              Discover What's New in Recruitment
            </h2>
            <p className="text-lg text-[#8A8A8A] max-w-3xl mx-auto">
              Stay informed with the latest updates, trends, and insights in the recruitment industry that keep you informed.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {blogs.map((blog, index) => (
              <div key={index} className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow border border-gray-100">
                <div className="bg-gray-300 h-56"></div>
                <div className="p-6">
                  <span className="inline-block bg-[#ECECF4] text-[#3A1F1F] px-3 py-1 rounded-full text-sm mb-3">
                    {blog.category}
                  </span>
                  <h3 className="text-xl font-bold text-[#3A1F1F] mb-3">{blog.title}</h3>
                  <p className="text-[#8A8A8A] mb-4 line-clamp-3">{blog.description}</p>
                  <Button
                    variant="link"
                    className="text-[#FF2B2B] p-0 h-auto font-semibold"
                    onClick={() => navigate(`/blog/${blog.id}`)}
                  >
                    Read More <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="bg-[#5B5B72] py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Subscribe to Our Newsletter
          </h2>
          <p className="text-white/90 mb-8 text-lg max-w-2xl mx-auto">
            Get the latest recruitment insights, career tips, and industry news delivered directly to your inbox.
          </p>
          <div className="bg-white rounded-full p-2 flex items-center gap-2 max-w-xl mx-auto">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-transparent border-0 text-[#3A1F1F] placeholder:text-gray-400 flex-1 focus-visible:ring-0"
              placeholder="Enter your email"
            />
            <Button className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full px-8">
              Subscribe <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Related Topics */}
      <section className="bg-[#ECECF4] py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-[#3A1F1F] mb-8 text-center">
            Related Topics You Might Like
          </h2>
          <div className="flex flex-wrap gap-3 justify-center">
            {["Career Growth", "Interview Tips", "Resume Writing", "Remote Work", "Salary Negotiation", "Networking", "Personal Branding", "Industry Trends"].map((topic, index) => (
              <Button
                key={index}
                variant="outline"
                className="border-2 border-gray-300 text-[#3A1F1F] hover:bg-[#FF2B2B] hover:text-white hover:border-[#FF2B2B] rounded-full px-6"
              >
                {topic}
              </Button>
            ))}
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