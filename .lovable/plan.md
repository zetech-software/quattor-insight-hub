# Aviso legal, dashboard e exportação individual

Escopo restrito aos três itens da reunião. Nada de perfil do cliente, Regina administrativa, Stripe, pagamentos ou conteúdo premium.

## 1. Aviso legal

Texto único, usado em todos os lugares (mantendo o sentido do texto aprovado):

> Os resultados apresentados por esta plataforma possuem caráter técnico e informativo. O volume sugerido não deve ser utilizado isoladamente como fundamento para contestação ou disputa direta com a distribuidora, devendo ser analisado em conjunto com os procedimentos e documentos aplicáveis à operação.

Onde aparece:
- Calculadora: linha discreta abaixo do Resumo do Cálculo, em texto pequeno e cor secundária, sem alarme.
- PDF individual do cálculo: bloco no fim do documento, antes do rodapé, com quebra de página garantida.
- Relatório de conferências (admin) e demais relatórios que mostram volume sugerido: mesmo bloco.
- Excel individual: uma linha final identificada como "Aviso legal".

## 2. Dashboard administrativo — auditoria feita

Auditei antes de propor. Os cálculos recentes **funcionam**: a consulta traz os 8 últimos por data de criação, e os dados reais aparecem (últimos lançamentos de 07/09 a 17/09, com cliente e situação). O estado vazio, as contagens de cálculos, o gráfico por semana e a distinção entre "sem dados" e "sem cálculos no período" também estão corretos.

Encontrei dois defeitos pequenos e reais, e só eles serão corrigidos:

1. **Contagem de clientes inclui a conta de Suporte.** Hoje o filtro remove apenas Dono e Gestão, então a conta Suporte Qu4ttuor entra como cliente: o painel mostra 11 clientes quando existem 10. Também afeta a contagem de assinaturas.
2. **Data em formato técnico.** A lista de cálculos recentes mostra `2026-09-17` em vez de `17/09/2026`. Além disso, nos PDFs a data é convertida com fuso e pode aparecer um dia antes do lançamento. Serão lidas como data local, sem deslocamento.

Nenhuma outra lógica do painel será tocada.

## 3. Exportação individual (PDF + Excel)

O PDF individual já existe e é acionado no Histórico. O que muda:

- **Na calculadora:** com o cálculo pronto, dois botões no Resumo — "Exportar PDF" e "Exportar Excel" — que exportam somente aquele cálculo, funcionando mesmo antes de salvar.
- **No Histórico:** ao lado do "Exportar PDF" existente, botão "Exportar Excel" para o cálculo aberto.
- **Conteúdo (ambos os formatos):** data e hora, NF, placa do veículo, município, valor da NF, volumes (NF, VCT mín/VCT/VCT máx, V20, atestado), situação da seta, diferença, situação final, dados de qualidade (temperaturas, massa específica da NF e da amostra, corrigida e diferença) e o aviso legal.
- **PDF:** mantém a identidade visual atual (faixa laranja, tabelas por seção, rodapé com paginação) e ganha o bloco do aviso legal com quebra de página correta.
- **Excel:** uma planilha, campos em duas colunas com nomes claros, números como número (não texto) e sem enfeites visuais.

Fórmulas não serão alteradas em nenhum momento.

## Detalhes técnicos

- Novo `src/lib/legalDisclaimer.ts` com o texto único, importado pela calculadora, pelos PDFs e pelo Excel.
- Novo `src/lib/excelReports.ts` com `generateSingleCalculationXLSX(calc)`, usando a biblioteca `xlsx` (nova dependência) — sem estilos, apenas dados.
- `src/lib/pdfReports.ts`: helper `addDisclaimer(doc)` chamado em `generateSingleCalculationPDF` e `generateConferenceReport`; troca de `new Date(str)` por leitura de data local nas datas `YYYY-MM-DD`.
- `src/pages/Index.tsx`: adapta os valores em memória para o formato de exportação (mesma forma do registro salvo), botões no Resumo e linha do aviso.
- `src/pages/Historico.tsx`: botão Excel no detalhe.
- `src/pages/AdminDashboard.tsx`: filtro de contas de equipe passa a incluir `support`; datas exibidas em pt-BR.

## Testes

PDF e Excel individuais com diferença positiva, negativa e zero; aviso legal visível na calculadora, no PDF e no Excel; painel com e sem cálculos recentes; contagem de clientes conferida contra o banco; navegação nos três perfis (Dono, Suporte, Cliente) conforme as permissões atuais. Depois: testes automatizados, verificação de tipos e build de produção.
