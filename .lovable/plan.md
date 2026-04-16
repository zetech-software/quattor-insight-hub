

## Plano: Validação de digitação nos campos de Massa Específica

### Problema
O usuário pode digitar valores fora da faixa esperada nos campos de Massa Específica a 20°C (NF) e Massa Específica da Amostra (DA). Exemplo: digitar `8345` em kg/m³ (deveria ter no máximo 3 dígitos inteiros, ex: `834.5`) ou `8.345` em kg/l (deveria ser `0.xxxx`).

### Regras de validação

| Unidade | Formato válido | Exemplo | Regra |
|---------|---------------|---------|-------|
| kg/m³ | até 3 dígitos inteiros + decimais | `834.5`, `820.0` | parte inteira ≤ 999 |
| kg/l | `0,xxxx` (até 4 casas decimais) | `0.8345` | valor < 1 e até 4 casas decimais |

### O que será feito

1. **Criar função de validação** que recebe o valor string e a unidade selecionada, retornando uma mensagem de erro ou `null`.
   - Para **kg/m³**: erro se a parte inteira tiver mais de 3 dígitos (ex: `8345` → erro)
   - Para **kg/l**: erro se o valor ≥ 1 ou tiver mais de 4 casas decimais (ex: `1.234` ou `0.83456` → erro)

2. **Exibir alerta visual** abaixo de cada campo quando o valor for inválido:
   - Borda vermelha no input (`border-destructive`)
   - Mensagem de erro em texto pequeno vermelho abaixo do campo

3. **Aplicar nos dois campos**:
   - Massa Específica a 20°C (NF) — usa `massaUnit` (`kg/m³` ou `kg/l`)
   - Massa Específica Amostra - DA — usa `daUnit` (`kg/l` ou `kg/m³`)

4. **Bloquear salvamento** se houver erro de validação (botão Salvar desabilitado + toast de aviso).

### Arquivo alterado
- `src/pages/Index.tsx` — adicionar função de validação, estados de erro com `useMemo`, estilização condicional nos inputs e mensagens de erro.

