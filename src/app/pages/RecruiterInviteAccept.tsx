import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { supabase } from "../../lib/supabase";
import { Eye, EyeOff, Loader2, CheckCircle, Building2, ShieldCheck, XCircle, Clock } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

const logoImage = new URL("../../logo/logo.png", import.meta.url).href;

type InviteDetails = {
  id: string;
  org_admin_id: string;
  company_name: string;
  invited_email: string;
  role: string;
  expires_at: string;
  admin_name: string | null;
  admin_industry: string | null;
  admin_location: string | null;
  admin_logo_url: string | null;
  admin_company_size: string | null;
};

type TokenState = "loading" | "valid" | "invalid" | "expired" | "used";

export default function RecruiterInviteAccept() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [tokenState, setTokenState] = useState<TokenState>("loading");
  const [invite, setInvite] = useState<InviteDetails | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // ── Token validation ─────────────────────────────────────────

  useEffect(() => {
    if (!token) { setTokenState("invalid"); return; }

    async function validate() {
      const { data, error: rpcErr } = await supabase.rpc("get_invitation_by_token", {
        p_token: token,
      });

      if (rpcErr || !data || data.length === 0) {
        // Try to check if it was already used
        const { data: raw } = await supabase
          .from("recruiter_invitations")
          .select("status")
          .eq("token", token)
          .maybeSingle();

        if (!raw) { setTokenState("invalid"); return; }
        if (raw.status === "accepted") { setTokenState("used"); return; }
        setTokenState("expired");
        return;
      }

      setInvite(data[0] as InviteDetails);
      setTokenState("valid");
    }

    validate();
  }, [token]);

  // ── Submit ───────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!invite) return;

    setLoading(true);
    try {
      // 1. Create Supabase auth account
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: invite.invited_email,
        password: formData.password,
        options: {
          data: {
            role: "recruiter",
            recruiter_name: formData.name.trim(),
            company_name: invite.company_name,
            industry: invite.admin_industry || "",
            company_size: invite.admin_company_size || "",
            phone: "",
          },
        },
      });

      if (signUpError) {
        if (signUpError.message?.toLowerCase().includes("already registered")) {
          setError("An account with this email already exists. Please sign in.");
        } else {
          setError(signUpError.message || "Sign-up failed.");
        }
        return;
      }

      if (!authData.user) {
        setError("Account creation failed. Please try again.");
        return;
      }

      // 2. Wait for the DB trigger to create the recruiter_profile row
      let profileCreated = false;
      for (let i = 0; i < 5; i++) {
        await new Promise(r => setTimeout(r, 800));
        const { data: pCheck } = await supabase
          .from("recruiter_profiles")
          .select("id")
          .eq("id", authData.user.id)
          .maybeSingle();
        if (pCheck) { profileCreated = true; break; }
      }

      if (profileCreated) {
        // 3. Link profile to org
        await supabase.from("recruiter_profiles").update({
          org_role: invite.role || "member",
          org_admin_id: invite.org_admin_id,
        }).eq("id", authData.user.id);
      }

      // 4. Mark invitation as accepted (using the public policy or admin context)
      await supabase
        .from("recruiter_invitations")
        .update({ status: "accepted" })
        .eq("token", token!);

      setSuccess(true);
      // Auto-redirect to sign-in after 3 seconds
      setTimeout(() => navigate("/recruiter/signin"), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Render states ────────────────────────────────────────────

  if (tokenState === "loading") {
    return <FullPageCenter><Loader2 className="h-10 w-10 text-[#FF2B2B] animate-spin" /></FullPageCenter>;
  }

  if (tokenState === "invalid") {
    return (
      <FullPageCenter>
        <XCircle className="h-14 w-14 text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-[#3A1F1F] mb-2">Invalid Invitation</h2>
        <p className="text-[#8A8A8A] text-center text-sm max-w-xs">
          This invitation link is invalid or doesn't exist. Please contact your team admin for a new invitation.
        </p>
        <Link to="/recruiter/signin" className="mt-6 text-[#FF2B2B] text-sm hover:underline">
          Sign in instead →
        </Link>
      </FullPageCenter>
    );
  }

  if (tokenState === "expired") {
    return (
      <FullPageCenter>
        <Clock className="h-14 w-14 text-orange-400 mb-4" />
        <h2 className="text-xl font-bold text-[#3A1F1F] mb-2">Invitation Expired</h2>
        <p className="text-[#8A8A8A] text-center text-sm max-w-xs">
          This invitation link has expired. Please ask your team admin to send a new one.
        </p>
        <Link to="/recruiter/signin" className="mt-6 text-[#FF2B2B] text-sm hover:underline">
          Sign in instead →
        </Link>
      </FullPageCenter>
    );
  }

  if (tokenState === "used") {
    return (
      <FullPageCenter>
        <CheckCircle className="h-14 w-14 text-green-400 mb-4" />
        <h2 className="text-xl font-bold text-[#3A1F1F] mb-2">Already Accepted</h2>
        <p className="text-[#8A8A8A] text-center text-sm max-w-xs">
          This invitation has already been accepted. Sign in to access your account.
        </p>
        <Link to="/recruiter/signin" className="mt-6 text-[#FF2B2B] text-sm font-medium hover:underline">
          Sign in →
        </Link>
      </FullPageCenter>
    );
  }

  if (success) {
    return (
      <FullPageCenter>
        <CheckCircle className="h-14 w-14 text-green-500 mb-4" />
        <h2 className="text-xl font-bold text-[#3A1F1F] mb-2">Welcome to {invite?.company_name}!</h2>
        <p className="text-[#8A8A8A] text-center text-sm max-w-xs">
          Your account has been created. Redirecting you to sign in…
        </p>
        <div className="mt-4 flex items-center gap-2 text-sm text-[#8A8A8A]">
          <Loader2 className="h-4 w-4 animate-spin" /> Redirecting…
        </div>
      </FullPageCenter>
    );
  }

  // Main form
  return (
    <div className="min-h-screen bg-[#F6F6F6] flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <Link to="/" className="flex items-center gap-3 w-fit">
            <img src={logoImage} alt="RhirePro" className="w-10 h-10" />
            <div className="text-2xl font-bold text-[#3A1F1F]">
              Rhire<span className="text-[#FF2B2B]">Pro</span>
            </div>
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Company banner */}
          {invite && (
            <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm flex items-center gap-4">
              {invite.admin_logo_url ? (
                <img
                  src={invite.admin_logo_url}
                  alt={invite.company_name}
                  className="w-14 h-14 rounded-xl object-contain border border-gray-100"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-[#FFF0F0] flex items-center justify-center">
                  <Building2 className="h-7 w-7 text-[#FF2B2B]" />
                </div>
              )}
              <div>
                <p className="font-bold text-[#3A1F1F] text-lg">{invite.company_name}</p>
                {invite.admin_industry && (
                  <p className="text-sm text-[#8A8A8A]">{invite.admin_industry}</p>
                )}
                {invite.admin_location && (
                  <p className="text-xs text-[#8A8A8A]">{invite.admin_location}</p>
                )}
              </div>
            </div>
          )}

          {/* Form card */}
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-[#3A1F1F]">Join your team</h1>
              <p className="text-[#8A8A8A] text-sm mt-1">
                You've been invited to join{" "}
                <span className="font-semibold text-[#3A1F1F]">{invite?.company_name}</span> by{" "}
                {invite?.admin_name || "your team admin"}.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Pre-filled email (read-only) */}
              <div>
                <label className="text-sm font-medium text-[#3A1F1F] block mb-1.5">
                  Email address
                </label>
                <Input
                  value={invite?.invited_email || ""}
                  readOnly
                  className="bg-[#F6F6F6] border-gray-200 rounded-xl text-[#8A8A8A] cursor-not-allowed"
                />
                <p className="text-xs text-[#8A8A8A] mt-1">Email is pre-filled from the invitation</p>
              </div>

              {/* Full name */}
              <div>
                <label className="text-sm font-medium text-[#3A1F1F] block mb-1.5">
                  Your full name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Priya Sharma"
                  required
                  autoFocus
                  className="bg-[#F6F6F6] border-gray-200 rounded-xl"
                />
              </div>

              {/* Password */}
              <div>
                <label className="text-sm font-medium text-[#3A1F1F] block mb-1.5">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Minimum 8 characters"
                    required
                    className="bg-[#F6F6F6] border-gray-200 rounded-xl pr-10"
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

              {/* Confirm password */}
              <div>
                <label className="text-sm font-medium text-[#3A1F1F] block mb-1.5">
                  Confirm password <span className="text-red-500">*</span>
                </label>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={e => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Re-enter your password"
                  required
                  className="bg-[#F6F6F6] border-gray-200 rounded-xl"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-red-600 text-sm">
                  {error}
                </div>
              )}

              <div className="flex items-start gap-2 text-xs text-[#8A8A8A] bg-[#F6F6F6] rounded-xl p-3">
                <ShieldCheck className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span>
                  You'll join as a <strong className="text-[#3A1F1F]">{invite?.role || "member"}</strong> of{" "}
                  <strong className="text-[#3A1F1F]">{invite?.company_name}</strong>. Your team admin
                  can manage your account at any time.
                </span>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#FF2B2B] hover:bg-[#e02525] rounded-full h-11 font-semibold"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating account…</>
                ) : (
                  "Create Account & Join Team"
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-[#8A8A8A] mt-4">
              Already have an account?{" "}
              <Link to="/recruiter/signin" className="text-[#FF2B2B] font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function FullPageCenter({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F6F6F6] flex flex-col items-center justify-center px-4">
      <img
        src={new URL("../../logo/logo.png", import.meta.url).href}
        alt="RhirePro"
        className="w-12 h-12 mb-6"
      />
      {children}
    </div>
  );
}
