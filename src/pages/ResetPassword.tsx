import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/qu4ttuor-logo.svg";
import {
  PASSWORD_RULE_TEXT,
  friendlyPasswordError,
  validatePasswordPair,
} from "@/lib/passwordPolicy";

type LinkState = "verificando" | "valido" | "invalido";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [linkState, setLinkState] = useState<LinkState>("verificando");
  const [isInvite, setIsInvite] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let done = false;
    const hash = window.location.hash;
    if (hash.includes("type=invite")) setIsInvite(true);

    const finish = (state: LinkState) => {
      if (done) return;
      done = true;
      setLinkState(state);
    };

    // Evento oficial do link de recuperação (ou de convite).
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        finish("valido");
      }
    });

    // Também aceita o caso em que a sessão do link já foi estabelecida antes do listener.
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) finish("valido");
    };

    void check();
    // Se em alguns segundos nenhuma sessão de recuperação aparecer, o link não vale.
    const timer = window.setTimeout(() => {
      void (async () => {
        const { data } = await supabase.auth.getSession();
        finish(data.session?.user ? "valido" : "invalido");
      })();
    }, 2500);

    return () => {
      sub.subscription.unsubscribe();
      window.clearTimeout(timer);
    };
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const invalid = validatePasswordPair(password, confirm);
    if (invalid) {
      toast({ title: invalid, variant: "destructive" });
      return;
    }
    setLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user) {
      setLoading(false);
      setLinkState("invalido");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setLoading(false);
      const description = friendlyPasswordError(error.message);
      toast({ title: "Não foi possível redefinir a senha", description, variant: "destructive" });
      return;
    }

    // Encerra a sessão temporária do link e devolve o usuário ao login.
    await supabase.auth.signOut();
    setLoading(false);
    toast({
      title: "Senha atualizada com sucesso",
      description: "Entre com a nova senha para continuar.",
    });
    navigate("/login", { replace: true });
  };

  if (linkState === "verificando") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="flex flex-col items-center gap-3">
          <img src={logo} alt="Qu4ttuor" className="h-10 animate-pulse" />
          <p className="text-sm text-muted-foreground">Verificando o link...</p>
        </div>
      </div>
    );
  }

  if (linkState === "invalido") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-3">
            <p className="font-medium">Link inválido ou expirado</p>
            <p className="text-sm text-muted-foreground">
              Este link de redefinição não é mais válido. Peça um novo link na tela de entrada.
            </p>
            <Button className="mt-2 w-full" onClick={() => navigate("/login", { replace: true })}>
              Pedir novo link
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <img src={logo} alt="Qu4ttuor" className="h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold font-heading">{isInvite ? "Definir sua senha" : "Redefinir Senha"}</h1>
        </div>
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="text-lg">{isInvite ? "Crie sua senha de acesso" : "Nova senha"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleReset} className="space-y-4">
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
                <Label htmlFor="confirmar-senha">Confirmar senha</Label>
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
                {loading ? "Atualizando..." : "Atualizar senha"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
