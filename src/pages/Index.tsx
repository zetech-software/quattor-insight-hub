import { useState, useMemo } from "react";
import { estimateLoadingTemperature } from "@/lib/dieselCalculations";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calculator, Save, RotateCcw, ArrowUp, ArrowDown, Minus, Loader2, Info } from "lucide-react";
import { calculateDiesel, avaliarQualidade, type DieselInputs, type DieselResults } from "@/lib/dieselCalculations";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const NUMERIC_FIELDS = ["volumeNF", "pesoLiquido", "massaEspecifica20NF", "temperaturaAmostra", "densidadeAmostra", "temperaturaCT", "situacaoSeta"] as const;

const VOLUME_NF_MAX = 60000;

function validateVolumeNF(value: string): string | null {
  if (!value || value.trim() === "") return null;
  const num = parseFloat(value);
  if (isNaN(num)) return "Valor inválido";
  if (num < 0) return "O volume não pode ser negativo";
  if (num > VOLUME_NF_MAX) return "Volume acima do limite permitido (máximo 60.000 L)";
  return null;
}

function validateDensity(value: string, unit: "kg/m³" | "kg/l"): string | null {
  if (!value || value.trim() === "") return null;
  const num = parseFloat(value);
  if (isNaN(num)) return "Valor inválido";
  if (unit === "kg/m³") {
    if (Math.floor(Math.abs(num)) > 999) return "Máximo 3 dígitos inteiros para kg/m³ (ex: 834.5)";
  } else {
    if (num >= 1) return "Em kg/l o valor deve ser menor que 1 (ex: 0.8345)";
    const parts = value.split(".");
    if (parts[1] && parts[1].length > 4) return "Máximo 4 casas decimais para kg/l (ex: 0.8345)";
  }
  return null;
}

const Index = () => {
  const { session } = useAuth();
  const [saving, setSaving] = useState(false);
  const [massaUnit, setMassaUnit] = useState<"kg/m³" | "kg/l">("kg/m³");
  const [daUnit, setDaUnit] = useState<"kg/l" | "kg/m³">("kg/l");

  const [rawInputs, setRawInputs] = useState<Record<string, string>>({
    data: new Date().toISOString().split("T")[0],
    numeroNF: "",
    placaCT: "",
    municipioBase: "",
    valorNF: "",
    volumeNF: "",
    pesoLiquido: "",
    massaEspecifica20NF: "",
    temperaturaAmostra: "",
    densidadeAmostra: "",
    temperaturaCT: "",
    situacaoSeta: "",
  });

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
    temperaturaCT: parseFloat(rawInputs.temperaturaCT || rawInputs.temperaturaAmostra) || 0,
    situacaoSeta: parseFloat(rawInputs.situacaoSeta) || 0,
  }), [rawInputs, massaUnit, daUnit]);

  const massaError = useMemo(() => validateDensity(rawInputs.massaEspecifica20NF, massaUnit), [rawInputs.massaEspecifica20NF, massaUnit]);
  const daError = useMemo(() => validateDensity(rawInputs.densidadeAmostra, daUnit), [rawInputs.densidadeAmostra, daUnit]);
  const volumeNFError = useMemo(() => validateVolumeNF(rawInputs.volumeNF), [rawInputs.volumeNF]);
  const hasValidationErrors = !!massaError || !!daError || !!volumeNFError;

  const updateField = (field: string, value: string) => {
    setRawInputs((prev) => ({ ...prev, [field]: value }));
  };

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
      !volumeNFError &&
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
      municipioBase: "",
      valorNF: "",
      volumeNF: "",
      pesoLiquido: "",
      massaEspecifica20NF: "",
      temperaturaAmostra: "",
      densidadeAmostra: "",
      temperaturaCT: "",
      situacaoSeta: "",
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
      municipio_base: rawInputs.municipioBase || null,
      valor_nf: parseFloat(rawInputs.valorNF) || null,
      volume_nf: inputs.volumeNF,
      peso_liquido: inputs.pesoLiquido,
      massa_especifica_20_nf: inputs.massaEspecifica20NF,
      temperatura_amostra: inputs.temperaturaAmostra,
      densidade_amostra: inputs.densidadeAmostra,
      temperatura_ct: inputs.temperaturaCT,
      situacao_seta: inputs.situacaoSeta,
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
  const isZero = results && results.diferencaVolume === 0;

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
            <Button size="sm" onClick={handleSave} disabled={saving || !results || hasValidationErrors}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Salvar
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Input Sections */}
          <div className="space-y-4">

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
                    <Label className="text-xs">Município da Base</Label>
                    <Input placeholder="Ex: Paulínia" value={rawInputs.municipioBase} onChange={(e) => updateField("municipioBase", e.target.value)} />
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
                      <Input type="number" step="any" value={rawInputs.massaEspecifica20NF} onChange={(e) => updateField("massaEspecifica20NF", e.target.value)} className={`flex-1 ${massaError ? "border-destructive focus-visible:ring-destructive" : ""}`} />
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
                    {massaError && <p className="text-[11px] text-destructive">{massaError}</p>}
                  </div>
                </div>
                {/* DNF 20°C results */}
                <Separator className="my-4" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ResultField label="DNF 20°C (NF)" value={`${fmt(inputs.massaEspecifica20NF > 0 ? inputs.massaEspecifica20NF : undefined, 1)} kg/m³`} />
                  <ResultField label="DNF 20°C (NF)" value={`${fmt(results?.dnf20, 4)} kg/l`} />
                </div>

                {/* Temperatura estimada */}
                <Separator className="my-4" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                  <ResultField
                    label="Temp. Estimada de Carregamento"
                    value={`${temperaturaEstimada?.toFixed(1) ?? "—"} °C`}
                    highlight
                  />
                </div>
              </CardContent>
            </Card>

            {/* Seção 2 - Dados de Campo */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-heading flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">2</span>
                  Dados de Campo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Temperatura da Amostra - TA (°C)</Label>
                    <Input type="number" step="any" value={rawInputs.temperaturaAmostra} onChange={(e) => updateField("temperaturaAmostra", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Massa Específica Amostra - DA</Label>
                    <div className="flex gap-1">
                      <Input type="number" step="any" value={rawInputs.densidadeAmostra} onChange={(e) => updateField("densidadeAmostra", e.target.value)} className={`flex-1 ${daError ? "border-destructive focus-visible:ring-destructive" : ""}`} />
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
                    {daError && <p className="text-[11px] text-destructive">{daError}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1">
                      <Label className="text-xs">Situação da Seta (L)</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button type="button" className="inline-flex items-center justify-center rounded-full hover:bg-muted p-0.5 transition-colors">
                            <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent side="top" className="max-w-xs text-xs leading-relaxed">
                          <p className="font-semibold mb-1">O que é a Situação da Seta?</p>
                          <p className="mb-1">
                            Diferença de volume lida na seta (régua) do caminhão-tanque no momento do recebimento.
                            Informe apenas a variação, nunca o volume total do tanque: este valor é somado ao
                            volume da NF para formar o Volume Atestado.
                          </p>
                          <ul className="list-disc pl-4 mb-2 space-y-0.5">
                            <li><strong>Negativo</strong> = volume abaixo da seta (falta)</li>
                            <li><strong>Positivo</strong> = volume acima da seta (sobra)</li>
                            <li><strong>Zero</strong> = exatamente na seta (volume conforme)</li>
                          </ul>
                          <p className="text-[10px] italic text-muted-foreground border-t border-border pt-1">
                            Estas informações são apenas para fins informativos e, nos termos da lei, não devem ser utilizadas como prova.
                          </p>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <Input type="number" step="1" value={rawInputs.situacaoSeta} onChange={(e) => updateField("situacaoSeta", e.target.value)} placeholder="0" />
                    {rawInputs.situacaoSeta !== "" && !isNaN(parseFloat(rawInputs.situacaoSeta)) && (() => {
                      const v = parseFloat(rawInputs.situacaoSeta);
                      const label = v === 0 ? "Na seta" : v < 0 ? "Abaixo da seta (falta)" : "Acima da seta (sobra)";
                      const cls = v === 0 ? "text-muted-foreground" : v < 0 ? "text-destructive" : "text-green-600";
                      return <p className={`text-[11px] font-medium ${cls}`}>{label}</p>;
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Seção 3 - Análise de Qualidade */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-heading flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">3</span>
                  Análise de Qualidade do Produto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Coluna kg/m³ */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">em kg/m³</p>
                    <ResultField label="DAC 20°C (Corrigida)" value={`${fmt(results?.dac20 != null ? results.dac20 * 1000 : undefined, 1)} kg/m³`} highlight />
                    <ResultField label="Diferença (DAC - DNF)" value={`${fmt(results?.qualidadeDiff != null ? results.qualidadeDiff * 1000 : undefined, 1)} kg/m³`} highlight />
                  </div>
                  {/* Coluna kg/l */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">em kg/l</p>
                    <ResultField label="DAC 20°C (Corrigida)" value={`${fmt(results?.dac20, 4)} kg/l`} highlight />
                    <ResultField label="Diferença (DAC - DNF)" value={fmt(results?.qualidadeDiff, 3)} highlight />
                  </div>
                </div>
                {results?.qualidadeDiff !== undefined && (() => {
                  const aprovado = avaliarQualidade(results.qualidadeDiff) === 'aprovado';
                  return (
                    <div className={`mt-4 p-4 rounded-xl text-center ${aprovado ? "bg-green-50 dark:bg-green-950/30" : "bg-destructive/10"}`}>
                      <Badge className={aprovado ? "bg-green-600" : ""} variant={aprovado ? "default" : "destructive"}>
                        {aprovado ? "APROVADO" : "REPROVADO"}
                      </Badge>
                      <p className={`text-sm font-medium mt-2 ${aprovado ? "text-green-700 dark:text-green-400" : "text-destructive"}`}>
                        {aprovado ? "Pode descarregar o caminhão" : "Devolver o caminhão"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Critério: |DAC − DNF| {aprovado ? "≤" : ">"} 0,003 kg/l (atual: {fmt(Math.abs(results.qualidadeDiff), 3)})
                      </p>
                    </div>
                  );
                })()}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ResultField label="DAC 20°C" value={`${fmt(results?.dac20CT)} kg/l`} />
                  <ResultField label="Volume 20°C (V20)" value={`${fmt(results?.v20, 0)} L`} highlight />
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Bottom: Summary */}
          <Card className="border-primary/20 bg-gradient-to-br from-card to-accent/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading">Resumo do Cálculo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SummaryRow label="Volume NF" value={`${fmt(results?.volumeNF ?? inputs.volumeNF, 0)} L`} />
              <SummaryRow label="Situação SETA" value={`${fmt(results?.situacaoSeta ?? inputs.situacaoSeta, 0)} L`} />
              <Separator />
              <SummaryRow label="Diferença" value={`${fmt(results?.diferencaVolume, 0)} L`} />
              <Separator />
              <SummaryRow label="Volume Atestado" value={`${fmt(results?.volumeAtestado, 0)} L`} bold />

              {results && (
                <div className={`mt-4 p-4 rounded-xl text-center ${isZero ? "bg-muted" : isNegative ? "bg-destructive/10" : "bg-green-50 dark:bg-green-950/30"}`}>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    {isZero ? (
                      <Minus className="h-5 w-5 text-muted-foreground" />
                    ) : isNegative ? (
                      <ArrowDown className="h-5 w-5 text-destructive" />
                    ) : (
                      <ArrowUp className="h-5 w-5 text-green-600" />
                    )}
                    <Badge variant={isZero ? "secondary" : isNegative ? "destructive" : "default"} className={isZero ? "" : !isNegative ? "bg-green-600" : ""}>
                      {isZero ? "Igual" : isNegative ? "Abaixo" : "Acima"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{results.situacao}</p>
                  <p className={`text-lg font-bold font-heading ${isZero ? "text-muted-foreground" : isNegative ? "text-destructive" : "text-green-600"}`}>
                    {fmt(Math.abs(results.diferencaVolume), 0)} L
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

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
