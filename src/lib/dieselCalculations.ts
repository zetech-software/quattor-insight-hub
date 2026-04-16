// ============================================================
// Diesel Receipt Calculation Engine
// Reproduces ALL formulas from the Qu4ttuor spreadsheet
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

// Temperature estimation now uses the full CNP_TABLE via findCNPCoefficients,
// so it works for ALL diesel density ranges, not just a narrow subset.

function findCNPCoefficients(density: number) {
  const a1_raw = CNP_TABLE.find(r => {
    if (r.min === 0) return density < 0.498;
    if (r.min === 0.996) return density > 0.9959;
    return density >= r.min && density <= r.max;
  });
  if (!a1_raw) return null;
  return {
    a1: a1_raw.a1 / 1_000_000,
    a2: a1_raw.a2 / 1_000_000,
    b1: a1_raw.b1 / 1_000_000,
    b2: a1_raw.b2 / 1_000_000,
  };
}

/**
 * Calculate density corrected to 20°C
 * Reproduces "Planilha de Cálculo a 20ºC" sheet formulas
 */
export function calculateDensity20(
  observedDensity: number, // g/cm³ (DA)
  temperature: number // °C (TA)
): number | null {
  const coeffs = findCNPCoefficients(observedDensity);
  if (!coeffs) return null;
  const { a1, a2, b1, b2 } = coeffs;

  // Intermediate calculations (E28-E30 in spreadsheet)
  const factor1 = (a2 + 16 * b2) * (8 * a1 + 64 * b1);
  const factor2 = 1 + 8 * a2 + 64 * b2;
  const densityNoCorr = a1 + 16 * b1 - factor1 / factor2;

  // P1 = (9/5) * 0.999042 * densityNoCorr
  const P1 = (9 / 5) * 0.999042 * densityNoCorr;

  // P2 = (9/5) * (a2 + 16*b2) / (1 + 8*a2 + 64*b2)
  const P2 = (9 / 5) * (a2 + 16 * b2) / factor2;

  // b1_calc = b1 - (b2*(8*a1+64*b1)) / (1+8*a2+64*b2)
  const b1Calc = b1 - (b2 * (8 * a1 + 64 * b1)) / factor2;
  // P3 = (81/25) * 0.999042 * b1Calc
  const P3 = (81 / 25) * 0.999042 * b1Calc;

  // b2_calc = b2 / (1 + 8*a2 + 64*b2)
  const b2Calc = b2 / factor2;
  // P4 = (81/25) * b2Calc
  const P4 = (81 / 25) * b2Calc;

  // Delta T and hydrometer correction
  const deltaT = temperature - 20;
  const deltaT2 = deltaT * deltaT;
  const HyC = 1 - 0.000023 * deltaT - 0.00000002 * deltaT2;

  // Density numerator and denominator
  const numerator = observedDensity - P1 * deltaT - P3 * deltaT2;
  const denominator = 1 + P2 * deltaT + P4 * deltaT2;
  const density20_4 = numerator / denominator;

  // Apply hydrometer correction
  const density20Corrected = density20_4 * HyC;

  return density20Corrected;
}

/**
 * Calculate volumetric correction factor (FC) at a given temperature
 * Uses the density corrected to 20°C and a temperature
 * Reproduces H43 and K43 formulas in spreadsheet
 */
export function calculateCorrectionFactor(
  density20: number, // corrected density at 20°C (g/cm³)
  temperature: number // °C
): number | null {
  const coeffs = findCNPCoefficients(density20);
  if (!coeffs) return null;
  const { a1, a2, b1, b2 } = coeffs;

  const factor1 = (a2 + 16 * b2) * (8 * a1 + 64 * b1);
  const factor2 = 1 + 8 * a2 + 64 * b2;
  const densityNoCorr = a1 + 16 * b1 - factor1 / factor2;
  const P1 = (9 / 5) * 0.999042 * densityNoCorr;
  const P2 = (9 / 5) * (a2 + 16 * b2) / factor2;

  const deltaT = temperature - 20;

  // FC = 1 + P2 * deltaT + (P1 * deltaT) / density20
  // This is the formula from H43/K43: =1+(H39)+((H37)/E45)
  // H39 = P2 * deltaT, H37 = P1 * deltaT
  const FC = 1 + P2 * deltaT + (P1 * deltaT) / density20;

  return FC;
}

/**
 * Estimate loading temperature from NF data
 * Reproduces "NAO EDITAR" sheet logic
 */
export function estimateLoadingTemperature(
  volumeNF: number, // liters
  pesoLiquido: number, // kg
  massaEspecifica20: number // kg/m³
): number | null {
  // Densidade da carga = peso / volume (em kg/L = g/cm³)
  const densidadeCarga = pesoLiquido / volumeNF;

  // Use CNP table coefficients for the NF density
  const densGCm3 = massaEspecifica20 / 1000;
  const coeffs = findCNPCoefficients(densGCm3);
  if (!coeffs) return null;

  const { a1: A1, a2: A2, b1: B1, b2: B2 } = coeffs;

  // Calculate P values for temperature table (same as NAO EDITAR formulas)
  const A1_1 = (8 * A1 + 64 * B1) * (A2 + 16 * B2);
  const A1_2 = 1 + 8 * A2 + 64 * B2;
  const A1_3 = A1 + 16 * B1 - A1_1 / A1_2;
  const P1 = (9 / 5) * 0.999042 * A1_3;

  const A2_1 = A2 + 16 * B2;
  const A2_2 = 1 + 8 * A2 + 64 * B2;
  const P2 = (9 / 5) * A2_1 / A2_2;

  const B1_1 = B2 * (8 * A1 + 64 * B1);
  const B1_2 = 1 + 8 * A2 + 64 * B2;
  const B1_3 = B1 - B1_1 / B1_2;
  const P3 = (81 / 25) * 0.999042 * B1_3;

  const B2_3 = B2 / (1 + 8 * A2 + 64 * B2);
  const P4 = 3.24 * B2_3;

  // Build temperature lookup table from 0°C to 50°C in 0.5 steps
  const densidadeCargaGCm3 = densidadeCarga; // already in g/cm³ equivalent
  const tempTable: { temp: number; density: number }[] = [];

  for (let t = 0; t <= 50; t += 0.5) {
    const deltaT = t - 20;
    const deltaT2 = deltaT * deltaT;
    const HyC = 1 - 0.000023 * deltaT - 0.00000002 * deltaT2;

    const p1dt = P1 * deltaT;
    const p2dt = P2 * deltaT;
    const p3dt2 = P3 * deltaT2;
    const p4dt2 = P4 * deltaT2;

    const density = ((densidadeCargaGCm3 - p1dt - p3dt2) / (1 + p2dt + p4dt2)) * HyC;
    tempTable.push({ temp: t, density });
  }

  // Now interpolate: find where the density matches massaEspecifica20/1000
  const targetDensity = massaEspecifica20 / 1000;

  // Find the row where density crosses the target
  // VLOOKUP equivalent: find the row with density <= target
  let lowerIdx = -1;
  for (let i = 0; i < tempTable.length; i++) {
    if (tempTable[i].density <= targetDensity) {
      lowerIdx = i;
    }
  }

  if (lowerIdx < 0 || lowerIdx >= tempTable.length - 1) {
    // Fallback: use closest match
    let closestIdx = 0;
    let closestDiff = Math.abs(tempTable[0].density - targetDensity);
    for (let i = 1; i < tempTable.length; i++) {
      const diff = Math.abs(tempTable[i].density - targetDensity);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIdx = i;
      }
    }
    return tempTable[closestIdx].temp;
  }

  // Linear interpolation between lowerIdx and lowerIdx+1
  const lower = tempTable[lowerIdx];
  const upper = tempTable[lowerIdx + 1];

  if (Math.abs(upper.density - lower.density) < 1e-12) {
    return lower.temp;
  }

  const fraction = (targetDensity - lower.density) / (upper.density - lower.density);
  const estimatedTemp = lower.temp + fraction * 0.5;

  return Math.round(estimatedTemp * 10) / 10;
}

// ============================================================
// Main calculation interface
// ============================================================

export interface DieselInputs {
  // Seção 1 - NF
  data: string;
  numeroNF: string;
  placaCT: string;
  volumeNF: number; // liters (B8)
  pesoLiquido: number; // kg (F9)
  massaEspecifica20NF: number; // kg/m³ (F10) → B10 = F10/1000

  // Seção 2 - Dados de campo
  temperaturaCT: number; // °C (B26)
  temperaturaAmostra: number; // °C (B14)
  densidadeAmostra: number; // kg/l (B15)
  situacaoSeta: number; // litros (F14) — leitura da seta do CT

}

export interface DieselResults {
  // Seção 2
  dnf20: number; // massa esp NF em kg/l (B10)
  fcnf: number; // fator correção NF (B9)
  temperaturaEstimada: number; // °C (B11/F11)

  // Seção 3
  dac20: number; // massa esp amostra corrigida (B16)
  qualidadeDiff: number; // B17 = B16 - B10

  // Seção 4
  vctMin: number; // B20
  vct: number; // B21
  vctMax: number; // B22

  // Seção 5
  dac20CT: number; // B27 = B16
  fcct: number; // B28
  v20: number; // B29

  // Resumo
  volumeNF: number;
  situacaoSeta: number; // F14 (always 0 from spreadsheet)
  volumeRecebido: number; // F15
  volumeAtestado: number; // F18
  diferencaVolume: number; // F17
  situacao: string; // "Falta" ou "Sobra"
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

  // B10 = F10/1000 (converter kg/m³ para kg/l)
  const dnf20 = massaEspecifica20NF / 1000;

  // Temperatura estimada de carregamento
  const temperaturaEstimada = estimateLoadingTemperature(
    volumeNF,
    pesoLiquido,
    massaEspecifica20NF
  );
  if (temperaturaEstimada === null) return null;

  // DAC 20°C = densidade amostra corrigida a 20°C (E45 in calc sheet)
  // Must be computed BEFORE FCNF because spreadsheet uses DAC20 for all correction factors
  const dac20 = calculateDensity20(densidadeAmostra, temperaturaAmostra);
  if (dac20 === null) return null;

  // FCNF = fator de correção na temp estimada (H43 in spreadsheet)
  // Spreadsheet uses DAC20 (sample density) as base, not DNF20
  const fcnf = calculateCorrectionFactor(dac20, temperaturaEstimada);
  if (fcnf === null) return null;

  // Qualidade diff
  const qualidadeDiff = dac20 - dnf20;

  // FCCT = fator de correção do CT (K43 in spreadsheet)
  const fcct = calculateCorrectionFactor(dac20, temperaturaCT);
  if (fcct === null) return null;

  // VCT = (VNF * FCNF) / FCCT (B21)
  const vct = (volumeNF * fcnf) / fcct;
  const vctMin = vct * (1 - 0.0006); // -0.06%
  const vctMax = vct * (1 + 0.0005); // +0.05%

  // V20 = VNF * FCCT (B29) - volume corrigido a 20°C
  // Wait, spreadsheet says B29 = B8 * B28 = volumeNF * FCCT
  // But B28 is FCCT from K43
  // Actually checking: B28 = 'Planilha de Cálculo a 20ºC'!K43
  // K43 uses K27 (TCT temperature) and E45 (DAC20)
  const v20 = volumeNF * fcct;

  // Resumo
  const situacaoSeta = inputs.situacaoSeta ?? 0;
  const volumeRecebido = volumeNF + situacaoSeta; // F15 = F13 + F14
  const diferencaVolume = volumeRecebido - vct; // F17
  const volumeAtestado = volumeNF + diferencaVolume; // F18
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
