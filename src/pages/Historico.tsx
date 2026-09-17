import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { History, Search, Download, Eye, Loader2, Trash2, FileText, Sheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { generateSingleCalculationPDF } from "@/lib/pdfReports";
import { generateSingleCalculationXLSX } from "@/lib/excelReports";
import { computeCalculationStats } from "@/lib/calculationStats";
import { formatLocalDate } from "@/lib/calculationExport";
import type { Tables } from "@/integrations/supabase/types";

type Calculation = Tables<"calculations">;

const Historico = () => {
  const { session, role } = useAuth();
  const canDelete = role !== "support";
  const [calculations, setCalculations] = useState<Calculation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Calculation | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Calculation | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;
    loadCalculations();
  }, [session?.user?.id]);

  const loadCalculations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("calculations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Erro ao carregar histórico", description: error.message, variant: "destructive" });
    } else {
      setCalculations(data || []);
    }
    setLoading(false);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setDeleting(true);
    const { data, error } = await supabase.from("calculations").delete().eq("id", id).select("id");
    setDeleting(false);
    setPendingDelete(null);

    if (error || !data || data.length === 0) {
      toast({ title: "Não foi possível excluir o cálculo.", variant: "destructive" });
      return;
    }

    setCalculations((prev) => prev.filter((c) => c.id !== id));
    setSelected((prev) => (prev?.id === id ? null : prev));
    toast({ title: "Cálculo excluído" });
  };

  const handleExportCSV = () => {
    if (calculations.length === 0) return;
    const headers = ["Data", "NF", "Placa CT", "Volume NF", "VCT", "Diferença", "Situação"];
    const rows = filtered.map((c) => [
      c.data, c.numero_nf || "", c.placa_ct || "",
      c.volume_nf, c.vct ?? "", c.diferenca_volume ?? "", c.situacao || ""
    ]);
    const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `historico_calculos_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = calculations.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      c.data?.includes(s) ||
      c.numero_nf?.toLowerCase().includes(s) ||
      c.placa_ct?.toLowerCase().includes(s) ||
      c.municipio_base?.toLowerCase().includes(s)
    );
  });

  const fmt = (n: number | null, d = 2) => (n !== null && n !== undefined ? Number(n).toFixed(d) : "—");

  const stats = computeCalculationStats(calculations);

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-heading flex items-center gap-2">
              <History className="h-6 w-6 text-primary" />
              Histórico de Cálculos
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Consulte cálculos realizados anteriormente</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-1" />
            Exportar CSV
          </Button>
        </div>

        {!loading && calculations.length > 0 && (
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="Total de cálculos" value={String(stats.total)} />
            <SummaryCard label="Sobras" value={String(stats.sobras)} accent="text-green-600" />
            <SummaryCard label="Faltas" value={String(stats.faltas)} accent="text-destructive" />
            <SummaryCard label="Sem diferença" value={String(stats.semDiferenca)} />
            <SummaryCard
              label="Volume total conferido"
              value={`${stats.volumeTotal.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} L`}
            />
            <SummaryCard
              label="Período"
              value={`${formatLocalDate(stats.primeiraData)} — ${formatLocalDate(stats.ultimaData)}`}
              small
            />
            <SummaryCard label="Último cálculo" value={formatLocalDate(stats.ultimaData)} small />
          </div>
        )}

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por NF, placa ou data..."
                className="max-w-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">Nenhum cálculo encontrado.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Nº NF</TableHead>
                    <TableHead>Placa CT</TableHead>
                    <TableHead>Município</TableHead>
                    <TableHead className="text-right">Volume NF (L)</TableHead>
                    <TableHead className="text-right">VCT (L)</TableHead>
                    <TableHead className="text-right">Diferença (L)</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => {
                    const diff = row.diferenca_volume ?? 0;
                    const isNeg = diff < 0;
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="font-mono text-sm">{formatLocalDate(row.data)}</TableCell>
                        <TableCell className="font-mono">{row.numero_nf || "—"}</TableCell>
                        <TableCell>{row.placa_ct || "—"}</TableCell>
                        <TableCell>{row.municipio_base || "—"}</TableCell>
                        <TableCell className="text-right font-mono">{Number(row.volume_nf).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right font-mono">{row.vct !== null ? Number(row.vct).toLocaleString("pt-BR", { minimumFractionDigits: 1 }) : "—"}</TableCell>
                        <TableCell className={`text-right font-mono font-semibold ${isNeg ? "text-destructive" : "text-green-600"}`}>
                          {diff > 0 ? "+" : ""}{Number(diff).toFixed(1)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={isNeg ? "destructive" : "default"} className={!isNeg ? "bg-green-600" : ""}>
                            {row.situacao || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelected(row)} title="Ver detalhes">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Baixar PDF" onClick={() => generateSingleCalculationPDF(row)}>
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Baixar Excel" onClick={() => generateSingleCalculationXLSX(row)}>
                              <Sheet className="h-4 w-4" />
                            </Button>
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                title="Excluir cálculo"
                                onClick={() => setPendingDelete(row)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="font-heading">Detalhes do Cálculo</DialogTitle>
              {selected && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => generateSingleCalculationPDF(selected)}>
                    <FileText className="h-4 w-4 mr-1" />
                    PDF
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => generateSingleCalculationXLSX(selected)}>
                    <Sheet className="h-4 w-4 mr-1" />
                    Excel
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <DetailRow label="Data" value={formatLocalDate(selected.data)} />
                <DetailRow label="Nº NF" value={selected.numero_nf || "—"} />
                <DetailRow label="Placa CT" value={selected.placa_ct || "—"} />
                <DetailRow label="Município da Base" value={selected.municipio_base || "—"} />
                <DetailRow label="Volume NF" value={`${fmt(selected.volume_nf)} L`} />
                <DetailRow label="Peso Líquido" value={`${fmt(selected.peso_liquido)} kg`} />
                <DetailRow label="Massa Esp. 20°C" value={`${fmt(selected.massa_especifica_20_nf, 1)} kg/m³`} />
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-2">
                <DetailRow label="DNF 20°C" value={`${fmt(selected.dnf20, 4)} kg/l`} />
                <DetailRow label="FCNF" value={fmt(selected.fcnf, 6)} />
                <DetailRow label="Temp. Estimada" value={`${fmt(selected.temperatura_estimada, 1)} °C`} />
                <DetailRow label="DAC 20°C" value={`${fmt(selected.dac20, 4)} kg/l`} />
                <DetailRow label="Qualidade Diff" value={fmt(selected.qualidade_diff, 4)} />
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-2">
                <DetailRow label="VCT" value={`${fmt(selected.vct)} L`} />
                <DetailRow label="VCT Mín" value={`${fmt(selected.vct_min)} L`} />
                <DetailRow label="VCT Máx" value={`${fmt(selected.vct_max)} L`} />
                <DetailRow label="FCCT" value={fmt(selected.fcct, 6)} />
                <DetailRow label="V20" value={`${fmt(selected.v20)} L`} />
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-2">
                <DetailRow label="Situação da Seta" value={`${fmt(selected.situacao_seta)} L`} />
                <DetailRow label="Vol. Atestado" value={`${fmt(selected.volume_atestado)} L`} />
                <DetailRow label="Diferença" value={`${fmt(selected.diferenca_volume)} L`} />
                <DetailRow label="Situação" value={selected.situacao || "—"} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">Excluir este cálculo?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `Cálculo de ${formatLocalDate(pendingDelete.data)}${
                    pendingDelete.numero_nf ? ` — NF ${pendingDelete.numero_nf}` : ""
                  }. Esta ação não pode ser desfeita.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

function SummaryCard({
  label,
  value,
  accent,
  small,
}: {
  label: string;
  value: string;
  accent?: string;
  small?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`font-heading font-semibold ${small ? "text-sm" : "text-xl"} ${accent ?? ""}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground text-xs">{label}</span>
      <p className="font-mono font-medium">{value}</p>
    </div>
  );
}

export default Historico;
