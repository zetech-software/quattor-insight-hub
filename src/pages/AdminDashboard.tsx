import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calculator, TrendingUp, CreditCard, Activity, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from "recharts";

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

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const [profilesRes, calcsRes, subsRes, rolesRes, recentRes] = await Promise.all([
      supabase.from("profiles").select("user_id, is_active, full_name, company_name"),
      supabase.from("calculations").select("user_id, created_at"),
      supabase.from("subscriptions").select("user_id, status"),
      supabase.from("user_roles").select("user_id, role"),
      supabase
        .from("calculations")
        .select("user_id, data, situacao, created_at")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    const adminIds = new Set(
      (rolesRes.data || [])
        .filter((r) => r.role === "admin" || r.role === "manager")
        .map((r) => r.user_id)
    );

    const clientProfiles = (profilesRes.data || []).filter((p) => !adminIds.has(p.user_id));
    const activeClients = clientProfiles.filter((p) => p.is_active).length;
    const inactiveClients = clientProfiles.filter((p) => !p.is_active).length;

    const subs = (subsRes.data || []).filter((s) => !adminIds.has(s.user_id));
    const activeSubs = subs.filter((s) => s.status === "active").length;
    const trialSubs = subs.filter((s) => s.status === "trial").length;

    const allCalcs = calcsRes.data || [];

    // Build weekly data for last 8 weeks
    const weeklyData: { week: string; count: number }[] = [];
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);

      const count = allCalcs.filter((c) => {
        const d = new Date(c.created_at);
        return d >= weekStart && d < weekEnd;
      }).length;

      const label = `${weekStart.getDate().toString().padStart(2, "0")}/${(weekStart.getMonth() + 1).toString().padStart(2, "0")}`;
      weeklyData.push({ week: label, count });
    }

    // Map user_ids to names for recent activity
    const profileMap = new Map(
      (profilesRes.data || []).map((p) => [p.user_id, p.company_name || p.full_name || "—"])
    );

    const recentCalcs = (recentRes.data || []).map((c) => ({
      client: profileMap.get(c.user_id) || "—",
      data: c.data,
      situacao: c.situacao,
      created_at: c.created_at,
    }));

    setStats({
      totalClients: clientProfiles.length,
      activeClients,
      inactiveClients,
      totalCalcs: allCalcs.length,
      activeSubs,
      trialSubs,
      recentCalcs,
      weeklyData,
    });
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
                          {item.situacao || "Cálculo realizado"} — {item.data}
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
