import { ReactNode } from "react";
import { useNavigate } from "react-router";
import { Lock } from "lucide-react";
import { Button } from "./ui/button";

interface PremiumGateProps {
  locked: boolean;
  title: string;
  description?: string;
  children: ReactNode;
}

/**
 * Blurs and disables `children` behind a lock overlay when `locked` is true.
 * Used to gate Career Insights (Trending Skills, Suggested Certifications)
 * and Compare Jobs behind an active Premium plan.
 */
export default function PremiumGate({ locked, title, description, children }: PremiumGateProps) {
  const navigate = useNavigate();

  if (!locked) return <>{children}</>;

  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-sm opacity-50" aria-hidden="true">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white/95 border border-gray-200 rounded-2xl shadow-lg px-6 py-5 text-center max-w-xs">
          <div className="w-10 h-10 bg-[#3A1F1F] rounded-full flex items-center justify-center mx-auto mb-3">
            <Lock className="h-4.5 w-4.5 text-white" />
          </div>
          <p className="text-sm font-semibold text-[#3A1F1F] mb-1">{title}</p>
          {description && <p className="text-xs text-[#8A8A8A] mb-3">{description}</p>}
          <Button
            onClick={() => navigate("/jobseeker/plans")}
            className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full text-xs px-5 py-2 h-auto"
          >
            Upgrade to Premium
          </Button>
        </div>
      </div>
    </div>
  );
}
