import { useState } from "react";
import { MapPin, Bell, Star, Facebook, Instagram, Twitter, ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Link } from "react-router";

export default function PublicFooter() {
  const [email, setEmail] = useState("");

  return (
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
                <li><Link to="/#home" className="hover:text-white transition-colors">Home</Link></li>
                <li><Link to="/#about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link to="/services" className="hover:text-white transition-colors">Services</Link></li>
                <li><Link to="/#contact" className="hover:text-white transition-colors">Contact Us</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Services</h4>
              <ul className="space-y-2 text-white/80">
                <li><Link to="/services/talent-sourcing" className="hover:text-white transition-colors">Talent Sourcing</Link></li>
                <li><Link to="/services/executive-search" className="hover:text-white transition-colors">Executive Search</Link></li>
                <li><Link to="/services/project-based-hiring" className="hover:text-white transition-colors">Project-Based Hiring</Link></li>
                <li><Link to="/services/career-coaching" className="hover:text-white transition-colors">Career Coaching</Link></li>
                <li><Link to="/services/job-matching" className="hover:text-white transition-colors">Job Matching</Link></li>
                <li><Link to="/services/branding-support" className="hover:text-white transition-colors">Branding Support</Link></li>
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
          <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
        </div>
      </div>
    </footer>
  );
}
