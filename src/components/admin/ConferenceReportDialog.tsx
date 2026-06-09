import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Download, FileText, FileBarChart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  fetchConferenceCalculations,
  generateConferenceReport,
  generateSingleCalculationPDF,
  type ConferenceFilters,
} from "@/lib/pdfReports";
import { ScrollArea } from "@/components/ui/scroll-area";

type ClientOpt = { user_id: string; label: string };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

export function ConferenceReportDialog({ open, onOpenChange }: Props) {
  const [clients, setClients] = useState<ClientOpt[]>([]);
  const [filters, setFilters] = useState<ConferenceFilters>({
    startDate: "",
    endDate: todayISO(),
    userId: "",
    placaCT: "",
    situacao: "todas",
  });
  const [preview, setPreview] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: profiles } = await supabase.from("profiles").select("user_id, company_name, full_name");
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const adminIds = new Set((roles ?? []).filter((r) => r.role === "admin").map((r) => r.user_id));
      const list = (profiles ?? [])
        .filter((p) => !adminIds.has(p.user_id))
        .map((p) => ({ user_id: p.user_id, label: p.company_name || p.full_name || "—" }))
        .sort((a, b) => a.label.localeCompare(b.label));
      setClients(list);
    })();
  }, [open]);

  const selectedClient = useMemo(
    () => clients.find((c) => c.user_id === filters.userId)?.label,
    [clients, filters.userId],
  );

  const setF = (patch: Partial<ConferenceFilters>) => setFilters((f) => ({ ...f, ...patch }));

  const runSearch = async () => {
    setLoading(true);
    try {
      const rows = await fetchConferenceCalculations(filters);
      setPreview(rows);
    } catch (e: any) {
      toast({ title: "Erro ao buscar", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const exportConsolidated = async () => {
    setExporting(true);
    try {
      await generateConferenceReport(filters, selectedClient);
      toast({ title: "PDF gerado!", description: "O consolidado foi baixado." });
    } catch (e: any) {
      toast({ title: "Erro ao gerar PDF", description: e.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const exportIndividual = (calc: any) => {
    try {
      generateSingleCalculationPDF(calc);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileBarChart className="h-5 w-5 text-primary" />
            Relatório de Conferências
          </DialogTitle>
          <DialogDescription>
            Filtre as conferências e baixe um consolidado em PDF ou laudos individuais por NF.
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Data inicial</Label>
            <Input type="date" value={filters.startDate} onChange={(e) => setF({ startDate: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Data final</Label>
            <Input type="date" value={filters.endDate} onChange={(e) => setF({ endDate: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Cliente</Label>
            <Select value={filters.userId || "all"} onValueChange={(v) => setF({ userId: v === "all" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.user_id} value={c.user_id}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Placa CT</Label>
            <Input placeholder="ABC-1234" value={filters.placaCT} onChange={(e) => setF({ placaCT: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Situação</Label>
            <Select value={filters.situacao} onValueChange={(v) => setF({ situacao: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="sobra">Apenas sobras</SelectItem>
                <SelectItem value="falta">Apenas faltas</SelectItem>
                <SelectItem value="igual">Sem diferença</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={runSearch} disabled={loading} variant="outline" size="sm">
            {loading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
            Buscar conferências
          </Button>
          <Button onClick={exportConsolidated} disabled={exporting} size="sm">
            {exporting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1" />}
            Baixar consolidado
          </Button>
        </div>

        {/* Preview */}
        {preview && (
          <div className="flex-1 min-h-0 border rounded-md">
            <div className="px-3 py-2 border-b bg-muted/40 text-xs text-muted-foreground flex justify-between">
              <span>{preview.length} conferência(s) encontrada(s)</span>
              <span>
                Σ Diferença:{" "}
                <strong className={
                  preview.reduce((s, r) => s + Number(r.diferenca_volume ?? 0), 0) < 0 ? "text-destructive" : "text-green-600"
                }>
                  {Math.round(preview.reduce((s, r) => s + Number(r.diferenca_volume ?? 0), 0)).toLocaleString("pt-BR")} L
                </strong>
              </span>
            </div>
            <ScrollArea className="h-72">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card border-b">
                  <tr className="text-left">
                    <th className="p-2">Data</th>
                    <th className="p-2">NF</th>
                    <th className="p-2">Placa</th>
                    <th className="p-2 text-right">Vol. NF</th>
                    <th className="p-2 text-right">VCT</th>
                    <th className="p-2 text-right">Diferença</th>
                    <th className="p-2">Situação</th>
                    <th className="p-2 text-right">Laudo</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.length === 0 ? (
                    <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">Nenhum resultado para os filtros aplicados.</td></tr>
                  ) : preview.map((r) => {
                    const diff = Number(r.diferenca_volume ?? 0);
                    return (
                      <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="p-2">{new Date(r.data).toLocaleDateString("pt-BR")}</td>
                        <td className="p-2 font-mono">{r.numero_nf || "—"}</td>
                        <td className="p-2 font-mono">{r.placa_ct || "—"}</td>
                        <td className="p-2 text-right font-mono">{Math.round(Number(r.volume_nf ?? 0)).toLocaleString("pt-BR")}</td>
                        <td className="p-2 text-right font-mono">{r.vct !== null ? Math.round(Number(r.vct)).toLocaleString("pt-BR") : "—"}</td>
                        <td className={`p-2 text-right font-mono font-semibold ${diff < 0 ? "text-destructive" : diff > 0 ? "text-green-600" : ""}`}>
                          {Math.round(diff).toLocaleString("pt-BR")}
                        </td>
                        <td className="p-2">{r.situacao || "—"}</td>
                        <td className="p-2 text-right">
                          <Button size="sm" variant="ghost" onClick={() => exportIndividual(r)}>
                            <FileText className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollArea>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
