# Validação final: semântica da "Situação da Seta"

## O que o campo realmente representa (verificado)

Evidências encontradas:

- Rótulo na tela (`src/pages/Index.tsx`, linha 327): **"Situação da Seta (L)"**, campo numérico
  livre com placeholder `0`.
- Texto explicativo do ícone de informação (linhas 335-345): *"Diferença de volume lida na seta
  (régua) do caminhão-tanque no momento do recebimento"*, com **negativo = abaixo da seta (falta)**
  e **positivo = acima da seta (sobra)**.
- Indicador abaixo do campo (linhas 350-355): "Na seta" / "Abaixo da seta" / "Acima da seta".
- Banco: registros existentes têm `situacao_seta = 0` na maioria e `250` em um caso com
  `volume_nf = 10000` — valor de variação, não de volume total.
- Testes e fixtures usam valores como `-50`, `120`, `200`, sempre pequenos frente ao volume da NF.

**Conclusão: a Situação da Seta é uma variação (acréscimo/decréscimo) em relação ao volume da NF,
não o volume final medido.** Portanto vale a segunda interpretação.

## Fórmula definitiva (já em vigor, sem alteração necessária)

```text
Volume Atestado = Volume da NF + Situação da Seta
Diferença       = Volume Atestado − Volume da NF  ( = Situação da Seta)
Volume Recebido = Volume Atestado
```

Não há dupla contagem: a seta entra uma única vez, na soma que forma o Volume Atestado.
A situação segue o sinal: 0 = Conforme, negativo = Falta, positivo = Sobra.

## Estado da verificação já executada

- Testes: 84/84 passando, cobrindo seta zero, positiva, negativa e decimal (12,5 L).
- Build: OK, sem erros.
- Tela, laudo em PDF, histórico e relatório consolidado leem os mesmos campos gravados
  (`situacao_seta`, `volume_atestado`, `diferenca_volume`) — coerentes entre si.
- Tolerância ±0,06%: `vctMin = VCT × 0,9994` e `vctMax = VCT × 1,0006`, com o laudo comparando
  o **Volume Atestado** contra essa faixa.

## Ajustes propostos nesta rodada

1. Tornar a explicação do campo ainda mais explícita: acrescentar ao texto do ícone que o valor
   informado é somado ao volume da NF para formar o Volume Atestado (evita que alguém digite o
   volume total do tanque por engano).
2. Adicionar testes específicos da tolerância ±0,06% ligando Volume Atestado à faixa
   VCT mínimo/máximo (dentro da faixa, abaixo do mínimo, acima do máximo), que hoje só é validada
   indiretamente.
3. Rodar novamente suíte completa e build.

## Registros históricos

É possível identificar com segurança os registros da regra antiga: são aqueles com
`situacao_seta <> 0` e `diferenca_volume = 0` (a regra antiga zerava a diferença). Hoje existe
**1 registro** nessa condição (NF 10.000 L, seta 250 L, diferença gravada 0).

Os demais registros antigos têm `situacao_seta = 0` e diferença vinda da regra anterior baseada em
VCT — não são comparáveis à nova regra e não devem ser reescritos.

Proposta: **não migrar automaticamente**. Nenhum dado é alterado sem sua autorização. Se quiser,
corrijo apenas aquele registro único para `diferenca_volume = 250` e
`volume_atestado = 10.250`. Diga se autoriza.

## Pendências

- Decisão sobre o registro histórico único acima.
- Nenhuma outra pendência técnica identificada.
