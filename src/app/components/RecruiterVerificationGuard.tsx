import { ReactNode, useEffect } from "react";
import { Navigate, useNavigate } from "react-router";
import { useAuth } from "../../lib/auth-context";
import { RefreshCw } from "lucide-react";

interface RecruiterVerificationGuardProps {
  children: ReactNode;
}

export default function RecruiterVerificationGuard({ children }: RecruiterVerificationGuardProps) {
  const { user, role, recruiterProfile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && role === "recruiter") {
      if (recruiterProfile && recruiterProfile.verification_status !== "Verified") {
        navigate("/recruiter/pending-verification", { replace: true });
      }
    }
  }, [loading, user, role, recruiterProfile, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#3A1F1F] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-white">
          <RefreshCw className="w-8 h-8 animate-spin text-[#FF6B6B]" />
          <p className="text-sm font-medium">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/recruiter/signin" replace />;
  }

  if (role === "recruiter" && recruiterProfile && recruiterProfile.verification_status !== "Verified") {
    return <Navigate to="/recruiter/pending-verification" replace />;
  }

  return <>{children}</>;
}
