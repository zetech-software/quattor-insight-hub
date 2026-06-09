// ============================================================
// Diesel Receipt Calculation Engine
// Reproduces ALL formulas from the Qu4ttuor spreadsheet
// (Calculo_de_Recebimento_de_Diesel_-_Web.xlsx)
//
// CRITICAL: In the spreadsheet, the CNP coefficients (a1, a2, b1, b2)
// are resolved by VLOOKUP on the OBSERVED sample density (B15 / DA),
// NOT on the corrected DAC20. The DAC20 only appears as the divisor
// in FCNF (H43) and FCCT (K43): FC = 1 + P2·ΔT + (P1·ΔT)/DAC20.
// ============================================================

// CNP Density correction table (from "Planilha de Cálculo a 20ºC" sheet)
export const CNP_TABLE = [
  { min: 0, max: 0.4979, a1: -2462, a2: 3215, b1: -10.14, b2: 17.38 },
  { min: 0.498, max: 0.5179, a1: -2391, a2: 3074, b1: -8.41, b2: 13.98 },
  { min: 0.518, max: 0.5389, a1: -2294, a2: 2887, b1: -8.39, b2: 13.87 },
  { min: 0.539, max: 0.5589, a1: -2146, a2: 2615, b1: -5.46, b2: 8.55 },
  { min: 0.559, max: 0.5789, a1: -1920, a2: 2214, b1: -5.51, b2: 8.55 },
  { min: 0.579, max: 0.5999, a1: -2358, a2: 2962, b1: -12.25, b2: 20.15 },
  { min: 0.6, max: 0.6149, a1: -1361, a2: 1300, b1: -0.49, b2: 0.6 },
  { min: 0.615, max: 0.6349, a1: -1237, a2: 1100, b1: -0.49, b2: 0.6 },
  { min: 0.635, max: 0.6549, a1: -1077, a2: 850, b1: -0.49, b2: 0.6 },
  { min: 0.655, max: 0.6749, a1: -1011, a2: 750, b1: -0.49, b2: 0.6 },
  { min: 0.675, max: 0.6949, a1: -977, a2: 700, b1: -0.49, b2: 0.6 },
  { min: 0.695, max: 0.7459, a1: -1005, a2: 740, b1: -0.49, b2: 0.6 },
  { min: 0.746, max: 0.7659, a1: -1238, a2: 1050, b1: -0.49, b2: 0.6 },
  { min: 0.766, max: 0.7859, a1: -1084, a2: 850, b1: -0.49, b2: 0.6 },
  { min: 0.786, max: 0.8059, a1: -965, a2: 700, b1: -0.49, b2: 0.6 },
  { min: 0.806, max: 0.8259, a1: -843.5, a2: 550, b1: -0.49, b2: 0.6 },
  { min: 0.826, max: 0.8459, a1: -719, a2: 400, b1: -0.49, b2: 0.6 },
  { min: 0.846, max: 0.8709, a1: -617, a2: 280, b1: -0.49, b2: 0.6 },
  { min: 0.871, max: 0.8959, a1: -512, a2: 160, b1: -0.49, b2: 0.6 },
  { min: 0.896, max: 0.9959, a1: -394.8, a2: 30, b1: -0.49, b2: 0.6 },
  { min: 0.996, max: 999, a1: -542.6, a2: 177.8, b1: 2.31, b2: -2.2 },
];

interface CNPCoefficients {
  a1: number;
  a2: number;
  b1: number;
  b2: number;
}

function findCNPCoefficients(density: number): CNPCoefficients | null {
  const row = CNP_TABLE.find((r) => {
    if (r.min === 0) return density < 0.498;
    if (r.min === 0.996) return density > 0.9959;
    return density >= r.min && density <= r.max;
  });
  if (!row) return null;
  return {
    a1: row.a1 / 1_000_000,
    a2: row.a2 / 1_000_000,
    b1: row.b1 / 1_000_000,
    b2: row.b2 / 1_000_000,
  };
}

/**
 * Compute P1, P2, P3, P4 helpers (rows E31-K32 of "Planilha de Cálculo a 20ºC")
 * from CNP coefficients. These derive ONLY from a1/a2/b1/b2 and are independent
 * of temperature.
 */
function derivePCoefficients(c: CNPCoefficients) {
  const { a1, a2, b1, b2 } = c;
  const E28 = (a2 + 16 * b2) * (8 * a1 + 64 * b1);
  const E29 = 1 + 8 * a2 + 64 * b2;
  const E30 = a1 + 16 * b1 - E28 / E29; // densidade sem correção
  const P1 = (9 / 5) * 0.999042 * E30;
  const P2 = (9 / 5) * (a2 + 16 * b2) / E29;
  const I30 = b1 - (b2 * (8 * a1 + 64 * b1)) / E29;
  const P3 = (81 / 25) * 0.999042 * I30;
  const K30 = b2 / E29;
  const P4 = (81 / 25) * K30;
  return { P1, P2, P3, P4 };
}

/**
 * DAC 20°C — Density corrected to 20°C (cell E45 = E43 * E35).
 * CNP coefficients are looked up by the OBSERVED density (DA), matching the
 * spreadsheet's VLOOKUP on E26 = 'Mascará de Cálculos'!B15.
 */
export function calculateDensity20(
  observedDensity: number, // DA (g/cm³ / kg·L⁻¹)
  temperature: number,     // TA (°C)
): number | null {
  const coeffs = findCNPCoefficients(observedDensity);
  if (!coeffs) return null;
  const { P1, P2, P3, P4 } = derivePCoefficients(coeffs);

  const deltaT = temperature - 20;
  const deltaT2 = deltaT * deltaT;
  const HyC = 1 - 0.000023 * deltaT - 0.00000002 * deltaT2;

  const numerator = observedDensity - P1 * deltaT - P3 * deltaT2;
  const denominator = 1 + P2 * deltaT + P4 * deltaT2;
  const density20_4 = numerator / denominator;

  return density20_4 * HyC;
}

/**
 * Volumetric correction factor (cells H43 and K43 in the spreadsheet).
 *
 * FC = 1 + P2·ΔT + (P1·ΔT) / DAC20
 *
 * @param lookupDensity Observed sample density (DA) — used as the CNP VLOOKUP key.
 * @param density20     DAC20 — divisor only; corresponds to E45 in the sheet.
 * @param temperature   Temperature at which the factor is being evaluated.
 */
export function calculateCorrectionFactor(
  lookupDensity: number,
  density20: number,
  temperature: number,
): number | null {
  const coeffs = findCNPCoefficients(lookupDensity);
  if (!coeffs) return null;
  const { P1, P2 } = derivePCoefficients(coeffs);
  const deltaT = temperature - 20;
  return 1 + P2 * deltaT + (P1 * deltaT) / density20;
}

// ============================================================
// Estimativa de Temperatura de Carregamento (aba "NAO EDITAR")
//
// A planilha usa uma tabela própria de 3 faixas (NÃO a tabela CNP completa)
// e coeficientes B1/B2 FIXOS. A faixa é resolvida pela DENSIDADE DA CARGA
// (peso líquido / volume), não pela massa específica a 20 °C.
// ============================================================

const NAO_EDITAR_FAIXAS = [
  // [min, max, A1, A2] — colunas E/F/G/H linhas 3-5 da aba NAO EDITAR
  { min: 0.806, max: 0.8259, A1: -0.0008435, A2: 0.00055 },
  { min: 0.826, max: 0.8459, A1: -0.000719, A2: 0.0004 },
  { min: 0.846, max: 0.8709, A1: -0.000617, A2: 0.00028 },
];
const NAO_EDITAR_B1 = -4.9e-7; // E10 (fixo)
const NAO_EDITAR_B2 = 6e-7;    // E11 (fixo)

function naoEditarLookup(densityLoad: number): { A1: number; A2: number } | null {
  // Reproduz E8/E9: =IF(E33<F3, G3, IF(E33<E5, G4, G5))
  if (densityLoad < NAO_EDITAR_FAIXAS[0].max) {
    return { A1: NAO_EDITAR_FAIXAS[0].A1, A2: NAO_EDITAR_FAIXAS[0].A2 };
  }
  if (densityLoad < NAO_EDITAR_FAIXAS[2].min) {
    return { A1: NAO_EDITAR_FAIXAS[1].A1, A2: NAO_EDITAR_FAIXAS[1].A2 };
  }
  return { A1: NAO_EDITAR_FAIXAS[2].A1, A2: NAO_EDITAR_FAIXAS[2].A2 };
}

/**
 * Estima a temperatura de carregamento (célula L13 da aba "NAO EDITAR").
 *
 * 1. Constrói tabela densidade × temperatura (0 a 100 °C, passo 0,5 °C) usando
 *    coeficientes da própria aba NAO EDITAR (3 faixas) + B1/B2 fixos.
 * 2. Localiza o intervalo onde a densidade atinge a massa específica a 20 °C
 *    da NF (M13 = F10/1000).
 * 3. Interpola linearmente.
 */
export function estimateLoadingTemperature(
  volumeNF: number,      // litros (B8)
  pesoLiquido: number,   // kg (F9)
  massaEspecifica20: number, // kg/m³ (F10)
): number | null {
  if (volumeNF <= 0) return null;
  const densidadeCarga = pesoLiquido / volumeNF; // E33 / M7 (g/cm³ equivalente)
  const lookup = naoEditarLookup(densidadeCarga);
  if (!lookup) return null;

  const { A1, A2 } = lookup;
  const B1 = NAO_EDITAR_B1;
  const B2 = NAO_EDITAR_B2;

  // P1..P4 (rows E14-E28 da aba NAO EDITAR)
  const A1_1 = (8 * A1 + 64 * B1) * (A2 + 16 * B2);
  const A1_2 = 1 + 8 * A2 + 64 * B2;
  const A1_3 = A1 + 16 * B1 - A1_1 / A1_2;
  const P1 = (9 / 5) * 0.999042 * A1_3;

  const P2 = (9 / 5) * (A2 + 16 * B2) / (1 + 8 * A2 + 64 * B2);

  const B1_1 = B2 * (8 * A1 + 64 * B1);
  const B1_3 = B1 - B1_1 / (1 + 8 * A2 + 64 * B2);
  const P3 = (81 / 25) * 0.999042 * B1_3;

  const B2_3 = B2 / (1 + 8 * A2 + 64 * B2);
  const P4 = 3.24 * B2_3;

  // Tabela de densidades em função da temperatura (D34..D234 / E34..E234)
  const target = massaEspecifica20 / 1000; // M13
  const step = 0.5;
  const tMax = 100;
  const rows: Array<{ temp: number; density: number }> = [];
  for (let t = 0; t <= tMax + 1e-9; t += step) {
    const dT = t - 20;
    const dT2 = dT * dT;
    const HyC = 1 - 0.000023 * dT - 0.00000002 * dT2;
    const density =
      ((densidadeCarga - P1 * dT - P3 * dT2) / (1 + P2 * dT + P4 * dT2)) * HyC;
    rows.push({ temp: Math.round(t * 1e6) / 1e6, density });
  }

  // A coluna E da tabela representa "qual seria a densidade a 20 °C se a
  // densidade observada (densCarga) tivesse sido medida na temperatura T".
  // Para target = DNF20 (densidade real a 20 °C), procuramos o intervalo onde
  // a curva cruza o target — pode ser ascendente OU descendente dependendo
  // da relação entre densCarga e DNF20.
  let lowerIdx = -1;
  for (let i = 0; i < rows.length - 1; i++) {
    const a = rows[i].density;
    const b = rows[i + 1].density;
    if ((a <= target && target <= b) || (a >= target && target >= b)) {
      lowerIdx = i;
      break;
    }
  }

  if (lowerIdx < 0) {
    // Fallback: target fora da faixa coberta. Retorna a temperatura mais
    // próxima do target.
    let closest = 0;
    let bestDiff = Math.abs(rows[0].density - target);
    for (let i = 1; i < rows.length; i++) {
      const diff = Math.abs(rows[i].density - target);
      if (diff < bestDiff) {
        bestDiff = diff;
        closest = i;
      }
    }
    return rows[closest].temp;
  }


  const lower = rows[lowerIdx];
  const upper = rows[lowerIdx + 1];
  if (Math.abs(upper.density - lower.density) < 1e-15) return lower.temp;
  const fraction = (target - lower.density) / (upper.density - lower.density);
  return lower.temp + fraction * step;
}

// ============================================================
// Interface pública
// ============================================================

export interface DieselInputs {
  // Seção 1 — NF
  data: string;
  numeroNF: string;
  placaCT: string;
  volumeNF: number;          // litros (B8)
  pesoLiquido: number;       // kg (F9)
  massaEspecifica20NF: number; // kg/m³ (F10) → B10 = F10/1000

  // Seção 2 — Dados de campo
  temperaturaCT: number;     // °C (B26)
  temperaturaAmostra: number; // °C (B14)
  densidadeAmostra: number;  // kg/L (B15)
  situacaoSeta: number;      // litros (F14)
}

export interface DieselResults {
  dnf20: number;
  fcnf: number;
  temperaturaEstimada: number;

  dac20: number;
  qualidadeDiff: number;

  vctMin: number;
  vct: number;
  vctMax: number;

  dac20CT: number;
  fcct: number;
  v20: number;

  volumeNF: number;
  situacaoSeta: number;
  volumeRecebido: number;
  volumeAtestado: number;
  diferencaVolume: number;
  situacao: string;
}

export function calculateDiesel(inputs: DieselInputs): DieselResults | null {
  const {
    volumeNF,
    pesoLiquido,
    massaEspecifica20NF,
    temperaturaAmostra,
    densidadeAmostra,
    temperaturaCT,
  } = inputs;

  // B10 = F10/1000 (kg/m³ → kg/L)
  const dnf20 = massaEspecifica20NF / 1000;

  const temperaturaEstimada = estimateLoadingTemperature(
    volumeNF,
    pesoLiquido,
    massaEspecifica20NF,
  );
  if (temperaturaEstimada === null) return null;

  // DAC20 (E45) — densidade da amostra corrigida a 20 °C.
  // CNP lookup pelo OBSERVADO (DA), exatamente como a planilha (E26 = B15).
  const dac20 = calculateDensity20(densidadeAmostra, temperaturaAmostra);
  if (dac20 === null) return null;

  // FCNF (H43) e FCCT (K43): coeficientes CNP via DA observada; DAC20 entra só
  // como divisor de (P1·ΔT)/DAC20.
  const fcnf = calculateCorrectionFactor(densidadeAmostra, dac20, temperaturaEstimada);
  if (fcnf === null) return null;

  const fcct = calculateCorrectionFactor(densidadeAmostra, dac20, temperaturaCT);
  if (fcct === null) return null;

  const qualidadeDiff = dac20 - dnf20;

  // V20 = VNF * FCCT (B29) — corrige o volume da NF para 20 °C usando o fator
  // calculado na temperatura de recebimento (CT).
  const v20 = volumeNF * fcct;

  // VCT = V20 / FCCT (B21) — volume na temperatura de recebimento. Como V20 é
  // derivado da própria VNF via FCCT, VCT retorna exatamente VNF (tolerâncias
  // operacionais ±0,06% / +0,05% são aplicadas em VCT mín/máx).
  const vct = v20 / fcct;
  const vctMin = vct * (1 - 0.0006); // B20 = -0,06%
  const vctMax = vct * (1 + 0.0005); // B22 = +0,05%


  const situacaoSeta = inputs.situacaoSeta ?? 0;
  const volumeRecebido = volumeNF + situacaoSeta;          // F15 = F13 + F14
  const diferencaVolume = volumeRecebido - vct;            // F17 = F15 - F16
  const volumeAtestado = volumeNF + diferencaVolume;       // F18 = F13 + F17
  const situacao = diferencaVolume < 0 ? 'Falta de Produto' : 'Sobra de Produto';

  return {
    dnf20,
    fcnf,
    temperaturaEstimada,
    dac20,
    qualidadeDiff,
    vctMin,
    vct,
    vctMax,
    dac20CT: dac20,
    fcct,
    v20,
    volumeNF,
    situacaoSeta,
    volumeRecebido,
    volumeAtestado,
    diferencaVolume,
    situacao,
  };
}
