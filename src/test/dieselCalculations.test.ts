import { describe, expect, it } from 'vitest';
import {
  calculateCorrectionFactor,
  calculateDensity20,
  calculateDiesel,
  estimateLoadingTemperature,
} from '@/lib/dieselCalculations';

/**
 * Valores de referência calculados a partir das fórmulas literais da planilha
 * Calculo_de_Recebimento_de_Diesel_-_Web.xlsx (abas "Planilha de Cálculo a 20ºC"
 * e "NAO EDITAR"). Recalculados em Python reproduzindo célula por célula.
 */

describe('calculateDensity20 (DAC20 / E45)', () => {
  it('reproduz E45 para DA=0,838 TA=25 °C', () => {
    const dac20 = calculateDensity20(0.838, 25);
    expect(dac20).not.toBeNull();
    expect(dac20!).toBeCloseTo(0.8413237, 6);
  });

  it('reproduz E45 para DA=0,835 TA=28 °C', () => {
    const dac20 = calculateDensity20(0.835, 28);
    expect(dac20!).toBeCloseTo(0.8403220, 6);
  });
});

describe('calculateCorrectionFactor (FC / H43 / K43)', () => {
  it('usa CNP da DA observada (não da DAC20) — caso cross-faixa', () => {
    // DA=0,824 (faixa 0,806-0,826) com TA=30 produz DAC20≈0,83071
    // que cai na faixa seguinte (0,826-0,846). Implementação correta deve
    // usar coeficientes da DA (0,824), não da DAC20.
    const dac20 = calculateDensity20(0.824, 30)!;
    const fcctCorrect = calculateCorrectionFactor(0.824, dac20, 32);
    expect(fcctCorrect!).toBeCloseTo(0.99001692, 7);

    // Se o lookup fosse feito com DAC20 (bug antigo) o resultado seria
    // ≈0.98999912 — bem diferente. Garantimos que NÃO é esse valor.
    expect(Math.abs(fcctCorrect! - 0.98999912)).toBeGreaterThan(1e-6);
  });

  it('FCCT para DA=0,838 DAC20≈0,8413 TCT=30 °C', () => {
    const dac20 = calculateDensity20(0.838, 25)!;
    const fcct = calculateCorrectionFactor(0.838, dac20, 30);
    expect(fcct!).toBeCloseTo(0.99186373, 7);
  });

  it('FCNF para DA=0,838 DAC20≈0,8413 TCNF≈26,92 °C', () => {
    const dac20 = calculateDensity20(0.838, 25)!;
    const fcnf = calculateCorrectionFactor(0.838, dac20, 26.921132);
    expect(fcnf!).toBeCloseTo(0.99436878, 7);
  });
});

describe('estimateLoadingTemperature (L13 da aba NAO EDITAR)', () => {
  it('VNF=10000 peso=8350 DNF20=840 → ≈26,92 °C', () => {
    const t = estimateLoadingTemperature(10000, 8350, 840);
    expect(t).not.toBeNull();
    expect(t!).toBeCloseTo(26.921132, 3);
  });

  it('VNF=20000 peso=16800 DNF20=840 → ≈19,69 °C', () => {
    const t = estimateLoadingTemperature(20000, 16800, 840);
    expect(t!).toBeCloseTo(19.687960, 3);
  });
});

describe('calculateDiesel (integração ponta a ponta)', () => {
  it('cenário padrão bate com a planilha (precisão de litro)', () => {
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

    expect(r).not.toBeNull();
    expect(r.dnf20).toBeCloseTo(0.84, 10);
    expect(r.temperaturaEstimada).toBeCloseTo(26.921132, 3);
    expect(r.dac20).toBeCloseTo(0.8413237, 6);
    expect(r.fcnf).toBeCloseTo(0.99436878, 7);
    expect(r.fcct).toBeCloseTo(0.99186373, 7);
    expect(r.vct).toBeCloseTo(10025.2560, 2);
    expect(r.v20).toBeCloseTo(9918.6373, 2);
  });

  it('situação da seta entra direto no volume recebido', () => {
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
    // diferença de volume reflete a seta
    expect(pos.diferencaVolume - neg.diferencaVolume).toBeCloseTo(150, 6);
  });

  it('VCT mínimo e máximo aplicam tolerâncias ±0,06% / +0,05%', () => {
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
