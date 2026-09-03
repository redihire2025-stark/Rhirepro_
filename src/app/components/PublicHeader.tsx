import { useState } from "react";
import { Menu, Home, Info, Briefcase, Sparkles, Mail } from "lucide-react";
import { Button } from "./ui/button";
import { Sheet, SheetTrigger } from "./ui/sheet";
import MobileNavPanel from "./MobileNavPanel";
import MobileSignInToggle from "./MobileSignInToggle";
import { useNavigate, useLocation, Link } from "react-router";
import logoImage from "../../logo/logo.png";

export default function PublicHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isServicesActive = location.pathname.startsWith("/services");

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
          <Link to="/#home" className="text-[#3A1F1F] hover:text-[#FF2B2B] transition-colors">
            Home
          </Link>
          <Link to="/#about" className="text-[#3A1F1F] hover:text-[#FF2B2B] transition-colors">
            About Us
          </Link>
          <Link
            to="/services"
            className={
              isServicesActive
                ? "px-4 py-2 rounded-full transition-all bg-[#FF2B2B] text-white font-medium"
                : "text-[#3A1F1F] hover:text-[#FF2B2B] transition-colors"
            }
          >
            Services
          </Link>
          <Link to="/jobs" className="text-[#3A1F1F] hover:text-[#FF2B2B] transition-colors">
            Jobs
          </Link>
          <Link to="/#contact" className="text-[#3A1F1F] hover:text-[#FF2B2B] transition-colors">
            Contact Us
          </Link>
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
          <MobileNavPanel
            tagline="Find your next opportunity"
            links={[
              { label: "Home", icon: Home, onClick: () => { setIsMenuOpen(false); navigate("/"); } },
              { label: "About Us", icon: Info, onClick: () => { setIsMenuOpen(false); navigate("/#about"); } },
              { label: "Services", icon: Sparkles, active: isServicesActive, onClick: () => { setIsMenuOpen(false); navigate("/services"); } },
              { label: "Jobs", icon: Briefcase, onClick: () => { setIsMenuOpen(false); navigate("/jobs"); } },
              { label: "Contact Us", icon: Mail, onClick: () => { setIsMenuOpen(false); navigate("/#contact"); } },
            ]}
          >
            <MobileSignInToggle
              onJobSeeker={() => { setIsMenuOpen(false); navigate("/jobseeker/signin"); }}
              onRecruiter={() => { setIsMenuOpen(false); navigate("/recruiter/signin"); }}
            />
          </MobileNavPanel>
        </Sheet>
      </div>
    </header>
  );
}
