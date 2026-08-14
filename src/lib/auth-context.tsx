import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase, Profile, RecruiterProfile } from "./supabase";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  recruiterProfile: RecruiterProfile | null;
  role: "jobseeker" | "recruiter" | null;
  orgRole: "admin" | "member" | null;
  isOrgAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null, session: null, profile: null, recruiterProfile: null,
  role: null, orgRole: null, isOrgAdmin: false,
  loading: true, signOut: async () => {}, refreshProfile: async () => {},
});

export const SAFE_RECRUITER_COLUMNS =
  "id, email, recruiter_name, company_name, company_size, company_type, industry, company_description, website, location, logo_url, tagline, linkedin_url, cin, created_at, cover_image_url, cover_image_name, founded, org_role, org_admin_id, is_active, max_seats, is_org_admin, org_id, is_disabled, last_login_at, resumes_used, keywords_used, profiles_viewed, referral_email, referral_id, verification_status, rejection_reason, rejected_at, rejected_by, verified_at, verified_by, phone";

export const SAFE_PROFILE_COLUMNS =
  "id, email, first_name, last_name, phone, avatar_url, experience_type, total_experience, current_salary, expected_salary, location, skills, headline, resume_url, created_at, updated_at, last_active_at, about, languages, notice_period, current_company, current_title, linkedin_url, portfolio_url, preferred_interview_mode, desired_job_title, job_type_pref, preferred_location, work_auth, willing_to_relocate, otp_code, otp_expires_at, profile_views, recruiter_searches";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recruiterProfile, setRecruiterProfile] = useState<RecruiterProfile | null>(null);
  const [role, setRole] = useState<"jobseeker" | "recruiter" | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string, userRole: string, retries = 3) => {
    if (userRole === "super_admin") {
      setProfile(null);
      setRecruiterProfile(null);
      return;
    }
    try {
      if (userRole === "recruiter") {
        const { data, error } = await supabase.from("recruiter_profiles").select(SAFE_RECRUITER_COLUMNS).eq("id", userId).single();
        if (error) console.error("Error fetching recruiter profile:", error);
        if (!data && retries > 0) {
          await new Promise(r => setTimeout(r, 800));
          return fetchProfile(userId, userRole, retries - 1);
        }
        setRecruiterProfile(data as RecruiterProfile | null);
        setProfile(null);
      } else {
        const { data, error } = await supabase.from("profiles").select(SAFE_PROFILE_COLUMNS).eq("id", userId).single();
        if (error) console.error("Error fetching jobseeker profile:", error);
        if (!data && retries > 0) {
          await new Promise(r => setTimeout(r, 800));
          return fetchProfile(userId, userRole, retries - 1);
        }
        const userProfile = data as Profile | null;
        if (userProfile) {
          const lastActiveMs = userProfile.last_active_at ? new Date(userProfile.last_active_at).getTime() : 0;
          if (Date.now() - lastActiveMs > 5 * 60 * 1000) {
            const nowIso = new Date().toISOString();
            userProfile.last_active_at = nowIso;
            void supabase.from("profiles").update({ last_active_at: nowIso }).eq("id", userId);
          }
        }
        setProfile(userProfile);
        setRecruiterProfile(null);
      }
    } catch (err) {
      console.error("fetchProfile error:", err);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const userRole = session.user.user_metadata?.role || "jobseeker";
        setRole(userRole);
        fetchProfile(session.user.id, userRole).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    }).catch((err) => {
      console.error("Error fetching auth session:", err);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const userRole = session.user.user_metadata?.role || "jobseeker";
        setRole(userRole);
        fetchProfile(session.user.id, userRole);
      } else {
        setRole(null);
        setProfile(null);
        setRecruiterProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRecruiterProfile(null);
    setRole(null);
  };

  const refreshProfile = async () => {
    if (user && role) {
      await fetchProfile(user.id, role);
    }
  };

  // is_org_admin is set to true when a recruiter purchases a plan or is a pre-seeded org admin.
  // org_role defaults to 'admin' for EVERY recruiter_profiles row (including solo recruiters
  // who never opted into an org), so org_role alone cannot distinguish a real org admin.
  // max_seats is the actual signal: seeded org admins have max_seats = 10, solo recruiters
  // default to 5. A genuine org admin needs both org_role = 'admin' and max_seats > 5.
  const orgRole = recruiterProfile?.org_role ?? null;
  const isOrgAdmin = !!recruiterProfile?.is_org_admin || (orgRole === "admin" && (recruiterProfile?.max_seats ?? 0) > 5);

  return (
    <AuthContext.Provider value={{ user, session, profile, recruiterProfile, role, orgRole, isOrgAdmin, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
