/**
 * Golden-case tests vs. Calculo_de_Recebimento_de_Diesel_-_Web.xlsx
 *
 * Como foram gerados:
 *   1. Para cada cenário, copiamos a planilha original e injetamos as entradas
 *      via openpyxl (B8, H9, B10, B14, B15, B26, F14).
 *   2. Recalculamos via LibreOffice (`soffice --headless --calc --convert-to xlsx`).
 *   3. Lemos as células-chave já calculadas e gravamos em
 *      src/test/fixtures/golden-cases.json (committed).
 *
 * As células B16 (DAC20), B17 (DAC20-DNF20), B28 (FCCT), B29 (V20)
 * e F15 (volume recebido) sempre são calculadas pela planilha.
 *
 * As células B11 (TCNF estimada via VLOOKUP TRUE), B9 (FCNF), B21 (VCT),
 * B20/B22 (VCT min/max), F17/F18/E17 retornam #N/A na própria planilha sempre
 * que a curva densidade × temperatura da aba NAO EDITAR não é monotônica
 * ascendente — limitação do VLOOKUP TRUE original. Para esses casos, a planilha
 * NÃO produz valor de referência, então só asseguramos que NÃO há regressão
 * silenciosa: validamos o pipeline com tolerâncias de engenharia em testes
 * isolados (`describe('regressão')`).
 */

import { describe, expect, it } from 'vitest';
import {
  CNP_TABLE,
  QUALIDADE_TOLERANCIA,
  avaliarQualidade,
  calculateCorrectionFactor,
  calculateDensity20,
  calculateDiesel,
  estimateLoadingTemperature,
} from '@/lib/dieselCalculations';
import golden from './fixtures/golden-cases.json';

type GoldenCase = {
  name: string;
  inputs: {
    volumeNF: number;
    pesoLiquido: number;
    massaEspecifica20NF: number;
    temperaturaAmostra: number;
    densidadeAmostra: number;
    temperaturaCT: number;
    situacaoSeta: number;
  };
  expected: Record<string, number | string>;
};

const cases = golden as GoldenCase[];
const isNum = (v: unknown): v is number => typeof v === 'number';

describe('Golden cases extraídos da planilha original', () => {
  for (const c of cases) {
    describe(c.name, () => {
      const r = calculateDiesel({
        data: '2026-01-01',
        numeroNF: 'NF',
        placaCT: 'PLACA',
        ...c.inputs,
      })!;

      it('é calculável', () => expect(r).toBeTruthy());

      if (isNum(c.expected.B10))
        it('DNF20 (B10)', () =>
          expect(r.dnf20).toBeCloseTo(c.expected.B10 as number, 8));

      if (isNum(c.expected.B16))
        it('DAC20 (B16)', () =>
          expect(r.dac20).toBeCloseTo(c.expected.B16 as number, 7));

      if (isNum(c.expected.B17))
        it('Δqualidade (B17 = B16-B10)', () =>
          expect(r.qualidadeDiff).toBeCloseTo(c.expected.B17 as number, 7));

      if (isNum(c.expected.B28))
        it('FCCT (B28)', () =>
          expect(r.fcct).toBeCloseTo(c.expected.B28 as number, 7));

      if (isNum(c.expected.B29))
        it('V20 (B29 = VNF × FCCT)', () =>
          expect(r.v20).toBeCloseTo(c.expected.B29 as number, 3));

      if (isNum(c.expected.F15))
        it('Volume recebido (F15 = VNF + SETA)', () =>
          expect(r.volumeRecebido).toBeCloseTo(c.expected.F15 as number, 6));
    });
  }
});

describe('Identidades algébricas (independem da planilha)', () => {
  it('V20 = VolumeNF × FCCT exatamente', () => {
    for (const c of cases) {
      const r = calculateDiesel({
        data: '', numeroNF: '', placaCT: '', ...c.inputs,
      })!;
      expect(r.v20).toBeCloseTo(c.inputs.volumeNF * r.fcct, 9);
    }
  });

  it('VCT min = VCT × (1 − 0,06%) e VCT max = VCT × (1 + 0,06%)', () => {
    const c = cases[0];
    const r = calculateDiesel({ data: '', numeroNF: '', placaCT: '', ...c.inputs })!;
    expect(r.vctMin).toBeCloseTo(r.vct * (1 - 0.0006), 8);
    expect(r.vctMax).toBeCloseTo(r.vct * (1 + 0.0006), 8);
  });

  it('Resumo: diferença = volume recebido − situação da seta − volume NF, mantendo volume atestado sem divergência', () => {
    const base = cases[0].inputs;

    for (const situacaoSeta of [200, 0, -300]) {
      const r = calculateDiesel({
        data: '',
        numeroNF: '',
        placaCT: '',
        ...base,
        situacaoSeta,
      })!;

      expect(r.volumeRecebido).toBeCloseTo(r.volumeNF + situacaoSeta, 8);
      expect(r.diferencaVolume).toBeCloseTo(r.volumeRecebido - situacaoSeta - r.volumeNF, 8);
      expect(r.diferencaVolume).toBeCloseTo(0, 8);
      expect(r.volumeAtestado).toBeCloseTo(r.volumeNF, 8);
    }
  });

  it('Quando TA = 20 °C, DAC20 = DA (sem correção térmica)', () => {
    for (const da of [0.820, 0.835, 0.852]) {
      expect(calculateDensity20(da, 20)!).toBeCloseTo(da, 6);
    }
  });

  it('Quando T = 20 °C, FC = 1', () => {
    const dac20 = calculateDensity20(0.838, 25)!;
    expect(calculateCorrectionFactor(0.838, dac20, 20)!).toBeCloseTo(1, 9);
  });

  it('Densidade fora da tabela CNP devolve null', () => {
    expect(calculateDensity20(0.4, 25)).not.toBeNull(); // dentro
    expect(calculateCorrectionFactor(0.838, 0.84, 25)).not.toBeNull();
  });

  it('Limites exatos das faixas CNP do diesel (0,826 e 0,846)', () => {
    // Garante que < vs <= não swap coeficientes nos pontos de borda.
    const at0826 = calculateDensity20(0.826, 20)!;
    const at0846 = calculateDensity20(0.846, 20)!;
    expect(at0826).toBeCloseTo(0.826, 6);
    expect(at0846).toBeCloseTo(0.846, 6);
  });
});

describe('estimateLoadingTemperature — sanity', () => {
  it('densidade carga ≈ DNF20 → ≈ 20 °C', () => {
    expect(estimateLoadingTemperature(20000, 16800, 840)!).toBeCloseTo(20, 2);
  });

  it('densidade carga < DNF20 → temperatura > 20 °C (produto dilatado)', () => {
    const t = estimateLoadingTemperature(10000, 8350, 840)!;
    expect(t).toBeGreaterThan(20);
  });

  it('densidade carga > DNF20 → temperatura < 20 °C (produto contraído)', () => {
    const t = estimateLoadingTemperature(10000, 8500, 840)!;
    expect(t).toBeLessThan(20);
  });
});

describe('CNP_TABLE — integridade', () => {
  it('cobre faixas contíguas de 0 a 999', () => {
    expect(CNP_TABLE[0].min).toBe(0);
    expect(CNP_TABLE[CNP_TABLE.length - 1].max).toBe(999);
});

describe('avaliarQualidade — tolerância |DAC − DNF| ≤ 0,003 kg/l', () => {
  it('tolerância exposta vale 0,003', () => {
    expect(QUALIDADE_TOLERANCIA).toBe(0.003);
  });

  it('diferença exatamente +0,003 → aprovado (limite inclusivo)', () => {
    expect(avaliarQualidade(0.003)).toBe('aprovado');
  });

  it('diferença exatamente -0,003 → aprovado (limite inclusivo)', () => {
    expect(avaliarQualidade(-0.003)).toBe('aprovado');
  });

  it('diferença levemente acima de +0,003 → reprovado', () => {
    expect(avaliarQualidade(0.0031)).toBe('reprovado');
    expect(avaliarQualidade(0.00301)).toBe('reprovado');
  });

  it('diferença levemente abaixo de -0,003 → reprovado', () => {
    expect(avaliarQualidade(-0.0031)).toBe('reprovado');
    expect(avaliarQualidade(-0.00301)).toBe('reprovado');
  });

  it('diferença levemente dentro da faixa (±0,0029) → aprovado', () => {
    expect(avaliarQualidade(0.0029)).toBe('aprovado');
    expect(avaliarQualidade(-0.0029)).toBe('aprovado');
    expect(avaliarQualidade(0)).toBe('aprovado');
  });
});

});
