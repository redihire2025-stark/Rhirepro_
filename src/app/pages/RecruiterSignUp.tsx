import { useState } from "react";
import { useNavigate, Link } from "react-router";

const logoImage = new URL("../../logo/logo.png", import.meta.url).href;
import { Eye, EyeOff, Loader2, CheckCircle, Building2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { supabase } from "../../lib/supabase";

export default function RecruiterSignUp() {
  const [formData, setFormData] = useState({
    recruiterName: "",
    companyName: "",
    industry: "",
    companySize: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
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
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            role: "recruiter",
            company_name: formData.companyName,
            recruiter_name: formData.recruiterName,
            industry: formData.industry,
            company_size: formData.companySize,
            phone: formData.phone,
          },
        },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("Failed to create account.");

      const { error: profileError } = await supabase.from("recruiter_profiles").insert({
        id: authData.user.id,
        email: formData.email,
        recruiter_name: formData.recruiterName,
        company_name: formData.companyName,
        industry: formData.industry,
        company_size: formData.companySize,
        phone: formData.phone,
      });

      if (profileError && profileError.code !== "23505") {
        throw profileError;
      }

      setSuccess(true);
      setTimeout(() => navigate("/recruiter/signin"), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sign up failed.";
      setError(message.includes("already registered") ? "An account with this email already exists." : message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#3A1F1F] to-[#6B3A3A] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-10 shadow-2xl text-center max-w-md w-full">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-10 w-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-[#3A1F1F] mb-2">Account Created!</h2>
          <p className="text-[#5A5A5A] mb-1">Welcome, <strong>{formData.companyName}</strong>!</p>
          <p className="text-[#8A8A8A] text-sm mb-6">
            Your recruiter account has been created successfully.<br />
            Please sign in to access your dashboard.
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
    <div className="min-h-screen bg-gradient-to-br from-[#3A1F1F] to-[#6B3A3A] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              <div className="bg-white rounded-xl p-1.5">
                <img src={logoImage} alt="RhirePro" className="w-8 h-8" />
              </div>
              <div className="text-3xl font-bold text-white">
                Rhire<span className="text-[#FF6B6B]">Pro</span>
              </div>
            </div>
            <p className="text-sm text-red-200">Recruiter Portal</p>
          </Link>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-[#FF2B2B] rounded-xl flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-[#3A1F1F]">Recruiter Sign Up</h2>
          </div>
          <p className="text-[#8A8A8A] mb-6 text-sm">Start hiring top talent today</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input placeholder="Your Name" value={formData.recruiterName} onChange={e => setFormData({ ...formData, recruiterName: e.target.value })} required />
            <Input placeholder="Company Name" value={formData.companyName} onChange={e => setFormData({ ...formData, companyName: e.target.value })} required />
            <Input type="email" placeholder="Email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
            <Input type="tel" placeholder="Phone" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
            <Input type={showPassword ? "text" : "password"} placeholder="Password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required />
            <Input type="password" placeholder="Confirm Password" value={formData.confirmPassword} onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })} required />

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating..." : "Create Account"}
            </Button>
          </form>

          <p className="text-center mt-6 text-sm text-[#8A8A8A]">
            Already have an account?{" "}
            <Link to="/recruiter/signin" className="text-[#FF2B2B] font-semibold hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}