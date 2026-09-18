import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import { isClientProfileComplete } from "@/lib/clientProfileValidation";
import { toast } from "@/hooks/use-toast";
import logo from "@/assets/qu4ttuor-logo.svg";
import type { ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
  /** Uma permissão ou lista de permissões aceitas. Admin sempre tem acesso. */
  requiredRole?: AppRole | AppRole[];
  /** Permissões explicitamente bloqueadas nesta rota (vale até para admin). */
  blockedRoles?: AppRole[];
  /** Tela de definição de senha: exige sessão, mas não aplica o bloqueio de senha temporária. */
  allowPasswordChange?: boolean;
  /** Tela de conclusão de cadastro: exige sessão, mas não aplica o bloqueio de cadastro incompleto. */
  allowProfileCompletion?: boolean;
}

export function ProtectedRoute({
  children,
  requiredRole,
  blockedRoles,
  allowPasswordChange,
  allowProfileCompletion,
}: ProtectedRouteProps) {
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

  if (profile?.must_change_password && !allowPasswordChange) {
    return <Navigate to="/definir-nova-senha" replace />;
  }

  if (allowPasswordChange) {
    // Só renderiza o formulário depois que o perfil chegou do banco.
    if (!profile) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-3">
            <img src={logo} alt="Qu4ttuor" className="h-10 animate-pulse" />
            <p className="text-sm text-muted-foreground">Carregando...</p>
          </div>
        </div>
      );
    }
    if (!profile.must_change_password) {
      return <Navigate to="/" replace />;
    }
  }

  // Cliente só usa o sistema com o cadastro empresarial completo.
  const needsProfileCompletion =
    role === "client" && !!profile && !isClientProfileComplete(profile);

  if (needsProfileCompletion && !allowProfileCompletion && !allowPasswordChange) {
    return <Navigate to="/completar-cadastro" replace />;
  }

  if (allowProfileCompletion) {
    if (!profile || !role) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-3">
            <img src={logo} alt="Qu4ttuor" className="h-10 animate-pulse" />
            <p className="text-sm text-muted-foreground">Carregando...</p>
          </div>
        </div>
      );
    }
    if (!needsProfileCompletion) {
      return <Navigate to="/" replace />;
    }
  }


  if (blockedRoles && role && blockedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole) {
    const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const isAllowed = role === "admin" || (!!role && allowed.includes(role));
    if (!isAllowed) {
      return <Navigate to="/" replace />;
    }
  }



  return <>{children}</>;
}
