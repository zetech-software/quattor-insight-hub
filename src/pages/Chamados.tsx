import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LifeBuoy, Loader2, RefreshCw, Search } from "lucide-react";
import { useTicketList } from "@/hooks/useTickets";
import { NewTicketDialog } from "@/components/tickets/NewTicketDialog";
import { PriorityBadge, StatusBadge } from "@/components/tickets/TicketBadges";
import {
  STATUS_LABELS,
  STATUS_ORDER,
  TICKET_ERRORS,
  categoryLabel,
  formatDateTime,
  ticketCode,
} from "@/lib/tickets";

const Chamados = () => {
  const navigate = useNavigate();
  const { tickets, loading, error, reload, isUnread } = useTicketList("own");
  const [status, setStatus] = useState("todos");
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      tickets.filter((t) => {
        if (status !== "todos" && t.status !== status) return false;
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          if (!`${t.subject} ${ticketCode(t.id)}`.toLowerCase().includes(q)) return false;
        }
        return true;
      }),
    [tickets, status, search],
  );

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <LifeBuoy className="h-6 w-6 text-primary" />
              Chamados
            </h1>
            <p className="text-sm text-muted-foreground">Fale com o suporte da Qu4ttuor e acompanhe as respostas.</p>
          </div>
          <NewTicketDialog onCreated={reload} />
        </div>

        <Card>
          <CardHeader className="space-y-4">
            <CardTitle className="text-base">Seus chamados</CardTitle>
            <div className="grid gap-3 sm:grid-cols-2 lg:max-w-xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar por assunto ou código"
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
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 py-10 justify-center text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
              </div>
            ) : error ? (
              <div className="py-10 text-center space-y-3">
                <p className="text-sm text-muted-foreground">{TICKET_ERRORS.load}</p>
                <Button variant="outline" onClick={reload} className="gap-2">
                  <RefreshCw className="h-4 w-4" /> Tentar novamente
                </Button>
              </div>
            ) : tickets.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Você ainda não abriu nenhum chamado.
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Nenhum chamado corresponde aos filtros selecionados.
              </div>
            ) : (
              <>
                {/* Celular: cartões */}
                <div className="space-y-3 md:hidden">
                  {filtered.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => navigate(`/chamados/${t.id}`)}
                      className={`w-full text-left rounded-lg border p-3 space-y-2 ${
                        isUnread(t) ? "border-primary bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium">{t.subject}</span>
                        {isUnread(t) && <Badge>Nova resposta</Badge>}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={t.status} />
                        <PriorityBadge priority={t.priority} />
                        <span className="text-xs font-mono text-muted-foreground">#{ticketCode(t.id)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {categoryLabel(t.category)} · Responsável: {t.assigned_name || "ainda não atribuído"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Aberto em {formatDateTime(t.created_at)} · atualizado em {formatDateTime(t.last_message_at)}
                      </p>
                    </button>
                  ))}
                </div>

                {/* Computador: tabela */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">Código</TableHead>
                        <TableHead>Assunto</TableHead>
                        <TableHead className="hidden lg:table-cell">Categoria</TableHead>
                        <TableHead>Situação</TableHead>
                        <TableHead>Prioridade</TableHead>
                        <TableHead className="hidden lg:table-cell">Responsável</TableHead>
                        <TableHead className="hidden xl:table-cell">Criado em</TableHead>
                        <TableHead>Última atualização</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((t) => (
                        <TableRow
                          key={t.id}
                          className={`cursor-pointer ${isUnread(t) ? "bg-primary/5" : ""}`}
                          onClick={() => navigate(`/chamados/${t.id}`)}
                        >
                          <TableCell className="font-mono text-xs text-muted-foreground">#{ticketCode(t.id)}</TableCell>
                          <TableCell className="font-medium">
                            <span className="flex items-center gap-2">
                              {t.subject}
                              {isUnread(t) && <Badge>Nova resposta</Badge>}
                            </span>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground">
                            {categoryLabel(t.category)}
                          </TableCell>
                          <TableCell><StatusBadge status={t.status} /></TableCell>
                          <TableCell><PriorityBadge priority={t.priority} /></TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground">
                            {t.assigned_name || "-"}
                          </TableCell>
                          <TableCell className="hidden xl:table-cell text-muted-foreground text-sm">
                            {formatDateTime(t.created_at)}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDateTime(t.last_message_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Chamados;
