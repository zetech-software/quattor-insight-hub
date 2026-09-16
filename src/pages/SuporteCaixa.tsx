import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Headphones, Loader2, RefreshCw, Search } from "lucide-react";
import { useTicketList } from "@/hooks/useTickets";
import { useAuth } from "@/hooks/useAuth";
import { PriorityBadge, StatusBadge } from "@/components/tickets/TicketBadges";
import {
  PRIORITY_LABELS,
  PRIORITY_ORDER,
  STATUS_LABELS,
  STATUS_ORDER,
  formatDateTime,
} from "@/lib/tickets";

const SuporteCaixa = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tickets, loading, error, reload, isUnread } = useTicketList("all");
  const [status, setStatus] = useState<string>("todos");
  const [priority, setPriority] = useState<string>("todas");
  const [owner, setOwner] = useState<string>("todos");
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      tickets.filter((t) => {
        if (status !== "todos" && t.status !== status) return false;
        if (priority !== "todas" && t.priority !== priority) return false;
        if (owner === "meus" && t.assigned_to !== user?.id) return false;
        if (owner === "sem" && t.assigned_to) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          const hay = `${t.subject} ${t.requester_name ?? ""} ${t.requester_email ?? ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      }),
    [tickets, status, priority, owner, search, user?.id],
  );

  const abertos = tickets.filter((t) => t.status !== "fechado" && t.status !== "resolvido").length;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Headphones className="h-6 w-6 text-primary" />
            Caixa de chamados
          </h1>
          <p className="text-sm text-muted-foreground">
            {abertos} chamado(s) em andamento de um total de {tickets.length}.
          </p>
        </div>

        <Card>
          <CardHeader className="space-y-4">
            <CardTitle className="text-base">Chamados</CardTitle>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar assunto ou pessoa"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue placeholder="Situação" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as situações</SelectItem>
                  {STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue placeholder="Prioridade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as prioridades</SelectItem>
                  {PRIORITY_ORDER.map((p) => (
                    <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={owner} onValueChange={setOwner}>
                <SelectTrigger><SelectValue placeholder="Responsável" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os responsáveis</SelectItem>
                  <SelectItem value="meus">Meus chamados</SelectItem>
                  <SelectItem value="sem">Sem responsável</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 py-10 justify-center text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
              </div>
            ) : error ? (
              <div className="py-10 text-center space-y-3">
                <p className="text-sm text-muted-foreground">Não foi possível carregar os chamados.</p>
                <Button variant="outline" onClick={reload} className="gap-2">
                  <RefreshCw className="h-4 w-4" /> Tentar novamente
                </Button>
              </div>
            ) : tickets.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Nenhum chamado foi aberto até agora.
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Nenhum chamado corresponde aos filtros escolhidos.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Assunto</TableHead>
                      <TableHead>Quem abriu</TableHead>
                      <TableHead>Situação</TableHead>
                      <TableHead className="hidden sm:table-cell">Prioridade</TableHead>
                      <TableHead className="hidden lg:table-cell">Responsável</TableHead>
                      <TableHead className="hidden md:table-cell">Última mensagem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((t) => (
                      <TableRow key={t.id} className="cursor-pointer" onClick={() => navigate(`/suporte/${t.id}`)}>
                        <TableCell className="font-medium">
                          <span className="flex items-center gap-2">
                            {t.subject}
                            {isUnread(t) && <Badge variant="default">Novo</Badge>}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <span className="block">{t.requester_name || "Sem nome"}</span>
                          <span className="block text-xs">{t.requester_email}</span>
                        </TableCell>
                        <TableCell><StatusBadge status={t.status} /></TableCell>
                        <TableCell className="hidden sm:table-cell"><PriorityBadge priority={t.priority} /></TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          {t.assigned_name || "-"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {formatDateTime(t.last_message_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default SuporteCaixa;
