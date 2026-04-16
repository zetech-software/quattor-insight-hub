import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { History, Search, Download, Eye } from "lucide-react";

const mockHistory = [
  { id: 1, data: "2026-04-15", nf: "001234", placa: "ABC-1234", volumeNF: 42600, vct: 42580.5, diff: -19.5, situacao: "Falta" },
  { id: 2, data: "2026-04-14", nf: "001233", placa: "DEF-5678", volumeNF: 45000, vct: 45012.3, diff: 12.3, situacao: "Sobra" },
  { id: 3, data: "2026-04-13", nf: "001232", placa: "GHI-9012", volumeNF: 38000, vct: 37985.8, diff: -14.2, situacao: "Falta" },
  { id: 4, data: "2026-04-12", nf: "001231", placa: "JKL-3456", volumeNF: 50000, vct: 50025.1, diff: 25.1, situacao: "Sobra" },
];

const Historico = () => {
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
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Exportar
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por NF, placa ou data..." className="max-w-sm" />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Nº NF</TableHead>
                  <TableHead>Placa CT</TableHead>
                  <TableHead className="text-right">Volume NF (L)</TableHead>
                  <TableHead className="text-right">VCT (L)</TableHead>
                  <TableHead className="text-right">Diferença (L)</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockHistory.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-sm">{row.data}</TableCell>
                    <TableCell className="font-mono">{row.nf}</TableCell>
                    <TableCell>{row.placa}</TableCell>
                    <TableCell className="text-right font-mono">{row.volumeNF.toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-right font-mono">{row.vct.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}</TableCell>
                    <TableCell className={`text-right font-mono font-semibold ${row.diff < 0 ? "text-destructive" : "text-green-600"}`}>
                      {row.diff > 0 ? "+" : ""}{row.diff.toFixed(1)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.situacao === "Falta" ? "destructive" : "default"} className={row.situacao !== "Falta" ? "bg-green-600" : ""}>
                        {row.situacao}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Historico;
