import { useState } from "react";
import { Facebook, Instagram, Twitter, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Link } from "react-router";
import { subscribeNewsletter } from "../../lib/newsletter";

export default function PublicFooter() {
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [status, setStatus] = useState<{ type: "idle" | "success" | "error"; message: string }>({ type: "idle", message: "" });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const result = await subscribeNewsletter(email);
    setIsLoading(false);

    if (!result.success) {
      setStatus({ type: "error", message: result.message });
      return;
    }

    setIsSubscribed(true);
    setEmail("");
    setStatus({ type: "success", message: "Successfully subscribed!" });
  };

  return (
    <footer className="bg-[#FF2B2B] text-white py-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 mb-12">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Work With Purpose.<br />Grow With Us.
            </h2>
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
        <div className="max-w-xl">
          <form
            onSubmit={handleSubscribe}
            className={`rounded-full p-2 flex items-center gap-2 transition-colors duration-300 ${
              isSubscribed
                ? "bg-emerald-50/90 text-emerald-800 border border-emerald-200/50 shadow-sm"
                : "bg-white"
            }`}
          >
            <Input
              type="text"
              value={isSubscribed ? "Successfully subscribed!" : email}
              disabled={isSubscribed || isLoading}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status.type === "error") setStatus({ type: "idle", message: "" });
              }}
              className={`bg-transparent border-0 flex-1 focus-visible:ring-0 font-semibold ${
                isSubscribed
                  ? "text-emerald-800 placeholder:text-emerald-800 text-center md:text-left text-base"
                  : "text-[#3A1F1F] placeholder:text-gray-400"
              }`}
              placeholder="Enter your email"
            />
            {!isSubscribed && (
              <Button type="submit" disabled={isLoading} className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full px-8">
                {isLoading ? "Subscribing..." : "Subscribe Now"} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </form>
          {status.message && status.type === "error" && (
            <p className="mt-2 text-sm px-4 text-yellow-200 font-medium">
              {status.message}
            </p>
          )}
        </div>

        <div className="border-t border-white/20 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-white/80 text-sm">
          {/*
            Naming the operating entity, not just the product brand: payments are
            collected by Redihire Global Services Private Limited and that is the
            name a customer sees on their statement, so it has to be findable
            here too.
          */}
          <p>
            Copyright © 2025 RhirePro. All Rights Reserved.
            <span className="block text-white/60 text-xs mt-1">
              A product of Redihire Global Services Private Limited
            </span>
          </p>
          <div className="flex items-center gap-6 flex-wrap justify-center">
            <Link to="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="/refund-policy" className="hover:text-white transition-colors">Refund &amp; Cancellation</Link>
            <Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
