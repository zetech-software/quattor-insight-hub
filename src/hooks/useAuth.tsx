import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "manager" | "client" | "support";
export interface AppProfile {
  full_name: string | null;
  company_name: string | null;
  cnpj: string | null;
  municipio: string | null;
  uf: string | null;
  phone: string | null;
  is_active: boolean;
  must_change_password: boolean;
}
interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  profile: AppProfile | null;
  loading: boolean;
  authError: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
const ROLE_PRIORITY: AppRole[] = ["admin", "manager", "support", "client"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [access, setAccess] = useState<{ userId: string | null; role: AppRole | null; profile: AppProfile | null; loading: boolean; error: boolean }>({
    userId: null, role: null, profile: null, loading: true, error: false,
  });
  const activeUserId = useRef<string | null>(null);
  const generation = useRef(0);
  const mounted = useRef(false);
  const signingOut = useRef(false);

  const fetchUserData = useCallback(async (userId: string) => {
    const request = ++generation.current;
    setAccess({ userId, role: null, profile: null, loading: true, error: false });
    try {
      const [rolesRes, profileRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("profiles")
          .select("full_name, company_name, cnpj, municipio, uf, phone, is_active, must_change_password")
          .eq("user_id", userId).single(),
      ]);
      if (!mounted.current || request !== generation.current || activeUserId.current !== userId) return;
      const role = ROLE_PRIORITY.find(candidate => rolesRes.data?.some(row => row.role === candidate));
      if (rolesRes.error || profileRes.error || !role || !profileRes.data) throw new Error("Authorization unavailable");
      setAccess({ userId, role, profile: profileRes.data, loading: false, error: false });
    } catch {
      if (!mounted.current || request !== generation.current || activeUserId.current !== userId) return;
      setAccess({ userId, role: null, profile: null, loading: false, error: true });
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const userId = activeUserId.current;
    if (userId) await fetchUserData(userId);
  }, [fetchUserData]);

  useEffect(() => {
    mounted.current = true;
    let observedEvent = false;
    const apply = (nextSession: Session | null) => {
      if (!mounted.current || (signingOut.current && nextSession)) return;
      const userId = nextSession?.user.id ?? null;
      const changed = activeUserId.current !== userId;
      activeUserId.current = userId;
      setSession(nextSession);
      if (!userId) {
        generation.current++;
        setAccess({ userId: null, role: null, profile: null, loading: false, error: false });
      } else if (changed) {
        // Keep the Auth callback synchronous. Query outside the SDK callback.
        generation.current++;
        setAccess({ userId, role: null, profile: null, loading: true, error: false });
        const scheduledGeneration = generation.current;
        setTimeout(() => {
          if (mounted.current && activeUserId.current === userId && generation.current === scheduledGeneration) void fetchUserData(userId);
        }, 0);
      }
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      observedEvent = true;
      apply(nextSession);
    });
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!observedEvent) {
        apply(error ? null : data.session);
      }
    }).catch(() => { if (!observedEvent) apply(null); });
    return () => {
      mounted.current = false;
      activeUserId.current = null;
      // This counter invalidates async work, rather than referencing a DOM node.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generation.current++;
      subscription.unsubscribe();
    };
  }, [fetchUserData]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  }, []);
  const signOut = useCallback(async () => {
    signingOut.current = true;
    // Invalidate in-flight reads and clear account-scoped UI before network I/O.
    activeUserId.current = null;
    generation.current++;
    setSession(null);
    setAccess({ userId: null, role: null, profile: null, loading: false, error: false });
    try {
      const { error } = await supabase.auth.signOut();
      if (error) await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    } catch {
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    } finally {
      signingOut.current = false;
    }
  }, []);

  const ownsAccess = !!session && access.userId === session.user.id;
  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null,
      role: ownsAccess ? access.role : null, profile: ownsAccess ? access.profile : null,
      loading: access.loading || (!!session && !ownsAccess), authError: ownsAccess && access.error,
      signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
