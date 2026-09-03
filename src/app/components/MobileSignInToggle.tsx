import { User, Briefcase } from "lucide-react";

interface MobileSignInToggleProps {
  onJobSeeker: () => void;
  onRecruiter: () => void;
  jobSeekerLabel?: string;
  recruiterLabel?: string;
}

export default function MobileSignInToggle({
  onJobSeeker,
  onRecruiter,
  jobSeekerLabel = "Job Seeker",
  recruiterLabel = "Recruiter",
}: MobileSignInToggleProps) {
  return (
    <div className="flex overflow-hidden rounded-full border border-[#3A1F1F]/15">
      <button
        onClick={onJobSeeker}
        className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-semibold text-white bg-[#FF2B2B] hover:bg-[#e02525] transition-colors"
      >
        <User className="h-4 w-4" /> {jobSeekerLabel}
      </button>
      <button
        onClick={onRecruiter}
        className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-semibold text-white bg-[#3A1F1F] hover:bg-[#2A1010] transition-colors"
      >
        <Briefcase className="h-4 w-4" /> {recruiterLabel}
      </button>
    </div>
  );
}
