

## Plano: Nova seção "Dados de Campo" entre Seções 1 e 2

### O que muda

Criar uma nova Card "Dados de Campo" entre as seções 1 (NF) e 2 (Qualidade), reunindo os campos que são coletados em campo. Também tornar "Situação da Seta" um campo de input (atualmente é hardcoded como 0).

### Campos da nova seção
1. **Temperatura do CT (°C)** — mover da Seção 1
2. **Temperatura da Amostra (°C)** — mover da Seção 2
3. **Massa Específica da Amostra (DA)** — mover da Seção 2 (com toggle kg/l / kg/m³ e validação existente)
4. **Situação da Seta (L)** — novo campo de input numérico com ícone "ⓘ" ao lado do label

### Ícone de informação "Situação da Seta"
Tooltip/popover ao clicar no "ⓘ" explicando:
- O que é: diferença de volume lida na seta (régua) do caminhão-tanque no momento do recebimento
- Negativo = volume abaixo da seta (falta); Positivo = volume acima da seta (sobra)
- **Disclaimer**: "Estas informações são apenas para fins informativos e, nos termos da lei, não devem ser utilizadas como prova."

### Impacto nos cálculos
- `situacaoSeta` deixa de ser `0` fixo — passa a usar o valor digitado pelo usuário
- Fórmula `volumeRecebido = volumeNF + situacaoSeta` já existe e funcionará automaticamente
- `DieselInputs` recebe novo campo `situacaoSeta`
- `calculateDiesel` usa o valor recebido em vez de `0`

### Impacto na persistência
- Adicionar coluna `situacao_seta` (numeric, nullable, default 0) na tabela `calculations` via migration
- Salvar o valor no `handleSave`

### Arquivos alterados
| Arquivo | Mudança |
|---------|---------|
| `src/lib/dieselCalculations.ts` | Adicionar `situacaoSeta` ao `DieselInputs`, usar no cálculo |
| `src/pages/Index.tsx` | Criar Card "Dados de Campo", mover 3 campos, adicionar input Situação da Seta com tooltip, renumerar seções (1→1, novo→2, qualidade→3, etc.) |
| Migration SQL | `ALTER TABLE calculations ADD COLUMN situacao_seta numeric DEFAULT 0` |

### Numeração das seções após mudança
1. Informações da Nota Fiscal
2. **Dados de Campo** (nova)
3. Análise de Qualidade do Produto
4. Fator de Correção do CT
5. Cálculo VCT

