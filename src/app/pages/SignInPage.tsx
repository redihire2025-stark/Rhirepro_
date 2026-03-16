import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { User, Briefcase, Mail, Lock, Eye, EyeOff, Loader2, ShieldCheck, RefreshCw } from "lucide-react";
import logoImage from "../../logo/logo.png";
import { supabase } from "../../lib/supabase";
import { sendOTPEmail, isEmailConfigured } from "../../lib/email";

// ── OTP helpers ──────────────────────────────────────────────────────────────

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function storeJobseekerOTP(userId: string, otp: string) {
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const { error } = await supabase.from("profiles").update({ otp_code: otp, otp_expires_at: expires }).eq("id", userId);
  if (error) throw new Error("Failed to store OTP: " + error.message);
}

async function storeRecruiterOTP(userId: string, otp: string) {
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const { error } = await supabase.from("recruiter_profiles").update({ otp_code: otp, otp_expires_at: expires }).eq("id", userId);
  if (error) throw new Error("Failed to store OTP: " + error.message);
}

async function verifyJobseekerOTP(userId: string, otp: string): Promise<boolean> {
  const { data } = await supabase.from("profiles").select("otp_code, otp_expires_at").eq("id", userId).single();
  if (!data?.otp_code) return false;
  if (new Date(data.otp_expires_at) < new Date()) return false;
  return data.otp_code === otp;
}

async function verifyRecruiterOTP(userId: string, otp: string): Promise<boolean> {
  const { data } = await supabase.from("recruiter_profiles").select("otp_code, otp_expires_at").eq("id", userId).single();
  if (!data?.otp_code) return false;
  if (new Date(data.otp_expires_at) < new Date()) return false;
  return data.otp_code === otp;
}

// ── Google icon ──────────────────────────────────────────────────────────────

const GoogleIcon = () => (
  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

// ── Main component ────────────────────────────────────────────────────────────

export default function SignInPage() {
  const [userType, setUserType] = useState<"jobseeker" | "recruiter">("jobseeker");
  const [step, setStep] = useState<"credentials" | "otp" | "forgot">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [userId, setUserId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const navigate = useNavigate();

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setError("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setForgotSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send reset email.");
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

      const role = data.user.user_metadata?.role;

      if (userType === "jobseeker") {
        // Reject recruiters
        if (role === "recruiter") {
          await supabase.auth.signOut();
          throw new Error("This is a Recruiter account. Please select Recruiter and try again.");
        }

        // Ensure profile row exists
        const { data: profile, error: profileErr } = await supabase
          .from("profiles").select("id, first_name, last_name").eq("id", data.user.id).single();

        const meta = data.user.user_metadata || {};
        const firstName = profile?.first_name || meta.first_name || "";
        const lastName = profile?.last_name || meta.last_name || "";

        if (profileErr || !profile) {
          const { error: insertErr } = await supabase.from("profiles").insert({
            id: data.user.id, email: data.user.email,
            first_name: firstName || null, last_name: lastName || null,
            phone: meta.phone || null,
            experience_type: (meta.experience as "fresher" | "experienced") || "fresher",
          });
          if (insertErr && insertErr.code !== "23505") {
            await supabase.auth.signOut();
            throw new Error("Account setup failed. Please try signing up again.");
          }
        }

        const generatedOTP = generateOTP();
        await storeJobseekerOTP(data.user.id, generatedOTP);
        setUserId(data.user.id);
        setDisplayName([firstName, lastName].filter(Boolean).join(" "));

        if (isEmailConfigured()) {
          await sendOTPEmail(email, generatedOTP, [firstName, lastName].filter(Boolean).join(" "));
        } else {
          setDevOtp(generatedOTP);
        }

      } else {
        // Recruiter
        if (role === "jobseeker") {
          await supabase.auth.signOut();
          throw new Error("This is a Job Seeker account. Please select Job Seeker and try again.");
        }

        const { data: rp, error: rpErr } = await supabase
          .from("recruiter_profiles").select("id, recruiter_name").eq("id", data.user.id).single();

        if (rpErr || !rp) {
          await supabase.auth.signOut();
          throw new Error("No recruiter account found. Please sign up first.");
        }

        const generatedOTP = generateOTP();
        await storeRecruiterOTP(data.user.id, generatedOTP);
        setUserId(data.user.id);
        setDisplayName(rp.recruiter_name || "");

        if (isEmailConfigured()) {
          await sendOTPEmail(email, generatedOTP, rp.recruiter_name || "");
        } else {
          setDevOtp(generatedOTP);
        }
      }

      setStep("otp");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const valid = userType === "jobseeker"
        ? await verifyJobseekerOTP(userId, otp.trim())
        : await verifyRecruiterOTP(userId, otp.trim());

      if (!valid) throw new Error("Invalid or expired OTP. Please try again.");

      if (userType === "jobseeker") {
        await supabase.from("profiles").update({ otp_code: null, otp_expires_at: null }).eq("id", userId);
        navigate("/jobseeker/dashboard");
      } else {
        await supabase.from("recruiter_profiles").update({ otp_code: null, otp_expires_at: null }).eq("id", userId);
        navigate("/recruiter/dashboard");
      }
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
      if (userType === "jobseeker") {
        await storeJobseekerOTP(userId, newOTP);
      } else {
        await storeRecruiterOTP(userId, newOTP);
      }
      if (isEmailConfigured()) {
        await sendOTPEmail(email, newOTP, displayName);
      } else {
        setDevOtp(newOTP);
      }
      setOtp("");
    } catch {
      setError("Failed to resend OTP. Please try again.");
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/jobseeker/dashboard`,
          queryParams: { access_type: "offline", prompt: "consent" },
          scopes: "email profile",
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google sign in failed.");
      setLoading(false);
    }
  };

  const resetToCredentials = () => {
    setStep("credentials");
    setOtp("");
    setError("");
    setDevOtp("");
  };

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
              <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">Welcome Back to RhirePro</h1>
              <p className="text-lg text-white/90 mb-8">Sign in to continue your journey and find opportunities that match your goals</p>
              <div className="space-y-4">
                {["10,000+ verified job listings", "AI-powered job matching", "Connect with top employers"].map(text => (
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
                Don't have an account?{" "}
                <button onClick={() => navigate("/signup")} className="text-white font-semibold hover:underline">Sign Up</button>
              </p>
            </div>
          </div>

          {/* Right Panel */}
          <div className="p-8 md:p-12 flex items-center">
            <div className="w-full max-w-md mx-auto">

              {step === "credentials" ? (
                <>
                  <h2 className="text-3xl font-bold text-[#3A1F1F] mb-2">Sign In</h2>
                  <p className="text-[#8A8A8A] mb-6">Welcome back! Please enter your details</p>

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

                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div>
                      <label className="block text-[#3A1F1F] font-medium mb-1.5 text-sm">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#8A8A8A]" />
                        <Input type="email" value={email} onChange={e => setEmail(e.target.value)}
                          className="pl-10 bg-[#ECECF4] border-0 rounded-xl py-5 focus-visible:ring-2 focus-visible:ring-[#FF2B2B]"
                          placeholder="Enter your email" required autoComplete="email" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-[#3A1F1F] font-medium text-sm">Password</label>
                        <button type="button" className="text-xs text-[#FF2B2B] hover:underline" onClick={() => { setForgotEmail(email); setForgotSent(false); setError(""); setStep("forgot"); }}>Forgot password?</button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#8A8A8A]" />
                        <Input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                          className="pl-10 pr-10 bg-[#ECECF4] border-0 rounded-xl py-5 focus-visible:ring-2 focus-visible:ring-[#FF2B2B]"
                          placeholder="Enter your password" required autoComplete="current-password" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8A8A]">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <Button type="submit" disabled={loading}
                      className="w-full bg-gradient-to-r from-[#FF2B2B] to-[#e02525] hover:from-[#e02525] hover:to-[#FF2B2B] text-white rounded-full py-5 text-base font-semibold mt-2">
                      {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</> : "Continue"}
                    </Button>
                  </form>

                  {userType === "jobseeker" && (
                    <>
                      <div className="relative my-5">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                        <div className="relative flex justify-center text-sm"><span className="px-4 bg-white text-[#8A8A8A]">Or continue with</span></div>
                      </div>
                      <Button type="button" variant="outline" onClick={handleGoogleSignIn} disabled={loading}
                        className="w-full border-2 border-gray-200 rounded-xl py-5 hover:bg-gray-50">
                        <GoogleIcon /> Google
                      </Button>
                    </>
                  )}
                </>
              ) : step === "forgot" ? (
                <>
                  {/* Forgot Password Step */}
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Mail className="h-8 w-8 text-[#FF2B2B]" />
                    </div>
                    <h2 className="text-2xl font-bold text-[#3A1F1F] mb-1">Reset Password</h2>
                    <p className="text-[#8A8A8A] text-sm">Enter your email and we'll send a reset link</p>
                  </div>
                  {forgotSent ? (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 text-center">
                      <p className="text-sm font-medium text-green-700">✓ Reset link sent!</p>
                      <p className="text-xs text-green-600 mt-1">Check your inbox at <strong>{forgotEmail}</strong></p>
                    </div>
                  ) : (
                    <>
                      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>}
                      <form onSubmit={handleForgotPassword} className="space-y-4">
                        <div>
                          <label className="block text-[#3A1F1F] font-medium mb-1.5 text-sm">Email</label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#8A8A8A]" />
                            <Input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                              className="pl-10 bg-[#ECECF4] border-0 rounded-xl py-5 focus-visible:ring-2 focus-visible:ring-[#FF2B2B]"
                              placeholder="Enter your email" required autoFocus />
                          </div>
                        </div>
                        <Button type="submit" disabled={forgotLoading}
                          className="w-full bg-gradient-to-r from-[#FF2B2B] to-[#e02525] text-white rounded-full py-5 text-base font-semibold">
                          {forgotLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</> : "Send Reset Link"}
                        </Button>
                      </form>
                    </>
                  )}
                  <button onClick={() => { setStep("credentials"); setError(""); setForgotSent(false); }} className="mt-4 text-sm text-[#8A8A8A] hover:text-[#3A1F1F]">
                    ← Back to Sign In
                  </button>
                </>
              ) : (
                <>
                  {/* OTP Step */}
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ShieldCheck className="h-8 w-8 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-[#3A1F1F] mb-1">OTP Verification</h2>
                    <p className="text-[#8A8A8A] text-sm">
                      Enter the 6-digit code sent to<br />
                      <span className="font-medium text-[#3A1F1F]">{email}</span>
                    </p>
                  </div>

                  {!isEmailConfigured() && devOtp && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4 text-center">
                      <p className="text-xs text-yellow-700 font-medium">Development Mode — your OTP:</p>
                      <p className="text-2xl font-bold text-yellow-800 tracking-widest mt-1">{devOtp}</p>
                    </div>
                  )}

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>
                  )}

                  <form onSubmit={handleVerifyOTP} className="space-y-4">
                    <div>
                      <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F] text-center">Enter OTP</label>
                      <Input type="text" value={otp}
                        onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="bg-[#ECECF4] border-0 rounded-xl text-center text-2xl tracking-widest font-bold py-5"
                        placeholder="------" maxLength={6} required autoFocus />
                    </div>
                    <Button type="submit" disabled={loading || otp.length < 6}
                      className="w-full bg-gradient-to-r from-[#FF2B2B] to-[#e02525] text-white rounded-full py-5 text-base font-semibold">
                      {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</> : "Verify & Sign In"}
                    </Button>
                  </form>

                  <div className="flex items-center justify-between mt-4">
                    <button onClick={resetToCredentials} className="text-sm text-[#8A8A8A] hover:text-[#3A1F1F]">
                      ← Back
                    </button>
                    <button onClick={handleResendOTP} className="text-sm text-[#FF2B2B] hover:underline flex items-center gap-1">
                      <RefreshCw className="h-3 w-3" /> Resend OTP
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
