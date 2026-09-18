import { useCallback, useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Loader2, Save, UserCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDateTime } from "@/lib/calculationExport";

const roleLabels: Record<string, string> = {
  admin: "Proprietário",
  manager: "Gestão",
  support: "Suporte",
  client: "Cliente",
};

const statusLabels: Record<string, string> = {
  active: "Ativa",
  trial: "Período de teste",
  expired: "Vencida",
  cancelled: "Cancelada",
};

interface FormState {
  company_name: string;
  cnpj: string;
  municipio: string;
  uf: string;
  full_name: string;
  phone: string;
}

const empty: FormState = {
  company_name: "",
  cnpj: "",
  municipio: "",
  uf: "",
  full_name: "",
  phone: "",
};

const onlyDigits = (v: string) => v.replace(/\D/g, "");

const Perfil = () => {
  const { user, role, refreshProfile } = useAuth();
  // Contas internas (Dono, Gestão, Suporte) veem apenas a própria conta, sem dados de empresa cliente.
  const isStaff = role === "admin" || role === "manager" || role === "support";
  const pageTitle = isStaff ? "Minha conta" : "Perfil";
  const [form, setForm] = useState<FormState>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [isActive, setIsActive] = useState(true);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<{ plan_name: string; status: string; expires_at: string | null } | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [profileRes, subRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("company_name, cnpj, municipio, uf, full_name, phone, is_active, created_at")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("subscriptions")
        .select("plan_name, status, expires_at")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    if (profileRes.error) {
      toast({
        title: "Não foi possível carregar seu perfil",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } else if (profileRes.data) {
      const p = profileRes.data;
      setForm({
        company_name: p.company_name ?? "",
        cnpj: p.cnpj ?? "",
        municipio: p.municipio ?? "",
        uf: p.uf ?? "",
        full_name: p.full_name ?? "",
        phone: p.phone ?? "",
      });
      setIsActive(p.is_active);
      setCreatedAt(p.created_at);
    }

    setSubscription(subRes.data ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const setField = (key: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = () => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.full_name.trim()) next.full_name = "Informe o nome do responsável.";
    if (form.cnpj.trim() && onlyDigits(form.cnpj).length !== 14) {
      next.cnpj = "O CNPJ deve ter 14 números.";
    }
    if (form.uf.trim() && !/^[A-Za-z]{2}$/.test(form.uf.trim())) {
      next.uf = "Use a sigla do estado, com 2 letras (ex.: SP).";
    }
    const phoneDigits = onlyDigits(form.phone);
    if (form.phone.trim() && (phoneDigits.length < 10 || phoneDigits.length > 11)) {
      next.phone = "Informe o telefone com DDD (10 ou 11 números).";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!user) return;
    if (!validate()) return;

    setSaving(true);
    const payload: Record<string, string | null> = {
      full_name: form.full_name.trim(),
      phone: form.phone.trim() || null,
    };
    if (!isStaff) {
      payload.company_name = form.company_name.trim() || null;
      payload.cnpj = form.cnpj.trim() ? onlyDigits(form.cnpj) : null;
      payload.municipio = form.municipio.trim() || null;
      payload.uf = form.uf.trim() ? form.uf.trim().toUpperCase() : null;
    }

    const { error } = await supabase
      .from("profiles")
      .update(payload)
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

    toast({ title: "Dados atualizados!", description: "Suas informações foram salvas." });
    await refreshProfile();
    await load();
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-heading flex items-center gap-2">
            <UserCircle className="h-6 w-6 text-primary" />
            {pageTitle}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isStaff
              ? "Consulte e atualize os dados da sua conta de acesso."
              : "Consulte e atualize os dados da sua empresa e do operador responsável."}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-heading flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Dados da empresa
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="company_name">Nome da empresa</Label>
                  <Input
                    id="company_name"
                    value={form.company_name}
                    onChange={(e) => setField("company_name", e.target.value)}
                    placeholder="Ex.: Transportadora Ribeiro"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    value={form.cnpj}
                    onChange={(e) => setField("cnpj", e.target.value)}
                    placeholder="00000000000000"
                    inputMode="numeric"
                  />
                  {errors.cnpj && <p className="text-xs text-destructive">{errors.cnpj}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="municipio">Município</Label>
                  <Input
                    id="municipio"
                    value={form.municipio}
                    onChange={(e) => setField("municipio", e.target.value)}
                    placeholder="Ex.: Campinas"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="uf">Estado (UF)</Label>
                  <Input
                    id="uf"
                    value={form.uf}
                    maxLength={2}
                    onChange={(e) => setField("uf", e.target.value.toUpperCase())}
                    placeholder="SP"
                  />
                  {errors.uf && <p className="text-xs text-destructive">{errors.uf}</p>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-heading flex items-center gap-2">
                  <UserCircle className="h-4 w-4 text-primary" />
                  Dados do operador
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="full_name">Nome *</Label>
                  <Input
                    id="full_name"
                    value={form.full_name}
                    onChange={(e) => setField("full_name", e.target.value)}
                    placeholder="Nome do responsável"
                  />
                  {errors.full_name && <p className="text-xs text-destructive">{errors.full_name}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                    placeholder="(19) 99999-0000"
                  />
                  {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="email">E-mail de acesso</Label>
                  <Input id="email" value={user?.email ?? ""} readOnly disabled />
                  <p className="text-xs text-muted-foreground">
                    O e-mail de acesso não pode ser alterado por aqui.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-heading">Informações da conta</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">Situação da conta</p>
                  <Badge variant={isActive ? "default" : "secondary"} className={isActive ? "bg-green-600" : ""}>
                    {isActive ? "Ativa" : "Inativa"}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">Perfil de acesso</p>
                  <p className="font-medium">{role ? roleLabels[role] ?? role : "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">Plano / assinatura</p>
                  <p className="font-medium">
                    {subscription
                      ? `${subscription.plan_name} (${statusLabels[subscription.status] ?? subscription.status})`
                      : "Sem assinatura registrada"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">Cadastro</p>
                  <p className="font-medium font-mono">{formatDateTime(createdAt)}</p>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Salvar alterações
              </Button>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default Perfil;
