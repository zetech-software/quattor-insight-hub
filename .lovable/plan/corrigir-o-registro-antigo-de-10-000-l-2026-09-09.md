# Corrigir o registro antigo de 10.000 L

## Situação atual (verificada no banco)

Existe exatamente um registro histórico calculado pela regra antiga:

- Data: 09/06/2026
- Volume da NF: 10.000 L
- Situação da Seta: +250 L
- Volume Atestado gravado: 10.000 L (errado)
- Diferença gravada: 0 L (errada)
- Situação: "Volume Conforme" (errada)

Todos os demais registros têm Situação da Seta igual a zero, então a regra nova
produz para eles exatamente os mesmos valores já gravados — nenhum outro precisa mudar.

## O que será feito

Atualizar somente esse registro:

- Volume Atestado: 10.250 L
- Diferença: 250 L
- Situação: "Sobra de Produto" (é o rótulo que o sistema usa quando a diferença é positiva; manter "Volume Conforme" deixaria a tela e o PDF contraditórios)

Nenhum outro campo é tocado: data, volumes da NF, temperaturas, densidades, fatores,
VCT e limites permanecem exatamente como estão.

## Verificações após a correção

1. Consulta ao banco confirmando os três valores novos e que os demais campos do registro continuam idênticos.
2. Consulta confirmando que nenhum outro registro foi alterado.
3. Conferência de que a tela de histórico, o resumo, os relatórios e o PDF leem esses mesmos campos, exibindo 10.250 L e +250 L.
4. Execução da suíte de testes completa e do build.

## Detalhe técnico

Um único `UPDATE` na tabela `calculations` filtrado pelo id
`99e6c8c0-a1d1-4563-bb2e-5f9cfda9d739`, alterando apenas
`volume_atestado`, `diferenca_volume` e `situacao`.
