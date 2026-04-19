import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";

const logoImage = new URL("../../logo/logo.png", import.meta.url).href;
import { Eye, EyeOff, Loader2, ShieldCheck, RefreshCw, Building2, Mail } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { supabase } from "../../lib/supabase";
import { sendOTPEmail, sendPasswordResetOTP, resetPasswordWithOTP } from "../../lib/email";
import { useAuth } from "../../lib/auth-context";

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function storeOTP(userId: string, otp: string) {
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const { error } = await supabase.from("recruiter_profiles").update({
    otp_code: otp,
    otp_expires_at: expires,
  }).eq("id", userId);
  if (error) throw new Error("Failed to store OTP: " + error.message);
}

async function verifyOTPFromDB(userId: string, otp: string): Promise<boolean> {
  const { data } = await supabase
    .from("recruiter_profiles")
    .select("otp_code, otp_expires_at")
    .eq("id", userId)
    .single();
  if (!data?.otp_code) return false;
  if (new Date(data.otp_expires_at) < new Date()) return false;
  return data.otp_code === otp;
}

export default function RecruiterSignIn() {
  const [step, setStep] = useState<"credentials" | "otp" | "forgot" | "forgot-otp">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotOtp, setForgotOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const navigate = useNavigate();

  const { user, role } = useAuth();
  useEffect(() => {
    if (user && role) {
      navigate(role === "recruiter" ? "/recruiter/dashboard" : "/jobseeker/dashboard", { replace: true });
    }
  }, [user, role, navigate]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setError("");
    try {
      await sendPasswordResetOTP(forgotEmail, "recruiter");
      setStep("forgot-otp");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send reset OTP.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return setError("Passwords don't match.");
    if (newPassword.length < 8) return setError("Password must be at least 8 characters.");
    setForgotLoading(true);
    setError("");
    try {
      await resetPasswordWithOTP(forgotEmail, forgotOtp, newPassword, "recruiter");
      setResetSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reset password.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
      if (authErr) throw new Error("Invalid email or password. Please try again.");
      if (!data.user) throw new Error("Authentication failed.");

      if (data.user.user_metadata?.role === "jobseeker") {
        await supabase.auth.signOut();
        throw new Error("This is a Job Seeker account. Please use Job Seeker Sign In.");
      }

      const { data: rp, error: rpErr } = await supabase
        .from("recruiter_profiles")
        .select("id, recruiter_name")
        .eq("id", data.user.id)
        .single();

      if (rpErr || !rp) {
        await supabase.auth.signOut();
        throw new Error("No recruiter account found with this email. Please sign up first.");
      }

      const generatedOTP = generateOTP();
      await storeOTP(data.user.id, generatedOTP);
      setUserId(data.user.id);

      await sendOTPEmail(email, generatedOTP, rp.recruiter_name || "");

      setStep("otp");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign in failed. Check credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const valid = await verifyOTPFromDB(userId, otp.trim());
      if (!valid) throw new Error("Invalid or expired OTP. Please try again.");
      await supabase.from("recruiter_profiles").update({ otp_code: null, otp_expires_at: null }).eq("id", userId);
      navigate("/recruiter/dashboard", { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!userId) return;
    setError("");
    try {
      const newOTP = generateOTP();
      await storeOTP(userId, newOTP);
      await sendOTPEmail(email, newOTP);
      setOtp("");
    } catch {
      setError("Failed to resend OTP. Please try again.");
    }
  };

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
          {step === "credentials" && (
            <>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 bg-[#FF2B2B] rounded-xl flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-[#3A1F1F]">Recruiter Sign In</h2>
              </div>
              <p className="text-[#8A8A8A] mb-6 text-sm ml-13">Access your recruitment dashboard</p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>
              )}

              <form onSubmit={handleSignIn} className="space-y-4">
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required />
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required />
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Verifying..." : "Continue"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
