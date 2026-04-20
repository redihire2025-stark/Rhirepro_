import { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

function deriveRecruiterName(user: User): string {
  const meta = user.user_metadata ?? {};
  const explicitName = [
    meta.recruiter_name,
    meta.name,
    meta.full_name,
    [meta.first_name, meta.last_name].filter(Boolean).join(" "),
  ]
    .find((value) => typeof value === "string" && value.trim().length > 0);

  if (typeof explicitName === "string" && explicitName.trim()) {
    return explicitName.trim();
  }

  const emailPrefix = user.email?.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  return emailPrefix || "Recruiter";
}

function deriveCompanyName(user: User): string | null {
  const meta = user.user_metadata ?? {};
  if (typeof meta.company_name === "string" && meta.company_name.trim()) {
    return meta.company_name.trim();
  }
  return null;
}

async function hasJobseekerActivity(userId: string): Promise<boolean> {
  const [applications, savedJobs, workExperience, education] = await Promise.all([
    supabase.from("applications").select("id", { head: true, count: "exact" }).eq("profile_id", userId),
    supabase.from("saved_jobs").select("id", { head: true, count: "exact" }).eq("profile_id", userId),
    supabase.from("work_experience").select("id", { head: true, count: "exact" }).eq("profile_id", userId),
    supabase.from("education").select("id", { head: true, count: "exact" }).eq("profile_id", userId),
  ]);

  return [applications, savedJobs, workExperience, education].some(
    (result) => (result.count ?? 0) > 0
  );
}

export async function ensureRecruiterGoogleProfile(user: User) {
  if (user.user_metadata?.role === "jobseeker") {
    await supabase.auth.signOut();
    throw new Error("This Google account is already registered as a Job Seeker. Please use Job Seeker Sign In.");
  }

  const { data: existingJobseeker, error: jobseekerError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (jobseekerError) {
    throw new Error("Failed to verify your account type. Please try again.");
  }

  if (existingJobseeker) {
    if (user.user_metadata?.role === "recruiter") {
      const { error: deleteProfileError } = await supabase.from("profiles").delete().eq("id", user.id);
      if (deleteProfileError) {
        throw new Error("Failed to clean up old account data. Please try again.");
      }
    } else {
      const activityExists = await hasJobseekerActivity(user.id);
      if (activityExists) {
        await supabase.auth.signOut();
        throw new Error("This Google account is already registered as a Job Seeker. Please use Job Seeker Sign In.");
      }

      const { error: deleteProfileError } = await supabase.from("profiles").delete().eq("id", user.id);
      if (deleteProfileError) {
        throw new Error("Failed to convert your Google account to recruiter access. Please try again.");
      }
    }
  }

  const recruiterName = deriveRecruiterName(user);
  const companyName = deriveCompanyName(user);

  const { data: recruiterProfile, error: recruiterError } = await supabase
    .from("recruiter_profiles")
    .select("id, recruiter_name, company_name")
    .eq("id", user.id)
    .maybeSingle();

  if (recruiterError) {
    throw new Error("Failed to verify recruiter profile. Please try again.");
  }

  if (!recruiterProfile) {
    const { error: insertError } = await supabase.from("recruiter_profiles").insert({
      id: user.id,
      email: user.email,
      recruiter_name: recruiterName,
      company_name: companyName,
    });

    if (insertError && insertError.code !== "23505") {
      throw new Error("Failed to set up recruiter profile. Please try again.");
    }
  }

  if (user.user_metadata?.role !== "recruiter") {
    await supabase.auth.updateUser({
      data: {
        ...user.user_metadata,
        role: "recruiter",
        recruiter_name: recruiterProfile?.recruiter_name || recruiterName,
        company_name: recruiterProfile?.company_name || companyName || "",
      },
    });
  }

  return {
    recruiterName: recruiterProfile?.recruiter_name || recruiterName,
    companyName: recruiterProfile?.company_name || companyName || "",
  };
}
