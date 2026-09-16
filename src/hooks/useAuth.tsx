import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "manager" | "client";

interface AppProfile {
  full_name: string | null;
  company_name: string | null;
  is_active: boolean;
  must_change_password: boolean;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  profile: AppProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    const [rolesRes, profileRes] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId).limit(1).single(),
      supabase.from("profiles").select("full_name, company_name, is_active, must_change_password").eq("user_id", userId).limit(1).single(),
    ]);
    if (rolesRes.data) setRole(rolesRes.data.role as AppRole);
    if (profileRes.data) setProfile(profileRes.data as AppProfile);
  };

  const refreshProfile = async () => {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (userId) await fetchUserData(userId);
  };


  useEffect(() => {
    let cancelled = false;

    const load = async (session: Session | null) => {
      if (cancelled) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserData(session.user.id);
      } else {
        setRole(null);
        setProfile(null);
      }
      if (!cancelled) setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        void load(session);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      void load(session);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);


  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        // Se o encerramento remoto falhar (rede, sessão já expirada),
        // garante o encerramento local para não manter o usuário dentro.
        await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
      }
    } catch {
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    } finally {
      setSession(null);
      setUser(null);
      setRole(null);
      setProfile(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, role, profile, loading, signIn, signOut, refreshProfile }}>

      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
