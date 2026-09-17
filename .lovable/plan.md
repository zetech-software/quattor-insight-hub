# Remoção do valor financeiro da Nota Fiscal

Retirar da plataforma o campo "Valor da NF (R$)". O **Volume da NF em litros** continua obrigatório e intocado; nenhuma fórmula, tolerância ou massa específica é alterada.

## O que será removido

- Campo "Valor da NF (R$)" da tela da calculadora (rótulo e caixa de digitação).
- Gravação desse valor em novos cálculos (salvos e recém-calculados).
- Linha "Valor NF" do PDF individual.
- Linha "Valor da NF" do Excel individual.

## O que já está sem valor financeiro (verificado)

- Resumo do cálculo: mostra apenas volumes, diferença e situação.
- Histórico e detalhe do cálculo: nenhum valor em reais exibido.
- Relatórios administrativos (conferências, clientes, cálculos, assinaturas): nenhuma coluna, filtro ou rótulo de preço.

Ou seja, hoje o valor financeiro aparece somente na calculadora, no PDF individual e no Excel individual.

## Banco de dados

Existe a coluna `valor_nf` na tabela de cálculos, criada por uma alteração antiga, opcional e sem uso em cálculo algum. Hoje 73 registros (todos do conjunto de demonstração) têm valor preenchido.

Proposta: **manter a coluna no banco por compatibilidade histórica**, sem apagar dado nenhum. Ela deixa de ser preenchida e deixa de ser lida em qualquer lugar do sistema. Apagar a coluna seria uma exclusão destrutiva e definitiva dos valores já registrados — não será feita neste bloco; se você quiser depois, isso é feito por você mesmo no editor do banco, com aviso prévio.

## Testes

- Novo cálculo na calculadora, com salvamento.
- Histórico e detalhe do cálculo.
- PDF individual e Excel individual (confirmar que não há mais nenhuma linha de valor em reais).
- Relatórios administrativos.
- Navegação nos três perfis: Dono, Suporte e Cliente.
- Testes automatizados, verificação de tipos e versão de produção.
- Busca final no código por qualquer texto de preço/valor da NF para garantir que não sobrou nada.

## Detalhes técnicos

- `src/pages/Index.tsx`: remover `valorNF` do estado inicial e do reset, remover o campo do formulário e retirar `valor_nf` do objeto salvo e do objeto de exportação.
- `src/lib/pdfReports.ts`: remover a linha "Valor NF" da tabela de dados da NF no relatório individual.
- `src/lib/excelReports.ts`: remover a linha "Valor da NF".
- `src/lib/calculationExport.ts`: remover `valor_nf` do tipo de exportação.
- Sem migração de banco; coluna `valor_nf` mantida, sem leitura nem escrita.
