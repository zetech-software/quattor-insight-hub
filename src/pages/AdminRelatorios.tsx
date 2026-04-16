import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileBarChart, Download, FileSpreadsheet, FileText } from "lucide-react";

const reports = [
  {
    title: "Relatório de Clientes",
    description: "Lista completa de clientes com status, plano e histórico de uso",
    icon: FileSpreadsheet,
    formats: ["Excel", "PDF"],
  },
  {
    title: "Relatório de Cálculos",
    description: "Todos os cálculos realizados por período, filtrados por cliente",
    icon: FileBarChart,
    formats: ["Excel", "PDF"],
  },
  {
    title: "Relatório de Assinaturas",
    description: "Status de assinaturas, pagamentos e renovações",
    icon: FileText,
    formats: ["Excel", "PDF"],
  },
  {
    title: "Relatório de Uso",
    description: "Métricas de uso do sistema por cliente e período",
    icon: FileBarChart,
    formats: ["Excel"],
  },
];

const AdminRelatorios = () => {
  return (
    <AppLayout isAdmin={true}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-heading flex items-center gap-2">
            <FileBarChart className="h-6 w-6 text-primary" />
            Relatórios
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Exporte relatórios detalhados do sistema</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reports.map((report) => (
            <Card key={report.title} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                    <report.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-heading">{report.title}</CardTitle>
                    <CardDescription className="text-xs mt-1">{report.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  {report.formats.map((format) => (
                    <Button key={format} variant="outline" size="sm">
                      <Download className="h-3.5 w-3.5 mr-1" />
                      {format}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminRelatorios;
