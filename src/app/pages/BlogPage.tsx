import { useEffect, useMemo, useState, useRef } from "react";
import { Menu, ChevronRight, Facebook, Instagram, Twitter, Bell, Star, ArrowRight, MapPin, BookOpen } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "../components/ui/sheet";
import { useNavigate, useSearchParams } from "react-router";
import logoImage from "../../logo/logo.png";
import { supabase, RecruiterArticle, PREDEFINED_SEED_TITLES } from "../../lib/supabase";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

export interface BlogPageItem {
  id: string;
  title: string;
  description: string;
  date: string;
  category: string;
  tags: string[];
  image: string;
}

const getCategoryFallbackImage = (category: string = "") => {
  const cat = category.toLowerCase();
  if (cat.includes("career") || cat.includes("resume") || cat.includes("interview")) {
    return "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80";
  }
  if (cat.includes("industry") || cat.includes("trend") || cat.includes("hiring")) {
    return "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80";
  }
  if (cat.includes("employer") || cat.includes("culture") || cat.includes("leadership")) {
    return "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80";
  }
  if (cat.includes("remote")) {
    return "https://images.unsplash.com/photo-1626065838283-d338b7702fed?auto=format&fit=crop&w=800&q=80";
  }
  return "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80";
};

const ARTICLE_CATEGORY_OPTIONS = [
  "Career Tips",
  "Industry Insights",
  "Recruitment Trends",
  "Employer Tips",
  "Job Search",
  "Workplace Culture",
  "Remote Work",
  "AI in Recruitment",
  "Resume Building",
  "Interview Preparation",
  "Hiring Strategy",
  "Leadership",
  "Employee Engagement",
  "Salary Insights",
  "Freshers Guide",
];

const shuffleItems = <T,>(items: T[]) => {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
};

export default function BlogPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [email, setEmail] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedCategory = searchParams.get("category") || "";

  const [publishedArticles, setPublishedArticles] = useState<RecruiterArticle[]>([]);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    async function loadPublishedArticles() {
      const { data } = await supabase
        .from("recruiter_articles")
        .select("*")
        .eq("status", "Published")
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (isMountedRef.current && data) setPublishedArticles(data as RecruiterArticle[]);
    }

    void loadPublishedArticles();
  }, []);

  const realBlogs = useMemo<BlogPageItem[]>(() => {
    return publishedArticles
      .filter((article) => {
        if (article.status !== "Published") return false;
        const cleanTitle = (article.title || "").trim().toLowerCase();
        return !PREDEFINED_SEED_TITLES.has(cleanTitle);
      })
      .map((article) => ({
        id: article.id,
        title: article.title,
        description: article.summary || article.content,
        date: new Date(article.published_at || article.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
        category: article.category,
        tags: Array.isArray(article.tags) ? article.tags.filter((t) => t.toLowerCase() !== "blog") : [],
        image: article.cover_image_url ?? getCategoryFallbackImage(article.category),
      }));
  }, [publishedArticles]);

  const visibleBlogs = selectedCategory
    ? realBlogs.filter((blog) => blog.category.toLowerCase() === selectedCategory.toLowerCase())
    : realBlogs;
  const availableCategories = useMemo(
    () => Array.from(new Set(realBlogs.map((article) => article.category).filter(Boolean))),
    [realBlogs]
  );

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
            <div className="flex gap-4 items-center">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80"
                alt="Recruitment Trends"
                className="rounded-2xl h-40 w-48 object-cover shadow-md border border-gray-100"
              />
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=600&q=80"
                alt="Industry Insights"
                className="rounded-2xl h-32 w-32 mt-6 object-cover shadow-md border border-gray-100"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Blog Grid Section */}
      <section className="bg-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <span className="inline-block bg-[#FF2B2B] text-white px-4 py-1 rounded-full text-sm mb-4">
              {selectedCategory ? selectedCategory : "LATEST BLOGS"}
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-[#3A1F1F] mb-4">
              {selectedCategory ? `Blogs in ${selectedCategory}` : "Explore Our Latest Blogs"}
            </h2>
            <p className="text-lg text-[#8A8A8A] max-w-3xl mx-auto">
              Browse curated guides, tips, and insights published by our partner organizations.
            </p>
          </div>
          
          {visibleBlogs.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-8">
              {visibleBlogs.map((blog) => (
              <div key={blog.id} className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow border border-gray-100">
                <ImageWithFallback
                  src={blog.image}
                  alt={blog.title}
                  className="h-56 w-full object-cover"
                />
                <div className="p-6">
                  <div className="flex flex-wrap gap-2 items-center mb-3">
                    <span className="inline-block bg-[#ECECF4] text-[#3A1F1F] px-3 py-1 rounded-full text-xs font-semibold">
                      {blog.category}
                    </span>
                    {Array.isArray(blog.tags) && blog.tags.map((tag: string, tidx: number) => (
                      <span key={tidx} className="bg-red-50 text-[#FF2B2B] px-2 py-0.5 rounded-full text-[11px] font-medium">
                        #{tag}
                      </span>
                    ))}
                  </div>
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
          ) : (
            <div className="bg-[#ECECF4] rounded-2xl p-10 text-center">
              <BookOpen className="h-10 w-10 text-[#FF2B2B] mx-auto mb-3" />
              <h3 className="text-xl font-bold text-[#3A1F1F] mb-2">No blogs available</h3>
              <p className="text-[#8A8A8A]">
                {selectedCategory ? `No blogs published under "${selectedCategory}" category yet.` : "No blogs have been published by organization admins yet."}
              </p>
            </div>
          )}
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
            {availableCategories.length > 0 ? availableCategories.map((topic) => (
              <Button
                key={topic}
                variant="outline"
                onClick={() => navigate(`/blog?category=${encodeURIComponent(topic)}`)}
                className={`border-2 rounded-full px-6 ${
                  selectedCategory === topic
                    ? "border-[#FF2B2B] bg-[#FF2B2B] text-white"
                    : "border-gray-300 text-[#3A1F1F] hover:bg-[#FF2B2B] hover:text-white hover:border-[#FF2B2B]"
                }`}
              >
                {topic}
              </Button>
            )) : (
              <p className="text-[#8A8A8A]">No article categories available yet.</p>
            )}
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
