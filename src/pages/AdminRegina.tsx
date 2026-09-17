import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MessageCircle, Loader2, AlertTriangle, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { topicLabel } from "@/lib/reginaTopics";
import { formatDateTime } from "@/lib/calculationExport";
import type { Tables } from "@/integrations/supabase/types";

type Interaction = Tables<"regina_interactions">;

const PERIODS = [
  { label: "7 dias", days: 7 },
  { label: "30 dias", days: 30 },
  { label: "90 dias", days: 90 },
  { label: "Tudo", days: 0 },
];

const AdminRegina = () => {
  const [rows, setRows] = useState<Interaction[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const load = async () => {
    setLoading(true);
    let query = supabase
      .from("regina_interactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (days > 0) {
      const from = new Date();
      from.setDate(from.getDate() - days);
      query = query.gte("created_at", from.toISOString());
    }

    const [interactionsRes, profilesRes] = await Promise.all([
      query,
      supabase.from("profiles").select("user_id, full_name, company_name"),
    ]);

    if (interactionsRes.error) {
      toast({
        title: "Erro ao carregar interações",
        description: interactionsRes.error.message,
        variant: "destructive",
      });
    } else {
      setRows(interactionsRes.data || []);
    }

    const map: Record<string, string> = {};
    for (const p of profilesRes.data || []) {
      map[p.user_id] = p.full_name || p.company_name || "Cliente";
    }
    setNames(map);
    setLoading(false);
  };

  const summary = useMemo(() => {
    const topics = new Map<string, number>();
    const users = new Map<string, number>();
    let failures = 0;
    for (const r of rows) {
      topics.set(r.topic, (topics.get(r.topic) ?? 0) + 1);
      users.set(r.user_id, (users.get(r.user_id) ?? 0) + 1);
      if (r.status === "falha") failures += 1;
    }
    return {
      total: rows.length,
      failures,
      distinctUsers: users.size,
      topTopics: [...topics.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
      topUsers: [...users.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
    };
  }, [rows]);

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-heading flex items-center gap-2">
              <MessageCircle className="h-6 w-6 text-primary" />
              Regina (uso)
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Acompanhe as principais dúvidas enviadas à assistente
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {PERIODS.map((p) => (
              <Button
                key={p.days}
                size="sm"
                variant={days === p.days ? "default" : "outline"}
                onClick={() => setDays(p.days)}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
          <MetricCard label="Interações" value={String(summary.total)} icon={MessageCircle} />
          <MetricCard label="Com falha" value={String(summary.failures)} icon={AlertTriangle} />
          <MetricCard label="Clientes distintos" value={String(summary.distinctUsers)} icon={Users} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading">Assuntos mais frequentes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {summary.topTopics.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma interação no período.</p>
              ) : (
                summary.topTopics.map(([topic, count]) => (
                  <div key={topic} className="flex items-center justify-between text-sm">
                    <span>{topicLabel(topic)}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading">Clientes que mais usaram</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {summary.topUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma interação no período.</p>
              ) : (
                summary.topUsers.map(([userId, count]) => (
                  <div key={userId} className="flex items-center justify-between text-sm gap-2">
                    <span className="truncate">{names[userId] || "Cliente"}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading">Perguntas recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : rows.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">
                Nenhuma interação registrada no período.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Data</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Assunto</TableHead>
                      <TableHead>Pergunta</TableHead>
                      <TableHead>Situação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 50).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs whitespace-nowrap font-mono">
                          {formatDateTime(r.created_at)}
                        </TableCell>
                        <TableCell className="text-sm">{names[r.user_id] || "Cliente"}</TableCell>
                        <TableCell className="text-sm">{topicLabel(r.topic)}</TableCell>
                        <TableCell className="text-sm max-w-[320px] truncate" title={r.question}>
                          {r.question}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={r.status === "falha" ? "destructive" : "secondary"}
                            className={r.status === "respondida" ? "bg-green-600 text-white" : ""}
                          >
                            {r.status}
                          </Badge>
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

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof MessageCircle;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-heading font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default AdminRegina;
