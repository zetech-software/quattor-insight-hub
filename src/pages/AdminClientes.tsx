import { useEffect, useState, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Users, UserPlus, Search, Mail, MoreHorizontal, Loader2, Power, PowerOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ClientRow {
  user_id: string;
  full_name: string | null;
  company_name: string | null;
  is_active: boolean;
  created_at: string;
  plan_name: string;
  sub_status: string;
  calc_count: number;
  email?: string;
}

const AdminClientes = () => {
  const { role } = useAuth();
  const canManagePlans = role === "admin";
  // Suporte enxerga a lista, mas não convida, não ativa/desativa e não altera planos.
  const canManageClients = role === "admin" || role === "manager" || role === "support";

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteCompany, setInviteCompany] = useState("");
  const [inviting, setInviting] = useState(false);

  const loadClients = useCallback(async () => {
    setLoading(true);

    // Get all client profiles
    const { data: profiles, error: pError } = await supabase
      .from("profiles")
      .select("user_id, full_name, company_name, is_active, created_at");

    if (pError) {
      toast({ title: "Erro ao carregar clientes", description: pError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Get subscriptions
    const { data: subs } = await supabase
      .from("subscriptions")
      .select("user_id, plan_name, status");

    // Get calculation counts
    const { data: calcs } = await supabase
      .from("calculations")
      .select("user_id");

    // Get roles to filter out staff accounts (admin/gestão/suporte)
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role");

    const adminIds = new Set(
      (roles || [])
        .filter(r => r.role === "admin" || r.role === "manager" || r.role === "support")
        .map(r => r.user_id)
    );

    const subsMap = new Map((subs || []).map(s => [s.user_id, s]));

    // Count calculations per user
    const calcCounts = new Map<string, number>();
    (calcs || []).forEach(c => {
      calcCounts.set(c.user_id, (calcCounts.get(c.user_id) || 0) + 1);
    });

    const clientRows: ClientRow[] = (profiles || [])
      .filter(p => !adminIds.has(p.user_id))
      .map(p => {
        const sub = subsMap.get(p.user_id);
        return {
          user_id: p.user_id,
          full_name: p.full_name,
          company_name: p.company_name,
          is_active: p.is_active,
          created_at: p.created_at,
          plan_name: sub?.plan_name || "Básico",
          sub_status: sub?.status || "trial",
          calc_count: calcCounts.get(p.user_id) || 0,
        };
      });

    setClients(clientRows);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const handleInvite = async () => {
    if (!inviteEmail || !inviteName) {
      toast({ title: "Erro", description: "Preencha email e nome.", variant: "destructive" });
      return;
    }

    setInviting(true);
    const { data, error } = await supabase.functions.invoke("manage-clients", {
      body: {
        action: "invite",
        email: inviteEmail,
        fullName: inviteName,
        companyName: inviteCompany || null,
      },
    });
    setInviting(false);

    if (error || data?.error) {
      toast({ title: "Erro ao convidar", description: data?.error || error?.message, variant: "destructive" });
    } else {
      toast({ title: "Cliente convidado!", description: `Convite criado para ${inviteEmail}. O cliente receberá um email para definir sua senha.` });
      setInviteEmail("");
      setInviteName("");
      setInviteCompany("");
      setInviteOpen(false);
      loadClients();
    }
  };

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    const { data, error } = await supabase.functions.invoke("manage-clients", {
      body: { action: "toggle-active", userId, isActive: !currentActive },
    });

    if (error || data?.error) {
      toast({ title: "Erro", description: data?.error || error?.message, variant: "destructive" });
    } else {
      toast({ title: currentActive ? "Cliente desativado" : "Cliente ativado" });
      loadClients();
    }
  };

  const handleUpdatePlan = async (userId: string, planName: string) => {
    const { data, error } = await supabase.functions.invoke("manage-clients", {
      body: { action: "update-subscription", userId, planName },
    });

    if (error || data?.error) {
      toast({ title: "Erro", description: data?.error || error?.message, variant: "destructive" });
    } else {
      toast({ title: "Plano atualizado" });
      loadClients();
    }
  };

  const filtered = clients.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      c.full_name?.toLowerCase().includes(s) ||
      c.company_name?.toLowerCase().includes(s)
    );
  });

  const statusLabel = (s: string) => {
    const map: Record<string, string> = { active: "Ativo", trial: "Trial", expired: "Expirado", cancelled: "Cancelado" };
    return map[s] || s;
  };

  const statusColor = (s: string) => {
    if (s === "active") return "bg-green-600";
    if (s === "trial") return "bg-blue-500";
    return "";
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-heading flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Gestão de Clientes
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {clients.length} cliente{clients.length !== 1 ? "s" : ""} cadastrado{clients.length !== 1 ? "s" : ""}
            </p>
          </div>

          {canManageClients && (
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>

            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="h-4 w-4 mr-1" />
                Convidar Cliente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-heading">Convidar Novo Cliente</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Nome Completo *</Label>
                  <Input placeholder="João da Silva" value={inviteName} onChange={(e) => setInviteName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Nome da Empresa</Label>
                  <Input placeholder="Ex: Distribuidora ABC" value={inviteCompany} onChange={(e) => setInviteCompany(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input type="email" placeholder="contato@empresa.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                </div>
                <Button className="w-full" onClick={handleInvite} disabled={inviting}>
                  {inviting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Mail className="h-4 w-4 mr-1" />}
                  Enviar Convite
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  O cliente receberá um email para definir sua senha de acesso.
                </p>
              </div>
            </DialogContent>
          </Dialog>
          )}

        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou empresa..."
                className="max-w-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">
                {search ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado. Convide o primeiro!"}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead className="text-right">Cálculos</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((client) => (
                    <TableRow key={client.user_id} className={!client.is_active ? "opacity-60" : ""}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{client.full_name || "—"}</p>
                          {client.company_name && (
                            <p className="text-xs text-muted-foreground">{client.company_name}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge
                            variant={client.is_active ? "default" : "secondary"}
                            className={client.is_active ? "bg-green-600 w-fit" : "w-fit"}
                          >
                            {client.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColor(client.sub_status)}>
                          {client.plan_name} ({statusLabel(client.sub_status)})
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">{client.calc_count}</TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">
                        {new Date(client.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        {canManageClients && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleToggleActive(client.user_id, client.is_active)}>
                                {client.is_active ? (
                                  <><PowerOff className="h-4 w-4 mr-2" /> Desativar</>
                                ) : (
                                  <><Power className="h-4 w-4 mr-2" /> Ativar</>
                                )}
                              </DropdownMenuItem>
                              {canManagePlans && (
                                <>
                                  <DropdownMenuItem onClick={() => handleUpdatePlan(client.user_id, "Básico")}>
                                    Plano Básico
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleUpdatePlan(client.user_id, "Premium")}>
                                    Plano Premium
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}

                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default AdminClientes;
