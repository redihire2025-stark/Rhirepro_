import { useNavigate } from "react-router";
import { ShieldAlert, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";

interface RecruiterProfileCompletionGateProps {
  score: number;
  isTeamMember: boolean;
  featureName?: string;
}

export default function RecruiterProfileCompletionGate({
  score,
  isTeamMember,
  featureName = "post jobs, articles, or blogs",
}: RecruiterProfileCompletionGateProps) {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <div className="bg-white border border-gray-200 rounded-3xl p-8 sm:p-10 shadow-sm text-center">
        <div className="w-16 h-16 bg-[#FFF0F0] text-[#FF2B2B] rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-bold text-[#3A1F1F] mb-2">
          Profile Completion Required
        </h2>

        <p className="text-sm text-[#5A5A5A] mb-6 max-w-md mx-auto leading-relaxed">
          Your company profile completion is currently at{" "}
          <strong className="text-[#FF2B2B] font-bold">{score}%</strong>.
          To ensure platform authenticity and applicant trust, RhirePro requires at least{" "}
          <strong className="text-[#3A1F1F] font-bold">60%</strong> profile completion before you can {featureName}.
        </p>

        {/* Progress Bar Display */}
        <div className="bg-[#F6F6F6] border border-gray-200 rounded-2xl p-5 mb-8 text-left">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5A5A5A]">
              Profile Completion Status
            </span>
            <span className="text-sm font-bold text-[#FF2B2B]">
              {score}% <span className="text-xs font-normal text-[#8A8A8A]">/ 60% Required</span>
            </span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                score >= 60 ? "bg-green-500" : "bg-[#FF2B2B]"
              }`}
              style={{ width: `${Math.max(4, Math.min(100, score))}%` }}
            />
          </div>

          <div className="flex justify-between items-center mt-2 text-[11px] text-[#8A8A8A]">
            <span>0%</span>
            <span className="font-semibold text-[#FF2B2B]">60% Minimum Threshold</span>
            <span>100%</span>
          </div>
        </div>

        {isTeamMember ? (
          <div className="bg-[#FFF8F8] border border-red-100 rounded-2xl p-5 text-xs text-[#5A5A5A] text-left mb-6">
            <div className="flex items-start gap-3">
              <span className="text-base">ℹ️</span>
              <div>
                <p className="font-bold text-[#3A1F1F] mb-1">Team Member Notice</p>
                <p className="leading-relaxed">
                  You are a member of this team. Company details are managed by your{" "}
                  <strong>Team Admin</strong>. Please contact your Team Admin to complete the company profile so your organization reaches at least 60% completion.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-[#8A8A8A] mb-6">
            Tip: Complete details like company description, industry, location, and HR contact info to reach 60%+ in seconds.
          </p>
        )}

        <div className="flex flex-col sm:flex-row justify-center items-center gap-3">
          {!isTeamMember && (
            <Button
              onClick={() => navigate("/recruiter/dashboard/company-profile")}
              className="w-full sm:w-auto bg-[#FF2B2B] hover:bg-[#D92323] text-white rounded-xl px-7 py-2.5 font-semibold text-sm shadow-xs flex items-center justify-center gap-2"
            >
              Complete Company Profile
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
          {isTeamMember && (
            <Button
              onClick={() => navigate("/recruiter/dashboard/company-profile")}
              className="w-full sm:w-auto bg-[#FF2B2B] hover:bg-[#D92323] text-white rounded-xl px-7 py-2.5 font-semibold text-sm shadow-xs flex items-center justify-center gap-2"
            >
              View Company Profile
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => navigate("/recruiter/dashboard")}
            className="w-full sm:w-auto border-gray-200 text-[#5A5A5A] hover:bg-gray-50 rounded-xl px-6 py-2.5 text-sm flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
