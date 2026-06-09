import { describe, expect, it } from 'vitest';
import {
  calculateCorrectionFactor,
  calculateDensity20,
  calculateDiesel,
  estimateLoadingTemperature,
} from '@/lib/dieselCalculations';

/**
 * Valores de referência extraídos da planilha original
 * Calculo_de_Recebimento_de_Diesel_-_Web.xlsx via recálculo LibreOffice.
 * Cada cenário compara TODAS as células-chave (B11, B16, B9, B28, B21, B29).
 */

describe('calculateDensity20 (DAC20 / célula E45)', () => {
  it('DA=0,838 TA=25 °C → 0,841323688', () => {
    expect(calculateDensity20(0.838, 25)!).toBeCloseTo(0.841323688, 7);
  });

  it('DA=0,835 TA=28 °C → 0,840322000', () => {
    expect(calculateDensity20(0.835, 28)!).toBeCloseTo(0.840322000, 7);
  });

  it('DA=0,824 TA=30 °C → 0,830712671 (cross-faixa)', () => {
    expect(calculateDensity20(0.824, 30)!).toBeCloseTo(0.830712671, 7);
  });
});

describe('calculateCorrectionFactor (FC / H43 / K43)', () => {
  it('FCCT cross-faixa: DA=0,824 DAC20=0,8307 TCT=32 °C → 0,990016922', () => {
    const dac20 = calculateDensity20(0.824, 30)!;
    const fcct = calculateCorrectionFactor(0.824, dac20, 32);
    expect(fcct!).toBeCloseTo(0.990016922, 7);

    // Se o lookup CNP fosse erroneamente feito pela DAC20 (bug antigo),
    // o resultado seria ≈0,98999912 — visivelmente diferente.
    expect(Math.abs(fcct! - 0.98999912)).toBeGreaterThan(1e-6);
  });

  it('FCCT padrão: DA=0,838 DAC20≈0,8413 TCT=30 °C → 0,991863730', () => {
    const dac20 = calculateDensity20(0.838, 25)!;
    expect(calculateCorrectionFactor(0.838, dac20, 30)!).toBeCloseTo(
      0.991863730,
      7,
    );
  });

  it('FCNF padrão: DA=0,838 DAC20≈0,8413 TCNF≈27,51 °C → 0,993887469', () => {
    const dac20 = calculateDensity20(0.838, 25)!;
    expect(
      calculateCorrectionFactor(0.838, dac20, 27.5126951542919)!,
    ).toBeCloseTo(0.993887469, 7);
  });
});

describe('estimateLoadingTemperature (L13 / aba NAO EDITAR)', () => {
  it('VNF=10000 peso=8350 DNF20=840 → 27,5126951 °C', () => {
    expect(estimateLoadingTemperature(10000, 8350, 840)!).toBeCloseTo(
      27.5126951,
      4,
    );
  });

  it('VNF=20000 peso=16800 DNF20=840 → 20 °C (densCarga == DNF20)', () => {
    expect(estimateLoadingTemperature(20000, 16800, 840)!).toBeCloseTo(20, 3);
  });
});

describe('calculateDiesel (integração ponta a ponta)', () => {
  it('cenário 1 — bate célula a célula com a planilha', () => {
    const r = calculateDiesel({
      data: '2026-04-16',
      numeroNF: 'NF-001',
      placaCT: 'ABC-1234',
      volumeNF: 10000,
      pesoLiquido: 8350,
      massaEspecifica20NF: 840,
      temperaturaCT: 30,
      temperaturaAmostra: 25,
      densidadeAmostra: 0.838,
      situacaoSeta: 0,
    })!;

    expect(r.dnf20).toBeCloseTo(0.84, 10);                  // B10
    expect(r.temperaturaEstimada).toBeCloseTo(27.5126951, 4); // B11
    expect(r.dac20).toBeCloseTo(0.841323688, 7);            // B16
    expect(r.fcnf).toBeCloseTo(0.993887469, 7);             // B9
    expect(r.fcct).toBeCloseTo(0.991863730, 7);             // B28
    expect(r.vct).toBeCloseTo(10020.4033909, 3);            // B21
    expect(r.v20).toBeCloseTo(9918.6373016, 3);             // B29
  });

  it('cenário 2 — VNF=20000 peso=16800 DA=0,835 TCT=32', () => {
    const r = calculateDiesel({
      data: '2026-04-16',
      numeroNF: 'NF-002',
      placaCT: 'XYZ-9999',
      volumeNF: 20000,
      pesoLiquido: 16800,
      massaEspecifica20NF: 840,
      temperaturaCT: 32,
      temperaturaAmostra: 28,
      densidadeAmostra: 0.835,
      situacaoSeta: 0,
    })!;

    expect(r.temperaturaEstimada).toBeCloseTo(20, 3);
    expect(r.dac20).toBeCloseTo(0.840322000, 7);
    expect(r.fcnf).toBeCloseTo(1, 6);
    expect(r.fcct).toBeCloseTo(0.990214326, 7);
    expect(r.vct).toBeCloseTo(20197.6476045, 3);
    expect(r.v20).toBeCloseTo(19804.2865106, 3);
  });

  it('cenário cross-faixa — DA=0,824 cai entre 0,806-0,826 mas DAC20 sobe pra 0,826-0,846', () => {
    const r = calculateDiesel({
      data: '2026-04-16',
      numeroNF: 'NF-003',
      placaCT: 'CRS-0001',
      volumeNF: 10000,
      pesoLiquido: 8240,
      massaEspecifica20NF: 835,
      temperaturaCT: 32,
      temperaturaAmostra: 30,
      densidadeAmostra: 0.824,
      situacaoSeta: 0,
    })!;

    expect(r.temperaturaEstimada).toBeCloseTo(36.5101521, 4);
    expect(r.dac20).toBeCloseTo(0.830712671, 7);
    expect(r.fcnf).toBeCloseTo(0.986264822, 7);
    expect(r.fcct).toBeCloseTo(0.990016922, 7);
    expect(r.vct).toBeCloseTo(9962.1006467, 3);
  });

  it('situação da seta entra direto no volume recebido (F15 = F13 + F14)', () => {
    const base = {
      data: '2026-04-16',
      numeroNF: 'NF-001',
      placaCT: 'ABC-1234',
      volumeNF: 10000,
      pesoLiquido: 8350,
      massaEspecifica20NF: 840,
      temperaturaCT: 30,
      temperaturaAmostra: 25,
      densidadeAmostra: 0.838,
    };
    const neg = calculateDiesel({ ...base, situacaoSeta: -50 })!;
    const pos = calculateDiesel({ ...base, situacaoSeta: 100 })!;
    expect(neg.volumeRecebido).toBe(9950);
    expect(pos.volumeRecebido).toBe(10100);
    expect(pos.diferencaVolume - neg.diferencaVolume).toBeCloseTo(150, 6);
  });

  it('VCT min/max aplicam ±0,06% / +0,05%', () => {
    const r = calculateDiesel({
      data: '2026-04-16',
      numeroNF: 'NF-001',
      placaCT: 'ABC-1234',
      volumeNF: 10000,
      pesoLiquido: 8350,
      massaEspecifica20NF: 840,
      temperaturaCT: 30,
      temperaturaAmostra: 25,
      densidadeAmostra: 0.838,
      situacaoSeta: 0,
    })!;
    expect(r.vctMin).toBeCloseTo(r.vct * (1 - 0.0006), 8);
    expect(r.vctMax).toBeCloseTo(r.vct * (1 + 0.0005), 8);
  });
});
