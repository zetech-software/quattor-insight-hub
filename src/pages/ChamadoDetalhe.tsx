import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, RefreshCw, RotateCcw } from "lucide-react";
import { useTicketDetail, useTicketActions } from "@/hooks/useTickets";
import { TicketThread } from "@/components/tickets/TicketThread";
import { PriorityBadge, StatusBadge } from "@/components/tickets/TicketBadges";
import { categoryLabel, formatDateTime } from "@/lib/tickets";
import { toast } from "@/hooks/use-toast";

const REOPEN_WINDOW_DAYS = 7;

const ChamadoDetalhe = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { detail, loading, error, reload } = useTicketDetail(id);
  const { updateTicket, saving } = useTicketActions();

  const canReopen = (() => {
    if (!detail) return false;
    if (detail.ticket.status !== "fechado" && detail.ticket.status !== "resolvido") return false;
    const ref = detail.ticket.closed_at ?? detail.ticket.updated_at;
    return (Date.now() - new Date(ref).getTime()) / 86_400_000 <= REOPEN_WINDOW_DAYS;
  })();

  const handleReopen = async () => {
    if (!id) return;
    try {
      await updateTicket(id, { status: "aberto", closed_at: null });
      toast({ title: "Chamado reaberto" });
      reload();
    } catch (e) {
      toast({
        title: "Não foi possível reabrir",
        description: e instanceof Error ? e.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        <Button variant="ghost" className="gap-2 -ml-2" onClick={() => navigate("/chamados")}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>

        {loading ? (
          <div className="flex items-center gap-2 py-10 justify-center text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : error || !detail ? (
          <div className="py-10 text-center space-y-3">
            <p className="text-sm text-muted-foreground">{error ?? "Chamado não encontrado."}</p>
            <Button variant="outline" onClick={reload} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Tentar novamente
            </Button>
          </div>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{detail.ticket.subject}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={detail.ticket.status} />
                  <PriorityBadge priority={detail.ticket.priority} />
                  <span className="text-sm text-muted-foreground">{categoryLabel(detail.ticket.category)}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Aberto em {formatDateTime(detail.ticket.created_at)} · última mensagem em{" "}
                  {formatDateTime(detail.ticket.last_message_at)}
                </p>
                {canReopen && (
                  <Button variant="outline" size="sm" className="gap-2" onClick={handleReopen} disabled={saving}>
                    <RotateCcw className="h-4 w-4" /> Reabrir chamado
                  </Button>
                )}
              </CardContent>
            </Card>

            <TicketThread detail={detail} onChanged={reload} />
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default ChamadoDetalhe;
