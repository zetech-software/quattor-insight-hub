import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, RefreshCw, UserCheck } from "lucide-react";
import { useTicketActions, useTicketDetail } from "@/hooks/useTickets";
import { useAuth } from "@/hooks/useAuth";
import { TicketThread } from "@/components/tickets/TicketThread";
import { PriorityBadge, StatusBadge } from "@/components/tickets/TicketBadges";
import {
  PRIORITY_LABELS,
  PRIORITY_ORDER,
  STATUS_LABELS,
  STATUS_ORDER,
  categoryLabel,
  formatDateTime,
  ticketCode,

  type TicketPriority,
  type TicketStatus,
} from "@/lib/tickets";
import { toast } from "@/hooks/use-toast";

const SuporteChamado = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { detail, loading, error, reload } = useTicketDetail(id);
  const { updateTicket, saving } = useTicketActions();

  const apply = async (patch: Parameters<typeof updateTicket>[1], successTitle: string) => {
    if (!id) return;
    try {
      await updateTicket(id, patch);
      toast({ title: successTitle });
      reload();
    } catch (e) {
      toast({
        title: "Não foi possível salvar",
        description: e instanceof Error ? e.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        <Button variant="ghost" className="gap-2 -ml-2" onClick={() => navigate("/suporte")}>
          <ArrowLeft className="h-4 w-4" /> Voltar para a caixa
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
                <p className="text-xs font-mono text-muted-foreground">#{ticketCode(detail.ticket.id)}</p>
                <CardTitle className="text-lg">{detail.ticket.subject}</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={detail.ticket.status} />
                  <PriorityBadge priority={detail.ticket.priority} />
                  <span className="text-sm text-muted-foreground">{categoryLabel(detail.ticket.category)}</span>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>
                    Aberto por <span className="text-foreground font-medium">{detail.ticket.requester_name || "Sem nome"}</span>{" "}
                    ({detail.ticket.requester_email || "sem e-mail"})
                  </p>
                  <p>
                    Aberto em {formatDateTime(detail.ticket.created_at)} · última mensagem em{" "}
                    {formatDateTime(detail.ticket.last_message_at)}
                  </p>
                  <p>Responsável: {detail.ticket.assigned_name || "ninguém ainda"}</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Situação</Label>
                    <Select
                      value={detail.ticket.status}
                      onValueChange={(v) =>
                        apply(
                          {
                            status: v as TicketStatus,
                            closed_at: v === "fechado" ? new Date().toISOString() : null,
                          },
                          "Situação atualizada",
                        )
                      }
                      disabled={saving}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_ORDER.map((s) => (
                          <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Prioridade</Label>
                    <Select
                      value={detail.ticket.priority}
                      onValueChange={(v) => apply({ priority: v as TicketPriority }, "Prioridade atualizada")}
                      disabled={saving}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PRIORITY_ORDER.map((p) => (
                          <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {detail.ticket.assigned_to !== user?.id ? (
                  <Button
                    variant="outline"
                    className="gap-2"
                    disabled={saving}
                    onClick={() =>
                      apply(
                        {
                          assigned_to: user?.id ?? null,
                          assigned_name: profile?.full_name ?? user?.email ?? null,
                        },
                        "Chamado atribuído a você",
                      )
                    }
                  >
                    <UserCheck className="h-4 w-4" /> Assumir chamado
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    className="gap-2"
                    disabled={saving}
                    onClick={() => apply({ assigned_to: null, assigned_name: null }, "Chamado liberado")}
                  >
                    Liberar chamado
                  </Button>
                )}
              </CardContent>
            </Card>

            <TicketThread detail={detail} supportMode onChanged={reload} />
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default SuporteChamado;
