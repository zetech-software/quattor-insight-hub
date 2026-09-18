import { useCallback, useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, Power, PowerOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime, formatLocalDate } from "@/lib/calculationExport";

export interface ClientDetailTarget {
  user_id: string;
  full_name: string | null;
  company_name: string | null;
  cnpj: string | null;
  municipio: string | null;
  uf: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  plan_name: string | null;
  sub_status: string | null;
  calc_count: number;
}

interface Props {
  client: ClientDetailTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManageClients: boolean;
  canManagePlans: boolean;
  /** Somente o Dono edita os dados cadastrais do cliente. */
  canEditClient?: boolean;
  onToggleActive: (userId: string, currentActive: boolean) => void;
  onUpdatePlan: (userId: string, planName: string) => void;
  onClientSaved?: () => void;
}

interface EditForm {
  company_name: string;
  cnpj: string;
  municipio: string;
  uf: string;
  full_name: string;
  phone: string;
}

const onlyDigits = (v: string) => v.replace(/\D/g, "");

const statusLabels: Record<string, string> = {
  active: "Ativa",
  trial: "Período de teste",
  expired: "Vencida",
  cancelled: "Cancelada",
};

type RecentCalc = {
  id: string;
  data: string;
  numero_nf: string | null;
  placa_ct: string | null;
  diferenca_volume: number | null;
  situacao: string | null;
};

const formatCnpj = (v: string | null) => {
  if (!v) return "—";
  const d = v.replace(/\D/g, "");
  if (d.length !== 14) return v;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
};

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="space-y-0.5">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-sm font-medium break-words">{value}</p>
  </div>
);

export function ClientDetailSheet({
  client,
  open,
  onOpenChange,
  canManageClients,
  canManagePlans,
  onToggleActive,
  onUpdatePlan,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [lastSignIn, setLastSignIn] = useState<string | null>(null);
  const [calcs, setCalcs] = useState<RecentCalc[]>([]);

  const load = useCallback(async (userId: string) => {
    setLoading(true);
    setEmail(null);
    setLastSignIn(null);
    setCalcs([]);

    const [detailsRes, calcsRes] = await Promise.all([
      supabase.functions.invoke("manage-clients", {
        body: { action: "client-details", userId },
      }),
      supabase
        .from("calculations")
        .select("id, data, numero_nf, placa_ct, diferenca_volume, situacao")
        .eq("user_id", userId)
        .order("data", { ascending: false })
        .limit(5),
    ]);

    const details = detailsRes.data as { email?: string | null; lastSignInAt?: string | null } | null;
    if (details?.email !== undefined) setEmail(details.email ?? null);
    if (details?.lastSignInAt !== undefined) setLastSignIn(details.lastSignInAt ?? null);
    setCalcs((calcsRes.data as RecentCalc[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open && client) void load(client.user_id);
  }, [open, client, load]);

  if (!client) return null;

  const hasSubscription = Boolean(client.plan_name && client.sub_status);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-heading">{client.full_name || "Cliente"}</SheetTitle>
          <SheetDescription>{client.company_name || "Sem empresa informada"}</SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-5">
          <div className="flex flex-wrap gap-2">
            <Badge variant={client.is_active ? "default" : "secondary"} className={client.is_active ? "bg-green-600" : ""}>
              {client.is_active ? "Ativo" : "Inativo"}
            </Badge>
            <Badge variant="outline">Cliente</Badge>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Dados principais</p>
            <div className="grid grid-cols-2 gap-3">
              <Row label="E-mail" value={loading && !email ? "Carregando…" : email || "—"} />
              <Row label="Telefone" value={client.phone || "—"} />
              <Row label="CNPJ" value={formatCnpj(client.cnpj)} />
              <Row label="Município / UF" value={[client.municipio, client.uf].filter(Boolean).join(" / ") || "—"} />
              <Row label="Cadastro" value={formatDateTime(client.created_at)} />
              <Row label="Último acesso" value={lastSignIn ? formatDateTime(lastSignIn) : "Nunca acessou"} />
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Plano / assinatura</p>
            <p className="text-sm font-medium">
              {hasSubscription
                ? `${client.plan_name} (${statusLabels[client.sub_status as string] ?? client.sub_status})`
                : "Sem assinatura registrada"}
            </p>
          </div>

          <Separator />

          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Dados operacionais</p>
            <div className="grid grid-cols-2 gap-3">
              <Row label="Total de cálculos" value={client.calc_count} />
              <Row label="Último cálculo" value={calcs[0] ? formatLocalDate(calcs[0].data) : "Nenhum cálculo"} />
            </div>

            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : calcs.length > 0 ? (
              <div className="mt-3 border rounded-md divide-y">
                {calcs.map((c) => {
                  const diff = Number(c.diferenca_volume ?? 0);
                  return (
                    <div key={c.id} className="p-2.5 text-xs flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono">{formatLocalDate(c.data)}</p>
                        <p className="text-muted-foreground truncate">
                          NF {c.numero_nf || "—"} · {c.placa_ct || "—"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p
                          className={`font-mono font-semibold ${
                            diff < 0 ? "text-destructive" : diff > 0 ? "text-green-600" : ""
                          }`}
                        >
                          {diff.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} L
                        </p>
                        <p className="text-muted-foreground">{c.situacao || "—"}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Nenhum cálculo registrado.</p>
            )}
          </div>

          {(canManageClients || canManagePlans) && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Ações</p>
                {canManageClients && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => onToggleActive(client.user_id, client.is_active)}
                  >
                    {client.is_active ? (
                      <><PowerOff className="h-4 w-4 mr-2" /> Desativar cliente</>
                    ) : (
                      <><Power className="h-4 w-4 mr-2" /> Ativar cliente</>
                    )}
                  </Button>
                )}
                {canManagePlans && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => onUpdatePlan(client.user_id, "Básico")}>
                      Plano Básico
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => onUpdatePlan(client.user_id, "Premium")}>
                      Plano Premium
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
