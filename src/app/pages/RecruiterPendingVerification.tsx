import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { Clock, ShieldAlert, RefreshCw, LogOut, CheckCircle2, Mail, Building2, HelpCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { supabase, RecruiterProfile } from "../../lib/supabase";
import { useAuth } from "../../lib/auth-context";
import logoImage from "../../logo/logo.png";

export default function RecruiterPendingVerification() {
  const { user, signOut, refreshProfile } = useAuth();
  const [profile, setProfile] = useState<RecruiterProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const originalBg = document.body.style.backgroundColor;
    document.body.style.backgroundColor = "#3A1F1F";
    return () => {
      document.body.style.backgroundColor = originalBg;
    };
  }, []);

  const loadCurrentProfile = async () => {
    if (!user) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/recruiter/signin");
        return;
      }
    }
    
    const userId = user?.id || (await supabase.auth.getUser()).data.user?.id;
    if (!userId) {
      navigate("/recruiter/signin");
      return;
    }

    const { data } = await supabase
      .from("recruiter_profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (data) {
      setProfile(data as RecruiterProfile);
      // If already verified, navigate to recruiter dashboard immediately
      if (data.verification_status === "Verified") {
        navigate("/recruiter/dashboard", { replace: true });
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCurrentProfile();
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setStatusMessage(null);
    try {
      await refreshProfile();
      await loadCurrentProfile();

      const userId = user?.id || (await supabase.auth.getUser()).data.user?.id;
      if (userId) {
        const { data } = await supabase
          .from("recruiter_profiles")
          .select("verification_status")
          .eq("id", userId)
          .single();

        if (data?.verification_status === "Verified") {
          navigate("/recruiter/dashboard", { replace: true });
          return;
        } else if (data?.verification_status === "Rejected") {
          setStatusMessage("Status updated: Verification has been rejected.");
        } else {
          setStatusMessage("Status checked: Your account is still under review.");
        }
      }
    } catch {
      setStatusMessage("Failed to check status. Please try again.");
    } finally {
      setRefreshing(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/recruiter/signin");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#3A1F1F] to-[#6B3A3A] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-white">
          <RefreshCw className="w-8 h-8 animate-spin text-[#FF6B6B]" />
          <p className="text-sm font-medium">Checking verification status...</p>
        </div>
      </div>
    );
  }

  const isRejected = profile?.verification_status === "Rejected";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#3A1F1F] to-[#6B3A3A] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              <div className="bg-white rounded-xl p-1.5 shadow-md">
                <img src={logoImage} alt="RhirePro" className="w-8 h-8" />
              </div>
              <div className="text-3xl font-bold text-white tracking-tight">
                Rhire<span className="text-[#FF6B6B]">Pro</span>
              </div>
            </div>
            <p className="text-xs font-semibold tracking-wider uppercase text-red-200 mt-1">
              Recruiter Portal
            </p>
          </Link>
        </div>

        {/* Main Status Card */}
        <div className="bg-[#2A1515]/90 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-2xl text-white space-y-6">
          {isRejected ? (
            /* Rejected State */
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Verification Unsuccessful</h1>
                <p className="text-sm text-red-200 mt-1">
                  Your account application was not approved by Super Admin.
                </p>
              </div>

              {profile?.rejection_reason && (
                <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-4 text-left space-y-1">
                  <p className="text-xs uppercase font-semibold tracking-wider text-red-300">Reason Provided:</p>
                  <p className="text-sm text-red-100">{profile.rejection_reason}</p>
                </div>
              )}
            </div>
          ) : (
            /* Pending State */
            <div className="text-center space-y-4">
              <div className="relative mx-auto w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Clock className="w-8 h-8 animate-pulse" />
              </div>

              <div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-3">
                  Verification Pending
                </span>
                <h1 className="text-2xl font-bold text-white">
                  Your account is currently under review
                </h1>
                <p className="text-sm text-red-200 mt-2 leading-relaxed">
                  Thank you for registering with RhirePro! Our Super Admin team is verifying your company credentials.
                </p>
              </div>

              {/* Notice Pill */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <p className="text-sm font-semibold text-amber-300">
                  🗓️ You will get approved within 2 business days.
                </p>
              </div>
            </div>
          )}

          {/* Account Details Box */}
          <div className="bg-black/20 border border-white/5 rounded-xl p-4 space-y-2 text-sm text-red-100">
            <div className="flex justify-between items-center py-1 border-b border-white/5">
              <span className="text-red-300/80 text-xs uppercase tracking-wider font-medium">Recruiter Name</span>
              <span className="font-semibold text-white">{profile?.recruiter_name || user?.user_metadata?.recruiter_name || "—"}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-white/5">
              <span className="text-red-300/80 text-xs uppercase tracking-wider font-medium">Company Name</span>
              <span className="font-semibold text-white">{profile?.company_name || user?.user_metadata?.company_name || "—"}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-white/5">
              <span className="text-red-300/80 text-xs uppercase tracking-wider font-medium">Email</span>
              <span className="font-medium text-white">{profile?.email || user?.email || "—"}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-red-300/80 text-xs uppercase tracking-wider font-medium">Verification Status</span>
              <span className={`font-semibold px-2 py-0.5 rounded text-xs ${
                isRejected
                  ? "bg-red-500/20 text-red-300"
                  : "bg-amber-500/20 text-amber-300"
              }`}>
                {profile?.verification_status || "Pending"}
              </span>
            </div>
          </div>

          {statusMessage && (
            <div className="bg-white/10 border border-white/20 rounded-xl p-3 text-xs text-center text-white">
              {statusMessage}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            {!isRejected && (
              <Button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="w-full bg-[#FF6B6B] hover:bg-[#ff5252] text-white font-semibold h-11 rounded-xl shadow-lg transition flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Checking..." : "Refresh Status"}
              </Button>
            )}

            <div className="flex gap-3">
              <a
                href="mailto:support@rhirepro.com?subject=Recruiter%20Account%20Verification%20Query"
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-medium h-10 rounded-xl transition flex items-center justify-center gap-2 text-sm border border-white/10"
              >
                <HelpCircle className="w-4 h-4 text-red-300" />
                Contact Support
              </a>
              <Button
                type="button"
                variant="ghost"
                onClick={handleSignOut}
                className="flex-1 bg-transparent hover:bg-white/10 text-red-200 hover:text-white font-medium h-10 rounded-xl transition flex items-center justify-center gap-2 text-sm border border-white/10"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-xs text-red-300/60 mt-6">
          © {new Date().getFullYear()} RhirePro. All rights reserved.
        </p>
      </div>
    </div>
  );
}
