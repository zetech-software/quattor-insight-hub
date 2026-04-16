import { useState, useMemo } from "react";
import { estimateLoadingTemperature } from "@/lib/dieselCalculations";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Calculator, Save, RotateCcw, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { calculateDiesel, type DieselInputs, type DieselResults } from "@/lib/dieselCalculations";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const NUMERIC_FIELDS = ["volumeNF", "pesoLiquido", "massaEspecifica20NF", "temperaturaAmostra", "densidadeAmostra", "temperaturaCT"] as const;

const Index = () => {
  const { session } = useAuth();
  const [saving, setSaving] = useState(false);
  const [massaUnit, setMassaUnit] = useState<"kg/m³" | "kg/l">("kg/m³");
  const [daUnit, setDaUnit] = useState<"kg/l" | "kg/m³">("kg/l");

  // String state for raw input values (preserves decimals while typing)
  const [rawInputs, setRawInputs] = useState<Record<string, string>>({
    data: new Date().toISOString().split("T")[0],
    numeroNF: "",
    placaCT: "",
    valorNF: "",
    volumeNF: "",
    pesoLiquido: "",
    massaEspecifica20NF: "",
    temperaturaAmostra: "",
    densidadeAmostra: "",
    temperaturaCT: "",
  });

  // Derived numeric inputs for calculations
  const inputs: DieselInputs = useMemo(() => ({
    data: rawInputs.data,
    numeroNF: rawInputs.numeroNF,
    placaCT: rawInputs.placaCT,
    volumeNF: parseFloat(rawInputs.volumeNF) || 0,
    pesoLiquido: parseFloat(rawInputs.pesoLiquido) || 0,
    massaEspecifica20NF: (() => {
      const v = parseFloat(rawInputs.massaEspecifica20NF) || 0;
      return massaUnit === "kg/l" ? v * 1000 : v;
    })(),
    temperaturaAmostra: parseFloat(rawInputs.temperaturaAmostra) || 0,
    densidadeAmostra: (() => {
      const v = parseFloat(rawInputs.densidadeAmostra) || 0;
      return daUnit === "kg/m³" ? v / 1000 : v;
    })(),
    temperaturaCT: parseFloat(rawInputs.temperaturaCT) || 0,
  }), [rawInputs, massaUnit, daUnit]);

  const updateField = (field: string, value: string) => {
    setRawInputs((prev) => ({ ...prev, [field]: value }));
  };

  // Real-time temperature estimation (only needs 3 inputs)
  const temperaturaEstimada = useMemo(() => {
    if (inputs.volumeNF > 0 && inputs.pesoLiquido > 0 && inputs.massaEspecifica20NF > 0) {
      try {
        return estimateLoadingTemperature(inputs.volumeNF, inputs.pesoLiquido, inputs.massaEspecifica20NF);
      } catch {
        return null;
      }
    }
    return null;
  }, [inputs.volumeNF, inputs.pesoLiquido, inputs.massaEspecifica20NF]);

  const results: DieselResults | null = useMemo(() => {
    if (
      inputs.volumeNF > 0 &&
      inputs.pesoLiquido > 0 &&
      inputs.massaEspecifica20NF > 0 &&
      inputs.densidadeAmostra > 0
    ) {
      try {
        return calculateDiesel(inputs);
      } catch {
        return null;
      }
    }
    return null;
  }, [inputs]);

  const handleReset = () => {
    setRawInputs({
      data: new Date().toISOString().split("T")[0],
      numeroNF: "",
      placaCT: "",
      valorNF: "",
      volumeNF: "",
      pesoLiquido: "",
      massaEspecifica20NF: "",
      temperaturaAmostra: "",
      densidadeAmostra: "",
      temperaturaCT: "",
    });
  };

  const handleSave = async () => {
    if (!results || !session?.user?.id) {
      toast({ title: "Erro", description: "Preencha todos os campos para salvar.", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("calculations").insert({
      user_id: session.user.id,
      data: inputs.data,
      numero_nf: inputs.numeroNF || null,
      placa_ct: inputs.placaCT || null,
      valor_nf: parseFloat(rawInputs.valorNF) || null,
      volume_nf: inputs.volumeNF,
      peso_liquido: inputs.pesoLiquido,
      massa_especifica_20_nf: inputs.massaEspecifica20NF,
      temperatura_amostra: inputs.temperaturaAmostra,
      densidade_amostra: inputs.densidadeAmostra,
      temperatura_ct: inputs.temperaturaCT,
      dnf20: results.dnf20,
      fcnf: results.fcnf,
      temperatura_estimada: results.temperaturaEstimada,
      dac20: results.dac20,
      qualidade_diff: results.qualidadeDiff,
      vct_min: results.vctMin,
      vct: results.vct,
      vct_max: results.vctMax,
      fcct: results.fcct,
      v20: results.v20,
      volume_recebido: results.volumeRecebido,
      volume_atestado: results.volumeAtestado,
      diferenca_volume: results.diferencaVolume,
      situacao: results.situacao,
    });
    setSaving(false);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Cálculo salvo!", description: "O cálculo foi adicionado ao histórico." });
      handleReset();
    }
  };

  const fmt = (n: number | undefined, decimals = 4) =>
    n !== undefined ? n.toFixed(decimals) : "—";

  const isNegative = results && results.diferencaVolume < 0;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-heading flex items-center gap-2">
              <Calculator className="h-6 w-6 text-primary" />
              Cálculo de Recebimento de Diesel
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Planilha de propriedade da Qu4ttuor Consultoria
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Limpar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !results}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Salvar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Input Sections */}
          <div className="lg:col-span-2 space-y-4">
            {/* Seção 1 - Informações da NF */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-heading flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">1</span>
                  Informações da Nota Fiscal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Data</Label>
                    <Input type="date" value={rawInputs.data} onChange={(e) => updateField("data", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nº Nota Fiscal</Label>
                    <Input placeholder="000000" value={rawInputs.numeroNF} onChange={(e) => updateField("numeroNF", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Placa do CT</Label>
                    <Input placeholder="ABC-1234" value={rawInputs.placaCT} onChange={(e) => updateField("placaCT", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Valor da NF (R$)</Label>
                    <Input type="number" step="any" value={rawInputs.valorNF} onChange={(e) => updateField("valorNF", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Volume NF (Litros)</Label>
                    <Input type="number" step="any" value={rawInputs.volumeNF} onChange={(e) => updateField("volumeNF", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Peso Líquido (kg)</Label>
                    <Input type="number" step="any" value={rawInputs.pesoLiquido} onChange={(e) => updateField("pesoLiquido", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Massa Específica a 20°C</Label>
                    <div className="flex gap-1">
                      <Input type="number" step="any" value={rawInputs.massaEspecifica20NF} onChange={(e) => updateField("massaEspecifica20NF", e.target.value)} className="flex-1" />
                      <div className="flex rounded-md border border-input overflow-hidden shrink-0">
                        <button
                          type="button"
                          className={`px-2 py-1 text-[10px] font-medium transition-colors ${massaUnit === "kg/m³" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-accent"}`}
                          onClick={() => setMassaUnit("kg/m³")}
                        >
                          kg/m³
                        </button>
                        <button
                          type="button"
                          className={`px-2 py-1 text-[10px] font-medium transition-colors ${massaUnit === "kg/l" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-accent"}`}
                          onClick={() => setMassaUnit("kg/l")}
                        >
                          kg/l
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Temperatura estimada em tempo real */}
                <Separator className="my-4" />
                <div className="flex items-center gap-4">
                  <ResultField
                    label="Temp. Estimada de Carregamento"
                    value={`${temperaturaEstimada?.toFixed(1) ?? "—"} °C`}
                    highlight
                  />
                  {temperaturaEstimada !== null && (
                    <p className="text-xs text-muted-foreground">Calculada em tempo real a partir dos dados da NF</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Seção 2 - Análise de Qualidade */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-heading flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">2</span>
                  Análise de Qualidade do Produto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Temperatura da Amostra - TA (°C)</Label>
                    <Input type="number" step="any" value={rawInputs.temperaturaAmostra} onChange={(e) => updateField("temperaturaAmostra", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Massa Específica Amostra - DA</Label>
                    <div className="flex gap-1">
                      <Input type="number" step="any" value={rawInputs.densidadeAmostra} onChange={(e) => updateField("densidadeAmostra", e.target.value)} className="flex-1" />
                      <div className="flex rounded-md border border-input overflow-hidden shrink-0">
                        <button
                          type="button"
                          className={`px-2 py-1 text-[10px] font-medium transition-colors ${daUnit === "kg/l" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-accent"}`}
                          onClick={() => setDaUnit("kg/l")}
                        >
                          kg/l
                        </button>
                        <button
                          type="button"
                          className={`px-2 py-1 text-[10px] font-medium transition-colors ${daUnit === "kg/m³" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-accent"}`}
                          onClick={() => setDaUnit("kg/m³")}
                        >
                          kg/m³
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <Separator className="my-3" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Coluna kg/m³ */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">em kg/m³</p>
                    <ResultField label="DNF 20°C (NF)" value={`${fmt(inputs.massaEspecifica20NF > 0 ? inputs.massaEspecifica20NF : undefined, 1)} kg/m³`} />
                    <ResultField label="DAC 20°C (Corrigida)" value={`${fmt(results?.dac20 ? results.dac20 * 1000 : undefined, 1)} kg/m³`} highlight />
                    <ResultField label="Diferença (DAC - DNF)" value={`${fmt(results?.qualidadeDiff ? results.qualidadeDiff * 1000 : undefined, 1)} kg/m³`} highlight />
                  </div>
                  {/* Coluna kg/l */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">em kg/l</p>
                    <ResultField label="DNF 20°C (NF)" value={`${fmt(results?.dnf20, 4)} kg/l`} />
                    <ResultField label="DAC 20°C (Corrigida)" value={`${fmt(results?.dac20, 4)} kg/l`} highlight />
                    <ResultField label="Diferença (DAC - DNF)" value={fmt(results?.qualidadeDiff, 4)} highlight />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Seção 3 - VCT */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-heading flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">3</span>
                  Cálculo VCT — Volume na Temperatura de Recebimento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <ResultField label="VCT Mínimo (-0,06%)" value={`${fmt(results?.vctMin, 2)} L`} />
                  <ResultField label="VCT" value={`${fmt(results?.vct, 2)} L`} highlight />
                  <ResultField label="VCT Máximo (+0,05%)" value={`${fmt(results?.vctMax, 2)} L`} />
                </div>
              </CardContent>
            </Card>

            {/* Seção 4 - Fator de Correção do CT */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-heading flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">4</span>
                  Fator de Correção do CT
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5 mb-4 max-w-xs">
                  <Label className="text-xs">Temperatura do CT - TCT (°C)</Label>
                  <Input type="number" step="any" value={rawInputs.temperaturaCT} onChange={(e) => updateField("temperaturaCT", e.target.value)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <ResultField label="DAC 20°C" value={`${fmt(results?.dac20CT)} kg/l`} />
                  <ResultField label="FCCT (Fator Correção)" value={fmt(results?.fcct, 6)} highlight />
                  <ResultField label="Volume 20°C (V20)" value={`${fmt(results?.v20, 2)} L`} highlight />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Summary Panel */}
          <div className="space-y-4">
            <Card className="border-primary/20 bg-gradient-to-br from-card to-accent/30 sticky top-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-heading">Resumo do Cálculo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <SummaryRow label="Volume NF" value={`${fmt(results?.volumeNF ?? inputs.volumeNF, 2)} L`} />
                <SummaryRow label="Situação SETA" value={`${fmt(results?.situacaoSeta ?? 0, 2)} L`} />
                <SummaryRow label="Volume Recebido" value={`${fmt(results?.volumeRecebido, 2)} L`} />
                <Separator />
                <SummaryRow label="VCT" value={`${fmt(results?.vct, 2)} L`} />
                <SummaryRow label="Diferença" value={`${fmt(results?.diferencaVolume, 2)} L`} />
                <Separator />
                <SummaryRow label="Volume Atestado" value={`${fmt(results?.volumeAtestado, 2)} L`} bold />

                {results && (
                  <div className={`mt-4 p-4 rounded-xl text-center ${isNegative ? "bg-destructive/10" : "bg-green-50 dark:bg-green-950/30"}`}>
                    <div className="flex items-center justify-center gap-2 mb-1">
                      {isNegative ? (
                        <ArrowDown className="h-5 w-5 text-destructive" />
                      ) : (
                        <ArrowUp className="h-5 w-5 text-green-600" />
                      )}
                      <Badge variant={isNegative ? "destructive" : "default"} className={!isNegative ? "bg-green-600" : ""}>
                        {isNegative ? "Abaixo" : "Acima"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{results.situacao}</p>
                    <p className={`text-lg font-bold font-heading ${isNegative ? "text-destructive" : "text-green-600"}`}>
                      {fmt(Math.abs(results.diferencaVolume), 2)} L
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick NF Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-heading text-muted-foreground">Dados da NF</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data</span>
                  <span className="font-medium">{inputs.data}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">NF</span>
                  <span className="font-medium">{inputs.numeroNF || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Placa CT</span>
                  <span className="font-medium">{inputs.placaCT || "—"}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

function ResultField({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`p-3 rounded-lg ${highlight ? "bg-accent/50 border border-primary/10" : "bg-muted/50"}`}>
      <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
      <p className={`text-sm font-semibold font-mono ${highlight ? "text-accent-foreground" : ""}`}>{value}</p>
    </div>
  );
}

function SummaryRow({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className={`text-sm ${bold ? "font-semibold" : "text-muted-foreground"}`}>{label}</span>
      <span className={`text-sm font-mono ${bold ? "font-bold text-primary" : "font-medium"}`}>{value}</span>
    </div>
  );
}

export default Index;
