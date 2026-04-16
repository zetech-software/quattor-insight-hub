import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calculator, TrendingUp, CreditCard, Activity } from "lucide-react";

const stats = [
  { title: "Clientes Ativos", value: "24", change: "+3 este mês", icon: Users, color: "text-green-600" },
  { title: "Clientes Inativos", value: "5", change: "-1 este mês", icon: Users, color: "text-muted-foreground" },
  { title: "Cálculos Realizados", value: "1.284", change: "+127 esta semana", icon: Calculator, color: "text-primary" },
  { title: "Assinaturas Ativas", value: "22", change: "91% conversão", icon: CreditCard, color: "text-blue-600" },
];

const recentActivity = [
  { client: "Grupo Bom Futuro", action: "Realizou cálculo", time: "há 5 min" },
  { client: "Distribuidora Norte", action: "Realizou cálculo", time: "há 12 min" },
  { client: "Postos Regional", action: "Login realizado", time: "há 30 min" },
  { client: "Transportadora Sul", action: "Realizou 3 cálculos", time: "há 1h" },
  { client: "Diesel Express", action: "Conta ativada", time: "há 2h" },
];

const AdminDashboard = () => {
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-heading">Dashboard Administrativo</h1>
          <p className="text-muted-foreground text-sm mt-1">Visão geral do sistema Qu4ttuor</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold font-heading">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.title}</p>
                <p className="text-xs text-primary mt-1">{stat.change}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Atividade Recente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{item.client}</p>
                      <p className="text-xs text-muted-foreground">{item.action}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{item.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Usage Chart Placeholder */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Cálculos por Semana
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center border-2 border-dashed border-muted rounded-lg">
                <div className="text-center text-muted-foreground">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Gráfico será carregado com dados reais</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminDashboard;
