import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle2, Clock, Headphones, Inbox, Loader2, RefreshCw, Search, UserCheck } from "lucide-react";
import { useTicketList } from "@/hooks/useTickets";
import { useAuth } from "@/hooks/useAuth";
import { PriorityBadge, StatusBadge } from "@/components/tickets/TicketBadges";
import {
  PRIORITY_LABELS,
  PRIORITY_ORDER,
  STATUS_LABELS,
  STATUS_ORDER,
  formatDateTime,
  ticketCode,
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
          const q = search.trim().toLowerCase();
          const hay = `${t.subject} ${t.requester_name ?? ""} ${t.requester_email ?? ""} ${ticketCode(t.id)}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      }),
    [tickets, status, priority, owner, search, user?.id],
  );

  const counts = useMemo(() => {
    const by = (fn: (t: typeof tickets[number]) => boolean) => tickets.filter(fn).length;
    return {
      abertos: by((t) => t.status === "aberto"),
      atendimento: by((t) => t.status === "em_atendimento"),
      aguardando: by((t) => t.status === "aguardando_cliente"),
      resolvidos: by((t) => t.status === "resolvido" || t.status === "fechado"),
      criticos: by((t) => (t.priority === "alta" || t.priority === "urgente") && t.status !== "fechado" && t.status !== "resolvido"),
      novos: by((t) => isUnread(t)),
    };
  }, [tickets, isUnread]);

  const stats = [
    { label: "Abertos", value: counts.abertos, icon: Inbox, tone: "text-primary", filter: "aberto" },
    { label: "Em atendimento", value: counts.atendimento, icon: UserCheck, tone: "text-primary", filter: "em_atendimento" },
    { label: "Aguardando cliente", value: counts.aguardando, icon: Clock, tone: "text-muted-foreground", filter: "aguardando_cliente" },
    { label: "Resolvidos", value: counts.resolvidos, icon: CheckCircle2, tone: "text-muted-foreground", filter: "resolvido" },
    { label: "Alta / crítica", value: counts.criticos, icon: AlertTriangle, tone: "text-destructive", filter: null },
  ];

  const clearFilters = () => {
    setStatus("todos");
    setPriority("todas");
    setOwner("todos");
    setSearch("");
  };

  const hasFilters = status !== "todos" || priority !== "todas" || owner !== "todos" || search.trim() !== "";

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold font-heading flex items-center gap-2">
              <Headphones className="h-6 w-6 text-primary" />
              Caixa de chamados
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {tickets.length} chamado(s) no total
              {counts.novos > 0 && ` · ${counts.novos} com nova resposta`}
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={reload} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        </div>

        <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
          {stats.map((s) => (
            <Card
              key={s.label}
              className={`cursor-pointer transition-colors hover:border-primary/40 ${
                s.filter && status === s.filter ? "border-primary" : ""
              }`}
              onClick={() => {
                if (s.filter) {
                  setStatus(status === s.filter ? "todos" : s.filter);
                } else {
                  setPriority(priority === "alta" ? "todas" : "alta");
                }
              }}
            >
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <s.icon className={`h-4 w-4 ${s.tone}`} />
                  <span>{s.label}</span>
                </div>
                <p className="text-2xl font-bold font-heading">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">
                Chamados
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {filtered.length} de {tickets.length}
                </span>
              </CardTitle>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar por cliente, e-mail, assunto ou código"
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
              <>
                {/* Celular: cartões */}
                <div className="space-y-3 md:hidden">
                  {filtered.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => navigate(`/suporte/${t.id}`)}
                      className={`w-full text-left rounded-lg border p-3 space-y-2 ${
                        isUnread(t) ? "border-primary bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium">{t.subject}</span>
                        {isUnread(t) && <Badge>Nova resposta</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t.requester_name || "Sem nome"} · {t.requester_email}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={t.status} />
                        <PriorityBadge priority={t.priority} />
                        <span className="text-xs text-muted-foreground">#{ticketCode(t.id)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Responsável: {t.assigned_name || "ninguém"} · {formatDateTime(t.last_message_at)}
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
                        <TableHead>Cliente</TableHead>
                        <TableHead>Situação</TableHead>
                        <TableHead>Prioridade</TableHead>
                        <TableHead className="hidden lg:table-cell">Responsável</TableHead>
                        <TableHead>Última atualização</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((t) => (
                        <TableRow
                          key={t.id}
                          className={`cursor-pointer ${isUnread(t) ? "bg-primary/5" : ""}`}
                          onClick={() => navigate(`/suporte/${t.id}`)}
                        >
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            #{ticketCode(t.id)}
                          </TableCell>
                          <TableCell className="font-medium">
                            <span className="flex items-center gap-2">
                              {t.subject}
                              {isUnread(t) && <Badge>Nova resposta</Badge>}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            <span className="block text-foreground">{t.requester_name || "Sem nome"}</span>
                            <span className="block text-xs">{t.requester_email}</span>
                          </TableCell>
                          <TableCell><StatusBadge status={t.status} /></TableCell>
                          <TableCell><PriorityBadge priority={t.priority} /></TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground">
                            {t.assigned_name || "-"}
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

export default SuporteCaixa;
