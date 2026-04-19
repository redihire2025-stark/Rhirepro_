import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";

const logoImage = new URL("../../logo/logo.png", import.meta.url).href;
import { Eye, EyeOff, Loader2, ShieldCheck, RefreshCw, Mail } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { supabase } from "../../lib/supabase";
import { sendOTPEmail, sendPasswordResetOTP, resetPasswordWithOTP } from "../../lib/email";
import { useAuth } from "../../lib/auth-context";
import { ensureJobseekerGoogleProfile } from "../../lib/google-auth";

// ─── OTP helpers ─────────────────────────────────────────────────────────────

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function storeOTP(userId: string, otp: string) {
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const { error } = await supabase.from("profiles").update({
    otp_code: otp,
    otp_expires_at: expires,
  }).eq("id", userId);
  if (error) throw new Error("Failed to store OTP: " + error.message);
}

async function verifyOTPFromDB(userId: string, otp: string): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("otp_code, otp_expires_at")
    .eq("id", userId)
    .single();
  if (!data?.otp_code) return false;
  if (new Date(data.otp_expires_at) < new Date()) return false;
  return data.otp_code === otp;
}

// ─── Google SVG ──────────────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function JobSeekerSignIn() {
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
  const [googleReady, setGoogleReady] = useState(false);
  const navigate = useNavigate();

  // Handle navigation after Google sign-in
  const { user, role } = useAuth();
  useEffect(() => {
    if (user && role) {
      navigate(role === "jobseeker" ? "/jobseeker/dashboard" : "/recruiter/dashboard", { replace: true });
    }
  }, [user, role, navigate]);

  useEffect(() => {
    const initGoogle = () => {
      const google = (window as any).google;
      if (!google?.accounts?.id) return false;

      try {
        google.accounts.id.initialize({
          client_id: '598285311977-nkq81asj8olahuvl82jfrsi36flojo81.apps.googleusercontent.com',
          callback: async (response: any) => {
            console.log('Google sign-in response:', response);
            try {
              const { data, error } = await supabase.auth.signInWithIdToken({
                provider: 'google',
                token: response.credential
              });
              if (error) {
                console.error('Supabase auth error:', error);
                throw error;
              }
              if (!data.user) {
                throw new Error("Google sign in failed.");
              }
              await ensureJobseekerGoogleProfile(data.user);
              console.log('Supabase auth success:', data);
            } catch (err: unknown) {
              console.error('Auth callback error:', err);
              setError(err instanceof Error ? err.message : "Google sign in failed.");
              setLoading(false);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true
        });

        // Try to render the Google button
        const buttonElement = document.getElementById('google-signin-button');
        if (buttonElement) {
          google.accounts.id.renderButton(buttonElement, {
            theme: 'outline',
            size: 'large',
            width: 400,
            text: 'continue_with',
            shape: 'rectangular'
          });
          console.log('Google button rendered successfully');
        }

        setGoogleReady(true);
        console.log('Google Identity Services initialized successfully');
        return true;
      } catch (err) {
        console.error('Google initialization error:', err);
        return false;
      }
    };

    if (!initGoogle()) {
      const interval = window.setInterval(() => {
        if (initGoogle()) {
          window.clearInterval(interval);
        }
      }, 100);
      return () => window.clearInterval(interval);
    }
  }, []);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setError("");
    try {
      await sendPasswordResetOTP(forgotEmail, "jobseeker");
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
      await resetPasswordWithOTP(forgotEmail, forgotOtp, newPassword, "jobseeker");
      setResetSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reset password.");
    } finally {
      setForgotLoading(false);
    }
  };

  // ── Step 1: Verify credentials → check DB → send OTP ─────────────────────
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // 1. Authenticate with Supabase
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
      if (authErr) throw new Error("Invalid email or password. Please try again.");
      if (!data.user) throw new Error("Authentication failed.");

      // 2. Reject recruiter accounts on this page
      if (data.user.user_metadata?.role === "recruiter") {
        await supabase.auth.signOut();
        throw new Error("This is a Recruiter account. Please use Recruiter Sign In.");
      }

      // 3. Check job seeker profile exists in DB
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .eq("id", data.user.id)
        .single();

      const meta = data.user.user_metadata || {};
      let firstName = profile?.first_name || meta.first_name || "";
      let lastName = profile?.last_name || meta.last_name || "";

      if (profileErr || !profile) {
        // Profile missing — auto-create from auth metadata (handles accounts created before DB trigger)
        const { error: insertErr } = await supabase.from("profiles").insert({
          id: data.user.id,
          email: data.user.email,
          first_name: firstName || null,
          last_name: lastName || null,
          phone: meta.phone || null,
          experience_type: (meta.experience as "fresher" | "experienced") || "fresher",
        });
        if (insertErr && insertErr.code !== "23505") {
          await supabase.auth.signOut();
          throw new Error("Account setup failed. Please try signing up again.");
        }
      }

      // 4. Generate & store OTP
      const generatedOTP = generateOTP();
      await storeOTP(data.user.id, generatedOTP);
      setUserId(data.user.id);

      const fullName = [firstName, lastName].filter(Boolean).join(" ");
      await sendOTPEmail(email, generatedOTP, fullName);

      setStep("otp");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign in failed. Check credentials.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP ────────────────────────────────────────────────────
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const valid = await verifyOTPFromDB(userId, otp.trim());
      if (!valid) throw new Error("Invalid or expired OTP. Please try again.");
      await supabase.from("profiles").update({ otp_code: null, otp_expires_at: null }).eq("id", userId);
      navigate("/jobseeker/dashboard", { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP ────────────────────────────────────────────────────────────
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

  // ── Google Sign In ────────────────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    console.log('Google sign-in button clicked, googleReady:', googleReady);

    try {
      if (!googleReady) {
        throw new Error("Google sign-in is not ready yet. Please refresh the page.");
      }

      const google = (window as any).google;
      if (!google?.accounts?.id) {
        throw new Error("Google Identity Services not loaded. Please refresh the page.");
      }

      console.log('Calling google.accounts.id.prompt()');
      google.accounts.id.prompt((notification: any) => {
        console.log('Prompt notification:', notification);
        if (notification.isNotDisplayed && notification.isNotDisplayed()) {
          console.error('Prompt not displayed, reason:', notification.getNotDisplayedReason?.());
          const reason = notification.getNotDisplayedReason?.() || 'unknown';
          let errorMessage = "Google sign-in prompt could not be displayed.";

          switch (reason) {
            case 'browser_not_supported':
              errorMessage = "Your browser doesn't support Google Sign-In. Please try a different browser.";
              break;
            case 'invalid_client':
              errorMessage = "Google Sign-In is not properly configured. Please contact support.";
              break;
            case 'missing_client_id':
              errorMessage = "Google Sign-In client ID is missing. Please contact support.";
              break;
            case 'opt_out_or_no_session':
              errorMessage = "Please sign in with your Google account first.";
              break;
            case 'secure_http_required':
            case 'suppressed_by_user':
            case 'unregistered_origin':
            case 'unknown_reason':
            default:
              errorMessage = "Google sign-in prompt could not be displayed. Please refresh the page or try again later.";
          }

          setError(errorMessage);
        } else if (notification.isSkippedMoment && notification.isSkippedMoment()) {
          console.log('Prompt was skipped');
        } else if (notification.isDismissedMoment && notification.isDismissedMoment()) {
          console.log('Prompt was dismissed by user');
        }
      });
    } catch (err: unknown) {
      console.error('Google sign-in error:', err);
      setError(err instanceof Error ? err.message : "Google sign in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F6F6F6] to-[#FFE8E8] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
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
          {step === "forgot" ? (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="h-8 w-8 text-[#FF2B2B]" />
                </div>
                <h2 className="text-2xl font-bold text-[#3A1F1F] mb-1">Reset Password</h2>
                <p className="text-[#8A8A8A] text-sm">Enter your email and we'll send a password reset OTP</p>
              </div>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>}
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Email Address</label>
                  <Input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                    className="bg-[#F6F6F6] border-gray-200 rounded-xl" placeholder="you@email.com" required autoFocus />
                </div>
                <Button type="submit" disabled={forgotLoading} className="w-full bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full py-6 mt-2">
                  {forgotLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending OTP...</> : "Send Reset OTP"}
                </Button>
              </form>
              <button onClick={() => { setStep("credentials"); setError(""); }} className="mt-4 text-sm text-[#8A8A8A] hover:text-[#3A1F1F] block">
                ← Back to Sign In
              </button>
            </>
          ) : step === "forgot-otp" ? (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="h-8 w-8 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-[#3A1F1F] mb-1">Reset Password</h2>
                <p className="text-[#8A8A8A] text-sm">Enter the OTP sent to <strong>{forgotEmail}</strong> and set your new password</p>
              </div>
              {resetSuccess ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 text-center">
                  <p className="text-sm font-medium text-green-700">✓ Password reset successfully!</p>
                  <p className="text-xs text-green-600 mt-1">You can now sign in with your new password.</p>
                  <button onClick={() => { setStep("credentials"); setResetSuccess(false); setForgotOtp(""); setNewPassword(""); setConfirmPassword(""); }} className="mt-3 text-sm text-[#FF2B2B] font-semibold hover:underline">Go to Sign In →</button>
                </div>
              ) : (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-500 shrink-0" />
                    <p className="text-xs text-blue-700">Password reset OTP sent to <strong>{forgotEmail}</strong>. Valid for 10 minutes.</p>
                  </div>
                  {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>}
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div>
                      <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F] text-center">Enter Reset OTP</label>
                      <Input type="text" value={forgotOtp}
                        onChange={e => setForgotOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="bg-[#F6F6F6] border-gray-200 rounded-xl text-center text-2xl tracking-widest font-bold py-5"
                        placeholder="------" maxLength={6} required autoFocus />
                    </div>
                    <div>
                      <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">New Password</label>
                      <div className="relative">
                        <Input type={showNewPassword ? "text" : "password"} value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          className="bg-[#F6F6F6] border-gray-200 rounded-xl pr-10"
                          placeholder="Min. 8 characters" required minLength={8} />
                        <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8A8A]">
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Confirm New Password</label>
                      <Input type="password" value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="bg-[#F6F6F6] border-gray-200 rounded-xl"
                        placeholder="Re-enter new password" required />
                    </div>
                    <Button type="submit" disabled={forgotLoading || forgotOtp.length < 6 || !newPassword || !confirmPassword}
                      className="w-full bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full py-6 mt-2">
                      {forgotLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Resetting...</> : "Reset Password"}
                    </Button>
                  </form>
                  <div className="flex items-center justify-between mt-4">
                    <button onClick={() => { setStep("forgot"); setError(""); setForgotOtp(""); }}
                      className="text-sm text-[#8A8A8A] hover:text-[#3A1F1F]">← Back</button>
                    <button type="button" onClick={() => { setError(""); handleForgotPassword({ preventDefault: () => {} } as React.FormEvent); }}
                      className="text-sm text-[#FF2B2B] hover:underline flex items-center gap-1">
                      <RefreshCw className="h-3 w-3" /> Resend OTP
                    </button>
                  </div>
                </>
              )}
            </>
          ) : step === "credentials" ? (
            <>
              <h2 className="text-2xl font-bold text-[#3A1F1F] mb-1">Welcome Back!</h2>
              <p className="text-[#8A8A8A] mb-6 text-sm">Sign in to your job seeker account</p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>
              )}

              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Email Address</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="bg-[#F6F6F6] border-gray-200 rounded-xl"
                    placeholder="you@email.com"
                    required
                    autoComplete="email"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-sm font-medium text-[#3A1F1F]">Password</label>
                    <button type="button" className="text-xs text-[#FF2B2B] hover:underline" onClick={() => { setForgotEmail(email); setError(""); setStep("forgot"); }}>Forgot password?</button>
                  </div>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="bg-[#F6F6F6] border-gray-200 rounded-xl pr-10"
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
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

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full py-6 mt-2"
                >
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</> : "Continue"}
                </Button>
              </form>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-white text-[#8A8A8A]">or continue with</span>
                </div>
              </div>

              <div id="google-signin-button" className="w-full">
                {/* Google will render the button here */}
              </div>

              <p className="text-center mt-6 text-sm text-[#8A8A8A]">
                Don't have an account?{" "}
                <Link to="/jobseeker/signup" className="text-[#FF2B2B] font-semibold hover:underline">
                  Sign Up Free
                </Link>
              </p>
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
                  A 6-digit code has been sent to<br />
                  <span className="font-medium text-[#3A1F1F]">{email}</span>
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-500 shrink-0" />
                <p className="text-xs text-blue-700">Check your inbox — OTP sent to <strong>{email}</strong>. Valid for 10 minutes.</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>
              )}

              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div>
                  <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F] text-center">Enter OTP</label>
                  <Input
                    type="text"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="bg-[#F6F6F6] border-gray-200 rounded-xl text-center text-2xl tracking-widest font-bold"
                    placeholder="------"
                    maxLength={6}
                    required
                    autoFocus
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-full bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full py-6"
                >
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</> : "Verify & Sign In"}
                </Button>
              </form>

              <div className="flex items-center justify-between mt-4">
                <button
                  onClick={() => { setStep("credentials"); setOtp(""); setError(""); }}
                  className="text-sm text-[#8A8A8A] hover:text-[#3A1F1F]"
                >
                  ← Back
                </button>
                <button
                  onClick={handleResendOTP}
                  className="text-sm text-[#FF2B2B] hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" /> Resend OTP
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
