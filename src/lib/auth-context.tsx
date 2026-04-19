import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase, Profile, RecruiterProfile } from "./supabase";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  recruiterProfile: RecruiterProfile | null;
  role: "jobseeker" | "recruiter" | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null, session: null, profile: null, recruiterProfile: null,
  role: null, loading: true, signOut: async () => {}, refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recruiterProfile, setRecruiterProfile] = useState<RecruiterProfile | null>(null);
  const [role, setRole] = useState<"jobseeker" | "recruiter" | null>(null);
  const [loading, setLoading] = useState(true);

  const withTimeout = async <T,>(promise: Promise<T>, label: string, timeoutMs = 5000): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        window.setTimeout(() => reject(new Error(`${label} timeout`)), timeoutMs)
      ),
    ]);
  };

  const fetchProfile = async (userId: string, userRole: string, retries = 3) => {
    if (userRole === "recruiter") {
      const { data, error } = await supabase
        .from("recruiter_profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      if (!data && retries > 0) {
        await new Promise(r => setTimeout(r, 800));
        return fetchProfile(userId, userRole, retries - 1);
      }
      setRecruiterProfile(data);
      setProfile(null);
    } else {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      if (!data && retries > 0) {
        await new Promise(r => setTimeout(r, 800));
        return fetchProfile(userId, userRole, retries - 1);
      }
      setProfile(data);
      setRecruiterProfile(null);
    }
  };

  const detectRoleForUser = async (user: User): Promise<"jobseeker" | "recruiter"> => {
    const { data: recruiter, error: recruiterError } = await supabase
      .from("recruiter_profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    if (recruiterError) throw recruiterError;
    if (recruiter) return "recruiter";

    const { data: jobseeker, error: jobseekerError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    if (jobseekerError) throw jobseekerError;
    if (jobseeker) return "jobseeker";

    const userMetadataRole = (user.user_metadata?.role as "jobseeker" | "recruiter" | undefined);
    if (userMetadataRole) return userMetadataRole;

    return "jobseeker";
  };

  const hydrateUserState = async (sessionUser: User | null) => {
    setUser(sessionUser);

    if (!sessionUser) {
      setRole(null);
      setProfile(null);
      setRecruiterProfile(null);
      return;
    }

    const userRole = await withTimeout(detectRoleForUser(sessionUser), "Role detection");
    setRole(userRole);

    if (sessionUser.user_metadata?.role !== userRole) {
      supabase.auth.updateUser({ data: { role: userRole } }).catch(() => {});
    }

    await withTimeout(fetchProfile(sessionUser.id, userRole), "Profile fetch").catch(() => {
      if (userRole === "recruiter") setRecruiterProfile(null);
      else setProfile(null);
    });
  };


  useEffect(() => {
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        await hydrateUserState(session?.user ?? null);
      } catch (error) {
        console.error("Session init error:", error);
      } finally {
        setLoading(false);
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "INITIAL_SESSION") {
        return;
      }

      setSession(session);
      await hydrateUserState(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      const google = (window as Window & {
        google?: {
          accounts?: {
            id?: {
              disableAutoSelect?: () => void;
              revoke?: (email: string, done?: () => void) => void;
            };
          };
        };
      }).google;

      const userEmail = user?.email;

      google?.accounts?.id?.disableAutoSelect?.();

      if (userEmail && google?.accounts?.id?.revoke) {
        await new Promise<void>((resolve) => {
          google.accounts.id.revoke?.(userEmail, () => resolve());
          window.setTimeout(resolve, 1500);
        });
      }

      await supabase.auth.signOut();
    } catch (error) {
      console.error("Failed to sign out:", error);
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
      setRecruiterProfile(null);
      setRole(null);
    }
  };

  const refreshProfile = async () => {
    if (user && role) {
      await fetchProfile(user.id, role);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, recruiterProfile, role, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
