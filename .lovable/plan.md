## Fix: FCCT seguindo a planilha à risca

### Diagnóstico — onde o código diverge da planilha

Na planilha, a tabela CNP (a1, a2, b1, b2) é resolvida **uma única vez** por `VLOOKUP` na **densidade observada da amostra** (`E26 = 'Mascará de Cálculos'!B15 = densidadeAmostra`). Esses mesmos a1/a2/b1/b2 (e portanto os mesmos P1, P2, P3, P4) alimentam **todos** os fatores subsequentes:

| Cálculo | Célula | Fórmula | Coef. CNP via | Temp |
|---|---|---|---|---|
| DAC20 (densidade corrigida) | E45 = E43 * E35 | numerador/denominador * HyC | E26 = **densidadeAmostra** | E27 = TA |
| FCNF | H43 = 1 + H39 + H37/E45 | usa P1, P2 | E26 = **densidadeAmostra** | F27 = TCNF |
| FCCT | K43 = 1 + K39 + K37/E45 | usa P1, P2 | E26 = **densidadeAmostra** | J27 = TCT |

No código atual (`src/lib/dieselCalculations.ts`):

- `calculateCorrectionFactor(dac20, temp)` faz `findCNPCoefficients(dac20)` — **errado**.
- O lookup deveria usar `densidadeAmostra` (observada), igual ao spreadsheet.
- O DAC20 entra **somente** como divisor em `(P1*ΔT) / DAC20`.

Para densidades de diesel típicas (DA ≈ 0,82-0,84 e DAC20 ≈ 0,83-0,85), a faixa CNP pode mudar entre 0,806-0,826 e 0,826-0,846, o que troca os coeficientes e gera um FCCT visivelmente errado. Esse é o erro relatado.

O mesmo bug afeta `FCNF` (chamado com `dac20` em vez de `densidadeAmostra`).

### Refactor proposto

1. **Trocar a assinatura de `calculateCorrectionFactor`** para receber explicitamente as duas densidades:

   ```ts
   calculateCorrectionFactor(
     lookupDensity: number,  // densidadeAmostra (observada) — usada no VLOOKUP CNP
     density20: number,      // DAC20 — usada como divisor
     temperature: number,    // °C
   ): number | null
   ```

   Internamente: `findCNPCoefficients(lookupDensity)` → calcula P1, P2 → `FC = 1 + P2*ΔT + (P1*ΔT)/density20`.

2. **Atualizar `calculateDiesel`** para chamar:
   - `fcnf = calculateCorrectionFactor(densidadeAmostra, dac20, temperaturaEstimada)`
   - `fcct = calculateCorrectionFactor(densidadeAmostra, dac20, temperaturaCT)`

3. **Refatorar `calculateDensity20`** para também aceitar lookup explícito (mesmo conceito): o spreadsheet usa coeficientes via VLOOKUP em `densidadeAmostra`, exatamente o que a função já faz, então **só renomear parâmetro** para clareza (`observedDensity` permanece o lookup key). Sem mudança de comportamento.

4. **Estimativa de temperatura (`estimateLoadingTemperature`)** — a planilha NAO EDITAR usa apenas 3 faixas (0,806-0,871) e B1/B2 fixos (-4.9e-7 / 6e-7). O código atual usa a tabela CNP completa, o que pode divergir em algumas faixas. **Refatorar para reproduzir fielmente** as faixas e B1/B2 fixos da aba NAO EDITAR.

5. **Adicionar testes unitários** em `src/test/dieselCalculations.test.ts` cobrindo:
   - Valores de referência da planilha (DA=0,835, TA=25, TCT=30, DNF20=0,840 etc.) → assertar DAC20, FCNF, FCCT, VCT, V20.
   - Casos de borda nas trocas de faixa CNP (densidade próxima de 0,826).
   - Diferença zero (FCCT corretamente derivado faz volumeRecebido == VCT).

### Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/lib/dieselCalculations.ts` | Nova assinatura de `calculateCorrectionFactor`; refactor de `estimateLoadingTemperature` para usar as 3 faixas de NAO EDITAR + B1/B2 fixos; ajustes em `calculateDiesel` |
| `src/test/dieselCalculations.test.ts` | Novo arquivo de testes com valores de referência da planilha |

### Validação

- Rodar `bunx vitest run` após o refactor.
- Comparar saída do calculador no preview com valores da planilha original para 2-3 cenários reais.
- Sem mudanças em UI ou banco.
