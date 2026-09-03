import { RecruiterProfile, supabase } from "./supabase";
import { useEffect, useState } from "react";

export interface RecruiterEffectiveProfile {
  recruiter_name?: string | null;
  company_name?: string | null;
  phone?: string | null;
  industry?: string | null;
  company_size?: string | null;
  company_type?: string | null;
  company_description?: string | null;
  location?: string | null;
  website?: string | null;
}

export interface ProfileCompletionItem {
  key: string;
  label: string;
  weight: number;
  done: boolean;
}

export interface RecruiterCompletionResult {
  score: number;
  isEligible: boolean; // score >= 60
  items: ProfileCompletionItem[];
  missingItems: ProfileCompletionItem[];
  loading: boolean;
}

export const RECRUITER_MIN_COMPLETION_THRESHOLD = 60;

export function calculateRecruiterCompletion(
  recruiterProfile: RecruiterProfile | null,
  orgCompanyProfile?: Record<string, unknown> | null,
  isTeamMember?: boolean
): Omit<RecruiterCompletionResult, "loading"> {
  if (!recruiterProfile) {
    return {
      score: 0,
      isEligible: false,
      items: [],
      missingItems: [],
    };
  }

  const effective: RecruiterEffectiveProfile = (isTeamMember && orgCompanyProfile)
    ? {
        ...recruiterProfile,
        company_name: (orgCompanyProfile.company_name as string) || recruiterProfile.company_name,
        industry: (orgCompanyProfile.industry as string) || recruiterProfile.industry,
        company_size: (orgCompanyProfile.company_size as string) || recruiterProfile.company_size,
        company_type: (orgCompanyProfile.company_type as string) || recruiterProfile.company_type,
        company_description: (orgCompanyProfile.company_description as string) || recruiterProfile.company_description,
        location: (orgCompanyProfile.location as string) || recruiterProfile.location,
        website: (orgCompanyProfile.website as string) || recruiterProfile.website,
      }
    : recruiterProfile;

  const cleanDesc = (effective.company_description || "")
    .replace(/<h2[^>]*>.*?<\/h2>/gi, "")
    .replace(/<[^>]*>/g, "")
    .trim();

  const items: ProfileCompletionItem[] = [
    { key: "company_description", label: "Company Bio / Description", weight: 20, done: cleanDesc.length > 20 },
    { key: "industry", label: "Industry", weight: 15, done: Boolean(effective.industry) },
    { key: "company_name", label: "Company Name", weight: 15, done: Boolean(effective.company_name) },
    { key: "recruiter_name", label: "HR / Recruiter Contact Name", weight: 10, done: Boolean(effective.recruiter_name) },
    { key: "location", label: "Office Location / HQ", weight: 10, done: Boolean(effective.location) },
    { key: "website", label: "Website", weight: 10, done: Boolean(effective.website) },
    { key: "company_size", label: "Company Size", weight: 10, done: Boolean(effective.company_size) },
    { key: "phone", label: "Phone Number", weight: 5, done: Boolean(effective.phone) },
    { key: "company_type", label: "Company Type", weight: 5, done: Boolean(effective.company_type) },
  ];

  let score = 0;
  for (const item of items) {
    if (item.done) {
      score += item.weight;
    }
  }

  const finalScore = Math.min(100, score);

  return {
    score: finalScore,
    isEligible: finalScore >= RECRUITER_MIN_COMPLETION_THRESHOLD,
    items,
    missingItems: items.filter(i => !i.done),
  };
}

/**
 * React hook to retrieve recruiter profile completion rate,
 * handling automatic admin profile inheritance for team members.
 */
export function useRecruiterProfileCompletion(
  recruiterProfile: RecruiterProfile | null,
  isOrgAdmin: boolean
): RecruiterCompletionResult {
  const isTeamMember = Boolean(recruiterProfile?.org_admin_id) && !isOrgAdmin;
  const [orgCompanyProfile, setOrgCompanyProfile] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(isTeamMember);

  useEffect(() => {
    if (!isTeamMember || !recruiterProfile?.org_admin_id) {
      setOrgCompanyProfile(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    supabase
      .from("recruiter_profiles")
      .select("company_name, industry, company_size, company_type, founded, company_description, website, location, linkedin_url, cin, tagline, logo_url, cover_image_url")
      .eq("id", recruiterProfile.org_admin_id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) {
          if (data) setOrgCompanyProfile(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isTeamMember, recruiterProfile?.org_admin_id]);

  const calc = calculateRecruiterCompletion(recruiterProfile, orgCompanyProfile, isTeamMember);

  return {
    ...calc,
    loading,
  };
}
