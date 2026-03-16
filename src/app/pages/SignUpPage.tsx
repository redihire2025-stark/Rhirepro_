import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Checkbox } from "../components/ui/checkbox";
import { User, Briefcase, Mail, Lock, UserCircle, Building2, Phone, Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";
import logoImage from "../../logo/logo.png";
import { supabase } from "../../lib/supabase";

export default function SignUpPage() {
  const [userType, setUserType] = useState<"jobseeker" | "recruiter">("jobseeker");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const set = (field: string, value: string) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      if (userType === "jobseeker") {
        // Split full name into first / last
        const parts = formData.name.trim().split(" ");
        const firstName = parts[0] || "";
        const lastName = parts.slice(1).join(" ") || "";

        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              role: "jobseeker",
              first_name: firstName,
              last_name: lastName,
              phone: formData.phone,
            },
          },
        });

        if (signUpError) throw signUpError;
        if (!authData.user) throw new Error("Failed to create account.");

        // Try client-side insert (trigger handles it too, this is a fallback)
        const { error: profileError } = await supabase.from("profiles").insert({
          id: authData.user.id,
          email: formData.email,
          first_name: firstName,
          last_name: lastName,
          phone: formData.phone,
          experience_type: "fresher",
        });
        if (profileError && profileError.code !== "23505") {
          console.warn("Profile insert (non-fatal):", profileError.message);
        }

        // If auto-confirmed (email confirmation off), go straight to dashboard
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          navigate("/jobseeker/dashboard");
          return;
        }

      } else {
        // Recruiter
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              role: "recruiter",
              recruiter_name: formData.name,
              company_name: formData.company,
              phone: formData.phone,
            },
          },
        });

        if (signUpError) throw signUpError;
        if (!authData.user) throw new Error("Failed to create account.");

        const { error: profileError } = await supabase.from("recruiter_profiles").insert({
          id: authData.user.id,
          email: formData.email,
          recruiter_name: formData.name,
          company_name: formData.company,
          phone: formData.phone,
        });
        if (profileError && profileError.code !== "23505") {
          console.warn("Recruiter profile insert (non-fatal):", profileError.message);
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          navigate("/recruiter/dashboard");
          return;
        }
      }

      setSuccess(true);
      setTimeout(() => navigate("/signin"), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sign up failed.";
      setError(message.includes("already registered") ? "An account with this email already exists. Please sign in." : message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F6F6F6] to-[#ECECF4] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-10 shadow-xl text-center max-w-md w-full">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-10 w-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-[#3A1F1F] mb-2">Account Created!</h2>
          <p className="text-[#5A5A5A] mb-1">
            Welcome, <strong>{formData.name}</strong>!
          </p>
          <p className="text-[#8A8A8A] text-sm mb-6">
            Your account has been created successfully.<br />
            Please sign in to continue.
          </p>
          <div className="w-full bg-gray-100 rounded-full h-1 mb-4 overflow-hidden">
            <div className="bg-[#FF2B2B] h-full rounded-full animate-pulse w-full" />
          </div>
          <p className="text-xs text-[#8A8A8A]">Redirecting to Sign In...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F6F6F6] to-[#ECECF4] flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="grid md:grid-cols-2">
          {/* Left Panel */}
          <div className="bg-gradient-to-br from-[#FF2B2B] to-[#e02525] p-8 md:p-12 text-white flex flex-col justify-between">
            <div>
              <button onClick={() => navigate("/")} className="text-white/80 hover:text-white transition-colors text-sm mb-8">
                ← Back to Home
              </button>
              <div className="flex items-center gap-3 mb-8">
                <img src={logoImage} alt="RhirePro Logo" className="w-14 h-14" />
                <div className="text-3xl font-bold">Rhire<span className="text-white">Pro</span></div>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">Join the Future of Recruitment</h1>
              <p className="text-lg text-white/90 mb-8">Connect with opportunities that match your skills and ambitions</p>
              <div className="space-y-4">
                {["Free account with unlimited access", "Personalized job recommendations", "Connect with top companies"].map(text => (
                  <div key={text} className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-white/90">{text}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-8 pt-8 border-t border-white/20">
              <p className="text-sm text-white/70">
                Already have an account?{" "}
                <button onClick={() => navigate("/signin")} className="text-white font-semibold hover:underline">Sign In</button>
              </p>
            </div>
          </div>

          {/* Right Panel */}
          <div className="p-8 md:p-12">
            <div className="max-w-md mx-auto">
              <h2 className="text-3xl font-bold text-[#3A1F1F] mb-2">Create Account</h2>
              <p className="text-[#8A8A8A] mb-6">Get started with your free account</p>

              {/* Toggle */}
              <div className="bg-[#ECECF4] rounded-full p-1.5 mb-6 flex">
                {(["jobseeker", "recruiter"] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => { setUserType(type); setError(""); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-full transition-all text-sm font-medium ${
                      userType === type ? "bg-white text-[#FF2B2B] shadow-md" : "text-[#8A8A8A]"
                    }`}
                  >
                    {type === "jobseeker" ? <User className="h-4 w-4" /> : <Briefcase className="h-4 w-4" />}
                    {type === "jobseeker" ? "Job Seeker" : "Recruiter"}
                  </button>
                ))}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>
              )}

              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <label className="block text-[#3A1F1F] font-medium mb-1.5 text-sm">
                    {userType === "recruiter" ? "Your Name *" : "Full Name *"}
                  </label>
                  <div className="relative">
                    <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#8A8A8A]" />
                    <Input type="text" value={formData.name} onChange={e => set("name", e.target.value)}
                      className="pl-10 bg-[#ECECF4] border-0 rounded-xl py-5 focus-visible:ring-2 focus-visible:ring-[#FF2B2B]"
                      placeholder={userType === "recruiter" ? "Anita Rao" : "Arjun Mehta"} required />
                  </div>
                </div>

                <div>
                  <label className="block text-[#3A1F1F] font-medium mb-1.5 text-sm">Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#8A8A8A]" />
                    <Input type="email" value={formData.email} onChange={e => set("email", e.target.value)}
                      className="pl-10 bg-[#ECECF4] border-0 rounded-xl py-5 focus-visible:ring-2 focus-visible:ring-[#FF2B2B]"
                      placeholder="you@email.com" required autoComplete="email" />
                  </div>
                </div>

                <div>
                  <label className="block text-[#3A1F1F] font-medium mb-1.5 text-sm">Phone Number *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#8A8A8A]" />
                    <Input type="tel" value={formData.phone} onChange={e => set("phone", e.target.value)}
                      className="pl-10 bg-[#ECECF4] border-0 rounded-xl py-5 focus-visible:ring-2 focus-visible:ring-[#FF2B2B]"
                      placeholder="+91 XXXXX XXXXX" required />
                  </div>
                </div>

                {userType === "recruiter" && (
                  <div>
                    <label className="block text-[#3A1F1F] font-medium mb-1.5 text-sm">Company Name *</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#8A8A8A]" />
                      <Input type="text" value={formData.company} onChange={e => set("company", e.target.value)}
                        className="pl-10 bg-[#ECECF4] border-0 rounded-xl py-5 focus-visible:ring-2 focus-visible:ring-[#FF2B2B]"
                        placeholder="TechCorp Inc." required />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[#3A1F1F] font-medium mb-1.5 text-sm">Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#8A8A8A]" />
                    <Input type={showPassword ? "text" : "password"} value={formData.password}
                      onChange={e => set("password", e.target.value)}
                      className="pl-10 pr-10 bg-[#ECECF4] border-0 rounded-xl py-5 focus-visible:ring-2 focus-visible:ring-[#FF2B2B]"
                      placeholder="Min 8 characters" required autoComplete="new-password" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8A8A]">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[#3A1F1F] font-medium mb-1.5 text-sm">Confirm Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#8A8A8A]" />
                    <Input type="password" value={formData.confirmPassword}
                      onChange={e => set("confirmPassword", e.target.value)}
                      className="pl-10 bg-[#ECECF4] border-0 rounded-xl py-5 focus-visible:ring-2 focus-visible:ring-[#FF2B2B]"
                      placeholder="Confirm your password" required autoComplete="new-password" />
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Checkbox id="terms" checked={agreeTerms}
                    onCheckedChange={checked => setAgreeTerms(checked as boolean)} className="mt-1" />
                  <label htmlFor="terms" className="text-sm text-[#3A1F1F] cursor-pointer">
                    I agree to the{" "}
                    <a href="#" className="text-[#FF2B2B] hover:underline">Terms & Conditions</a>{" "}
                    and{" "}
                    <a href="#" className="text-[#FF2B2B] hover:underline">Privacy Policy</a>
                  </label>
                </div>

                <Button type="submit" disabled={!agreeTerms || loading}
                  className="w-full bg-gradient-to-r from-[#FF2B2B] to-[#e02525] hover:from-[#e02525] hover:to-[#FF2B2B] text-white rounded-full py-5 text-base font-semibold disabled:opacity-50">
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Account...</> : "Create Account"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
