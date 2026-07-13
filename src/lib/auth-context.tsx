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
  const orgRole = recruiterProfile?.org_role ?? null;
  const isOrgAdmin = !!recruiterProfile?.is_org_admin;

  return (
    <AuthContext.Provider value={{ user, session, profile, recruiterProfile, role, orgRole, isOrgAdmin, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
