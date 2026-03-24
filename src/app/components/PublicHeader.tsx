import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "./ui/sheet";
import { useNavigate } from "react-router";
import logoImage from "../../logo/logo.png";

export default function PublicHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
          <img src={logoImage} alt="RhirePro Logo" className="w-10 h-10" />
          <div className="text-xl font-bold text-[#3A1F1F]">
            Rhire<span className="text-[#FF2B2B]">Pro</span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="/#home" className="text-[#3A1F1F] hover:text-[#FF2B2B] transition-colors">
            Home
          </a>
          <a href="/#about" className="text-[#3A1F1F] hover:text-[#FF2B2B] transition-colors">
            About Us
          </a>
          <a href="/services" className="text-[#3A1F1F] hover:text-[#FF2B2B] transition-colors">
            Services
          </a>
          <a href="/jobs" className="text-[#3A1F1F] hover:text-[#FF2B2B] transition-colors">
            Jobs
          </a>
          <a href="/#contact" className="text-[#3A1F1F] hover:text-[#FF2B2B] transition-colors">
            Contact Us
          </a>
          <Button
            onClick={() => navigate("/signin")}
            className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full px-6"
          >
            Login
          </Button>
        </nav>

        {/* Hamburger Menu */}
        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetTrigger asChild>
            <button className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Menu className="h-6 w-6 text-[#3A1F1F]" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80 bg-white">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <SheetDescription className="sr-only">
              Navigation links and sign in options
            </SheetDescription>
            <div className="flex flex-col gap-6 mt-8">
              <div className="flex items-center gap-3 mb-2">
                <img src={logoImage} alt="RhirePro Logo" className="w-10 h-10" />
                <h3 className="text-xl font-bold text-[#3A1F1F]">
                  Rhire<span className="text-[#FF2B2B]">Pro</span>
                </h3>
              </div>
              <Button
                className="w-full bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full"
                onClick={() => { setIsMenuOpen(false); navigate("/jobseeker/signin"); }}
              >
                Job Seeker Sign In
              </Button>
              <Button
                className="w-full bg-[#3A1F1F] hover:bg-[#2A1010] text-white rounded-full"
                onClick={() => { setIsMenuOpen(false); navigate("/recruiter/signin"); }}
              >
                Recruiter Sign In
              </Button>
              <div className="border-t border-gray-200 mt-2 pt-4">
                <p className="text-sm text-[#8A8A8A] mb-3">Quick Links</p>
                <div className="space-y-2">
                  {[
                    { label: "Home", href: "/" },
                    { label: "About Us", href: "/#about" },
                    { label: "Services", href: "/services" },
                    { label: "Jobs", href: "/jobs" },
                    { label: "Contact Us", href: "/#contact" },
                  ].map(({ label, href }) => (
                    <a
                      key={label}
                      href={href}
                      className="block px-4 py-2 rounded-lg hover:bg-[#ECECF4] text-[#3A1F1F]"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
