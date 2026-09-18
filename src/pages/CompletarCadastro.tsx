import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/qu4ttuor-logo.svg";
import {
  onlyDigits,
  validateClientProfile,
  type ClientProfileErrors,
} from "@/lib/clientProfileValidation";

interface FormState {
  company_name: string;
  cnpj: string;
  municipio: string;
  uf: string;
  full_name: string;
  phone: string;
}

const CompletarCadastro = () => {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>({
    company_name: "",
    cnpj: "",
    municipio: "",
    uf: "",
    full_name: "",
    phone: "",
  });
  const [errors, setErrors] = useState<ClientProfileErrors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setForm({
      company_name: profile.company_name ?? "",
      cnpj: profile.cnpj ?? "",
      municipio: profile.municipio ?? "",
      uf: profile.uf ?? "",
      full_name: profile.full_name ?? "",
      phone: profile.phone ?? "",
    });
  }, [profile]);

  const setField = (key: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const next = validateClientProfile(form, { required: true });
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name.trim(),
        company_name: form.company_name.trim(),
        cnpj: onlyDigits(form.cnpj),
        municipio: form.municipio.trim(),
        uf: form.uf.trim().toUpperCase(),
        phone: form.phone.trim(),
      })
      .eq("user_id", user.id);
    setSaving(false);

    if (error) {
      toast({
        title: "Não foi possível salvar",
        description: "Confira os dados e tente novamente.",
        variant: "destructive",
      });
      return;
    }

    await refreshProfile();
    toast({ title: "Cadastro concluído!", description: "Seu acesso está liberado." });
    navigate("/", { replace: true });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center">
          <img src={logo} alt="Qu4ttuor" className="h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold font-heading">Concluir cadastro</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Complete os dados da sua empresa para liberar o sistema.
          </p>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-heading">Dados cadastrais</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="full_name">Responsável *</Label>
                  <Input
                    id="full_name"
                    value={form.full_name}
                    onChange={(e) => setField("full_name", e.target.value)}
                    placeholder="Nome do responsável"
                  />
                  {errors.full_name && <p className="text-xs text-destructive">{errors.full_name}</p>}
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="company_name">Empresa *</Label>
                  <Input
                    id="company_name"
                    value={form.company_name}
                    onChange={(e) => setField("company_name", e.target.value)}
                    placeholder="Ex.: Transportadora Ribeiro"
                  />
                  {errors.company_name && (
                    <p className="text-xs text-destructive">{errors.company_name}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cnpj">CNPJ *</Label>
                  <Input
                    id="cnpj"
                    value={form.cnpj}
                    inputMode="numeric"
                    onChange={(e) => setField("cnpj", e.target.value)}
                    placeholder="00000000000000"
                  />
                  {errors.cnpj && <p className="text-xs text-destructive">{errors.cnpj}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Telefone *</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                    placeholder="(19) 99999-0000"
                  />
                  {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="municipio">Município *</Label>
                  <Input
                    id="municipio"
                    value={form.municipio}
                    onChange={(e) => setField("municipio", e.target.value)}
                    placeholder="Ex.: Campinas"
                  />
                  {errors.municipio && <p className="text-xs text-destructive">{errors.municipio}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="uf">Estado (UF) *</Label>
                  <Input
                    id="uf"
                    value={form.uf}
                    maxLength={2}
                    onChange={(e) => setField("uf", e.target.value.toUpperCase())}
                    placeholder="SP"
                  />
                  {errors.uf && <p className="text-xs text-destructive">{errors.uf}</p>}
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="email">E-mail de acesso</Label>
                  <Input id="email" value={user?.email ?? ""} readOnly disabled />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Salvar e continuar
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

export default CompletarCadastro;
