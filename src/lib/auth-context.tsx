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
  "id, email, first_name, last_name, phone, avatar_url, headline, location, experience_type, total_experience, current_company, current_title, current_salary, expected_salary, notice_period, skills, resume_url, linkedin_url, portfolio_url, about, otp_code, otp_expires_at, created_at, dob, gender, marital_status, desired_job_title, job_type_pref, preferred_location, work_auth, willing_to_relocate, languages, preferred_interview_mode, profile_views, recruiter_searches, is_disabled";

/**
 * Google OAuth never populates `user_metadata.role` — the provider has no idea
 * which tab the user picked. Sign-in pages stash the intended role here before
 * redirecting out, so the session can be classified correctly on the way back.
 */
export const PENDING_ROLE_KEY = "rhirepro_pending_role";

export function readPendingRole(): "jobseeker" | "recruiter" | null {
  try {
    const v = localStorage.getItem(PENDING_ROLE_KEY);
    return v === "recruiter" || v === "jobseeker" ? v : null;
  } catch {
    return null;
  }
}

export function setPendingRole(role: "jobseeker" | "recruiter") {
  try {
    localStorage.setItem(PENDING_ROLE_KEY, role);
  } catch {
    // Private mode / storage disabled — role falls back to "jobseeker".
  }
}

/**
 * Classify a session. Password sign-up writes `role` into user_metadata, but an
 * OAuth session arrives with it unset — defaulting those to "jobseeker" is what
 * sends Google-authenticated recruiters to the wrong dashboard. Fall back to the
 * role captured before the redirect, then write it back so the next sign-in on
 * any device no longer depends on this browser's localStorage.
 */
function resolveRole(user: User): "jobseeker" | "recruiter" | "super_admin" {
  const metaRole = user.user_metadata?.role;
  if (metaRole === "recruiter" || metaRole === "jobseeker" || metaRole === "super_admin") {
    return metaRole;
  }
  const pending = readPendingRole();
  if (pending) {
    // Deferred: calling auth methods synchronously inside onAuthStateChange can
    // deadlock the client. The resulting USER_UPDATED event re-enters this
    // function, but metaRole is set by then so it returns above — no loop.
    setTimeout(() => {
      supabase.auth.updateUser({ data: { role: pending } }).catch(() => {});
      try {
        localStorage.removeItem(PENDING_ROLE_KEY);
      } catch {
        // Nothing to clean up if storage is unavailable.
      }
    }, 0);
    return pending;
  }
  return "jobseeker";
}

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
        // `authenticated` no longer holds SELECT on the sensitive columns of
        // recruiter_profiles (email, billing counters, seat limits) — that
        // stopped any signed-in user reading every recruiter's address. A
        // recruiter still needs their own full row, so read it through the
        // SECURITY DEFINER function, which is scoped to auth.uid().
        const { data, error } = await supabase.rpc("my_recruiter_profile").maybeSingle();
        if (error) console.error("Error fetching recruiter profile:", error);
        if (!data && retries > 0) {
          await new Promise(r => setTimeout(r, 800));
          return fetchProfile(userId, userRole, retries - 1);
        }
        setRecruiterProfile(data as RecruiterProfile | null);
        setProfile(null);
      } else {
        let { data, error } = await supabase.from("profiles").select(SAFE_PROFILE_COLUMNS).eq("id", userId).single();
        if (error) {
          console.error("Error fetching jobseeker profile with SAFE_PROFILE_COLUMNS, trying fallback select('*'):", error);
          const fallbackRes = await supabase.from("profiles").select("*").eq("id", userId).single();
          data = fallbackRes.data;
          if (fallbackRes.error) console.error("Fallback fetch jobseeker profile error:", fallbackRes.error);
        }
        if (!data && retries > 0) {
          await new Promise(r => setTimeout(r, 800));
          return fetchProfile(userId, userRole, retries - 1);
        }
        const userProfile = data as Profile | null;
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
        const userRole = resolveRole(session.user);
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
        const userRole = resolveRole(session.user);
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
