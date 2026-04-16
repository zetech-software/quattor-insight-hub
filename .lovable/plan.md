

## Plano: Reorganizar campos da Seção 1 e Seção 2

### O que muda

1. **Seção 1 — Informações da Nota Fiscal**: Após os campos de input atuais, adicionar:
   - Os dois campos "cinza" de **DNF 20°C (NF)** — um em kg/m³ e outro em kg/l — que hoje ficam na Seção 2. Eles aparecem assim que o usuário preenche a Massa Específica a 20°C.
   - Na parte inferior da Seção 1, colocar lado a lado: **Temperatura Estimada de Carregamento** (resultado calculado) e o campo de input **Temperatura do CT - TCT (°C)** (que hoje fica na Seção 3).

2. **Seção 2 — Análise de Qualidade**: Remover as linhas de DNF 20°C (NF) que foram movidas para a Seção 1. Manter apenas os inputs (TA e DA) e os resultados de DAC 20°C e Diferença.

3. **Seção 3 — Fator de Correção do CT**: Remover o input de Temperatura do CT (movido para Seção 1). Manter apenas os resultados calculados (DAC 20°C, FCCT, V20).

### Detalhes técnicos

- Arquivo alterado: `src/pages/Index.tsx`
- Nenhuma alteração em lógica de cálculo ou banco de dados
- Layout da parte inferior da Seção 1: grid de 2 colunas com os ResultFields de DNF em kg/m³ e kg/l, seguido de outra linha com Temp. Estimada (ResultField) e input de Temperatura CT lado a lado

