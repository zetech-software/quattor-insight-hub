import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calculator, TrendingUp, CreditCard, Activity, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatLocalDate } from "@/lib/calculationExport";

interface DashboardStats {
  totalClients: number;
  activeClients: number;
  inactiveClients: number;
  totalCalcs: number;
  activeSubs: number;
  trialSubs: number;
  recentCalcs: {
    client: string;
    data: string;
    situacao: string | null;
    created_at: string;
  }[];
  weeklyData: { week: string; count: number }[];
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError,setLoadError]=useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);setLoadError(false);
    const {data,error}=await supabase.rpc("get_admin_dashboard");
    if(error||!data) {setLoadError(true);setLoading(false);return;}
    setStats(data as unknown as DashboardStats);
    setLoading(false);
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "agora";
    if (mins < 60) return `há ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `há ${hours}h`;
    const days = Math.floor(hours / 24);
    return `há ${days}d`;
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (loadError) return <AppLayout><div role="alert" className="p-8">
    <p>Não foi possível carregar os indicadores.</p><button type="button" onClick={()=>void loadStats()}>Tentar novamente</button>
  </div></AppLayout>;
  if (!stats) return null;

  const statCards = [
    { title: "Clientes Ativos", value: stats.activeClients, icon: Users, color: "text-green-600" },
    { title: "Clientes Inativos", value: stats.inactiveClients, icon: Users, color: "text-muted-foreground" },
    { title: "Cálculos Realizados", value: stats.totalCalcs, icon: Calculator, color: "text-primary" },
    { title: "Assinaturas", value: `${stats.activeSubs} ativas / ${stats.trialSubs} trial`, icon: CreditCard, color: "text-blue-600", isText: true },
  ];

  const chartConfig = {
    count: { label: "Cálculos", color: "hsl(var(--primary))" },
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-heading">Dashboard Administrativo</h1>
          <p className="text-muted-foreground text-sm mt-1">Visão geral do sistema Qu4ttuor</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <p className="text-2xl font-bold font-heading">
                  {"isText" in stat ? stat.value : stat.value.toLocaleString("pt-BR")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{stat.title}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Cálculos por Semana
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.weeklyData.some((d) => d.count > 0) ? (
                <ChartContainer config={chartConfig} className="h-64 w-full">
                  <BarChart data={stats.weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="week" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-center px-4 text-muted-foreground text-sm">
                  {stats.totalCalcs > 0
                    ? "Não houve cálculos nas últimas 8 semanas."
                    : "Sem dados de cálculos ainda"}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Cálculos Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.recentCalcs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum cálculo registrado.</p>
              ) : (
                <div className="space-y-3">
                  {stats.recentCalcs.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium">{item.client}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.situacao || "Cálculo realizado"} — {formatLocalDate(item.data)}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(item.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminDashboard;
