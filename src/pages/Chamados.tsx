import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LifeBuoy, Loader2, RefreshCw } from "lucide-react";
import { useTicketList } from "@/hooks/useTickets";
import { NewTicketDialog } from "@/components/tickets/NewTicketDialog";
import { PriorityBadge, StatusBadge } from "@/components/tickets/TicketBadges";
import { categoryLabel, formatDateTime } from "@/lib/tickets";

const Chamados = () => {
  const navigate = useNavigate();
  const { tickets, loading, error, reload, isUnread } = useTicketList("own");

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl">
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
          <CardHeader>
            <CardTitle className="text-base">Seus chamados</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 py-10 justify-center text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
              </div>
            ) : error ? (
              <div className="py-10 text-center space-y-3">
                <p className="text-sm text-muted-foreground">Não foi possível carregar seus chamados.</p>
                <Button variant="outline" onClick={reload} className="gap-2">
                  <RefreshCw className="h-4 w-4" /> Tentar novamente
                </Button>
              </div>
            ) : tickets.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Você ainda não abriu nenhum chamado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Assunto</TableHead>
                      <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                      <TableHead>Situação</TableHead>
                      <TableHead className="hidden sm:table-cell">Prioridade</TableHead>
                      <TableHead className="hidden md:table-cell">Última mensagem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((t) => (
                      <TableRow
                        key={t.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/chamados/${t.id}`)}
                      >
                        <TableCell className="font-medium">
                          <span className="flex items-center gap-2">
                            {t.subject}
                            {isUnread(t) && <Badge variant="default">Novo</Badge>}
                          </span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">
                          {categoryLabel(t.category)}
                        </TableCell>
                        <TableCell><StatusBadge status={t.status} /></TableCell>
                        <TableCell className="hidden sm:table-cell"><PriorityBadge priority={t.priority} /></TableCell>
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

export default Chamados;
