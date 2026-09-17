import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import logo from "@/assets/qu4ttuor-logo.svg";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const Login = () => {
  const { session, role, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);

  if (loading) return null;
  if (session) {
    return <Navigate to={role === "admin" ? "/admin" : "/"} replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      toast({ title: "Erro ao entrar", description: "Email ou senha inválidos.", variant: "destructive" });
    } else {
      toast({ title: "Login realizado", description: "Bem-vindo ao sistema Qu4ttuor!" });
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = email.trim().toLowerCase();
    if (!target) {
      toast({ title: "Informe seu email", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(target, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);

    // Falha de rede é o único caso em que avisamos erro; qualquer outro retorno
    // recebe a mesma mensagem neutra, para não revelar se o e-mail existe.
    if (error && /network|fetch|timeout/i.test(error.message ?? "")) {
      toast({
        title: "Falha de conexão",
        description: "Não conseguimos enviar o pedido. Verifique sua internet e tente novamente.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Pedido registrado",
      description:
        "Se o e-mail estiver cadastrado, você receberá as instruções para redefinir sua senha.",
    });
    setForgotMode(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <img src={logo} alt="Qu4ttuor Consultoria" className="h-14 mx-auto mb-4" />
          <p className="text-muted-foreground">Sistema de Cálculos</p>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-heading">
              {forgotMode ? "Recuperar Senha" : "Entrar"}
            </CardTitle>
            <CardDescription>
              {forgotMode
                ? "Informe seu email para receber o link de redefinição"
                : "Insira suas credenciais para acessar o sistema"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={forgotMode ? handleForgotPassword : handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {!forgotMode && (
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              )}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Aguarde..." : forgotMode ? "Enviar link" : "Entrar"}
              </Button>
              <button
                type="button"
                onClick={() => setForgotMode(!forgotMode)}
                className="w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {forgotMode ? "Voltar ao login" : "Esqueceu a senha?"}
              </button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Qu4ttuor Consultoria. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
};

export default Login;
