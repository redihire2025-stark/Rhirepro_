import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router";

const logoImage = new URL("../../logo/logo.png", import.meta.url).href;
import { Eye, EyeOff, Loader2, CheckCircle, RefreshCw, ShieldCheck, Mail } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Label } from "../components/ui/label";
import { supabase } from "../../lib/supabase";
import { sendOTPEmail } from "../../lib/email";

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

type PendingOTP = { code: string; expiresAt: number };
const OTP_EXPIRY_MS = 10 * 60 * 1000;

const GoogleIcon = () => (
  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

export default function JobSeekerSignUp() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    experience: "fresher",
    email: "",
    mobile: "",
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
  const location = useLocation();
  const redirectTo = new URLSearchParams(location.search).get("redirect");
  const safeRedirectTo = redirectTo?.startsWith("/") ? redirectTo : "/jobseeker/dashboard";

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
      await sendOTPEmail(formData.email, generatedOTP, [formData.firstName, formData.lastName].filter(Boolean).join(" "));

      setPendingOTP({ code: generatedOTP, expiresAt: Date.now() + OTP_EXPIRY_MS });
      setOtp("");
      setStep("otp");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send OTP.";
      if (message.includes("already registered")) {
        setError("An account with this email already exists. Please sign in.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const createAccount = async () => {

    const { data: authData, error: signUpError } =
      await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            role: "jobseeker",
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.mobile,
            experience: formData.experience,
          },
        },
      });

    if (signUpError) throw signUpError;
    if (!authData.user) throw new Error("Failed to create account.");

    if (authData.user.identities?.length === 0) {
      throw new Error(
        "An account with this email already exists. Please sign in."
      );
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: authData.user.id,
          email: formData.email,
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.mobile,
          experience_type: formData.experience as "fresher" | "experienced",
        },
        {
          onConflict: "id",
          ignoreDuplicates: true,
        }
      );
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      navigate(safeRedirectTo);
      return;
    }

    setSuccess(true);
    setTimeout(() => navigate(`/jobseeker/signin${redirectTo ? `?redirect=${encodeURIComponent(safeRedirectTo)}` : ""}`), 3000);
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!pendingOTP || pendingOTP.expiresAt < Date.now()) {
        throw new Error("OTP has expired. Please request a new one.");
      }

      if (pendingOTP.code !== otp.trim()) {
        throw new Error("Invalid OTP. Please try again.");
      }

      await createAccount();
      setPendingOTP(null);
    } catch (error: unknown) {
      console.error("OTP verification error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "OTP verification failed."
      );
    } finally {
      setLoading(false);
    }
  };


  const handleResendOTP = async () => {
    setError("");
    setResendLoading(true);
    try {
      const newOTP = generateOTP();
      await sendOTPEmail(formData.email, newOTP, [formData.firstName, formData.lastName].filter(Boolean).join(" "));
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

  const handleGoogleSignUp = async () => {
    setError("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/jobseeker/dashboard`,
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google sign up failed.");
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F6F6F6] to-[#FFE8E8] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-10 shadow-xl text-center max-w-md w-full">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-10 w-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-[#3A1F1F] mb-2">Account Created!</h2>
          <p className="text-[#5A5A5A] mb-1">
            Welcome to RhirePro, <strong>{formData.firstName}</strong>!
          </p>
          <p className="text-[#8A8A8A] text-sm mb-6">
            Your profile has been created successfully.<br />
            Please sign in with your email and password.
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
      <div className="min-h-screen bg-gradient-to-br from-[#F6F6F6] to-[#FFE8E8] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex flex-col items-center gap-1">
              <div className="flex items-center gap-2">
                <img src={logoImage} alt="RhirePro" className="w-10 h-10" />
                <div className="text-3xl font-bold text-[#3A1F1F]">
                  Rhire<span className="text-[#FF2B2B]">Pro</span>
                </div>
              </div>
              <p className="text-sm text-[#8A8A8A]">Find your dream job</p>
            </Link>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-xl">
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
              <Button
                type="submit"
                disabled={loading || resendLoading || otp.length < 6}
                className="w-full bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full py-6"
              >
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
    <div className="min-h-screen bg-gradient-to-br from-[#F6F6F6] to-[#FFE8E8] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              <img src={logoImage} alt="RhirePro" className="w-10 h-10" />
              <div className="text-3xl font-bold text-[#3A1F1F]">
                Rhire<span className="text-[#FF2B2B]">Pro</span>
              </div>
            </div>
            <p className="text-sm text-[#8A8A8A]">Find your dream job</p>
          </Link>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-xl">
          <h2 className="text-2xl font-bold text-[#3A1F1F] mb-1">Create Your Profile</h2>
          <p className="text-[#8A8A8A] mb-6 text-sm">Join 5 lakh+ job seekers on RhirePro</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">First Name *</label>
                <Input
                  value={formData.firstName}
                  onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                  className="bg-[#F6F6F6] border-gray-200 rounded-xl"
                  placeholder="Enter first name"
                  required
                />
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Last Name *</label>
                <Input
                  value={formData.lastName}
                  onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                  className="bg-[#F6F6F6] border-gray-200 rounded-xl"
                  placeholder="Enter last name"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-[#3A1F1F]">Are you a Fresher or Experienced?</label>
              <RadioGroup
                value={formData.experience}
                onValueChange={v => setFormData({ ...formData, experience: v })}
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fresher" id="fresher" />
                  <Label htmlFor="fresher" className="cursor-pointer text-sm">Fresher</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="experienced" id="experienced" />
                  <Label htmlFor="experienced" className="cursor-pointer text-sm">Experienced</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Email Address *</label>
              <Input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="bg-[#F6F6F6] border-gray-200 rounded-xl"
                placeholder="Enter email"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Mobile Number *</label>
              <Input
                type="tel"
                value={formData.mobile}
                onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                className="bg-[#F6F6F6] border-gray-200 rounded-xl"
                placeholder="Enter mobile number"
                required
              />
            </div>

            <div>
              <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Password *</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="bg-[#F6F6F6] border-gray-200 rounded-xl pr-10"
                  placeholder="Min 8 characters"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8A8A]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Confirm Password *</label>
              <Input
                type="password"
                value={formData.confirmPassword}
                onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="bg-[#F6F6F6] border-gray-200 rounded-xl"
                placeholder="Re-enter password"
                required
                autoComplete="new-password"
              />
            </div>

            <p className="text-xs text-[#8A8A8A]">
              By registering, you agree to our Terms of Use and Privacy Policy.
            </p>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full py-6"
            >
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Profile...</> : "Create Profile"}
            </Button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-white text-[#8A8A8A]">or</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignUp}
            disabled={loading}
            className="w-full border-gray-200 rounded-full py-6 hover:bg-gray-50"
          >
            <GoogleIcon />
            Sign Up with Google
          </Button>

          <p className="text-center mt-6 text-sm text-[#8A8A8A]">
            Already have an account?{" "}
            <Link to={`/jobseeker/signin${redirectTo ? `?redirect=${encodeURIComponent(safeRedirectTo)}` : ""}`} className="text-[#FF2B2B] font-semibold hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
