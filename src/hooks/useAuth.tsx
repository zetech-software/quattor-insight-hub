import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { selectAppRole } from "@/lib/authRoles";
export type AppRole = "admin" | "manager" | "client" | "support";
interface AppProfile {
 full_name:string|null; company_name:string|null; cnpj:string|null; municipio:string|null;
 uf:string|null; phone:string|null; is_active:boolean; must_change_password:boolean;
}
interface AuthContextType {
 session:Session|null; user:User|null; role:AppRole|null; profile:AppProfile|null;
 loading:boolean; authError:string|null; operationalAccess:boolean;
 signIn:(email:string,password:string)=>Promise<{error:Error|null}>;
 signOut:()=>Promise<void>; refreshProfile:()=>Promise<void>;
}
const AuthContext=createContext<AuthContextType|undefined>(undefined);
export function AuthProvider({children}:{children:ReactNode}) {
 const [session,setSession]=useState<Session|null>(null);
 const [user,setUser]=useState<User|null>(null);
 const [role,setRole]=useState<AppRole|null>(null);
 const [profile,setProfile]=useState<AppProfile|null>(null);
 const [loading,setLoading]=useState(true);
 const [authError,setAuthError]=useState<string|null>(null);
 const [operationalAccess,setOperationalAccess]=useState(false);
 const activeUser=useRef<string|null>(null);
 const generation=useRef(0);
 const mounted=useRef(true);
 const fetchUserData=useCallback(async (userId:string)=>{
   const request=++generation.current;
   try {
     const [roles,profileRes,access]=await Promise.all([
       supabase.from("user_roles").select("role").eq("user_id",userId),
       supabase.from("profiles").select("full_name, company_name, cnpj, municipio, uf, phone, is_active, must_change_password").eq("user_id",userId).single(),
       supabase.rpc("get_my_operational_access"),
     ]);
     if(roles.error||profileRes.error||access.error||!profileRes.data) throw new Error("access lookup failed");
     const nextRole=selectAppRole(roles.data??[]);
     if(!nextRole) throw new Error("missing role");
     if(!mounted.current||activeUser.current!==userId||generation.current!==request) return;
     setRole(nextRole); setProfile(profileRes.data); setOperationalAccess(access.data===true); setAuthError(null);
   } catch {
     if(!mounted.current||activeUser.current!==userId||generation.current!==request) return;
     setRole(null); setProfile(null); setOperationalAccess(false);
     setAuthError("Não foi possível verificar seu acesso. Tente novamente.");
   } finally {
     if(mounted.current&&activeUser.current===userId&&generation.current===request) setLoading(false);
   }
 },[]);
 const refreshProfile=useCallback(async()=>{
   if(activeUser.current) await fetchUserData(activeUser.current);
 },[fetchUserData]);
 useEffect(()=>{
   mounted.current=true;
   const apply=(next:Session|null)=>{
     if(!mounted.current) return;
     const id=next?.user.id??null;
     generation.current++;
     if(activeUser.current!==id) {
       setRole(null); setProfile(null); setOperationalAccess(false); setAuthError(null);
       setLoading(!!id);
     }
     activeUser.current=id; setSession(next); setUser(next?.user??null);
     if(!id) { setLoading(false); return; }
     setTimeout(()=>{if(mounted.current&&activeUser.current===id) void fetchUserData(id);},0);
   };
   const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>apply(next));
   const initial=generation.current;
   void supabase.auth.getSession().then(({data,error})=>{
     if(generation.current!==initial) return;
     if(error) {setAuthError("Não foi possível verificar a sessão.");setLoading(false);}
     else apply(data.session);
   });
   const focus=()=>{void refreshProfile();};
   window.addEventListener("focus",focus);
   return ()=>{mounted.current=false;generation.current++;subscription.unsubscribe();window.removeEventListener("focus",focus);};
 },[fetchUserData,refreshProfile]);
 const signIn=useCallback(async(email:string,password:string)=>{
   const {error}=await supabase.auth.signInWithPassword({email,password});
   return {error:error as Error|null};
 },[]);
 const signOut=useCallback(async()=>{
   generation.current++;activeUser.current=null;
   setSession(null);setUser(null);setRole(null);setProfile(null);setOperationalAccess(false);setLoading(false);setAuthError(null);
   try {const {error}=await supabase.auth.signOut();if(error) await supabase.auth.signOut({scope:"local"});}
   catch {await supabase.auth.signOut({scope:"local"}).catch(()=>undefined);}
 },[]);
 return <AuthContext.Provider value={{session,user,role,profile,loading,authError,operationalAccess,signIn,signOut,refreshProfile}}>{children}</AuthContext.Provider>;
}
export function useAuth(){const ctx=useContext(AuthContext);if(!ctx) throw new Error("useAuth must be used within AuthProvider");return ctx;}
