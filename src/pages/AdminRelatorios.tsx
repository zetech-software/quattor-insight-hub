import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileBarChart, Download, FileSpreadsheet, FileText, Loader2, ClipboardCheck } from "lucide-react";
import { generateClientReport, generateCalculationsReport, generateSubscriptionsReport } from "@/lib/pdfReports";
import { toast } from "@/hooks/use-toast";
import { ConferenceReportDialog } from "@/components/admin/ConferenceReportDialog";

type ReportKey = "clientes" | "calculos" | "assinaturas";

const reports: { key: ReportKey; title: string; description: string; icon: typeof FileBarChart }[] = [
  { key: "clientes", title: "Relatório de Clientes", description: "Lista completa de clientes com status, plano e histórico de uso", icon: FileSpreadsheet },
  { key: "calculos", title: "Relatório de Cálculos", description: "Todos os cálculos realizados por período, filtrados por cliente", icon: FileBarChart },
  { key: "assinaturas", title: "Relatório de Assinaturas", description: "Status de assinaturas, pagamentos e renovações", icon: FileText },
];


const generators: Record<ReportKey, () => Promise<void>> = {
  clientes: generateClientReport,
  calculos: generateCalculationsReport,
  assinaturas: generateSubscriptionsReport,
};

const AdminRelatorios = () => {
  const [loading, setLoading] = useState<ReportKey | null>(null);
  const [confOpen, setConfOpen] = useState(false);


  const handleExport = async (key: ReportKey) => {
    setLoading(key);
    try {
      await generators[key]();
      toast({ title: "PDF gerado!", description: "O download foi iniciado automaticamente." });
    } catch (err: any) {
      toast({ title: "Erro ao gerar PDF", description: err.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-heading flex items-center gap-2">
            <FileBarChart className="h-6 w-6 text-primary" />
            Relatórios
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Exporte relatórios detalhados do sistema em PDF</p>
        </div>

        {/* Featured: Conferences */}
        <Card className="border-primary/40 bg-gradient-to-br from-card to-accent/30 hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-heading">Relatório de Conferências</CardTitle>
                <CardDescription className="text-xs mt-1">
                  Filtre por período, cliente, placa do CT ou situação. Baixe um consolidado em PDF ou laudos individuais por NF.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button size="sm" onClick={() => setConfOpen(true)}>
              <ClipboardCheck className="h-3.5 w-3.5 mr-1" />
              Abrir gerador de conferências
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {reports.map((report) => (
            <Card key={report.key} className="hover:shadow-md transition-shadow">
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport(report.key)}
                  disabled={loading !== null}
                >
                  {loading === report.key ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5 mr-1" />
                  )}
                  Exportar PDF
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <ConferenceReportDialog open={confOpen} onOpenChange={setConfOpen} />
    </AppLayout>
  );
};

export default AdminRelatorios;

