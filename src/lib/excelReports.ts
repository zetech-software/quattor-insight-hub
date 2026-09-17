import * as XLSX from "xlsx";
import { LEGAL_DISCLAIMER, LEGAL_DISCLAIMER_TITLE } from "@/lib/legalDisclaimer";
import { formatDateTime, formatLocalDate, type ExportableCalculation } from "@/lib/calculationExport";

type Row = [string, string | number | null, string];

function num(v: number | null | undefined, decimals: number): number | null {
  if (v === null || v === undefined) return null;
  return Number(Number(v).toFixed(decimals));
}

/** Exporta um único cálculo para Excel, sem formatação visual desnecessária. */
export function generateSingleCalculationXLSX(calc: ExportableCalculation) {
  const rows: Row[] = [
    ["Campo", "Valor", "Unidade"],

    ["— Dados da conferência —", null, ""],
    ["Data da conferência", formatLocalDate(calc.data), ""],
    ["Registrado em", formatDateTime(calc.created_at), ""],
    ["Exportado em", new Date().toLocaleString("pt-BR"), ""],

    ["— Nota fiscal e veículo —", null, ""],
    ["Número da NF", calc.numero_nf ?? "—", ""],
    ["Placa do veículo (CT)", calc.placa_ct ?? "—", ""],
    ["Município da base", calc.municipio_base ?? "—", ""],
    ["Valor da NF", num(calc.valor_nf, 2), "R$"],
    ["Volume NF", num(calc.volume_nf, 2), "L"],
    ["Peso líquido", num(calc.peso_liquido, 2), "kg"],
    ["Massa específica a 20 °C (NF)", num(calc.massa_especifica_20_nf, 1), "kg/m³"],
    ["DNF 20 °C", num(calc.dnf20, 4), "kg/l"],
    ["FCNF", num(calc.fcnf, 6), ""],
    ["Temperatura estimada de carregamento", num(calc.temperatura_estimada, 1), "°C"],

    ["— Dados de qualidade —", null, ""],
    ["Temperatura da amostra", num(calc.temperatura_amostra, 1), "°C"],
    ["Massa específica da amostra", num(calc.densidade_amostra, 4), "kg/l"],
    ["Temperatura do CT", num(calc.temperatura_ct, 1), "°C"],
    ["DAC 20 °C (corrigida)", num(calc.dac20, 4), "kg/l"],
    ["Diferença de qualidade (DAC - DNF)", num(calc.qualidade_diff, 4), "kg/l"],
    ["FCCT", num(calc.fcct, 6), ""],

    ["— Volumes —", null, ""],
    ["VCT mínimo (-0,06%)", num(calc.vct_min, 2), "L"],
    ["VCT", num(calc.vct, 2), "L"],
    ["VCT máximo (+0,06%)", num(calc.vct_max, 2), "L"],
    ["Volume a 20 °C (V20)", num(calc.v20, 2), "L"],
    ["Situação da seta", num(calc.situacao_seta, 2), "L"],
    ["Volume atestado", num(calc.volume_atestado, 2), "L"],

    ["— Resultado final —", null, ""],
    ["Diferença de volume", num(calc.diferenca_volume, 2), "L"],
    ["Situação", calc.situacao ?? "—", ""],

    ["— Aviso legal —", null, ""],
    [LEGAL_DISCLAIMER_TITLE, LEGAL_DISCLAIMER, ""],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 40 }, { wch: 46 }, { wch: 10 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Conferência");

  const nf = calc.numero_nf || "sem-nf";
  XLSX.writeFile(wb, `relatorio-calculo-${nf}-${calc.data}.xlsx`);
}
