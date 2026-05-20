import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "⚠️  Missing Supabase environment variables.\n" +
    "Copy .env.example → .env and add your Supabase URL and anon key.\n" +
    "See SETUP.md for full instructions."
  );
}

export const supabase = createClient(
  SUPABASE_URL || "https://placeholder.supabase.co",
  SUPABASE_ANON_KEY || "placeholder"
);

// ─── Database Types ────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  headline: string | null;
  location: string | null;
  experience_type: "fresher" | "experienced" | null;
  total_experience: string | null;
  current_company: string | null;
  current_title: string | null;
  current_salary: string | null;
  expected_salary: string | null;
  notice_period: string | null;
  skills: string[] | null;
  resume_url: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  about: string | null;
  otp_code: string | null;
  otp_expires_at: string | null;
  created_at: string;
}

export interface RecruiterProfile {
  id: string;
  email: string;
  recruiter_name: string | null;
  company_name: string | null;
  company_size: string | null;
  industry: string | null;
  company_type: string | null;
  phone: string | null;
  company_description: string | null;
  website: string | null;
  location: string | null;
  logo_url: string | null;
  tagline: string | null;
  linkedin_url: string | null;
  cin: string | null;
  otp_code: string | null;
  otp_expires_at: string | null;
  created_at: string;
}

export interface Job {
  id: string;
  recruiter_id: string;
  title: string;
  description: string | null;
  roles_responsibilities: string | null;
  requirements: string | null;
  company_name: string;
  location: string | null;
  work_mode: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_type: string | null;
  experience_min: number | null;
  experience_max: number | null;
  employment_type: string | null;
  industry: string | null;
  department: string | null;
  interview_mode: string | null;
  skills: string[] | null;
  perks: string[] | null;
  education: string | null;
  openings: number;
  views?: number | null;
  status: "Active" | "Paused" | "Closed" | "Expired";
  deadline: string | null;
  deadline_time: string | null;
  created_at: string;
}

export interface Application {
  id: string;
  job_id: string;
  profile_id: string;
  recruiter_id: string;
  status:
    | "Applied"
    | "Screening"
    | "Shortlisted"
    | "Interview Scheduled"
    | "Offered"
    | "Rejected"
    | "Hired"
    | "New"
    | "Reviewed";
  cover_letter: string | null;
  resume_url: string | null;
  applied_at: string;
  job?: Job;
  profile?: Profile;
  interview_details?: InterviewDetails | null;
}

export interface InterviewDetails {
  id: string;
  application_id: string;
  recruiter_id: string;
  candidate_id: string;
  interview_message: string;
  status: "Interview Scheduled";
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  user_type: "jobseeker" | "recruiter";
  title: string;
  message: string;
  type: "application" | "message" | "status_change" | "job_alert";
  is_read: boolean;
  related_id: string | null;
  created_at: string;
}

export interface Feedback {
  id: string;
  user_id: string;
  user_type: "jobseeker" | "recruiter";
  user_email: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface SavedJob {
  id: string;
  profile_id: string;
  job_id: string;
  saved_at: string;
  job?: Job;
}

export interface WorkExperience {
  id: string;
  profile_id: string;
  company: string;
  title: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
}

export interface Education {
  id: string;
  profile_id: string;
  institution: string;
  degree: string;
  field: string | null;
  start_year: string | null;
  end_year: string | null;
  score: string | null;
}

export interface PaymentTransaction {
  id: string;
  recruiter_id: string;
  plan_id: string;
  amount: number;
  promo_code: string | null;
  discount_amount: number;
  final_amount: number;
  status: "pending" | "success" | "failed" | "expired";
  payment_method: string | null;
  transaction_ref: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface RecruiterSubscription {
  id: string;
  recruiter_id: string;
  plan_id: string;
  status: "active" | "expired" | "cancelled";
  started_at: string;
  expires_at: string;
  daily_job_posts: number | null;
  payment_id: string | null;
  created_at: string;
}

export interface PromoCode {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  valid_until: string | null;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
  created_at: string;
}
