import { parseLocalDate } from "@/lib/calculationExport";

export interface CalculationStatsInput {
  data: string;
  volume_nf: number;
  volume_atestado: number | null;
  diferenca_volume: number | null;
}

export interface CalculationStats {
  total: number;
  sobras: number;
  faltas: number;
  semDiferenca: number;
  volumeTotal: number;
  primeiraData: string | null;
  ultimaData: string | null;
}

const TOLERANCE = 0.05; // litros — abaixo disso consideramos "sem diferença"

export function computeCalculationStats(rows: CalculationStatsInput[]): CalculationStats {
  const stats: CalculationStats = {
    total: rows.length,
    sobras: 0,
    faltas: 0,
    semDiferenca: 0,
    volumeTotal: 0,
    primeiraData: null,
    ultimaData: null,
  };

  let min: number | null = null;
  let max: number | null = null;

  for (const row of rows) {
    const diff = Number(row.diferenca_volume ?? 0);
    if (diff > TOLERANCE) stats.sobras += 1;
    else if (diff < -TOLERANCE) stats.faltas += 1;
    else stats.semDiferenca += 1;

    const volume = row.volume_atestado ?? row.volume_nf;
    stats.volumeTotal += Number(volume ?? 0);

    if (row.data) {
      const t = parseLocalDate(row.data).getTime();
      if (Number.isFinite(t)) {
        if (min === null || t < min) {
          min = t;
          stats.primeiraData = row.data;
        }
        if (max === null || t > max) {
          max = t;
          stats.ultimaData = row.data;
        }
      }
    }
  }

  return stats;
}

export function formatLocalDate(value: string | null): string {
  if (!value) return "—";
  return parseLocalDate(value).toLocaleDateString("pt-BR");
}
