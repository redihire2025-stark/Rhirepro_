import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router";

const logoImage = new URL("../../logo/logo.png", import.meta.url).href;
import { Eye, EyeOff, Loader2, ShieldCheck, RefreshCw, Building2, Mail, LifeBuoy } from "lucide-react";
import { SupportTicketDialog } from "../components/SupportTicketDialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth-context";
import { requestOTP, verifyOTP, sendPasswordResetOTP, resetPasswordWithOTP, secureSignIn } from "../../lib/email";

export default function RecruiterSignIn() {
  const [step, setStep] = useState<"credentials" | "otp" | "forgot" | "forgot-otp">("credentials");
  const [supportTicketOpen, setSupportTicketOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotOtp, setForgotOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const navigate = useNavigate();

  // A session this page did not create — a Google OAuth return, or a bounce from
  // a dashboard auth guard — must not strand an authenticated user on the login
  // form. The OTP step legitimately runs with a live session, so it is excluded.
  const { user: authedUser, role: authedRole, loading: authLoading } = useAuth();
  const startedSignInHere = useRef(false);

  useEffect(() => {
    if (authLoading || startedSignInHere.current) return;
    if (step !== "credentials" || !authedUser) return;
    const effectiveRole = authedUser.user_metadata?.role || authedRole;
    navigate(effectiveRole === "recruiter" ? "/recruiter/dashboard" : "/jobseeker/dashboard", { replace: true });
  }, [authLoading, authedUser, authedRole, step, navigate]);


  useEffect(() => {
    const originalBg = document.body.style.backgroundColor;
    document.body.style.backgroundColor = "#3A1F1F";
    return () => {
      document.body.style.backgroundColor = originalBg;
    };
  }, []);

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
    // Claim the session about to be created so the redirect effect leaves the
    // OTP step alone.
    startedSignInHere.current = true;
    try {
      // 1. Authenticate securely (SHA-256 pre-hashed password)
      const { data, error: authErr } = await secureSignIn(email, password);
      if (authErr) throw new Error("Invalid email or password. Please try again.");
      if (!data.user) throw new Error("Authentication failed.");

      // 2. Reject job seeker accounts on this page
      if (data.user.user_metadata?.role === "jobseeker") {
        await supabase.auth.signOut();
        throw new Error("This is a Job Seeker account. Please use Job Seeker Sign In.");
      }

      // 3. Check recruiter profile exists in DB.
      // Read through my_recruiter_profile() rather than the table: `authenticated`
      // holds SELECT on only the public columns, and the gate below needs
      // verification_status and rejection_reason, which it does not.
      const { data: rp, error: rpErr } = await supabase.rpc("my_recruiter_profile").maybeSingle();

      if (rpErr || !rp) {
        await supabase.auth.signOut();
        throw new Error("No recruiter account found with this email. Please sign up first.");
      }

      if (rp.is_disabled) {
        await supabase.auth.signOut();
        throw new Error("This account has been disabled. Please contact your organization admin.");
      }

      // is_active is the org-admin-facing "Deactivate member" toggle (and
      // what the plan-cancellation unwind sets when a team is dissolved) —
      // it was being fetched and shown in the Team tab but never actually
      // checked anywhere, so deactivating someone never stopped them
      // signing in or using the platform. NULL/undefined still means
      // active (matches the COALESCE(is_active, true) used elsewhere) —
      // only an explicit false blocks.
      if (rp.is_active === false) {
        await supabase.auth.signOut();
        throw new Error("Your account has been deactivated. Please contact your organization admin.");
      }

      // 3b. Super Admin approval gate. recruiter_profiles.verification_status
      // defaults to 'Pending', so a brand-new account cannot get in until an
      // admin approves it.
      if (rp.verification_status === "Rejected") {
        await supabase.auth.signOut();
        throw new Error(
          rp.rejection_reason
            ? `Your account application was declined: ${rp.rejection_reason}`
            : "Your account application was declined. Please contact support@rhirepro.com.",
        );
      }

      if (rp.verification_status !== "Verified") {
        await supabase.auth.signOut();
        throw new Error(
          "Your account is awaiting approval from our team. You'll receive an email once it's approved.",
        );
      }

      setUserId(data.user.id);
      setDisplayName(rp.recruiter_name || "");
      // Org admin accounts follow the admin_org{n}@redhire.dev convention (10 companies, org1-org10).
      // org_role defaults to 'admin' for every recruiter_profiles row, so the DB flags
      // (org_role / is_org_admin) are the source of truth; the email pattern below is a
      // fallback in case those flags haven't been explicitly set for a given account yet.
      // org_role defaults to 'admin' for EVERY recruiter_profiles row (including solo recruiters),
      // so it cannot distinguish a real org admin on its own. max_seats is the real signal:
      // seeded org admins have max_seats = 10, solo recruiters default to 5.
      const isOrgAdminEmail = /^admin_org\d+@redhire\.dev$/i.test(email.trim());
      const hasOrgSeats = (rp.max_seats ?? 0) > 5;
      setIsOrgAdmin((rp.org_role === "admin" && hasOrgSeats) || !!rp.is_org_admin || isOrgAdminEmail);

      await requestOTP({ email, name: rp.recruiter_name || "", userType: "recruiter", purpose: "login" });

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
      await verifyOTP({ email, otp: otp.trim(), userType: "recruiter", purpose: "login" });
      await supabase.from("recruiter_profiles").update({ last_login_at: new Date().toISOString() }).eq("id", userId);
      navigate(isOrgAdmin ? "/recruiter/admin" : "/recruiter/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!email) return;
    setResendLoading(true);
    setError("");
    try {
      await requestOTP({ email, name: displayName, userType: "recruiter", purpose: "login" });
      setOtp("");
    } catch {
      setError("Failed to resend OTP. Please try again.");
    } finally {
      setResendLoading(false);
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
          {step === "forgot" ? (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="h-8 w-8 text-[#FF2B2B]" />
                </div>
                <h2 className="text-2xl font-bold text-[#3A1F1F] mb-1">Reset Password</h2>
                <p className="text-[#8A8A8A] text-sm">Enter your work email and we'll send a password reset OTP</p>
              </div>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>}
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Work Email</label>
                  <Input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                    className="bg-[#F6F6F6] border-gray-200 rounded-xl" placeholder="hr@yourcompany.com" required autoFocus />
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
                <div>
                  <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Email Address</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="bg-[#F6F6F6] border-gray-200 rounded-xl"
                    placeholder="hr@yourcompany.com"
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

              <p className="text-center mt-6 text-sm text-[#8A8A8A]">
                Don't have an account?{" "}
                <Link to="/recruiter/signup" className="text-[#FF2B2B] font-semibold hover:underline">
                  Sign Up
                </Link>
              </p>

              <button
                type="button"
                onClick={() => setSupportTicketOpen(true)}
                className="mt-3 flex items-center gap-1.5 text-xs text-[#8A8A8A] hover:text-[#FF2B2B] mx-auto"
              >
                <LifeBuoy className="h-3.5 w-3.5" /> Trouble signing in? Raise a ticket
              </button>
            </>
          ) : (
            <>
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
                  disabled={loading || resendLoading || otp.length < 6}
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
                  type="button"
                  onClick={handleResendOTP}
                  disabled={loading || resendLoading}
                  className="text-sm text-[#FF2B2B] hover:underline flex items-center gap-1"
                >
                  {resendLoading ? <><Loader2 className="h-3 w-3 animate-spin" /> Resending...</> : <><RefreshCw className="h-3 w-3" /> Resend OTP</>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <SupportTicketDialog
        open={supportTicketOpen}
        onOpenChange={setSupportTicketOpen}
        userType="guest"
      />
    </div>
  );
}
