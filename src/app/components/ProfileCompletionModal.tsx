import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { CheckCircle2, AlertCircle, FileText, UserCheck, Briefcase, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router";
import { Profile } from "../../lib/supabase";
import { decryptPhone } from "../../lib/phoneProtection";

export interface ApplicationRequirementsStatus {
  hasBasicInfo: boolean;
  hasResume: boolean;
  hasJobPreferences: boolean;
  isComplete: boolean;
  missingCount: number;
}

export function checkApplicationRequirements(profile: Profile | null | undefined): ApplicationRequirementsStatus {
  const hasName = Boolean((profile?.first_name || profile?.last_name || "").trim().length > 0);
  const hasHeadline = Boolean((profile?.headline || "").trim().length > 0);
  const decrypted = decryptPhone(profile?.phone);
  const rawPhone = (decrypted || profile?.phone || "").trim().replace(/\D/g, "");
  const hasPhone = rawPhone.length === 10;
  const hasLocation = Boolean((profile?.location || "").trim().length > 0);
  const hasDob = Boolean((profile?.dob || "").trim().length > 0);
  const hasGender = Boolean((profile?.gender || "").trim().length > 0);
  const hasMaritalStatus = Boolean((profile?.marital_status || "").trim().length > 0);

  const hasBasicInfo = hasName && hasHeadline && hasPhone && hasLocation && hasDob && hasGender && hasMaritalStatus;
  const hasResume = Boolean(profile?.resume_url && profile.resume_url.trim().length > 0);
  const hasJobPreferences = Boolean(profile?.desired_job_title && profile.desired_job_title.trim().length > 0);

  let missingCount = 0;
  if (!hasBasicInfo) missingCount++;
  if (!hasResume) missingCount++;
  if (!hasJobPreferences) missingCount++;

  return {
    hasBasicInfo,
    hasResume,
    hasJobPreferences,
    isComplete: missingCount === 0,
    missingCount,
  };
}

interface ProfileCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null | undefined;
  jobTitle?: string;
  onNavigateToProfile?: () => void;
}

export default function ProfileCompletionModal({
  isOpen,
  onClose,
  profile,
  jobTitle,
  onNavigateToProfile,
}: ProfileCompletionModalProps) {
  const navigate = useNavigate();
  const status = checkApplicationRequirements(profile);

  const handleGoToProfile = () => {
    onClose();
    if (onNavigateToProfile) {
      onNavigateToProfile();
    } else {
      navigate("/jobseeker/dashboard/profile");
    }
  };

  const requirements = [
    {
      id: "basic_info",
      title: "Basic Information",
      description: "Full name, headline, 10-digit phone number, location, date of birth, gender, and marital status.",
      isComplete: status.hasBasicInfo,
      icon: UserCheck,
    },
    {
      id: "resume",
      title: "Resume Upload",
      description: "Your latest CV or resume in PDF or DOCX format for recruiter review.",
      isComplete: status.hasResume,
      icon: FileText,
    },
    {
      id: "preferences",
      title: "Preferred Job Settings",
      description: "Your target job title, expected salary, and notice period preferences.",
      isComplete: status.hasJobPreferences,
      icon: Briefcase,
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md w-[92vw] sm:w-full p-0 overflow-hidden rounded-2xl border-none shadow-2xl bg-white">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-[#3A1F1F] to-[#201010] p-6 text-white text-center relative">
          <div className="mx-auto w-12 h-12 rounded-full bg-[#FF2B2B]/20 border border-[#FF2B2B]/40 flex items-center justify-center mb-3">
            <AlertCircle className="h-6 w-6 text-[#FF2B2B]" />
          </div>
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-bold text-white text-center">
              Complete Your Profile to Apply
            </DialogTitle>
            <DialogDescription className="text-gray-300 text-xs sm:text-sm text-center">
              {jobTitle ? (
                <>To apply for <span className="font-semibold text-white">"{jobTitle}"</span>, recruiters require the following essential details:</>
              ) : (
                <>Recruiters require complete candidate details before accepting job applications.</>
              )}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Requirements Checklist */}
        <div className="p-6 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Required Profile Fields ({3 - status.missingCount}/3 Complete)
          </p>

          <div className="space-y-2.5">
            {requirements.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className={`flex items-start gap-3.5 p-3.5 rounded-xl border transition-all ${
                    item.isComplete
                      ? "bg-green-50/70 border-green-200"
                      : "bg-red-50/70 border-red-200"
                  }`}
                >
                  <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
                    item.isComplete ? "bg-green-100 text-green-700" : "bg-red-100 text-[#FF2B2B]"
                  }`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className={`text-sm font-semibold ${item.isComplete ? "text-green-900" : "text-[#3A1F1F]"}`}>
                        {item.title}
                      </h4>
                      {item.isComplete ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3 w-3" /> Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#FF2B2B] bg-red-100 px-2 py-0.5 rounded-full">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto rounded-full border-gray-300 text-gray-700 hover:bg-gray-100"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="w-full sm:w-auto bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full font-medium shadow-md shadow-red-200 flex items-center justify-center gap-1.5"
            onClick={handleGoToProfile}
          >
            <span>Complete Profile Now</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
