import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import logo from "@/assets/qu4ttuor-logo.svg";
import type { ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: "admin" | "client";
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { session, role, profile, loading, signOut } = useAuth();
  const isBlocked = !!session && profile !== null && profile.is_active === false;

  useEffect(() => {
    if (isBlocked) {
      toast({
        title: "Acesso desativado",
        description: "Sua conta está desativada. Fale com o administrador.",
        variant: "destructive",
      });
      signOut();
    }
  }, [isBlocked, signOut]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <img src={logo} alt="Qu4ttuor" className="h-10 animate-pulse" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!session || isBlocked) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && role !== requiredRole && role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
