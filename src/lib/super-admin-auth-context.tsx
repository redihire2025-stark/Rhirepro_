import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase, SuperAdmin } from "./supabase";

interface SuperAdminAuthContextType {
  user: User | null;
  session: Session | null;
  superAdmin: SuperAdmin | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const SuperAdminAuthContext = createContext<SuperAdminAuthContextType>({
  user: null,
  session: null,
  superAdmin: null,
  loading: true,
  signOut: async () => {},
});

export function SuperAdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [superAdmin, setSuperAdmin] = useState<SuperAdmin | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSuperAdmin = async (userId: string) => {
    const { data } = await supabase
      .from("super_admins")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    setSuperAdmin(data as SuperAdmin | null);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchSuperAdmin(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchSuperAdmin(session.user.id);
      } else {
        setSuperAdmin(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setSuperAdmin(null);
  };

  return (
    <SuperAdminAuthContext.Provider value={{ user, session, superAdmin, loading, signOut }}>
      {children}
    </SuperAdminAuthContext.Provider>
  );
}

export const useSuperAdminAuth = () => useContext(SuperAdminAuthContext);
