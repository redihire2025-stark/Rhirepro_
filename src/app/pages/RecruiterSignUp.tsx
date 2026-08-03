import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";

const logoImage = new URL("../../logo/logo.png", import.meta.url).href;
import { Eye, EyeOff, Loader2, CheckCircle, Building2, RefreshCw, ShieldCheck, Mail } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { supabase } from "../../lib/supabase";
import { sendOTPEmail } from "../../lib/email";

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

type PendingOTP = { code: string; expiresAt: number };
const OTP_EXPIRY_MS = 10 * 60 * 1000;

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
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState<"signup" | "otp">("signup");
  const [otp, setOtp] = useState("");
  const [pendingOTP, setPendingOTP] = useState<PendingOTP | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const originalBg = document.body.style.backgroundColor;
    document.body.style.backgroundColor = "#3A1F1F";
    return () => {
      document.body.style.backgroundColor = originalBg;
    };
  }, []);

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
      const generatedOTP = generateOTP();
      await sendOTPEmail(formData.email, generatedOTP, formData.recruiterName);

      setPendingOTP({ code: generatedOTP, expiresAt: Date.now() + OTP_EXPIRY_MS });
      setOtp("");
      setStep("otp");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sign up failed.";
      setError(message.includes("already registered") ? "An account with this email already exists." : message);
    } finally {
      setLoading(false);
    }
  };

  const createAccount = async () => {
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
      if (authData.user.identities?.length === 0) {
        throw new Error("An account with this email already exists. Please sign in.");
      }

      const { error: profileError } = await supabase.from("recruiter_profiles").upsert({
        id: authData.user.id,
        email: formData.email,
        recruiter_name: formData.recruiterName,
        company_name: formData.companyName,
        industry: formData.industry,
        company_size: formData.companySize,
        phone: formData.phone,
      }, { onConflict: "id", ignoreDuplicates: true });

      if (profileError && profileError.code !== "23505") {
        throw profileError;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/recruiter/dashboard");
        return;
      }

      setSuccess(true);
      setTimeout(() => navigate("/recruiter/signin"), 3000);
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (!pendingOTP || pendingOTP.expiresAt < Date.now()) {
        throw new Error("OTP has expired. Please request a new one.");
      }
      if (pendingOTP.code !== otp.trim()) throw new Error("Invalid OTP. Please try again.");

      await createAccount();
      setPendingOTP(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError("");
    setResendLoading(true);
    try {
      const newOTP = generateOTP();
      await sendOTPEmail(formData.email, newOTP, formData.recruiterName);
      setPendingOTP({ code: newOTP, expiresAt: Date.now() + OTP_EXPIRY_MS });
    } catch {
      setError("Failed to resend OTP. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  const handleBackToSignup = () => {
    setOtp("");
    setError("");
    setPendingOTP(null);
    setStep("signup");
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

  if (step === "otp") {
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
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <ShieldCheck className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-[#3A1F1F] mb-1 text-center">OTP Verification</h2>
            <p className="text-[#8A8A8A] mb-6 text-sm text-center">
              Enter the 6-digit code sent to<br />
              <strong className="text-[#3A1F1F]">{formData.email}</strong>
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>
            )}

            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700 flex items-start gap-3">
                <Mail className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>OTP sent to <strong>{formData.email}</strong>. Check your inbox - valid for 10 minutes.</p>
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F] text-center">Enter OTP</label>
                <Input
                  type="text"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="bg-[#F6F6F6] border-gray-200 rounded-xl text-center text-2xl tracking-widest"
                  placeholder="------"
                  maxLength={6}
                  required
                  autoFocus
                />
              </div>
              <Button type="submit" disabled={loading || resendLoading || otp.length < 6} className="w-full bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full py-6">
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</> : "Verify Account"}
              </Button>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleBackToSignup}
                  disabled={loading || resendLoading}
                  className="text-sm text-[#8A8A8A] hover:text-[#3A1F1F] disabled:opacity-50"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={loading || resendLoading}
                  className="text-sm text-[#FF2B2B] hover:underline flex items-center gap-1 disabled:opacity-50"
                >
                  {resendLoading ? <><Loader2 className="h-3 w-3 animate-spin" /> Resending...</> : <><RefreshCw className="h-3 w-3" /> Resend OTP</>}
                </button>
              </div>
            </form>
          </div>
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
            <div>
              <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Your Name *</label>
              <Input value={formData.recruiterName} onChange={e => setFormData({ ...formData, recruiterName: e.target.value })} className="bg-[#F6F6F6] border-gray-200 rounded-xl" placeholder="Enter your name" required />
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Company Name *</label>
              <Input value={formData.companyName} onChange={e => setFormData({ ...formData, companyName: e.target.value })} className="bg-[#F6F6F6] border-gray-200 rounded-xl" placeholder="Enter company name" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Industry</label>
                <Select value={formData.industry} onValueChange={v => setFormData({ ...formData, industry: v })}>
                  <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {["IT / Software","BFSI","Manufacturing","Healthcare","Education","E-commerce","Consulting","Media"].map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Company Size</label>
                <Select value={formData.companySize} onValueChange={v => setFormData({ ...formData, companySize: v })}>
                  <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-xl"><SelectValue placeholder="Employees" /></SelectTrigger>
                  <SelectContent>
                    {["1-10","11-50","51-200","201-500","501-1000","1001-5000","5001+"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Work Email *</label>
              <Input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="bg-[#F6F6F6] border-gray-200 rounded-xl" placeholder="Enter work email" required autoComplete="email" />
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Phone</label>
              <Input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="bg-[#F6F6F6] border-gray-200 rounded-xl" placeholder="Enter phone number" />
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Password *</label>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="bg-[#F6F6F6] border-gray-200 rounded-xl pr-10" placeholder="Min 8 characters" required autoComplete="new-password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8A8A]">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Confirm Password *</label>
              <Input type="password" value={formData.confirmPassword} onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })} className="bg-[#F6F6F6] border-gray-200 rounded-xl" placeholder="Re-enter password" required autoComplete="new-password" />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full py-6">
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Account...</> : "Create Recruiter Account"}
            </Button>
          </form>

          <p className="text-center mt-6 text-sm text-[#8A8A8A]">
            Already have an account?{" "}
            <Link to="/recruiter/signin" className="text-[#FF2B2B] font-semibold hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
