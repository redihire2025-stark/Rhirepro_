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

  const fetchProfile = async (userId: string, userRole: string, retries = 3) => {
    if (userRole === "recruiter") {
      const { data } = await supabase.from("recruiter_profiles").select("*").eq("id", userId).single();
      if (!data && retries > 0) {
        await new Promise(r => setTimeout(r, 800));
        return fetchProfile(userId, userRole, retries - 1);
      }
      setRecruiterProfile(data);
      setProfile(null);
    } else {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
      if (!data && retries > 0) {
        await new Promise(r => setTimeout(r, 800));
        return fetchProfile(userId, userRole, retries - 1);
      }
      setProfile(data);
      setRecruiterProfile(null);
    }
  };

  const detectRoleForUser = async (user: User): Promise<"jobseeker" | "recruiter"> => {
    const userMetadataRole = (user.user_metadata?.role as "jobseeker" | "recruiter" | undefined);
    if (userMetadataRole) return userMetadataRole;

    const { data: recruiter } = await supabase.from("recruiter_profiles").select("id").eq("id", user.id).single();
    if (recruiter) return "recruiter";

    const { data: jobseeker } = await supabase.from("profiles").select("id").eq("id", user.id).single();
    if (jobseeker) return "jobseeker";

    return "jobseeker";
  };


  useEffect(() => {
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const userRole = await detectRoleForUser(session.user);
          if (session.user.user_metadata?.role !== userRole) {
            supabase.auth.updateUser({ data: { role: userRole } }).catch(() => {});
          }
          setRole(userRole);
          await Promise.race([
            fetchProfile(session.user.id, userRole),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Profile fetch timeout")), 5000))
          ]).catch(() => {
            // Profile fetch failed or timed out, but continue anyway
            if (userRole === "recruiter") setRecruiterProfile(null);
            else setProfile(null);
          });
        }
      } catch (error) {
        console.error("Session init error:", error);
      } finally {
        setLoading(false);
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const userRole = await detectRoleForUser(session.user);
        setRole(userRole);
        if (session.user.user_metadata?.role !== userRole) {
          supabase.auth.updateUser({ data: { role: userRole } }).catch(() => {});
        }
        await Promise.race([
          fetchProfile(session.user.id, userRole),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Profile fetch timeout")), 5000))
        ]).catch(() => {
          if (userRole === "recruiter") setRecruiterProfile(null);
          else setProfile(null);
        });
      } else {
        setRole(null);
        setProfile(null);
        setRecruiterProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
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
