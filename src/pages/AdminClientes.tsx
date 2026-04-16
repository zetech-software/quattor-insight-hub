import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Users, UserPlus, Search, Mail, MoreHorizontal } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const mockClients = [
  { id: 1, nome: "Grupo Bom Futuro", email: "contato@bomfuturo.com", status: "ativo", calculos: 156, plano: "Premium", ultimoAcesso: "2026-04-15" },
  { id: 2, nome: "Distribuidora Norte", email: "admin@distnorte.com", status: "ativo", calculos: 89, plano: "Básico", ultimoAcesso: "2026-04-14" },
  { id: 3, nome: "Postos Regional", email: "ti@postosregional.com", status: "ativo", calculos: 245, plano: "Premium", ultimoAcesso: "2026-04-15" },
  { id: 4, nome: "Transportadora Sul", email: "op@transsul.com", status: "inativo", calculos: 34, plano: "Trial", ultimoAcesso: "2026-03-20" },
  { id: 5, nome: "Diesel Express", email: "admin@dieselexpress.com", status: "ativo", calculos: 12, plano: "Básico", ultimoAcesso: "2026-04-15" },
];

const AdminClientes = () => {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");

  const handleInvite = () => {
    if (!inviteEmail || !inviteName) {
      toast({ title: "Erro", description: "Preencha todos os campos.", variant: "destructive" });
      return;
    }
    toast({ title: "Convite enviado!", description: `Convite enviado para ${inviteEmail}` });
    setInviteEmail("");
    setInviteName("");
  };

  return (
    <AppLayout isAdmin={true}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-heading flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Gestão de Clientes
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Gerencie os clientes do sistema</p>
          </div>

          <Dialog>
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
                  <Label>Nome da Empresa</Label>
                  <Input placeholder="Ex: Distribuidora ABC" value={inviteName} onChange={(e) => setInviteName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" placeholder="contato@empresa.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                </div>
                <Button className="w-full" onClick={handleInvite}>
                  <Mail className="h-4 w-4 mr-1" />
                  Enviar Convite
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar clientes..." className="max-w-sm" />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead className="text-right">Cálculos</TableHead>
                  <TableHead>Último Acesso</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.nome}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{client.email}</TableCell>
                    <TableCell>
                      <Badge variant={client.status === "ativo" ? "default" : "secondary"} className={client.status === "ativo" ? "bg-green-600" : ""}>
                        {client.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{client.plano}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{client.calculos}</TableCell>
                    <TableCell className="text-sm text-muted-foreground font-mono">{client.ultimoAcesso}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default AdminClientes;
