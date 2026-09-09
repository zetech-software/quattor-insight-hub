# Correção da regra: Diferença e Volume Atestado

## Problema confirmado

Em `src/lib/dieselCalculations.ts` (linhas 341-350) a seta é somada e depois subtraída:

```text
volumeRecebido        = volumeNF + situacaoSeta
volumeAjustadoPelaSeta = volumeRecebido - situacaoSeta   -> sempre volumeNF
diferencaVolume        = 0 (sempre)
volumeAtestado         = volumeNF (sempre)
```

Por isso a Diferença nunca sai de zero e o Volume Atestado sempre repete a NF.

## Nova regra

A seta passa a representar o volume efetivamente medido no tanque em relação à marca:
abaixo da seta = negativo, acima da seta = positivo.

```text
Volume Atestado (medido no tanque) = Volume NF + Situação da Seta
Diferença = Volume Atestado - Volume NF
```

Resultado: 0 = volumes iguais; positivo = sobra medida; negativo = falta medida.
O campo "Volume Recebido" passa a ser o mesmo valor do Volume Atestado, então
ele deixa de ser um número separado no resumo (fica apenas Volume Atestado)
para evitar redundância.

A situação continua: 0 = Volume Conforme, negativo = Falta de Produto,
positivo = Sobra de Produto.

## Regra existente que contradiz e será alterada

A única regra conflitante é o bloco citado acima em `dieselCalculations.ts`,
introduzido para forçar diferença zero. Ela será substituída. Nenhuma outra
parte do sistema (planilha, VCT, FCCT, qualidade DAC-DNF) depende dessa
subtração; VCT e FCCT permanecem intactos.

## Onde a mudança se propaga

- Motor de cálculo: `src/lib/dieselCalculations.ts`.
- Tela: resumo do cálculo em `src/pages/Index.tsx` (Diferença, Volume Atestado,
  indicadores de falta/sobra) — remoção da linha redundante de Volume Recebido.
- PDF/laudo e relatório consolidado: `src/lib/pdfReports.ts`.
- Histórico e relatórios do admin: `src/pages/Historico.tsx`,
  `src/pages/AdminRelatorios.tsx`, `src/components/admin/ConferenceReportDialog.tsx`
  (incluindo totais e filtros por situação).
- Banco: as colunas `volume_recebido`, `volume_atestado` e `diferenca_volume` já
  existem; nenhuma migração é necessária, apenas os valores gravados mudam.
  Registros antigos permanecem com os valores anteriores.

## Testes

Substituir os testes que hoje afirmam diferença sempre zero
(`src/test/dieselCalculations.test.ts`, linhas ~111-123) por casos que cobrem:

1. volume atestado igual à NF (seta 0);
2. volume atestado maior que a NF (seta positiva);
3. volume atestado menor que a NF (seta negativa);
4. valores zerados;
5. valores decimais (ex.: seta 12,5 L).

Também verificar que a situação (Conforme / Falta / Sobra) acompanha o sinal.

## Validação final

Rodar toda a suíte de testes, o typecheck e o build, e revisar os logs de erro
antes de reportar. O relatório final vai listar a regra antiga removida, os
arquivos alterados e o resultado dos testes.
