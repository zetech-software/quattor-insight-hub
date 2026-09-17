import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/qu4ttuor-logo.svg";
import { PASSWORD_RULE_TEXT, validatePasswordPair } from "@/lib/passwordPolicy";

const DefinirSenha = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const { session, role, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleExpiredSession = async () => {
    toast({
      title: "Sua sessão não está mais válida",
      description: "Entre novamente para continuar.",
      variant: "destructive",
    });
    await signOut();
    navigate("/login", { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const invalid = validatePasswordPair(password, confirm);
    if (invalid) {
      toast({ title: invalid, variant: "destructive" });
      return;
    }
    setLoading(true);

    // Revalida a sessão viva antes de tentar atualizar a senha.
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user) {
      setLoading(false);
      await handleExpiredSession();
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setLoading(false);
      console.error("[DefinirSenha] updateUser falhou:", error);
      const expired = /session|jwt|token|401|403/i.test(error.message ?? "");
      if (expired) {
        await handleExpiredSession();
        return;
      }
      toast({
        title: "Não foi possível definir a nova senha",
        description: "Verifique a senha informada e tente novamente.",
        variant: "destructive",
      });
      return;
    }
    const { error: flagError } = await supabase.rpc("clear_must_change_password");
    if (flagError) {
      setLoading(false);
      console.error("[DefinirSenha] clear_must_change_password falhou:", flagError);
      toast({
        title: "Senha atualizada, mas houve uma falha ao liberar o acesso",
        description: "Tente entrar novamente em instantes.",
        variant: "destructive",
      });
      return;
    }
    await refreshProfile();
    setLoading(false);
    toast({ title: "Senha definida com sucesso!" });
    navigate(role === "admin" ? "/admin" : "/", { replace: true });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  if (!session) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <img src={logo} alt="Qu4ttuor" className="h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold font-heading">Definir nova senha</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Sua senha atual é temporária. Defina uma nova senha para continuar.
          </p>
        </div>
        <Card className="border-0 shadow-xl">
          <CardHeader><CardTitle className="text-lg">Nova senha</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nova-senha">Nova senha</Label>
                <Input
                  id="nova-senha"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">{PASSWORD_RULE_TEXT}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmar-senha">Confirmar nova senha</Label>
                <Input
                  id="confirmar-senha"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Salvando..." : "Salvar nova senha"}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={handleSignOut}>
                Sair
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DefinirSenha;
